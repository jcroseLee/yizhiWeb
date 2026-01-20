'use client'

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

import BaZiPanelDual from '@/app/community/components/BaZiPanelDual'
import GuaPanelDual from '@/app/community/components/GuaPanelDual'
import { getBaziInfo } from '@/app/community/components/PostCard'
import PostDetailSkeleton from '@/app/community/components/PostDetailSkeleton'
import DetailPageHeader from '@/lib/components/DetailPageHeader'
import SimpleRichTextEditor from '@/lib/components/SimpleRichTextEditor'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog'
import { Textarea } from '@/lib/components/ui/textarea'
import { useToast } from '@/lib/hooks/use-toast'
import { clearLoginIntent, getCurrentPathWithSearchAndHash, getCurrentUser, getLoginIntent, getSession, redirectToLogin, setLoginIntent } from '@/lib/services/auth'
import {
    adoptComment,
    createComment,
    deleteComment,
    getComments,
    getPost,
    getRelatedPosts,
    toggleCommentLike,
    togglePostFavorite,
    togglePostLike,
    type Comment as CommentType,
    type Post
} from '@/lib/services/community'
import { calculateLevel } from '@/lib/services/growth'
import { getUserProfile, isFollowingUser, toggleFollowUser, type UserProfile } from '@/lib/services/profile'
import { getSupabaseClient } from '@/lib/services/supabaseClient'
import { cn } from '@/lib/utils/cn'
import { convertDivinationRecordToFullGuaData } from '@/lib/utils/divinationToFullGuaData'
import { getGanZhiInfo, getLunarDateStringWithoutYear } from '@/lib/utils/lunar'
import { solarTermTextFrom } from '@/lib/utils/solarTerms'
import DOMPurify from 'isomorphic-dompurify'

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
// 样式定义 (新中式排版优化 + 侧边栏滚动条)
// -----------------------------------------------------------------------------
const styles = `
  .paper-texture {
    background-color: #fdfbf7;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
  }
  .font-serif-sc {
    font-family: "Noto Serif SC", "Songti SC", "SimSun", serif;
  }
  .prose {
    font-size: 1.05rem;
    line-height: 1.8;
    color: #2c2929;
  }
  .prose p {
    margin-bottom: 1.5em;
    text-align: justify;
  }
  .prose h2 {
    font-family: "Noto Serif SC", serif;
    font-weight: 700;
    color: #1c1917;
    border-bottom: 0.125rem solid #e7e5e4;
    padding-bottom: 0.5em;
    margin-top: 2em;
  }
  .prose blockquote {
    font-family: "Noto Serif SC", serif;
    background: #f5f5f4;
    border-left: 0.25rem solid #C82E31;
    color: #57534e;
    padding: 1rem 1.5rem;
    font-style: normal;
    border-radius: 0 0.5rem 0.5rem 0;
  }
  /* 隐藏滚动条但保留滚动功能 */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`

