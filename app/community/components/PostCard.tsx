'use client'

import GuaBlock from '@/lib/components/GuaBlock'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import { HEXAGRAM_FULL_NAMES } from '@/lib/constants/liuyaoConstants'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import { togglePostFavorite, togglePostLike } from '@/lib/services/community'
import { Bookmark, Coins, Flag, Heart, MessageSquare, MoreHorizontal } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ReportDialog from './ReportDialog'

// -----------------------------------------------------------------------------
// 样式定义
// -----------------------------------------------------------------------------
const styles = `
  .paper-card {
    background-color: #ffffff;
    border-bottom: 1px solid #f0f0f0;
    transition: all 0.2s ease-in-out;
  }
  
  .paper-card:hover {
    background-color: #fafaf9; /* stone-50 */
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`

// -----------------------------------------------------------------------------
// 工具函数
// -----------------------------------------------------------------------------

/**
 * 从HTML中提取纯文本摘要（支持 SSR）
 */
export function extractTextFromHTML(html: string, maxLength: number = 100): string {
  if (!html) return ''
  
  // 在客户端使用 DOM API，在服务端使用正则表达式
  if (typeof window !== 'undefined') {
    // 客户端：使用 DOM API
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    let text = tempDiv.textContent || tempDiv.innerText || ''
    text = text.replace(/\s+/g, ' ').trim()
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...'
    }
    return text
  } else {
    // 服务端：使用正则表达式移除 HTML 标签
    let text = html
      .replace(/<[^>]*>/g, '') // 移除所有 HTML 标签
      .replace(/&nbsp;/g, ' ') // 替换 &nbsp;
      .replace(/&amp;/g, '&') // 替换 &amp;
      .replace(/&lt;/g, '<') // 替换 &lt;
      .replace(/&gt;/g, '>') // 替换 &gt;
      .replace(/&quot;/g, '"') // 替换 &quot;
      .replace(/&#39;/g, "'") // 替换 &#39;
      .replace(/\s+/g, ' ') // 移除多余的空白字符
      .trim()
    
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...'
    }
    return text
  }
}

/**
 * 针对求测帖：去掉"关联排盘/问题"等前缀，只保留背景描述
 */
export function extractHelpBackground(html: string, maxLength: number = 100): string {
  let text = extractTextFromHTML(html, 1000)
  text = text
    .replace(/\*\*关联排盘[^*]*\*\*/g, '')
    .replace(/\*\*问题[^*]*\*\*/g, '')
    .replace(/关联排盘[:：][^\n]*/g, '')
    .replace(/问题[:：][^\n]*/g, '')
    .replace(/卦(名|象)[:：][^\n]*/g, '')
  // 过滤掉可能的空行
  text = text
    .split(/\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...'
  }
  return text
}

/**
 * 获取卦象信息 - 与社区页面保持一致
 */
export function getGuaInfo(divinationRecord: {
  original_key?: string
  lines?: string[]
  changing_flags?: boolean[]
} | null | undefined) {
  if (!divinationRecord) return null

  // 优先使用 original_key 构建（与社区页面一致）
  const originalKey = String(divinationRecord.original_key || '').replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
  
  if (originalKey.length !== 6) return null

  // 获取卦名（使用共享的常量）
  const guaName = HEXAGRAM_FULL_NAMES[originalKey] || '未知卦'

  // 构建 lines 数组（从下往上：初爻=0，上爻=5，但显示时需要从上往下）
  // GuaBlock 从上往下显示，所以需要反转
  const lines: boolean[] = []
  for (let i = 0; i < 6; i++) {
    lines.push(originalKey[i] === '1')
  }
  // 反转顺序，从上爻到初爻（GuaBlock 从上往下显示）
  lines.reverse()

  // 获取变爻索引（changing_flags 是从下往上：第0位是初爻，第5位是上爻）
  const changingLines: number[] = []
  const changingFlags = divinationRecord.changing_flags || []
  for (let i = 0; i < changingFlags.length && i < 6; i++) {
    if (changingFlags[i]) {
      changingLines.push(i)
    }
  }

  return {
    guaName,
    lines,
    changingLines,
  }
}

