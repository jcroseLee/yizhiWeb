import { getSupabaseClient } from './supabaseClient'
import { getCurrentUser } from './auth'

/**
 * 用户成长体系服务
 * 实现PRD中定义的资历（等级）和声望（段位）系统
 */

export interface UserGrowth {
  exp: number // 修业值
  reputation: number // 声望值
  level: number // 等级（基于EXP计算）
  titleLevel: number // 称号等级（基于声望值）
  titleName: string // 称号名称
  yiCoins: number // 易币余额
  cashBalance: number // 现金余额
  lastCheckinDate: string | null // 最后签到日期
  consecutiveCheckinDays: number // 连续签到天数
}

export interface CoinTransaction {
  id: string
  amount: number
  type: string
  description: string | null
  created_at: string
}

export interface DailyTask {
  taskType: string
  completed: boolean
  completedAt: string | null
}

// 等级配置（基于PRD）
export const LEVEL_CONFIG = [
  { level: 0, name: '游客', expRequired: 0, badge: '无' },
  { level: 1, name: '初涉易途', expRequired: 1, badge: '灰边框' },
  { level: 2, name: '登堂入室', expRequired: 100, badge: '铜边框' },
  { level: 3, name: '渐入佳境', expRequired: 500, badge: '银边框' },
  { level: 4, name: '触类旁通', expRequired: 2000, badge: '银边框+流光' },
  { level: 5, name: '融会贯通', expRequired: 5000, badge: '金边框' },
  { level: 6, name: '出神入化', expRequired: 10000, badge: '金边框+纹饰' },
  { level: 7, name: '一代宗师', expRequired: 20000, badge: '动态特效边框' },
] as const

// 声望段位体系配置（学术地位 - Reputation）
// 根据PRD 2.2：衡量用户的专业水平与预测准确度
export const TITLE_CONFIG = [
  { level: 1, name: '白身', reputationRequired: 0, badge: '无', description: '初始状态' },
  { level: 2, name: '学人', reputationRequired: 50, badge: '墨蓝勋章', description: '累计获得 10 次赞同' },
  { level: 3, name: '术士', reputationRequired: 200, badge: '铜质印章', description: '累计 5 次预测被验证为"准"' },
  { level: 4, name: '方家', reputationRequired: 500, badge: '银质印章', description: '累计 20 次验证"准" + 通过实名认证' },
  { level: 5, name: '先生', reputationRequired: 1000, badge: '金质印章', description: '准确率 > 60% + 累计 50 次验证"准"' },
  { level: 6, name: '国手', reputationRequired: 5000, badge: '玉质印章', description: '平台邀请制，行业顶尖大德' },
] as const

/**
 * 根据EXP计算等级
 */
export function calculateLevel(exp: number): number {
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_CONFIG[i].expRequired) {
      return LEVEL_CONFIG[i].level
    }
  }
  return 0
}

/**
 * 根据声望值计算称号等级
 */
export function calculateTitleLevel(reputation: number): number {
  for (let i = TITLE_CONFIG.length - 1; i >= 0; i--) {
    if (reputation >= TITLE_CONFIG[i].reputationRequired) {
      return TITLE_CONFIG[i].level
    }
  }
  return 1
}

/**
 * 获取称号名称
 */
export function getTitleName(titleLevel: number): string {
  const title = TITLE_CONFIG.find(t => t.level === titleLevel)
  return title?.name || '白身'
}

/**
 * 获取用户成长数据
 */
