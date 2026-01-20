import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'

export interface WalletBalance {
  total: number
  paid: number
  free: number
  about_to_expire: number
}

export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  type: string
  description: string | null
  balance_type: 'PAID' | 'FREE' | null
  related_batch_id: string | null
  created_at: string
}

export interface CreateOrderParams {
  userId: string
  amountCny: number
  paymentMethod: 'WECHAT' | 'ALIPAY'
}

export interface RechargeOption {
  id: string
  amount_cny: number
  coins_amount: number
  label: string
  is_recommend: boolean
  sort_order: number
}

/**
 * 获取充值选项
 */
export async function getRechargeOptions(client?: SupabaseClient): Promise<RechargeOption[]> {
  const supabase = client || getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recharge_options')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching recharge options:', error)
    return []
  }

  return data as RechargeOption[]
}

/**
 * 获取钱包余额详情
 */
export async function getWalletBalance(userId: string, client?: SupabaseClient): Promise<WalletBalance | null> {
  const supabase = client || getSupabaseClient()
  if (!supabase) return null

  const isMissingColumnError = (error: any, column: string) => {
    const msg = typeof error?.message === 'string' ? error.message : ''
    const details = typeof error?.details === 'string' ? error.details : ''
    const hay = `${msg} ${details}`.toLowerCase()
    return (
      error?.code === 'PGRST204' ||
      error?.code === '42703' ||
      hay.includes(`'${column.toLowerCase()}'`) ||
      hay.includes(`"${column.toLowerCase()}"`) ||
      hay.includes(`profiles.${column.toLowerCase()}`)
    )
  }

  // 1. 获取基础余额
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('coin_paid, coin_free')
    .eq('id', userId)
    .single()

  if (profileError) {
    if (isMissingColumnError(profileError, 'coin_paid') || isMissingColumnError(profileError, 'coin_free')) {
      const { data: legacy, error: legacyError } = await supabase.from('profiles').select('yi_coins').eq('id', userId).single()
      if (legacyError) {
        console.error('Error fetching wallet balance:', legacyError)
        return null
      }
      const total = Number((legacy as any)?.yi_coins ?? 0)
      return {
        total: Number.isFinite(total) ? total : 0,
        paid: 0,
        free: Number.isFinite(total) ? total : 0,
        about_to_expire: 0
      }
    }

    console.error('Error fetching wallet balance:', profileError)
    return null
  }

  // 2. 获取即将过期(例如7天内)的赠币
  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
  
  const { data: batches, error: batchError } = await supabase
    .from('coin_free_batches')
    .select('remaining_amount')
    .eq('user_id', userId)
    .eq('is_depleted', false)
    .lt('expire_at', sevenDaysLater.toISOString())
    .gt('expire_at', new Date().toISOString())

  let aboutToExpire = 0
  if (!batchError && batches) {
    aboutToExpire = batches.reduce((sum, batch) => sum + batch.remaining_amount, 0)
  }

  return {
    total: (profile.coin_paid || 0) + (profile.coin_free || 0),
    paid: profile.coin_paid || 0,
    free: profile.coin_free || 0,
    about_to_expire: aboutToExpire
  }
}

/**
 * 获取交易流水
 */
export async function getTransactions(userId: string, type?: 'PAID' | 'FREE', limit = 20, offset = 0, client?: SupabaseClient): Promise<CoinTransaction[]> {
  const supabase = client || getSupabaseClient()
  if (!supabase) return []

  let query = supabase
    .from('coin_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) {
    query = query.eq('balance_type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data as CoinTransaction[]
}

/**
 * 创建充值订单
 */
export async function createRechargeOrder(params: CreateOrderParams, client?: SupabaseClient) {
  const supabase = client || getSupabaseClient()
  if (!supabase) throw new Error('Supabase client not initialized')

  const outTradeNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`
  const coinsAmount = Math.floor(params.amountCny * 10) // 假设 1元 = 10币，可配置

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: params.userId,
      out_trade_no: outTradeNo,
      amount_cny: params.amountCny,
      coins_amount: coinsAmount,
      payment_method: params.paymentMethod,
      status: 'PENDING'
    })
    .select()
    .single()

  if (!error) return data

  const message = typeof error?.message === 'string' ? error.message : ''
  const isMissingColumnError =
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    message.includes('does not exist') ||
    message.includes('not exist')

  if (!isMissingColumnError) throw error

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('orders')
    .insert({
      user_id: params.userId,
      amount: params.amountCny,
      status: 'PENDING'
    })
    .select()
    .single()

  if (fallbackError) throw fallbackError

  return {
    ...fallbackData,
    out_trade_no: fallbackData.id,
    amount_cny: params.amountCny,
    coins_amount: coinsAmount,
    payment_method: params.paymentMethod
  }
}

/**
 * 消费易币 (调用 RPC)
 */
export async function spendCoins(userId: string, amount: number, description: string, allowFreeCoin = true, client?: SupabaseClient) {
  const supabase = client || getSupabaseClient()
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase.rpc('spend_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_allow_free_coin: allowFreeCoin,
    p_description: description
  })

  if (error) throw error
  return data
}

/**
 * 充值入账 (调用 RPC) - 通常由 webhook 调用
 */
export async function confirmRecharge(userId: string, amount: number, outTradeNo: string, client?: SupabaseClient) {
  const supabase = client || getSupabaseClient()
  if (!supabase) throw new Error('Supabase client not initialized')

  const { error } = await supabase.rpc('recharge_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_out_trade_no: outTradeNo
  })

  if (error) throw error
}
