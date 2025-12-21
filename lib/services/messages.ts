import { getSupabaseClient } from './supabaseClient'
import { getCurrentUser } from './auth'

// -----------------------------------------------------------------------------
// 类型定义
// -----------------------------------------------------------------------------

export interface Message {
  id: string
  sender_id: string
  receiver_id: string | null
  group_id: string | null
  content: string
  message_type?: string
  metadata?: any
  is_read: boolean
  created_at: string
  sender?: {
    id: string
    nickname: string | null
    avatar_url: string | null
  }
}

export interface Conversation {
  other_user_id: string
  last_message_id: string | null
  last_message_created_at: string | null
  last_message_content: string | null
  last_message_type: string | null
  unread_count: number
  is_pinned: boolean
  is_muted: boolean
  mute_until: string | null
  is_hidden: boolean
  other_user?: {
    id: string
    nickname: string | null
    avatar_url: string | null
  }
}

export interface ConversationSettings {
  is_pinned?: boolean
  is_muted?: boolean
  mute_until?: string | null
  is_hidden?: boolean
  last_read_at?: string | null
}

// -----------------------------------------------------------------------------
// 会话列表相关
// -----------------------------------------------------------------------------

/**
 * 获取用户的私信会话列表
 */
export async function getConversations(
  limit: number = 50,
  offset: number = 0
): Promise<Conversation[]> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // 调用 RPC 函数获取会话列表
    const { data, error } = await supabase.rpc('get_dm_conversations', {
      uid: user.id,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // 获取对应用户的信息
    const userIds = data
      .map((conv: any) => conv.other_user_id)
      .filter((id: string) => id)

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds)

      if (!profileError && profiles) {
        const profileMap = new Map(
          profiles.map((p) => [p.id, { id: p.id, nickname: p.nickname, avatar_url: p.avatar_url }])
        )

        return data.map((conv: any) => ({
          ...conv,
          other_user: profileMap.get(conv.other_user_id),
        }))
      }
    }

    return data
  } catch (error: any) {
    console.error('Error in getConversations:', error)
    throw error
  }
}

/**
 * 设置会话设置（置顶、免打扰、隐藏等）
 */
export async function setConversationSetting(
  otherUserId: string,
  settings: ConversationSettings
): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const { error } = await supabase.rpc('set_conversation_setting', {
      other_id: otherUserId,
      p_is_pinned: settings.is_pinned ?? null,
      p_is_muted: settings.is_muted ?? null,
      p_mute_until: settings.mute_until ?? null,
      p_is_hidden: settings.is_hidden ?? null,
      p_last_read_at: settings.last_read_at ?? null,
    })

    if (error) {
      console.error('Error setting conversation setting:', error)
      throw error
    }

    return true
  } catch (error: any) {
    console.error('Error in setConversationSetting:', error)
    throw error
  }
}

// -----------------------------------------------------------------------------
// 消息相关
// -----------------------------------------------------------------------------

/**
 * 获取与指定用户的私信历史
 */
export async function getMessages(
  otherUserId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // 获取消息，包括发送者和接收者都是当前用户或对方的消息
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .is('group_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // 获取发送者信息
    const senderIds = [...new Set(data.map((msg) => msg.sender_id))]
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', senderIds)

    if (!profileError && profiles) {
      const profileMap = new Map(
        profiles.map((p) => [p.id, { id: p.id, nickname: p.nickname, avatar_url: p.avatar_url }])
      )

      return data
        .map((msg) => ({
          ...msg,
          sender: profileMap.get(msg.sender_id),
        }))
        .reverse() // 反转顺序，使最早的消息在前
    }

    return data.reverse()
  } catch (error: any) {
    console.error('Error in getMessages:', error)
    throw error
  }
}

/**
 * 发送私信
 */
export async function sendMessage(
  receiverId: string,
  content: string,
  messageType: string = 'chat',
  metadata?: any
): Promise<Message> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  if (!content.trim()) {
    throw new Error('消息内容不能为空')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    const messageData: any = {
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim(),
      message_type: messageType,
      is_read: false,
    }

    if (metadata) {
      messageData.metadata = metadata
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      // 提供更详细的错误信息
      const errorMessage = error.message || error.details || JSON.stringify(error) || '发送消息失败'
      throw new Error(`发送消息失败: ${errorMessage}`)
    }

    if (!data) {
      throw new Error('发送消息失败: 服务器未返回数据')
    }

    // 获取发送者信息
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .eq('id', user.id)
      .single()

    return {
      ...data,
      sender: profile || undefined,
    }
  } catch (error: any) {
    console.error('Error in sendMessage:', error)
    // 如果已经是 Error 对象，直接抛出；否则包装成 Error
    if (error instanceof Error) {
      throw error
    }
    throw new Error(error?.message || '发送消息失败，请稍后重试')
  }
}

/**
 * 标记私信为已读
 */
export async function markMessagesAsRead(otherUserId: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // 使用 RPC 函数标记已读
    const { error } = await supabase.rpc('mark_dm_read', {
      other_id: otherUserId,
    })

    if (error) {
      console.error('Error marking messages as read:', error)
      throw error
    }

    return true
  } catch (error: any) {
    console.error('Error in markMessagesAsRead:', error)
    throw error
  }
}

/**
 * 订阅消息实时更新
 */
export function subscribeToMessages(
  otherUserId: string,
  callback: (message: Message) => void
) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not initialized, cannot subscribe to messages')
    return () => {}
  }

  const channel = supabase
    .channel(`messages:${otherUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${otherUserId}`,
      },
      async (payload) => {
        const message = payload.new as Message

        // 获取发送者信息
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .eq('id', message.sender_id)
          .single()

        callback({
          ...message,
          sender: profile || undefined,
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * 获取总未读消息数（私信 + 系统消息 + 互动消息）
 */
export async function getTotalUnreadCount(): Promise<number> {
  const user = await getCurrentUser()
  if (!user) {
    return 0
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return 0
  }

  try {
    // 获取私信未读数
    const conversations = await getConversations(100, 0)
    const dmUnreadCount = conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)

    // 获取通知未读数（系统消息 + 互动消息）
    const { count: notificationUnreadCount, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Error getting notification unread count:', error)
      return dmUnreadCount
    }

    return dmUnreadCount + (notificationUnreadCount || 0)
  } catch (error) {
    console.error('Error getting total unread count:', error)
    return 0
  }
}

/**
 * 订阅会话列表实时更新
 */
export function subscribeToConversations(callback: () => void) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not initialized, cannot subscribe to conversations')
    return () => {}
  }

  const channel = supabase
    .channel(`conversations-${Date.now()}`) // 使用唯一channel名称避免冲突
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      () => {
        // 延迟一点执行，确保数据库已更新
        setTimeout(() => {
          callback()
        }, 200)
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversation_settings',
      },
      () => {
        // 延迟一点执行，确保数据库已更新
        setTimeout(() => {
          callback()
        }, 200)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

