'use client'

import { Button } from '@/lib/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/lib/components/ui/dropdown-menu'
import { useToast } from '@/lib/hooks/use-toast'
import { getPosts, type Post } from '@/lib/services/community'
import {
  ArrowUp,
  BookOpen,
  Coffee,
  Compass,
  Flame,
  Heart,
  HelpCircle,
  ListFilter,
  Loader2,
  TrendingUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DailyFortuneCard from './components/DailyFortuneCard'
import PostCard, { extractHelpBackground, extractTextFromHTML, getGuaInfo, getBaziInfo } from './components/PostCard'
import PostCardSkeleton from './components/PostCardSkeleton'
import PostComposer from './components/PostComposer'
import TrendingTopicsCard from './components/TrendingTopicsCard'
import UserInfoCard from './components/UserInfoCard'

// -----------------------------------------------------------------------------
// 样式定义
// -----------------------------------------------------------------------------
const styles = `  
  /* 标签激活态下划线 */
  .tab-active {
    position: relative;
    color: #C82E31;
    font-weight: 600;
  }
  
  .tab-active::after {
    content: '';
    position: absolute;
    bottom: 0px;
    left: 50%;
    transform: translateX(-50%);
    width: 28px;
    height: 3px;
    background: linear-gradient(to right, transparent, #C82E31, transparent);
    border-radius: 2px;
    box-shadow: 0 1px 2px rgba(200, 46, 49, 0.3);
  }
  
  /* 隐藏滚动条 */
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`

// -----------------------------------------------------------------------------
// 频道导航
// -----------------------------------------------------------------------------
const CHANNELS = [
  { id: 'follow', label: '关注', icon: Heart },
  { id: 'recommend', label: '推荐', icon: Flame },
  { id: 'theory', label: '论道', icon: BookOpen },
  { id: 'help', label: '悬卦', icon: HelpCircle },
  { id: 'debate', label: '争鸣', icon: TrendingUp },
  { id: 'chat', label: '茶寮', icon: Coffee },
] as const

// 格式化时间
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 提取卦象信息辅助函数
const extractGuaInfo = getGuaInfo
// 提取四柱八字信息辅助函数
const extractBaziInfo = getBaziInfo

type SectionType = 'help' | 'theory' | 'debate' | 'chat'

// 转换数据格式
function convertPostForCard(post: Post): Parameters<typeof PostCard>[0]['post'] {
  const guaInfo = extractGuaInfo(post.divination_record)
  const baziInfo = extractBaziInfo(post.divination_record)
  // 直接使用帖子类型，如果没有则默认为 'theory'
  const postType = (post.type as SectionType) || 'theory'

  return {
    id: post.id,
    type: postType,
    author: {
      id: post.author?.id,
      name: post.author?.nickname || '匿名用户',
      avatar: post.author?.avatar_url || '',
      level: 1,
      isVerified: false,
      titleLevel: post.author?.title_level,
    },
    title: postType === 'help' ? `求测：${post.title}` : post.title,
    excerpt: postType === 'help'
      ? extractHelpBackground(post.content_html || post.content, 100)
      : extractTextFromHTML(post.content_html || post.content, 100),
    tags: post.tags || [],
    bounty: post.bounty || 0,
    stats: {
      likes: post.like_count,
      comments: post.comment_count,
      views: post.view_count,
    },
    time: formatTime(post.created_at),
    isLiked: post.is_liked,
    isFavorited: post.is_favorited,
    hasGua: !!guaInfo,
    guaName: guaInfo?.guaName,
    lines: guaInfo?.lines,
    changingLines: guaInfo?.changingLines,
    hasBazi: !!baziInfo,
    baziPillars: baziInfo?.pillars,
    coverImage: post.cover_image_url || undefined,
    status: post.status,
  }
}

// -----------------------------------------------------------------------------
// 主页面组件
// -----------------------------------------------------------------------------

export default function CommunityPage() {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<'newest' | 'hottest' | 'viewed'>('newest')
  const [activeChannel, setActiveChannel] = useState<string>('recommend')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const { toast } = useToast()

  const handleScrollToTop = () => {
    const scrollContainer = document.getElementById('app-scroll-container') as HTMLElement | null
    if (scrollContainer) {
      if (typeof scrollContainer.scrollTo === 'function') {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        scrollContainer.scrollTop = 0
      }
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const loadPosts = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      let orderBy: 'created_at' | 'like_count' | 'view_count' = 'created_at'
      if (sortBy === 'hottest') orderBy = 'like_count'
      if (sortBy === 'viewed') orderBy = 'view_count'

      const limit = 20
      const offset = isLoadMore ? posts.length : 0

      // 处理频道筛选
      let type: 'theory' | 'help' | 'debate' | 'chat' | undefined
      let followed: boolean | undefined

      if (activeChannel === 'follow') {
        followed = true
      } else if (['theory', 'help', 'debate', 'chat'].includes(activeChannel)) {
        type = activeChannel as 'theory' | 'help' | 'debate' | 'chat'
      }

      const data = await getPosts({
        limit,
        offset,
        orderBy,
        orderDirection: 'desc',
        type,
        followed,
      })

      if (isLoadMore) {
        setPosts(prev => [...prev, ...data])
      } else {
        setPosts(data)
      }

      setHasMore(data.length === limit)
    } catch (error) {
      console.error('Failed to load posts:', error)
      const errorMessage = error instanceof Error ? error.message : '无法加载帖子列表'
      toast({
        title: '加载失败',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadPosts(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, activeChannel])

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(true)
    }
  }

  // 监听页面滚动位置，控制"回到顶部"按钮
  useEffect(() => {
    const scrollContainer = document.getElementById('app-scroll-container')

    const handleScroll = () => {
      const scrollElement = scrollContainer ?? document.documentElement
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY
      const { scrollHeight, clientHeight } = scrollElement
      const scrollableHeight = scrollHeight - clientHeight

      if (scrollableHeight > 0) {
        setShowScrollTop((scrollTop / scrollableHeight) > 0.2)
      }
    }

    handleScroll()
    const target: HTMLElement | Window = scrollContainer ?? window
    target.addEventListener('scroll', handleScroll as EventListener, { passive: true })
    return () => target.removeEventListener('scroll', handleScroll as EventListener)
  }, [])

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen font-sans text-stone-800 paper-texture">
        <main className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 px-0 lg:px-6 py-0 lg:py-8">
            
            {/* --- 左侧内容区 --- */}
            <div className="flex-1 min-w-0 space-y-2 lg:space-y-6">
              
              {/* 1. 发布器组件 - 增加阴影和圆角，像一张浮在桌面的纸 */}
              <div className="bg-white lg:rounded-2xl p-1 shadow-sm border-b lg:border border-stone-100 hover:shadow-md transition-shadow duration-300">
                 <PostComposer />
              </div>

              {/* 2. 频道 Tab - 玻璃拟态吸顶 */}
              <div className="sticky top-0 z-20">
                <div className="bg-white/90 backdrop-blur-md px-4 lg:px-0 border-b border-stone-200/50 lg:border-none lg:bg-transparent lg:backdrop-blur-none">
                  <div className="flex items-center justify-between lg:bg-white lg:px-6 lg:py-1 lg:rounded-xl lg:border lg:border-stone-100 lg:shadow-sm">
                    {/* Channel List */}
                    <div className="flex-1 flex gap-2 lg:gap-6 min-w-0 overflow-x-auto scrollbar-hide py-3 lg:py-2">
                      {CHANNELS.map(channel => {
                        const Icon = channel.icon;
                        const isActive = activeChannel === channel.id;
                        return (
                          <button
                            key={channel.id}
                            onClick={() => setActiveChannel(channel.id)}
                            className={`
                              relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-300
                              ${isActive 
                                ? 'text-stone-900 font-bold bg-stone-100' 
                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'}
                            `}
                          >
                            <Icon className={`h-4 w-4 ${isActive ? 'text-[#C82E31]' : 'opacity-70'}`} />
                            <span className="whitespace-nowrap">{channel.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    
                    {/* Sort Filter */}
                    <div className="relative shrink-0 ml-2 pl-2 border-l border-stone-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="flex items-center gap-1.5 h-8 px-2 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-md"
                          >
                            <ListFilter className="h-3.5 w-3.5" /> 
                            <span className="hidden sm:inline">
                              {sortBy === 'newest' && '最新'}
                              {sortBy === 'hottest' && '最热'}
                              {sortBy === 'viewed' && '浏览'}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-30 min-w-[100px] bg-white border border-stone-100 shadow-sm">
                          <DropdownMenuItem onClick={() => setSortBy('newest')} className="text-xs cursor-pointer">最新发布</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortBy('hottest')} className="text-xs cursor-pointer">最多点赞</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortBy('viewed')} className="text-xs cursor-pointer">最多浏览</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. 帖子流 */}
              <div className="space-y-3 lg:space-y-4 px-2 lg:px-0 pb-20 lg:pb-0">
                {loading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <PostCardSkeleton key={index} />
                    ))}
                  </>
                ) : posts.length === 0 ? (
                  <div className="py-12 text-center text-sm text-stone-400 bg-white rounded-lg border border-stone-100 mx-2 lg:mx-0">
                    <div className="flex justify-center mb-2">
                      <HelpCircle className="w-8 h-8 text-stone-200" />
                    </div>
                    暂无帖子，快来发布第一条吧
                  </div>
                ) : (
                  <>
                    {posts.map(post => (
                      <PostCard key={post.id} post={convertPostForCard(post)} />
                    ))}
                    
                    {/* 加载更多 / 底部提示 */}
                    <div className="py-8 text-center">
                      {hasMore ? (
                        <Button
                          variant="ghost"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              加载中...
                            </>
                          ) : (
                            '加载更多'
                          )}
                        </Button>
                      ) : (
                        <div className="text-xs font-serif text-stone-300">
                          —— 问道无止境 ——
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* --- 右侧侧边栏 --- */}
            <aside className="hidden lg:block w-80 shrink-0 space-y-6">
              
              <DailyFortuneCard />
              <UserInfoCard />
              <TrendingTopicsCard />

              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => router.push('/tools/6yao')}
                   className="bg-linear-to-br from-[#7f7562d6] to-[#716643] rounded-xl p-4 text-white relative overflow-hidden cursor-pointer group shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] text-left"
                 >
                   <div className="absolute -right-3 -bottom-3 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Compass className="w-16 h-16" />
                   </div>
                   <div className="relative z-10 flex flex-col h-full justify-between min-h-[80px]">
                     <Compass className="w-6 h-6 mb-2 text-amber-400 group-hover:rotate-12 transition-transform" />
                     <div>
                       <div className="text-sm font-bold">在线排盘</div>
                       <div className="text-[10px] text-stone-400 mt-0.5">智能起卦工具</div>
                     </div>
                   </div>
                 </button>
                 <button 
                   onClick={() => router.push('/library')}
                   className="bg-white border border-stone-200 rounded-xl p-4 text-stone-800 relative overflow-hidden cursor-pointer group shadow-sm hover:border-[#C82E31]/30 hover:shadow-md transition-all hover:scale-[1.02] text-left"
                 >
                   <div className="absolute -right-3 -bottom-3 text-stone-100 group-hover:text-stone-200 transition-colors">
                     <BookOpen className="w-16 h-16" />
                   </div>
                   <div className="relative z-10 flex flex-col h-full justify-between min-h-[80px]">
                     <BookOpen className="w-6 h-6 mb-2 text-[#C82E31] group-hover:scale-110 transition-transform" />
                     <div>
                       <div className="text-sm font-bold">古籍查询</div>
                       <div className="text-[10px] text-stone-400 mt-0.5">查阅万卷经典</div>
                     </div>
                   </div>
                 </button>
              </div>

              <div className="text-xs text-stone-400 text-center pt-4">
                <span className="hover:text-stone-600 cursor-pointer">社区公约</span> · 
                <span className="hover:text-stone-600 cursor-pointer ml-2">关于易知</span>
              </div>

            </aside>
          </div>
        </main>
        
        {/* 回到顶部按钮 (悬浮) */}
        <div 
          className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${
            showScrollTop 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-4 scale-75 pointer-events-none'
          }`}
        >
          <Button 
            className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white text-stone-600 shadow-md border border-stone-200 hover:bg-stone-50 flex items-center justify-center transition-transform hover:-translate-y-1"
            onClick={handleScrollToTop}
            aria-label="回到顶部"
          >
            <ArrowUp className="w-5 h-5 lg:w-6 lg:h-6" />
          </Button>
        </div>
      </div>
    </>
  )
}
