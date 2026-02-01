'use client'

import DOMPurify from 'isomorphic-dompurify'
import {
  Bookmark,
  CheckCircle,
  ChevronDown,
  Coins,
  FileText,
  Loader2,
  MessageSquare,
  ScrollText,
  ThumbsUp,
  UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import BaZiPanelDual, { BaZiPanelDualData } from '@/app/community/components/BaZiPanelDual'
import GuaPanelDual, { FullGuaData } from '@/app/community/components/GuaPanelDual'
import { getBaziInfo } from '@/app/community/components/PostCard'
import { BlurredContent } from '@/lib/components/BlurredContent'
import DetailPageHeader from '@/lib/components/DetailPageHeader'
import { PaymentModal } from '@/lib/components/PaymentModal'
import SimpleRichTextEditor from '@/lib/components/SimpleRichTextEditor'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog'
import { Switch } from '@/lib/components/ui/switch'
import { Textarea } from '@/lib/components/ui/textarea'
import { GIFT_NAMES, GIFT_PRICES, GiftType } from '@/lib/constants/gift'
import { useToast } from '@/lib/hooks/use-toast'
import { clearLoginIntent, getCurrentPathWithSearchAndHash, getCurrentUser, getLoginIntent, getSession, redirectToLogin, setLoginIntent } from '@/lib/services/auth'
import { type Comment as CommentType } from '@/lib/services/comments'
import {
  adoptComment,
  createComment,
  deleteComment,
  toggleCommentLike,
  togglePostFavorite,
  togglePostLike,
  unlockContent,
  type Post
} from '@/lib/services/community'

import { isFollowingUser, toggleFollowUser, type UserProfile } from '@/lib/services/profile'
import { cn } from '@/lib/utils/cn'
import { convertDivinationRecordToFullGuaData } from '@/lib/utils/divinationToFullGuaData'
import styles from './PostDetailClient.module.css'



function stripHtmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim()
}

function SanitizedContent({ html, className }: { html: string, className?: string }) {
  const sanitized = useMemo(() => {
    if (!html) return ''
    return DOMPurify.sanitize(html)
  }, [html])
  
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
}

// -----------------------------------------------------------------------------
// 类型定义 & 辅助
// -----------------------------------------------------------------------------
interface AuthorStats {
  posts: number
  collections: number
  coins: number
  level: number
}



