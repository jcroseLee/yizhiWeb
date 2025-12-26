'use client'

import GuaBlock from '@/lib/components/GuaBlock'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import { HEXAGRAM_FULL_NAMES } from '@/lib/constants/liuyaoConstants'
import { useToast } from '@/lib/hooks/use-toast'
import { togglePostFavorite, togglePostLike } from '@/lib/services/community'
import { Bookmark, Coins, Flag, Heart, MessageSquare, MoreHorizontal } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
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

  /* 多行文本截断 */
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
// 工具函数 (提取纯文本/卦象信息)
// -----------------------------------------------------------------------------

/** 从HTML中提取纯文本 */
export function extractTextFromHTML(html: string, maxLength: number = 100): string {
  if (!html) return ''
  if (typeof window !== 'undefined') {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    let text = tempDiv.textContent || tempDiv.innerText || ''
    text = text.replace(/\s+/g, ' ').trim()
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  } else {
    // SSR fallback (简易正则)
    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }
}

/** 提取求测背景 (去除固定前缀) */
export function extractHelpBackground(html: string, maxLength: number = 100): string {
  let text = extractTextFromHTML(html, 1000)
  text = text
    .replace(/\*\*关联排盘[^*]*\*\*/g, '')
    .replace(/\*\*问题[^*]*\*\*/g, '')
    .replace(/关联排盘[:：][^\n]*/g, '')
    .replace(/问题[:：][^\n]*/g, '')
    .replace(/卦(名|象)[:：][^\n]*/g, '')
    .split(/\n/).map(l => l.trim()).filter(Boolean).join('\n').trim()
  
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

/** 解析排盘记录为卦象信息 */
export function getGuaInfo(divinationRecord: {
  original_key?: string
  lines?: string[]
  changing_flags?: boolean[] | number[]
} | null | undefined) {
  if (!divinationRecord) return null
  const originalKey = String(divinationRecord.original_key || '').replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
  if (originalKey.length !== 6) return null

  const guaName = HEXAGRAM_FULL_NAMES[originalKey] || '未知卦'
  const lines: boolean[] = []
  for (let i = 0; i < 6; i++) lines.push(originalKey[i] === '1')
  lines.reverse() // 上爻在上

  const changingLines: number[] = []
  const changingFlags = divinationRecord.changing_flags || []
  for (let i = 0; i < changingFlags.length && i < 6; i++) {
    if (changingFlags[i]) changingLines.push(i)
  }

  return { guaName, lines, changingLines }
}

// -----------------------------------------------------------------------------
// 类型与配置
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
  status?: string
}

