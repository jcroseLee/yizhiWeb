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
    '*',
    'user_id, coins_amount, amount_cny, amount, status, out_trade_no',
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
    if (
      !isMissingColumnError(error2, 'coins_amount') &&
      !isMissingColumnError(error2, 'amount_cny') &&
      !isMissingColumnError(error2, 'amount')
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

export async function POST(request: Request) {
  // Only allow in development or if specifically enabled
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_MOCK_PAYMENT) {
    return NextResponse.json({ error: 'Mock payment not enabled' }, { status: 403 })
  }

  const supabase = await createClient()
  let {
    data: { user },
    error: authError,
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
    const debug =
      process.env.NODE_ENV !== 'production'
        ? {
            hasAuthHeader: Boolean(request.headers.get('authorization') || request.headers.get('Authorization')),
            hasCookieHeader: Boolean(request.headers.get('cookie')),
            authError: authError?.message || null,
          }
        : null

    return NextResponse.json({ error: 'Unauthorized', ...(debug ? { debug } : {}) }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { out_trade_no } = body

    if (!out_trade_no) {
      return NextResponse.json({ error: 'Missing out_trade_no' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Get the order
    const order = await loadOrderForRecharge(admin, out_trade_no)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'PAID') {
      return NextResponse.json({ message: 'Order already paid' })
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Order does not belong to user' }, { status: 403 })
    }

    const coinsAmount = resolveCoinsAmount(order)
    if (!coinsAmount || coinsAmount <= 0) {
      return NextResponse.json({ error: 'Invalid order coins_amount' }, { status: 500 })
    }

    const { error: rpcError } = await admin.rpc('recharge_coins', {
      p_user_id: user.id,
      p_amount: coinsAmount,
      p_out_trade_no: out_trade_no
    })

    if (rpcError) {
      console.error('recharge_coins error:', rpcError)
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    try {
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('yi_coins, coin_paid, coin_free')
        .eq('id', user.id)
        .single()

      if (!profileError) {
        const yiCoinsRaw = (profile as any)?.yi_coins
        const yiCoins = yiCoinsRaw === null || yiCoinsRaw === undefined ? null : Number(yiCoinsRaw)
        const coinPaid = Number((profile as any)?.coin_paid ?? 0)
        const coinFree = Number((profile as any)?.coin_free ?? 0)
        const sum = (Number.isFinite(coinPaid) ? coinPaid : 0) + (Number.isFinite(coinFree) ? coinFree : 0)

        if (Number.isFinite(sum) && (yiCoins === null || !Number.isFinite(yiCoins) || yiCoins !== sum)) {
          await admin.from('profiles').update({ yi_coins: sum }).eq('id', user.id)
        }
      }
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Mock recharge error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
