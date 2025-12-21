'use client'

import {
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  CalendarCheck,
  Coins,
  Edit2,
  HelpCircle,
  Loader2,
  MessageSquare,
  Trash2,
  TrendingUp,
  UserPlus,
  Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import PostCard from '@/app/community/components/PostCard'
import { EditProfileDialog } from '@/lib/components/EditProfileDialog'
import { ToastProviderWrapper } from '@/lib/components/ToastProviderWrapper'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/lib/components/ui/tabs'
import { RESULTS_LIST_STORAGE_KEY, type StoredDivinationPayload, type StoredResultWithId } from '@/lib/constants/divination'
import { getHexagramResult } from '@/lib/constants/hexagrams'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import { deletePost, getUserPosts, type Post } from '@/lib/services/community'
import {
  calculateLevel,
  checkIn,
  getCoinTransactions,
  getTitleName,
  getUserGrowth,
  hasCheckedInToday,
  type CoinTransaction
} from '@/lib/services/growth'
import { getDailyActivityData, getDivinationRecordById, getFollowersUsers, getFollowingUsers, getUserDivinationRecords, getUserFollowStats, getUserProfileWithGrowth, getUserStats, toggleFollowUser, type DivinationRecord, type UserFollowStats, type UserProfile, type UserStats } from '@/lib/services/profile'
import Link from 'next/link'
import { ActivityHeatmap } from './components/ActivityHeatmap'
import { CircularProgress } from './components/CircularProgress'
import ProfileSkeleton from './components/ProfileSkeleton'
import { StatCard } from './components/StatCard'

// -----------------------------------------------------------------------------
// 样式定义  background-color: #fdfbf7;
// -----------------------------------------------------------------------------
const styles = `
  .profile-bg {
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  
  .glass-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
  }

  .nav-tab-trigger[data-state='active'] {
    color: #C82E31;
    border-bottom-color: #C82E31;
    background: transparent;
  }
`

// --- 主页面组件 ---
export default function ProfilePage() {
  return (
    <ToastProviderWrapper>
      <ProfilePageContent />
    </ToastProviderWrapper>
  )
}

function ProfilePageContent() {
  const router = useRouter()
  const { toast } = useToast()
  
  // State definitions (保持原有逻辑不变)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats>({ publishedCases: 0, participatedDeductions: 0, likesReceived: 0, accuracyRate: 0, verifiedCases: 0 })
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [favoritePosts, setFavoritePosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [postTab, setPostTab] = useState<'mine' | 'fav' | 'liked'>('mine')
  const [divinationRecords, setDivinationRecords] = useState<DivinationRecord[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([])
  const [activityData, setActivityData] = useState<Array<{ week: number; date: string; count: number }>>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deletePostDialogOpen, setDeletePostDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)
  const [deletingPost, setDeletingPost] = useState(false)
  const [growth, setGrowth] = useState<{ level: number; titleName: string; yiCoins: number; exp: number; reputation: number } | null>(null)
  const [followStats, setFollowStats] = useState<UserFollowStats>({ followingCount: 0, followersCount: 0, postsCount: 0 })
  const [followingUsers, setFollowingUsers] = useState<UserProfile[]>([])
  const [followersUsers, setFollowersUsers] = useState<UserProfile[]>([])
  const [followTab, setFollowTab] = useState<'following' | 'followers'>('following')
  const [loadingFollows, setLoadingFollows] = useState(false)
  const [activeMainTab, setActiveMainTab] = useState<'notes' | 'divinations' | 'follows' | 'wallet'>('notes')
  const tabsRef = useRef<HTMLDivElement>(null)
  const [coinRulesDialogOpen, setCoinRulesDialogOpen] = useState(false)
  const [expRulesDialogOpen, setExpRulesDialogOpen] = useState(false)

  // Data fetching (保持原有逻辑)
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push(`/login?redirect=${encodeURIComponent('/profile')}`)
          return
        }
        
        const [profileWithGrowth, statsData, postsData, divinationData, transactions, dailyActivity, followStatsData] = await Promise.all([
          getUserProfileWithGrowth(),
          getUserStats(),
          getUserPosts({ limit: 50 }),
          getUserDivinationRecords(50),
          getCoinTransactions(100), // 增加获取数量，显示更多交易记录
          getDailyActivityData(),
          getUserFollowStats()
        ])
        
        setProfile(profileWithGrowth.profile)
        
        if (profileWithGrowth.growth) {
          const { exp, reputation, yiCoins, titleLevel } = profileWithGrowth.growth
          setGrowth({
            level: calculateLevel(exp),
            titleName: getTitleName(titleLevel),
            yiCoins,
            exp,
            reputation,
          })
          setHasCheckedIn(await hasCheckedInToday(profileWithGrowth.growth.lastCheckinDate))
        } else {
          const growthData = await getUserGrowth()
          if (growthData) {
            setGrowth({
              level: growthData.level,
              titleName: growthData.titleName,
              yiCoins: growthData.yiCoins,
              exp: growthData.exp,
              reputation: growthData.reputation,
            })
            setHasCheckedIn(await hasCheckedInToday(growthData.lastCheckinDate))
          }
        }

        setStats(statsData)
        setUserPosts(postsData)
        setDivinationRecords(divinationData)
        setCoinTransactions(transactions)
        setActivityData(dailyActivity)
        setFollowStats(followStatsData)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  // 加载关注数据
  const loadFollowsData = async (type: 'following' | 'followers') => {
    setLoadingFollows(true)
    try {
      if (type === 'following') {
        const users = await getFollowingUsers(50)
        setFollowingUsers(users)
      } else {
        const users = await getFollowersUsers(50)
        setFollowersUsers(users)
      }
    } catch (error) {
      console.error('Error loading follows:', error)
      toast({ title: '加载失败', variant: 'destructive' })
    } finally {
      setLoadingFollows(false)
    }
  }

  // 处理取消关注（在我关注的列表中）
  const handleUnfollow = async (userId: string) => {
    try {
      const newStatus = await toggleFollowUser(userId)
      if (!newStatus) {
        // 取消关注成功，从列表中移除
        setFollowingUsers(prev => prev.filter(u => u.id !== userId))
        // 更新统计数据
        const updatedStats = await getUserFollowStats()
        setFollowStats(updatedStats)
        toast({ title: '已取消关注' })
      }
    } catch (error) {
      console.error('Error unfollowing:', error)
      const errorMessage = error instanceof Error ? error.message : '操作失败'
      toast({ title: '操作失败', description: errorMessage, variant: 'destructive' })
    }
  }

  // 处理关注/取消关注（在关注我的列表中）
  // 注意：这个函数只用于更新统计数据，不执行实际的关注/取消关注操作
  // 因为 UserCard 组件中的 handleFollowToggle 已经执行了操作
  const handleFollowChange = async () => {
    try {
      // 只更新统计数据，不再次切换关注状态
      const updatedStats = await getUserFollowStats()
      setFollowStats(updatedStats)
    } catch (error) {
      console.error('Error updating follow stats:', error)
    }
  }

  // Handlers (保持原有逻辑)
  const handleCheckIn = async () => {
    if (hasCheckedIn || checkingIn) return
    setCheckingIn(true)
    try {
      const result = await checkIn()
      if (result.success) {
        setHasCheckedIn(true)
        const [growthData, transactions] = await Promise.all([getUserGrowth(), getCoinTransactions(100)])
        if (growthData) {
          setGrowth({
            level: growthData.level,
            titleName: growthData.titleName,
            yiCoins: growthData.yiCoins,
            exp: growthData.exp,
            reputation: growthData.reputation,
          })
        }
        setCoinTransactions(transactions)
        toast({ title: result.message, variant: 'default' })
      } else {
        toast({ title: '签到失败', description: result.message, variant: 'destructive' })
      }
    } catch (error) {
      console.error('Check-in error:', error)
      toast({ title: '签到失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setCheckingIn(false)
    }
  }

  const handleRecordClick = async (record: DivinationRecord) => {
    try {
      const fullRecord = await getDivinationRecordById(record.id)
      if (!fullRecord) {
        toast({ title: '加载失败', description: '无法加载排盘记录详情', variant: 'destructive' })
        return
      }

      const originalKey = String(fullRecord.original_key).replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
      const changedKey = String(fullRecord.changed_key).replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
      
      let originalHexagram = getHexagramResult(originalKey)
      let changedHexagram = getHexagramResult(changedKey)
      
      if (fullRecord.original_json && typeof fullRecord.original_json === 'object' && 'name' in fullRecord.original_json) {
        originalHexagram = fullRecord.original_json as { name: string; interpretation: string }
      }
      if (fullRecord.changed_json && typeof fullRecord.changed_json === 'object' && 'name' in fullRecord.changed_json) {
        changedHexagram = fullRecord.changed_json as { name: string; interpretation: string }
      }

      const changingLines: number[] = []
      fullRecord.changing_flags.forEach((isChanging, index) => {
        if (isChanging) changingLines.push(index + 1)
      })

      const payload: StoredDivinationPayload = {
        question: fullRecord.question || '',
        divinationTimeISO: fullRecord.divination_time,
        divinationMethod: fullRecord.method,
        lines: fullRecord.lines,
        changingFlags: fullRecord.changing_flags,
        result: {
          originalKey: originalKey,
          changedKey: changedKey,
          original: originalHexagram,
          changed: changedHexagram,
          changingLines,
        },
        isSaved: true,
      }

      const resultId = `db-${record.id}`
      const storedResult: StoredResultWithId = { ...payload, id: resultId, createdAt: fullRecord.created_at }

      const resultsListStr = localStorage.getItem(RESULTS_LIST_STORAGE_KEY)
      let resultsList: StoredResultWithId[] = []
      if (resultsListStr) {
        try { resultsList = JSON.parse(resultsListStr) } catch (e) { resultsList = [] }
      }
      
      resultsList = resultsList.filter(r => r.id !== resultId)
      resultsList.unshift(storedResult)
      localStorage.setItem(RESULTS_LIST_STORAGE_KEY, JSON.stringify(resultsList))
      localStorage.setItem('latestDivinationResult', JSON.stringify(payload))

      router.push(`/6yao/${resultId}`)
    } catch (error) {
      toast({ title: '加载失败', description: '请稍后重试', variant: 'destructive' })
    }
  }

  // Delete handlers... (省略，保持不变)
  const handleDeleteClick = (id: string) => { setRecordToDelete(id); setDeleteDialogOpen(true) }
  const handleConfirmDelete = async () => { /* ... */ }
  const handleDeletePostClick = (id: string) => { setPostToDelete(id); setDeletePostDialogOpen(true) }
  const handleConfirmDeletePost = async () => { 
      if (!postToDelete) return
      setDeletingPost(true)
      try {
        await deletePost(postToDelete)
        setUserPosts(prev => prev.filter(p => p.id !== postToDelete))
        toast({ title: '删除成功', variant: 'default' })
      } catch (error) {
        toast({ title: '删除失败', variant: 'destructive' })
      } finally {
        setDeletingPost(false); setDeletePostDialogOpen(false); setPostToDelete(null)
      }
  }
  const handleEditPost = (id: string) => router.push(`/community/publish?id=${id}`)

  if (loading) return <ProfileSkeleton />
  if (!profile) return null

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen profile-bg font-sans text-stone-800 pb-20">
        
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 relative z-10">
          
          {/* 1. 顶部身份卡片 (重构版) */}
          <div className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden group">
            {/* 装饰背景 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-amber-50 to-transparent rounded-bl-full opacity-60 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-linear-to-tr from-stone-100 to-transparent rounded-tr-full opacity-40 pointer-events-none" />

            <div className="flex flex-col md:flex-row gap-8 relative z-10">
              {/* 头像与等级 */}
              <div className="flex flex-col items-center shrink-0 gap-3">
                <div className="relative group/avatar">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-lg cursor-pointer transition-transform hover:scale-105">
                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-stone-100 text-stone-400 text-3xl font-serif">
                      {profile.nickname?.charAt(0) || '易'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-stone-800 text-[#FDFBF7] px-2.5 py-0.5 rounded-full text-[10px] font-bold border-2 border-white shadow-sm whitespace-nowrap">
                    Lv.{growth?.level ?? 1}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Badge variant="secondary" className="bg-amber-100/50 text-amber-700 hover:bg-amber-100 border-amber-200">
                     {growth?.titleName ?? '白身'}
                   </Badge>
                </div>
              </div>

              {/* 用户信息与数据 */}
              <div className="flex-1 min-w-0 pt-2 text-center md:text-left">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-stone-800 font-serif mb-2 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                      {profile.nickname || '未命名研习者'}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-stone-600" onClick={() => setEditDialogOpen(true)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Badge variant="outline" className="text-xs font-mono bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100">
                        修业值 {growth?.exp ?? 0}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpRulesDialogOpen(true)}
                        className="text-[10px] h-6 px-2 text-stone-400 hover:text-stone-600"
                      >
                        <HelpCircle className="w-3 h-3 mr-1" />
                        规则
                      </Button>
                    </h1>
                    <p className="text-stone-500 text-sm italic max-w-lg mx-auto md:mx-0 leading-relaxed">
                      &ldquo;{profile.motto || '君子居则观其象而玩其辞，动则观其变而玩其占。'}&rdquo;
                    </p>
                  </div>
                  
                  {/* 签到与设置 */}
                  <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-center md:justify-end">
                    <Button 
                      className={`rounded-full px-6 shadow-md transition-all ${
                        hasCheckedIn 
                          ? 'bg-stone-100 text-stone-400 hover:bg-stone-200' 
                          : 'bg-[#C82E31] text-white hover:bg-[#B02629] hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                      onClick={handleCheckIn}
                      disabled={hasCheckedIn || checkingIn}
                    >
                      <CalendarCheck className="w-4 h-4 mr-2" />
                      {checkingIn ? '...' : hasCheckedIn ? '已签到' : '签到'}
                    </Button>
                    {/* <Button variant="outline" size="icon" className="rounded-full border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-white">
                      <Settings className="w-4 h-4" />
                    </Button> */}
                  </div>
                </div>

                {/* 核心数据指标 */}
                <div className="grid grid-cols-4 gap-4 border-t border-stone-100 pt-6 mt-6">
                  {[
                    { 
                      label: '已关注', 
                      value: followStats.followingCount, 
                      icon: null,
                      onClick: () => {
                        setActiveMainTab('follows')
                        setFollowTab('following')
                        if (followingUsers.length === 0) {
                          loadFollowsData('following')
                        }
                        // 滚动到 tabs 位置
                        setTimeout(() => {
                          tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 100)
                      }
                    },
                    { 
                      label: '关注者', 
                      value: followStats.followersCount, 
                      icon: null,
                      onClick: () => {
                        setActiveMainTab('follows')
                        setFollowTab('followers')
                        if (followersUsers.length === 0) {
                          loadFollowsData('followers')
                        }
                        // 滚动到 tabs 位置
                        setTimeout(() => {
                          tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 100)
                      }
                    },
                    { 
                      label: '获赞', 
                      value: stats.likesReceived, 
                      icon: null,
                      onClick: undefined
                    },
                    { 
                      label: '易币', 
                      value: growth?.yiCoins ?? 0, 
                      icon: <Coins className="w-3.5 h-3.5 text-amber-500 inline mr-1 -mt-0.5" />,
                      onClick: () => {
                        setActiveMainTab('wallet')
                        // 滚动到 tabs 位置
                        setTimeout(() => {
                          tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 100)
                      }
                    },
                  ].map((item, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col items-center md:items-start group/stat transition-colors ${
                        item.onClick ? 'cursor-pointer' : 'cursor-default'
                      }`}
                      onClick={item.onClick}
                    >
                      <span className="text-2xl font-bold font-mono text-stone-800 group-hover/stat:text-[#C82E31] transition-colors">
                        {item.value}
                      </span>
                      <span className="text-xs text-stone-400 mt-1 flex items-center">
                        {item.icon} {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. 统计概览 (Grid Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 准确率环形图 */}
            <Card className="glass-card rounded-xl border-none shadow-sm hover:shadow-md transition-all md:col-span-1">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <CircularProgress 
                  value={stats.accuracyRate} 
                  label="实证准确率" 
                  totalVerified={stats.verifiedCases}
                />
              </CardContent>
            </Card>

            {/* 功能入口 */}
            <StatCard 
              icon={<BookOpen size={20} />} 
              value={stats.publishedCases} 
              label="发布案例" 
              colorClass="text-[#C82E31] bg-red-50 rounded-xl"
              onClick={() => router.push('/6yao')}
              isEmpty={stats.publishedCases === 0}
              actionText="去排盘"
            />
            <StatCard 
              icon={<TrendingUp size={20} />} 
              value={stats.participatedDeductions} 
              label="参与推演" 
              colorClass="text-blue-600 bg-blue-50 rounded-xl"
              onClick={() => router.push('/community')}
              isEmpty={stats.participatedDeductions === 0}
              actionText="去社区"
            />
            <StatCard 
              icon={<Award size={20} />} 
              value={growth?.reputation ?? 0} 
              label="声望值" 
              colorClass="text-amber-600 bg-amber-50 rounded-xl"
              isEmpty={false}
            />
          </div>

          {/* 3. 修业日课 (热力图) */}
            <ActivityHeatmap 
              totalActivity={stats.publishedCases + stats.participatedDeductions} 
              activityData={activityData}
            />

          {/* 4. 内容选项卡 (Tabs) */}
          <div ref={tabsRef}>
            <Tabs value={activeMainTab} onValueChange={async (value) => {
              setActiveMainTab(value as 'notes' | 'divinations' | 'follows' | 'wallet')
              if (value === 'follows') {
                // 切换到关注 tab 时，根据当前子 tab 加载数据
                if (followTab === 'following' && followingUsers.length === 0) {
                  loadFollowsData('following')
                } else if (followTab === 'followers' && followersUsers.length === 0) {
                  loadFollowsData('followers')
                }
              } else if (value === 'wallet') {
                // 切换到易币明细 tab 时，刷新交易记录
                try {
                  const transactions = await getCoinTransactions(100)
                  setCoinTransactions(transactions)
                } catch (error) {
                  console.error('Error refreshing coin transactions:', error)
                }
              }
            }} className="w-full">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-stone-200 mb-6">
              {['notes', 'divinations', 'follows', 'wallet'].map((tab) => (
                <TabsTrigger 
                  key={tab}
                  value={tab} 
                  className="nav-tab-trigger rounded-none border-b-2 border-transparent px-6 py-3 text-stone-500 font-medium text-base hover:text-stone-800 transition-colors bg-transparent data-[state=active]:bg-transparent cursor-pointer"
                >
                  {tab === 'notes' && '我的帖子'}
                  {tab === 'divinations' && '排盘记录'}
                  {tab === 'follows' && '关注'}
                  {tab === 'wallet' && '易币明细'}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 帖子 Tab */}
            <TabsContent value="notes" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex bg-stone-100/50 p-1 rounded-lg">
                  {[
                    { id: 'mine', label: '我的发布' },
                    { id: 'fav', label: '我的收藏' },
                    { id: 'liked', label: '我赞过的' },
                  ].map(tab => (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      onClick={() => setPostTab(tab.id as 'mine' | 'fav' | 'liked')}
                      className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all h-auto ${
                        postTab === tab.id 
                          ? 'bg-white text-stone-800 shadow-sm' 
                          : 'text-stone-500 hover:text-stone-700'
                      }`}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 帖子列表渲染逻辑 */}
              {userPosts.length > 0 ? (
                <div className="space-y-4">
                  {userPosts.map(post => {
                    // 判断是否为求测帖子
                    const isHelp = 
                      ((post.type || post.section || 'chat') as 'help' | 'theory' | 'debate' | 'chat') === 'help' ||
                      !!post.divination_record_id ||
                      (post.bounty && post.bounty > 0)

                    // 从HTML中提取纯文本摘要
                    const extractTextFromHTML = (html: string, maxLength: number = 100): string => {
                      if (!html) return ''
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

                    // 针对求测帖：去掉"关联排盘/问题"等前缀，只保留背景描述
                    const extractHelpBackground = (html: string, maxLength: number = 100): string => {
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
                        .join(' ')
                        .trim()
                      if (text.length > maxLength) {
                        return text.substring(0, maxLength) + '...'
                      }
                      return text
                    }

                    const rawContent = post.content_html || post.content || ''
                    const excerpt = isHelp 
                      ? extractHelpBackground(rawContent, 100)
                      : extractTextFromHTML(rawContent, 100)

                    // 获取卦象信息
                    const guaInfo = post.divination_record ? {
                      guaName: post.divination_record.original_key === '111111' ? '乾为天' : 
                               post.divination_record.original_key === '000000' ? '坤为地' : 
                               '卦象',
                      lines: post.divination_record.lines?.map((line: string) => 
                        line === '-----' || line === '---O---'
                      ) as boolean[] | undefined,
                      changingLines: post.divination_record.changing_flags?.map((flag: boolean, index: number) => 
                        flag ? index + 1 : null
                      ).filter((x: number | null): x is number => x !== null) || [],
                    } : null

                    return (
                      <div key={post.id} className="relative group">
                        <PostCard 
                          post={{
                            id: post.id,
                            type: (post.type || post.section || 'chat') as 'help' | 'theory' | 'debate' | 'chat',
                            author: {
                              name: post.author?.nickname || profile.nickname || '未知用户',
                              avatar: post.author?.avatar_url || profile.avatar_url || '',
                              level: growth?.level || 1,
                              isVerified: false,
                            },
                            title: isHelp ? `求测：${post.title}` : post.title,
                            excerpt,
                            tags: [],
                            bounty: post.bounty,
                            coverImage: post.cover_image_url || undefined,
                            stats: {
                              likes: post.like_count || 0,
                              comments: post.comment_count || 0,
                              views: post.view_count || 0,
                            },
                            time: new Date(post.created_at).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            }),
                            hasGua: !!post.divination_record,
                            guaName: guaInfo?.guaName,
                            lines: guaInfo?.lines,
                            changingLines: guaInfo?.changingLines,
                            isLiked: post.is_liked,
                          }} 
                        />
                      {/* 编辑/删除按钮 */}
                      {postTab === 'mine' && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 shadow-sm hover:text-blue-600" onClick={() => handleEditPost(post.id)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 shadow-sm hover:text-red-600" onClick={() => handleDeletePostClick(post.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                  <p className="text-stone-400 text-sm">暂无内容，去<span className="text-[#C82E31] cursor-pointer hover:underline" onClick={() => router.push('/community/publish')}>发布</span>第一篇帖子吧</p>
                </div>
              )}
            </TabsContent>

            {/* 排盘记录 Tab */}
            <TabsContent value="divinations" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {divinationRecords.map((record) => (
                  <div 
                    key={record.id}
                    onClick={() => handleRecordClick(record)}
                    className="group bg-white border border-stone-100 p-4 rounded-xl cursor-pointer hover:border-[#C82E31]/30 hover:shadow-md transition-all relative overflow-hidden"
                  >
                    <div className="absolute right-0 top-0 w-20 h-20 bg-stone-50 rounded-bl-[4rem] -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-stone-400 font-mono bg-stone-50 px-2 py-0.5 rounded-full">
                          {new Date(record.created_at).toLocaleDateString()}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 -mr-2 -mt-2 text-stone-300 hover:text-red-500 hover:bg-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(record.id)
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <h4 className="font-bold text-stone-800 mb-1 group-hover:text-[#C82E31] transition-colors line-clamp-1">
                        {record.question || '无题排盘'}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span>{record.method === 1 ? '金钱课' : '时间起卦'}</span>
                        <span className="w-px h-3 bg-stone-200" />
                        <span>{record.original_key ? '已成卦' : '未成卦'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* 关注 Tab */}
            <TabsContent value="follows" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex bg-stone-100/50 p-1 rounded-lg">
                    {[
                      { id: 'following', label: '我关注的' },
                      { id: 'followers', label: '关注我的' },
                    ].map(tab => (
                      <Button
                        key={tab.id}
                        variant="ghost"
                        onClick={() => {
                          const newTab = tab.id as 'following' | 'followers'
                          setFollowTab(newTab)
                          if ((newTab === 'following' && followingUsers.length === 0) || 
                              (newTab === 'followers' && followersUsers.length === 0)) {
                            loadFollowsData(newTab)
                          }
                        }}
                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all h-auto ${
                          followTab === tab.id 
                            ? 'bg-white text-stone-800 shadow-sm' 
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                      >
                        {tab.label}
                        {tab.id === 'following' && (
                          <span className="ml-1.5 text-[10px] font-normal text-stone-400 font-mono bg-stone-50 px-1 py-0.5 rounded">
                            {followStats.followingCount}
                          </span>
                        )}
                        {tab.id === 'followers' && (
                          <span className="ml-1.5 text-[10px] font-normal text-stone-400 font-mono bg-stone-50 px-1 py-0.5 rounded">
                            {followStats.followersCount}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {followTab === 'following' && (
                  <div className="space-y-4">
                  {loadingFollows ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-6 w-6 animate-spin text-[#C0392B]" />
                    </div>
                  ) : followingUsers.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-dashed border-stone-200 rounded-xl">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-50 mb-3">
                        <Users className="w-6 h-6 text-stone-300" />
                      </div>
                      <p className="text-stone-400">还没有关注任何人</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => router.push('/community')}
                      >
                        去社区看看
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {followingUsers.map((user) => (
                        <UserCard key={user.id} user={user} onUnfollow={handleUnfollow} />
                      ))}
                    </div>
                  )}
                </div>
                )}

                {followTab === 'followers' && (
                  <div className="space-y-4">
                    {loadingFollows ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-[#C0392B]" />
                      </div>
                    ) : followersUsers.length === 0 ? (
                      <div className="text-center py-20 bg-white border border-dashed border-stone-200 rounded-xl">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-50 mb-3">
                          <Users className="w-6 h-6 text-stone-300" />
                        </div>
                        <p className="text-stone-400">还没有人关注你</p>
                        <p className="text-xs text-stone-400 mt-2">多发布内容，吸引更多关注</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {followersUsers.map((user) => (
                          <UserCard key={user.id} user={user} showFollowButton={true} onFollowChange={handleFollowChange} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 钱包明细 Tab (简单展示) */}
            <TabsContent value="wallet">
              <div className="space-y-4">
                {/* 头部：标题和查看规则按钮 */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-stone-600">交易记录</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCoinRulesDialogOpen(true)}
                    className="text-xs h-8"
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                    查看易币规则
                  </Button>
                </div>

                {/* 交易记录列表或空状态 */}
                {coinTransactions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-stone-200 text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-50 mb-4">
                      <Coins className="w-8 h-8 text-stone-300" />
                    </div>
                    <p className="text-stone-400 mb-2">暂无易币交易记录</p>
                    <p className="text-xs text-stone-400 mb-4">完成签到、发布内容等任务可获得易币</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCoinRulesDialogOpen(true)}
                      className="text-xs"
                    >
                      <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                      查看如何获得易币
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
                    {coinTransactions.map((t, i) => {
                      const isPositive = t.amount > 0
                      const date = new Date(t.created_at)
                      const formattedDate = date.toLocaleDateString('zh-CN', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                      
                      // 格式化类型显示
                      const getTypeLabel = (type: string) => {
                        const typeMap: Record<string, string> = {
                          'check_in': '每日签到',
                          'checkin': '每日签到', // 兼容旧数据
                          'post': '发布帖子',
                          'comment': '发表评论',
                          'like': '点赞',
                          'divination': '排盘记录',
                          'task': '完成任务',
                          'reward': '奖励',
                          'consume': '消费',
                          'refund': '退款',
                        }
                        return typeMap[type] || type
                      }

                      return (
                        <div 
                          key={t.id} 
                          className={`p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors ${
                            i !== coinTransactions.length - 1 ? 'border-b border-stone-50' : ''
                          }`}
                        >
                          {/* 图标 */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isPositive ? 'bg-green-50' : 'bg-stone-100'
                          }`}>
                            {isPositive ? (
                              <ArrowUp className={`w-5 h-5 ${isPositive ? 'text-green-600' : 'text-stone-400'}`} />
                            ) : (
                              <ArrowDown className="w-5 h-5 text-stone-400" />
                            )}
                          </div>

                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-stone-800 mb-0.5">
                              {t.description || getTypeLabel(t.type)}
                            </div>
                            <div className="text-xs text-stone-400">{formattedDate}</div>
                          </div>

                          {/* 金额 */}
                          <div className={`font-mono font-bold text-lg shrink-0 ${
                            isPositive ? 'text-[#C82E31]' : 'text-stone-600'
                          }`}>
                            {isPositive ? '+' : ''}{t.amount}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          </div>

        </div>

        {/* Dialogs (Edit, Delete, etc.) - 保持原有逻辑 */}
        <EditProfileDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} profile={profile} onUpdate={() => window.location.reload()} />
        
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader><DialogTitle>确认删除</DialogTitle><DialogDescription>此操作不可恢复，确定要删除这条记录吗？</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>{deleting ? '删除中...' : '确认删除'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deletePostDialogOpen} onOpenChange={setDeletePostDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader><DialogTitle>确认删除帖子</DialogTitle><DialogDescription>此操作不可恢复。</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletePostDialogOpen(false)}>取消</Button>
              <Button variant="destructive" onClick={handleConfirmDeletePost} disabled={deletingPost}>{deletingPost ? '删除中...' : '确认删除'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 易币规则对话框 */}
        <Dialog open={coinRulesDialogOpen} onOpenChange={setCoinRulesDialogOpen}>
          <DialogContent className="bg-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                易币规则说明
              </DialogTitle>
              <DialogDescription>了解如何获得和使用易币</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 什么是易币 */}
              <div>
                <h4 className="text-base font-bold text-stone-800 mb-2">什么是易币？</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  易币是平台内的虚拟货币，可用于参与社区活动、获取高级功能等。通过完成日常任务和参与社区互动可以获得易币。
                </p>
              </div>

              {/* 如何获得易币 */}
              <div>
                <h4 className="text-base font-bold text-stone-800 mb-3">如何获得易币？</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-700">1</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-800 mb-1">每日签到</div>
                      <div className="text-xs text-stone-600">每天首次签到可获得易币奖励，连续签到有额外奖励</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-700">2</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-800 mb-1">发布内容</div>
                      <div className="text-xs text-stone-600">发布帖子、排盘记录等优质内容可获得易币奖励</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-700">3</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-800 mb-1">参与互动</div>
                      <div className="text-xs text-stone-600">评论、点赞、帮助他人等互动行为可获得易币</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-700">4</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-800 mb-1">完成任务</div>
                      <div className="text-xs text-stone-600">完成平台任务、参与活动可获得易币奖励</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 易币用途 */}
              <div>
                <h4 className="text-base font-bold text-stone-800 mb-3">易币用途</h4>
                <ul className="space-y-2 text-sm text-stone-600">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>参与社区悬赏问答</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>解锁高级功能和服务</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>兑换平台权益和礼品</span>
                  </li>
                </ul>
              </div>

              {/* 注意事项 */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="text-sm font-semibold text-amber-800 mb-2">注意事项</h4>
                <ul className="space-y-1 text-xs text-amber-700">
                  <li>• 易币不可转让或提现</li>
                  <li>• 易币余额长期有效，不会过期</li>
                  <li>• 请遵守平台规则，违规行为可能导致易币扣除</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setCoinRulesDialogOpen(false)}>我知道了</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 经验值规则对话框 */}
        <Dialog open={expRulesDialogOpen} onOpenChange={setExpRulesDialogOpen}>
          <DialogContent className="bg-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#C82E31]" />
                修业值（经验值）规则说明
              </DialogTitle>
              <DialogDescription>了解如何获得修业值和等级提升</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 什么是修业值 */}
              <div>
                <h4 className="text-base font-bold text-stone-800 mb-2">什么是修业值？</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  修业值（经验值）是衡量你在易学道路上修行进度的指标。通过完成各种任务和活动可以获得修业值，积累修业值可以提升等级，解锁更多功能和权益。
                </p>
              </div>

              {/* 如何获得修业值 */}
              <div>
                <h4 className="text-base font-bold text-stone-800 mb-3">如何获得修业值？</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-red-700">1</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-800 mb-1">每日签到</div>
                      <div className="text-xs text-stone-600">每天首次签到可获得 +10 修业值，连续签到7天额外获得 +50 修业值</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-red-700">2</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-800 mb-1">浏览内容</div>
                      <div className="text-xs text-stone-600">浏览帖子、排盘记录等内容可获得 +5 修业值</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-red-700">3</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-800 mb-1">点赞互动</div>
                      <div className="text-xs text-stone-600">为他人内容点赞可获得 +2 修业值</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-red-700">4</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-800 mb-1">发布案例</div>
                      <div className="text-xs text-stone-600">发布排盘记录可获得 +20 修业值</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-red-700">5</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-800 mb-1">发表断语</div>
                      <div className="text-xs text-stone-600">在社区发表推演断语可获得 +10 修业值</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 等级说明 */}
              <div>
                <h4 className="text-base font-bold text-stone-800 mb-3">等级体系</h4>
                <div className="space-y-2 text-sm text-stone-600">
                  <div className="flex items-start gap-2">
                    <span className="text-[#C82E31] mt-1">•</span>
                    <span><strong>Lv.0 游客</strong> - 0 修业值</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#C82E31] mt-1">•</span>
                    <span><strong>Lv.1 初涉易途</strong> - 1 修业值（灰边框）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#C82E31] mt-1">•</span>
                    <span><strong>Lv.2 登堂入室</strong> - 100 修业值（铜边框）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#C82E31] mt-1">•</span>
                    <span><strong>Lv.3 渐入佳境</strong> - 500 修业值（银边框）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#C82E31] mt-1">•</span>
                    <span><strong>Lv.4 触类旁通</strong> - 2000 修业值（银边框+流光）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#C82E31] mt-1">•</span>
                    <span><strong>Lv.5 融会贯通</strong> - 5000 修业值（金边框）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#C82E31] mt-1">•</span>
                    <span><strong>Lv.6 出神入化</strong> - 10000 修业值（金边框+纹饰）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#C82E31] mt-1">•</span>
                    <span><strong>Lv.7 一代宗师</strong> - 20000 修业值（动态特效边框）</span>
                  </div>
                </div>
              </div>

              {/* 注意事项 */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-semibold text-red-800 mb-2">注意事项</h4>
                <ul className="space-y-1 text-xs text-red-700">
                  <li>• 修业值不可转让或交易</li>
                  <li>• 修业值永久有效，不会过期</li>
                  <li>• 等级提升后不可降级</li>
                  <li>• 请遵守平台规则，违规行为可能导致修业值扣除</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setExpRulesDialogOpen(false)}>我知道了</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </>
  )
}

// 用户卡片组件
interface UserCardProps {
  user: UserProfile
  onUnfollow?: (userId: string) => void
  showFollowButton?: boolean
  onFollowChange?: () => void
}

const UserCard = ({ user, onUnfollow, showFollowButton = false, onFollowChange }: UserCardProps) => {
  const { toast } = useToast()
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const userLevel = calculateLevel(user.exp || 0)
  const titleName = getTitleName(user.title_level || 1)

  useEffect(() => {
    getCurrentUser().then(setCurrentUser)
  }, [])

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (showFollowButton) {
        try {
          const { isFollowingUser } = await import('@/lib/services/profile')
          const status = await isFollowingUser(user.id)
          setIsFollowing(status)
        } catch (error) {
          console.error('Error checking follow status:', error)
        }
      }
    }
    checkFollowStatus()
  }, [user.id, showFollowButton])

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLoading) return

    try {
      setIsLoading(true)
      const { toggleFollowUser } = await import('@/lib/services/profile')
      const newStatus = await toggleFollowUser(user.id)
      setIsFollowing(newStatus)
      if (onFollowChange) {
        onFollowChange()
      }
      toast({ 
        title: newStatus ? '已关注' : '已取消关注',
        description: newStatus ? `现在可以查看 ${user.nickname || '该用户'} 的动态了` : ''
      })
    } catch (error) {
      console.error('Error toggling follow:', error)
      const errorMessage = error instanceof Error ? error.message : '操作失败'
      toast({ title: '操作失败', description: errorMessage, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnfollowClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onUnfollow) {
      onUnfollow(user.id)
    }
  }

  const handleMessageClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!currentUser) {
      toast({ title: '请先登录', variant: 'destructive' })
      router.push(`/login?redirect=${encodeURIComponent(`/messages?userId=${user.id}`)}`)
      return
    }
    if (currentUser.id === user.id) {
      toast({ title: '不能给自己发私信', variant: 'destructive' })
      return
    }
    router.push(`/messages?userId=${user.id}`)
  }

  return (
    <Link href={`/u/${user.id}`} className="block group">
      <Card className="bg-white border border-stone-200 hover:border-[#C82E31]/30 hover:shadow-md transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-[#C82E31]/20 transition-all">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback className="bg-stone-100 text-stone-400 font-serif">
                {user.nickname?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-stone-800 group-hover:text-[#C82E31] transition-colors truncate">
                  {user.nickname || '未命名用户'}
                </h3>
                <Badge className="text-[10px] bg-stone-800 text-white px-1.5 py-0.5 rounded font-mono">
                  Lv.{userLevel}
                </Badge>
                {titleName && (
                  <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                    {titleName}
                  </Badge>
                )}
              </div>
              {user.motto && (
                <p className="text-xs text-stone-500 line-clamp-1 font-serif italic">{user.motto}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {currentUser && currentUser.id !== user.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-stone-200 text-stone-600 hover:bg-stone-50"
                  onClick={handleMessageClick}
                  title="发送私信"
                >
                  <MessageSquare size={12} className="mr-1" />
                </Button>
              )}
              {onUnfollow ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={handleUnfollowClick}
                >
                  取消关注
                </Button>
              ) : showFollowButton ? (
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  size="sm"
                  className={`text-xs h-8 ${isFollowing ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'bg-[#C0392B] text-white hover:bg-[#A93226]'}`}
                  onClick={handleFollowToggle}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isFollowing ? (
                    '已关注'
                  ) : (
                    <>
                      <UserPlus size={12} className="mr-1" /> 关注
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}