// -----------------------------------------------------------------------------
// 组件：移动端“案卷”折叠卡片 (优化版)
// -----------------------------------------------------------------------------
function MobileDivinationFold({ gua, bazi, recordId }: { gua: FullGuaData | null, bazi: BaZiPanelDualData | null, recordId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  const summary = useMemo(() => {
    if (gua) {
      const guaName = gua.originalName || '卦象'
      const hasMoving = gua.lines.some(l => l.original.isMoving)
      return `${guaName} ${hasMoving ? '· 有动爻' : '· 静卦'}`
    }
    if (bazi) return `八字排盘 [${bazi.basic?.gender === '乾造' ? '男命' : '女命'}]`
    return '排盘数据'
  }, [gua, bazi])

  return (
    <div className="lg:hidden mb-8 rounded-xl overflow-hidden shadow-sm bg-white border border-stone-200/60 ring-1 ring-stone-900/5">
      {/* 案卷头部 */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-linear-to-r from-stone-50 to-white p-3.5 sm:p-4 flex items-center justify-between cursor-pointer active:bg-stone-50 transition-all border-b border-stone-100"
      >
        <div className="absolute left-0 inset-y-0 w-1 bg-[#C82E31]/40"></div>
        
        <div className="flex items-center gap-3.5 pl-2">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-stone-100 text-stone-600 border border-stone-200">
            <ScrollText className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className={cn(styles['font-serif-sc'], "font-bold text-stone-800 text-base")}>{summary}</div>
            <div className="text-[0.65rem] text-stone-500 font-medium tracking-wide">
              {isOpen ? '点击收起案卷' : '点击展开查看详情'}
            </div>
          </div>
        </div>
        
        <div className={cn("transition-transform duration-500 ease-out text-stone-400", isOpen && "rotate-180")}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>

      {/* 案卷内容 */}
      <div 
        className={cn(
          "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] bg-white overflow-hidden",
          isOpen ? "max-h-320 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 bg-stone-50/30">
           {gua && <GuaPanelDual data={gua} recordId={recordId} />}
           {bazi && <BaZiPanelDual data={bazi} recordId={recordId} />}
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 主页面组件
// -----------------------------------------------------------------------------
interface PostDetailClientProps {
  initialPost: Post | null
  initialComments: CommentType[]
  initialRelatedPosts: Post[]
  initialUserProfile: UserProfile | null
  initialAuthorStats: AuthorStats | null
  initialWalletBalance: number
  postId: string
}

export default function PostDetailClient({ 
  initialPost, 
  initialComments, 
  initialRelatedPosts, 
  initialUserProfile,
  initialAuthorStats,
  initialWalletBalance,
  postId 
}: PostDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const commentId = searchParams.get('commentId')
  
  // State
  const [post, setPost] = useState<Post | null>(initialPost)
  const [comments, setComments] = useState<CommentType[]>(initialComments)
  const [relatedPosts, setRelatedPosts] = useState<Post[]>(initialRelatedPosts)
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<CommentType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(initialUserProfile)
  const [authorStats] = useState<AuthorStats | null>(initialAuthorStats)
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false)
  const [isFollowingLoading, setIsFollowingLoading] = useState(false)
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance)
  const [, setAdoptingCommentId] = useState<string | null>(null)
  const [confirmAdoptCommentId, setConfirmAdoptCommentId] = useState<string | null>(null)
  const [, setDeletingCommentId] = useState<string | null>(null)
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null)
  const [commentPaywalled, setCommentPaywalled] = useState(false)
  const [giftDialogOpen, setGiftDialogOpen] = useState(false)
  const [giftReceiver, setGiftReceiver] = useState<{ id: string; nickname: string | null } | null>(null)
  const [giftPaymentOpen, setGiftPaymentOpen] = useState(false)
  const [giftBalance, setGiftBalance] = useState(0)
  const [giftTypeToPay, setGiftTypeToPay] = useState<GiftType | null>(null)

  const [caseExists, setCaseExists] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveSubmitting, setArchiveSubmitting] = useState(false)
  const [archiveAccuracy, setArchiveAccuracy] = useState<'accurate' | 'inaccurate' | 'partial'>('accurate')
  const [archiveOccurredAt, setArchiveOccurredAt] = useState('')
  const [archiveFeedback, setArchiveFeedback] = useState('')
  
  const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const processedIntentRef = useRef(false)
  const commentDraftKey = useMemo(() => `yi_comment_draft_v1:${postId}`, [postId])

  // Sync props to state
  useEffect(() => {
    if (initialPost) setPost(initialPost)
  }, [initialPost])

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  useEffect(() => {
    setRelatedPosts(initialRelatedPosts)
  }, [initialRelatedPosts])

  useEffect(() => {
    setCurrentUserProfile(initialUserProfile)
  }, [initialUserProfile])

  useEffect(() => {
    setWalletBalance(initialWalletBalance)
  }, [initialWalletBalance])

  // Effects & Data Loading
  
  // Handle comment highlighting
  useEffect(() => {
    if (commentId && comments.length > 0) {
      setTimeout(() => {
        const commentElement = commentRefs.current.get(commentId)
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          commentElement.classList.add('ring-2', 'ring-[#C82E31]/50', 'bg-[#C82E31]/5')
          setTimeout(() => {
            commentElement.classList.remove('ring-2', 'ring-[#C82E31]/50', 'bg-[#C82E31]/5')
          }, 2500)
        }
      }, 500)
    }
  }, [commentId, comments])

  useEffect(() => {
    const raw = window.localStorage.getItem(commentDraftKey)
    if (raw && !replyText) {
      setReplyText(raw)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentDraftKey])

  useEffect(() => {
    const text = replyText?.trim()
    if (!text) {
      window.localStorage.removeItem(commentDraftKey)
      return
    }
    window.localStorage.setItem(commentDraftKey, replyText)
  }, [commentDraftKey, replyText])

  useEffect(() => {
    if (processedIntentRef.current) return
    processedIntentRef.current = true

    const run = async () => {
      const intent = getLoginIntent()
      if (!intent) return
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (intent.returnTo !== current) return

      const user = await getCurrentUser()
      if (!user) return

      clearLoginIntent()

      try {
        if (intent.type === 'post_like' && intent.postId === postId) {
          await fetch(`/api/community/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'set', value: true }),
          })
          router.refresh()
          toast({ title: '已点赞' })
          return
        }

        if (intent.type === 'post_favorite' && intent.postId === postId) {
          await fetch(`/api/community/posts/${postId}/favorite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'set', value: true }),
          })
          router.refresh()
          toast({ title: '已收藏' })
          return
        }

        if (intent.type === 'comment_like') {
          await fetch(`/api/community/comments/${intent.commentId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'set', value: true }),
          })
          router.refresh()
          toast({ title: '已点赞' })
          return
        }

        if (intent.type === 'comment_focus' && intent.postId === postId) {
          const el = document.getElementById('comment-editor') ?? document.getElementById('comments')
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
      } catch {
        toast({ title: '操作未完成', variant: 'destructive' })
      }
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const check = async () => {
      if (!post?.id) return
      try {
        const res = await fetch(`/api/library/cases/${post.id}/exists`)
        const json = await res.json().catch(() => null)
        setCaseExists(!!json?.exists)
      } catch {
        setCaseExists(false)
      }
    }
    void check()
  }, [post?.id])

  const checkFollowingStatus = React.useCallback(async () => {
    if (!post?.author?.id || !currentUserProfile || currentUserProfile.id === post.author.id) {
      return
    }
    try {
      const following = await isFollowingUser(post.author.id)
      setIsFollowingAuthor(following)
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }, [post?.author?.id, currentUserProfile])

  useEffect(() => {
    if (post?.author?.id) {
      checkFollowingStatus()
    }
  }, [post?.author?.id, checkFollowingStatus])

  /* Data loading moved to server component */

  const handleLike = async () => {
    if (!post) return
    if (!currentUserProfile) {
      setLoginIntent({ type: 'post_like', postId, returnTo: getCurrentPathWithSearchAndHash() })
      redirectToLogin()
      return
    }
    const prevPost = { ...post }
    const newIsLiked = !post.is_liked
    const newLikeCount = newIsLiked ? post.like_count + 1 : Math.max(0, post.like_count - 1)
    setPost({ ...post, is_liked: newIsLiked, like_count: newLikeCount })
    setIsLiking(true)
    try {
      const isLiked = await togglePostLike(postId)
      if (isLiked !== newIsLiked) { setPost(prev => prev ? { ...prev, is_liked: isLiked, like_count: isLiked ? prev.like_count + 1 : Math.max(0, prev.like_count - 1) } : null) }
    } catch { setPost(prevPost); toast({ title: '操作失败', variant: 'destructive' }) } finally { setIsLiking(false) }
  }

  const handleFavorite = async () => {
    if (!post) return
    if (!currentUserProfile) {
      setLoginIntent({ type: 'post_favorite', postId, returnTo: getCurrentPathWithSearchAndHash() })
      redirectToLogin()
      return
    }
    const prevPost = { ...post }
    const newIsFavorited = !post.is_favorited
    setPost({ ...post, is_favorited: newIsFavorited })
    setIsFavoriting(true)
    try {
      const isFavorited = await togglePostFavorite(postId)
      if (isFavorited !== newIsFavorited) { setPost(prev => prev ? { ...prev, is_favorited: isFavorited } : null) }
      toast({ title: isFavorited ? '已收藏' : '已取消收藏' })
    } catch { setPost(prevPost); toast({ title: '操作失败', variant: 'destructive' }) } finally { setIsFavoriting(false) }
  }

  const handleCommentLike = async (commentId: string) => {
    if (!currentUserProfile) {
      setLoginIntent({ type: 'comment_like', commentId, returnTo: getCurrentPathWithSearchAndHash() })
      redirectToLogin()
      return
    }
    const comment = comments.find(c => c.id === commentId); if (!comment) return
    const prevComments = [...comments]
    const newIsLiked = !comment.is_liked
    const newLikeCount = newIsLiked ? comment.like_count + 1 : Math.max(0, comment.like_count - 1)
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_liked: newIsLiked, like_count: newLikeCount } : c))
    try {
      const isLiked = await toggleCommentLike(commentId)
      if (isLiked !== newIsLiked) { setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_liked: isLiked, like_count: isLiked ? c.like_count + 1 : Math.max(0, c.like_count - 1) } : c)) }
    } catch { setComments(prevComments); toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const handleAdoptCommentClick = (commentId: string) => setConfirmAdoptCommentId(commentId)
  const handleAdoptComment = async (commentId: string) => {
    if (!post) return; setConfirmAdoptCommentId(null)
    try {
      setAdoptingCommentId(commentId); const result = await adoptComment(commentId, postId)
      if (result.success) { router.refresh(); toast({ title: '采纳成功' }) } else { toast({ title: '采纳失败', variant: 'destructive' }) }
    } catch { toast({ title: '操作失败', variant: 'destructive' }) } finally { setAdoptingCommentId(null) }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return; try { setDeletingCommentId(commentId); await deleteComment(commentId); setComments(prev => prev.filter(c => c.id !== commentId)); if (post) setPost({ ...post, comment_count: Math.max(0, post.comment_count - 1) }); toast({ title: '删除成功' }) } catch { toast({ title: '删除失败', variant: 'destructive' }) } finally { setDeletingCommentId(null) }
  }
  const handleConfirmDeleteComment = async () => { if (!confirmDeleteCommentId) return; await handleDeleteComment(confirmDeleteCommentId); setConfirmDeleteCommentId(null) }

  const isPostAuthor = post && currentUserProfile && post.user_id === currentUserProfile.id

  const handleUnlockComment = async (id: string) => {
    if (!currentUserProfile) {
      setLoginIntent({ type: 'comment_focus', postId, returnTo: getCurrentPathWithSearchAndHash() })
      redirectToLogin()
      throw new Error('请先登录后再操作')
    }

    const content = await unlockContent(id)
    setComments(prev => prev.map(c => c.id === id ? { ...c, content, is_blurred: false, unlock_count: (c.unlock_count || 0) + 1 } : c))
    router.refresh()
  }

  const openGiftDialogFor = async (receiver: { id: string; nickname: string | null }) => {
    if (!currentUserProfile) {
      setLoginIntent({ type: 'comment_focus', postId, returnTo: getCurrentPathWithSearchAndHash() })
      redirectToLogin()
      return
    }
    if (receiver.id === currentUserProfile.id) {
      toast({ title: '不能给自己送礼', variant: 'destructive' })
      return
    }

    setGiftReceiver(receiver)
    setGiftTypeToPay(null)
    setGiftDialogOpen(true)
    setGiftBalance(walletBalance)
  }

  const sendGiftRequest = async (receiverId: string, giftType: GiftType) => {
    const res = await fetch('/api/gift/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId, giftType }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json?.error || '送礼失败')
    }
  }

  const handleSelectGift = async (type: GiftType) => {
    if (!giftReceiver || !currentUserProfile) return
    const price = GIFT_PRICES[type]
    setGiftBalance(walletBalance)

    if (price <= 0) {
      try {
        await sendGiftRequest(giftReceiver.id, type)
        toast({ title: `已送出${GIFT_NAMES[type]}` })
        setGiftDialogOpen(false)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '送礼失败'
        toast({ title: msg, variant: 'destructive' })
      }
      return
    }

    setGiftTypeToPay(type)
    setGiftPaymentOpen(true)
  }

  const handleGiftPaymentConfirm = async () => {
    if (!giftReceiver || !giftTypeToPay || !currentUserProfile) {
      return { success: false, error: '支付参数不完整' }
    }

    const price = GIFT_PRICES[giftTypeToPay]
    if (giftBalance < price) {
      return { success: false, error: 'insufficient_balance' as const }
    }

    try {
      await sendGiftRequest(giftReceiver.id, giftTypeToPay)
      toast({ title: `已送出${GIFT_NAMES[giftTypeToPay]}` })
      setGiftPaymentOpen(false)
      setGiftDialogOpen(false)
      router.refresh()
      return { success: true }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '支付失败'
      return { success: false, error: msg }
    }
  }

  const handleSubmitComment = async () => {
    const textContent = stripHtmlToText(replyText)
    if (!textContent) return
    if (!currentUserProfile) {
      setLoginIntent({ type: 'comment_focus', postId, returnTo: getCurrentPathWithSearchAndHash() })
      redirectToLogin()
      return
    }
    try {
      setIsSubmitting(true)
      await createComment({ 
        post_id: postId, 
        content: replyText.trim(), 
        parent_id: replyingTo?.id || null,
        is_paywalled: commentPaywalled,
      })
      toast({ title: '评论成功' })
      setReplyText('')
      setReplyingTo(null)
      setCommentPaywalled(false)
      window.localStorage.removeItem(commentDraftKey)
      router.refresh()
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 })
    } catch {
      toast({ title: '评论失败', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMessageAuthor = () => { if (!post?.author?.id) return; if (!currentUserProfile) { router.push(`/login?redirect=${encodeURIComponent(`/messages?userId=${post.author.id}`)}`); return } if (currentUserProfile.id === post.author.id) { toast({ title: '不能给自己发私信', variant: 'destructive' }); return } router.push(`/messages?userId=${post.author.id}`) }


  const canArchive =
    !!post &&
    !!currentUserProfile &&
    (post.user_id === currentUserProfile.id ||
      currentUserProfile.role === "admin");
  const handleArchive = async () => {
    if (!post) return;
    if (!archiveFeedback.trim()) {
      toast({ title: "请填写实际结果", variant: "destructive" });
      return;
    }
    try {
      setArchiveSubmitting(true);
      const session = await getSession();
      if (!session?.access_token) {
        toast({ title: "请先登录", variant: "destructive" });
        return;
      }
      const res = await fetch("/api/library/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          post_id: post.id,
          feedback: archiveFeedback.trim(),
          accuracy: archiveAccuracy,
          occurred_at: archiveOccurredAt
            ? new Date(archiveOccurredAt).toISOString()
            : null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "结案失败");
      setArchiveOpen(false);
      setCaseExists(true);
      setPost((prev) => (prev ? { ...prev, status: "archived" } : prev));
      toast({ title: "结案成功" });
    } catch {
      toast({ title: "结案失败", variant: "destructive" });
    } finally {
      setArchiveSubmitting(false);
    }
  };

  // Helpers
  const formatTimeStr = (dateString: string) => {
    const date = new Date(dateString)
    const diff = (new Date().getTime() - date.getTime()) / 60000
    if (diff < 1) return '刚刚'
    if (diff < 60) return `${Math.floor(diff)}分钟前`
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
    if (diff < 10080) return `${Math.floor(diff / 1440)}天前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const rawContent = post?.content_html || post?.content || ''
  const isHtmlContent = useMemo(() => /<\/?[a-z][\s\S]*>/i.test(rawContent), [rawContent])
  const [sanitizedHtml, setSanitizedHtml] = useState('')

  useEffect(() => {
    if (!rawContent) {
      setSanitizedHtml('')
      return
    }
    setSanitizedHtml(DOMPurify.sanitize(rawContent))
  }, [rawContent])

  const isHelpPost = post?.type === 'help' && post?.divination_record
  
  const isBaziRecord = useMemo(() => {
    if (!post?.divination_record) return false
    const record = post.divination_record
    return record.method === 1 || record.original_key === 'bazi'
  }, [post?.divination_record])
  
  const baziData = useMemo(() => {
    if (!post?.divination_record) return null
    return getBaziInfo(post.divination_record)
  }, [post?.divination_record])
  
  const fullGuaData = useMemo(() => {
    if (!isHelpPost || !post?.divination_record || isBaziRecord) return null
    return convertDivinationRecordToFullGuaData(post.divination_record)
  }, [isHelpPost, post?.divination_record, isBaziRecord])
  
  if (!post) return <div className={cn("min-h-screen flex items-center justify-center text-stone-400", styles['font-serif-sc'])}>此贴已隐入云烟</div>

  const isSticky = post.sticky_until ? new Date(post.sticky_until) > new Date() : false
  const isUrgent = typeof post.is_urgent === 'boolean'
    ? post.is_urgent
    : ('isUrgent' in post && typeof (post as { isUrgent?: boolean }).isUrgent === 'boolean'
      ? (post as { isUrgent?: boolean }).isUrgent
      : false)
  const stickyRemainingHours = isSticky && post.sticky_until
    ? Math.max(0, Math.ceil((new Date(post.sticky_until).getTime() - Date.now()) / (60 * 60 * 1000)))
    : 0

  return (
    <>
      <div className={cn("min-h-screen font-sans text-stone-800 pb-28 lg:pb-20 selection:bg-[#C82E31]/10 selection:text-[#C82E31]", styles['paper-texture'])}>
        
        {/* Navigation - 透明磨砂质感 */}
        <DetailPageHeader
          backHref="/community"
          backLabel={post.type === 'help' ? "返回悬卦" : "返回论道"}
          share={{
            title: post.title,
            url: typeof window !== 'undefined' ? `${window.location.origin}/community/${postId}` : `/community/${postId}`
          }}
          report={{
            targetId: post.id,
            targetType: 'post',
            postTitle: post.title
          }}
        />

        {/* Main Content Layout */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-8 lg:gap-10 relative">
          
          {/* Left Column: Article Content */}
          <div className="flex-1 min-w-0 w-full">
            <article className={cn("bg-white rounded-xl overflow-hidden mb-8 ring-1 ring-stone-900/5", styles['card-shadow'])}>
              
              {/* 装饰性顶栏 */}
              <div className="h-1 w-full bg-linear-to-r from-stone-200 via-[#C82E31]/40 to-stone-200 opacity-60" />
              
              <div className="px-6 py-8 sm:px-10 sm:py-12">
                
                {/* 1. Article Header */}
                <header className="mb-10 text-center sm:text-left border-b border-stone-100 pb-8">
                  <div className="flex flex-wrap items-center gap-2 mb-5 justify-center sm:justify-start">
                    {isSticky && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#C82E31] text-white text-xs font-bold shadow-sm">
                        置顶
                      </span>
                    )}
                    {isUrgent && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/60 text-xs font-bold shadow-sm">
                        急
                      </span>
                    )}
                    {(post.bounty || 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-bold shadow-sm">
                        <Coins className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                        赏金 {post.bounty}
                      </span>
                    )}
                    {post.tags?.map(tag => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 text-xs font-medium border border-stone-200/50">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <h1 className={cn("text-2xl sm:text-3xl lg:text-[2rem] font-bold text-stone-900 leading-tight mb-6 tracking-wide", styles['font-serif-sc'])}>
                    {post.title}
                  </h1>

                  <div className="flex items-center justify-center sm:justify-start gap-4 text-xs sm:text-sm text-stone-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5 border border-stone-200">
                         <AvatarImage src={post.author?.avatar_url || ''} />
                         <AvatarFallback className="text-[10px]">{post.author?.nickname?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-stone-600">{post.author?.nickname || '佚名'}</span>
                    </span>
                    <span className="w-px h-3 bg-stone-300"></span>
                    <span>{formatTimeStr(post.created_at)}</span>
                    <span className="w-px h-3 bg-stone-300"></span>
                    <span>{post.view_count} 阅读</span>
                    {isSticky && currentUserProfile?.id === post.user_id && (
                      <>
                        <span className="w-px h-3 bg-stone-300"></span>
                        <span className="text-amber-600">置顶剩 {stickyRemainingHours}h</span>
                      </>
                    )}
                  </div>
                </header>

                {/* 2. Article Content */}
                <div className={cn("prose prose-stone max-w-none", styles.prose)}>
                  
                  {isHelpPost && (fullGuaData || (baziData && baziData.pillars)) && (
                    <div className="sticky top-20 z-30 lg:hidden">
                      <MobileDivinationFold 
                        gua={fullGuaData as FullGuaData} 
                        bazi={baziData as BaZiPanelDualData} 
                        recordId={post.divination_record?.id || ''} 
                      />
                    </div>
                  )}
                  {isHtmlContent ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizedHtml || '暂无详细背景描述...' }} />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {rawContent || '暂无详细背景描述...'}
                    </ReactMarkdown>
                  )}
                </div>

              </div>

              {/* 3. Footer Actions (Desktop Only mainly) */}
              <div className="bg-stone-50/30 border-t border-stone-100 px-6 py-4 hidden sm:flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-3">
                  <Button
                    onClick={handleLike}
                    disabled={isLiking}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "rounded-full border-stone-200 hover:bg-white hover:text-[#C82E31] hover:border-[#C82E31]/30 transition-all shadow-sm h-9 px-5",
                      post.is_liked && "text-[#C82E31] border-[#C82E31]/30 bg-[#C82E31]/5"
                    )}
                  >
                    <ThumbsUp className={cn("w-4 h-4 mr-1.5", post.is_liked && "fill-current")} />
                    {post.like_count || '点赞'}
                  </Button>
                  <Button
                    onClick={handleFavorite}
                    disabled={isFavoriting}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "rounded-full border-stone-200 hover:bg-white hover:text-amber-600 hover:border-amber-600/30 transition-all shadow-sm h-9 px-5",
                      post.is_favorited && "text-amber-600 border-amber-600/30 bg-amber-50"
                    )}
                  >
                    <Bookmark className={cn("w-4 h-4 mr-1.5", post.is_favorited && "fill-current")} />
                    {post.is_favorited ? '已收藏' : '收藏'}
                  </Button>
                </div>
                
                {canArchive && post?.type === 'help' && (
                  <Button
                    variant="ghost"
                    onClick={() => caseExists ? router.push(`/cases/${post.id}`) : setArchiveOpen(true)}
                    className="text-stone-500 hover:text-stone-900 hover:bg-stone-100/50"
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    {caseExists ? '查看案例' : '反馈/结案'}
                  </Button>
                )}
              </div>
            </article>

            {/* Comments Section */}
            <div id="comments" className={cn("bg-white rounded-xl p-6 sm:p-8 ring-1 ring-stone-900/5", styles['card-shadow'])}>
              <div className="flex items-center justify-between mb-8">
                <h3 className={cn("text-lg font-bold text-stone-900 flex items-center gap-2.5", styles['font-serif-sc'])}>
                  <span className="w-1.5 h-5 bg-[#C82E31] rounded-full" />
                  论道 ({post.comment_count})
                </h3>
              </div>

              {/* Comment Input Area */}
              <div className="flex gap-4 mb-10">
                <Avatar className="w-10 h-10 border border-stone-100 hidden sm:block shadow-sm ring-2 ring-white">
                  <AvatarImage src={currentUserProfile?.avatar_url || ''} />
                  <AvatarFallback className="bg-stone-100 text-stone-500">我</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="relative group rounded-xl shadow-sm border border-stone-200 bg-white focus-within:ring-2 focus-within:ring-[#C82E31]/10 focus-within:border-[#C82E31]/40 transition-all duration-300">
                    {replyingTo && (
                      <div className="absolute -top-10 left-0 right-0 bg-stone-50/90 text-xs text-stone-600 px-4 py-2 rounded-t-lg border border-b-0 border-stone-200/80 flex justify-between items-center z-10 backdrop-blur-sm mx-1">
                        <div className="flex items-center gap-2">
                          <div className="w-0.5 h-3 bg-[#C82E31] rounded-full" />
                          <span>回复 <span className="font-semibold text-stone-800">@{replyingTo.author?.nickname}</span></span>
                        </div>
                        <button 
                          onClick={() => setReplyingTo(null)} 
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-stone-200 transition-colors text-stone-400"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div id="comment-editor" className="relative rounded-xl overflow-hidden">
                      <SimpleRichTextEditor
                        value={replyText}
                        onChange={setReplyText}
                        placeholder="发表你的真知灼见..."
                        minHeight="6rem"
                        className="bg-transparent border-none focus:ring-0 px-4 pt-3 pb-12"
                      />
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-linear-to-t from-stone-50/80 to-transparent">
                        <div className="flex items-center gap-2">
                          {(post.type === 'help' || (post.bounty || 0) > 0) && (
                            <div className="flex items-center gap-2 rounded-full bg-white/60 backdrop-blur-sm px-3 py-1 shadow-sm border border-stone-200/60 hover:border-amber-300/50 transition-all cursor-pointer" onClick={() => setCommentPaywalled(!commentPaywalled)}>
                              <Switch 
                                checked={commentPaywalled} 
                                onCheckedChange={setCommentPaywalled}
                                className="scale-75 data-[state=checked]:bg-amber-500"
                              />
                              <span className="text-[10px] font-medium text-stone-600 whitespace-nowrap select-none">
                                付费隐藏 <span className="text-amber-600 ml-0.5">2易币</span>
                              </span>
                            </div>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={handleSubmitComment} 
                          disabled={isSubmitting || !replyText.replace(/<[^>]*>/g, '').trim()}
                          className="bg-[#C82E31] hover:bg-[#a61b1f] disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-lg px-5 h-8 text-xs font-semibold shadow-md shadow-red-900/10 hover:shadow-lg hover:shadow-red-900/20 transition-all active:scale-95"
                        >
                          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : '发布'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-6">
                {comments.length === 0 ? (
                  <div className="text-center py-16 bg-stone-50/30 rounded-xl border border-dashed border-stone-200">
                    <div className="w-12 h-12 mx-auto bg-stone-100 rounded-full flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 text-stone-300" />
                    </div>
                    <p className={cn("text-stone-400 text-sm", styles['font-serif-sc'])}>暂无评论，静待高见...</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div 
                      key={comment.id} 
                      ref={(el) => { if(el) commentRefs.current.set(comment.id, el) }}
                      className="group flex gap-4 p-4 -mx-4 rounded-xl transition-all hover:bg-stone-50/60"
                    >
                      <Link href={`/u/${comment.author?.id}`} className="shrink-0 pt-1">
                        <Avatar className="w-10 h-10 border border-stone-200 shadow-sm">
                          <AvatarImage src={comment.author?.avatar_url || ''} />
                          <AvatarFallback className="bg-white text-stone-400">{comment.author?.nickname?.[0]}</AvatarFallback>
                        </Avatar>
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-800 text-sm">{comment.author?.nickname}</span>
                            {comment.author?.id === post.user_id && (
                              <span className="text-[0.6rem] px-1.5 py-px bg-stone-100 text-stone-500 rounded border border-stone-200/80">楼主</span>
                            )}
                            {!!comment.is_adopted && (
                              <span className="flex items-center gap-1 text-[0.6rem] px-1.5 py-px bg-amber-50 text-amber-700 rounded border border-amber-200 font-medium shadow-sm">
                                <CheckCircle className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> 已采纳
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400 font-medium tracking-wide">{formatTimeStr(comment.created_at)}</span>
                        </div>

                        {comment.reply_to && (
                          <div className="bg-stone-100/60 px-3 py-2 rounded-lg text-xs text-stone-500 border-l-[3px] border-stone-300 mb-3 mt-1">
                            回复 <span className="font-semibold text-stone-700">@{comment.reply_to.author?.nickname}</span>
                          </div>
                        )}

                      {comment.is_blurred ? (
                          <BlurredContent
                            preview={comment.preview}
                            amount={2}
                            itemName={`大师断语 · ${comment.unlock_count || 0}人已阅`}
                            balance={walletBalance}
                            onUnlock={() => handleUnlockComment(comment.id)}
                            className={cn("relative overflow-hidden rounded-xl border border-amber-200/50 bg-stone-50/50 shadow-sm transition-all hover:shadow-md hover:border-amber-300/50 group/lock", styles['blur-lock-container'])}
                          />
                        ) : (
                          <SanitizedContent
                            className={cn("text-stone-700 text-[0.93rem] leading-7 prose prose-sm max-w-none prose-stone prose-p:my-1 prose-a:text-[#C82E31] hover:prose-a:underline", styles.prose)}
                            html={comment.content || ''}
                          />
                        )}

                        <div className="flex items-center gap-5 pt-3">
                          <button 
                            onClick={() => handleCommentLike(comment.id)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-medium transition-colors hover:bg-stone-100 px-2 py-1 -ml-2 rounded-full",
                              comment.is_liked ? "text-[#C82E31]" : "text-stone-400 hover:text-stone-600"
                            )}
                          >
                            <ThumbsUp className={cn("w-3.5 h-3.5", comment.is_liked && "fill-current")} /> 
                            {comment.like_count > 0 ? comment.like_count : '赞'}
                          </button>
                          <button 
                            onClick={() => {
                              setReplyingTo(comment)
                              setTimeout(() => {
                                const editor = document.querySelector('.ProseMirror') as HTMLElement
                                editor?.focus()
                              }, 100)
                            }}
                            className="text-xs font-medium text-stone-400 hover:text-stone-800 transition-colors"
                          >
                            回复
                          </button>
                          {comment.author?.id && currentUserProfile?.id !== comment.author.id && (
                            <button
                              onClick={() => openGiftDialogFor({ id: comment.author!.id, nickname: comment.author!.nickname })}
                              className="text-xs font-medium text-stone-400 hover:text-amber-600 transition-colors"
                            >
                              送礼
                            </button>
                          )}
                          
                          {(isPostAuthor || currentUserProfile?.id === comment.author?.id) && (
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3">
                              {isPostAuthor && !comment.is_adopted && (
                                <button onClick={() => handleAdoptCommentClick(comment.id)} className="text-xs text-amber-600 hover:underline font-medium">采纳</button>
                              )}
                              {currentUserProfile?.id === comment.author?.id && (
                                <button onClick={() => setConfirmDeleteCommentId(comment.id)} className="text-xs text-stone-400 hover:text-red-500 transition-colors">删除</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Sticky Info Panel (Desktop Only) */}
          <aside className="hidden lg:block w-88 shrink-0 space-y-6">
            
            {/* Author Card - 更加立体的名片感 */}
            {post.author && (
              <div className={cn("bg-white rounded-xl p-6 relative overflow-hidden group ring-1 ring-stone-900/5", styles['card-shadow'])}>
                <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-stone-100 via-stone-200 to-stone-100" />
                
                <div className="flex items-center gap-4 mb-5">
                  <Link href={`/u/${post.author.id}`}>
                    <Avatar className="w-14 h-14 border-2 border-white shadow-md hover:scale-105 transition-transform duration-300 ring-1 ring-stone-100">
                      <AvatarImage src={post.author.avatar_url || ''} />
                      <AvatarFallback className="bg-stone-100 text-stone-500 text-lg">{post.author.nickname?.[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <h3 className={cn("font-bold text-lg text-stone-900 tracking-wide", styles['font-serif-sc'])}>{post.author.nickname}</h3>
                    {authorStats && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[0.625rem] font-bold text-stone-100 bg-stone-800 px-1.5 py-px rounded shadow-sm">
                          Lv.{authorStats.level}
                        </span>
                        <span className="text-xs text-stone-400 font-medium">
                          {authorStats.posts} 帖 · {authorStats.collections} 藏
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {currentUserProfile?.id !== post.author.id && (
                  <div className="flex gap-2.5">
                    <Button 
                      onClick={async () => {
                        if (isFollowingLoading || !post.author?.id) return
                        if (!currentUserProfile) {
                          setLoginIntent({ type: 'follow_user', userId: post.author.id, returnTo: getCurrentPathWithSearchAndHash() })
                          redirectToLogin()
                          return
                        }
                        setIsFollowingLoading(true)
                        const status = await toggleFollowUser(post.author.id)
                        setIsFollowingAuthor(status)
                        setIsFollowingLoading(false)
                        toast({ title: status ? '已关注' : '已取消关注' })
                      }}
                      disabled={isFollowingLoading}
                      className={cn(
                        "flex-1 rounded-lg h-9 text-xs font-medium shadow-sm transition-all duration-300",
                        !currentUserProfile && "opacity-70",
                        isFollowingAuthor 
                          ? "bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200" 
                          : "bg-[#C82E31] hover:bg-[#a61b1f] text-white hover:shadow-red-200"
                      )}
                    >
                      {isFollowingAuthor ? '已关注' : <><UserPlus className="w-3.5 h-3.5 mr-1.5" /> 关注</>}
                    </Button>
                    <Button variant="outline" onClick={handleMessageAuthor} className="flex-1 rounded-lg h-9 text-xs border-stone-200 hover:bg-stone-50 hover:text-stone-900 text-stone-600">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> 私信
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Divination Panels (Sticky) */}
            <div className="sticky top-24 space-y-6">
              {(fullGuaData || (baziData && baziData.pillars)) && (
                <div className="space-y-6">
                  {fullGuaData && (
                    <div className="">
                       <div className="px-4 py-3 border-b border-stone-50 flex items-center gap-2">
                          <span className="w-1 h-3 bg-[#C82E31] rounded-full" /> 
                          <span className={cn("font-bold text-stone-800 text-sm", styles['font-serif-sc'])}>卦象排盘</span>
                       </div>
                       <div className="">
                         <GuaPanelDual data={fullGuaData} recordId={post.divination_record?.id} />
                       </div>
                    </div>
                  )}
                  {baziData && baziData.pillars && (
                    <div className="">
                        <div className="px-4 py-3 border-b border-stone-50 flex items-center gap-2">
                          <span className="w-1 h-3 bg-[#C82E31] rounded-full" /> 
                          <span className={cn("font-bold text-stone-800 text-sm", styles['font-serif-sc'])}>八字排盘</span>
                       </div>
                       <div className="">
                         <BaZiPanelDual data={baziData} recordId={post.divination_record?.id} />
                       </div>
                    </div>
                  )}
                </div>
              )}

              {/* Related Posts */}
              {!isHelpPost && relatedPosts.length > 0 && (
                <div className={cn("bg-white rounded-xl p-5 ring-1 ring-stone-900/5", styles['card-shadow'])}>
                  <h3 className={cn("font-bold text-stone-800 text-sm mb-4 flex items-center gap-2", styles['font-serif-sc'])}>
                    <span className="w-1 h-3 bg-[#C82E31] rounded-full" /> 相关推荐
                  </h3>
                  <div className="space-y-5">
                    {relatedPosts.map(p => (
                      <Link key={p.id} href={`/community/${p.id}`} className="block group">
                        <h4 className="text-[0.85rem] leading-snug font-medium text-stone-700 group-hover:text-[#C82E31] transition-colors line-clamp-2 mb-1.5">
                          {p.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-stone-400">
                          <span>{p.author?.nickname || '匿名'}</span>
                          <span>{formatTimeStr(p.created_at)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

        </main>

        {/* Mobile Bottom Bar - 玻璃拟态与悬浮感 */}
        <div className={cn("lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-stone-200/60 pb-[env(safe-area-inset-bottom)]", styles['floating-bar-shadow'])}>
          <div className="flex items-center justify-between px-5 h-14">
            <div className="flex gap-7 text-stone-500">
              <button onClick={handleLike} className="flex flex-col items-center justify-center gap-0.5 w-10 active:scale-95 transition-transform">
                <ThumbsUp className={cn("w-5 h-5", post.is_liked && "fill-[#C82E31] text-[#C82E31]")} />
                <span className="text-[10px] font-medium">{post.like_count > 0 ? post.like_count : '点赞'}</span>
              </button>
              <button onClick={handleFavorite} className="flex flex-col items-center justify-center gap-0.5 w-10 active:scale-95 transition-transform">
                <Bookmark className={cn("w-5 h-5", post.is_favorited && "fill-amber-500 text-amber-500")} />
                <span className="text-[10px] font-medium">{post.is_favorited ? '已藏' : '收藏'}</span>
              </button>
              <Link href="#comments" className="flex flex-col items-center justify-center gap-0.5 w-10 active:scale-95 transition-transform">
                <MessageSquare className="w-5 h-5" />
                <span className="text-[10px] font-medium">{post.comment_count > 0 ? post.comment_count : '评论'}</span>
              </Link>
            </div>
            
            <Button 
              className="rounded-full bg-[#C82E31] hover:bg-[#a61b1f] text-white px-6 h-9 text-sm font-medium shadow-md shadow-red-500/20 active:scale-95 transition-all"
              onClick={() => {
                const editor = document.querySelector('.ProseMirror') as HTMLElement
                editor?.focus()
                document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              参与讨论
            </Button>
          </div>
        </div>

        {/* Dialogs... (Style Refined) */}
        <Dialog open={giftDialogOpen} onOpenChange={(open) => { setGiftDialogOpen(open); if (!open) setGiftTypeToPay(null) }}>
          <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
            <DialogHeader className="border-b border-stone-100 pb-4">
              <DialogTitle className={cn("text-center", styles['font-serif-sc'])}>
                送礼<span className="text-stone-400 font-sans font-normal text-sm mx-2">to</span>{giftReceiver?.nickname}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {(Object.values(GiftType) as GiftType[]).map((type) => {
                const price = GIFT_PRICES[type]
                return (
                  <button
                    key={type}
                    onClick={() => handleSelectGift(type)}
                    className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-left hover:bg-stone-50 hover:border-stone-300 transition-all active:scale-[0.98]"
                  >
                    <span className="text-sm font-bold text-stone-700">{GIFT_NAMES[type]}</span>
                    <span className={cn("text-xs font-medium", price > 0 ? "text-amber-600" : "text-green-600")}>
                      {price > 0 ? `${price} 易币` : '免费'}
                    </span>
                  </button>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>

        <PaymentModal
          open={giftPaymentOpen}
          onOpenChange={setGiftPaymentOpen}
          balance={giftBalance}
          amount={giftTypeToPay ? GIFT_PRICES[giftTypeToPay] : 0}
          itemName={giftTypeToPay ? `送礼 - ${GIFT_NAMES[giftTypeToPay]}` : '送礼'}
          onConfirm={handleGiftPaymentConfirm}
        />

        <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <DialogContent className="sm:max-w-lg bg-white border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className={styles['font-serif-sc']}>反馈与结案</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-700">实际结果</div>
                <Textarea
                  value={archiveFeedback}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setArchiveFeedback(e.target.value)}
                  placeholder="事情的最终走向如何？关键的时间点是？（请详实填写，以供后人验证）"
                  className="min-h-32 bg-stone-50 border-stone-200 focus:border-[#C82E31]/50 focus:ring-[#C82E31]/10"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-700">准确度评价</div>
                <div className="flex gap-2">
                  {([ { id: 'accurate', label: '准确' }, { id: 'partial', label: '基本准确' }, { id: 'inaccurate', label: '不准' }, ] as const).map((o) => (
                    <label key={o.id} className={cn(
                      "flex-1 flex items-center justify-center gap-2 text-sm cursor-pointer border rounded-lg py-2 transition-all",
                      archiveAccuracy === o.id 
                        ? "bg-[#C82E31]/5 border-[#C82E31] text-[#C82E31] font-bold" 
                        : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    )}>
                      <input type="radio" name="archive-accuracy-modal" value={o.id} checked={archiveAccuracy === o.id} onChange={() => setArchiveAccuracy(o.id)} className="sr-only" />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-700">应期时间（选填）</div>
                <input 
                  type="datetime-local" 
                  value={archiveOccurredAt} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArchiveOccurredAt(e.target.value)} 
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:border-[#C82E31]/50 focus:ring-2 focus:ring-[#C82E31]/10" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setArchiveOpen(false)} disabled={archiveSubmitting} className="border-stone-200">取消</Button>
                <Button onClick={handleArchive} className="bg-[#C82E31] hover:bg-[#A61B1F] text-white shadow-md shadow-red-500/20" disabled={archiveSubmitting}>{archiveSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '提交存档'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {confirmDeleteCommentId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4" onClick={() => setConfirmDeleteCommentId(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all" onClick={(e) => e.stopPropagation()}>
              <h3 className={cn("text-lg font-bold text-stone-900 mb-2", styles['font-serif-sc'])}>确认删除</h3>
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">删除后将无法恢复，您确定要删除这条见解吗？</p>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setConfirmDeleteCommentId(null)} className="text-stone-500 hover:text-stone-800">取消</Button>
                <Button onClick={handleConfirmDeleteComment} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20">确认删除</Button>
              </div>
            </div>
          </div>
        )}
        
        {confirmAdoptCommentId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4" onClick={() => setConfirmAdoptCommentId(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className={cn("text-lg font-bold text-stone-900 mb-2", styles['font-serif-sc'])}>确认采纳</h3>
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">采纳回答是对答主的最高认可，系统将自动发放悬赏（如有）。</p>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setConfirmAdoptCommentId(null)} className="text-stone-500 hover:text-stone-800">再想想</Button>
                <Button onClick={() => handleAdoptComment(confirmAdoptCommentId)} className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20">确认采纳</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
