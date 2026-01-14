import { logError } from '../utils/errorLogger'
import { getCurrentUser } from './auth'
import { getSupabaseClient } from './supabaseClient'

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
  metadata?: Record<string, unknown> | null
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

interface ConversationRow {
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
      // 如果错误对象为空或没有有用信息，提供更多上下文
      const hasErrorInfo = error && (
        error.message || 
        error.code || 
        error.details || 
        error.hint ||
        (typeof error === 'object' && Object.keys(error).length > 0)
      )
      
      if (!hasErrorInfo) {
        // 空错误对象通常表示 RPC 函数不存在或数据库连接问题
        logError('Error fetching conversations:', {
          ...error,
          _context: 'RPC call to get_dm_conversations failed with empty error',
          _suggestion: 'Check if the get_dm_conversations function exists in the database',
          userId: user.id,
        })
        throw new Error('获取会话列表失败：数据库函数可能不存在或连接异常')
      } else {
        logError('Error fetching conversations:', error)
      }
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // 获取对应用户的信息
    const conversations = data as ConversationRow[]
    const userIds = conversations
      .map((conv) => conv.other_user_id)
      .filter((id): id is string => !!id)

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds)

      if (!profileError && profiles) {
        const profileMap = new Map(
          profiles.map((p) => [p.id, { id: p.id, nickname: p.nickname, avatar_url: p.avatar_url }])
        )

        return conversations.map((conv) => ({
          ...conv,
          other_user: profileMap.get(conv.other_user_id),
        }))
      }
    }

    return conversations as unknown as Conversation[]
  } catch (error) {
    logError('Error in getConversations:', error)
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
      logError('Error setting conversation setting:', error)
      throw error
    }

    return true
  } catch (error) {
    logError('Error in setConversationSetting:', error)
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
      logError('Error fetching messages:', error)
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
  } catch (error) {
    logError('Error in getMessages:', error)
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
  metadata?: Record<string, unknown> | null
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
    const messageData: {
      sender_id: string
      receiver_id: string
      content: string
      message_type: string
      is_read: boolean
      metadata?: Record<string, unknown> | null
    } = {
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
      logError('Error sending message:', {
        senderId: user.id,
        receiverId,
        messageType,
        hasMetadata: !!metadata,
        metadataKeys: metadata ? Object.keys(metadata) : undefined,
        fullError: error,
      })
      // 提供更详细的错误信息
      const getStringField = (obj: unknown, field: string): string | undefined => {
        if (!obj || typeof obj !== 'object') return undefined
        try {
          const value = (obj as Record<string, unknown>)[field]
          return typeof value === 'string' ? value : undefined
        } catch {
          return undefined
        }
      }

      let errorMessage: string | undefined = getStringField(error, 'message')
      if (!errorMessage) errorMessage = getStringField(error, 'details')
      if (!errorMessage) errorMessage = getStringField(error, 'hint')
      
      // 如果错误对象是空的，提供更具体的错误信息
      if (!errorMessage) {
        let errorString: string | null = null
        try {
          const seen = new WeakSet<object>()
          errorString = JSON.stringify(error, (_k, v: unknown) => {
            if (typeof v === 'object' && v !== null) {
              if (seen.has(v)) return '[Circular]'
              seen.add(v)
            }
            if (typeof v === 'bigint') return v.toString()
            if (typeof v === 'function') {
              const fnNameRaw = (v as { name?: unknown }).name
              const fnName = typeof fnNameRaw === 'string' ? fnNameRaw : ''
              return `[Function${fnName ? `: ${fnName}` : ''}]`
            }
            if (typeof v === 'symbol') return v.toString()
            return v
          })
        } catch {
          errorString = null
        }

        if (!errorString || errorString === '{}' || errorString === 'null') {
          const keys =
            error && typeof error === 'object' ? Object.getOwnPropertyNames(error) : []
          if (keys.length > 0) {
            errorMessage = `错误对象无可用消息字段（字段: ${keys.join(', ')}）`
          } else {
            errorMessage = '数据库返回了空错误对象，可能是数据库连接问题或表结构问题'
          }
        } else {
          errorMessage = errorString
        }
      }
      
      throw new Error(`发送消息失败: ${errorMessage || '未知错误'}`)
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
  } catch (error) {
    logError('Error in sendMessage:', error)
    throw error
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
    // 尝试使用 RPC 函数标记已读
    const { error } = await supabase.rpc('mark_dm_read', {
      other_id: otherUserId,
    })

    if (error) {
      // 如果 RPC 失败（例如函数不存在），尝试直接更新
      // 这可以作为回退机制，确保即使数据库迁移未完全应用也能工作
      console.warn('RPC mark_dm_read failed, trying direct update fallback...', error)
      
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', otherUserId)
        .eq('is_read', false)
        .is('group_id', null)

      if (updateError) {
        logError('Error marking messages as read (fallback failed):', updateError)
        // 不抛出错误，以免中断 UI 流程，但记录日志
        return false
      }
    }

    return true
  } catch (error) {
    logError('Error in markMessagesAsRead:', error)
    // 不抛出错误，以免中断 UI 流程
    return false
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
      logError('Error getting notification unread count:', error)
      return dmUnreadCount
    }

    return dmUnreadCount + (notificationUnreadCount || 0)
  } catch (error) {
    logError('Error getting total unread count:', error)
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
