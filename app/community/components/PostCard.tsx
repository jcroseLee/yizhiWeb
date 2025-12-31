'use client'

import GuaBlock from '@/lib/components/GuaBlock'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import { HEXAGRAM_FULL_NAMES } from '@/lib/constants/liuyaoConstants'
import { useToast } from '@/lib/hooks/use-toast'
import { togglePostFavorite, togglePostLike } from '@/lib/services/community'
import { cn } from '@/lib/utils/cn'
import { Bookmark, Coins, Flag, Heart, MessageSquare, MoreHorizontal } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import ReportDialog from './ReportDialog'

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
  theory: { label: '论道', className: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  help: { label: '悬卦', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  debate: { label: '争鸣', className: 'bg-rose-50 text-rose-700 border-rose-100' },
  chat: { label: '茶寮', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  published: { label: '已发布', className: 'bg-green-50 text-green-700' },
  draft: { label: '草稿', className: 'bg-stone-100 text-stone-600' },
  pending: { label: '审核中', className: 'bg-orange-50 text-orange-700' },
  rejected: { label: '已驳回', className: 'bg-red-50 text-red-700' },
  hidden: { label: '已屏蔽', className: 'bg-gray-100 text-gray-400' },
  archived: { label: '已结案', className: 'bg-stone-100 text-stone-500' },
}

// -----------------------------------------------------------------------------
// PostCard 组件
// -----------------------------------------------------------------------------
export default function PostCard({ post, showStatus = false }: { post: Post; showStatus?: boolean }) {
  const { toast } = useToast()
  const [isLiking, setIsLiking] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [likeCount, setLikeCount] = useState(post.stats.likes)
  const [liked, setLiked] = useState(!!post.isLiked)
  const [favorited, setFavorited] = useState(!!post.isFavorited)
  
  // 隐藏状态逻辑：
  // 1. 如果 showStatus=true (个人中心)，显示内容 + 状态标签
  // 2. 如果 showStatus=false (社区列表)，显示屏蔽占位符
  const isBlocked = post.status === 'hidden' && !showStatus
  if (isBlocked) {
    return (
      <div className="rounded-2xl bg-stone-50 border border-stone-100 p-8 flex flex-col items-center justify-center text-center gap-3 my-4 select-none">
        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
          <span className="text-stone-300 font-bold text-lg">!</span>
        </div>
        <p className="text-stone-400 text-sm">此内容因违反社区公约已被屏蔽</p>
      </div>
    )
  }
  
  const showMedia = (post.hasGua && post.guaName) || post.coverImage
  const bountyAmount = typeof post.bounty === 'number' ? post.bounty : Number(post.bounty) || 0
  const hasBounty = bountyAmount > 0
  const typeConfig = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.chat
  
  // 总是显示"已结案"状态，其他状态仅在 showStatus=true 时显示
  const shouldShowStatus = showStatus || post.status === 'archived'
  const statusConfig = (shouldShowStatus && post.status) ? STATUS_CONFIG[post.status] : null

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (isLiking) return
    const prevLiked = liked
    setLiked(!prevLiked)
    setLikeCount(prev => prev + (!prevLiked ? 1 : -1)) // 乐观更新
    
    try {
      setIsLiking(true)
      const serverResult = await togglePostLike(post.id)
      setLiked(serverResult)
      // 如果服务端结果不同，回滚计数 (可选，视需求而定)
    } catch (error) {
      setLiked(prevLiked)
      setLikeCount(prev => prev + (prevLiked ? 1 : -1))
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setIsLiking(false)
    }
  }

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (isFavoriting) return
    try {
      setIsFavoriting(true)
      const nextFavorited = await togglePostFavorite(post.id)
      setFavorited(nextFavorited)
      toast({ title: nextFavorited ? '已收藏' : '已取消收藏' })
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setIsFavoriting(false)
    }
  }

  return (
    <article className="group relative bg-white rounded-2xl p-4 sm:p-6 mb-4 border border-stone-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-stone-200">
      
      {/* 链接覆盖层 - 让整个卡片可点击，但又不影响内部按钮 */}
      <Link href={`/community/${post.id}`} className="absolute inset-0 z-0 rounded-2xl" aria-label={`查看帖子: ${post.title}`} />

      {/* 头部元信息：标签 + 类型 */}
      <div className="relative z-10 flex items-center gap-2 mb-3 text-xs">
        {statusConfig && post.status !== 'archived' && (
          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
        )}
        <Badge className={typeConfig.className}>{typeConfig.label}</Badge>
        
        {hasBounty && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
            <Coins className="w-3 h-3 mr-1 fill-amber-500 text-amber-600" />
            {bountyAmount}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2 text-stone-400 text-[11px] sm:text-xs">
          <span>{post.time}</span>
        </div>
      </div>

      {/* 主体内容布局 */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-6">
        
        {/* 左侧：文本区 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 标题 */}
          <Link href={`/community/${post.id}`} className="block mb-2">
            <h3 className="text-[17px] sm:text-[19px] font-bold text-stone-900 leading-snug tracking-tight group-hover:text-[#C82E31] transition-colors line-clamp-2">
              {post.title}
            </h3>
          </Link>

          {/* 摘要 */}
          <p className="text-[14px] sm:text-[15px] text-stone-500 leading-relaxed line-clamp-3 mb-3">
            {post.excerpt}
          </p>

          {/* 底部：作者与标签 */}
          <div className="mt-auto pt-2 flex items-center justify-between">
            {/* 作者 */}
            <div className="flex items-center gap-2 group/author cursor-pointer">
              <Avatar className="w-6 h-6 border border-stone-100">
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
                <AvatarFallback className="text-[9px] bg-stone-100 text-stone-500">{post.author.name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-stone-500 font-medium group-hover/author:text-stone-800 transition-colors truncate max-w-[100px]">
                {post.author.name}
              </span>
            </div>
          </div>
        </div>

        {/* 右侧 (PC) / 下方 (Mobile)：媒体展示区 */}
        {showMedia && (
          <div className="shrink-0 sm:w-[140px] md:w-[160px] w-full mt-2 sm:mt-0">
            {post.hasGua && post.guaName ? (
              // 卦象展示 - 增加精致的边框容器
              <div className="w-full h-full min-h-[120px] bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-center p-3 relative overflow-hidden">
                <div className="opacity-10 absolute -right-2 -bottom-4 text-6xl font-serif select-none pointer-events-none text-stone-400">卦</div>
                <div className="scale-[0.85] origin-center sm:scale-90">
                  <GuaBlock name={post.guaName} lines={post.lines} changingLines={post.changingLines} />
                </div>
              </div>
            ) : post.coverImage ? (
              // 图片展示
              <div className="relative aspect-4/3 sm:aspect-square w-full h-full rounded-xl overflow-hidden border border-stone-100 bg-stone-50">
                <Image 
                  src={post.coverImage} 
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 160px"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 底部操作栏 - 分离线 */}
      <div className="relative z-10 mt-4 pt-3 border-t border-stone-50 flex items-center justify-between">
        
        {/* 标签组 */}
        <div className="flex flex-wrap gap-2 overflow-hidden h-6">
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 bg-stone-50 text-stone-400 rounded-full border border-stone-100">
              #{tag}
            </span>
          ))}
        </div>

        {/* 动作按钮组 */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0 ml-auto">
          <ActionButton 
            active={liked} 
            activeColor="text-rose-600"
            icon={Heart} 
            count={likeCount} 
            onClick={handleLike} 
            label="点赞"
            activeFill
            disabled={isLiking}
          />
          <Link href={`/community/${post.id}#comments`} className="inline-flex">
            <ActionButton 
              active={false}
              icon={MessageSquare} 
              count={post.stats.comments} 
              label="评论"
            />
          </Link>
          <ActionButton 
            active={favorited} 
            activeColor="text-amber-500"
            icon={Bookmark} 
            label="收藏"
            onClick={handleFavorite}
            activeFill
            disabled={isFavoriting}
          />
          
          {/* 更多菜单 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-300 hover:text-stone-600 hover:bg-stone-50 rounded-full" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-32 p-1 bg-white border-stone-100 shadow-lg">
              <ReportDialog
                targetId={post.id}
                targetType="post"
                postTitle={post.title}
                trigger={
                  <Button variant="ghost" className="w-full h-8 text-xs justify-start px-2 text-stone-600 hover:text-red-600 hover:bg-red-50" onClick={(e) => e.stopPropagation()}>
                    <Flag className="w-3.5 h-3.5 mr-2" /> 举报
                  </Button>
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 状态印章 */}
      <StatusStamp status={post.status} />

    </article>
  )
}

// -----------------------------------------------------------------------------
// 子组件：通用徽章
// -----------------------------------------------------------------------------
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium border border-transparent/10", className)}>
      {children}
    </span>
  )
}

// -----------------------------------------------------------------------------
// 子组件：操作按钮
// -----------------------------------------------------------------------------
interface ActionButtonProps {
  active: boolean
  activeColor?: string
  icon: React.ElementType
  count?: number
  label: string
  onClick?: (e: React.MouseEvent) => void
  activeFill?: boolean
  disabled?: boolean
}

function ActionButton({ active, activeColor = '', icon: Icon, count, label, onClick, activeFill, disabled }: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-7 px-2 text-xs gap-1.5 rounded-full transition-all hover:bg-stone-50",
        active ? activeColor : "text-stone-400 hover:text-stone-600"
      )}
    >
      <Icon className={cn("w-4 h-4", active && activeFill && "fill-current")} />
      {count !== undefined && count > 0 ? (
        <span className="font-medium">{count}</span>
      ) : (
        <span className="hidden sm:inline-block">{label}</span>
      )}
    </Button>
  )
}