export async function getUserGrowth(): Promise<UserGrowth | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('exp, reputation, yi_coins, cash_balance, title_level, last_checkin_date, consecutive_checkin_days')
      .eq('id', user.id)
      .single()

    if (error) {
      // 记录详细的错误信息
      const errorDetails = {
        code: error.code || 'UNKNOWN',
        message: error.message || 'Unknown error',
        details: error.details || null,
        hint: error.hint || null,
        userId: user.id,
        errorType: error.constructor?.name || typeof error,
        errorString: String(error),
        fullError: error,
      }
      
      // 如果是"未找到"错误（PGRST116）或 406 错误，这是正常的（用户可能还没有profile记录）
      // 静默处理，不记录日志
      if (error.code === 'PGRST116' || 
          (error as any).status === 406 ||
          error.message?.includes('JSON object requested, multiple') || 
          error.message?.includes('0 rows') ||
          error.message?.includes('Not Acceptable')) {
        // Profile 不存在是正常情况，静默返回 null
        return null
      }
      
      // 记录实际错误
      console.error('Error fetching user growth:', errorDetails)
      return null
    }

    const exp = data.exp || 0
    const reputation = data.reputation || 0
    const titleLevel = data.title_level || 1

    return {
      exp,
      reputation,
      level: calculateLevel(exp),
      titleLevel,
      titleName: getTitleName(titleLevel),
      yiCoins: data.yi_coins || 0,
      cashBalance: parseFloat(data.cash_balance || '0'),
      lastCheckinDate: data.last_checkin_date,
      consecutiveCheckinDays: data.consecutive_checkin_days || 0,
    }
  } catch (error) {
    // 处理意外的错误（非 Supabase 错误）
    let errorInfo: any
    
    if (error instanceof Error) {
      errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } else if (typeof error === 'object' && error !== null) {
      // 尝试序列化错误对象
      try {
        errorInfo = {
          type: typeof error,
          stringified: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          raw: error,
        }
      } catch (stringifyError) {
        // 如果序列化失败，使用更安全的方法
        errorInfo = {
          type: typeof error,
          constructor: error.constructor?.name,
          keys: Object.keys(error),
          toString: String(error),
          raw: error,
        }
      }
    } else {
      errorInfo = { 
        raw: error,
        type: typeof error,
        stringified: String(error),
      }
    }
    
    console.error('Unexpected error fetching user growth:', {
      userId: user.id,
      error: errorInfo,
    })
    return null
  }
}

/**
 * 签到功能
 * 根据PRD：
 * - 每日签到：+5 ~ +20 易币（随机/连续递增）
 * - 连续签到7天：+50 修业值
 * - 签到：+10 修业值
 */
export async function checkIn(): Promise<{ success: boolean; coins: number; exp: number; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, coins: 0, exp: 0, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, coins: 0, exp: 0, message: '系统错误' }
  }

  try {
    // 获取用户当前数据
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('last_checkin_date, consecutive_checkin_days, yi_coins, exp')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching profile:', fetchError)
      return { success: false, coins: 0, exp: 0, message: '获取用户信息失败' }
    }

    const today = new Date().toISOString().split('T')[0]
    const lastCheckin = profile.last_checkin_date

    // 检查今天是否已经签到
    if (lastCheckin === today) {
      return { success: false, coins: 0, exp: 0, message: '今日已签到，请明日再来' }
    }

    // 计算连续签到天数
    let consecutiveDays = profile.consecutive_checkin_days || 0
    if (lastCheckin) {
      const lastDate = new Date(lastCheckin)
      const todayDate = new Date(today)
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        // 连续签到
        consecutiveDays += 1
      } else {
        // 中断了，重新开始
        consecutiveDays = 1
      }
    } else {
      // 首次签到
      consecutiveDays = 1
    }

    // 计算签到奖励
    // 易币：基础5-20，连续签到递增
    const baseCoins = 5 + Math.floor(Math.random() * 16) // 5-20随机
    const bonusCoins = Math.min(consecutiveDays * 2, 20) // 连续签到奖励，最多+20
    const totalCoins = baseCoins + bonusCoins

    // 修业值：签到+10，连续7天额外+50
    let expGain = 10
    if (consecutiveDays >= 7 && consecutiveDays % 7 === 0) {
      expGain += 50 // 连续7天奖励
    }

    // 更新用户数据
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        last_checkin_date: today,
        consecutive_checkin_days: consecutiveDays,
        yi_coins: (profile.yi_coins || 0) + totalCoins,
        exp: (profile.exp || 0) + expGain,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return { success: false, coins: 0, exp: 0, message: '签到失败，请重试' }
    }

    // 记录易币流水（必须成功，否则回滚）
    const { error: transactionError } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount: totalCoins,
        type: 'check_in',
        description: `每日签到奖励（连续${consecutiveDays}天）`,
      })

    if (transactionError) {
      console.error('Error inserting coin transaction:', transactionError)
      // 如果流水记录失败，回滚易币余额更新
      await supabase
        .from('profiles')
        .update({
          yi_coins: profile.yi_coins || 0,
        })
        .eq('id', user.id)
      return { success: false, coins: 0, exp: 0, message: '签到失败：无法记录交易流水，请重试' }
    }

    // 记录每日任务（失败不影响签到成功）
    await supabase
      .from('daily_tasks_log')
      .upsert({
        user_id: user.id,
        date: today,
        task_type: 'login',
        completed: true,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date,task_type',
      })

    const message = consecutiveDays >= 7 && consecutiveDays % 7 === 0
      ? `连续签到${consecutiveDays}天！获得${totalCoins}易币和${expGain}修业值（含连续奖励）`
      : `签到成功！获得${totalCoins}易币和${expGain}修业值（连续${consecutiveDays}天）`

    return { success: true, coins: totalCoins, exp: expGain, message }
  } catch (error) {
    console.error('Error checking in:', error)
    return { success: false, coins: 0, exp: 0, message: '签到失败，请重试' }
  }
}

