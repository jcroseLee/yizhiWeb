'use client'

import GuaBlock from '@/lib/components/GuaBlock'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/lib/components/ui/dropdown-menu'
import UserHoverCard from '@/lib/components/UserHoverCard'
import { HEXAGRAM_FULL_NAMES } from '@/lib/constants/liuyaoConstants'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser, requireLogin } from '@/lib/services/auth'
import { togglePostFavorite, togglePostLike } from '@/lib/services/community'
import { cn } from '@/lib/utils/cn'
import {
  BookOpen,
  CircleHelp,
  Coffee,
  Coins,
  Flame,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Swords,
  TrendingUp
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import BaZiThumbnail from './BaZiThumbnail'
import BoostPostDialog from './BoostPostDialog'

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

/** 解析排盘记录为四柱八字信息 */
export function getBaziInfo(divinationRecord: {
  method?: number
  original_key?: string
  original_json?: Record<string, unknown> | string
} | null | undefined) {
  if (!divinationRecord) return null
  
  // 检查是否为八字排盘 (method=1 或 original_key='bazi')
  const isBazi = divinationRecord.method === 1 || divinationRecord.original_key === 'bazi'
  
  // 调试日志
  if (process.env.NODE_ENV === 'development') {
    console.log('getBaziInfo check:', {
      method: divinationRecord.method,
      original_key: divinationRecord.original_key,
      isBazi,
      hasOriginalJson: !!divinationRecord.original_json,
      original_json_type: typeof divinationRecord.original_json
    })
  }
  
  if (!isBazi) return null

  try {
    // 解析 original_json
    let originalJson: Record<string, unknown> = {}
    
    if (typeof divinationRecord.original_json === 'string') {
      try {
        originalJson = JSON.parse(divinationRecord.original_json)
      } catch (parseError) {
        console.error('Failed to parse original_json as string:', parseError)
        return null
      }
    } else if (divinationRecord.original_json) {
      originalJson = divinationRecord.original_json
    }

    // 从 original_json 中提取 result
    const result = originalJson.result as {
      pillars?: Array<{
        label: string
        gan: { char: string; wuxing: string }
        zhi: { char: string; wuxing: string }
        zhuXing?: string
        fuXing?: string[]
        cangGan?: Array<{ char: string; wuxing: string }>
        naYin?: string
        shenSha?: string[]
        xingYun?: string
        ziZuo?: string
        kongWang?: string
      }>
      basic?: {
        name?: string
        gender: string
        lunarDate: string
        solarDate: string
        trueSolarDate: string
        place?: string
        solarTerm?: string
        zodiac?: string
      }
    } | undefined

    if (!result?.pillars || !Array.isArray(result.pillars) || result.pillars.length !== 4) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('getBaziInfo: invalid pillars data', {
          hasResult: !!result,
          pillarsLength: result?.pillars?.length,
          pillars: result?.pillars,
          originalJsonKeys: Object.keys(originalJson)
        })
      }
      return null
    }

    // 验证每个 pillar 的数据结构
    const validPillars = result.pillars.filter(p => 
      p && 
      p.label && 
      p.gan && 
      typeof p.gan.char === 'string' && 
      typeof p.gan.wuxing === 'string' &&
      p.zhi && 
      typeof p.zhi.char === 'string' && 
      typeof p.zhi.wuxing === 'string'
    )

    if (validPillars.length !== 4) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('getBaziInfo: invalid pillar structure', {
          validPillarsCount: validPillars.length,
          pillars: result.pillars
        })
      }
      return null
    }

    return {
      pillars: validPillars.map(p => ({
        label: p.label,
        gan: { char: p.gan.char, wuxing: p.gan.wuxing },
        zhi: { char: p.zhi.char, wuxing: p.zhi.wuxing },
        zhuXing: p.zhuXing,
        fuXing: p.fuXing,
        cangGan: p.cangGan,
        naYin: p.naYin,
        shenSha: p.shenSha,
        xingYun: p.xingYun,
        ziZuo: p.ziZuo,
        kongWang: p.kongWang,
      })),
      basic: result.basic,
      fullResult: result as any, // 保留完整结果以备后用
    }
  } catch (error) {
    console.error('Error parsing bazi info:', error, {
      method: divinationRecord.method,
      original_key: divinationRecord.original_key,
      original_json_type: typeof divinationRecord.original_json,
      error_message: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

// -----------------------------------------------------------------------------
// 类型与配置
// -----------------------------------------------------------------------------
export interface Post {
  id: string
  type: 'help' | 'theory' | 'debate' | 'chat'
  author: { id?: string; name: string; avatar: string; level: number; isVerified?: boolean; titleLevel?: number }
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
  hasBazi?: boolean
  baziPillars?: Array<{
    label: string
    gan: { char: string; wuxing: string }
    zhi: { char: string; wuxing: string }
  }>
  isLiked?: boolean
  isFavorited?: boolean
  status?: string
  isUrgent?: boolean
  isSticky?: boolean
}

// 优化：为不同类型配置图标、颜色和背景风格
const POST_TYPE_CONFIG = {
  theory: { 
    label: '论道', 
    icon: BookOpen,
    className: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    containerClass: 'hover:border-indigo-200'
  },
  help: { 
    label: '悬卦', 
    icon: CircleHelp,
    className: 'text-amber-600 bg-amber-50 border-amber-100',
    // 求测贴给予特殊的暖色背景倾向，突出显示
    containerClass: 'bg-gradient-to-br from-[#FFFBEB] via-white to-white border-amber-200 hover:border-amber-300 shadow-sm'
  },
  debate: { 
    label: '争鸣', 
    icon: Swords,
    className: 'text-rose-600 bg-rose-50 border-rose-100',
    containerClass: 'hover:border-rose-200'
  },
  chat: { 
    label: '茶寮', 
    icon: Coffee,
    className: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    containerClass: 'hover:border-emerald-200'
  },
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
  const [isAuthed, setIsAuthed] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showBoostDialog, setShowBoostDialog] = useState(false)

  useEffect(() => {
    const run = async () => {
      const user = await getCurrentUser()
      setIsAuthed(!!user)
      if (user) setCurrentUserId(user.id)
    }
    void run()
  }, [])
  
  // 屏蔽逻辑保持不变
  const isBlocked = post.status === 'hidden' && !showStatus
  if (isBlocked) {
    return (
      <div className="rounded-xl bg-stone-50 border border-stone-100 p-6 flex flex-col items-center justify-center text-center gap-2 my-3 select-none">
        <span className="text-stone-300 text-sm">此内容已被屏蔽</span>
      </div>
    )
  }
  
  const showMedia = (post.hasGua && post.guaName) || (post.hasBazi && post.baziPillars) || post.coverImage
  const bountyAmount = typeof post.bounty === 'number' ? post.bounty : Number(post.bounty) || 0
  const hasBounty = bountyAmount > 0
  
  // 获取类型配置，默认为茶寮
  const typeConfig = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.chat
  const TypeIcon = typeConfig.icon

  // 状态配置
  const shouldShowStatus = showStatus || post.status === 'archived'
  const statusConfig = (shouldShowStatus && post.status) ? STATUS_CONFIG[post.status] : null

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (isLiking) return
    const user = await requireLogin({ type: 'post_like', postId: post.id })
    if (!user) return
    const prevLiked = liked
    setLiked(!prevLiked)
    setLikeCount(prev => prev + (!prevLiked ? 1 : -1)) // 乐观更新
    
    try {
      setIsLiking(true)
      const serverResult = await togglePostLike(post.id)
      setLiked(serverResult)
      // 如果服务端结果不同，回滚计数 (可选，视需求而定)
    } catch {
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
    const user = await requireLogin({ type: 'post_favorite', postId: post.id })
    if (!user) return
    try {
      setIsFavoriting(true)
      const nextFavorited = await togglePostFavorite(post.id)
      setFavorited(nextFavorited)
      toast({ title: nextFavorited ? '已收藏' : '已取消收藏' })
    } catch {
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setIsFavoriting(false)
    }
  }

  return (
    <article 
      className={cn(
        "group relative rounded-xl p-5 mb-3 transition-all duration-300 overflow-hidden",
        "bg-white border border-stone-100",
        // 针对不同类型应用不同的 Hover 和 背景样式
        typeConfig.containerClass || "hover:shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] hover:border-stone-200"
      )}
    >
      {/* 链接覆盖层 */}
      <Link href={`/community/${post.id}`} className="absolute inset-0 z-0" aria-label={`查看帖子: ${post.title}`} />
      
      {/* 更多操作菜单 (仅作者可见) */}
      {currentUserId === post.author.id && (
        <div className="absolute top-4 right-4 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild className='cursor-pointer'>
              <button className="p-1 text-stone-300 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem onClick={() => setShowBoostDialog(true)} className="cursor-pointer gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>置顶推广</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 置顶弹窗 */}
      <BoostPostDialog 
        post={post} 
        open={showBoostDialog} 
        onOpenChange={setShowBoostDialog}
        onSuccess={() => {
          toast({ title: '置顶成功', description: '您的帖子将在首页置顶展示' })
          // Optional: trigger refresh
          window.location.reload()
        }}
      />

      {/* 主布局：左文右图 */}
      <div className="relative z-10 flex gap-5">
        
        {/* 左侧内容区 */}
        <div className="flex-1 min-w-0 flex flex-col">
          
          {/* 1. 顶部元信息行：类型 + 状态 + 悬赏 */}
          <div className="flex items-center gap-2 mb-2">
            {/* 置顶标记 */}
            {post.isSticky && (
               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6875rem] font-medium leading-none bg-[#C82E31] text-white shadow-xs">
                 <span>置顶</span>
               </div>
            )}
            
            {/* 加急标记 */}
            {post.isUrgent && (
               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6875rem] font-medium leading-none bg-orange-100 text-orange-700 border border-orange-200">
                 <Flame className="w-3 h-3 fill-orange-500" />
                 <span>急</span>
               </div>
            )}

            {/* 类型胶囊 */}
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6875rem] font-medium border leading-none",
              typeConfig.className
            )}>
              <TypeIcon className="w-3 h-3" />
              <span>{typeConfig.label}</span>
            </div>

            {/* 悬赏标记 (仅求测贴显示) */}
            {hasBounty && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100/50 text-amber-700 border border-amber-200/50 text-[0.6875rem] font-medium">
                <Coins className="w-3 h-3 fill-amber-500 text-amber-600" />
                <span>{bountyAmount}</span>
              </div>
            )}

            {/* 热门/推荐标记 (示例逻辑：点赞>20) */}
            {post.stats.likes > 20 && (
              <div className="flex items-center text-[0.625rem] text-rose-500 font-medium">
                <Flame className="w-3 h-3 mr-0.5 fill-rose-500" />
                <span>热议</span>
              </div>
            )}

            {/* 状态标记 */}
            {statusConfig && post.status !== 'archived' && (
              <span className={cn("text-[0.625rem] px-1.5 py-0.5 rounded", statusConfig.className)}>
                {statusConfig.label}
              </span>
            )}
          </div>

          {/* 2. 标题区 */}
          <Link href={`/community/${post.id}`} className="block mb-2 group-hover:opacity-100">
            <h3 className={cn(
              "text-[1.0625rem] font-bold text-stone-900 leading-snug tracking-tight transition-colors line-clamp-2",
              // 求测贴标题 hover 变色跟随类型色，其他默认
              post.type === 'help' ? "group-hover:text-amber-700" : "group-hover:text-stone-700"
            )}>
              {post.title}
            </h3>
          </Link>

          {/* 3. 摘要区 (弱化显示) */}
          <p className="text-[0.875rem] text-stone-500 leading-relaxed line-clamp-2 mb-3">
            {post.excerpt}
          </p>

          {/* 4. 底部混合信息栏 (标签 + 作者 + 数据) */}
          <div className="mt-auto flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 overflow-hidden">
              {/* 作者 */}
              <UserHoverCard userId={post.author.id} nickname={post.author.name} avatar={post.author.avatar}>
                <div className="flex items-center gap-1.5 group/author cursor-pointer shrink-0">
                  <Avatar className="w-5 h-5 border border-stone-100">
                    <AvatarImage src={post.author.avatar} alt={post.author.name} />
                    <AvatarFallback className="text-[0.5rem] bg-stone-100 text-stone-500">{post.author.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-stone-500 group-hover/author:text-stone-800 transition-colors truncate max-w-[5rem]">
                    {post.author.name}
                  </span>
                </div>
              </UserHoverCard>
              
              <span className="text-stone-200 text-[0.625rem]">|</span>
              
              {/* 标签 (仅显示第一个，避免拥挤) */}
              {post.tags.length > 0 && (
                <span className="text-xs text-stone-400 truncate max-w-[6.25rem]">
                  #{post.tags[0]}
                </span>
              )}
              
              {/* 时间显示 */}
              <span className="text-xs text-stone-300">
                {post.time}
              </span>
            </div>

            {/* 极简数据展示 */}
            <div className="flex items-center gap-3 text-stone-400 shrink-0">
              <div className="flex items-center gap-1 text-xs">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{post.stats.comments}</span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs transition-colors cursor-pointer select-none",
                  !isAuthed && "opacity-50",
                  liked && "text-rose-500"
                )}
                onClick={handleLike}
              >
                <Heart className={cn("w-3.5 h-3.5", liked && "fill-rose-500")} />
                <span>{likeCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧媒体区：固定尺寸，视觉锚点 */}
        {showMedia && (
          <div className="hidden sm:block shrink-0 w-[7.5rem] h-[6.25rem] mt-1">
            {post.hasBazi && post.baziPillars ? (
              <BaZiThumbnail pillars={post.baziPillars} />
            ) : post.hasGua && post.guaName ? (
              // 优化的卦象缩略图容器
              <div className="w-full h-full bg-stone-50/80 rounded-lg border border-stone-100 flex items-center justify-center relative overflow-hidden group-hover:border-stone-200 transition-colors">
                <div className="scale-75 origin-center opacity-80 group-hover:opacity-100 transition-opacity">
                  <GuaBlock name={post.guaName} lines={post.lines} changingLines={post.changingLines} />
                </div>
                {/* 卦名角标 */}
                <div className="absolute bottom-0 right-0 px-1.5 py-0.5 bg-stone-100/90 text-[0.5625rem] text-stone-500 rounded-tl-md">
                  {post.guaName}
                </div>
              </div>
            ) : post.coverImage ? (
              <div className="relative w-full h-full rounded-lg overflow-hidden border border-stone-100 bg-stone-50">
                <Image 
                  src={post.coverImage} 
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="7.5rem"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 状态印章 (仅已结案显示) */}
      <StatusStamp status={post.status} />
    </article>
  )
}

// -----------------------------------------------------------------------------
// 子组件：状态印章
// -----------------------------------------------------------------------------
function StatusStamp({ status }: { status?: string }) {
  if (status !== 'archived') return null
  return (
    <div className="absolute top-4 right-10 sm:right-24 z-10 pointer-events-none select-none opacity-80">
      <div className={cn(
        "relative flex items-center justify-center",
        "w-16 h-16 rounded-full",
        "border-2 border-double",
        "border-stone-300 text-stone-300", 
        "transform -rotate-12",
        "mix-blend-multiply"
      )}>
        <div className="absolute inset-1 rounded-full border border-current opacity-30"></div>
        <span className="text-xs font-serif font-bold tracking-widest">已结案</span>
      </div>
    </div>
  )
}
