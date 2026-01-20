import { confirmRecharge } from '@/lib/services/wallet'
import { decryptWechatPayResource, getWechatPayConfigWithReason, getWechatPayPlatformCertificate, verifyWechatPayCallbackSignature } from '@/lib/services/wechatpay'
import { createAdminClient } from '@/lib/supabase/admin'

function isMissingColumnError(error: any, column: string) {
  const msg = typeof error?.message === 'string' ? error.message : ''
  const details = typeof error?.details === 'string' ? error.details : ''
  const hay = `${msg} ${details}`.toLowerCase()
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    hay.includes(`'${column.toLowerCase()}'`) ||
    hay.includes(`"${column.toLowerCase()}"`) ||
    hay.includes(`orders.${column.toLowerCase()}`)
  )
}

async function loadOrderForRecharge(admin: any, outTradeNo: string) {
  const selects = [
    'user_id, coins_amount, amount_cny, amount, status, out_trade_no',
    'user_id, amount_cny, amount, status, out_trade_no',
    'user_id, amount_cny, amount, status',
    'user_id, amount, status',
    'user_id, status'
  ]

  for (const sel of selects) {
    const { data, error } = await admin.from('orders').select(sel).eq('out_trade_no', outTradeNo).maybeSingle()
    if (!error) return data
    if (!isMissingColumnError(error, 'out_trade_no')) throw error

    const { data: data2, error: error2 } = await admin.from('orders').select(sel).eq('id', outTradeNo).maybeSingle()
    if (!error2) return data2
    if (!isMissingColumnError(error2, 'coins_amount') && !isMissingColumnError(error2, 'amount_cny') && !isMissingColumnError(error2, 'amount')) {
      throw error2
    }
  }

  return null
}

function resolveCoinsAmount(order: any) {
  const coinsAmount = Number(order?.coins_amount)
  if (Number.isFinite(coinsAmount) && coinsAmount > 0) return Math.floor(coinsAmount)

  const amountCny = Number(order?.amount_cny ?? order?.amount)
  if (Number.isFinite(amountCny) && amountCny > 0) return Math.floor(amountCny * 10)
  return null
}