// -----------------------------------------------------------------------------
// 子组件：印章 (核心优化)
// -----------------------------------------------------------------------------
function StatusStamp({ status }: { status?: string }) {
  // 目前仅为 "archived" 状态展示印章，未来可扩展 "精选"、"置顶" 等
  if (status !== 'archived') return null

  return (
    <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 pointer-events-none select-none">
      {/* 
        印章容器 
        - mix-blend-multiply: 模拟印泥渗入纸张的暗色叠加效果
        - border-double: 经典的印章双边框风格
        - 位置调整：避免与头部时间信息重叠，同时保持在视觉焦点区域
      */}
      <div className={cn(
        "relative flex items-center justify-center",
        "w-20 h-20 sm:w-24 sm:h-24 rounded-full",
        "border-[3px] border-double",
        // 颜色：使用灰石色模拟陈旧印记，若要红色印章可用 border-red-800/20 text-red-800/20
        "border-stone-300/70 text-stone-300/70", 
        "transform -rotate-15",
        "mix-blend-multiply transition-all duration-500",
        // 父级 hover 时，印章稍微加深，增加"显影"感
        "group-hover:border-stone-400/60 group-hover:text-stone-400/60 group-hover:scale-105"
      )}>
        
        {/* 内圈装饰线 (细实线) */}
        <div className="absolute inset-1.5 rounded-full border border-current opacity-50"></div>
        
        {/* 文本内容 */}
        <div className="flex flex-col items-center justify-center gap-0.5 z-10 relative">
          <span className="text-[9px] sm:text-[10px] font-serif tracking-widest opacity-80 whitespace-nowrap">
            易知社区
          </span>
          <span className="text-lg sm:text-xl font-black font-serif tracking-[0.15em] leading-none whitespace-nowrap">
            已结案
          </span>
          <span className="text-[7px] sm:text-[8px] font-sans tracking-tight uppercase opacity-60 whitespace-nowrap">
            RESOLVED
          </span>
        </div>
      </div>
    </div>
  )
}
