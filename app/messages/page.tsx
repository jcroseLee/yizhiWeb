'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Card } from '@/lib/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/lib/components/ui/dropdown-menu'
import { Input } from '@/lib/components/ui/input'
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import { Separator } from '@/lib/components/ui/separator'
import { Textarea } from '@/lib/components/ui/textarea'
import { getCurrentUser } from '@/lib/services/auth'
import { getPost, type Comment as CommentType, type Post } from '@/lib/services/community'
import {
    getConversations,
    getMessages,
    markMessagesAsRead,
    sendMessage,
    setConversationSetting,
    subscribeToConversations,
    subscribeToMessages,
    type Conversation as ConversationType,
    type Message as MessageType
} from '@/lib/services/messages'
import {
    getNotifications,
    markNotificationAsRead,
    subscribeToNotifications,
    type Notification as NotificationType
} from '@/lib/services/notifications'
import { getUserProfileById } from '@/lib/services/profile'
import { getSupabaseClient } from '@/lib/services/supabaseClient'
import {
    Bell,
    CheckCheck,
    Heart,
    Image as ImageIcon,
    MoreHorizontal,
    Paperclip,
    Pin,
    PinOff,
    Search,
    Smile,
    ThumbsUp,
    User,
    Volume2,
    VolumeX,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'

// --- 样式定义 ---
const styles = `
  .paper-texture {
    background-color: #fdfbf7;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  
  .chat-bubble-me {
    background-color: #e5e5e5;
    color: #1c1917;
    border-radius: 8px 0 8px 8px;
  }
  
  .chat-bubble-other {
    background-color: #ffffff;
    border: 1px solid #f5f5f4;
    color: #1c1917;
    border-radius: 0 8px 8px 8px;
  }

  .custom-scroll::-webkit-scrollbar { width: 5px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #e7e5e4; border-radius: 10px; }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: #d6d3d1; }
`

// --- 辅助函数 ---
function formatTime(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// --- 子组件：通知卡片 ---
const NotificationCard = ({ 
  notify, 
  post, 
  comment, 
  onClick, 
  onPostClick, 
  onActorClick 
}: { 
  notify: NotificationType, 
  post?: Post | null, 
  comment?: CommentType | null,
  onClick: () => void,
  onPostClick: (e: React.MouseEvent) => void,
  onActorClick: (e: React.MouseEvent) => void
}) => {
  const getCommentContent = () => {
    if (!comment?.content) return ''
    const plainText = comment.content.replace(/<[^>]*>/g, '').trim()
    return plainText.length > 50 ? plainText.substring(0, 50) + '...' : plainText
  }

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl border border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div
        className={`p-2.5 rounded-full shrink-0 transition-colors ${
          notify.type === 'like'
            ? 'bg-red-50 text-red-500 group-hover:bg-red-100'
            : notify.type === 'comment' || notify.type === 'reply'
            ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-100'
            : 'bg-amber-50 text-amber-500 group-hover:bg-amber-100'
        }`}
      >
        {notify.type === 'like' && <ThumbsUp size={18} />}
        {(notify.type === 'comment' || notify.type === 'reply') && <User size={18} />}
        {notify.type === 'follow' && <Heart size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <div className="text-sm text-stone-800">
            <span
              className="font-bold hover:text-[#C82E31] transition-colors cursor-pointer mr-1"
              onClick={onActorClick}
            >
              {notify.actor?.nickname || '用户'}
            </span>
            <span className="text-stone-500">
              {notify.type === 'like' && '赞了你的帖子'}
              {notify.type === 'comment' && '评论了你的帖子'}
              {notify.type === 'reply' && '回复了你的评论'}
              {notify.type === 'follow' && '关注了你'}
            </span>
          </div>
          <span className="text-xs text-stone-400 shrink-0 ml-2">
            {formatTime(notify.created_at)}
          </span>
        </div>

        {/* 帖子/评论预览区域 */}
        {post && (
          <div 
            className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-100 hover:border-stone-200 transition-colors"
            onClick={onPostClick}
          >
            <div className="text-sm font-medium text-stone-800 line-clamp-1 mb-1">
              {post.title}
            </div>
            
            {/* 评论内容预览 */}
            {(notify.type === 'comment' || notify.type === 'reply') && comment && (
              <div className="text-xs text-stone-600 line-clamp-2 leading-relaxed bg-white/50 p-2 rounded">
                {getCommentContent() || '评论内容'}
              </div>
            )}
            
            <div className="text-[10px] text-stone-400 mt-1">
              {new Date(post.created_at).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        )}
      </div>
      {!notify.is_read && <div className="w-2 h-2 rounded-full bg-[#C82E31] shrink-0 mt-1.5" />}
    </div>
  )
}

// --- 主页面组件 ---
function MessagesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  
  // 状态管理
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeChatType, setActiveChatType] = useState<'private' | 'social' | 'system'>('private')
  const [inputText, setInputText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sending, setSending] = useState(false)
  
  // 数据状态
  const [conversations, setConversations] = useState<ConversationType[]>([])
  const [messages, setMessages] = useState<MessageType[]>([])
  const [socialNotifications, setSocialNotifications] = useState<NotificationType[]>([])
  const [systemNotifications, setSystemNotifications] = useState<NotificationType[]>([])
  const [unreadSocialCount, setUnreadSocialCount] = useState(0)
  const [unreadSystemCount, setUnreadSystemCount] = useState(0)
  const [targetUserProfile, setTargetUserProfile] = useState<{ id: string; nickname: string | null; avatar_url: string | null } | null>(null)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  
  const [postInfoMap, setPostInfoMap] = useState<Map<string, Post>>(new Map())
  const [commentInfoMap, setCommentInfoMap] = useState<Map<string, CommentType>>(new Map())
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const urlParamProcessedRef = useRef<string | null>(null)
  const activeChatIdRef = useRef<string | null>(null)
  const activeChatTypeRef = useRef<'private' | 'social' | 'system'>('private')

  // --- 初始化与数据加载 ---
  useEffect(() => { getCurrentUser().then(setUser) }, [])

  // 同步 ref 和状态
  useEffect(() => {
    activeChatIdRef.current = activeChatId
    activeChatTypeRef.current = activeChatType
  }, [activeChatId, activeChatType])

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations()
      setConversations(data)
    } catch (error) { console.error(error) }
  }, [])

  const loadMessages = useCallback(async (otherUserId: string) => {
    try {
      const data = await getMessages(otherUserId)
      setMessages(data)
      await markMessagesAsRead(otherUserId)
      loadConversations()
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (error) { console.error(error) }
  }, [loadConversations])

  const loadNotifications = useCallback(async () => {
    if (!user) return
    
    // 避免重复加载
    if (notificationsLoading) return
    
    setNotificationsLoading(true)
    try {
      const socialTypes = ['like', 'comment', 'reply', 'follow']
      const systemTypes = ['system', 'report_resolved', 'report_rejected']

      const [social, system] = await Promise.all([
        getNotifications(100, 0, false, socialTypes),
        getNotifications(100, 0, false, systemTypes)
      ])
      
      setSocialNotifications(social)
      setSystemNotifications(system)
      setUnreadSocialCount(social.filter(n => !n.is_read).length)
      setUnreadSystemCount(system.filter(n => !n.is_read).length)
      setNotificationsLoaded(true)
      
      // 批量加载关联数据
      const postIds = new Set<string>()
      const commentIds = new Set<string>()
      
      social.forEach(n => {
        if (n.related_type === 'post') postIds.add(n.related_id)
        if (n.related_type === 'comment') commentIds.add(n.related_id)
        const commentIdFromMetadata = typeof n.metadata?.comment_id === 'string' ? n.metadata.comment_id : null
        if ((n.type === 'comment' || n.type === 'reply') && commentIdFromMetadata) commentIds.add(commentIdFromMetadata)
      })

      // 加载帖子
      if (postIds.size > 0) {
        const posts = await Promise.all(
          Array.from(postIds).map(async (id) => {
            try {
              return await getPost(id)
            } catch (error) {
              // 静默处理错误，可能是帖子不存在或已被删除
              console.debug(`Failed to load post ${id}:`, error)
              return null
            }
          })
        )
        setPostInfoMap(prev => {
          const next = new Map(prev)
          posts.forEach(p => {
            if (p) {
              next.set(p.id, p)
            }
          })
          return next
        })
      }

      // 加载评论
      if (commentIds.size > 0) {
        const supabase = getSupabaseClient()
        if (supabase) {
          const { data: comments } = await supabase
            .from('comments')
            .select('*')
            .in('id', Array.from(commentIds))
          
          if (comments) {
            setCommentInfoMap(prev => {
              const next = new Map(prev)
              comments.forEach(c => next.set(c.id, c as CommentType))
              return next
            })
            // 补充加载评论关联的帖子
            setPostInfoMap(prev => {
              const newPostIds = comments.map(c => c.post_id).filter(id => !prev.has(id))
              if (newPostIds.length === 0) return prev
              
              // 异步加载新帖子，但不阻塞当前函数
              Promise.all(
                newPostIds.map(async (id) => {
                  try {
                    return await getPost(id)
                  } catch {
                    console.debug(`Failed to load post ${id}`)
                    return null
                  }
                })
              ).then(newPosts => {
                setPostInfoMap(current => {
                  const updated = new Map(current)
                  newPosts.forEach(p => {
                    if (p) {
                      updated.set(p.id, p)
                    }
                  })
                  return updated
                })
              }).catch(err => {
                console.error('Failed to load comment-related posts:', err)
              })
              
              return prev
            })
          }
        }
      }
    } catch (error: any) { 
      console.error('Failed to load notifications:', error)
      
      // 只有在认证错误或明确的数据不存在时才清空数据
      // 对于网络错误或其他临时错误，保留之前的数据
      const errorMessage = error?.message || ''
      const isAuthError = errorMessage.includes('登录') || 
                         errorMessage.includes('未登录') || 
                         errorMessage.includes('unauthorized') ||
                         errorMessage.includes('permission denied')
      
      // 如果是认证错误，清空数据（因为用户可能已登出）
      if (isAuthError) {
        setSocialNotifications([])
        setSystemNotifications([])
        setUnreadSocialCount(0)
        setUnreadSystemCount(0)
      }
      // 对于其他错误（网络错误、超时等），保留之前的数据，不进行清空
      // 这样即使加载失败，用户仍能看到之前加载的数据
    } finally {
      setNotificationsLoading(false)
    }
  }, [user, notificationsLoading])

  // --- 副作用 ---
  useEffect(() => {
    if (user) { loadConversations(); loadNotifications(); }
  }, [user, loadConversations, loadNotifications])

  // 实时订阅
  useEffect(() => {
    if (!user) return
    const subConvs = subscribeToConversations(loadConversations)
    const subNotifs = subscribeToNotifications((n) => {
      if (!n) { 
        // 通知被更新（如标记为已读），重新加载以同步状态
        loadNotifications()
        return 
      }
      // 举报处理通知也归类为系统通知
      if (n.type === 'system' || n.type === 'report_resolved' || n.type === 'report_rejected') {
        setSystemNotifications(prev => {
          // 检查是否已存在，避免重复添加
          if (prev.some(notif => notif.id === n.id)) {
            // 如果已存在，更新它
            return prev.map(notif => notif.id === n.id ? n : notif)
          }
          // 按时间排序插入
          return [n, ...prev].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        })
        if (!n.is_read) setUnreadSystemCount(c => c + 1)
      } else {
        setSocialNotifications(prev => {
          // 检查是否已存在，避免重复添加
          if (prev.some(notif => notif.id === n.id)) {
            // 如果已存在，更新它
            return prev.map(notif => notif.id === n.id ? n : notif)
          }
          // 按时间排序插入
          return [n, ...prev].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        })
        if (!n.is_read) setUnreadSocialCount(c => c + 1)
      }
    })
    return () => { subConvs(); subNotifs() }
  }, [user, loadConversations, loadNotifications])

  // URL 参数处理（只在首次加载或 activeChatId 为空时处理）
  useEffect(() => {
    const userId = searchParams.get('userId')
    // 只有当 activeChatId 为空或者是私信类型时，才处理 URL 参数
    // 这样可以避免在切换到互动消息或系统消息时被重置
    if (userId && user && userId !== user.id) {
      // 检查是否已经处理过这个 userId，避免重复处理
      if (urlParamProcessedRef.current !== userId) {
        // 使用 ref 来获取最新的 activeChatId 和 activeChatType，避免依赖数组变化
        const currentActiveChatId = activeChatIdRef.current
        const currentActiveChatType = activeChatTypeRef.current
        
        if (!currentActiveChatId || currentActiveChatType === 'private') {
          // 只有当 activeChatId 不等于 userId 时才更新，避免重复设置
          if (currentActiveChatId !== userId) {
            setActiveChatId(userId)
            setActiveChatType('private')
            loadMessages(userId)
            urlParamProcessedRef.current = userId
            
            const exists = conversations.find(c => c.other_user_id === userId)
            if (!exists) {
              getUserProfileById(userId).then(p => p && setTargetUserProfile({ id: p.id, nickname: p.nickname, avatar_url: p.avatar_url }))
            }
          }
        }
      }
    } else if (!userId) {
      // 如果 URL 中没有 userId 参数，重置处理标记
      urlParamProcessedRef.current = null
    }
  }, [searchParams, user, conversations, loadMessages])

  // 消息订阅
  useEffect(() => {
    if (!activeChatId || activeChatType !== 'private') return
    const unsub = subscribeToMessages(activeChatId, (msg) => {
      setMessages(prev => [...prev, msg])
      markMessagesAsRead(activeChatId)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
    return unsub
  }, [activeChatId, activeChatType])

  // --- 操作处理 ---
  const handleSelectConversation = (conversation: ConversationType, type: 'private' | 'social' | 'system') => {
    setActiveChatId(conversation.other_user_id)
    setActiveChatType(type)
    setTargetUserProfile(null)
    if (type === 'private' && conversation.other_user_id) {
      loadMessages(conversation.other_user_id)
    } else if (type === 'social' || type === 'system') {
      // 切换到互动通知或系统通知时，如果数据未加载或为空，重新加载通知数据
      const targetNotifications = type === 'social' ? socialNotifications : systemNotifications
      if (!notificationsLoaded || targetNotifications.length === 0) {
        loadNotifications()
      }
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChatId || activeChatType !== 'private' || sending) return
    setSending(true)
    try {
      const msg = await sendMessage(activeChatId, inputText.trim())
      setMessages(prev => [...prev, msg])
      setInputText('')
      setTimeout(loadConversations, 300)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (error) { console.error(error) } 
    finally { setSending(false) }
  }

  const handleMarkAllRead = async (type: 'social' | 'system') => {
    const target = type === 'system' ? systemNotifications : socialNotifications
    const ids = target.filter(n => !n.is_read).map(n => n.id)
    await Promise.all(ids.map(id => markNotificationAsRead(id)))
    if (type === 'system') setUnreadSystemCount(0)
    else setUnreadSocialCount(0)
    loadNotifications()
  }

  const handleSetConversationSetting = async (otherUserId: string, setting: 'pin' | 'mute' | 'unmute') => {
    try {
      const conversation = conversations.find(c => c.other_user_id === otherUserId)
      if (!conversation) return

      const updates: { is_pinned?: boolean; is_muted?: boolean } = {}
      if (setting === 'pin') updates.is_pinned = !conversation.is_pinned
      else if (setting === 'mute') updates.is_muted = true
      else if (setting === 'unmute') updates.is_muted = false

      await setConversationSetting(otherUserId, updates)
      loadConversations()
    } catch (error) {
      console.error('Error setting conversation setting:', error)
    }
  }

  // --- 渲染逻辑 ---
  const sortedConversations = [...conversations]
    .filter(c => !searchQuery || c.other_user?.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (a.is_pinned === b.is_pinned ? 
      new Date(b.last_message_created_at || 0).getTime() - new Date(a.last_message_created_at || 0).getTime() : 
      (a.is_pinned ? -1 : 1))
    )

  const activeConversation = activeChatId ? conversations.find(c => c.other_user_id === activeChatId) : null
  const otherUser = activeConversation?.other_user || (activeChatId && targetUserProfile ? targetUserProfile : null)

  const renderRightPanel = () => {
    if (!activeChatId) return <div className="flex items-center justify-center h-full bg-white text-stone-400">选择一个会话开始聊天</div>

    // 1. 互动通知
    if (activeChatType === 'social' && activeChatId === 'social') {
      return (
        <div className="flex flex-col h-full bg-white">
          <div className="h-16 border-b border-stone-100 flex items-center px-6 justify-between shrink-0">
            <h2 className="text-lg font-bold text-stone-800 font-serif">互动通知</h2>
            <Button variant="ghost" size="sm" className="text-stone-400" onClick={() => handleMarkAllRead('social')}>全部已读</Button>
          </div>
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {socialNotifications.length === 0 ? <div className="text-center text-stone-400 py-8">暂无通知</div> : socialNotifications.map(notify => {
                let post = null, comment = null, postId = null
                if (notify.related_type === 'post') {
                  postId = notify.related_id; post = postInfoMap.get(postId) || null
                  const commentIdFromMetadata = typeof notify.metadata?.comment_id === 'string' ? notify.metadata.comment_id : null
                  if (['comment', 'reply'].includes(notify.type) && commentIdFromMetadata) comment = commentInfoMap.get(commentIdFromMetadata) || null
                } else if (notify.related_type === 'comment') {
                  comment = commentInfoMap.get(notify.related_id) || null
                  if (comment) { postId = comment.post_id; post = postInfoMap.get(postId) || null }
                }

                return (
                  <NotificationCard
                    key={notify.id}
                    notify={notify}
                    post={post}
                    comment={comment}
                    onClick={async () => {
                      if (!notify.is_read) {
                        await markNotificationAsRead(notify.id)
                        setUnreadSocialCount(c => Math.max(0, c - 1))
                        setSocialNotifications(prev => prev.map(n => n.id === notify.id ? { ...n, is_read: true } : n))
                      }
                    }}
                    onActorClick={(e) => { e.stopPropagation(); if (notify.actor_id) router.push(`/u/${notify.actor_id}`) }}
                    onPostClick={(e) => {
                      e.stopPropagation()
                      if (postId) router.push(`/community/${postId}${comment ? `?commentId=${comment.id}` : ''}`)
                    }}
                  />
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )
    }

    // 2. 系统通知
    if (activeChatType === 'system' && activeChatId === 'system') {
      return (
        <div className="flex flex-col h-full bg-white">
          <div className="h-16 border-b border-stone-100 flex items-center px-6 justify-between shrink-0">
            <h2 className="text-lg font-bold text-stone-800 font-serif">系统通知</h2>
            <Button variant="ghost" size="sm" className="text-stone-400" onClick={() => handleMarkAllRead('system')}>全部已读</Button>
          </div>
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {systemNotifications.length === 0 ? <div className="text-center text-stone-400 py-8">暂无系统通知</div> : systemNotifications.map(msg => {
                // 根据通知类型显示不同的图标和标题
                const isReportNotif = msg.type === 'report_resolved' || msg.type === 'report_rejected'
                const reportAction = msg.type === 'report_resolved' ? '已处理' : msg.type === 'report_rejected' ? '已驳回' : ''
                const bgColor = msg.type === 'report_resolved' ? 'bg-green-50 text-green-500' : 
                               msg.type === 'report_rejected' ? 'bg-orange-50 text-orange-500' : 
                               'bg-blue-50 text-blue-500'
                const hoverBgColor = msg.type === 'report_resolved' ? 'group-hover:bg-green-100' : 
                                    msg.type === 'report_rejected' ? 'group-hover:bg-orange-100' : 
                                    'group-hover:bg-blue-100'
                const title = isReportNotif ? `举报${reportAction}` : '系统通知'
                const postIdFromMetadata = typeof msg.metadata?.post_id === 'string' ? msg.metadata.post_id : null
                const postTitleFromMetadata = typeof msg.metadata?.post_title === 'string' ? msg.metadata.post_title : null
                const adminNoteFromMetadata = typeof msg.metadata?.admin_note === 'string' ? msg.metadata.admin_note : null
                
                return (
                  <div key={msg.id} onClick={async () => {
                    if (!msg.is_read) {
                      await markNotificationAsRead(msg.id)
                      setUnreadSystemCount(c => Math.max(0, c - 1))
                      setSystemNotifications(prev => prev.map(n => n.id === msg.id ? { ...n, is_read: true } : n))
                    }
                    // 如果是举报通知且有帖子ID，可以跳转到帖子
                    if (isReportNotif && postIdFromMetadata) {
                      router.push(`/community/${postIdFromMetadata}`)
                    }
                  }} className="flex items-start gap-4 p-4 rounded-xl border border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer group">
                    <div className={`p-2.5 rounded-full shrink-0 ${bgColor} ${hoverBgColor} transition-colors`}>
                      <Bell size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-stone-800">{title}</span>
                        <span className="text-xs text-stone-400">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-stone-600 mt-1">{msg.content}</p>
                      {/* 显示举报相关的元数据 */}
                      {isReportNotif && postTitleFromMetadata && (
                        <div className="mt-2 p-2 bg-stone-50 rounded text-xs text-stone-500 border border-stone-100">
                          <div className="font-medium">相关帖子: {postTitleFromMetadata}</div>
                          {adminNoteFromMetadata && (
                            <div className="mt-1 text-stone-400">备注: {adminNoteFromMetadata}</div>
                          )}
                        </div>
                      )}
                    </div>
                    {!msg.is_read && <div className="w-2 h-2 rounded-full bg-[#C82E31]" />}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )
    }

    // 3. 私信聊天
    return (
      <div className="flex flex-col h-full bg-[#F5F5F5]">
        <div className="h-16 border-b border-stone-200 flex items-center justify-between px-6 bg-[#F5F5F5] shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8"><AvatarImage src={otherUser?.avatar_url || undefined} /><AvatarFallback className="bg-stone-200 text-stone-600 text-xs">{otherUser?.nickname?.[0] || 'U'}</AvatarFallback></Avatar>
            <h2 className="text-lg font-bold text-stone-800 font-serif">{otherUser?.nickname || '用户'}</h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-stone-400"><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSetConversationSetting(activeChatId!, 'pin')}>
                {activeConversation?.is_pinned ? <><PinOff className="mr-2 h-4 w-4" />取消置顶</> : <><Pin className="mr-2 h-4 w-4" />置顶会话</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetConversationSetting(activeChatId!, activeConversation?.is_muted ? 'unmute' : 'mute')}>
                {activeConversation?.is_muted ? <><Volume2 className="mr-2 h-4 w-4" />取消免打扰</> : <><VolumeX className="mr-2 h-4 w-4" />免打扰</>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea ref={scrollAreaRef} className="flex-1 p-6 custom-scroll">
          <div className="space-y-6">
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === user?.id
              const showTime = index === 0 || new Date(msg.created_at).getTime() - new Date(messages[index-1].created_at).getTime() > 5 * 60 * 1000
              return (
                <div key={msg.id}>
                  {showTime && <div className="flex justify-center my-4"><span className="text-xs text-stone-300 bg-stone-100 px-2 py-0.5 rounded">{formatMessageTime(msg.created_at)}</span></div>}
                  <div className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="w-9 h-9 border border-stone-200">
                      <AvatarImage src={msg.sender?.avatar_url || undefined} />
                      <AvatarFallback className={`text-xs ${isMe ? 'bg-stone-800 text-white' : 'bg-white text-stone-600'}`}>{isMe ? '我' : msg.sender?.nickname?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%] max-md:max-w-[85%]`}>
                      <div className={`px-4 py-2.5 text-sm shadow-sm leading-relaxed ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>{msg.content}</div>
                      {isMe && <div className="flex items-center gap-1 mt-1 mr-1"><span className="text-[10px] text-stone-400">{msg.is_read ? '已读' : '送达'}</span>{msg.is_read && <CheckCheck className="w-3 h-3 text-[#C82E31]" />}</div>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="bg-white border-t border-stone-200 p-4 shrink-0 h-48 flex flex-col">
          <div className="flex items-center gap-4 text-stone-500 mb-2 px-1">
            <Smile className="w-5 h-5 cursor-pointer hover:text-stone-800" />
            <ImageIcon className="w-5 h-5 cursor-pointer hover:text-stone-800" />
            <Paperclip className="w-5 h-5 cursor-pointer hover:text-stone-800" />
          </div>
          <Textarea 
            value={inputText} onChange={e => setInputText(e.target.value)} 
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
            className="flex-1 border-none shadow-none resize-none p-1 focus-visible:ring-0 text-base custom-scroll bg-transparent" placeholder="输入消息..." disabled={sending}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-stone-300">Enter 发送</span>
            <Button onClick={handleSendMessage} disabled={sending || !inputText.trim()} size="sm" className="bg-[#f5f5f5] text-stone-600 hover:bg-[#C82E31] hover:text-white px-6">{sending ? '发送中...' : '发送'}</Button>
          </div>
        </div>
      </div>
    )
  }

  // --- 主渲染 ---
  return (
    <>
      <style jsx global>{styles}</style>
      <div className="h-[calc(100vh-64px)] max-md:h-[calc(100dvh-64px)] w-full paper-texture font-sans text-stone-800 flex items-center justify-center p-4 lg:p-8 max-md:p-0">
        <Card className="w-full max-w-6xl h-full flex overflow-hidden border-stone-200 shadow-xl bg-white/50 backdrop-blur-sm max-md:rounded-none max-md:border-0">
          {/* 左侧列表 */}
          <div className="w-80 max-md:w-full border-r border-stone-200 bg-[#F7F7F7]/90 flex flex-col shrink-0 max-md:border-r-0">
            <div className="p-4 border-b border-stone-200/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input placeholder="搜索" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8 bg-[#EAEAEA] border-none text-sm focus-visible:ring-0" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {/* 静态入口 */}
                <div onClick={() => { 
                  setActiveChatId('social'); 
                  setActiveChatType('social'); 
                  // 如果数据未加载或为空，重新加载
                  if (!notificationsLoaded || socialNotifications.length === 0) {
                    loadNotifications()
                  }
                }} className={`flex items-center gap-3 p-3.5 mx-2 my-1 rounded-lg cursor-pointer transition-colors ${activeChatId === 'social' ? 'bg-[#C6C6C6]' : 'hover:bg-[#EAEAEA]'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white relative bg-linear-to-br from-amber-400 to-orange-500 shadow-sm">
                    <Heart size={20} fill="currentColor" />
                    {unreadSocialCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FA5151] rounded-full text-[10px] flex items-center justify-center border border-[#F7F7F7]">{unreadSocialCount > 99 ? '99+' : unreadSocialCount}</span>}
                  </div>
                  <div className="flex-1"><span className="text-sm font-bold">互动通知</span><p className="text-xs text-stone-500 truncate">{unreadSocialCount > 0 ? `${unreadSocialCount}条未读` : '暂无新通知'}</p></div>
                </div>
                <div onClick={() => { 
                  setActiveChatId('system'); 
                  setActiveChatType('system'); 
                  // 如果数据未加载或为空，重新加载
                  if (!notificationsLoaded || systemNotifications.length === 0) {
                    loadNotifications()
                  }
                }} className={`flex items-center gap-3 p-3.5 mx-2 my-1 rounded-lg cursor-pointer transition-colors ${activeChatId === 'system' ? 'bg-[#C6C6C6]' : 'hover:bg-[#EAEAEA]'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white relative bg-linear-to-br from-blue-400 to-indigo-500 shadow-sm">
                    <Bell size={20} />
                    {unreadSystemCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FA5151] rounded-full text-[10px] flex items-center justify-center border border-[#F7F7F7]">{unreadSystemCount > 99 ? '99+' : unreadSystemCount}</span>}
                  </div>
                  <div className="flex-1"><span className="text-sm font-bold">系统通知</span><p className="text-xs text-stone-500 truncate">{unreadSystemCount > 0 ? `${unreadSystemCount}条未读` : '暂无新通知'}</p></div>
                </div>
                
                <Separator className="my-2 bg-stone-200/50 mx-4 w-auto" />
                
                {/* 会话列表 */}
                {sortedConversations.map(chat => (
                  <div key={chat.other_user_id} onClick={() => handleSelectConversation(chat, 'private')} className={`flex items-center gap-3 p-3.5 mx-2 my-0.5 rounded-lg cursor-pointer transition-colors group ${activeChatId === chat.other_user_id ? 'bg-[#C6C6C6]' : 'hover:bg-[#EAEAEA]'}`}>
                    <div className="relative">
                      <Avatar className="w-10 h-10 rounded-lg"><AvatarImage src={chat.other_user?.avatar_url || undefined} /><AvatarFallback className="bg-stone-200">{chat.other_user?.nickname?.[0]}</AvatarFallback></Avatar>
                      {chat.unread_count > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FA5151] text-white rounded-full text-[10px] flex items-center justify-center border border-[#F7F7F7]">{chat.unread_count}</span>}
                      {chat.is_pinned && <Pin className="absolute -bottom-1 -left-1 w-3 h-3 text-stone-400 bg-white rounded-full p-0.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5"><span className="text-sm font-medium">{chat.other_user?.nickname}</span><span className="text-[10px] text-stone-400">{formatTime(chat.last_message_created_at)}</span></div>
                      <p className="text-xs text-stone-500 truncate">{chat.last_message_content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧面板 */}
          <div className="flex-1 min-w-0">{renderRightPanel()}</div>
        </Card>
      </div>
    </>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-4 border-stone-200 border-t-[#C82E31] rounded-full animate-spin" />
          <p className="text-stone-500">加载消息...</p>
        </div>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  )
}