async function creditRechargeFallback(admin: any, userId: string, coinsAmount: number, outTradeNo: string) {
  const description = `充值入账:${outTradeNo}`

  const { data: existing } = await admin
    .from('coin_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'recharge')
    .eq('description', description)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return

  const { data: profile1, error: profileErr1 } = await admin
    .from('profiles')
    .select('coin_paid, coin_free, yi_coins')
    .eq('id', userId)
    .maybeSingle()

  if (profileErr1 && isMissingColumnError(profileErr1, 'coin_paid')) {
    const { data: profile2 } = await admin.from('profiles').select('yi_coins').eq('id', userId).maybeSingle()
    const yiCoins = Number((profile2 as any)?.yi_coins ?? 0)
    await admin.from('profiles').update({ yi_coins: (Number.isFinite(yiCoins) ? yiCoins : 0) + coinsAmount }).eq('id', userId)
    await admin.from('coin_transactions').insert({ user_id: userId, amount: coinsAmount, type: 'recharge', description })
    return
  }

  const coinPaid = Number((profile1 as any)?.coin_paid ?? 0)
  const coinFree = Number((profile1 as any)?.coin_free ?? 0)
  const nextPaid = (Number.isFinite(coinPaid) ? coinPaid : 0) + coinsAmount
  const updates: Record<string, unknown> = { coin_paid: nextPaid }

  const yiCoinsRaw = (profile1 as any)?.yi_coins
  const yiCoins = yiCoinsRaw === null || yiCoinsRaw === undefined ? null : Number(yiCoinsRaw)
  const sum = nextPaid + (Number.isFinite(coinFree) ? coinFree : 0)
  if (yiCoins === null || !Number.isFinite(yiCoins) || yiCoins !== sum) {
    updates.yi_coins = sum
  }

  await admin.from('profiles').update(updates).eq('id', userId)

  const { error: insertErr1 } = await admin
    .from('coin_transactions')
    .insert({ user_id: userId, amount: coinsAmount, type: 'recharge', description, balance_type: 'PAID' })

  if (insertErr1 && isMissingColumnError(insertErr1, 'balance_type')) {
    await admin.from('coin_transactions').insert({ user_id: userId, amount: coinsAmount, type: 'recharge', description })
  }
}

function ok() {
  return new Response(JSON.stringify({ code: 'SUCCESS', message: '成功' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ code: 'FAIL', message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function POST(request: Request) {
  try {
    const { config: cfg, reason } = getWechatPayConfigWithReason()
    if (!cfg) {
      if (reason === 'INVALID_PRIVATE_KEY') return fail('WeChat Pay private key is invalid', 503)
      if (reason === 'INVALID_API_V3_KEY') return fail('WeChat Pay api v3 key is invalid', 503)
      return fail('WeChat Pay is not configured', 503)
    }

    const bodyText = await request.text()

    const signature = request.headers.get('wechatpay-signature') || request.headers.get('Wechatpay-Signature') || ''
    const timestamp = request.headers.get('wechatpay-timestamp') || request.headers.get('Wechatpay-Timestamp') || ''
    const nonce = request.headers.get('wechatpay-nonce') || request.headers.get('Wechatpay-Nonce') || ''
    const serial = request.headers.get('wechatpay-serial') || request.headers.get('Wechatpay-Serial') || ''

    if (!signature || !timestamp || !nonce || !serial) return fail('Missing signature headers')

    const cert = await getWechatPayPlatformCertificate(serial)
    if (!cert?.public_key_pem) return fail('Platform certificate not found', 400)

    const verified = verifyWechatPayCallbackSignature({
      bodyText,
      timestamp,
      nonce,
      signature,
      publicKeyPem: cert.public_key_pem
    })
    if (!verified) return fail('Invalid signature', 400)

    let payload: any = null
    try {
      payload = bodyText ? JSON.parse(bodyText) : null
    } catch {
      return fail('Invalid JSON body')
    }

    const resource = payload?.resource
    if (!resource?.ciphertext || !resource?.nonce) return fail('Missing resource')

    let decrypted: any = null
    try {
      const plain = decryptWechatPayResource(cfg.apiV3Key, {
        nonce: String(resource.nonce),
        associated_data: String(resource.associated_data || ''),
        ciphertext: String(resource.ciphertext)
      })
      decrypted = plain ? JSON.parse(plain) : null
    } catch {
      return fail('Failed to decrypt resource', 400)
    }

    const outTradeNo = String(decrypted?.out_trade_no || '').trim()
    const tradeState = String(decrypted?.trade_state || '').trim()
    if (!outTradeNo) return fail('Missing out_trade_no', 400)

    if (tradeState !== 'SUCCESS') return ok()

    const admin = createAdminClient()
    const order = await loadOrderForRecharge(admin, outTradeNo)
    if (!order) return ok()
    if (order.status === 'PAID') return ok()

    const coinsAmount = resolveCoinsAmount(order)
    if (!coinsAmount || coinsAmount <= 0) return ok()

    try {
      await confirmRecharge(order.user_id, coinsAmount, outTradeNo, admin)
    } catch {
      await creditRechargeFallback(admin, order.user_id, coinsAmount, outTradeNo)
    }

    try {
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('yi_coins, coin_paid, coin_free')
        .eq('id', order.user_id)
        .single()

      if (!profileError) {
        const yiCoinsRaw = (profile as any)?.yi_coins
        const yiCoins = yiCoinsRaw === null || yiCoinsRaw === undefined ? null : Number(yiCoinsRaw)
        const coinPaid = Number((profile as any)?.coin_paid ?? 0)
        const coinFree = Number((profile as any)?.coin_free ?? 0)
        const sum = (Number.isFinite(coinPaid) ? coinPaid : 0) + (Number.isFinite(coinFree) ? coinFree : 0)

        if (Number.isFinite(sum) && (yiCoins === null || !Number.isFinite(yiCoins) || yiCoins !== sum)) {
          await admin.from('profiles').update({ yi_coins: sum }).eq('id', order.user_id)
        }
      }
    } catch {}

    return ok()
  } catch (error) {
    console.error('WeChat Pay webhook error:', error)
    return fail('Internal Server Error', 500)
  }
}
