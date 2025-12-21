'use client'

import PostCard from '@/app/community/components/PostCard'
import { ActivityHeatmap } from '@/app/profile/components/ActivityHeatmap'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/lib/components/ui/tabs'
import { getHexagramResult } from '@/lib/constants/hexagrams'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import { getUserPosts, type Post } from '@/lib/services/community'
import { calculateLevel, getTitleName } from '@/lib/services/growth'
import {
    getDailyActivityData,
    getUserFollowStats,
    getUserProfileById,
    getUserStats,
    isFollowingUser,
    toggleFollowUser,
    type UserFollowStats,
    type UserProfile,
    type UserStats,
} from '@/lib/services/profile'
import type { User } from '@supabase/supabase-js'
import {
    Award,
    Calendar,
    Loader2,
    MessageSquare,
    MoreHorizontal,
    Quote,
    TrendingUp,
    UserPlus,
    Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

// --- 样式定义 ---
const styles = `
  .glass-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(231, 229, 228, 0.6); /* stone-200 */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
  }

  .nav-tab-trigger {
    position: relative;
  }
  
  .nav-tab-trigger[data-state='active'] {
    color: #1c1917; /* stone-900 */
    background: transparent;
    font-weight: 600;
  }
  
  .nav-tab-trigger[data-state='active']::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 3px;
    background-color: #C82E31;
    border-radius: 2px;
  }
`

// 渲染准确率环形图 (小组件 - 优化版)
const AccuracyRing = ({ rate }: { rate: number }) => (
  <div className="relative w-14 h-14 flex items-center justify-center group cursor-help" title="基于过往排盘实证的准确率">
    <svg className="w-full h-full transform -rotate-90">
      <circle cx="28" cy="28" r="24" stroke="#F5F5F4" strokeWidth="4" fill="none" />
      <circle
        cx="28"
        cy="28"
        r="24"
        stroke="#C0392B"
        strokeWidth="4"
        fill="none"
        strokeDasharray={`${(rate / 100) * 150} 150`} 
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
    <div className="absolute flex flex-col items-center justify-center leading-none">
      <span className="text-[13px] font-bold text-[#C0392B] font-mono">{rate}</span>
      <span className="text-[9px] text-gray-400 scale-75">%</span>
    </div>
  </div>
)

// 辅助组件：统计块 (更轻量的设计)
const StatBox = ({ label, value, icon, subLabel, border = false }: { label: string; value: number; icon: React.ReactNode, subLabel?: string, border?: boolean }) => (
  <div className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:bg-stone-50 ${border ? 'border border-stone-100 bg-white' : ''}`}>
    <div className="p-2.5 bg-[#F5F5F4] rounded-lg text-stone-600">
      {icon}
    </div>
    <div>
      <p className="text-xs text-stone-500 mb-0.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-lg font-bold text-[#2C3E50] font-mono leading-none">{value}</p>
        {subLabel && <span className="text-[10px] text-stone-400">{subLabel}</span>}
      </div>
    </div>
  </div>
)

interface UserPublicProfileProps {
  params: Promise<{ id: string }>
}

export default function UserPublicProfile({ params }: UserPublicProfileProps) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [followStats, setFollowStats] = useState<UserFollowStats | null>(null)
  const [activityData, setActivityData] = useState<Array<{ week: number; date: string; count: number }>>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowingLoading, setIsFollowingLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const userId = resolvedParams.id

        const user = await getCurrentUser()
        setCurrentUser(user)

        // 并行加载所有数据
        const [profileData, statsData, followStatsData, activityDataResult, postsData] = await Promise.all([
          getUserProfileById(userId),
          getUserStats(userId),
          getUserFollowStats(userId),
          getDailyActivityData(userId),
          getUserPosts({ userId, limit: 20 }),
        ])

        // 如果已登录且不是查看自己，检查是否已关注
        if (user && user.id !== userId) {
          const followingStatus = await isFollowingUser(userId)
          setIsFollowing(followingStatus)
        }

        if (!profileData) {
          toast({ title: '用户不存在', description: '该用户不存在或已被删除', variant: 'destructive' })
          router.push('/community')
          return
        }

        setProfile(profileData)
        setStats(statsData)
        setFollowStats(followStatsData)
        setActivityData(activityDataResult)
        setPosts(postsData)
      } catch (error) {
        console.error('Error loading user profile:', error)
        toast({ title: '加载失败', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [resolvedParams.id, router, toast])

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      return `${year}年入驻`
    } catch { return '未知' }
  }

  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      if (minutes < 1) return '刚刚'
      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      if (days < 30) return `${days}天前`
      return formatDate(dateString)
    } catch { return '未知' }
  }

  const convertPostToCardFormat = (post: Post) => {
    let guaName: string | undefined
    let lines: boolean[] | undefined
    let changingLines: number[] | undefined

    if (post.divination_record) {
      const originalKey = String(post.divination_record.original_key || '').replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
      const hexagram = getHexagramResult(originalKey)
      guaName = hexagram.name
      if (post.divination_record.lines && Array.isArray(post.divination_record.lines)) {
        lines = post.divination_record.lines.map((line: string) => line === '-----' || line === '---O---')
      }
      if (post.divination_record.changing_flags && Array.isArray(post.divination_record.changing_flags)) {
        changingLines = post.divination_record.changing_flags.map((flag: boolean, index: number) => (flag ? index : -1)).filter((index: number) => index >= 0)
      }
    }

    const extractExcerpt = (html: string | undefined, text: string): string => {
      if (html) {
        const textContent = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
        return textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent
      }
      return text.length > 100 ? text.substring(0, 100) + '...' : text
    }

    return {
      id: post.id,
      type: post.type || 'theory',
      author: {
        id: post.author?.id || profile?.id || '',
        name: post.author?.nickname || profile?.nickname || '未知用户',
        avatar: post.author?.avatar_url || profile?.avatar_url || '',
        level: profile ? calculateLevel(profile.exp || 0) : 1,
        isVerified: profile?.role === 'master' || profile?.role === 'admin',
      },
      title: post.title,
      excerpt: extractExcerpt(post.content_html, post.content),
      coverImage: post.cover_image_url || undefined,
      tags: [],
      bounty: post.bounty || undefined,
      stats: { likes: post.like_count || 0, comments: post.comment_count || 0, views: post.view_count || 0 },
      time: formatRelativeTime(post.created_at),
      hasGua: !!guaName,
      guaName,
      lines,
      changingLines,
      isLiked: post.is_liked || false,
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C0392B]" />
      </div>
    )
  }

  if (!profile) return null

  const userLevel = calculateLevel(profile.exp || 0)
  const titleName = getTitleName(profile.title_level || 1)

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen text-[#2C3E50] py-20">

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* 左侧：主要内容区域 (占8列) */}
            <div className="lg:col-span-8 space-y-8">
               
               {/* 修业日课 (热力图) */}
                <ActivityHeatmap
                    totalActivity={0} // 已在标题显示，这里传0隐藏组件自带标题
                    activityData={activityData}
                />

               {/* 内容列表 Tabs */}
               <div>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'posts' | 'comments')} className="w-full">
                    <div className="sticky top-0 z-20 backdrop-blur-sm pt-2 pb-0 mb-4 border-b border-stone-200">
                      <TabsList className="w-full justify-start bg-transparent p-0 h-auto rounded-none gap-6">
                        <TabsTrigger value="posts" className="nav-tab-trigger rounded-none border-b-2 border-transparent px-2 py-3 text-stone-500 text-base font-medium transition-all data-[state=active]:text-stone-900 cursor-pointer">
                          发布的帖子 <span className="ml-2 text-xs font-normal text-stone-400 font-mono bg-stone-100 px-1.5 py-0.5 rounded-md">{posts.length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="comments" className="nav-tab-trigger rounded-none border-b-2 border-transparent px-2 py-3 text-stone-500 text-base font-medium transition-all data-[state=active]:text-stone-900 cursor-pointer">
                          评论回复
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="posts" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {posts.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-dashed border-stone-200 rounded-xl">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-50 mb-3">
                             <Users className="w-6 h-6 text-stone-300" />
                          </div>
                          <p className="text-stone-400">暂无发布的帖子</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {posts.map((post) => (
                             <div key={post.id} className="transition-transform duration-300 hover:-translate-y-1">
                                <PostCard post={convertPostToCardFormat(post)} />
                             </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="comments">
                      <div className="text-center py-20 bg-white border border-dashed border-stone-200 rounded-xl">
                         <p className="text-stone-400">暂无公开的评论</p>
                      </div>
                    </TabsContent>
                  </Tabs>
               </div>

            </div>
            {/* 右侧：个人信息与统计 (占3列) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* 身份卡片 */}
              <div className="glass-card rounded-2xl p-6 text-center relative overflow-hidden">
                 {/* 装饰水印 */}
                 <div className="absolute top-0 right-0 p-4 opacity-[0.03] select-none pointer-events-none">
                    <span className="font-serif text-8xl">易</span>
                 </div>

                 <div className="relative inline-block mb-4">
                    <Avatar className="w-28 h-28 border-4 border-white shadow-xl">
                      <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="text-3xl bg-stone-100 text-stone-400 font-serif">
                        {profile.nickname?.[0] || '易'}
                      </AvatarFallback>
                    </Avatar>
                    <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#2C3E50] text-[#FDFBF7] border-2 border-white font-mono px-2.5 shadow-sm hover:bg-[#1a252f]">
                      Lv.{userLevel}
                    </Badge>
                 </div>

                 <h1 className="text-2xl font-serif font-bold text-[#2C3E50] mb-2">
                    {profile.nickname || '未命名用户'}
                 </h1>
                 
                 {titleName && (
                   <div className="mb-4">
                     <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200/60 font-serif px-3 py-0.5">
                       <Award size={12} className="mr-1.5" /> {titleName}
                     </Badge>
                   </div>
                 )}

                 <div className="relative mb-6">
                   <Quote className="w-4 h-4 text-stone-300 absolute -top-2 -left-1" />
                   <p className="text-sm text-stone-500 font-serif italic leading-relaxed px-4">
                     {profile.motto || '君子居则观其象而玩其辞，动则观其变而玩其占。'}
                   </p>
                 </div>

                 {/* 社交数据 */}
                 <div className="grid grid-cols-3 gap-2 border-t border-stone-100 pt-4 mb-6">
                    <div className="flex flex-col items-center">
                       <span className="font-bold text-lg font-mono text-[#2C3E50]">{followStats?.followingCount || 0}</span>
                       <span className="text-[10px] text-stone-400 uppercase tracking-wider">关注</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-r border-stone-100">
                       <span className="font-bold text-lg font-mono text-[#2C3E50]">{followStats?.followersCount || 0}</span>
                       <span className="text-[10px] text-stone-400 uppercase tracking-wider">粉丝</span>
                    </div>
                    <div className="flex flex-col items-center">
                       <span className="font-bold text-lg font-mono text-[#2C3E50]">{stats?.likesReceived || 0}</span>
                       <span className="text-[10px] text-stone-400 uppercase tracking-wider">获赞</span>
                    </div>
                 </div>

                 {/* 操作按钮 */}
                 {currentUser && currentUser.id !== profile.id && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      className={`flex-1 shadow-sm transition-all ${
                        isFollowing
                          ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          : 'bg-[#C0392B] text-white hover:bg-[#A93226]'
                      }`}
                      onClick={async () => {
                        if (isFollowingLoading) return
                        try {
                          setIsFollowingLoading(true)
                          const newFollowingStatus = await toggleFollowUser(profile.id)
                          setIsFollowing(newFollowingStatus)
                          // 更新关注统计数据
                          const updatedStats = await getUserFollowStats(profile.id)
                          setFollowStats(updatedStats)
                          toast({ 
                            title: newFollowingStatus ? '已关注' : '已取消关注',
                            description: newFollowingStatus ? `现在可以查看 ${profile.nickname || '该用户'} 的动态了` : ''
                          })
                        } catch (error) {
                          console.error('Error toggling follow:', error)
                          const errorMessage = error instanceof Error ? error.message : '请稍后重试'
                          toast({ 
                            title: '操作失败', 
                            description: errorMessage,
                            variant: 'destructive' 
                          })
                        } finally {
                          setIsFollowingLoading(false)
                        }
                      }}
                      disabled={isFollowingLoading}
                    >
                      {isFollowingLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : isFollowing ? (
                        '已关注'
                      ) : (
                        <>
                          <UserPlus size={16} className="mr-2" /> 关注
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="border-stone-200 text-stone-600 hover:bg-stone-50"
                      onClick={() => {
                        if (!currentUser) {
                          toast({ 
                            title: '请先登录', 
                            description: '登录后即可发送私信',
                            variant: 'destructive'
                          })
                          router.push(`/login?redirect=${encodeURIComponent(`/messages?userId=${profile.id}`)}`)
                          return
                        }
                        if (currentUser.id === profile.id) {
                          toast({ 
                            title: '不能给自己发私信', 
                            variant: 'destructive' 
                          })
                          return
                        }
                        router.push(`/messages?userId=${profile.id}`)
                      }}
                      title="发送私信"
                    >
                      <MessageSquare size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-stone-700">
                      <MoreHorizontal size={18} />
                    </Button>
                  </div>
                 )}
                
                <div className="mt-4 flex items-center justify-center gap-1 text-xs text-stone-400">
                   <Calendar size={12} /> {formatDate(profile.created_at)}
                </div>
              </div>

              {/* 统计数据 (Grid) */}
              {stats && (
                <div className="grid grid-cols-1 gap-3">
                  {/* 准确率高亮 */}
                  <div className="glass-card p-4 rounded-xl flex items-center justify-between group hover:border-[#C0392B]/30 transition-colors">
                    <div>
                      <p className="text-xs text-stone-500 mb-1 font-medium">实证准确率</p>
                      <p className="text-xl font-bold font-mono text-[#C0392B]">{stats.accuracyRate}%</p>
                    </div>
                    <AccuracyRing rate={stats.accuracyRate} />
                  </div>

                  <StatBox
                    label="参与推演"
                    value={stats.participatedDeductions}
                    icon={<TrendingUp size={16} className="text-blue-500" />}
                    border={true}
                  />
                  <StatBox
                    label="易学声望"
                    value={profile.reputation || 0}
                    icon={<Award size={16} className="text-amber-500" />}
                    border={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}