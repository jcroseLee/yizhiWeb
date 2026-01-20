import { getAlipaySdk } from '@/lib/services/alipay'
import { confirmRecharge } from '@/lib/services/wallet'
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
    const { data, error } = await admin
      .from('orders')
      .select(sel)
      .eq('out_trade_no', outTradeNo)
      .maybeSingle()

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

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const payload: Record<string, string> = {}
    for (const [key, value] of form.entries()) {
      payload[key] = String(value)
    }

    const sdk = getAlipaySdk()
    if (sdk && typeof (sdk as any).checkNotifySign === 'function') {
      const verified = await Promise.resolve((sdk as any).checkNotifySign(payload))
      if (!verified) return new Response('failure', { status: 400 })
    }

    const tradeStatus = payload.trade_status
    if (!['TRADE_SUCCESS', 'TRADE_FINISHED'].includes(String(tradeStatus))) {
      return new Response('success')
    }

    const outTradeNo = payload.out_trade_no
    if (!outTradeNo) return new Response('failure', { status: 400 })

    const admin = createAdminClient()
    const order = await loadOrderForRecharge(admin, outTradeNo)
    if (!order) return new Response('failure', { status: 404 })
    if (order.status === 'PAID') return new Response('success')

    const coinsAmount = resolveCoinsAmount(order)
    if (!coinsAmount || coinsAmount <= 0) return new Response('failure', { status: 500 })

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

    return new Response('success')
  } catch (error) {
    console.error('Alipay webhook error:', error)
    return new Response('failure', { status: 500 })
  }
}