// -----------------------------------------------------------------------------
// 类型定义 (保持不变)
// -----------------------------------------------------------------------------
export interface Post {
  id: string
  type: 'help' | 'theory' | 'debate' | 'chat'
  author: { id?: string; name: string; avatar: string; level: number; isVerified?: boolean }
  title: string
  excerpt: string
  coverImage?: string
  tags: string[]
  bounty?: number
  stats: { likes: number; comments: number; views: number }
  time: string
  hasGua: boolean
  guaName?: string
  lines?: boolean[]
  changingLines?: number[]
  isLiked?: boolean
  isFavorited?: boolean
}

// 帖子类型配置
const POST_TYPE_CONFIG = {
  theory: { label: '论道', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  help: { label: '悬卦', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  debate: { label: '争鸣', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  chat: { label: '茶寮', color: 'bg-green-50 text-green-600 border-green-100' },
}

// -----------------------------------------------------------------------------
// 主组件
// -----------------------------------------------------------------------------

export default function PostCard({ post }: { post: Post }) {
  const { toast } = useToast()
  const router = useRouter()
  const [isLiking, setIsLiking] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [likeCount, setLikeCount] = useState(post.stats.likes)
  const [liked, setLiked] = useState(!!post.isLiked)
  const [favorited, setFavorited] = useState(!!post.isFavorited)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  
  const showMedia = (post.hasGua && post.guaName) || post.coverImage;
  const bountyAmount = typeof post.bounty === 'number' ? post.bounty : Number(post.bounty) || 0;
  const hasBounty = bountyAmount > 0;
  const typeConfig = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.chat;

  useEffect(() => {
    getCurrentUser().then(setCurrentUser)
  }, [])
  
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLiking) return
    try {
      setIsLiking(true)
      const nextLiked = await togglePostLike(post.id)
      setLiked(nextLiked)
      setLikeCount(prev => prev + (nextLiked ? 1 : -1))
    } catch (error) {
      console.error(error)
      toast({ title: '操作失败', description: '无法执行点赞操作', variant: 'destructive' })
    } finally {
      setIsLiking(false)
    }
  }

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isFavoriting) return
    try {
      setIsFavoriting(true)
      const nextFavorited = await togglePostFavorite(post.id)
      setFavorited(nextFavorited)
      toast({ 
        title: nextFavorited ? '已收藏' : '已取消收藏',
        description: nextFavorited ? '帖子已添加到收藏' : '帖子已从收藏中移除'
      })
    } catch (error) {
      console.error(error)
      toast({ title: '操作失败', description: '无法执行收藏操作', variant: 'destructive' })
    } finally {
      setIsFavoriting(false)
    }
  }

  const handleMessageClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!post.author.id) return
    if (!currentUser) {
      toast({ title: '请先登录', variant: 'destructive' })
      router.push(`/login?redirect=${encodeURIComponent(`/messages?userId=${post.author.id}`)}`)
      return
    }
    if (currentUser.id === post.author.id) {
      toast({ title: '不能给自己发私信', variant: 'destructive' })
      return
    }
    router.push(`/messages?userId=${post.author.id}`)
  }
  
  return (
    <>
    <style jsx global>{styles}</style>
    
    <div className="paper-card group relative py-6 px-5 first:rounded-t-xl last:rounded-b-xl last:border-b-0">
      
      {/* 主要内容区域 */}
      <div className="flex gap-6 items-start">
        
        {/* 左侧：文本内容 (Flex-1) */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          
          {/* 1. 标题 (核心焦点) */}
          <Link href={`/community/${post.id}`} className="block group/title">
            <h3 className="text-[19px] leading-snug font-bold text-[#1c1c1c] group-hover/title:text-[#C82E31] transition-colors font-serif tracking-tight mb-1">
              {/* 帖子类型标签 */}
              <span className={`inline-flex items-center align-middle mr-2 px-1.5 py-0.5 rounded text-xs font-normal border ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
              {/* 悬赏标签 (仅当 > 0 时显示) */}
              {hasBounty && (
                <span className="inline-flex items-center align-middle mr-2 px-1.5 py-0.5 rounded text-xs font-normal bg-amber-50 text-amber-700 border border-amber-200">
                  <Coins className="w-3 h-3 mr-0.5 fill-amber-500 text-amber-600" />
                  {bountyAmount}
                </span>
              )}
              {post.title}
            </h3>
          </Link>
          
          {/* 2. 摘要 (吸引阅读) */}
          <Link href={`/community/${post.id}`} className="block cursor-pointer">
            <p className={`text-[15px] text-[#4a4a4a] leading-relaxed hover:text-[#2c2c2c] transition-colors ${showMedia ? 'line-clamp-3' : 'line-clamp-2'}`}>
              {post.excerpt}
            </p>
          </Link>
          
          {/* 3. 底部信息栏 (作者 + 数据) */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4 text-xs text-stone-400">
              {/* 作者信息 (简化) */}
              {post.author.id ? (
                <Link href={`/u/${post.author.id}`} className="flex items-center gap-2 group/author cursor-pointer">
                  <Avatar className="w-5 h-5 border border-stone-100 group-hover/author:ring-2 group-hover/author:ring-[#C82E31]/20 transition-all">
                    {post.author.avatar && <AvatarImage src={post.author.avatar} />}
                    <AvatarFallback className="text-[9px] bg-stone-100">{post.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="group-hover/author:text-[#C82E31] transition-colors">{post.author.name}</span>
                  <span className="text-stone-300">•</span>
                  <span>{post.time}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5 border border-stone-100">
                    {post.author.avatar && <AvatarImage src={post.author.avatar} />}
                    <AvatarFallback className="text-[9px] bg-stone-100">{post.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <span>{post.author.name}</span>
                  <span className="text-stone-300">•</span>
                  <span>{post.time}</span>
                </div>
              )}
              
              {/* 标签 */}
              {post.tags.length > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  {post.tags.map((tag, i) => (
                    <span key={i} className="bg-stone-50 px-1.5 py-0.5 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 操作按钮 (Hover 时高亮) */}
            <div className="flex items-center gap-4">
               <Button 
                 variant="ghost"
                 size="sm"
                 onClick={handleLike}
                 disabled={isLiking}
                 className={`h-6 px-1.5 text-xs gap-1 hover:bg-transparent ${liked ? 'text-[#C82E31]' : 'text-stone-400 hover:text-stone-600'}`}
               >
                 <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} /> 
                 {likeCount > 0 ? likeCount : '赞'}
               </Button>
               
               <Button 
                 variant="ghost"
                 size="sm"
                 onClick={handleFavorite}
                 disabled={isFavoriting}
                 className={`h-6 px-1.5 text-xs gap-1 hover:bg-transparent ${favorited ? 'text-amber-600' : 'text-stone-400 hover:text-stone-600'}`}
               >
                 <Bookmark className={`w-3.5 h-3.5 ${favorited ? 'fill-current' : ''}`} /> 
                 收藏
               </Button>
               
               <Link href={`/community/${post.id}#comments`}>
                 <Button 
                   variant="ghost"
                   size="sm"
                   className="h-6 px-1.5 text-xs gap-1 text-stone-400 hover:text-stone-600 hover:bg-transparent"
                 >
                   <MessageSquare className="w-3.5 h-3.5" /> 
                   {post.stats.comments > 0 ? post.stats.comments : '评论'}
                 </Button>
               </Link>

               {/* 私信按钮 - 仅当有作者ID且不是自己时显示 */}
               {post.author.id && currentUser && currentUser.id !== post.author.id && (
                 <Button 
                   variant="ghost"
                   size="sm"
                   onClick={handleMessageClick}
                   className="h-6 px-1.5 text-xs gap-1 text-stone-400 hover:text-stone-600 hover:bg-transparent"
                   title="发送私信"
                 >
                   <MessageSquare className="w-3.5 h-3.5" />
                 </Button>
               )}

               <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-300 hover:text-stone-600">
                    <MoreHorizontal className="w-4 h-4" />
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

        {/* 右侧：媒体区域 (保持不变，视觉平衡) */}
        {showMedia && (
          <div className="shrink-0 hidden sm:block pt-1">
            {post.hasGua && post.guaName ? (
              <div className="scale-95 origin-top-right">
                <GuaBlock 
                  name={post.guaName} 
                  lines={post.lines} 
                  changingLines={post.changingLines}
                />
              </div>
            ) : post.coverImage ? (
              <Link href={`/community/${post.id}`} className="block media-container rounded-lg overflow-hidden border border-stone-100 bg-stone-50 relative w-[140px] h-[105px]">
                <Image 
                  src={post.coverImage} 
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="140px"
                />
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
    </>
  )
}