// -----------------------------------------------------------------------------
// 组件：移动端“案卷”折叠卡片
// -----------------------------------------------------------------------------
function MobileDivinationFold({ gua, bazi, recordId }: { gua: any, bazi: any, recordId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  const summary = useMemo(() => {
    if (gua) {
      const guaName =
        (typeof gua.guaName === 'string' && gua.guaName.trim() ? gua.guaName : undefined) ||
        (typeof gua.originalName === 'string' && gua.originalName.trim() ? gua.originalName : undefined) ||
        '卦象'

      const hasMoving =
        (Array.isArray(gua.changingLines) && gua.changingLines.length > 0) ||
        (Array.isArray(gua.lines) && gua.lines.some((line: any) => Boolean(line?.original?.isMoving)))

      return `${guaName} ${hasMoving ? '· 有动爻' : '· 静卦'}`
    }
    if (bazi) return `八字排盘 [${bazi.basic?.gender === '乾造' ? '男命' : '女命'}]`
    return '排盘数据'
  }, [gua, bazi])

  return (
    <div className="lg:hidden mb-8 rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-white">
      {/* 案卷头部：模拟档案袋封口 */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-amber-50/50 p-3 sm:p-4 flex items-center justify-between cursor-pointer active:bg-amber-100/50 transition-colors border-b border-stone-100"
      >
        {/* 装饰：左侧装订线 */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-200/50"></div>
        
        <div className="flex items-center gap-3 pl-2">
          <div className="bg-white p-1.5 rounded-lg border border-amber-100 shadow-sm text-amber-600">
            <ScrollText className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-stone-800 text-sm">{summary}</div>
            <div className="text-[0.625rem] text-stone-400 mt-0.5">点击{isOpen ? '收起' : '展开'}案卷查看详情</div>
          </div>
        </div>
        
        <div className={cn("transition-transform duration-300 text-stone-400", isOpen && "rotate-180")}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>

      {/* 案卷内容 */}
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out bg-white overflow-hidden",
          isOpen ? "max-h-[62.5rem] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 border-t border-dashed border-stone-200">
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
interface PostDetailPageProps {
  params: Promise<{ id: string }>
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const postId = resolvedParams.id
  const commentId = searchParams.get('commentId')
  
  // State
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<CommentType[]>([])
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<CommentType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null)
  const [authorStats, setAuthorStats] = useState<AuthorStats | null>(null)
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false)
  const [isFollowingLoading, setIsFollowingLoading] = useState(false)
  const [, setAdoptingCommentId] = useState<string | null>(null)
  const [confirmAdoptCommentId, setConfirmAdoptCommentId] = useState<string | null>(null)
  const [, setDeletingCommentId] = useState<string | null>(null)
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null)

  const [caseExists, setCaseExists] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveSubmitting, setArchiveSubmitting] = useState(false)
  const [archiveAccuracy, setArchiveAccuracy] = useState<'accurate' | 'inaccurate' | 'partial'>('accurate')
  const [archiveOccurredAt, setArchiveOccurredAt] = useState('')
  const [archiveFeedback, setArchiveFeedback] = useState('')
  
  const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const processedIntentRef = useRef(false)
  const commentDraftKey = useMemo(() => `yi_comment_draft_v1:${postId}`, [postId])

  // Effects & Data Loading
  useEffect(() => {
    if (postId) {
      loadPost()
      loadComments()
      loadRelatedPosts()
      loadCurrentUserProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

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
          await loadPost()
          toast({ title: '已点赞' })
          return
        }

        if (intent.type === 'post_favorite' && intent.postId === postId) {
          await fetch(`/api/community/posts/${postId}/favorite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'set', value: true }),
          })
          await loadPost()
          toast({ title: '已收藏' })
          return
        }

        if (intent.type === 'comment_like') {
          await fetch(`/api/community/comments/${intent.commentId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'set', value: true }),
          })
          await loadComments()
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

  const loadAuthorStats = React.useCallback(async () => {
    if (!post?.author?.id) return
    try {
      const supabase = getSupabaseClient()
      if (!supabase) return
      const { count: postsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', post.author.id)
      const { count: collectionsCount } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('user_id', post.author.id)
      const { data: profile } = await supabase.from('profiles').select('exp, yi_coins').eq('id', post.author.id).single()
      setAuthorStats({
        posts: postsCount || 0,
        collections: collectionsCount || 0,
        coins: profile?.yi_coins || 0,
        level: calculateLevel(profile?.exp || 0),
      })
    } catch (error) { console.error(error) }
  }, [post?.author?.id])

  useEffect(() => {
    if (post?.author?.id) {
      loadAuthorStats()
      checkFollowingStatus()
    }
  }, [post?.author?.id, checkFollowingStatus, loadAuthorStats])

  const loadCurrentUserProfile = async () => {
    try {
      const profile = await getUserProfile()
      setCurrentUserProfile(profile)
    } catch (error) { console.error(error) }
  }

  const loadPost = async () => {
    try {
      setLoading(true)
      const data = await getPost(postId)
      if (!data) {
        toast({ title: '帖子不存在', variant: 'destructive' })
        router.push('/community')
        return
      }
      setPost(data)
    } catch (error: unknown) {
      console.error('Error loading post:', error)
      router.push('/community')
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const data = await getComments(postId)
      setComments(data)
      if (commentId && data.length > 0) {
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
    } catch (error) { console.error(error) }
  }

  const loadRelatedPosts = async () => {
    try {
      const data = await getRelatedPosts(postId)
      setRelatedPosts(data)
    } catch (error) {
      console.error('Error loading related posts:', error)
    }
  }

  // Interactions (Like, Favorite, Comment, etc.) - Code omitted for brevity, same as previous
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
    } catch (error) { setPost(prevPost); toast({ title: '操作失败', variant: 'destructive' }) } finally { setIsLiking(false) }
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
    } catch (error) { setPost(prevPost); toast({ title: '操作失败', variant: 'destructive' }) } finally { setIsFavoriting(false) }
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
    } catch (error) { setComments(prevComments); toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const handleAdoptCommentClick = (commentId: string) => setConfirmAdoptCommentId(commentId)
  const handleAdoptComment = async (commentId: string) => {
    if (!post) return; setConfirmAdoptCommentId(null)
    try {
      setAdoptingCommentId(commentId); const result = await adoptComment(commentId, postId)
      if (result.success) { await loadComments(); if (post.bounty && post.bounty > 0) await loadPost(); toast({ title: '采纳成功' }) } else { toast({ title: '采纳失败', variant: 'destructive' }) }
    } catch { toast({ title: '操作失败', variant: 'destructive' }) } finally { setAdoptingCommentId(null) }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return; try { setDeletingCommentId(commentId); await deleteComment(commentId); setComments(prev => prev.filter(c => c.id !== commentId)); if (post) setPost({ ...post, comment_count: Math.max(0, post.comment_count - 1) }); toast({ title: '删除成功' }) } catch { toast({ title: '删除失败', variant: 'destructive' }) } finally { setDeletingCommentId(null) }
  }
  const handleConfirmDeleteComment = async () => { if (!confirmDeleteCommentId) return; await handleDeleteComment(confirmDeleteCommentId); setConfirmDeleteCommentId(null) }

  const isPostAuthor = post && currentUserProfile && post.user_id === currentUserProfile.id

  const handleSubmitComment = async () => {
    // 提取纯文本用于验证和提交
    const textContent = replyText.replace(/<[^>]*>/g, '').trim()
    if (!textContent) return
    if (!currentUserProfile) {
      setLoginIntent({ type: 'comment_focus', postId, returnTo: getCurrentPathWithSearchAndHash() })
      redirectToLogin()
      return
    }
    try {
      setIsSubmitting(true)
      // 提交 HTML 内容（如果后端支持）或纯文本
      await createComment({ 
        post_id: postId, 
        content: replyText.trim(), 
        parent_id: replyingTo?.id || null 
      })
      toast({ title: '评论成功' })
      setReplyText('')
      setReplyingTo(null)
      window.localStorage.removeItem(commentDraftKey)
      await loadComments()
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 })
    } catch (error: unknown) {
      toast({ title: '评论失败', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMessageAuthor = () => { if (!post?.author?.id) return; if (!currentUserProfile) { router.push(`/login?redirect=${encodeURIComponent(`/messages?userId=${post.author.id}`)}`); return } if (currentUserProfile.id === post.author.id) { toast({ title: '不能给自己发私信', variant: 'destructive' }); return } router.push(`/messages?userId=${post.author.id}`) }


  const canArchive = !!post && !!currentUserProfile && (post.user_id === currentUserProfile.id || currentUserProfile.role === 'admin')
  const handleArchive = async () => { if (!post) return; if (!archiveFeedback.trim()) { toast({ title: '请填写实际结果', variant: 'destructive' }); return } try { setArchiveSubmitting(true); const session = await getSession(); if (!session?.access_token) { toast({ title: '请先登录', variant: 'destructive' }); return } const res = await fetch('/api/library/archive', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ post_id: post.id, feedback: archiveFeedback.trim(), accuracy: archiveAccuracy, occurred_at: archiveOccurredAt ? new Date(archiveOccurredAt).toISOString() : null }) }); const json = await res.json().catch(() => null); if (!res.ok) throw new Error(json?.error || '结案失败'); setArchiveOpen(false); setCaseExists(true); setPost((prev) => (prev ? { ...prev, status: 'archived' } : prev)); toast({ title: '结案成功' }) } catch (e) { toast({ title: '结案失败', variant: 'destructive' }) } finally { setArchiveSubmitting(false) } }

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
  const sanitizedHtml = useMemo(() => {
    if (!rawContent) return ''
    return DOMPurify.sanitize(rawContent)
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
  
  const divinationInfo = useMemo(() => {
    if (!isHelpPost || !post?.divination_record) return null
    const r = post.divination_record
    const date = new Date(r.divination_time)
    return {
      question: r.question || post.title,
      timeStr: `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日 ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`,
      lunar: `${getLunarDateStringWithoutYear(date)} · ${solarTermTextFrom(date).split(' ')[0]}`,
      method: ['手动摇卦', '自动摇卦', '手工指定'][r.method] || '未知方式',
      ganZhi: getGanZhiInfo(date).stems.map((s, i) => `${s.char}${getGanZhiInfo(date).branches[i]?.char}`),
    }
  }, [isHelpPost, post])

  if (loading) return <PostDetailSkeleton />
  if (!post) return <div className="min-h-screen flex items-center justify-center text-stone-400">帖子不存在</div>

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen paper-texture font-sans text-stone-800 pb-20">
        
        {/* Navigation */}
        <DetailPageHeader
          backHref="/community"
          backLabel={post.type === 'help' ? "返回悬卦列表" : "返回论道列表"}
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-8 lg:gap-12 relative">
          
          {/* Left Column: Article Content */}
          <div className="flex-1 min-w-0 w-full">
            <article className="bg-white shadow-sm border border-stone-100 rounded-2xl overflow-hidden mb-8">
              
              <div className="h-1.5 w-full bg-gradient-to-r from-stone-200 via-[#C82E31]/60 to-stone-200 opacity-80" />
              
              <div className="px-6 py-8 sm:px-10 sm:py-12">
                
                {/* 1. Article Header */}
                <header className="mb-10 text-center sm:text-left border-b border-stone-100 pb-8">
                  <div className="flex flex-wrap items-center gap-3 mb-4 justify-center sm:justify-start">
                    {(post.bounty || 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold shadow-sm">
                        <Coins className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                        悬赏 {post.bounty}
                      </span>
                    )}
                    {post.tags?.map(tag => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 text-xs font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif-sc font-bold text-stone-900 leading-tight mb-6">
                    {post.title}
                  </h1>

                  <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-stone-500">
                    <span>{formatTimeStr(post.created_at)}</span>
                    <span className="text-stone-300">|</span>
                    <span>{post.view_count} 阅读</span>
                  </div>
                </header>

                {/* 2. Article Content */}
                <div className="prose prose-stone max-w-none">
                  
                  {isHelpPost && (fullGuaData || (baziData && baziData.pillars)) && (
                    <div className="sticky top-14 z-30 lg:hidden">
                      <MobileDivinationFold 
                        gua={fullGuaData} 
                        bazi={baziData} 
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

              {/* 3. Footer Actions */}
              <div className="bg-stone-50/50 border-t border-stone-100 px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-3">
                  <Button
                    onClick={handleLike}
                    disabled={isLiking}
                    variant="outline"
                    className={cn(
                      "rounded-full border-stone-200 hover:bg-white hover:text-[#C82E31] hover:border-[#C82E31]/30 transition-all",
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
                    className={cn(
                      "rounded-full border-stone-200 hover:bg-white hover:text-amber-600 hover:border-amber-600/30 transition-all",
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
                    className="text-stone-500 hover:text-stone-900"
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    {caseExists ? '查看案例' : '反馈/结案'}
                  </Button>
                )}
              </div>
            </article>

            {/* Comments Section */}
            <div id="comments" className="bg-white shadow-sm border border-stone-100 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <span className="w-1 h-5 bg-[#C82E31] rounded-full" />
                  论道 ({post.comment_count})
                </h3>
              </div>

              <div className="flex gap-4 mb-10">
                <Avatar className="w-10 h-10 border border-stone-100 hidden sm:block">
                  <AvatarImage src={currentUserProfile?.avatar_url || ''} />
                  <AvatarFallback>我</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="relative group">
                    {replyingTo && (
                      <div className="absolute -top-9 left-0 right-0 bg-stone-50 text-xs text-stone-500 px-3 py-1.5 rounded-t-lg border border-b-0 border-stone-200 flex justify-between items-center z-10">
                        <span>回复 <span className="font-bold text-stone-700">@{replyingTo.author?.nickname}</span></span>
                        <button onClick={() => setReplyingTo(null)} className="hover:text-red-500">×</button>
                      </div>
                    )}
                    <div id="comment-editor" className={cn(
                      "relative",
                      replyingTo && "[&>div]:rounded-tl-none [&>div]:rounded-tr-none"
                    )}>
                      <SimpleRichTextEditor
                        value={replyText}
                        onChange={setReplyText}
                        placeholder="发表你的真知灼见..."
                        minHeight="6.25rem"
                      />
                      <div className="absolute bottom-3 right-3 z-10">
                        <Button 
                          size="sm" 
                          onClick={handleSubmitComment} 
                          disabled={isSubmitting || !replyText.replace(/<[^>]*>/g, '').trim()}
                          className="bg-[#C82E31] hover:bg-[#a61b1f] text-white rounded-full px-5 h-8 text-xs font-medium shadow-sm shadow-red-100"
                        >
                          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : '发布'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {comments.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                    <p className="text-stone-400 text-sm">暂无评论，快来抢沙发 ~</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div 
                      key={comment.id} 
                      ref={(el) => { if(el) commentRefs.current.set(comment.id, el) }}
                      className="group flex gap-4 transition-colors p-3 -mx-3 rounded-xl hover:bg-stone-50/50"
                    >
                      <Link href={`/u/${comment.author?.id}`} className="shrink-0 pt-1">
                        <Avatar className="w-10 h-10 border border-stone-200">
                          <AvatarImage src={comment.author?.avatar_url || ''} />
                          <AvatarFallback>{comment.author?.nickname?.[0]}</AvatarFallback>
                        </Avatar>
                      </Link>
                      
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm">{comment.author?.nickname}</span>
                            {comment.author?.id === post.user_id && (
                              <span className="text-[0.625rem] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">楼主</span>
                            )}
                            {!!comment.is_adopted && (
                              <span className="flex items-center gap-1 text-[0.625rem] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 font-medium">
                                <CheckCircle className="w-3 h-3 fill-amber-500 text-amber-600" /> 已采纳
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-stone-400">{formatTimeStr(comment.created_at)}</span>
                        </div>

                        {comment.reply_to && (
                          <div className="bg-stone-100/80 px-3 py-2 rounded text-xs text-stone-500 border-l-2 border-stone-300 mb-2">
                            回复 <span className="font-bold text-stone-700">@{comment.reply_to.author?.nickname}</span>
                          </div>
                        )}

                        <div 
                          className="text-stone-700 text-sm leading-relaxed prose prose-sm max-w-none prose-stone prose-p:my-1 prose-a:text-[#C82E31] hover:prose-a:underline prose-strong:font-bold prose-em:italic prose-u:underline prose-s:line-through"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content) }}
                        />

                        <div className="flex items-center gap-4 pt-1">
                          <button 
                            onClick={() => handleCommentLike(comment.id)}
                            className={cn(
                              "flex items-center gap-1 text-xs font-medium transition-colors hover:bg-stone-100 px-2 py-1 rounded-full",
                              comment.is_liked ? "text-[#C82E31]" : "text-stone-400 hover:text-stone-600"
                            )}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> 
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
                            className="text-xs font-medium text-stone-400 hover:text-stone-700 hover:bg-stone-100 px-2 py-1 rounded-full transition-colors"
                          >
                            回复
                          </button>
                          {(isPostAuthor || currentUserProfile?.id === comment.author?.id) && (
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                              {isPostAuthor && !comment.is_adopted && (
                                <button onClick={() => handleAdoptCommentClick(comment.id)} className="text-xs text-amber-600 hover:underline mr-3">采纳</button>
                              )}
                              {currentUserProfile?.id === comment.author?.id && (
                                <button onClick={() => setConfirmDeleteCommentId(comment.id)} className="text-xs text-red-500 hover:underline">删除</button>
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
          {/* 使用 sticky + max-h 实现伴随式体验 */}
          <aside className="hidden lg:block w-[22.5rem] shrink-0">
            {/* Block 1: Author (Scrolls naturally) */}
            <div className="mb-6">
              {post.author && (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-stone-100" />
                  <div className="flex items-center gap-4 mb-6">
                    <Link href={`/u/${post.author.id}`}>
                      <Avatar className="w-14 h-14 border-2 border-white shadow-md hover:scale-105 transition-transform">
                        <AvatarImage src={post.author.avatar_url || ''} />
                        <AvatarFallback>{post.author.nickname?.[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <h3 className="font-bold text-lg text-stone-900">{post.author.nickname}</h3>
                      {authorStats && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[0.625rem] font-bold text-white bg-stone-800 px-1.5 py-0.5 rounded">
                            Lv.{authorStats.level}
                          </span>
                          <span className="text-xs text-stone-400">
                            {authorStats.posts} 帖子 · {authorStats.collections} 收藏
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {currentUserProfile?.id !== post.author.id && (
                    <div className="flex gap-2">
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
                          "flex-1 rounded-lg h-9 text-xs font-medium shadow-sm transition-all",
                          !currentUserProfile && "opacity-50",
                          isFollowingAuthor 
                            ? "bg-stone-100 text-stone-600 hover:bg-stone-200" 
                            : "bg-[#C82E31] hover:bg-[#a61b1f] text-white"
                        )}
                      >
                        {isFollowingAuthor ? '已关注' : <><UserPlus className="w-3.5 h-3.5 mr-1.5" /> 关注</>}
                      </Button>
                      <Button variant="outline" onClick={handleMessageAuthor} className="flex-1 rounded-lg h-9 text-xs border-stone-200 hover:bg-stone-50">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> 私信
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Block 2: Divination Panels (Sticky) */}
            {(fullGuaData || (baziData && baziData.pillars)) && (
              <div className="sticky top-20 space-y-4">
                {fullGuaData && (
                  <div className="">
                    <h3 className="font-bold text-stone-800 text-sm mb-4 flex items-center gap-2">
                      <span className="w-1 h-3 bg-[#C82E31] rounded-full" /> 卦象排盘
                    </h3>
                    <GuaPanelDual data={fullGuaData} recordId={post.divination_record?.id} />
                  </div>
                )}
                {baziData && baziData.pillars && (
                  <div className="">
                    <h3 className="font-bold text-stone-800 text-sm mb-4 flex items-center gap-2">
                      <span className="w-1 h-3 bg-[#C82E31] rounded-full" /> 八字排盘
                    </h3>
                    <BaZiPanelDual data={baziData} recordId={post.divination_record?.id} />
                  </div>
                )}
              </div>
            )}

            {/* Block 3: Related Posts */}
            {!isHelpPost && relatedPosts.length > 0 && (
              <div className="mt-6 bg-white rounded-xl border border-stone-200 shadow-sm p-5">
                <h3 className="font-bold text-stone-800 text-sm mb-4 flex items-center gap-2">
                  <span className="w-1 h-3 bg-[#C82E31] rounded-full" /> 相关推荐
                </h3>
                <div className="space-y-4">
                  {relatedPosts.map(p => (
                    <Link key={p.id} href={`/community/${p.id}`} className="block group">
                      <h4 className="text-sm font-medium text-stone-700 group-hover:text-[#C82E31] transition-colors line-clamp-2 mb-1.5">
                        {p.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-stone-400">
                        <span>{p.author?.nickname || '匿名'}</span>
                        <span>{formatTimeStr(p.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>

        </main>

        {/* Mobile Bottom Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-2 flex items-center justify-between safe-area-bottom shadow-lg">
          <div className="flex gap-6 text-stone-500">
            <button onClick={handleLike} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
              <ThumbsUp className={cn("w-5 h-5", post.is_liked && "fill-[#C82E31] text-[#C82E31]")} />
              <span className="text-[0.625rem] font-medium">{post.like_count > 0 ? post.like_count : '点赞'}</span>
            </button>
            <button onClick={handleFavorite} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
              <Bookmark className={cn("w-5 h-5", post.is_favorited && "fill-amber-500 text-amber-500")} />
              <span className="text-[0.625rem] font-medium">{post.is_favorited ? '已收藏' : '收藏'}</span>
            </button>
            <Link href="#comments" className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
              <MessageSquare className="w-5 h-5" />
              <span className="text-[0.625rem] font-medium">{post.comment_count > 0 ? post.comment_count : '评论'}</span>
            </Link>
          </div>
          <Button 
            className="rounded-full bg-[#C82E31] hover:bg-[#a61b1f] text-white px-6 h-9 text-sm shadow-md shadow-red-100"
            onClick={() => {
              const editor = document.querySelector('.ProseMirror') as HTMLElement
              editor?.focus()
              document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            参与讨论
          </Button>
        </div>

        {/* Dialogs... (Copy from original) */}
        <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <DialogContent className="sm:max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle>反馈/结案</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-700">实际结果</div>
                <Textarea
                  value={archiveFeedback}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setArchiveFeedback(e.target.value)}
                  placeholder="发生了什么？结果如何？尽量写清关键节点与时间"
                  className="min-h-28"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-700">准确度</div>
                <div className="flex gap-3 flex-wrap">
                  {([ { id: 'accurate', label: '准' }, { id: 'partial', label: '半准' }, { id: 'inaccurate', label: '不准' }, ] as const).map((o) => (
                    <label key={o.id} className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                      <input type="radio" name="archive-accuracy-modal" value={o.id} checked={archiveAccuracy === o.id} onChange={() => setArchiveAccuracy(o.id)} className="accent-[#C82E31]" />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-700">关键应期（选填）</div>
                <input type="datetime-local" value={archiveOccurredAt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArchiveOccurredAt(e.target.value)} className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setArchiveOpen(false)} disabled={archiveSubmitting}>取消</Button>
                <Button onClick={handleArchive} className="bg-[#C82E31] hover:bg-[#A61B1F] text-white" disabled={archiveSubmitting}>{archiveSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '提交结案'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {confirmDeleteCommentId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDeleteCommentId(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-stone-900 mb-2">确认删除</h3>
              <p className="text-sm text-stone-600 mb-4">确定要删除这条评论吗？此操作无法撤销。</p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setConfirmDeleteCommentId(null)}>取消</Button>
                <Button onClick={handleConfirmDeleteComment} className="bg-red-600 hover:bg-red-700 text-white">确认删除</Button>
              </div>
            </div>
          </div>
        )}
        
        {confirmAdoptCommentId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmAdoptCommentId(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-stone-900 mb-2">确认采纳</h3>
              <p className="text-sm text-stone-600 mb-4">采纳后将向答主发放悬赏（如有）。确定采纳此回复吗？</p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setConfirmAdoptCommentId(null)}>取消</Button>
                <Button onClick={() => handleAdoptComment(confirmAdoptCommentId)} className="bg-amber-600 hover:bg-amber-700 text-white">确认采纳</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