/**
 * 检查今日是否已签到
 * 优化：如果已经传入lastCheckinDate，则不需要再查询数据库
 */
export async function hasCheckedInToday(lastCheckinDate?: string | null): Promise<boolean> {
  // 如果已经传入了lastCheckinDate，直接使用，避免查询数据库
  if (lastCheckinDate !== undefined) {
    const today = new Date().toISOString().split('T')[0]
    return lastCheckinDate === today
  }

  const user = await getCurrentUser()
  if (!user) return false

  const supabase = getSupabaseClient()
  if (!supabase) return false

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('last_checkin_date')
      .eq('id', user.id)
      .single()

    if (error || !data) return false

    const today = new Date().toISOString().split('T')[0]
    return data.last_checkin_date === today
  } catch (error) {
    console.error('Error checking checkin status:', error)
    return false
  }
}

/**
 * 获取易币流水记录
 */
export async function getCoinTransactions(limit: number = 20): Promise<CoinTransaction[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('coin_transactions')
      .select('id, amount, type, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching coin transactions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching coin transactions:', error)
    return []
  }
}

/**
 * 获取今日任务完成情况
 */
export async function getTodayTasks(): Promise<DailyTask[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('daily_tasks_log')
      .select('task_type, completed, completed_at')
      .eq('user_id', user.id)
      .eq('date', today)

    if (error) {
      console.error('Error fetching today tasks:', error)
      return []
    }

    return (data || []).map(task => ({
      taskType: task.task_type,
      completed: task.completed,
      completedAt: task.completed_at,
    }))
  } catch (error) {
    console.error('Error fetching today tasks:', error)
    return []
  }
}

/**
 * 增加修业值（EXP）
 * 根据PRD的规则：
 * - 每日修业：签到 (+10)，浏览 (+5)，点赞 (+2)
 * - 内容贡献：发布案例 (+20)，发表断语 (+10)
 * - 里程碑：连续签到7天 (+50)
 */
export async function addExp(amount: number, reason: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const supabase = getSupabaseClient()
  if (!supabase) return false

  try {
    // 使用数据库函数增加EXP（原子操作）
    const { error } = await supabase.rpc('increment_exp', {
      user_id_param: user.id,
      amount_param: amount,
    })

    if (error) {
      // 如果RPC函数不存在（404）或其他错误，使用直接更新作为fallback
      if (error.code === 'PGRST204' || error.message?.includes('function') || error.message?.includes('not found')) {
        // RPC函数不存在，使用直接更新
        const { data: profile } = await supabase
          .from('profiles')
          .select('exp')
          .eq('id', user.id)
          .single()

        if (profile) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ exp: (profile.exp || 0) + amount })
            .eq('id', user.id)

          if (updateError) {
            console.error('Error adding exp (fallback):', updateError)
            return false
          }
        } else {
          console.error('Profile not found for user:', user.id)
          return false
        }
      } else {
        // 其他错误
        console.error('Error calling increment_exp RPC:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error adding exp:', error)
    return false
  }
}

/**
 * 声望获取规则（严苛模式）
 * 
 * 正向：
 * - 断语获得赞同：+1
 * - 断语被题主采纳：+10
 * - 断语被验证为"准"：+20 (核心来源)
 * - 发布高质量复盘文章：+50 (管理员人工授分)
 * 
 * 负向：
 * - 断语被折叠/违规：-5
 * - 断语被验证为"错"：不扣分（鼓励探索），但在计算"准确率"时分母增加
 * 
 * @param amount 声望变化量（正数为增加，负数为扣除）
 * @param reason 原因说明
 * @param relatedId 关联ID（如评论ID、帖子ID等，用于记录）
 */
