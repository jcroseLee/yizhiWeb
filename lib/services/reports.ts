import { getSupabaseClient } from './supabaseClient'
import { getCurrentUser } from './auth'

export type ReportReasonCategory = 
  | 'compliance'      // 违法违规 / 敏感信息
  | 'superstition'    // 封建迷信 / 怪力乱神
  | 'scam'            // 广告引流 / 诈骗钱财
  | 'attack'          // 人身攻击 / 恶意引战
  | 'spam'            // 垃圾灌水 / 内容不适

export type ReportTargetType = 'post' | 'comment' | 'user'

export type ReportStatus = 'pending' | 'resolved' | 'rejected'

export interface Report {
  id: string
  reporter_id: string
  target_id: string
  target_type: ReportTargetType
  reason_category: ReportReasonCategory
  description: string | null
  status: ReportStatus
  admin_note: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface SubmitReportInput {
  targetId: string
  targetType: ReportTargetType
  reasonCategory: ReportReasonCategory
  description?: string
}

/**
 * 映射举报理由到数据库格式
 */
function mapReasonCategoryToDB(category: ReportReasonCategory): string {
  const mapping: Record<ReportReasonCategory, string> = {
    'compliance': '其他',      // 违法违规 / 敏感信息 -> 其他
    'superstition': '迷信',    // 封建迷信 / 怪力乱神 -> 迷信
    'scam': '广告',            // 广告引流 / 诈骗钱财 -> 广告
    'attack': '辱骂',          // 人身攻击 / 恶意引战 -> 辱骂
    'spam': '导流',            // 垃圾灌水 / 内容不适 -> 导流
  }
  return mapping[category] || '其他'
}

/**
 * 提交举报
 */
export async function submitReport(input: SubmitReportInput): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  // post_reports 表只支持帖子举报
  if (input.targetType !== 'post') {
    return { success: false, message: '当前仅支持举报帖子' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 检查是否在24小时内已举报过同一内容
    const { data: existingReport } = await supabase
      .from('post_reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('post_id', input.targetId)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle()

    if (existingReport) {
      return { success: false, message: '您已在24小时内举报过此内容，请勿重复举报' }
    }

    // 提交举报 - 使用 post_reports 表的实际结构
    const { error } = await supabase
      .from('post_reports')
      .insert({
        reporter_id: user.id,
        post_id: input.targetId,
        reason: mapReasonCategoryToDB(input.reasonCategory),
        details: input.description || null,
        status: 'open', // post_reports 使用 'open'/'closed' 而不是 'pending'/'resolved'/'rejected'
      })

    if (error) {
      console.error('Error submitting report:', error)
      return { success: false, message: '提交失败：' + (error.message || '未知错误') }
    }

    return { success: true, message: '举报已提交，感谢您维护社区清朗' }
  } catch (error: any) {
    console.error('Error submitting report:', error)
    return { success: false, message: '提交失败，请稍后重试' }
  }
}

/**
 * 映射数据库状态到应用状态
 */
function mapStatusFromDB(dbStatus: string): ReportStatus {
  // post_reports 使用 'open'/'closed'，映射到应用层的 'pending'/'resolved'
  if (dbStatus === 'open') return 'pending'
  if (dbStatus === 'closed') return 'resolved'
  return 'pending'
}

/**
 * 映射应用状态到数据库状态
 */
function mapStatusToDB(appStatus: ReportStatus): string {
  if (appStatus === 'pending') return 'open'
  if (appStatus === 'resolved' || appStatus === 'rejected') return 'closed'
  return 'open'
}

/**
 * 映射数据库理由到应用理由
 */
function mapReasonFromDB(dbReason: string): ReportReasonCategory {
  const mapping: Record<string, ReportReasonCategory> = {
    '广告': 'scam',
    '辱骂': 'attack',
    '导流': 'spam',
    '迷信': 'superstition',
    '其他': 'compliance',
  }
  return mapping[dbReason] || 'compliance'
}

/**
 * 获取举报列表（管理员）
 */
export async function getReports(options?: {
  status?: ReportStatus
  limit?: number
  offset?: number
}): Promise<Report[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  try {
    let query = supabase
      .from('post_reports')
      .select('*')
      .order('created_at', { ascending: false })

    // 映射状态：如果查询 pending，则查询 open；如果查询 resolved，则查询 closed
    if (options?.status) {
      const dbStatus = mapStatusToDB(options.status)
      query = query.eq('status', dbStatus)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching reports:', error)
      return []
    }

    // 转换数据格式以匹配 Report 接口
    return (data || []).map((item: any) => ({
      id: item.id,
      reporter_id: item.reporter_id,
      target_id: item.post_id, // post_reports 使用 post_id
      target_type: 'post' as const, // post_reports 只支持帖子
      reason_category: mapReasonFromDB(item.reason),
      description: item.details, // post_reports 使用 details
      status: mapStatusFromDB(item.status),
      admin_note: null, // post_reports 没有这个字段
      resolved_by: item.processed_by, // post_reports 使用 processed_by
      resolved_at: item.processed_at, // post_reports 使用 processed_at
      created_at: item.created_at,
      updated_at: item.created_at, // post_reports 没有 updated_at，使用 created_at
    }))
  } catch (error) {
    console.error('Error fetching reports:', error)
    return []
  }
}

/**
 * 处理举报（管理员）
 */
export async function resolveReport(
  reportId: string,
  action: 'resolve' | 'reject',
  adminNote?: string
): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 检查是否为管理员
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, message: '无权限操作' }
    }

    // post_reports 表使用 'closed' 状态和 processed_by/processed_at 字段
    const { error } = await supabase
      .from('post_reports')
      .update({
        status: 'closed', // post_reports 使用 'closed' 表示已处理
        processed_by: user.id, // post_reports 使用 processed_by
        processed_at: new Date().toISOString(), // post_reports 使用 processed_at
        // 注意：post_reports 表没有 admin_note 字段，如果需要可以存储在 details 中
        // 但为了不破坏现有数据，这里暂时不更新 details
      })
      .eq('id', reportId)

    if (error) {
      console.error('Error resolving report:', error)
      return { success: false, message: '处理失败：' + (error.message || '未知错误') }
    }

    return { success: true, message: '处理成功' }
  } catch (error: any) {
    console.error('Error resolving report:', error)
    return { success: false, message: '处理失败，请稍后重试' }
  }
}

