'use client'

import {
  ArrowLeft,
  Bookmark,
  CheckCircle,
  Coins,
  FileText,
  Flag,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Share2,
  ThumbsUp,
  UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import BaZiPanelDual from '@/app/community/components/BaZiPanelDual'
import GuaPanelDual from '@/app/community/components/GuaPanelDual'
import { getBaziInfo } from '@/app/community/components/PostCard'
import PostDetailSkeleton from '@/app/community/components/PostDetailSkeleton'
import ReportDialog from '@/app/community/components/ReportDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import { Textarea } from '@/lib/components/ui/textarea'
import { useToast } from '@/lib/hooks/use-toast'
import { getSession } from '@/lib/services/auth'
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
// 样式定义
// -----------------------------------------------------------------------------
const styles = `
  .paper-texture {
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  .font-serif-sc {
    font-family: "Source Han Serif CN", "source-han-serif-sc", "Source Han Serif", "Noto Serif SC", "Songti SC", "STSong", serif;
  }
  .prose h1, .prose h2, .prose h3 {
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.75rem;
  }
  .prose h1 {
    font-size: 2rem;
  }
  .prose h2 {
    font-size: 1.5rem;
  }
  .prose h3 {
    font-size: 1.25rem;
  }
  .prose p {
    margin: 0.5rem 0;
  }
  .prose ul, .prose ol {
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }
  .prose strong {
    font-weight: bold;
  }
  .prose em {
    font-style: italic;
  }
  .prose u {
    text-decoration: underline;
  }
  .prose s {
    text-decoration: line-through;
  }
  .prose code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: monospace;
  }
  .prose a {
    color: #C82E31;
    text-decoration: underline;
  }
  .prose a:hover {
    color: #a61b1f;
  }
  .prose img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 0.5rem 0;
  }
  .prose blockquote {
    border-left: 3px solid #C82E31;
    padding-left: 1rem;
    margin: 0.5rem 0;
    font-style: italic;
    color: #57534e;
  }
  .prose p[style*="text-align: center"] {
    text-align: center;
  }
  .prose p[style*="text-align: right"] {
    text-align: right;
  }
`

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

  // Effects & Data Loading (保持原有逻辑不变)
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
            commentElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
            setTimeout(() => {
              commentElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
            }, 2000)
          }
        }, 300)
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

  // Interactions
  const handleLike = async () => {
    if (!post) return

    if (!currentUserProfile) {
      toast({ title: '请先登录', description: '登录后即可点赞', variant: 'default' })
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    const prevPost = { ...post }
    const newIsLiked = !post.is_liked
    const newLikeCount = newIsLiked ? post.like_count + 1 : Math.max(0, post.like_count - 1)
    
    // Optimistic update
    setPost({ ...post, is_liked: newIsLiked, like_count: newLikeCount })
    setIsLiking(true)

    try {
      const isLiked = await togglePostLike(postId)
      
      // If server state differs from optimistic state, sync with server
      if (isLiked !== newIsLiked) {
        setPost(prev => prev ? { 
          ...prev, 
          is_liked: isLiked, 
          like_count: isLiked ? prev.like_count + 1 : Math.max(0, prev.like_count - 1) 
        } : null)
      }
    } catch (error) {
      // Revert on error
      setPost(prevPost)
      toast({ title: '操作失败', description: '点赞失败，请重试', variant: 'destructive' })
    } finally {
      setIsLiking(false)
    }
  }

  const handleFavorite = async () => {
    if (!post) return

    if (!currentUserProfile) {
      toast({ title: '请先登录', description: '登录后即可收藏', variant: 'default' })
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    const prevPost = { ...post }
    const newIsFavorited = !post.is_favorited
    
    // Optimistic update
    setPost({ ...post, is_favorited: newIsFavorited })
    setIsFavoriting(true)

    try {
      const isFavorited = await togglePostFavorite(postId)
      
      if (isFavorited !== newIsFavorited) {
        setPost(prev => prev ? { ...prev, is_favorited: isFavorited } : null)
      }
      
      toast({ 
        title: isFavorited ? '已收藏' : '已取消收藏',
      })
    } catch (error) {
      // Revert on error
      setPost(prevPost)
      toast({ title: '操作失败', description: '收藏失败，请重试', variant: 'destructive' })
    } finally {
      setIsFavoriting(false)
    }
  }

  const handleCommentLike = async (commentId: string) => {
    if (!currentUserProfile) {
      toast({ title: '请先登录', description: '登录后即可点赞', variant: 'default' })
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    const comment = comments.find(c => c.id === commentId)
    if (!comment) return

    const prevComments = [...comments]
    const newIsLiked = !comment.is_liked
    const newLikeCount = newIsLiked ? comment.like_count + 1 : Math.max(0, comment.like_count - 1)

    // Optimistic update
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_liked: newIsLiked, like_count: newLikeCount } : c))

    try {
      const isLiked = await toggleCommentLike(commentId)
      
      if (isLiked !== newIsLiked) {
        setComments(prev => prev.map(c => c.id === commentId ? { 
          ...c, 
          is_liked: isLiked, 
          like_count: isLiked ? c.like_count + 1 : Math.max(0, c.like_count - 1) 
        } : c))
      }
    } catch (error) {
      setComments(prevComments)
      toast({ title: '操作失败', description: '点赞失败，请重试', variant: 'destructive' })
    }
  }

  // 采纳/删除评论逻辑 (保持不变)
  const handleAdoptCommentClick = (commentId: string) => setConfirmAdoptCommentId(commentId)
  const handleAdoptComment = async (commentId: string) => {
    if (!post) return
    setConfirmAdoptCommentId(null)
    try {
      setAdoptingCommentId(commentId)
      const result = await adoptComment(commentId, postId)
      if (result.success) {
        await loadComments()
        if (post.bounty && post.bounty > 0) await loadPost()
        toast({ title: '采纳成功', description: result.message })
      } else {
        toast({ title: '采纳失败', description: result.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '采纳失败', description: '操作失败，请重试', variant: 'destructive' })
    } finally {
      setAdoptingCommentId(null)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return
    try {
      setDeletingCommentId(commentId)
      await deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      if (post) setPost({ ...post, comment_count: Math.max(0, post.comment_count - 1) })
      toast({ title: '删除成功' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    } finally {
      setDeletingCommentId(null)
    }
  }

  const handleConfirmDeleteComment = async () => {
    if (!confirmDeleteCommentId) return
    await handleDeleteComment(confirmDeleteCommentId)
    setConfirmDeleteCommentId(null)
  }

  const isPostAuthor = post && currentUserProfile && post.user_id === currentUserProfile.id

  const handleSubmitComment = async () => {
    if (!replyText.trim()) return
    try {
      setIsSubmitting(true)
      await createComment({ post_id: postId, content: replyText.trim(), parent_id: replyingTo?.id || null })
      toast({ title: '评论成功' })
      setReplyText('')
      setReplyingTo(null)
      await loadComments()
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      toast({ title: '评论失败', description: errorMessage, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMessageAuthor = () => {
    if (!post?.author?.id) return
    if (!currentUserProfile) {
      router.push(`/login?redirect=${encodeURIComponent(`/messages?userId=${post.author.id}`)}`)
      return
    }
    if (currentUserProfile.id === post.author.id) {
      toast({ title: '不能给自己发私信', variant: 'destructive' })
      return
    }
    router.push(`/messages?userId=${post.author.id}`)
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/community/${postId}` : `/community/${postId}`
    const title = post?.title || '社区帖子'
    try {
      if (typeof window !== 'undefined' && 'share' in window.navigator) {
        await window.navigator.share({ title, url })
        return
      }
      if (typeof window !== 'undefined' && window.navigator.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(url)
        toast({ title: '链接已复制' })
        return
      }
      toast({ title: '无法分享', description: url })
    } catch (error) {
      toast({ title: '分享失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    }
  }

  const canArchive = !!post && !!currentUserProfile && (post.user_id === currentUserProfile.id || currentUserProfile.role === 'admin')

  const handleArchive = async () => {
    if (!post) return
    if (!archiveFeedback.trim()) {
      toast({ title: '请填写实际结果', variant: 'destructive' })
      return
    }

    try {
      setArchiveSubmitting(true)
      const session = await getSession()
      if (!session?.access_token) {
        toast({ title: '请先登录', variant: 'destructive' })
        return
      }

      const res = await fetch('/api/library/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          post_id: post.id,
          feedback: archiveFeedback.trim(),
          accuracy: archiveAccuracy,
          occurred_at: archiveOccurredAt ? new Date(archiveOccurredAt).toISOString() : null,
        }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || '结案失败')

      setArchiveOpen(false)
      setCaseExists(true)
      setPost((prev) => (prev ? { ...prev, status: 'archived' } : prev))
      toast({ title: '结案成功', description: '已收录进案例库' })
    } catch (e) {
      toast({ title: '结案失败', description: e instanceof Error ? e.message : '未知错误', variant: 'destructive' })
    } finally {
      setArchiveSubmitting(false)
    }
  }

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

  // 过滤掉关联排盘和卦项信息
  const filterBackgroundContent = (html: string): string => {
    if (!html) return html
    
    let filtered = html

    // 1. 移除包含关键词的 strong/b/em 标签 (e.g. <strong>关联排盘：xxx</strong>)
    // 使用 [\s\S] 匹配所有字符包括换行
    filtered = filtered.replace(/<(strong|b|em)[^>]*>[\s\S]*?(关联排盘|问题|卦名|卦象)[:：][\s\S]*?<\/\1>/gi, '')

    // 2. 移除 Markdown 风格的加粗 (e.g. **关联排盘：xxx**)
    filtered = filtered.replace(/\*\*(关联排盘|问题|卦名|卦象)[:：][\s\S]*?\*\*/gi, '')

    // 3. 清理空标签和多余空白
    filtered = filtered
      // 移除空段落 (包含空白字符或&nbsp;)
      .replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
      .replace(/<div[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/div>/gi, '')
      // 移除连续的换行
      .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
      .trim()
    
    return filtered
  }

  // 分割富文本内容为背景说明和卦理推演两部分
  const splitHtmlContent = (html: string) => {
    const marker = '<h2>卦理推演</h2>'
    const idx = html.indexOf(marker)
    if (idx < 0) {
      const backgroundHtml = html.trim()
      return { backgroundHtml, analysisHtml: '' }
    }
    const backgroundHtml = html.slice(0, idx).trim()
    const analysisHtml = html.slice(idx + marker.length).trim()
    return { backgroundHtml, analysisHtml }
  }

  // 处理富文本内容，分割并清理
  const safeHtml = useMemo(() => {
    const raw = post?.content_html || post?.content || ''
    if (!raw) return { backgroundHtml: '', analysisHtml: '' }
    const sanitized = DOMPurify.sanitize(raw)
    const split = splitHtmlContent(sanitized)
    // 过滤背景说明中的关联排盘和卦项信息
    const filteredBackground = filterBackgroundContent(split.backgroundHtml)
    return { backgroundHtml: filteredBackground, analysisHtml: split.analysisHtml }
  }, [post?.content_html, post?.content])

  const isHelpPost = post?.type === 'help' && post?.divination_record
  
  // 判断是否为八字排盘
  const isBaziRecord = useMemo(() => {
    if (!post?.divination_record) return false
    const record = post.divination_record
    return record.method === 1 || record.original_key === 'bazi'
  }, [post?.divination_record])
  
  // 提取八字数据
  const baziData = useMemo(() => {
    if (!post?.divination_record) return null
    return getBaziInfo(post.divination_record)
  }, [post?.divination_record])
  
  // 提取六爻卦象数据（仅当不是八字时）
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
        
        {/* Header - 响应式 Padding */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 h-14 flex items-center justify-between px-4 lg:px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/community" className="p-1.5 hover:bg-stone-100 rounded-full text-stone-500 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/community" className="text-stone-500 hover:text-stone-900">社区</Link>
              <span className="text-stone-300">/</span>
              <span className="text-stone-500">{isHelpPost ? '悬卦求助' : '论道交流'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-stone-500"><Flag className="h-4 w-4" /></Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-32 p-1 bg-white">
                <ReportDialog
                  targetId={post.id}
                  targetType="post"
                  postTitle={post.title}
                  trigger={
                    <Button variant="ghost" className="w-full h-8 text-xs justify-start px-2 text-stone-600 hover:text-[#C82E31] hover:bg-red-50" onClick={(e) => e.stopPropagation()}>
                      <Flag className="w-3.5 h-3.5 mr-1.5" /> 举报
                    </Button>
                  }
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="text-stone-500" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
          </div>
        </header>

        {/* Main Content - 响应式布局 */}
        <main className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-6 py-4 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          <div className="flex-1 min-w-0 space-y-6 w-full">
             
            {/* Post Card */}
            <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-stone-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-stone-200 via-[#C82E31]/40 to-stone-200"></div>
              {isHelpPost && (post.bounty || 0) > 0 && (
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-amber-500 to-amber-600 z-10" />
              )}
              
              {/* Padding 响应式 */}
              <div className="p-4 sm:p-6 lg:p-8 relative">
                
                {/* 移动端悬赏显示在标题上方，大屏显示在右上角 */}
                {(post.bounty || 0) > 0 && (
                  <>
                    <div className="lg:hidden mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      <Coins className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
                      <span>悬赏 {post.bounty}</span>
                    </div>
                    <div className="hidden lg:flex absolute right-6 top-6 items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                      <Coins className="h-4 w-4 fill-amber-500 text-amber-600" />
                      <span>悬赏 {post.bounty}</span>
                    </div>
                  </>
                )}

                {/* Author Info */}
                {post.author?.id && (
                  <Link 
                    href={`/u/${post.author.id}`} 
                    className="flex items-center gap-3 mb-6 group hover:bg-stone-50/50 p-2 -m-2 rounded-lg transition-colors lg:hidden"
                  >
                    <Avatar className="w-10 h-10 border border-stone-200 group-hover:ring-2 group-hover:ring-[#C82E31]/20 transition-all">
                      <AvatarImage src={post.author.avatar_url || ''} />
                      <AvatarFallback>{post.author.nickname?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 group-hover:text-[#C82E31] transition-colors">{post.author.nickname}</span>
                        <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">楼主</span>
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">{formatTimeStr(post.created_at)} · {post.view_count} 浏览</div>
                    </div>
                  </Link>
                )}

                {/* Content Area */}
                {isHelpPost && divinationInfo ? (
                  <>
                    <div className="mb-6">
                      <span className="inline-block text-[10px] font-bold text-[#C82E31] bg-[#C82E31]/10 px-2 py-0.5 rounded mb-2">所占事项</span>
                      {/* 移动端字体稍微改小 */}
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif-sc font-bold text-stone-900 leading-tight">
                        {divinationInfo.question || '未填写事项'}
                      </h1>
                    </div>

                    <div className="mb-14">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-[3px] h-3.5 bg-stone-300"></div>
                        <h3 className="text-xs sm:text-sm font-bold text-stone-400 uppercase tracking-widest">BACKGROUND / 背景</h3>
                      </div>
                      {safeHtml.backgroundHtml ? (
                        <p className="text-base sm:text-lg text-stone-700 leading-relaxed sm:leading-loose text-justify font-serif-sc indent-8" dangerouslySetInnerHTML={{ __html: safeHtml.backgroundHtml }} />
                      ) : (
                        <div className="text-stone-500 text-sm sm:text-[15px] italic">暂无详细背景描述...</div>
                      )}
                    </div>

                    {/* 卦理推演部分 */}
                    {safeHtml.analysisHtml && (
                      <div className="mb-14">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-[3px] h-3.5 bg-[#C82E31]"></div>
                          <h3 className="text-xs font-bold text-[#C82E31] uppercase tracking-[0.15em] font-sans">ANALYSIS / 卦理推演</h3>
                        </div>
                        <div className="prose prose-stone max-w-none text-stone-800 text-base sm:text-[17px] leading-[1.8] font-serif-sc text-justify" dangerouslySetInnerHTML={{ __html: safeHtml.analysisHtml }} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mb-4" style={{ fontFamily: "'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif" }}>{post.title}</h1>
                    <div className="text-xs text-stone-400 mb-4">{formatTimeStr(post.created_at)} · {post.view_count} 浏览</div>
                    <div className="prose prose-stone max-w-none text-stone-700 text-sm sm:text-base font-serif-sc" dangerouslySetInnerHTML={{ __html: post.content_html || post.content }} />
                  </div>
                )}

                {/* 移动端：排盘信息展示在正文下方 (避免用户看不到) */}
                {isHelpPost && fullGuaData && (
                  <div className="mt-8 lg:hidden bg-stone-50/50 rounded-lg border border-stone-100 p-2 sm:p-4">
                    <h2 className="text-sm font-bold text-stone-800 mb-3 px-2 flex items-center gap-2">
                      <span className="w-1 h-3 bg-[#C82E31] rounded-full"></span> 卦象排盘
                    </h2>
                    <GuaPanelDual data={fullGuaData} recordId={post.divination_record?.id} />
                  </div>
                )}
                
                {/* 移动端：八字排盘信息展示在正文下方 */}
                {isHelpPost && baziData && baziData.pillars && (
                  <div className="mt-8 lg:hidden bg-stone-50/50 rounded-lg border border-stone-100 p-2 sm:p-4">
                    <BaZiPanelDual data={baziData} recordId={post.divination_record?.id} />
                  </div>
                )}

                {/* 标签 */}
                {post.tags && post.tags.length > 0 && (
                  <div className="pt-16 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded-full bg-stone-50 text-stone-600 border border-stone-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="hidden lg:flex items-center justify-between pt-6 mt-6 border-t border-stone-100">
                  <div className="flex gap-2 sm:gap-4">
                    <Button 
                      variant="ghost" size="sm" onClick={handleLike} disabled={isLiking}
                      className={`gap-1.5 h-8 sm:h-9 text-xs sm:text-sm ${post.is_liked ? 'text-[#C82E31]' : 'text-stone-500 hover:text-[#C82E31]'}`}
                    >
                      <ThumbsUp className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${post.is_liked ? 'fill-current' : ''}`} /> 
                      {post.like_count > 0 ? post.like_count : '赞'}
                    </Button>
                    <Button 
                      variant="ghost" size="sm" onClick={handleFavorite} disabled={isFavoriting}
                      className={`gap-1.5 h-8 sm:h-9 text-xs sm:text-sm ${post.is_favorited ? 'text-amber-600' : 'text-stone-500 hover:text-amber-600'}`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${post.is_favorited ? 'fill-current' : ''}`} /> 收藏
                    </Button>
                    <Button 
                      variant="ghost" size="sm" onClick={() => document.querySelector('textarea')?.focus()}
                      className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm text-stone-500 hover:text-stone-900"
                    >
                      <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 回复
                    </Button>
                    {canArchive && post?.type === 'help' && (
                      caseExists ? (
                        <Button variant="ghost" size="sm" className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm text-stone-500 hover:text-stone-900" asChild>
                          <Link href={`/cases/${post.id}`}>
                            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 查看案例
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm text-stone-500 hover:text-stone-900"
                          onClick={() => setArchiveOpen(true)}
                          disabled={archiveSubmitting}
                        >
                          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 反馈/结案
                        </Button>
                      )
                    )}
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-stone-400 hover:text-stone-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-32 p-1 bg-white">
                      <ReportDialog
                        targetId={post.id}
                        targetType="post"
                        postTitle={post.title}
                        trigger={
                          <Button
                            variant="ghost"
                            className="w-full h-8 text-xs justify-start px-2 text-stone-600 hover:text-[#C82E31] hover:bg-red-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Flag className="w-3.5 h-3.5 mr-1.5" />
                            举报违规
                          </Button>
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-stone-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-bold text-stone-800 text-base sm:text-lg">全部回复 ({post.comment_count})</h3>
                 <div className="flex text-xs bg-stone-50 rounded p-1">
                    <Button variant="secondary" size="sm" className="px-2 sm:px-3 py-1 h-7 text-xs rounded bg-white shadow-sm text-stone-800 font-medium">默认</Button>
                    <Button variant="ghost" size="sm" className="px-2 sm:px-3 py-1 h-7 text-xs text-stone-500 hover:text-stone-800">最新</Button>
                 </div>
              </div>

              <div className="space-y-6">
                {comments.length === 0 ? (
                  <div className="text-center py-10 text-stone-400 text-sm bg-stone-50/50 rounded-lg border border-dashed border-stone-200">
                    暂无评论，快来发表第一条评论吧
                  </div>
                ) : (
                  comments.map(comment => {
                    const isAdopted = !!comment.is_adopted;
                    return (
                      <div 
                        key={comment.id} 
                        className="group"
                        ref={(el) => {
                          if (el) commentRefs.current.set(comment.id, el)
                          else commentRefs.current.delete(comment.id)
                        }}
                      >
                      <div className="flex gap-3">
                        <Link href={comment.author?.id ? `/u/${comment.author.id}` : '#'} className="mt-1 shrink-0">
                          <Avatar className="w-8 h-8 border border-stone-200">
                            <AvatarImage src={comment.author?.avatar_url || ''} />
                            <AvatarFallback>{comment.author?.nickname?.[0]}</AvatarFallback>
                          </Avatar>
                        </Link>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-stone-900 text-sm truncate max-w-[120px] sm:max-w-none">
                                  {comment.author?.nickname}
                                </span>
                                {isAdopted && (
                                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                                    <CheckCircle className="h-3 w-3 fill-amber-500 text-amber-600" />
                                    已采纳
                                  </span>
                                )}
                                {comment.reply_to?.author?.id && (
                                  <span className="text-xs text-stone-400 truncate max-w-[150px]">
                                    回复 <span className="text-[#C82E31]">@{comment.reply_to.author?.nickname}</span>
                                  </span>
                                )}
                             </div>
                             <span className="text-xs text-stone-400 shrink-0">{formatTimeStr(comment.created_at)}</span>
                          </div>
                          
                          <p className="text-stone-700 text-sm leading-relaxed mb-2 break-words">{comment.content}</p>
                          
                          {/* 移动端操作栏常驻，桌面端 Hover 显示 */}
                          <div className="flex items-center gap-3 sm:gap-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                             <Button
                               variant="ghost" size="sm" onClick={() => setReplyingTo(comment)}
                               className="text-xs text-stone-400 hover:text-stone-800 font-medium px-0 h-auto"
                             >
                               回复
                             </Button>
                             <Button
                               variant="ghost" size="sm" onClick={() => handleCommentLike(comment.id)}
                               className={`flex items-center gap-1 text-xs px-0 h-auto ${comment.is_liked ? 'text-[#C82E31]' : 'text-stone-400 hover:text-[#C82E31]'}`}
                             >
                                <ThumbsUp className="h-3 w-3" /> {comment.like_count > 0 ? comment.like_count : ''}
                             </Button>
                             
                             {/* 更多操作 */}
                             {isPostAuthor && !isAdopted && (
                               <Button 
                                 variant="ghost" size="sm" onClick={() => handleAdoptCommentClick(comment.id)}
                                 className="flex items-center gap-1 text-xs text-stone-400 hover:text-amber-600 font-medium px-0 h-auto"
                               >
                                 采纳
                               </Button>
                             )}
                             {currentUserProfile?.id === comment.author?.id && (
                               <Button
                                 variant="ghost" size="sm" onClick={() => setConfirmDeleteCommentId(comment.id)}
                                 className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-600 font-medium px-0 h-auto"
                               >
                                 删除
                               </Button>
                             )}
                             {/* ... 其他按钮逻辑同上，添加 h-auto 和 px-0 ... */}
                          </div>
                        </div>
                      </div>
                      <div className="my-4 h-px bg-stone-50 group-last:hidden"></div>
                    </div>
                  )
                  })
                )}
              </div>

              {/* Comment Input */}
              <div className="mt-8 pt-6 border-t border-stone-100">
                <div className="flex gap-3 sm:gap-4">
                  <Avatar className="w-8 h-8 hidden sm:block">
                     <AvatarImage src={currentUserProfile?.avatar_url || ''} />
                     <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    {replyingTo && (
                       <div className="absolute -top-8 left-0 text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-t flex items-center gap-2">
                          回复 @{replyingTo.author?.nickname} 
                          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="h-4 w-4 ml-1 hover:text-red-500">×</Button>
                       </div>
                    )}
                    <textarea 
                      value={replyText} onChange={e => setReplyText(e.target.value)}
                      className="w-full bg-stone-50 rounded-lg border border-stone-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#C82E31] focus:bg-white transition-all h-24 resize-none"
                      placeholder="发表你的真知灼见..."
                    />
                    <div className="flex justify-end items-center mt-2">
                       <Button onClick={handleSubmitComment} disabled={isSubmitting || !replyText.trim()} className="bg-[#C82E31] hover:bg-[#a61b1f] text-white rounded-full px-6 h-8 text-xs">
                          发送
                       </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Posts (Mobile) */}
            {post?.type !== 'help' && relatedPosts.length > 0 && (
              <div className="lg:hidden bg-white sm:rounded-xl shadow-sm border-y sm:border border-stone-100 p-4 sm:p-6">
                <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#C82E31] rounded-full"></span>
                  相关文章
                </h3>
                <div className="space-y-4 divide-y divide-stone-50">
                   {relatedPosts.map((post, i) => (
                    <Link key={post.id} href={`/community/${post.id}`} className={`block group ${i !== 0 ? 'pt-4' : ''}`}>
                      <h4 className="text-sm font-medium text-stone-800 group-hover:text-[#C82E31] transition-colors line-clamp-2 mb-1.5">
                        {post.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-stone-400">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="w-4 h-4 border border-stone-100">
                            <AvatarImage src={post.author?.avatar_url || ''} />
                            <AvatarFallback>{post.author?.nickname?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <span>{post.author?.nickname || '匿名'}</span>
                        </div>
                        <span>{formatTimeStr(post.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar (Sticky, Hidden on Mobile) */}
          <aside className="hidden lg:block w-[340px] shrink-0 space-y-6 lg:sticky lg:top-20 h-fit">
            
            {/* Author Card */}
            {post.author && post.author.id && (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
                <Link href={`/u/${post.author.id}`} className="block group">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-[#C82E31]/20 transition-all">
                      <AvatarImage src={post.author.avatar_url || ''} />
                      <AvatarFallback>{post.author.nickname?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-stone-800 group-hover:text-[#C82E31] transition-colors">{post.author.nickname}</h3>
                        {authorStats && <span className="text-[10px] bg-stone-800 text-white px-1.5 py-0.5 rounded font-mono">Lv.{authorStats.level}</span>}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">每日一卦，精进不止。</p>
                    </div>
                  </div>
                </Link>
                {authorStats && (
                  <div className="grid grid-cols-3 gap-2 py-3 bg-stone-50 rounded-lg text-center mb-4">
                    <div>
                      <div className="text-lg font-bold text-stone-800">{authorStats.posts}</div>
                      <div className="text-[10px] text-stone-400 uppercase">帖子</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-stone-800">{authorStats.collections}</div>
                      <div className="text-[10px] text-stone-400 uppercase">收藏</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-amber-600">{authorStats.coins}</div>
                      <div className="text-[10px] text-stone-400 uppercase">易币</div>
                    </div>
                  </div>
                )}
                {/* 关注和私信按钮 */}
                {currentUserProfile && currentUserProfile.id !== post.author.id && (
                  <div className="flex gap-2">
                    <Button
                      className={`flex-1 text-xs h-8 shadow-sm transition-all ${
                        isFollowingAuthor ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'bg-[#C0392B] text-white hover:bg-[#A93226]'
                      }`}
                      onClick={async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (isFollowingLoading || !post.author?.id) return
                        try {
                          setIsFollowingLoading(true)
                          const status = await toggleFollowUser(post.author.id)
                          setIsFollowingAuthor(status)
                          toast({ title: status ? '已关注' : '已取消关注' })
                        } finally { setIsFollowingLoading(false) }
                      }}
                      disabled={isFollowingLoading}
                    >
                      {isFollowingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isFollowingAuthor ? '已关注' : <><UserPlus size={12} className="mr-1" /> 关注</>}
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleMessageAuthor}>
                      <MessageSquare size={12} className="mr-1" /> 私信
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Only: Gua Panel */}
            {fullGuaData && (
              <div className="lg:sticky lg:top-20 lg:z-10">
                <GuaPanelDual data={fullGuaData} recordId={post.divination_record?.id} />
              </div>
            )}

            {/* Desktop Only: BaZi Panel */}
            {baziData && baziData.pillars && (
              <div className="lg:sticky lg:top-20 lg:z-10">
                <BaZiPanelDual data={baziData} recordId={post.divination_record?.id} />
              </div>
            )}

            {/* Related Posts (Desktop) */}
            {relatedPosts.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
                <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#C82E31] rounded-full"></span>
                  相关文章
                </h3>
                <div className="space-y-4">
                  {relatedPosts.map(post => (
                    <Link key={post.id} href={`/community/${post.id}`} className="block group">
                      <h4 className="text-sm font-medium text-stone-800 group-hover:text-[#C82E31] transition-colors line-clamp-2 mb-1.5">
                        {post.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-stone-400">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="w-4 h-4 border border-stone-100">
                            <AvatarImage src={post.author?.avatar_url || ''} />
                            <AvatarFallback>{post.author?.nickname?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <span>{post.author?.nickname || '匿名'}</span>
                        </div>
                        <span>{formatTimeStr(post.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
          </aside>
        </main>

        {/* Mobile Bottom Action Bar */}
        <div 
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 px-6 pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-between"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))', height: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-8">
            <button onClick={handleLike} className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform">
              <ThumbsUp className={`h-5 w-5 ${post.is_liked ? 'fill-[#C82E31] text-[#C82E31]' : ''}`} />
              <span className="text-[10px] font-medium">{post.like_count > 0 ? post.like_count : '点赞'}</span>
            </button>
            <button onClick={handleFavorite} className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform">
              <Bookmark className={`h-5 w-5 ${post.is_favorited ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span className="text-[10px] font-medium">{post.is_favorited ? '已收藏' : '收藏'}</span>
            </button>
            <button 
              onClick={handleShare}
              className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform"
            >
              <Share2 className="h-5 w-5" />
              <span className="text-[10px] font-medium">分享</span>
            </button>
            {canArchive && (
              caseExists ? (
                <Link href={`/cases/${post.id}`} className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform">
                  <FileText className="h-5 w-5" />
                  <span className="text-[10px] font-medium">案例</span>
                </Link>
              ) : (
                <button
                  onClick={() => setArchiveOpen(true)}
                  className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform"
                  disabled={archiveSubmitting}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-[10px] font-medium">结案</span>
                </button>
              )
            )}
          </div>
          <Button 
            className="rounded-full bg-[#C82E31] hover:bg-[#a61b1f] text-white px-8 shadow-sm shadow-red-100 active:scale-95 transition-transform h-9"
            onClick={() => {
              const textarea = document.querySelector('textarea');
              if (textarea) {
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                textarea.focus();
              }
            }}
          >
            写评论
          </Button>
        </div>
      </div>

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
                {(
                  [
                    { id: 'accurate', label: '准' },
                    { id: 'partial', label: '半准' },
                    { id: 'inaccurate', label: '不准' },
                  ] as const
                ).map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                    <input
                      type="radio"
                      name="archive-accuracy-modal"
                      value={o.id}
                      checked={archiveAccuracy === o.id}
                      onChange={() => setArchiveAccuracy(o.id)}
                      className="accent-[#C82E31]"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-stone-700">关键应期（选填）</div>
              <input
                type="datetime-local"
                value={archiveOccurredAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArchiveOccurredAt(e.target.value)}
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setArchiveOpen(false)} disabled={archiveSubmitting}>
                取消
              </Button>
              <Button onClick={handleArchive} className="bg-[#C82E31] hover:bg-[#A61B1F] text-white" disabled={archiveSubmitting}>
                {archiveSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '提交结案'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs (Delete/Adopt) - 保持不变，省略以节省空间，直接复用原逻辑 */}
      {/* ... Confirm Dialogs ... */}
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
    </>
  )
}
