import { getAlipaySdk } from '@/lib/services/alipay'
import { confirmRecharge } from '@/lib/services/wallet'
import { getWechatPayConfig, queryWechatPayTransaction } from '@/lib/services/wechatpay'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    'id, user_id, coins_amount, amount_cny, amount, status, out_trade_no, payment_method',
    'id, user_id, amount_cny, amount, status, out_trade_no, payment_method',
    'id, user_id, amount_cny, amount, status, payment_method',
    'id, user_id, amount, status, payment_method',
    'id, user_id, status, payment_method'
  ]

  for (const sel of selects) {
    const { data, error } = await admin.from('orders').select(sel).eq('out_trade_no', outTradeNo).maybeSingle()
    if (!error) return data
    if (!isMissingColumnError(error, 'out_trade_no')) throw error

    const { data: data2, error: error2 } = await admin.from('orders').select(sel).eq('id', outTradeNo).maybeSingle()
    if (!error2) return data2
    if (
      !isMissingColumnError(error2, 'coins_amount') &&
      !isMissingColumnError(error2, 'amount_cny') &&
      !isMissingColumnError(error2, 'amount') &&
      !isMissingColumnError(error2, 'payment_method')
    ) {
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
  const description = outTradeNo ? `充值入账:${outTradeNo}` : '充值入账'

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

function extractTradeStatus(queryResult: any) {
  const obj = queryResult && typeof queryResult === 'object' ? queryResult : null
  if (!obj) return null

  const responseKey = Object.keys(obj).find((k) => k.endsWith('_response')) || null
  const response = responseKey ? obj[responseKey] : obj

  const status = response?.trade_status ?? response?.tradeStatus ?? response?.status ?? null
  return status ? String(status) : null
}

/**
 * @swagger
 * /api/v1/wallet/recharge/sync:
 *   post:
 *     summary: POST /api/v1/wallet/recharge/sync
 *     description: Auto-generated description for POST /api/v1/wallet/recharge/sync
 *     tags:
 *       - V1
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  let {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (token) {
      const { data: headerAuthData, error: headerAuthError } = await supabase.auth.getUser(token)
      if (!headerAuthError && headerAuthData.user) {
        user = headerAuthData.user
        authError = null
      } else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const adminForAuth = createAdminClient()
          const { data: adminAuthData, error: adminAuthError } = await adminForAuth.auth.getUser(token)
          if (!adminAuthError && adminAuthData.user) {
            user = adminAuthData.user
            authError = null
          }
        } catch {}
      }
    }
  }

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const outTradeNo = String(body?.out_trade_no || body?.outTradeNo || '').trim()
  if (!outTradeNo) return NextResponse.json({ error: 'Missing out_trade_no' }, { status: 400 })

  const admin = createAdminClient()
  const order = await loadOrderForRecharge(admin, outTradeNo)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (order.status === 'PAID') return NextResponse.json({ success: true, status: 'PAID' })

  const paymentMethod = String(order.payment_method || '').toUpperCase()
  if (paymentMethod && !['ALIPAY', 'WECHAT'].includes(paymentMethod)) {
    return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 })
  }

  let isPaid = false
  let remoteStatus: string | null = null

  if (!paymentMethod || paymentMethod === 'ALIPAY') {
    const sdk = getAlipaySdk()
    if (!sdk) return NextResponse.json({ error: 'Alipay is not configured' }, { status: 503 })

    let queryResult: any
    try {
      queryResult = await (sdk as any).exec('alipay.trade.query', {
        bizContent: {
          outTradeNo
        }
      })
    } catch (e: any) {
      return NextResponse.json(
        { error: typeof e?.message === 'string' ? e.message : 'Failed to query Alipay' },
        { status: 502 }
      )
    }

    if (typeof queryResult === 'string') {
      try {
        queryResult = JSON.parse(queryResult)
      } catch {}
    }

    remoteStatus = extractTradeStatus(queryResult)
    isPaid = Boolean(remoteStatus && ['TRADE_SUCCESS', 'TRADE_FINISHED'].includes(remoteStatus))
  }

  if (paymentMethod === 'WECHAT') {
    const cfg = getWechatPayConfig()
    if (!cfg) return NextResponse.json({ error: 'WeChat Pay is not configured' }, { status: 503 })
    let tx: any
    try {
      tx = await queryWechatPayTransaction(outTradeNo)
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to query WeChat Pay'
      if (msg === 'WeChat Pay private key is invalid') return NextResponse.json({ error: msg }, { status: 503 })
      if (msg === 'WeChat Pay api v3 key is invalid') return NextResponse.json({ error: msg }, { status: 503 })
      if (msg === 'WeChat Pay is not configured') return NextResponse.json({ error: msg }, { status: 503 })
      return NextResponse.json({ error: msg }, { status: 502 })
    }
    remoteStatus = typeof tx?.trade_state === 'string' ? tx.trade_state : null
    isPaid = remoteStatus === 'SUCCESS'
  }

  if (!isPaid) {
    return NextResponse.json({ success: false, status: 'PENDING', remote_status: remoteStatus })
  }

  const coinsAmount = resolveCoinsAmount(order)
  if (!coinsAmount || coinsAmount <= 0) return NextResponse.json({ error: 'Invalid order coins_amount' }, { status: 500 })

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

  return NextResponse.json({ success: true, status: 'PAID' })
}
