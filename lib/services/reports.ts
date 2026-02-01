import { getCurrentUser, getSession } from './auth'
import { getSupabaseClient } from './supabaseClient'

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
 * 提交举报
 */
export async function submitReport(input: SubmitReportInput): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 检查是否在24小时内已举报过同一内容
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_id', input.targetId)
      .eq('target_type', input.targetType)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle()

    if (existingReport) {
      return { success: false, message: '您已在24小时内举报过此内容，请勿重复举报' }
    }

    // 提交举报
    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        target_id: input.targetId,
        target_type: input.targetType,
        reason_category: input.reasonCategory,
        description: input.description || null,
        status: 'pending',
      })

    if (error) {
      console.error('Error submitting report:', error)
      return { success: false, message: '提交失败：' + (error.message || '未知错误') }
    }

    return { success: true, message: '感谢您的正义感！举报已提交，我们会尽快核实处理' }
  } catch (error) {
    console.error('Error submitting report:', error)
    return { success: false, message: '提交失败，请稍后重试' }
  }
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
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('status', options.status)
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
      target_id: item.target_id,
      target_type: item.target_type as ReportTargetType,
      reason_category: item.reason_category as ReportReasonCategory,
      description: item.description,
      status: item.status as ReportStatus,
      admin_note: item.admin_note,
      resolved_by: item.resolved_by,
      resolved_at: item.resolved_at,
      created_at: item.created_at,
      updated_at: item.created_at, 
    }))
  } catch (error) {
    console.error('Error fetching reports:', error)
    return []
  }
}

/**
 * 获取我的举报记录
 */
export async function getMyReports(options?: {
  limit?: number
  offset?: number
}): Promise<Report[]> {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  try {
    let query = supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching my reports:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      reporter_id: item.reporter_id,
      target_id: item.target_id,
      target_type: item.target_type as ReportTargetType,
      reason_category: item.reason_category as ReportReasonCategory,
      description: item.description,
      status: item.status as ReportStatus,
      admin_note: item.admin_note,
      resolved_by: item.resolved_by,
      resolved_at: item.resolved_at,
      created_at: item.created_at,
      updated_at: item.updated_at || item.created_at, 
    }))
  } catch (error) {
    console.error('Error fetching my reports:', error)
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

  try {
    const session = await getSession()
    if (!session?.access_token) {
      return { success: false, message: '请先登录' }
    }

    const adminAction = action === 'resolve' ? 'hide_content' : 'ignore'

    const res = await fetch('/api/admin/resolve-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        report_id: reportId,
        action: adminAction,
        note: adminNote || null,
      }),
    })

    const json = await res.json().catch(() => null as any)
    if (!res.ok) {
      return { success: false, message: json?.error || '处理失败，请稍后重试' }
    }

    return { success: true, message: '处理成功' }
  } catch (error) {
    console.error('Error resolving report:', error)
    return { success: false, message: '处理失败，请稍后重试' }
  }
}
