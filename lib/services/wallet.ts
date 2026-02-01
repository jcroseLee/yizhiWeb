import { log, LogLevel, logMetric } from '@/lib/utils/logger'
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
 * 
 * **功能说明**:
 * 查询用户的易币交易记录，支持分页和按类型筛选。
 * 
 * @param userId 用户ID
 * @param type 交易类型 ('PAID' | 'FREE' | null)
 * @param limit 每页数量
 * @param offset 偏移量
 * @param client 可选的 Supabase 客户端
 * @returns 交易记录列表
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
 * 
 * **业务逻辑**:
 * 1. **生成订单号**: 使用时间戳+随机数生成唯一的 `out_trade_no`。
 * 2. **计算易币数量**: 根据汇率 (当前 1元=10币) 计算应充值的易币数量。
 * 3. **创建订单**: 在 `orders` 表中创建状态为 `PENDING` 的订单。
 * 4. **兼容性处理**: 处理旧版数据库可能缺少的字段。
 * 
 * @param params 订单参数 (用户ID, 金额, 支付方式)
 * @param client 可选的 Supabase 客户端
 * @returns 创建的订单数据
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
 * 消费易币 (调用 RPC `spend_coins`)
 * 
 * **业务逻辑**:
 * 1. **双轨制扣费**: 
 *    - 优先扣除易币(Free Coins)，按过期时间 FIFO (先进先出)。
 *    - 易币不足时，扣除充值币(Paid Coins)。
 * 2. **参数控制**:
 *    - `allowFreeCoin`: 是否允许使用赠送币(Free Coins)。若为 false，则强制只扣除 Paid Coins。
 * 
 * @param userId 用户ID
 * @param amount 消费金额
 * @param description 消费描述
 * @param allowFreeCoin 是否允许使用赠送币 (默认 true)
 * @param client 可选的 Supabase 客户端
 * @returns RPC 执行结果
 */
export async function spendCoins(userId: string, amount: number, description: string, allowFreeCoin = true, client?: SupabaseClient) {
  const supabase = client || getSupabaseClient()
  if (!supabase) throw new Error('Supabase client not initialized')

  log(LogLevel.INFO, 'spendCoins started', { userId, amount, description, allowFreeCoin })

  const { data, error } = await supabase.rpc('spend_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_allow_free_coin: allowFreeCoin,
    p_description: description
  })

  if (error) {
    log(LogLevel.ERROR, 'spendCoins error', { userId, amount, error })
    throw error
  }
  
  log(LogLevel.INFO, 'spendCoins success', { userId, amount, data })
  return data
}

/**
 * 充值入账 (调用 RPC `recharge_coins`) - 通常由 webhook 调用
 * 
 * **业务逻辑**:
 * 1. **增加余额**: 增加用户的充值币(Paid Coins)余额。
 * 2. **记录流水**: 创建一条类型为 `recharge` 的交易记录。
 * 3. **幂等性**: 通常通过 `outTradeNo` 在业务层或数据库约束保证幂等性。
 * 
 * @param userId 用户ID
 * @param amount 充值金额(易币数量)
 * @param outTradeNo 外部订单号
 * @param client 可选的 Supabase 客户端
 */
export async function confirmRecharge(userId: string, amount: number, outTradeNo: string, client?: SupabaseClient) {
  const supabase = client || getSupabaseClient()
  if (!supabase) throw new Error('Supabase client not initialized')

  log(LogLevel.INFO, 'confirmRecharge started', { userId, amount, outTradeNo })

  const { error } = await supabase.rpc('recharge_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_out_trade_no: outTradeNo
  })

  if (error) {
    log(LogLevel.ERROR, 'confirmRecharge error', { userId, amount, outTradeNo, error })
    throw error
  }

  log(LogLevel.INFO, 'confirmRecharge success', { userId, amount, outTradeNo })
  logMetric('recharge_amount', amount, { userId, outTradeNo, method: 'rpc' })
}
