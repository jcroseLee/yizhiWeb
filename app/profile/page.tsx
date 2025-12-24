'use client'

import {
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  Coins,
  Edit2,
  HelpCircle,
  Loader2,
  Trash2,
  TrendingUp,
  Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import PostCard, { extractHelpBackground, extractTextFromHTML, getGuaInfo } from '@/app/community/components/PostCard'
import { EditProfileDialog } from '@/lib/components/EditProfileDialog'
import { ToastProviderWrapper } from '@/lib/components/ToastProviderWrapper'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/lib/components/ui/tabs'
import { RESULTS_LIST_STORAGE_KEY, type StoredDivinationPayload, type StoredResultWithId } from '@/lib/constants/divination'
import { getHexagramResult } from '@/lib/constants/hexagrams'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import { deleteDraft, deletePost, getUserDrafts, getUserFavoritePosts, getUserLikedPosts, getUserPosts, type Post } from '@/lib/services/community'
import {
  calculateLevel,
  checkIn,
  getCoinTransactions,
  getTitleName,
  getUserGrowth,
  hasCheckedInToday,
  type CoinTransaction
} from '@/lib/services/growth'
import { deleteDivinationRecord, deleteDivinationRecords, getDailyActivityData, getDivinationRecordById, getFollowersUsers, getFollowingUsers, getUserDivinationRecords, getUserFollowStats, getUserProfileWithGrowth, getUserStats, toggleFollowUser, type DivinationRecord, type UserFollowStats, type UserProfile, type UserStats } from '@/lib/services/profile'
import { ActivityHeatmap } from './components/ActivityHeatmap'
import { CircularProgress } from './components/CircularProgress'
import { CoinRulesDialog } from './components/CoinRulesDialog'
import { DeletePostDialog } from './components/DeletePostDialog'
import { DeleteRecordDialog } from './components/DeleteRecordDialog'
import { ExpRulesDialog } from './components/ExpRulesDialog'
import ProfileSkeleton from './components/ProfileSkeleton'
import { StatCard } from './components/StatCard'
import { UserCard } from './components/UserCard'

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

// -----------------------------------------------------------------------------
// 工具函数
// -----------------------------------------------------------------------------


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
  const [draftPosts, setDraftPosts] = useState<Post[]>([])
  const [postTab, setPostTab] = useState<'mine' | 'fav' | 'liked' | 'draft'>('mine')
  const [loadingPosts, setLoadingPosts] = useState(false)
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
  // 使用 ref 追踪已加载的 tab，避免重复请求
  const loadedTabsRef = useRef<Set<'fav' | 'liked' | 'draft'>>(new Set())
  // 批量删除排盘记录的状态
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

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
        
        // 预加载收藏、点赞和草稿的帖子
        try {
          const [favPosts, likedPostsData, draftsData] = await Promise.all([
            getUserFavoritePosts({ limit: 50 }),
            getUserLikedPosts({ limit: 50 }),
            getUserDrafts({ limit: 50 })
          ])
          setFavoritePosts(favPosts)
          setLikedPosts(likedPostsData)
          setDraftPosts(draftsData)
          // 标记这些 tab 已加载
          loadedTabsRef.current.add('fav')
          loadedTabsRef.current.add('liked')
          loadedTabsRef.current.add('draft')
        } catch (error) {
          console.error('Error loading favorite/liked/draft posts:', error)
          // 出错时设置为空数组，防止 useEffect 无限重试
          setFavoritePosts([])
          setLikedPosts([])
          setDraftPosts([])
          // 即使出错也标记为已加载，避免重试
          loadedTabsRef.current.add('fav')
          loadedTabsRef.current.add('liked')
          loadedTabsRef.current.add('draft')
        }
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

  // 当切换帖子标签时自动加载
  useEffect(() => {
    const loadPostsForTab = async () => {
      // 如果是 mine tab，不需要加载（在初始化时已加载）
      if (postTab === 'mine') return
      
      // 检查是否已经加载过或正在加载
      if (loadingPosts || loadedTabsRef.current.has(postTab)) return
      
      // 检查是否已有数据
      const hasData = 
        (postTab === 'fav' && favoritePosts.length > 0) ||
        (postTab === 'liked' && likedPosts.length > 0) ||
        (postTab === 'draft' && draftPosts.length > 0)
      
      if (hasData) {
        loadedTabsRef.current.add(postTab)
        return
      }

      setLoadingPosts(true)
      try {
        if (postTab === 'fav') {
          const posts = await getUserFavoritePosts({ limit: 50 })
          setFavoritePosts(posts)
          loadedTabsRef.current.add('fav')
        } else if (postTab === 'liked') {
          const posts = await getUserLikedPosts({ limit: 50 })
          setLikedPosts(posts)
          loadedTabsRef.current.add('liked')
        } else if (postTab === 'draft') {
          const posts = await getUserDrafts({ limit: 50 })
          setDraftPosts(posts)
          loadedTabsRef.current.add('draft')
        }
      } catch (error) {
        console.error('Error loading posts:', error)
        toast({ title: '加载失败', variant: 'destructive' })
      } finally {
        setLoadingPosts(false)
      }
    }
    loadPostsForTab()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postTab])

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

      // 确保从数据库读取的 key 格式正确
      const originalKey = String(fullRecord.original_key).replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
      const changedKey = String(fullRecord.changed_key).replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
      
      // 始终根据 key 重新计算 hexagram，确保顺序正确
      // 这样可以避免数据库中 JSON 数据顺序可能反了的问题
      const originalHexagram = getHexagramResult(originalKey)
      const changedHexagram = getHexagramResult(changedKey)
      
      // 如果数据库中有保存的 JSON 数据，可以用于补充信息（如 interpretation），但卦名以 key 计算为准
      // 这样可以确保 original 和 changed 的顺序与 key 一致

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
        try { resultsList = JSON.parse(resultsListStr) } catch { resultsList = [] }
      }
      
      resultsList = resultsList.filter(r => r.id !== resultId)
      resultsList.unshift(storedResult)
      localStorage.setItem(RESULTS_LIST_STORAGE_KEY, JSON.stringify(resultsList))
      localStorage.setItem('latestDivinationResult', JSON.stringify(payload))

      router.push(`/6yao/${resultId}?from=profile`)
    } catch {
      toast({ title: '加载失败', description: '请稍后重试', variant: 'destructive' })
    }
  }

  // Delete handlers
  const handleDeleteClick = (id: string) => { setRecordToDelete(id); setDeleteDialogOpen(true) }
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return
    setDeleting(true)
    try {
      const result = await deleteDivinationRecord(recordToDelete)
      if (result.success) {
        setDivinationRecords(prev => prev.filter(r => r.id !== recordToDelete))
        toast({ title: '删除成功', variant: 'default' })
      } else {
        toast({ title: '删除失败', description: result.message, variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  // 批量删除处理函数
  const handleToggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    setSelectedRecordIds(new Set())
  }

  const handleToggleSelectRecord = (recordId: string) => {
    setSelectedRecordIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedRecordIds.size === divinationRecords.length) {
      setSelectedRecordIds(new Set())
    } else {
      setSelectedRecordIds(new Set(divinationRecords.map(r => r.id)))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRecordIds.size === 0) {
      toast({ title: '请选择要删除的记录', variant: 'destructive' })
      return
    }

    setBatchDeleting(true)
    try {
      const result = await deleteDivinationRecords(Array.from(selectedRecordIds))
      
      if (result.success) {
        // 从列表中移除已删除的记录
        setDivinationRecords(prev => prev.filter(r => !selectedRecordIds.has(r.id) || result.failedIds.includes(r.id)))
        setSelectedRecordIds(new Set())
        setIsSelectMode(false)
        
        toast({ 
          title: result.message,
          variant: result.failedIds.length > 0 ? 'default' : 'default'
        })
      } else {
        toast({ title: '删除失败', description: result.message, variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error batch deleting records:', error)
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setBatchDeleting(false)
    }
  }
  const handleDeletePostClick = (id: string) => { setPostToDelete(id); setDeletePostDialogOpen(true) }
  const handleConfirmDeletePost = async () => { 
      if (!postToDelete) return
      setDeletingPost(true)
      try {
        // 检查是否是草稿
        const isDraft = draftPosts.some(p => p.id === postToDelete)
        
        if (isDraft) {
          // 删除草稿
          await deleteDraft(postToDelete)
          setDraftPosts(prev => prev.filter(p => p.id !== postToDelete))
          toast({ title: '草稿已删除', variant: 'default' })
        } else {
          // 删除已发布的帖子
          await deletePost(postToDelete)
          setUserPosts(prev => prev.filter(p => p.id !== postToDelete))
          setFavoritePosts(prev => prev.filter(p => p.id !== postToDelete))
          setLikedPosts(prev => prev.filter(p => p.id !== postToDelete))
          toast({ title: '删除成功', variant: 'default' })
        }
      } catch {
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
              onClick={() => router.push('/6yao?from=profile')}
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
                    { id: 'draft', label: '我的草稿' },
                  ].map(tab => (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      onClick={() => setPostTab(tab.id as 'mine' | 'fav' | 'liked' | 'draft')}
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

              {/* 根据当前标签显示对应的帖子列表 */}
              {(() => {
                const currentPosts = postTab === 'mine' ? userPosts 
                  : postTab === 'fav' ? favoritePosts 
                  : postTab === 'liked' ? likedPosts 
                  : draftPosts
                const isEmpty = currentPosts.length === 0
                const emptyMessage = 
                  postTab === 'mine' ? '暂无内容，去发布第一篇帖子吧' :
                  postTab === 'fav' ? '还没有收藏任何帖子' :
                  postTab === 'liked' ? '还没有点赞任何帖子' :
                  postTab === 'draft' ? '还没有草稿，去创建第一篇草稿吧' :
                  '暂无内容'

                if (loadingPosts && isEmpty) {
                  return (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-6 w-6 animate-spin text-[#C82E31]" />
                    </div>
                  )
                }

                if (isEmpty) {
                  return (
                    <div className="text-center py-16 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                      <p className="text-stone-400 text-sm">
                        {postTab === 'mine' ? (
                          <>暂无内容，去<span className="text-[#C82E31] cursor-pointer hover:underline" onClick={() => router.push('/community/publish')}>发布</span>第一篇帖子吧</>
                        ) : postTab === 'draft' ? (
                          <>还没有草稿，去<span className="text-[#C82E31] cursor-pointer hover:underline" onClick={() => router.push('/community/publish')}>创建</span>第一篇草稿吧</>
                        ) : (
                          emptyMessage
                        )}
                      </p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    {currentPosts.map(post => {
                    // 判断是否为求测帖子
                    const isHelp = 
                      ((post.type || post.section || 'chat') as 'help' | 'theory' | 'debate' | 'chat') === 'help' ||
                      !!post.divination_record_id ||
                      (post.bounty && post.bounty > 0)

                    // 提取内容摘要
                    const rawContent = post.content_html || post.content || ''
                    const excerpt = isHelp 
                      ? extractHelpBackground(rawContent, 100)
                      : extractTextFromHTML(rawContent, 100)

                    // 获取卦象信息
                    const guaInfo = getGuaInfo(post.divination_record)

                    // 判断是否为草稿
                    const isDraft = post.status === 'draft' || postTab === 'draft'

                    return (
                      <div key={post.id} className="relative group">
                        {/* 草稿标签 */}
                        {isDraft && (
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs text-stone-500 border-stone-300 bg-stone-50">
                              草稿
                            </Badge>
                            <span className="text-xs text-stone-400">
                              更新于 {new Date(post.updated_at).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
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
                              likes: isDraft ? 0 : (post.like_count || 0),
                              comments: isDraft ? 0 : (post.comment_count || 0),
                              views: isDraft ? 0 : (post.view_count || 0),
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
                      {(postTab === 'mine' || postTab === 'draft') && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 bg-white/90 shadow-sm hover:text-blue-600" 
                            onClick={() => handleEditPost(post.id)}
                            title={postTab === 'draft' ? '继续编辑草稿' : '编辑帖子'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 bg-white/90 shadow-sm hover:text-red-600" 
                            onClick={() => handleDeletePostClick(post.id)}
                            title={postTab === 'draft' ? '删除草稿' : '删除帖子'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    )
                  })}
                  </div>
                )
              })()}
            </TabsContent>

            {/* 排盘记录 Tab */}
            <TabsContent value="divinations" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {divinationRecords.length === 0 ? (
                <div className="text-center py-16 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                  <p className="text-stone-400 text-sm">暂无排盘记录，去<span className="text-[#C82E31] cursor-pointer hover:underline" onClick={() => router.push('/6yao')}>排盘</span>开始你的易学之旅吧</p>
                </div>
              ) : (
                <>
                  {/* 批量操作工具栏 */}
                  <div className="flex items-center justify-between mb-6 bg-stone-50/50 p-4 rounded-lg border border-stone-200">
                    <div className="flex items-center gap-3">
                      {isSelectMode ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            className="text-xs h-8"
                          >
                            {selectedRecordIds.size === divinationRecords.length ? '取消全选' : '全选'}
                          </Button>
                          <span className="text-xs text-stone-500">
                            已选择 <span className="font-semibold text-[#C82E31]">{selectedRecordIds.size}</span> / {divinationRecords.length} 条记录
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-stone-600">共 {divinationRecords.length} 条排盘记录</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelectMode ? (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBatchDelete}
                            disabled={selectedRecordIds.size === 0 || batchDeleting}
                            className="text-xs h-8"
                          >
                            {batchDeleting ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                删除中...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                删除 ({selectedRecordIds.size})
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleSelectMode}
                            className="text-xs h-8"
                          >
                            取消
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleToggleSelectMode}
                          className="text-xs h-8"
                        >
                          批量管理
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 排盘记录列表 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {divinationRecords.map((record) => (
                    <div 
                      key={record.id}
                      onClick={(e) => {
                        if (isSelectMode) {
                          e.stopPropagation()
                          handleToggleSelectRecord(record.id)
                        } else {
                          handleRecordClick(record)
                        }
                      }}
                      className={`group bg-white border p-4 rounded-xl cursor-pointer transition-all relative overflow-hidden ${
                        isSelectMode
                          ? selectedRecordIds.has(record.id)
                            ? 'border-[#C82E31] shadow-md bg-red-50/30'
                            : 'border-stone-100 hover:border-stone-200'
                          : 'border-stone-100 hover:border-[#C82E31]/30 hover:shadow-md'
                      }`}
                    >
                      {/* 选择框 */}
                      {isSelectMode && (
                        <div className="absolute left-3 top-3 z-20">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                            selectedRecordIds.has(record.id)
                              ? 'bg-[#C82E31] border-[#C82E31]'
                              : 'bg-white border-stone-300'
                          }`}>
                            {selectedRecordIds.has(record.id) && (
                              <CheckSquare className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      )}

                      <div className="absolute right-0 top-0 w-20 h-20 bg-stone-50 rounded-bl-[4rem] -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                      
                      <div className={`relative z-10 ${isSelectMode ? 'ml-8' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] text-stone-400 font-mono bg-stone-50 px-2 py-0.5 rounded-full">
                            {new Date(record.created_at).toLocaleDateString()}
                          </span>
                          {!isSelectMode && (
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
                          )}
                        </div>
                        <h4 className={`font-bold text-stone-800 mb-1 transition-colors line-clamp-1 ${
                          !isSelectMode && 'group-hover:text-[#C82E31]'
                        }`}>
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
                </>
              )}
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
                        <UserCard key={user.id} user={user} onUnfollow={handleUnfollow} onFollowChange={handleFollowChange} />
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

        {/* Dialogs */}
        <EditProfileDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} profile={profile} onUpdate={() => window.location.reload()} />
        
        <DeleteRecordDialog 
          open={deleteDialogOpen} 
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          deleting={deleting}
        />

        <DeletePostDialog 
          open={deletePostDialogOpen} 
          onOpenChange={setDeletePostDialogOpen}
          onConfirm={handleConfirmDeletePost}
          deleting={deletingPost}
        />

        <CoinRulesDialog 
          open={coinRulesDialogOpen} 
          onOpenChange={setCoinRulesDialogOpen}
        />

        <ExpRulesDialog 
          open={expRulesDialogOpen} 
          onOpenChange={setExpRulesDialogOpen}
        />

      </div>
    </>
  )
}
