'use client'

import { EmojiPicker } from '@/lib/components/EmojiPicker'
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
import { useToast } from '@/lib/hooks/use-toast'
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
import { cn } from '@/lib/utils/cn'
import { logError } from '@/lib/utils/errorLogger'
import {
    ArrowLeft,
    Bell,
    CheckCheck,
    Heart,
    Image as ImageIcon,
    MoreHorizontal,
    Pin,
    PinOff,
    Search,
    ThumbsUp,
    User,
    Volume2,
    VolumeX
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'

// --- 样式补丁 ---
const styles = `
  .paper-texture {
    background-color: #fdfbf7;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  
  /* 聊天气泡优化 */
  .chat-bubble-me {
    background: linear-gradient(135deg, #1c1917 0%, #292524 100%);
    color: white;
    border-radius: 1.125rem 1.125rem 0.25rem 1.125rem;
    box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.1);
  }
  
  .chat-bubble-other {
    background-color: white;
    color: #1c1917;
    border-radius: 1.125rem 1.125rem 1.125rem 0.25rem;
    box-shadow: 0 0.0625rem 0.125rem rgba(0,0,0,0.05);
    border: 0.0625rem solid #f0f0f0;
  }

  /* 列表项激活态 */
  .chat-item-active {
    background-color: #ffffff;
    box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,0.04);
    border-left: 0.1875rem solid #C82E31;
  }

  .custom-scroll::-webkit-scrollbar { width: 0.25rem; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 0.625rem; }
`

// --- 辅助函数 (保持不变) ---
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

// --- 通用头部组件 ---
const ChatHeader = ({ title, onBack, rightAction }: { title: string, onBack?: () => void, rightAction?: React.ReactNode }) => (
  <div className="h-14 border-b border-stone-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
    <div className="flex items-center gap-3 overflow-hidden">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden -ml-2 text-stone-500">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <h2 className="text-base font-bold text-stone-800 font-serif truncate">{title}</h2>
    </div>
    {rightAction}
  </div>
)

// --- 子组件：通知卡片 (保持不变) ---
const NotificationCard = ({ 
  notify, 
  post, 
  comment, 
  onClick, 
  onPostClick, 
  onActorClick 
}: any) => {
  const getCommentContent = () => {
    if (!comment?.content) return ''
    const plainText = comment.content.replace(/<[^>]*>/g, '').trim()
    return plainText.length > 50 ? plainText.substring(0, 50) + '...' : plainText
  }

  return (
    <div
      className="flex items-start gap-3 p-3 sm:p-4 rounded-xl border border-stone-100 bg-white hover:bg-stone-50/50 transition-colors cursor-pointer group active:scale-[0.99] duration-200"
      onClick={onClick}
    >
      <div
        className={`p-2 rounded-full shrink-0 ${
          notify.type === 'like'
            ? 'bg-red-50 text-red-500'
            : notify.type === 'comment' || notify.type === 'reply'
            ? 'bg-blue-50 text-blue-500'
            : 'bg-amber-50 text-amber-500'
        }`}
      >
        {notify.type === 'like' && <ThumbsUp size={16} />}
        {(notify.type === 'comment' || notify.type === 'reply') && <User size={16} />}
        {notify.type === 'follow' && <Heart size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <div className="text-sm text-stone-800 truncate pr-2">
            <span
              className="font-bold hover:text-[#C82E31] mr-1"
              onClick={onActorClick}
            >
              {notify.actor?.nickname || '用户'}
            </span>
            <span className="text-stone-500 text-xs">
              {notify.type === 'like' && '赞了你的帖子'}
              {notify.type === 'comment' && '评论了你的帖子'}
              {notify.type === 'reply' && '回复了你的评论'}
              {notify.type === 'follow' && '关注了你'}
            </span>
          </div>
          <span className="text-[0.625rem] text-stone-400 shrink-0">
            {formatTime(notify.created_at)}
          </span>
        </div>

        {post && (
          <div 
            className="mt-1.5 p-2 bg-stone-50 rounded-lg border border-stone-100 text-xs"
            onClick={onPostClick}
          >
            <div className="font-medium text-stone-700 line-clamp-1 mb-0.5">
              {post.title}
            </div>
            
            {(notify.type === 'comment' || notify.type === 'reply') && comment && (
              <div className="text-stone-500 line-clamp-2 bg-white/50 p-1.5 rounded">
                {getCommentContent() || '评论内容'}
              </div>
            )}
          </div>
        )}
      </div>
      {!notify.is_read && <div className="w-2 h-2 rounded-full bg-[#C82E31] shrink-0 self-center" />}
    </div>
  )
}

// --- 主页面组件 ---
function MessagesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<{ id: string } | null>(null)
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeChatType, setActiveChatType] = useState<'private' | 'social' | 'system'>('private')
  // 新增：移动端是否显示聊天详情页
  const [showMobileChat, setShowMobileChat] = useState(false)
  
  const [inputText, setInputText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
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

  // --- 初始化与数据加载 (保持不变) ---
  useEffect(() => { getCurrentUser().then(setUser) }, [])

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
    if (!user || notificationsLoading) return
    
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
      
      const postIds = new Set<string>()
      const commentIds = new Set<string>()
      
      social.forEach(n => {
        if (n.related_type === 'post') postIds.add(n.related_id)
        if (n.related_type === 'comment') commentIds.add(n.related_id)
        const commentIdFromMetadata = typeof n.metadata?.comment_id === 'string' ? n.metadata.comment_id : null
        if ((n.type === 'comment' || n.type === 'reply') && commentIdFromMetadata) commentIds.add(commentIdFromMetadata)
      })

      if (postIds.size > 0) {
        const posts = await Promise.all(
          Array.from(postIds).map(async (id) => {
            try { return await getPost(id) } catch { return null }
          })
        )
        setPostInfoMap(prev => {
          const next = new Map(prev)
          posts.forEach(p => { if (p) next.set(p.id, p) })
          return next
        })
      }

      if (commentIds.size > 0) {
        const supabase = getSupabaseClient()
        if (supabase) {
          const { data: comments } = await supabase.from('comments').select('*').in('id', Array.from(commentIds))
          if (comments) {
            setCommentInfoMap(prev => {
              const next = new Map(prev)
              comments.forEach(c => next.set(c.id, c as CommentType))
              return next
            })
            setPostInfoMap(prev => {
              const newPostIds = comments.map(c => c.post_id).filter(id => !prev.has(id))
              if (newPostIds.length === 0) return prev
              Promise.all(newPostIds.map(async (id) => { try { return await getPost(id) } catch { return null } }))
                .then(newPosts => {
                  setPostInfoMap(current => {
                    const updated = new Map(current)
                    newPosts.forEach(p => { if (p) updated.set(p.id, p) })
                    return updated
                  })
                })
              return prev
            })
          }
        }
      }
    } catch (error) { 
      // 使用统一的错误日志函数，避免记录空错误对象
      logError('Failed to load notifications:', error)
    } finally {
      setNotificationsLoading(false)
    }
  }, [user, notificationsLoading])

  useEffect(() => {
    if (user) { loadConversations(); loadNotifications(); }
  }, [user, loadConversations, loadNotifications])

  useEffect(() => {
    if (!user) return
    const subConvs = subscribeToConversations(loadConversations)
    const subNotifs = subscribeToNotifications((n) => {
      if (!n) { loadNotifications(); return }
      if (n.type === 'system' || n.type === 'report_resolved' || n.type === 'report_rejected') {
        setSystemNotifications(prev => {
          if (prev.some(notif => notif.id === n.id)) return prev.map(notif => notif.id === n.id ? n : notif)
          return [n, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        })
        if (!n.is_read) setUnreadSystemCount(c => c + 1)
      } else {
        setSocialNotifications(prev => {
          if (prev.some(notif => notif.id === n.id)) return prev.map(notif => notif.id === n.id ? n : notif)
          return [n, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        })
        if (!n.is_read) setUnreadSocialCount(c => c + 1)
      }
    })
    return () => { subConvs(); subNotifs() }
  }, [user, loadConversations, loadNotifications])

  // URL 参数处理
  useEffect(() => {
    const userId = searchParams.get('userId')
    if (userId && user && userId !== user.id) {
      if (urlParamProcessedRef.current !== userId) {
        const currentActiveChatId = activeChatIdRef.current
        if (currentActiveChatId !== userId) {
          setActiveChatId(userId)
          setActiveChatType('private')
          setShowMobileChat(true) // 自动打开聊天窗口
          loadMessages(userId)
          urlParamProcessedRef.current = userId
          const exists = conversations.find(c => c.other_user_id === userId)
          if (!exists) {
            getUserProfileById(userId).then(p => p && setTargetUserProfile({ id: p.id, nickname: p.nickname, avatar_url: p.avatar_url }))
          }
        }
      }
    } else if (!userId) {
      urlParamProcessedRef.current = null
    }
  }, [searchParams, user, conversations, loadMessages])

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
  const handleSelectConversation = (conversation: ConversationType | null, type: 'private' | 'social' | 'system', id?: string) => {
    const targetId = conversation ? conversation.other_user_id : id
    if (!targetId) return

    setActiveChatId(targetId)
    setActiveChatType(type)
    setTargetUserProfile(null)
    setShowMobileChat(true) // 移动端：打开聊天面板

    if (type === 'private') {
      loadMessages(targetId)
    } else if (type === 'social' || type === 'system') {
      const targetNotifications = type === 'social' ? socialNotifications : systemNotifications
      if (!notificationsLoaded || targetNotifications.length === 0) {
        loadNotifications()
      }
    }
  }

  const handleBackToList = () => {
    setShowMobileChat(false)
  }

  // 上传图片函数
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('请先登录')
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      // 如果没有 Supabase，使用 base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    try {
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('不支持的文件类型，请上传 JPEG、PNG、WebP 或 GIF 格式的图片')
      }

      // 验证文件大小（5MB）
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('文件大小不能超过 5MB')
      }

      // 生成文件名：userId/messages/timestamp.extension
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}/messages/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // 上传文件到 posts bucket（如果不存在则使用 avatars）
      const { error } = await supabase.storage
        .from('posts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        // 如果 posts bucket 不存在或没有权限，尝试使用 avatars bucket
        const { error: fallbackError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (fallbackError) {
          if (fallbackError.message?.includes('Bucket not found') || fallbackError.message?.includes('bucket')) {
            throw new Error('存储桶未创建。请在 Supabase Dashboard 中创建 "posts" 和 "avatars" 存储桶，或运行数据库迁移。')
          }
          throw fallbackError
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        return urlData.publicUrl
      }

      // 获取公开 URL
      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error: unknown) {
      console.error('Error uploading image:', error)
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      throw new Error(errorMessage)
    }
  }, [])

  // 处理图片选择
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !activeChatId || activeChatType !== 'private') return

    const file = files[0]
    setUploadingImage(true)
    try {
      const imageUrl = await uploadImage(file)
      // 发送图片消息
      // 注意：message_type 必须是 'chat' 或 'system' 以符合数据库约束
      // 图片类型通过 metadata.type = 'image' 来标识
      const msg = await sendMessage(activeChatId, '[图片]', 'chat', { type: 'image', image_url: imageUrl })
      setMessages(prev => [...prev, msg])
      setTimeout(loadConversations, 300)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (error) {
      console.error('上传图片失败:', error)
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '上传图片失败',
        variant: 'destructive'
      })
    } finally {
      setUploadingImage(false)
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [activeChatId, activeChatType, uploadImage, loadConversations])

  // 处理表情选择
  const handleEmojiSelect = useCallback((emoji: string) => {
    setInputText(prev => prev + emoji)
  }, [])

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
    } catch (error) { console.error(error) }
  }

  const sortedConversations = [...conversations]
    .filter(c => !searchQuery || c.other_user?.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (a.is_pinned === b.is_pinned ? 
      new Date(b.last_message_created_at || 0).getTime() - new Date(a.last_message_created_at || 0).getTime() : 
      (a.is_pinned ? -1 : 1))
    )

  const activeConversation = activeChatId ? conversations.find(c => c.other_user_id === activeChatId) : null
  const otherUser = activeConversation?.other_user || (activeChatId && targetUserProfile ? targetUserProfile : null)

  // --- 渲染：右侧详情面板 ---
  const renderRightPanel = () => {
    if (!activeChatId) return <div className="hidden md:flex items-center justify-center h-full bg-[#FAFAFA] text-stone-400 text-sm">选择一个会话开始聊天</div>

    // 1. 互动通知
    if (activeChatType === 'social') {
      return (
        <div className="flex flex-col h-full bg-white md:rounded-r-2xl overflow-hidden">
          <ChatHeader 
            title="互动通知" 
            onBack={handleBackToList} 
            rightAction={
                <Button variant="ghost" size="sm" className="text-xs text-stone-400 hover:text-stone-700" onClick={() => handleMarkAllRead('social')}>
                    全部已读
                </Button>
            }
          />
          <ScrollArea className="flex-1 p-0 bg-[#FAFAFA]">
            <div className="p-3 md:p-6 space-y-3">
              {socialNotifications.length === 0 ? <div className="text-center text-stone-400 py-12 text-sm">暂无通知</div> : socialNotifications.map(notify => {
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
                    onActorClick={(e: any) => { e.stopPropagation(); if (notify.actor_id) router.push(`/u/${notify.actor_id}`) }}
                    onPostClick={(e: any) => { e.stopPropagation(); if (postId) router.push(`/community/${postId}${comment ? `?commentId=${comment.id}` : ''}`) }}
                  />
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )
    }

    // 2. 系统通知
    if (activeChatType === 'system') {
      return (
        <div className="flex flex-col h-full bg-white md:rounded-r-2xl overflow-hidden">
          <ChatHeader 
            title="系统通知" 
            onBack={handleBackToList}
            rightAction={
                <Button variant="ghost" size="sm" className="text-xs text-stone-400 hover:text-stone-700" onClick={() => handleMarkAllRead('system')}>
                    全部已读
                </Button>
            }
          />
          <ScrollArea className="flex-1 p-0 bg-[#FAFAFA]">
            <div className="p-3 md:p-6 space-y-3">
              {systemNotifications.length === 0 ? <div className="text-center text-stone-400 py-12 text-sm">暂无系统通知</div> : systemNotifications.map(msg => {
                const isReportNotif = msg.type === 'report_resolved' || msg.type === 'report_rejected'
                const reportAction = msg.type === 'report_resolved' ? '已处理' : msg.type === 'report_rejected' ? '已驳回' : ''
                const bgColor = msg.type === 'report_resolved' ? 'bg-green-50 text-green-500' : msg.type === 'report_rejected' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                const title = isReportNotif ? `举报${reportAction}` : '系统通知'
                
                return (
                  <div key={msg.id} onClick={async () => { if (!msg.is_read) { await markNotificationAsRead(msg.id); setUnreadSystemCount(c => Math.max(0, c - 1)); setSystemNotifications(prev => prev.map(n => n.id === msg.id ? { ...n, is_read: true } : n)) } }} 
                    className="flex items-start gap-4 p-4 rounded-xl bg-white border border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer shadow-sm"
                  >
                    <div className={`p-2.5 rounded-full shrink-0 ${bgColor}`}><Bell size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-stone-800">{title}</span>
                        <span className="text-[0.625rem] text-stone-400">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-stone-600 mt-1">{msg.content}</p>
                    </div>
                    {!msg.is_read && <div className="w-2 h-2 rounded-full bg-[#C82E31] shrink-0 mt-1" />}
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
      <div className="flex flex-col h-full bg-[#F5F5F5] md:rounded-r-2xl overflow-hidden relative">
        <ChatHeader 
            title={otherUser?.nickname || '用户'} 
            onBack={handleBackToList}
            rightAction={
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
            }
        />

        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4 custom-scroll">
          <div className="space-y-6">
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === user?.id
              const showTime = index === 0 || new Date(msg.created_at).getTime() - new Date(messages[index-1].created_at).getTime() > 5 * 60 * 1000
              
              // 判断是否为图片消息：兼容旧数据 (message_type='image') 和新数据 (metadata.type='image')
              const metadata = msg.metadata as Record<string, unknown> | null
              const isImageMessage = msg.message_type === 'image' || (metadata?.type === 'image') || (metadata?.image_url && msg.content === '[图片]')
              const imageUrl = isImageMessage && metadata ? metadata['image_url'] as string : undefined

              return (
                <div key={msg.id}>
                  {showTime && <div className="flex justify-center my-4"><span className="text-[0.625rem] text-stone-400 bg-stone-200/50 px-2 py-0.5 rounded-full">{formatMessageTime(msg.created_at)}</span></div>}
                  <div className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} mb-2`}>
                    <Avatar className="w-8 h-8 md:w-9 md:h-9 border border-stone-100 shadow-sm shrink-0">
                      <AvatarImage src={msg.sender?.avatar_url || undefined} />
                      <AvatarFallback className={`text-xs ${isMe ? 'bg-stone-800 text-white' : 'bg-white text-stone-600'}`}>{isMe ? '我' : msg.sender?.nickname?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      {isImageMessage && imageUrl ? (
                        <div className={`px-2 py-2 ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'} rounded-lg`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={imageUrl} 
                            alt="图片" 
                            className="max-w-[12.5rem] max-h-[18.75rem] rounded-lg object-cover cursor-pointer"
                            loading="lazy"
                            onClick={() => window.open(imageUrl, '_blank')}
                          />
                        </div>
                      ) : (
                        <div className={`px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>{msg.content}</div>
                      )}
                      {isMe && <div className="flex items-center gap-1 mt-1 mr-1 opacity-60"><span className="text-[0.625rem] text-stone-400">{msg.is_read ? '已读' : '送达'}</span>{msg.is_read && <CheckCheck className="w-3 h-3 text-[#C82E31]" />}</div>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* 底部输入框 */}
        <div className="bg-[#FAFAFA] border-t border-stone-200 p-3 pb-6 md:pb-3 shrink-0">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-200 transition-all">
             <Textarea 
                value={inputText} onChange={e => setInputText(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                className="flex-1 border-none shadow-none resize-none p-3 min-h-[2.5rem] max-h-[7.5rem] text-sm custom-scroll bg-transparent focus-visible:ring-0" 
                placeholder="发送消息..." 
                disabled={sending}
                rows={1}
            />
            <div className="flex justify-between items-center px-2 pb-2">
                <div className="flex items-center gap-3 text-stone-400">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <ImageIcon 
                      className="w-5 h-5 cursor-pointer hover:text-stone-600 transition-colors" 
                      onClick={() => fileInputRef.current?.click()}
                    />
                    {uploadingImage && (
                      <span className="text-xs text-stone-500">上传中...</span>
                    )}
                </div>
                <Button 
                    onClick={handleSendMessage} 
                    disabled={sending || uploadingImage || !inputText.trim()} 
                    size="sm" 
                    className="h-7 px-4 bg-[#1c1917] hover:bg-[#333] text-white text-xs rounded-full transition-all"
                >
                    {sending ? '...' : '发送'}
                </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- 移动端视图控制 ---
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const showList = !isMobile || !showMobileChat
  const showDetail = !isMobile || showMobileChat

  return (
    <>
      <style jsx global>{styles}</style>
      
      <div className="absolute inset-0 paper-texture font-sans text-stone-800 flex justify-center p-0 md:p-6 lg:p-8 overflow-hidden">
        <Card className="w-full max-w-6xl h-full flex overflow-hidden border-stone-200 shadow-2xl bg-white/50 backdrop-blur-sm rounded-none md:rounded-2xl border-0 md:border">
          
          {/* 左侧列表 (移动端：showList时显示) */}
          <div className={cn(
              "w-80 border-r border-stone-200 bg-[#F9F9F9]/95 flex flex-col shrink-0 md:flex transition-all duration-300 absolute md:relative z-10 h-full",
              isMobile ? (showList ? "w-full translate-x-0" : "w-full -translate-x-full hidden") : ""
          )}>
            {/* 搜索栏 */}
            <div className="p-4 border-b border-stone-200/50 bg-[#F9F9F9] shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input placeholder="搜索联系人" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-[#EBEBEB] border-none text-sm focus-visible:ring-0 rounded-lg placeholder:text-stone-400" />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="flex flex-col p-2 space-y-1">
                {/* 静态入口 */}
                <div onClick={() => handleSelectConversation(null, 'social', 'social')} 
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                        activeChatId === 'social' ? 'chat-item-active' : 'hover:bg-white/60'
                    )}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white relative bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shrink-0">
                    <Heart size={20} fill="currentColor" className="opacity-90" />
                    {unreadSocialCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[1.125rem] h-[1.125rem] bg-[#FA5151] rounded-full text-[0.625rem] flex items-center justify-center border-2 border-[#F9F9F9] px-1">{unreadSocialCount > 99 ? '99+' : unreadSocialCount}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                          <span className="text-sm font-bold text-stone-800">互动通知</span>
                      </div>
                      <p className="text-xs text-stone-500 truncate">{unreadSocialCount > 0 ? `${unreadSocialCount}条新互动` : '暂无新消息'}</p>
                  </div>
                </div>

                <div onClick={() => handleSelectConversation(null, 'system', 'system')} 
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                        activeChatId === 'system' ? 'chat-item-active' : 'hover:bg-white/60'
                    )}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white relative bg-gradient-to-br from-blue-400 to-indigo-500 shadow-sm shrink-0">
                    <Bell size={20} fill="currentColor" className="opacity-90" />
                    {unreadSystemCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[1.125rem] h-[1.125rem] bg-[#FA5151] rounded-full text-[0.625rem] flex items-center justify-center border-2 border-[#F9F9F9] px-1">{unreadSystemCount > 99 ? '99+' : unreadSystemCount}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                          <span className="text-sm font-bold text-stone-800">系统通知</span>
                      </div>
                      <p className="text-xs text-stone-500 truncate">{unreadSystemCount > 0 ? `${unreadSystemCount}条新通知` : '暂无新消息'}</p>
                  </div>
                </div>
                
                <div className="my-2 px-2"><Separator className="bg-stone-200" /></div>
                
                {/* 会话列表 */}
                {sortedConversations.map(chat => (
                  <div key={chat.other_user_id} onClick={() => handleSelectConversation(chat, 'private')} 
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group",
                        activeChatId === chat.other_user_id ? 'chat-item-active' : 'hover:bg-white/60'
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="w-11 h-11 rounded-xl border border-white shadow-sm">
                          <AvatarImage src={chat.other_user?.avatar_url || undefined} />
                          <AvatarFallback className="bg-stone-200 text-stone-500">{chat.other_user?.nickname?.[0]}</AvatarFallback>
                      </Avatar>
                      {chat.unread_count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[1.125rem] h-[1.125rem] bg-[#FA5151] text-white rounded-full text-[0.625rem] flex items-center justify-center border-2 border-[#F9F9F9] px-1">{chat.unread_count}</span>}
                      {chat.is_pinned && <div className="absolute -bottom-1 -left-1 bg-stone-100 rounded-full p-0.5 border border-white"><Pin className="w-2.5 h-2.5 text-stone-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-sm font-bold text-stone-800 truncate">{chat.other_user?.nickname}</span>
                          <span className="text-[0.625rem] text-stone-400">{formatTime(chat.last_message_created_at)}</span>
                      </div>
                      <p className="text-xs text-stone-500 truncate">{chat.last_message_content || '图片'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧面板 (移动端：showDetail时显示) */}
          <div className={cn(
              "flex-1 min-w-0 bg-white h-full md:block",
              isMobile ? (showDetail ? "block w-full fixed inset-0 z-20 md:static" : "hidden") : "block"
          )}>
            {renderRightPanel()}
          </div>
        </Card>
      </div>
    </>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-stone-800"></div>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  )
}
