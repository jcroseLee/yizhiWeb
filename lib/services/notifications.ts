import { getSupabaseClient } from './supabaseClient'
import { getCurrentUser } from './auth'
import { logError } from '../utils/errorLogger'

// -----------------------------------------------------------------------------
// 类型定义
// -----------------------------------------------------------------------------

export interface Notification {
  id: string
  user_id: string
  type: 'comment' | 'like' | 'reply' | 'follow' | 'system' | 'report_resolved' | 'report_rejected'
  related_id: string
  related_type: 'post' | 'comment' | 'user'
  actor_id: string | null
  content: string | null
  metadata: any
  is_read: boolean
  created_at: string
  actor?: {
    id: string
    nickname: string | null
    avatar_url: string | null
  }
}

// -----------------------------------------------------------------------------
// 通知相关
// -----------------------------------------------------------------------------

/**
 * 获取用户的通知列表
 */
export async function getNotifications(
  limit: number = 50,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      logError('Error fetching notifications:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // 获取操作者信息
    const actorIds = data
      .map((notif) => notif.actor_id)
      .filter((id): id is string => id !== null)

    if (actorIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', actorIds)

      if (!profileError && profiles) {
        const profileMap = new Map(
          profiles.map((p) => [p.id, { id: p.id, nickname: p.nickname, avatar_url: p.avatar_url }])
        )

        return data.map((notif) => ({
          ...notif,
          actor: notif.actor_id ? profileMap.get(notif.actor_id) : undefined,
        }))
      }
    }

    return data
  } catch (error: any) {
    logError('Error in getNotifications:', error)
    throw error
  }
}

/**
 * 获取未读通知数量
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getCurrentUser()
  if (!user) {
    return 0
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return 0
  }

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      logError('Error getting unread notification count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    logError('Error in getUnreadNotificationCount:', error)
    return 0
  }
}

/**
 * 标记通知为已读
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) {
      logError('Error marking notification as read:', error)
      throw error
    }

    return true
  } catch (error: any) {
    logError('Error in markNotificationAsRead:', error)
    throw error
  }
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      logError('Error marking all notifications as read:', error)
      throw error
    }

    return true
  } catch (error: any) {
    logError('Error in markAllNotificationsAsRead:', error)
    throw error
  }
}

/**
 * 订阅通知实时更新
 */
export function subscribeToNotifications(callback: (notification?: Notification) => void) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not initialized, cannot subscribe to notifications')
    return () => {}
  }

  let channel: ReturnType<typeof supabase.channel> | null = null

  getCurrentUser().then((user) => {
    if (!user) return

    channel = supabase
      .channel(`notifications-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new as Notification

          // 获取操作者信息
          if (notification.actor_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, nickname, avatar_url')
              .eq('id', notification.actor_id)
              .single()

            callback({
              ...notification,
              actor: profile || undefined,
            })
          } else {
            callback(notification)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // 通知被更新（如标记为已读），触发回调以刷新未读数
          callback()
        }
      )
      .subscribe()
  })

  return () => {
    if (channel) {
      supabase.removeChannel(channel)
    }
  }
}

/**
 * 创建通知
 * 使用数据库函数 create_notification 来绕过 RLS 限制
 */
export async function createNotification(
  userId: string,
  type: Notification['type'],
  relatedId: string,
  relatedType: Notification['related_type'],
  actorId?: string | null,
  content?: string | null,
  metadata?: any
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error('Supabase client not initialized')
    return false
  }

  try {
    // 使用数据库函数创建通知（绕过 RLS 限制）
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_related_id: relatedId,
      p_related_type: relatedType,
      p_actor_id: actorId || null,
      p_content: content || null,
      p_metadata: metadata || null,
    })

    if (error) {
      logError('Error creating notification:', error)
      return false
    }

    // 函数返回通知ID（uuid），如果成功则返回true
    return data !== null && data !== undefined
  } catch (error) {
    logError('Error in createNotification:', error)
    return false
  }
}

