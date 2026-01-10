'use client'

import {
  Activity,
  Award,
  Calendar,
  CheckCircle2,
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

// --- 样式补丁 ---
const styles = `
  .glass-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.03);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  .glass-card:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-2px);
    box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.06);
  }

  .nav-tab-trigger {
    position: relative;
    transition: all 0.3s;
  }
  .nav-tab-trigger[data-state='active'] {
    color: #1c1917;
    font-weight: 600;
  }
  .nav-tab-trigger[data-state='active']::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    background-color: #C82E31;
    border-radius: 99px;
  }

  /* 隐藏滚动条 */
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`

// 环形进度条组件 (更细腻的动画)
const AccuracyRing = ({ rate }: { rate: number }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center group" title="实证准确率">
      <svg className="w-full h-full transform -rotate-90">
        {/* 背景圆 */}
        <circle cx="24" cy="24" r={radius} stroke="#F5F5F4" strokeWidth="4" fill="none" />
        {/* 进度圆 */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="#C82E31"
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center leading-none">
        <span className="text-[11px] font-bold text-stone-800 font-mono">{rate}%</span>
      </div>
    </div>
  );
};

interface UserPublicProfileProps {
  params: Promise<{ id: string }>
}

export default function UserPublicProfile({ params }: UserPublicProfileProps) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const { toast } = useToast()
  
  // State
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

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const userId = resolvedParams.id
        const user = await getCurrentUser()
        setCurrentUser(user)

        const [profileData, statsData, followStatsData, activityDataResult, postsData] = await Promise.all([
          getUserProfileById(userId),
          getUserStats(userId),
          getUserFollowStats(userId),
          getDailyActivityData(userId),
          getUserPosts({ userId, limit: 20 }),
        ])

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

  // Helper Functions
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch { return '未知日期' }
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
        changingLines = post.divination_record.changing_flags.map((flag, index) => (Boolean(flag) ? index : -1)).filter((index) => index >= 0)
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
        <Loader2 className="h-8 w-8 animate-spin text-[#C82E31]" />
      </div>
    )
  }

  if (!profile) return null

  const userLevel = calculateLevel(profile.exp || 0)
  const titleName = getTitleName(profile.title_level || 1)

  return (
    <>
      {/* <style jsx global>{styles}</style> */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="min-h-screen text-[#2C3E50] paper-texture pb-20">

        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* 左侧：主要内容区域 (占8列) */}
            <div className="lg:col-span-8 space-y-8 order-2 lg:order-1">
               
               {/* 修业日课 (热力图) - 独立卡片 */}
               <div className="glass-card rounded-2xl p-6 border-none shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C82E31] rounded-full blur-[80px] opacity-5 pointer-events-none" />
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#C82E31]" />
                          <h3 className="font-bold text-stone-800 text-sm">修习足迹</h3>
                      </div>
                      <span className="text-[10px] text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100">
                          {new Date().getFullYear()} 年度
                      </span>
                  </div>
                  <ActivityHeatmap totalActivity={0} activityData={activityData} />
               </div>

               {/* 内容列表 Tabs */}
               <div>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'posts' | 'comments')} className="w-full">
                    <div className="sticky top-0 z-20 backdrop-blur-md bg-[#FDFBF7]/80 -mx-4 px-4 lg:mx-0 lg:px-0 lg:rounded-xl border-b border-stone-200/50 mb-6">
                      <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-8">
                        <TabsTrigger value="posts" className="nav-tab-trigger rounded-none border-none px-1 py-3 text-stone-500 text-sm font-medium transition-all data-[state=active]:text-stone-900 cursor-pointer hover:text-stone-700">
                          发布的帖子 <span className="ml-1.5 text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">{posts.length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="comments" className="nav-tab-trigger rounded-none border-none px-1 py-3 text-stone-500 text-sm font-medium transition-all data-[state=active]:text-stone-900 cursor-pointer hover:text-stone-700">
                          评论回复
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="posts" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-dashed border-stone-200">
                          <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center mb-3">
                             <Users className="w-5 h-5 text-stone-300" />
                          </div>
                          <p className="text-stone-400 text-sm">暂无发布的帖子</p>
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
                      <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-dashed border-stone-200">
                         <MessageSquare className="w-10 h-10 text-stone-200 mb-3" />
                         <p className="text-stone-400 text-sm">暂无公开的评论</p>
                      </div>
                    </TabsContent>
                  </Tabs>
               </div>

            </div>

            {/* 右侧：个人档案 (占4列 - 加宽一点以容纳更丰富的信息) */}
            <div className="lg:col-span-4 space-y-6 order-1 lg:order-2">
              
              {/* 身份卡片 - 整合版 */}
              <div className="glass-card rounded-2xl p-6 lg:p-8 text-center relative overflow-hidden group">
                 {/* 装饰水印 */}
                 <div className="absolute top-[-20px] right-[-20px] opacity-[0.03] select-none pointer-events-none rotate-12 transition-transform group-hover:rotate-0 duration-700">
                    <span className="font-serif text-9xl">易</span>
                 </div>

                 {/* 头像与等级 */}
                 <div className="relative inline-block mb-5">
                    <div className="absolute inset-0 rounded-full bg-stone-800 blur-xl opacity-10 scale-90 translate-y-2"></div>
                    <Avatar className="w-28 h-28 border-[4px] border-white shadow-xl cursor-default relative z-10">
                      <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="text-4xl bg-stone-100 text-stone-300 font-serif">
                        {profile.nickname?.[0] || '易'}
                      </AvatarFallback>
                    </Avatar>
                    <Badge className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-stone-900 text-[#FDFBF7] border-2 border-white font-mono px-2.5 py-0.5 shadow-md z-20 hover:bg-stone-800 transition-colors cursor-default">
                      Lv.{userLevel}
                    </Badge>
                 </div>

                 {/* 昵称与称号 */}
                 <h1 className="text-2xl font-serif font-bold text-stone-900 mb-2 tracking-tight">
                    {profile.nickname || '未命名用户'}
                 </h1>
                 
                 {titleName && (
                   <div className="mb-5">
                     <Badge variant="secondary" className="text-amber-700 bg-amber-50 border border-amber-200/60 font-serif px-3 py-0.5 shadow-sm">
                       <Award size={12} className="mr-1.5" /> {titleName}
                     </Badge>
                   </div>
                 )}

                 {/* 签名 */}
                 <div className="relative mb-8 px-4">
                   <Quote className="w-3 h-3 text-stone-300 absolute top-0 left-2 opacity-50" />
                   <p className="text-sm text-stone-500 font-serif italic leading-relaxed">
                     {profile.motto || '君子居则观其象而玩其辞，动则观其变而玩其占。'}
                   </p>
                   <Quote className="w-3 h-3 text-stone-300 absolute bottom-0 right-2 opacity-50 rotate-180" />
                 </div>

                 {/* 社交数据 */}
                 <div className="grid grid-cols-3 gap-0 border-y border-stone-100 py-4 mb-6">
                    <div className="flex flex-col items-center group/stat cursor-default">
                       <span className="font-bold text-lg font-mono text-stone-800 group-hover/stat:text-[#C82E31] transition-colors">{followStats?.followingCount || 0}</span>
                       <span className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">关注</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-r border-stone-100 group/stat cursor-default">
                       <span className="font-bold text-lg font-mono text-stone-800 group-hover/stat:text-[#C82E31] transition-colors">{followStats?.followersCount || 0}</span>
                       <span className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">粉丝</span>
                    </div>
                    <div className="flex flex-col items-center group/stat cursor-default">
                       <span className="font-bold text-lg font-mono text-stone-800 group-hover/stat:text-[#C82E31] transition-colors">{stats?.likesReceived || 0}</span>
                       <span className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">获赞</span>
                    </div>
                 </div>

                 {/* 操作按钮 (非本人时显示) */}
                 {currentUser && currentUser.id !== profile.id && (
                  <div className="flex gap-2.5 justify-center">
                    <Button
                      className={`flex-1 shadow-md hover:shadow-lg transition-all h-10 ${
                        isFollowing
                          ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200'
                          : 'bg-[#C82E31] text-white hover:bg-[#B02629]'
                      }`}
                      onClick={async () => {
                        if (isFollowingLoading) return
                        try {
                          setIsFollowingLoading(true)
                          const newFollowingStatus = await toggleFollowUser(profile.id)
                          setIsFollowing(newFollowingStatus)
                          const updatedStats = await getUserFollowStats(profile.id)
                          setFollowStats(updatedStats)
                          toast({ 
                            title: newFollowingStatus ? '已关注' : '已取消关注',
                            description: newFollowingStatus ? `现在可以查看 ${profile.nickname || '该用户'} 的动态了` : ''
                          })
                        } catch (error) {
                          console.error('Error toggling follow:', error)
                          toast({ title: '操作失败', variant: 'destructive' })
                        } finally {
                          setIsFollowingLoading(false)
                        }
                      }}
                      disabled={isFollowingLoading}
                    >
                      {isFollowingLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
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
                      className="h-10 w-10 p-0 border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 shadow-sm"
                      onClick={() => {
                        if (!currentUser) {
                          router.push(`/login?redirect=${encodeURIComponent(`/messages?userId=${profile.id}`)}`)
                          return
                        }
                        if (currentUser.id === profile.id) return
                        router.push(`/messages?userId=${profile.id}`)
                      }}
                      title="发送私信"
                    >
                      <MessageSquare size={18} />
                    </Button>
                    <Button variant="ghost" className="h-10 w-10 p-0 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full">
                      <MoreHorizontal size={18} />
                    </Button>
                  </div>
                 )}
                
                <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-stone-400 opacity-80">
                   <Calendar size={12} /> 
                   <span>{formatDate(profile.created_at)} 加入易知</span>
                </div>
              </div>

              {/* 核心数据卡片 (Grid 风格) */}
              {stats && (
                <div className="space-y-4">
                  {/* 准确率高亮卡片 */}
                  <div className="glass-card p-5 rounded-2xl flex items-center justify-between group cursor-default">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">实证准确率</span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-stone-800">{stats.accuracyRate}%</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">基于 {stats.verifiedCases} 个已验案例</div>
                    </div>
                    <AccuracyRing rate={stats.accuracyRate} />
                  </div>

                  {/* 其他数据 */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="glass-card p-4 rounded-2xl flex flex-col justify-center items-center text-center hover:bg-white/80 transition-colors cursor-default">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                              <TrendingUp size={16} />
                          </div>
                          <div className="text-lg font-bold text-stone-800 font-mono">{stats.participatedDeductions}</div>
                          <div className="text-[10px] text-stone-400">参与推演</div>
                      </div>
                      <div className="glass-card p-4 rounded-2xl flex flex-col justify-center items-center text-center hover:bg-white/80 transition-colors cursor-default">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                              <Award size={16} />
                          </div>
                          <div className="text-lg font-bold text-stone-800 font-mono">{profile.reputation || 0}</div>
                          <div className="text-[10px] text-stone-400">易学声望</div>
                      </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}