export async function addReputation(amount: number, reason: string, relatedId?: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const supabase = getSupabaseClient()
  if (!supabase) return false

  try {
    // 获取当前声望值
    const { data: profile } = await supabase
      .from('profiles')
      .select('reputation')
      .eq('id', user.id)
      .single()

    if (!profile) {
      console.error('Profile not found for user:', user.id)
      return false
    }

    const currentReputation = profile.reputation || 0
    const newReputation = currentReputation + amount

    // 声望值不能为负数
    const finalReputation = Math.max(0, newReputation)

    // 更新声望值
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ reputation: finalReputation })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating reputation:', updateError)
      return false
    }

    // 记录声望变化日志（如果表存在）
    try {
      await supabase
        .from('reputation_logs')
        .insert({
          user_id: user.id,
          amount,
          reason,
          related_id: relatedId,
          reputation_before: currentReputation,
          reputation_after: finalReputation,
        })
        .catch(err => {
          // 如果表不存在，忽略错误（不影响主流程）
          console.debug('Reputation log table may not exist:', err)
        })
    } catch (logError) {
      // 日志记录失败不影响主流程
      console.debug('Failed to log reputation change:', logError)
    }

    return true
  } catch (error) {
    console.error('Error adding reputation:', error)
    return false
  }
}

/**
 * 扣除声望值（用于违规等情况）
 */
export async function deductReputation(amount: number, reason: string, relatedId?: string): Promise<boolean> {
  return addReputation(-amount, reason, relatedId)
}

/**
 * 增加易币
 */
export async function addYiCoins(amount: number, type: string, description?: string, relatedId?: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const supabase = getSupabaseClient()
  if (!supabase) return false

  try {
    // 更新用户易币余额
    const { data: profile } = await supabase
      .from('profiles')
      .select('yi_coins')
      .eq('id', user.id)
      .single()

    if (profile) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ yi_coins: (profile.yi_coins || 0) + amount })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating yi_coins:', updateError)
        return false
      }

      // 记录流水 - 检查插入是否成功
      const { error: insertError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount,
          type,
          description,
          related_id: relatedId,
        })

      if (insertError) {
        console.error('Error inserting coin transaction:', insertError)
        // 如果流水记录插入失败，尝试回滚余额更新
        // 注意：这不是原子操作，但在大多数情况下可以保持数据一致性
        await supabase
          .from('profiles')
          .update({ yi_coins: (profile.yi_coins || 0) })
          .eq('id', user.id)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error adding yi coins:', error)
    return false
  }
}

/**
 * 消耗易币
 */
export async function consumeYiCoins(amount: number, type: string, description?: string, relatedId?: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 检查余额
    const { data: profile } = await supabase
      .from('profiles')
      .select('yi_coins')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.yi_coins || 0) < amount) {
      return { success: false, message: '易币余额不足' }
    }

    // 扣除易币
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ yi_coins: (profile.yi_coins || 0) - amount })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error consuming yi_coins:', updateError)
      return { success: false, message: '操作失败，请重试' }
    }

    // 记录流水
    await supabase
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        type,
        description,
        related_id: relatedId,
      })

    return { success: true, message: '操作成功' }
  } catch (error) {
    console.error('Error consuming yi coins:', error)
    return { success: false, message: '操作失败，请重试' }
  }
}

/**
 * 易币转账（从发送者转给接收者）
 * 用于悬赏求测贴的采纳功能
 * 使用数据库函数 transfer_yi_coins 来绕过 RLS 限制
 */
export async function transferYiCoins(
  fromUserId: string,
  toUserId: string,
  amount: number,
  type: string,
  description?: string,
  relatedId?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  if (amount <= 0) {
    return { success: false, message: '转账金额必须大于0' }
  }

  if (fromUserId === toUserId) {
    return { success: false, message: '不能转账给自己' }
  }

  try {
    // 使用数据库函数执行转账（绕过 RLS 限制）
    const { data, error } = await supabase.rpc('transfer_yi_coins', {
      p_from_user_id: fromUserId,
      p_to_user_id: toUserId,
      p_amount: amount,
      p_type: type,
      p_description: description || null,
      p_related_id: relatedId || null,
    })

    if (error) {
      console.error('Error calling transfer_yi_coins function:', error)
      return { success: false, message: `转账失败: ${error.message || '请重试'}` }
    }

    // 数据库函数返回 JSONB
    if (data && typeof data === 'object') {
      const result = data as any
      if ('success' in result) {
        if (result.success === true) {
          console.log('Transfer successful:', {
            from_balance: result.from_balance,
            to_balance: result.to_balance,
          })
          return {
            success: true,
            message: (result.message as string) || '转账成功',
          }
        } else {
          console.error('Transfer failed:', result.message)
          return {
            success: false,
            message: (result.message as string) || '转账失败',
          }
        }
      }
    }

    console.error('Unexpected response format from transfer_yi_coins:', data)
    return { success: false, message: '转账失败：服务器返回格式错误' }
  } catch (error: any) {
    console.error('Error transferring yi coins:', error)
    return { success: false, message: `转账失败: ${error.message || '请重试'}` }
  }
}

