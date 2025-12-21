'use client'

import { Button } from '@/lib/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { getPosts, type Post } from '@/lib/services/community'
import {
  BookOpen,
  Coffee,
  Compass,
  Flame,
  HelpCircle,
  ListFilter,
  TrendingUp
} from 'lucide-react'
import { useEffect, useState } from 'react'
import DailyFortuneCard from './components/DailyFortuneCard'
import PostCard from './components/PostCard'
import PostCardSkeleton from './components/PostCardSkeleton'
import PostComposer from './components/PostComposer'
import TrendingTopicsCard from './components/TrendingTopicsCard'
import UserInfoCard from './components/UserInfoCard'

// -----------------------------------------------------------------------------
// 样式定义：引入新中式纹理与排版 - 增强质感
// -----------------------------------------------------------------------------
const styles = `  
  /* 标签激活态下划线 - 模拟毛笔笔触，朱砂红 */
  .tab-active {
    position: relative;
    color: #C82E31;
    font-weight: 600;
  }
  
  .tab-active::after {
    content: '';
    position: absolute;
    bottom: -6px;
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
  { id: 'recommend', label: '推荐', icon: Flame },
  { id: 'theory', label: '论道', icon: BookOpen }, // 理论
  { id: 'help', label: '悬卦', icon: HelpCircle }, // 求助
  { id: 'debate', label: '争鸣', icon: TrendingUp }, // 争议/热点
  { id: 'chat', label: '茶寮', icon: Coffee }, // 闲聊
]

// 完整卦名映射（根据二进制键）
const HEXAGRAM_FULL_NAMES: Record<string, string> = {
  "111111": "乾为天",
  "000000": "坤为地",
  "100010": "水雷屯",
  "010001": "山水蒙",
  "111010": "水天需",
  "010111": "天水讼",
  "000010": "地水师",
  "010000": "水地比",
  "111011": "风天小畜",
  "110111": "天泽履",
  "111000": "地天泰",
  "000111": "天地否",
  "111101": "天火同人",
  "101111": "火天大有",
  "001000": "地山谦",
  "000100": "雷地豫",
  "100110": "泽雷随",
  "011001": "山风蛊",
  "110000": "地泽临",
  "000011": "风地观",
  "101001": "火雷噬嗑",
  "100101": "山火贲",
  "000001": "山地剥",
  "100000": "地雷复",
  "111001": "天雷无妄",
  "100111": "山天大畜",
  "100001": "山雷颐",
  "011110": "泽风大过",
  "010010": "坎为水",
  "101101": "离为火",
  "011100": "泽山咸",
  "001110": "雷风恒",
  "111100": "天山遁",
  "001111": "雷天大壮",
  "100011": "火地晋",
  "000101": "地火明夷",
  "101011": "风火家人",
  "110101": "火泽睽",
  "010100": "水山蹇",
  "001010": "雷水解",
  "110001": "山泽损",
  "001011": "风雷益",
  "111110": "泽天夬",
  "011111": "天风姤",
  "010110": "泽水困",
  "011010": "水风井",
  "001001": "震为雷",
  "100100": "艮为山",
  "011011": "风山渐",
  "110110": "雷泽归妹",
  "101100": "雷火丰",
  "001101": "火山旅",
  "110010": "风泽中孚",
  "010011": "雷山小过",
  "101010": "水火既济",
  "010101": "火水未济"
}

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

// 从 HTML 中提取纯文本摘要（支持 SSR）
function extractTextFromHTML(html: string, maxLength: number = 100): string {
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

// 针对求测帖：去掉“关联排盘/问题”等前缀，只保留背景描述
function extractHelpBackground(html: string, maxLength: number = 100): string {
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

// 从 divination_record 提取卦象信息
interface DivinationRecord {
  original_key?: string
  changed_key?: string
  lines?: string[]
  changing_flags?: boolean[]
}

function extractGuaInfo(divinationRecord: DivinationRecord | null | undefined) {
  if (!divinationRecord) return null

  // 获取 original_key（二进制字符串，从下往上：第0位是初爻，第5位是上爻）
  const originalKey = String(divinationRecord.original_key || '').replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
  
  if (originalKey.length !== 6) return null

  // 获取卦名
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
  // 需要转换为从上往下的索引（GuaBlock 从上往下显示）
  const changingLines: number[] = []
  const changingFlags = divinationRecord.changing_flags || []
  for (let i = 0; i < changingFlags.length && i < 6; i++) {
    if (changingFlags[i]) {
      // 从下往上的索引 i 转换为从上往下的索引
      changingLines.push(5 - i)
    }
  }

  return {
    guaName,
    lines,
    changingLines,
  }
}

// 将 section 映射到 type
function mapSectionToType(
  section?: string | null, 
  type?: string | null,
  bounty?: number | null,
  divinationRecordId?: string | null
): 'help' | 'theory' | 'debate' | 'chat' {
  // 如果有悬赏或关联排盘记录，优先判断为求助贴
  if ((bounty && bounty > 0) || divinationRecordId) {
    return 'help'
  }
  
  // 优先使用 type 字段
  if (type && ['theory', 'help', 'debate', 'chat'].includes(type)) {
    return type as 'help' | 'theory' | 'debate' | 'chat'
  }
  
  // 如果没有 type，从 section 映射
  if (section) {
    const sectionMap: Record<string, 'help' | 'theory' | 'debate' | 'chat'> = {
      'study': 'theory',
      'help': 'help',
      'casual': 'chat',
      'announcement': 'theory', // 公告默认归类为论道
    }
    return sectionMap[section] || 'theory'
  }
  
  return 'theory'
}

// 转换Post类型以适配PostCard组件
function convertPostForCard(post: Post): Parameters<typeof PostCard>[0]['post'] {
  // 尝试从 divination_records 获取卦象信息
  // 注意：Supabase 返回的关联数据可能是数组或对象
  interface PostWithDivination extends Omit<Post, 'section'> {
    divination_records?: DivinationRecord | DivinationRecord[] | null
    section?: 'study' | 'help' | 'casual' | 'announcement' | null
  }
  
  const postWithDivination = post as PostWithDivination
  const divinationRecord = postWithDivination.divination_records
    ? (Array.isArray(postWithDivination.divination_records) 
        ? postWithDivination.divination_records[0] 
        : postWithDivination.divination_records)
    : null

  const guaInfo = extractGuaInfo(divinationRecord)

  return {
    id: post.id, // 使用原始UUID，不转换为数字
    type: mapSectionToType(
      postWithDivination.section, 
      post.type,
      post.bounty,
      post.divination_record_id
    ),
    author: {
      name: post.author?.nickname || '匿名用户',
      avatar: post.author?.avatar_url || '',
      level: 1, // 可以从用户表获取
      isVerified: false,
    },
    title: mapSectionToType(
      postWithDivination.section, 
      post.type,
      post.bounty,
      post.divination_record_id
    ) === 'help'
      ? `求测：${post.title}`
      : post.title,
    excerpt: mapSectionToType(
      postWithDivination.section, 
      post.type,
      post.bounty,
      post.divination_record_id
    ) === 'help'
      ? extractHelpBackground(post.content_html || post.content, 100)
      : extractTextFromHTML(post.content_html || post.content, 100),
    tags: [], // 可以从内容中提取或添加tags字段
    bounty: post.bounty || 0, // 使用实际的bounty值
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
    coverImage: post.cover_image_url || undefined,
  }
}

// -----------------------------------------------------------------------------
// 主页面组件
// -----------------------------------------------------------------------------

export default function CommunityPage() {
  const [activeChannel, setActiveChannel] = useState('recommend')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadPosts = async () => {
    try {
      setLoading(true)
      const type = activeChannel === 'recommend' ? undefined : activeChannel as 'theory' | 'help' | 'debate' | 'chat'
      const data = await getPosts({
        limit: 20,
        type,
        orderBy: activeChannel === 'recommend' ? 'created_at' : 'like_count',
      })
      setPosts(data)
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
    }
  }

  // 加载帖子列表
  useEffect(() => {
    loadPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel])

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen font-sans text-stone-800">
        <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="flex gap-8">
            
            {/* --- 左侧内容区 --- */}
            <div className="flex-1 min-w-0 space-y-6">
              
              {/* 1. 发布器组件 */}
              <PostComposer />

              {/* 2. 频道 Tab (优化：朱砂红底部短横线，模拟毛笔笔触) */}
              <div className="flex items-center justify-between bg-[#f7f7f9] py-3 border-b border-stone-200/60 mb-2">
                <div className="flex gap-8 px-2">
                  {CHANNELS.map(channel => {
                    const Icon = channel.icon;
                    const isActive = activeChannel === channel.id;
                    return (
                      <Button
                        key={channel.id}
                        onClick={() => setActiveChannel(channel.id)}
                        variant="ghost"
                        className={`flex items-center gap-2 text-sm transition-colors pb-2 relative h-auto p-0 hover:bg-transparent ${
                          isActive ? 'tab-active text-stone-900' : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-[#C82E31]' : ''}`} />
                        {channel.label}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 px-3 py-1 bg-white border border-stone-200 rounded-full shadow-sm hover:border-[#C82E31]/30 transition-colors h-auto"
                >
                  <ListFilter className="h-3 w-3" /> 筛选
                </Button>
              </div>

              {/* 3. 帖子流 (优化：卡片质感与内容区分) */}
              <div className="space-y-4">
                {loading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <PostCardSkeleton key={index} />
                    ))}
                  </>
                ) : posts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-stone-400">
                    暂无帖子
                  </div>
                ) : (
                  <>
                    {posts.map(post => (
                      <PostCard key={post.id} post={convertPostForCard(post)} />
                    ))}
                    <div className="py-8 text-center text-sm font-serif text-stone-400">
                      —— 问道无止境 ——
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* --- 右侧侧边栏 (优化：更强的层次感和工具入口) --- */}
            <aside className="hidden lg:block w-80 shrink-0 space-y-6">
              
              {/* 1. 今日运势卡片 */}
              <DailyFortuneCard />

              {/* 2. 作者/用户信息卡片 */}
              <UserInfoCard />

              {/* 3. 论道风向标 */}
              <TrendingTopicsCard />

              {/* 4. 工具栏 (优化：更具"法器"或"令牌"质感) */}
              <div className="grid grid-cols-2 gap-3">
                 {/* 在线排盘 - 深色渐变，罗盘背景装饰 */}
                 <button className="bg-gradient-to-br from-[#7f7562d6] to-[#716643] rounded-xl p-4 text-white relative overflow-hidden cursor-pointer group shadow-sm hover:shadow-lg transition-all hover:scale-[1.02]">
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
                 {/* 古籍查询 - 白色卡片，书本图标背景 */}
                 <button className="bg-white border border-stone-200 rounded-xl p-4 text-stone-800 relative overflow-hidden cursor-pointer group shadow-sm hover:border-[#C82E31]/30 hover:shadow-md transition-all hover:scale-[1.02]">
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

              {/* Footer */}
              <div className="text-xs text-stone-400 text-center pt-4">
                <span className="hover:text-stone-600 cursor-pointer">社区公约</span> · 
                <span className="hover:text-stone-600 cursor-pointer ml-2">关于易知</span>
              </div>

            </aside>
          </div>
        </main>
      </div>
    </>
  )
}
