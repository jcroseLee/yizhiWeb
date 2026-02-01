import { isMissingColumnError } from '@/lib/utils/compatibility'
import { logMetric } from '@/lib/utils/logger'

/**
 * 加载充值订单
 * 
 * **功能说明**:
 * 尝试通过 `outTradeNo` 或 `id` 查询订单。
 * 为了兼容性，会尝试多种查询字段组合，以应对可能的数据库 Schema 差异。
 * 
 * @param admin Supabase Admin 客户端
 * @param outTradeNo 外部订单号
 * @returns 订单数据或 null
 */
export async function loadOrderForRecharge(admin: any, outTradeNo: string) {
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

/**
 * 解析充值易币数量
 * 
 * **业务逻辑**:
 * 1. 优先使用订单中的 `coins_amount`。
 * 2. 如果不存在，则根据 `amount_cny` 按 1:10 汇率计算。
 * 
 * @param order 订单对象
 * @returns 易币数量或 null
 */
export function resolveCoinsAmount(order: any) {
  const coinsAmount = Number(order?.coins_amount)
  if (Number.isFinite(coinsAmount) && coinsAmount > 0) return Math.floor(coinsAmount)

  const amountCny = Number(order?.amount_cny ?? order?.amount)
  if (Number.isFinite(amountCny) && amountCny > 0) return Math.floor(amountCny * 10)
  return null
}

/**
 * 充值入账 (降级/Fallback 方案)
 * 
 * **使用场景**:
 * 当 RPC `recharge_coins` 调用失败(例如不存在)时，使用此函数手动更新数据库。
 * 
 * **业务逻辑**:
 * 1. **幂等性检查**: 检查是否已存在相同的充值交易记录。
 * 2. **更新余额**: 
 *    - 尝试更新 `coin_paid` (充值币) 和 `yi_coins` (总余额)。
 *    - 如果 `coin_paid` 列不存在，降级为只更新 `yi_coins`。
 * 3. **插入流水**: 插入交易记录。
 * 
 * @param admin Supabase Admin 客户端
 * @param userId 用户ID
 * @param coinsAmount 充值金额
 * @param outTradeNo 外部订单号
 */
export async function creditRechargeFallback(admin: any, userId: string, coinsAmount: number, outTradeNo: string) {
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
    logMetric('recharge_amount', coinsAmount, { userId, outTradeNo, method: 'fallback_legacy' })
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
  
  logMetric('recharge_amount', coinsAmount, { userId, outTradeNo, method: 'fallback' })
}

/**
 * 同步易币余额
 * 
 * **功能说明**:
 * 确保 `yi_coins` (总余额) 等于 `coin_paid` + `coin_free`。
 * 用于修复由于并发或其他原因导致的数据不一致。
 * 
 * @param admin Supabase Admin 客户端
 * @param userId 用户ID
 */
export async function syncYiCoins(admin: any, userId: string) {
  try {
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('yi_coins, coin_paid, coin_free')
      .eq('id', userId)
      .single()

    if (!profileError) {
      const yiCoinsRaw = (profile as any)?.yi_coins
      const yiCoins = yiCoinsRaw === null || yiCoinsRaw === undefined ? null : Number(yiCoinsRaw)
      const coinPaid = Number((profile as any)?.coin_paid ?? 0)
      const coinFree = Number((profile as any)?.coin_free ?? 0)
      const sum = (Number.isFinite(coinPaid) ? coinPaid : 0) + (Number.isFinite(coinFree) ? coinFree : 0)

      if (Number.isFinite(sum) && (yiCoins === null || !Number.isFinite(yiCoins) || yiCoins !== sum)) {
        await admin.from('profiles').update({ yi_coins: sum }).eq('id', userId)
      }
    }
  } catch {}
}
