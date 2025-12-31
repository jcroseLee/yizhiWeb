'use client'

import {
    ArrowDown,
    ArrowUp,
    Award,
    BookOpen,
    CalendarCheck,
    CheckCircle2,
    CheckSquare,
    Circle,
    Coins,
    Edit2,
    HelpCircle,
    Loader2,
    Trash2,
    TrendingUp,
    Users,
    X
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

import PostCard, { extractTextFromHTML } from '@/app/community/components/PostCard'
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
import { ReportsList } from './components/ReportsList'
import { StatCard } from './components/StatCard'
import { UserCard } from './components/UserCard'

// ... (样式定义保持不变)
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
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`

export default function ProfilePage() {
  return (
    <ToastProviderWrapper>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfilePageContent />
      </Suspense>
    </ToastProviderWrapper>
  )
}

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  // State definitions (保持不变)
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
  const [activeMainTab, setActiveMainTab] = useState<'notes' | 'divinations' | 'follows' | 'wallet' | 'reports'>('notes')
  const tabsRef = useRef<HTMLDivElement>(null)
  const [coinRulesDialogOpen, setCoinRulesDialogOpen] = useState(false)
  const [expRulesDialogOpen, setExpRulesDialogOpen] = useState(false)
  const loadedTabsRef = useRef<Set<'fav' | 'liked' | 'draft'>>(new Set())
  
  // 批量删除相关状态
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  // Handle URL tab param
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['notes', 'divinations', 'follows', 'wallet', 'reports'].includes(tab)) {
      setActiveMainTab(tab as any)
      if (tabsRef.current) {
        tabsRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [searchParams])

  // Data fetching (保持不变)
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
          getCoinTransactions(100),
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
            setGrowth({ level: growthData.level, titleName: growthData.titleName, yiCoins: growthData.yiCoins, exp: growthData.exp, reputation: growthData.reputation })
            setHasCheckedIn(await hasCheckedInToday(growthData.lastCheckinDate))
          }
        }
        setStats(statsData)
        setUserPosts(postsData)
        setDivinationRecords(divinationData)
        setCoinTransactions(transactions)
        setActivityData(dailyActivity)
        setFollowStats(followStatsData)
        
        try {
          const [favPosts, likedPostsData, draftsData] = await Promise.all([
            getUserFavoritePosts({ limit: 50 }),
            getUserLikedPosts({ limit: 50 }),
            getUserDrafts({ limit: 50 })
          ])
          setFavoritePosts(favPosts)
          setLikedPosts(likedPostsData)
          setDraftPosts(draftsData)
          loadedTabsRef.current.add('fav'); loadedTabsRef.current.add('liked'); loadedTabsRef.current.add('draft')
        } catch (error) { console.error(error) }
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    init()
  }, [router])

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
    } catch (error) { console.error(error); toast({ title: '加载失败', variant: 'destructive' }) } finally { setLoadingFollows(false) }
  }

  useEffect(() => {
    const loadPostsForTab = async () => {
      if (postTab === 'mine' || loadingPosts || loadedTabsRef.current.has(postTab)) return
      setLoadingPosts(true)
      try {
        if (postTab === 'fav') { const posts = await getUserFavoritePosts({ limit: 50 }); setFavoritePosts(posts); loadedTabsRef.current.add('fav') }
        else if (postTab === 'liked') { const posts = await getUserLikedPosts({ limit: 50 }); setLikedPosts(posts); loadedTabsRef.current.add('liked') }
        else if (postTab === 'draft') { const posts = await getUserDrafts({ limit: 50 }); setDraftPosts(posts); loadedTabsRef.current.add('draft') }
      } catch (error) { console.error(error); toast({ title: '加载失败', variant: 'destructive' }) } finally { setLoadingPosts(false) }
    }
    loadPostsForTab()
  }, [postTab])

  // Handlers (保持不变)
  const handleUnfollow = async (userId: string) => {
    try {
      const newStatus = await toggleFollowUser(userId)
      if (!newStatus) {
        setFollowingUsers(prev => prev.filter(u => u.id !== userId))
        const updatedStats = await getUserFollowStats(); setFollowStats(updatedStats); toast({ title: '已取消关注' })
      }
    } catch { toast({ title: '操作失败', variant: 'destructive' }) }
  }
  const handleFollowChange = async () => {
    try { const updatedStats = await getUserFollowStats(); setFollowStats(updatedStats) } catch (error) { console.error(error) }
  }
  const handleCheckIn = async () => {
    if (hasCheckedIn || checkingIn) return; setCheckingIn(true)
    try {
      const result = await checkIn()
      if (result.success) {
        setHasCheckedIn(true); const [growthData, transactions] = await Promise.all([getUserGrowth(), getCoinTransactions(100)])
        if (growthData) setGrowth({ level: growthData.level, titleName: growthData.titleName, yiCoins: growthData.yiCoins, exp: growthData.exp, reputation: growthData.reputation })
        setCoinTransactions(transactions); toast({ title: result.message })
      } else { toast({ title: '签到失败', description: result.message, variant: 'destructive' }) }
    } catch { toast({ title: '签到失败', variant: 'destructive' }) } finally { setCheckingIn(false) }
  }
  const handleRecordClick = async (record: DivinationRecord) => {
    try {
      const fullRecord = await getDivinationRecordById(record.id); if (!fullRecord) return
      const originalKey = String(fullRecord.original_key).replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
      const changedKey = String(fullRecord.changed_key).replace(/[^01]/g, '').padStart(6, '0').slice(0, 6)
      const changingLines: number[] = []; fullRecord.changing_flags.forEach((f, i) => { if(f) changingLines.push(i+1) })
      const payload: StoredDivinationPayload = {
        question: fullRecord.question || '', divinationTimeISO: fullRecord.divination_time, divinationMethod: fullRecord.method,
        lines: fullRecord.lines, changingFlags: fullRecord.changing_flags,
        result: { originalKey, changedKey, original: getHexagramResult(originalKey), changed: getHexagramResult(changedKey), changingLines }, isSaved: true
      }
      const resultId = `db-${record.id}`; const storedResult: StoredResultWithId = { ...payload, id: resultId, createdAt: fullRecord.created_at }
      let resultsList: StoredResultWithId[] = []; try { resultsList = JSON.parse(localStorage.getItem(RESULTS_LIST_STORAGE_KEY) || '[]') } catch {}
      resultsList = resultsList.filter(r => r.id !== resultId); resultsList.unshift(storedResult)
      localStorage.setItem(RESULTS_LIST_STORAGE_KEY, JSON.stringify(resultsList)); localStorage.setItem('latestDivinationResult', JSON.stringify(payload))
      router.push(`/6yao/${resultId}?from=profile`)
    } catch { toast({ title: '加载失败', variant: 'destructive' }) }
  }
  const handleDeleteClick = (id: string) => { setRecordToDelete(id); setDeleteDialogOpen(true) }
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return; setDeleting(true)
    try {
      const result = await deleteDivinationRecord(recordToDelete)
      if (result.success) { setDivinationRecords(prev => prev.filter(r => r.id !== recordToDelete)); toast({ title: '删除成功' }) }
      else { toast({ title: '删除失败', description: result.message, variant: 'destructive' }) }
    } catch { toast({ title: '删除失败', variant: 'destructive' }) } finally { setDeleting(false); setDeleteDialogOpen(false); setRecordToDelete(null) }
  }

  // ---------------------------------------------------------------------------
  // 批量删除逻辑 (修复版)
  // ---------------------------------------------------------------------------
  const handleToggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    setSelectedRecordIds(new Set())
  }
  const handleToggleSelectRecord = (recordId: string) => {
    setSelectedRecordIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) newSet.delete(recordId)
      else newSet.add(recordId)
      return newSet
    })
  }
  const handleSelectAll = () => {
    if (selectedRecordIds.size === divinationRecords.length) setSelectedRecordIds(new Set())
    else setSelectedRecordIds(new Set(divinationRecords.map(r => r.id)))
  }
  const handleBatchDelete = async () => {
    if (selectedRecordIds.size === 0) return toast({ title: '请选择要删除的记录', variant: 'destructive' })
    setBatchDeleting(true)
    try {
      const idsToDelete = Array.from(selectedRecordIds)
      const result = await deleteDivinationRecords(idsToDelete)
      if (result.success) {
        setDivinationRecords(prev => prev.filter(r => !selectedRecordIds.has(r.id) || result.failedIds.includes(r.id)))
        setSelectedRecordIds(new Set())
        setIsSelectMode(false)
        toast({ title: '批量删除成功' })
      } else { toast({ title: '部分删除失败', description: result.message, variant: 'destructive' }) }
    } catch { toast({ title: '删除失败', variant: 'destructive' }) } finally { setBatchDeleting(false) }
  }

  const handleDeletePostClick = (id: string) => { setPostToDelete(id); setDeletePostDialogOpen(true) }
  const handleConfirmDeletePost = async () => { 
      if (!postToDelete) return; setDeletingPost(true)
      try {
        const isDraft = draftPosts.some(p => p.id === postToDelete)
        if (isDraft) { await deleteDraft(postToDelete); setDraftPosts(prev => prev.filter(p => p.id !== postToDelete)); toast({ title: '草稿已删除' }) } 
        else { await deletePost(postToDelete); setUserPosts(prev => prev.filter(p => p.id !== postToDelete)); setFavoritePosts(prev => prev.filter(p => p.id !== postToDelete)); setLikedPosts(prev => prev.filter(p => p.id !== postToDelete)); toast({ title: '删除成功' }) }
      } catch { toast({ title: '删除失败', variant: 'destructive' }) } finally { setDeletingPost(false); setDeletePostDialogOpen(false); setPostToDelete(null) }
  }
  const handleEditPost = (id: string) => router.push(`/community/publish?id=${id}`)

  if (loading) return <ProfileSkeleton />
  if (!profile) return null

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen profile-bg font-sans text-stone-800 pb-20">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6 lg:space-y-8 relative z-10">
          
          {/* 1. 顶部身份卡片 */}
          <div className="glass-card rounded-2xl p-5 lg:p-8 relative overflow-hidden group">
            {/* ... 保持不变 ... */}
            <div className="hidden lg:block absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-amber-50 to-transparent rounded-bl-full opacity-60 pointer-events-none" />
            <div className="hidden lg:block absolute bottom-0 left-0 w-48 h-48 bg-linear-to-tr from-stone-100 to-transparent rounded-tr-full opacity-40 pointer-events-none" />
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 relative z-10">
              <div className="flex flex-col items-center shrink-0 gap-3">
                <div className="relative group/avatar">
                  <Avatar className="w-20 h-20 lg:w-24 lg:h-24 border-4 border-white shadow-lg cursor-pointer transition-transform hover:scale-105">
                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-stone-100 text-stone-400 text-3xl font-serif">{profile.nickname?.charAt(0) || '易'}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-stone-800 text-[#FDFBF7] px-2.5 py-0.5 rounded-full text-[10px] font-bold border-2 border-white shadow-sm whitespace-nowrap">Lv.{growth?.level ?? 1}</div>
                </div>
                <div className="flex items-center gap-2"><Badge variant="secondary" className="bg-amber-100/50 text-amber-700 hover:bg-amber-100 border-amber-200">{growth?.titleName ?? '白身'}</Badge></div>
              </div>
              <div className="flex-1 min-w-0 pt-2 text-center lg:text-left">
                <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-4 mb-4">
                  <div className="flex flex-col items-center lg:items-start">
                    <h1 className="text-xl lg:text-2xl font-bold text-stone-800 font-serif mb-2 flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                      {profile.nickname || '未命名研习者'}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-stone-600" onClick={() => setEditDialogOpen(true)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Badge variant="outline" className="text-xs font-mono bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100">修业值 {growth?.exp ?? 0}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => setExpRulesDialogOpen(true)} className="text-[10px] h-6 px-2 text-stone-400 hover:text-stone-600"><HelpCircle className="w-3 h-3 mr-1" />规则</Button>
                    </h1>
                    <p className="text-stone-500 text-sm italic max-w-lg leading-relaxed">&ldquo;{profile.motto || '君子居则观其象而玩其辞，动则观其变而玩其占。'}&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button className={`rounded-full px-6 shadow-md transition-all ${hasCheckedIn ? 'bg-stone-100 text-stone-400 hover:bg-stone-200' : 'bg-[#C82E31] text-white hover:bg-[#B02629] hover:shadow-lg hover:-translate-y-0.5'}`} onClick={handleCheckIn} disabled={hasCheckedIn || checkingIn}>
                      <CalendarCheck className="w-4 h-4 mr-2" />{checkingIn ? '...' : hasCheckedIn ? '已签到' : '签到'}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 lg:gap-4 border-t border-stone-100 pt-6 mt-6">
                  {[{ label: '已关注', value: followStats.followingCount, icon: null, tab: 'follows', subTab: 'following' }, { label: '关注者', value: followStats.followersCount, icon: null, tab: 'follows', subTab: 'followers' }, { label: '获赞', value: stats.likesReceived, icon: null }, { label: '易币', value: growth?.yiCoins ?? 0, icon: <Coins className="w-3.5 h-3.5 text-amber-500 inline mr-1 -mt-0.5" />, tab: 'wallet' }].map((item, i) => (
                    <div key={i} className={`flex flex-col items-center lg:items-start group/stat transition-colors ${item.tab ? 'cursor-pointer' : 'cursor-default'}`} onClick={item.tab ? () => { setActiveMainTab(item.tab as any); if(item.subTab) setFollowTab(item.subTab as any); setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100) } : undefined}>
                      <span className="text-xl lg:text-2xl font-bold font-mono text-stone-800 group-hover/stat:text-[#C82E31] transition-colors">{item.value}</span>
                      <span className="text-[10px] lg:text-xs text-stone-400 mt-1 flex items-center whitespace-nowrap">{item.icon} {item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. 统计概览 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            <Card className="glass-card rounded-xl border-none shadow-sm col-span-1">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center h-full min-h-[100px] sm:min-h-[140px]">
                <CircularProgress value={stats.accuracyRate} label="实证准确率" totalVerified={stats.verifiedCases} />
              </CardContent>
            </Card>
            <StatCard icon={<BookOpen size={20} />} value={stats.publishedCases} label="发布案例" colorClass="text-[#C82E31] bg-red-50 rounded-xl" onClick={() => router.push('/6yao?from=profile')} isEmpty={stats.publishedCases === 0} actionText="去排盘" />
            <StatCard icon={<TrendingUp size={20} />} value={stats.participatedDeductions} label="参与推演" colorClass="text-blue-600 bg-blue-50 rounded-xl" onClick={() => router.push('/community')} isEmpty={stats.participatedDeductions === 0} actionText="去社区" />
            <StatCard icon={<Award size={20} />} value={growth?.reputation ?? 0} label="声望值" colorClass="text-amber-600 bg-amber-50 rounded-xl" isEmpty={false} />
          </div>

          {/* 3. 热力图 */}
          <div className="w-full overflow-hidden">
            <ActivityHeatmap totalActivity={stats.publishedCases + stats.participatedDeductions} activityData={activityData} />
          </div>

          {/* 4. Tabs */}
          <div ref={tabsRef}>
            <Tabs value={activeMainTab} onValueChange={async (value) => {
              setActiveMainTab(value as any); if(value === 'follows') { if(followTab === 'following' && followingUsers.length === 0) loadFollowsData('following'); else if(followTab === 'followers' && followersUsers.length === 0) loadFollowsData('followers') } else if(value === 'wallet') { try{ setCoinTransactions(await getCoinTransactions(100)) }catch(e){console.error(e)} }
            }} className="w-full">
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-stone-200 mb-6 flex-nowrap min-w-max">
                  {['notes', 'divinations', 'follows', 'wallet', 'reports'].map((tab) => (
                    <TabsTrigger key={tab} value={tab} className="nav-tab-trigger rounded-none border-b-2 border-transparent px-4 lg:px-6 py-3 text-stone-500 font-medium text-sm lg:text-base hover:text-stone-800 transition-colors bg-transparent data-[state=active]:bg-transparent cursor-pointer">
                      {tab === 'notes' && '我的帖子'}
                      {tab === 'divinations' && '排盘记录'}
                      {tab === 'follows' && '关注'}
                      {tab === 'wallet' && '易币明细'}
                      {tab === 'reports' && '我的举报'}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* 帖子 Tab */}
              <TabsContent value="notes" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                  <div className="flex bg-stone-100/50 p-1 rounded-lg shrink-0">
                    {[{ id: 'mine', label: '我的发布' }, { id: 'fav', label: '我的收藏' }, { id: 'liked', label: '我赞过的' }, { id: 'draft', label: '我的草稿' }].map(tab => (
                      <Button key={tab.id} variant="ghost" onClick={() => setPostTab(tab.id as any)} className={`px-3 lg:px-4 py-1.5 rounded-md text-xs font-medium transition-all h-auto whitespace-nowrap ${postTab === tab.id ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* ... Post List (保持不变) ... */}
                {(() => {
                  // 过滤逻辑：
                  // 1. "我的发布" (mine)：显示 userPosts，但排除 draft 状态（draft 在草稿箱显示）
                  // 2. "我的草稿" (draft)：显示 draftPosts
                  const currentPosts = postTab === 'mine' 
                    ? userPosts.filter(p => p.status !== 'draft') 
                    : postTab === 'fav' 
                      ? favoritePosts 
                      : postTab === 'liked' 
                        ? likedPosts 
                        : draftPosts

                  const isEmpty = currentPosts.length === 0
                  if (loadingPosts && isEmpty) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#C82E31]" /></div>
                  if (isEmpty) return <div className="text-center py-16 bg-stone-50/50 rounded-xl border border-dashed border-stone-200"><p className="text-stone-400 text-sm">暂无内容</p></div>
                  return <div className="space-y-4">{currentPosts.map(post => <div key={post.id} className="relative group"><PostCard showStatus={true} post={{ id: post.id, type: (post.type || post.section || 'chat') as any, author: { name: post.author?.nickname || profile.nickname || '未知', avatar: post.author?.avatar_url || '', level: 1 }, title: post.title, excerpt: extractTextFromHTML(post.content, 80), tags: [], stats: { likes: post.like_count, comments: post.comment_count, views: post.view_count }, time: new Date(post.created_at).toLocaleDateString(), hasGua: !!post.divination_record, isLiked: post.is_liked, status: post.status }} />{(postTab === 'mine' || postTab === 'draft') && <div className="absolute top-4 right-4 flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20"><Button variant="secondary" size="icon" className="h-8 w-8 bg-white shadow-sm hover:text-blue-600" onClick={() => handleEditPost(post.id)}><Edit2 className="w-3.5 h-3.5" /></Button><Button variant="secondary" size="icon" className="h-8 w-8 bg-white shadow-sm hover:text-red-600" onClick={() => handleDeletePostClick(post.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div>}</div>)}</div>
                })()}
              </TabsContent>

              {/* -------------------- 排盘记录 (批量操作优化版) -------------------- */}
              <TabsContent value="divinations" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {divinationRecords.length === 0 ? (
                  <div className="text-center py-16 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                    <p className="text-stone-400 text-sm">暂无排盘记录</p>
                  </div>
                ) : (
                  <>
                    {/* 优化后的操作栏：悬浮吸顶，红底强调 */}
                    <div className={`sticky top-[64px] lg:top-0 z-30 mb-4 lg:mb-6 rounded-lg border transition-all duration-300 ${
                      isSelectMode 
                        ? 'bg-red-50/95 border-red-200 shadow-md p-3' 
                        : 'bg-stone-50/50 border-stone-200 shadow-sm p-4'
                    } backdrop-blur-sm`}>
                      <div className="flex items-center justify-between">
                        {isSelectMode ? (
                          <div className="flex items-center gap-4">
                            {/* 关闭按钮 */}
                            <Button variant="ghost" size="icon" onClick={handleToggleSelectMode} className="h-8 w-8 rounded-full hover:bg-red-100 text-red-700">
                              <X className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-bold text-red-800">
                              已选择 {selectedRecordIds.size} 项
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-stone-600 font-medium">共 {divinationRecords.length} 条记录</span>
                        )}

                        <div className="flex items-center gap-2">
                          {isSelectMode ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleSelectAll} 
                                className="text-xs h-8 text-red-700 hover:bg-red-100 hover:text-red-900"
                              >
                                {selectedRecordIds.size === divinationRecords.length ? '取消全选' : '全选'}
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={handleBatchDelete} 
                                disabled={selectedRecordIds.size === 0 || batchDeleting} 
                                className="text-xs h-8 bg-red-600 hover:bg-red-700 shadow-sm px-4"
                              >
                                {batchDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />删除</>}
                              </Button>
                            </>
                          ) : (
                            <Button variant="outline" size="sm" onClick={handleToggleSelectMode} className="text-xs h-8 hover:border-[#C82E31] hover:text-[#C82E31] transition-colors">
                              <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> 批量管理
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                      {divinationRecords.map((record) => (
                        <div 
                          key={record.id}
                          onClick={(e) => {
                            if (isSelectMode) { e.stopPropagation(); handleToggleSelectRecord(record.id) }
                            else handleRecordClick(record)
                          }}
                          className={`group relative bg-white border p-4 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${
                            isSelectMode 
                              ? selectedRecordIds.has(record.id) 
                                ? 'border-[#C82E31] bg-[#fff5f5] ring-1 ring-[#C82E31] shadow-md scale-[0.99]' 
                                : 'border-stone-200 opacity-80 hover:opacity-100'
                              : 'border-stone-100 hover:border-[#C82E31]/30 hover:shadow-md'
                          }`}
                        >
                          {/* 优化后的选择框图标 */}
                          {isSelectMode && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 transition-all duration-200">
                              {selectedRecordIds.has(record.id) ? (
                                <CheckCircle2 className="w-6 h-6 text-[#C82E31] fill-white" />
                              ) : (
                                <Circle className="w-6 h-6 text-stone-300 fill-white" />
                              )}
                            </div>
                          )}

                          <div className={`relative z-10 transition-all ${isSelectMode ? 'pr-10' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] text-stone-400 font-mono bg-stone-50 px-2 py-0.5 rounded-full">{new Date(record.created_at).toLocaleDateString()}</span>
                              {!isSelectMode && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 text-stone-300 hover:text-red-500 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteClick(record.id) }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                            <h4 className={`font-bold text-stone-800 mb-1 transition-colors line-clamp-1 ${!isSelectMode && 'group-hover:text-[#C82E31]'}`}>{record.question || '无题排盘'}</h4>
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

              {/* 关注 & 钱包 Tab (保持不变) */}
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

            {/* -------------------- 举报记录 -------------------- */}
            <TabsContent value="reports" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ReportsList />
            </TabsContent>
          </Tabs>
          </div>
        </div>

        {/* Dialogs */}
        <EditProfileDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} profile={profile} onUpdate={() => window.location.reload()} />
        <DeleteRecordDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleConfirmDelete} deleting={deleting} />
        <DeletePostDialog open={deletePostDialogOpen} onOpenChange={setDeletePostDialogOpen} onConfirm={handleConfirmDeletePost} deleting={deletingPost} />
        <CoinRulesDialog open={coinRulesDialogOpen} onOpenChange={setCoinRulesDialogOpen} />
        <ExpRulesDialog open={expRulesDialogOpen} onOpenChange={setExpRulesDialogOpen} />
      </div>
    </>
  )
}