const POST_TYPE_CONFIG = {
  theory: { label: '论道', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  help: { label: '悬卦', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  debate: { label: '争鸣', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  chat: { label: '茶寮', color: 'bg-green-50 text-green-600 border-green-100' },
}

// -----------------------------------------------------------------------------
// PostCard 组件
// -----------------------------------------------------------------------------
export default function PostCard({ post }: { post: Post }) {
  if (post.status === 'hidden' || post.status === 'deleted') {
    return (
      <div className="bg-stone-50 rounded-xl p-6 text-center text-stone-400 text-sm border border-stone-100 my-4 select-none">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-stone-200/50 flex items-center justify-center">
            <span className="text-stone-400 font-bold">!</span>
          </div>
          此内容因违反《易知社区公约》已被屏蔽
        </div>
      </div>
    )
  }

  const { toast } = useToast()
  const [isLiking, setIsLiking] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [likeCount, setLikeCount] = useState(post.stats.likes)
  const [liked, setLiked] = useState(!!post.isLiked)
  const [favorited, setFavorited] = useState(!!post.isFavorited)
  
  const showMedia = (post.hasGua && post.guaName) || post.coverImage;
  const bountyAmount = typeof post.bounty === 'number' ? post.bounty : Number(post.bounty) || 0;
  const hasBounty = bountyAmount > 0;
  const typeConfig = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.chat;

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isLiking) return
    try {
      setIsLiking(true)
      const nextLiked = await togglePostLike(post.id)
      setLiked(nextLiked)
      setLikeCount(prev => prev + (nextLiked ? 1 : -1))
    } catch (error) {
      console.error(error)
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setIsLiking(false)
    }
  }

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isFavoriting) return
    try {
      setIsFavoriting(true)
      const nextFavorited = await togglePostFavorite(post.id)
      setFavorited(nextFavorited)
      toast({ title: nextFavorited ? '已收藏' : '已取消收藏' })
    } catch (error) {
      console.error(error)
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setIsFavoriting(false)
    }
  }

  return (
    <>
    <style jsx global>{styles}</style>
    
    {/* 容器：移动端紧凑 (py-4)，大屏宽松 (sm:py-6) */}
    <div className="paper-card group relative py-4 px-4 sm:py-6 sm:px-5 first:rounded-t-xl last:rounded-b-xl last:border-b-0">
      
      {/* 布局：移动端垂直堆叠 (flex-col)，大屏水平排列 (sm:flex-row) */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-start">
        
        {/* 左侧 (移动端为上方)：文本信息 */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 w-full">
          
          {/* 1. 标题 */}
          <Link href={`/community/${post.id}`} className="block group/title">
            {/* 字号适配：移动端 17px，大屏 19px */}
            <h3 className="text-[17px] sm:text-[19px] leading-snug font-bold text-[#1c1c1c] group-hover/title:text-[#C82E31] transition-colors font-serif tracking-tight mb-1">
              <span className={`inline-flex items-center align-middle mr-2 px-1.5 py-0.5 rounded text-xs font-normal border ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
              {hasBounty && (
                <span className="inline-flex items-center align-middle mr-2 px-1.5 py-0.5 rounded text-xs font-normal bg-amber-50 text-amber-700 border border-amber-200">
                  <Coins className="w-3 h-3 mr-0.5 fill-amber-500 text-amber-600" />
                  {bountyAmount}
                </span>
              )}
              {post.title}
            </h3>
          </Link>
          
          {/* 2. 摘要 */}
          <Link href={`/community/${post.id}`} className="block cursor-pointer">
            <p className={`text-[14px] sm:text-[15px] text-[#4a4a4a] leading-relaxed hover:text-[#2c2c2c] transition-colors ${showMedia ? 'line-clamp-3' : 'line-clamp-2'}`}>
              {post.excerpt}
            </p>
          </Link>
          
          {/* 3. 底部信息栏 (作者 + 按钮) */}
          <div className="flex flex-wrap items-center justify-between mt-2 gap-y-2">
            
            {/* 作者信息 */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs text-stone-400">
              <div className="flex items-center gap-2 group/author">
                <Avatar className="w-5 h-5 border border-stone-100 group-hover/author:ring-2 group-hover/author:ring-[#C82E31]/20 transition-all">
                  {post.author.avatar && <AvatarImage src={post.author.avatar} />}
                  <AvatarFallback className="text-[9px] bg-stone-100">{post.author.name[0]}</AvatarFallback>
                </Avatar>
                {/* 移动端截断长名字 */}
                <span className="group-hover/author:text-[#C82E31] transition-colors max-w-[80px] truncate sm:max-w-none">
                  {post.author.name}
                </span>
                <span className="text-stone-300">•</span>
                <span>{post.time}</span>
              </div>
              
              {/* 标签 (移动端空间不足时，自动隐藏多余标签) */}
              {post.tags.length > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  {post.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="bg-stone-50 px-1.5 py-0.5 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 操作按钮组 (自动换行) */}
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
               <Button 
                 variant="ghost" size="sm" onClick={handleLike} disabled={isLiking}
                 className={`h-6 px-1.5 text-xs gap-1 hover:bg-transparent ${liked ? 'text-[#C82E31]' : 'text-stone-400 hover:text-stone-600'}`}
               >
                 <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} /> 
                 {likeCount > 0 ? likeCount : '赞'}
               </Button>
               
               <Button 
                 variant="ghost" size="sm" onClick={handleFavorite} disabled={isFavoriting}
                 className={`h-6 px-1.5 text-xs gap-1 hover:bg-transparent ${favorited ? 'text-amber-600' : 'text-stone-400 hover:text-stone-600'}`}
               >
                 <Bookmark className={`w-3.5 h-3.5 ${favorited ? 'fill-current' : ''}`} /> 
                 <span className="hidden sm:inline">收藏</span>
               </Button>
               
               <Link href={`/community/${post.id}#comments`}>
                 <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs gap-1 text-stone-400 hover:text-stone-600 hover:bg-transparent">
                   <MessageSquare className="w-3.5 h-3.5" /> 
                   {post.stats.comments > 0 ? post.stats.comments : '评论'}
                 </Button>
               </Link>

               {/* 更多菜单 (举报) */}
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
                      <Button variant="ghost" className="w-full h-8 text-xs justify-start px-2 text-stone-600 hover:text-[#C82E31] hover:bg-red-50" onClick={(e) => e.stopPropagation()}>
                        <Flag className="w-3.5 h-3.5 mr-1.5" /> 举报违规
                      </Button>
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* 右侧 (移动端为下方)：媒体区域 */}
        {/* 关键优化：移动端全宽显示，增强视觉冲击力 */}
        {showMedia && (
          <div className="shrink-0 w-full sm:w-auto pt-2 sm:pt-1 sm:pl-2">
            {post.hasGua && post.guaName ? (
              // 卦象：移动端居中+浅色背景，大屏靠右
              <div className="flex justify-center sm:block sm:scale-95 sm:origin-top-right bg-stone-50 sm:bg-transparent rounded-lg sm:rounded-none p-2 sm:p-0">
                <GuaBlock name={post.guaName} lines={post.lines} changingLines={post.changingLines} />
              </div>
            ) : post.coverImage ? (
              // 图片：移动端宽幅 Banner (h-40)，大屏缩略图 (140x105)
              <Link href={`/community/${post.id}`} className="block media-container rounded-lg overflow-hidden border border-stone-100 bg-stone-50 relative w-full h-[160px] sm:w-[140px] sm:h-[105px]">
                <Image 
                  src={post.coverImage} 
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 140px"
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
