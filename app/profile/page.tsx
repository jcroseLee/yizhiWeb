'use client'

import {
    Activity,
    ArrowDown,
    ArrowUp,
    Award,
    BookOpen,
    CalendarCheck,
    CheckCircle2,
    CheckSquare,
    Circle,
    Clock,
    Coins,
    Edit2,
    HelpCircle,
    Loader2,
    Trash2,
    TrendingUp,
    X
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

import PostCard, { extractTextFromHTML } from '@/app/community/components/PostCard'
import { trackEvent } from '@/lib/analytics'
import { BindPhoneDialog } from '@/lib/components/BindPhoneDialog'
import { EditProfileDialog } from '@/lib/components/EditProfileDialog'
import { SmartphoneIcon } from '@/lib/components/icons/SmartphoneIcon'
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
    LEVEL_CONFIG,
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
import { RechargeDialog } from './components/RechargeDialog'
import { ReportsList } from './components/ReportsList'
import { StatCard } from './components/StatCard'
import { UserCard } from './components/UserCard'

// --- 样式补丁：增加宣纸纹理与玻璃拟态 ---
const styles = `
  /* 全局背景 */
  .profile-bg {
    background-color: #FDFBF7;
    background-image: 
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
  }

  /* 玻璃卡片 - 通透感 */
  .glass-card {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(1rem);
    border: 0.0625rem solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 0.25rem 1.25rem -0.125rem rgba(0, 0, 0, 0.03);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  .glass-card:hover {
    background: rgba(255, 255, 255, 0.85);
    transform: translateY(-0.125rem);
    box-shadow: 0 0.75rem 1.875rem -0.3125rem rgba(0, 0, 0, 0.06);
  }

  /* Tab 激活态 - 底部红线 */
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
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 1.25rem;
    height: 0.1875rem;
    background-color: #C82E31;
    border-radius: 6.1875rem;
  }

  /* 隐藏滚动条 */
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  
  /* 渐变遮罩 - 用于头像背景 */
  .bg-gradient-mask {
    mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
  }

  /* 流光边框特效 */
  @keyframes shimmer-border {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
  }
  
  .animate-shimmer-border {
    --bg-color: #FFFBEB;
    border-color: transparent !important;
    background: linear-gradient(var(--bg-color), var(--bg-color)) padding-box,
                linear-gradient(90deg, #d97706, #fbbf24, #d97706) border-box;
    background-size: 100% 100%, 200% 100%;
    background-position: 0 0, 0 0;
    animation: shimmer-border 2s linear infinite;
    box-shadow: 0 0 0.625rem rgba(245, 158, 11, 0.4);
  }
`

function getTitleBadgeStyle(titleName: string) {
  // 基础：字体加粗，边框透明（利用背景模拟边框或渐变）
  const base = "px-3 py-0.5 rounded-full text-xs font-bold border transition-all hover:scale-105";

  switch (titleName) {
    case '学人': 
      return `${base} bg-slate-100 text-slate-600 border-slate-200`;
      
    case '术士': 
      return `${base} bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200`;
      
    case '方家': // 银色金属光泽
      return `${base} bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-sm`;
      
    case '先生': // 金色流光
      return `${base} bg-gradient-to-b from-yellow-50 to-amber-100 text-amber-800 border-amber-300 shadow-md shadow-amber-500/10`;
      
    case '国手': // 玉质通透感 + 强烈光环
      return `${base} bg-gradient-to-tr from-emerald-50 via-teal-50 to-emerald-100 text-emerald-900 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-300`;
      
    case '白身':
    default:
      return `${base} bg-gray-50 text-gray-400 border-gray-100`;
  }
}

function getBadgeStyle(level: number) {
  if (level === 0) return "" // Lv.0 无
  if (level === 1) return "text-stone-500 bg-stone-50 border-stone-200" // Lv.1 灰边框
  if (level === 2) return "text-orange-700 bg-orange-50 border-orange-200" // Lv.2 铜边框
  if (level === 3) return "text-slate-600 bg-slate-50 border-slate-300" // Lv.3 银边框
  if (level === 4) return "text-slate-700 bg-slate-50 border-slate-300 shadow-[0_0_8px_rgba(148,163,184,0.4)]" // Lv.4 银边框+流光
  if (level === 5) return "text-yellow-700 bg-yellow-50 border-yellow-400" // Lv.5 金边框
  if (level === 6) return "text-yellow-800 bg-yellow-100 border-yellow-500 border-double" // Lv.6 金边框+纹饰
  return "text-amber-900 animate-shimmer-border" // Lv.7+ 动态特效
}

function getAvatarStyle(level: number) {
  if (level <= 1) return "border-stone-200" // Lv.1 灰边框
  if (level === 2) return "border-orange-200" // Lv.2 铜边框
  if (level === 3) return "border-slate-300" // Lv.3 银边框
  if (level === 4) return "border-slate-300 shadow-[0_0_8px_rgba(148,163,184,0.4)]" // Lv.4 银边框+流光
  if (level === 5) return "border-yellow-400" // Lv.5 金边框
  if (level === 6) return "border-yellow-500 border-double" // Lv.6 金边框+纹饰
  return "animate-shimmer-border" // Lv.7+ 动态特效
}

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
  const [bindPhoneDialogOpen, setBindPhoneDialogOpen] = useState(false)
  const [userPhone, setUserPhone] = useState<string | null>(null)
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
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false)
  const [expRulesDialogOpen, setExpRulesDialogOpen] = useState(false)
  const loadedTabsRef = useRef<Set<'fav' | 'liked' | 'draft'>>(new Set())
  
  // 批量删除相关状态
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)
  
  // 排盘记录子菜单状态
  const [divinationTab, setDivinationTab] = useState<'all' | 'bazi' | '6yao' | 'qimen'>('all')

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
        setUserPhone(currentUser.phone || null)
        
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

  const refreshWalletData = async () => {
    try {
      const [balanceRes, txRes] = await Promise.all([
        fetch('/api/v1/wallet/balance', { cache: 'no-store' }),
        fetch('/api/v1/wallet/transactions?limit=100&offset=0', { cache: 'no-store' })
      ])

      let total: number | null = null
      let txs: CoinTransaction[] | null = null

      if (balanceRes.ok) {
        const balance = await balanceRes.json().catch(() => null)
        const parsed = Number(balance?.total)
        if (Number.isFinite(parsed) && parsed >= 0) {
          total = parsed
          setGrowth((prev) =>
            prev
              ? { ...prev, yiCoins: parsed }
              : {
                  level: 1,
                  titleName: '易学研习者',
                  yiCoins: parsed,
                  exp: 0,
                  reputation: 0
                }
          )
        }
      }

      if (txRes.ok) {
        const data = await txRes.json().catch(() => null)
        const items = Array.isArray(data) ? data : []
        txs = items
          .map((x: any) => ({
            id: String(x?.id || ''),
            amount: Number(x?.amount || 0),
            type: String(x?.type || ''),
            description: typeof x?.description === 'string' ? x.description : null,
            created_at: String(x?.created_at || '')
          }))
          .filter((x: any) => x.id && x.created_at)
        setCoinTransactions(txs)
      }
      return { total, txs }
    } catch {}
    return { total: null, txs: null }
  }

  useEffect(() => {
    const recharge = searchParams.get('recharge')
    if (recharge !== 'success') return

    const outTradeNo = searchParams.get('out_trade_no') || ''
    const startedAt = Date.now()
    const initialBalance = typeof growth?.yiCoins === 'number' ? growth.yiCoins : null
    const initialTxId = coinTransactions?.[0]?.id || null

    toast({ title: '充值完成', description: '正在同步余额与明细...' })

    let cancelled = false
    const run = async () => {
      const syncOnce = async () => {
        if (!outTradeNo) return
        try {
          await fetch('/api/v1/wallet/recharge/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ out_trade_no: outTradeNo })
          })
        } catch {}
      }

      await syncOnce()
      for (let i = 0; i < 10; i++) {
        if (cancelled) return
        if (i === 5) await syncOnce()
        const snapshot = await refreshWalletData()
        const latestTxId = snapshot.txs?.[0]?.id || null
        const hasNewTx =
          (initialTxId && latestTxId && latestTxId !== initialTxId) ||
          (!!outTradeNo && (snapshot.txs?.some((t) => typeof t?.description === 'string' && t.description.includes(outTradeNo)) || false))

        const balanceChanged =
          initialBalance !== null && typeof snapshot.total === 'number' && Number.isFinite(snapshot.total) && snapshot.total !== initialBalance

        if (hasNewTx || balanceChanged) {
          toast({ title: '已更新', description: '易币余额与明细已同步' })
          break
        }

        if (Date.now() - startedAt > 20000) break
        await new Promise((r) => setTimeout(r, 2000))
      }

      const sp = new URLSearchParams(searchParams.toString())
      sp.delete('recharge')
      sp.delete('out_trade_no')
      const next = sp.toString()
      router.replace(next ? `/profile?${next}` : '/profile')
    }

    run()
    return () => {
      cancelled = true
    }
  }, [searchParams])

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
        const prevLevel = growth?.level ?? null
        if (growthData) {
          setGrowth({ level: growthData.level, titleName: growthData.titleName, yiCoins: growthData.yiCoins, exp: growthData.exp, reputation: growthData.reputation })
          trackEvent('user_checkin', { consecutive_days: growthData.consecutiveCheckinDays })
          if (typeof prevLevel === 'number' && growthData.level > prevLevel) {
            trackEvent('user_level_up', { new_level: growthData.level, title_name: growthData.titleName })
          }
        }
        setCoinTransactions(transactions); toast({ title: result.message })
      } else { toast({ title: '签到失败', description: result.message, variant: 'destructive' }) }
    } catch { toast({ title: '签到失败', variant: 'destructive' }) } finally { setCheckingIn(false) }
  }
  const handleRecordClick = async (record: DivinationRecord) => {
    try {
      // 判断记录类型
      const isBaZi = record.original_key === 'bazi' || (record.method === 1 && (!record.lines || record.lines.length === 0))
      const isLiuYao = record.lines && record.lines.length > 0 && record.original_key !== 'bazi'
      
      if (isBaZi) {
        // 八字记录，跳转到八字详情页
        router.push(`/tools/bazi/${record.id}?from=profile`)
        return
      } else if (isLiuYao) {
        // 六爻记录，跳转到六爻详情页
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
        router.push(`/tools/6yao/${resultId}?from=profile`)
      } else {
        // 其他类型（如奇门遁甲），暂时提示
        toast({ title: '该类型暂未支持', variant: 'destructive' })
      }
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
    // 根据当前选中的子菜单过滤记录
    const filteredRecords = divinationRecords.filter(record => {
      if (divinationTab === 'all') return true
      const isBaZi = record.original_key === 'bazi' || (record.method === 1 && (!record.lines || record.lines.length === 0))
      const isLiuYao = record.lines && record.lines.length > 0 && record.original_key !== 'bazi'
      const isQimen = !isBaZi && !isLiuYao
      if (divinationTab === 'bazi') return isBaZi
      if (divinationTab === '6yao') return isLiuYao
      if (divinationTab === 'qimen') return isQimen
      return true
    })
    
    if (selectedRecordIds.size === filteredRecords.length) setSelectedRecordIds(new Set())
    else setSelectedRecordIds(new Set(filteredRecords.map(r => r.id)))
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
      {/* <style jsx global>{styles}</style> */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="min-h-screen profile-bg font-sans text-stone-800 pb-20">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6 lg:space-y-8 relative z-10">
          
          {/* 1. 顶部身份卡片 (重构：更轻量，更有呼吸感) */}
          <div className="glass-card rounded-2xl p-6 lg:p-10 relative overflow-hidden group">
            {/* 背景装饰：淡彩晕染 */}
            <div className="hidden lg:block absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-50/80 to-transparent rounded-bl-full opacity-60 pointer-events-none blur-3xl" />
            <div className="hidden lg:block absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-stone-100/80 to-transparent rounded-tr-full opacity-40 pointer-events-none blur-3xl" />
            
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10 items-center lg:items-start">
              
              {/* 头像区域 */}
                <div className="flex flex-col items-center shrink-0 gap-4">
                  <div className="relative group/avatar">
                    {/* 光环装饰 */}
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#C82E31]/20 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity blur-md" />
                    <Avatar className={`w-24 h-24 lg:w-28 lg:h-28 border-[0.25rem] shadow-xl cursor-pointer transition-transform hover:scale-105 relative z-10 ${getAvatarStyle(growth?.level || 1)}`}>
                      <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="bg-stone-100 text-stone-400 text-4xl font-serif">{profile.nickname?.charAt(0) || '易'}</AvatarFallback>
                    </Avatar>
                    
                    {/* 等级徽章 - 悬浮在头像底部 */}
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[0.625rem] font-bold border-2 shadow-sm whitespace-nowrap z-20 ${getBadgeStyle(growth?.level || 1) || 'bg-stone-900 text-[#FDFBF7] border-white'}`}>
                      Lv.{growth?.level ?? 1}
                    </div>
                  </div>
                  
                  {/* 称号 */}
                  <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={`border ${getTitleBadgeStyle(growth?.titleName ?? '白身')}`}>
                          {growth?.titleName ?? '白身'}
                      </Badge>
                      {/* 如果有等级称号，也显示出来 */}
                      {growth?.level && growth.level > 0 && (
                        <Badge variant="outline" className={`text-[0.625rem] ${getBadgeStyle(growth.level)}`}>
                          {LEVEL_CONFIG.find(l => l.level === growth.level)?.name}
                        </Badge>
                      )}
                  </div>
                  
                </div>

              {/* 信息区域 */}
              <div className="flex-1 min-w-0 pt-2 text-center lg:text-left w-full">
                <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-6 mb-6">
                  <div className="flex flex-col items-center lg:items-start space-y-2">
                    <div className="flex items-center gap-3 flex-wrap justify-center lg:justify-start">
                        <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 font-serif tracking-tight">
                        {profile.nickname || '未命名研习者'}
                        </h1>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100" onClick={() => setEditDialogOpen(true)}>
                            <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100" onClick={() => setBindPhoneDialogOpen(true)} title={userPhone ? "更换手机号" : "绑定手机号"}>
                            <SmartphoneIcon className={`w-4 h-4 ${userPhone ? 'fill-[#C82E31]' : 'fill-stone-400'}`} />
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1 bg-stone-100/50 px-2 py-1 rounded-md border border-stone-200/50">
                            <Activity className="w-3 h-3 text-stone-400" />
                            修业值 {growth?.exp ?? 0}
                        </span>
                        <button onClick={() => setExpRulesDialogOpen(true)} className="hover:text-[#C82E31] hover:underline transition-colors">
                            规则说明
                        </button>
                    </div>

                    <p className="text-stone-500 text-sm italic max-w-lg leading-relaxed mt-2 relative pl-3 border-l-2 border-stone-200">
                        {profile.motto || '君子居则观其象而玩其辞，动则观其变而玩其占。'}
                    </p>
                  </div>

                  {/* 签到按钮 */}
                  <div className="shrink-0">
                    <Button 
                        className={`rounded-full px-8 h-10 shadow-md transition-all duration-300 font-medium ${
                            hasCheckedIn 
                            ? 'bg-stone-100 text-stone-400 hover:bg-stone-200 cursor-default shadow-inner' 
                            : 'bg-[#C82E31] text-white hover:bg-[#B02629] hover:shadow-lg hover:-translate-y-0.5'
                        }`} 
                        onClick={handleCheckIn} 
                        disabled={hasCheckedIn || checkingIn}
                    >
                      <CalendarCheck className="w-4 h-4 mr-2" />
                      {checkingIn ? '...' : hasCheckedIn ? '已签到' : '每日签到'}
                    </Button>
                  </div>
                </div>

                {/* 核心数据概览 (移除旧版网格，改为更清爽的横排) */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-8 lg:gap-16 pt-6 border-t border-stone-100 mt-2">
                  {[
                      { label: '关注', value: followStats.followingCount, tab: 'follows', subTab: 'following' }, 
                      { label: '粉丝', value: followStats.followersCount, tab: 'follows', subTab: 'followers' }, 
                      { label: '获赞', value: stats.likesReceived }, 
                      { label: '易币', value: growth?.yiCoins ?? 0, icon: <Coins className="w-3.5 h-3.5 text-amber-500 inline mr-1 -mt-0.5" />, tab: 'wallet' }
                  ].map((item, i) => (
                    <div 
                        key={i} 
                        className={`flex flex-col items-center lg:items-start group/stat transition-colors ${item.tab ? 'cursor-pointer' : 'cursor-default'}`} 
                        onClick={item.tab ? () => { setActiveMainTab(item.tab as any); if(item.subTab) setFollowTab(item.subTab as any); setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100) } : undefined}
                    >
                      <div className="flex items-center gap-2">
                          <span className="text-2xl lg:text-3xl font-bold font-serif text-stone-800 group-hover/stat:text-[#C82E31] transition-colors leading-none mb-1">
                              {item.value}
                          </span>
                          {item.label === '易币' && (
                              <Button variant="outline" className="h-6 px-2 text-[0.625rem] rounded-full border-stone-200 text-[#C82E31] hover:bg-red-50 hover:border-[#C82E31] -mt-1" onClick={(e) => { e.stopPropagation(); setRechargeDialogOpen(true) }}>
                                  充值易币
                              </Button>
                          )}
                      </div>
                      <span className="text-xs text-stone-400 uppercase tracking-wider flex items-center">
                          {item.icon} {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                
              </div>
            </div>
          </div>

          {/* 2. 统计概览 (Bento Grid 风格) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            <Card className="glass-card rounded-2xl border-none shadow-sm col-span-1 group hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[8.75rem]">
                <CircularProgress value={stats.accuracyRate} label="实证准确率" totalVerified={stats.verifiedCases} />
              </CardContent>
            </Card>
            
            <StatCard 
                icon={<BookOpen size={20} />} 
                value={stats.publishedCases} 
                label="发布案例" 
                colorClass="text-[#C82E31] bg-red-50 rounded-xl" 
                onClick={() => router.push('/tools/6yao?from=profile')} 
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

          {/* 3. 热力图 (作为独立板块) */}
          <div className="glass-card rounded-2xl p-6 border-none shadow-sm overflow-hidden">
             <div className="flex items-center gap-2 mb-4">
                 <h3 className="text-sm font-bold text-stone-700">修习记录</h3>
                 <div className="h-px flex-1 bg-stone-100" />
             </div>
             <ActivityHeatmap totalActivity={stats.publishedCases + stats.participatedDeductions} activityData={activityData} />
          </div>

          {/* 4. Tabs 内容区 */}
          <div ref={tabsRef} className="pt-4">
            <Tabs value={activeMainTab} onValueChange={async (value) => {
              setActiveMainTab(value as any); if(value === 'follows') { if(followTab === 'following' && followingUsers.length === 0) loadFollowsData('following'); else if(followTab === 'followers' && followersUsers.length === 0) loadFollowsData('followers') } else if(value === 'wallet') { try{ setCoinTransactions(await getCoinTransactions(100)) }catch(e){console.error(e)} }
            }} className="w-full">
              
              {/* 优雅的 Tab 导航 */}
              <div className="sticky top-0 z-20 bg-[#FDFBF7]/95 backdrop-blur-md -mx-4 px-4 lg:mx-0 lg:px-0 border-b border-stone-200/60 mb-8">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent flex-nowrap overflow-x-auto scrollbar-hide">
                  {['notes', 'divinations', 'follows', 'wallet', 'reports'].map((tab) => (
                    <TabsTrigger 
                        key={tab} 
                        value={tab} 
                        className="nav-tab-trigger rounded-none border-b-2 border-transparent px-5 py-3 text-stone-500 font-medium text-sm hover:text-stone-800 transition-colors bg-transparent data-[state=active]:bg-transparent cursor-pointer"
                    >
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
                <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide">
                    {[{ id: 'mine', label: '我的发布' }, { id: 'fav', label: '我的收藏' }, { id: 'liked', label: '我赞过的' }, { id: 'draft', label: '我的草稿' }].map(tab => (
                      <button 
                        key={tab.id} 
                        onClick={() => setPostTab(tab.id as any)} 
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            postTab === tab.id 
                            ? 'bg-stone-800 text-white border-stone-800 shadow-sm' 
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                </div>
                {(() => {
                  const currentPosts = postTab === 'mine' 
                    ? userPosts.filter(p => p.status !== 'draft') 
                    : postTab === 'fav' 
                      ? favoritePosts 
                      : postTab === 'liked' 
                        ? likedPosts 
                        : draftPosts

                  const isEmpty = currentPosts.length === 0
                  if (loadingPosts && isEmpty) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#C82E31]" /></div>
                  if (isEmpty) return <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-stone-200"><p className="text-stone-400 text-sm">暂无内容</p></div>
                  
                  return (
                    <div className="space-y-4">
                        {currentPosts.map(post => (
                            <div key={post.id} className="relative group transition-transform hover:-translate-y-1 duration-300">
                                <PostCard 
                                    showStatus={true} 
                                    post={{ 
                                        id: post.id, 
                                        type: (post.type || post.section || 'chat') as any, 
                                        author: { name: post.author?.nickname || profile.nickname || '未知', avatar: post.author?.avatar_url || '', level: 1 }, 
                                        title: post.title, 
                                        excerpt: extractTextFromHTML(post.content, 80), 
                                        tags: [], 
                                        stats: { likes: post.like_count, comments: post.comment_count, views: post.view_count }, 
                                        time: new Date(post.created_at).toLocaleDateString(), 
                                        hasGua: !!post.divination_record, 
                                        isLiked: post.is_liked, 
                                        status: post.status 
                                    }} 
                                />
                                {(postTab === 'mine' || postTab === 'draft') && (
                                    <div className="absolute top-4 right-4 flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20">
                                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm hover:text-blue-600 rounded-full" onClick={() => handleEditPost(post.id)}><Edit2 className="w-3.5 h-3.5" /></Button>
                                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm hover:text-red-600 rounded-full" onClick={() => handleDeletePostClick(post.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                  )
                })()}
              </TabsContent>

              {/* -------------------- 排盘记录 (卡片式优化) -------------------- */}
              <TabsContent value="divinations" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* 子菜单 */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide">
                  {[
                    { id: 'all', label: '全部' },
                    { id: 'bazi', label: '四柱八字' },
                    { id: '6yao', label: '六爻起卦' },
                    { id: 'qimen', label: '奇门遁甲' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDivinationTab(tab.id as any)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        divinationTab === tab.id
                          ? 'bg-stone-800 text-white border-stone-800 shadow-sm'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {(() => {
                  // 根据选中的类型过滤记录
                  const filteredRecords = divinationRecords.filter(record => {
                    if (divinationTab === 'all') return true
                    
                    const isBaZi = record.original_key === 'bazi' || (record.method === 1 && (!record.lines || record.lines.length === 0))
                    const isLiuYao = record.lines && record.lines.length > 0 && record.original_key !== 'bazi'
                    const isQimen = !isBaZi && !isLiuYao
                    
                    if (divinationTab === 'bazi') return isBaZi
                    if (divinationTab === '6yao') return isLiuYao
                    if (divinationTab === 'qimen') return isQimen
                    return true
                  })

                  if (filteredRecords.length === 0) {
                    return (
                      <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-stone-200">
                        <p className="text-stone-400 text-sm">暂无排盘记录</p>
                      </div>
                    )
                  }

                  return (
                    <>
                      <div className={`sticky top-[3.75rem] lg:top-0 z-30 mb-6 rounded-xl border transition-all duration-300 ${
                        isSelectMode 
                          ? 'bg-red-50/95 border-red-200 shadow-md p-3' 
                          : 'bg-white/60 border-stone-100 shadow-sm p-4 backdrop-blur-md'
                      }`}>
                        <div className="flex items-center justify-between">
                          {isSelectMode ? (
                            <div className="flex items-center gap-4">
                              <Button variant="ghost" size="icon" onClick={handleToggleSelectMode} className="h-8 w-8 rounded-full hover:bg-red-100 text-red-700">
                                <X className="w-4 h-4" />
                              </Button>
                              <span className="text-sm font-bold text-red-800">已选择 {selectedRecordIds.size} 项</span>
                            </div>
                          ) : (
                            <span className="text-sm text-stone-600 font-medium pl-1">共 {filteredRecords.length} 条记录</span>
                          )}

                          <div className="flex items-center gap-2">
                            {isSelectMode ? (
                              <>
                                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs h-8 text-red-700 hover:bg-red-100 hover:text-red-900 rounded-full">
                                  {selectedRecordIds.size === filteredRecords.length ? '取消全选' : '全选'}
                                </Button>
                                <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={selectedRecordIds.size === 0 || batchDeleting} className="text-xs h-8 bg-red-600 hover:bg-red-700 shadow-sm px-4 rounded-full">
                                  {batchDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />删除</>}
                                </Button>
                              </>
                            ) : (
                              <Button variant="outline" size="sm" onClick={handleToggleSelectMode} className="text-xs h-8 hover:border-[#C82E31] hover:text-[#C82E31] transition-colors rounded-full bg-white">
                                <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> 批量管理
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredRecords.map((record) => (
                        <div 
                          key={record.id}
                          onClick={(e) => {
                            if (isSelectMode) { e.stopPropagation(); handleToggleSelectRecord(record.id) }
                            else handleRecordClick(record)
                          }}
                          className={`group relative bg-white border p-5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${
                            isSelectMode 
                              ? selectedRecordIds.has(record.id) 
                                ? 'border-[#C82E31] bg-[#fff5f5] ring-1 ring-[#C82E31]' 
                                : 'border-stone-100 opacity-60 hover:opacity-100'
                              : 'border-stone-100 hover:border-[#C82E31]/30 hover:-translate-y-1'
                          }`}
                        >
                          {/* 装饰圆点 */}
                          <div className={`absolute top-5 right-5 w-2 h-2 rounded-full ${record.original_key ? 'bg-emerald-400' : 'bg-stone-200'}`} />

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
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-3.5 h-3.5 text-stone-400" />
                                <span className="text-xs text-stone-400 font-mono">{new Date(record.created_at).toLocaleDateString()}</span>
                            </div>
                            <h4 className={`font-bold text-stone-800 text-lg mb-2 line-clamp-1 group-hover:text-[#C82E31] transition-colors`}>{record.question || '无题排盘'}</h4>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-stone-50 text-stone-600 hover:bg-stone-100 font-normal text-xs border border-stone-100">
                                    {(() => {
                                      const isBaZi = record.original_key === 'bazi' || (record.method === 1 && (!record.lines || record.lines.length === 0))
                                      const isLiuYao = record.lines && record.lines.length > 0 && record.original_key !== 'bazi'
                                      if (isBaZi) return '四柱八字'
                                      if (isLiuYao) return record.method === 1 ? '金钱课' : '时间起卦'
                                      return '奇门遁甲'
                                    })()}
                                </Badge>
                                {!isSelectMode && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteClick(record.id) }}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    </>
                  )
                })()}
              </TabsContent>

              {/* 关注 & 钱包 Tab (样式微调) */}
            <TabsContent value="follows" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-6">
                    {[
                      { id: 'following', label: '我关注的', count: followStats.followingCount },
                      { id: 'followers', label: '关注我的', count: followStats.followersCount },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          const newTab = tab.id as 'following' | 'followers'
                          setFollowTab(newTab)
                          if ((newTab === 'following' && followingUsers.length === 0) || 
                              (newTab === 'followers' && followersUsers.length === 0)) {
                            loadFollowsData(newTab)
                          }
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-2 ${
                          followTab === tab.id 
                            ? 'bg-stone-800 text-white border-stone-800 shadow-sm' 
                            : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {tab.label}
                        <span className={`text-[0.625rem] px-1.5 py-0.5 rounded-full ${
                            followTab === tab.id ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-400'
                        }`}>
                            {tab.count}
                        </span>
                      </button>
                    ))}
                </div>

                {/* 关注列表渲染逻辑保持不变，容器样式微调 */}
                <div className="min-h-[18.75rem]">
                    {followTab === 'following' && (
                        /* ... same content ... */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {followingUsers.map((user) => (
                                <UserCard key={user.id} user={user} onUnfollow={handleUnfollow} onFollowChange={handleFollowChange} />
                            ))}
                            {/* Empty state... */}
                        </div>
                    )}
                    {followTab === 'followers' && (
                        /* ... same content ... */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {followersUsers.map((user) => (
                                <UserCard key={user.id} user={user} showFollowButton={true} onFollowChange={handleFollowChange} />
                            ))}
                            {/* Empty state... */}
                        </div>
                    )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="wallet">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-stone-700">最近交易</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setRechargeDialogOpen(true)} className="text-xs h-8 text-[#C82E31] border-[#C82E31] hover:bg-red-50">
                        <Coins className="w-3.5 h-3.5 mr-1.5" /> 充值
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCoinRulesDialogOpen(true)} className="text-xs h-8 text-stone-400 hover:text-stone-600">
                        <HelpCircle className="w-3.5 h-3.5 mr-1.5" /> 规则
                    </Button>
                  </div>
                </div>
                {/* 交易列表样式微调：增加圆角和阴影，移除边框 */}
                {coinTransactions.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        {coinTransactions.map((t, i) => {
                            // ... 保持原有逻辑 ...
                            const isPositive = t.amount > 0
                            const date = new Date(t.created_at)
                            return (
                                <div key={t.id} className={`p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors ${i !== coinTransactions.length - 1 ? 'border-b border-stone-50' : ''}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                                        {isPositive ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-stone-800">{t.description}</div>
                                        <div className="text-xs text-stone-400 mt-0.5">{date.toLocaleDateString()}</div>
                                    </div>
                                    <div className={`font-mono font-bold text-lg ${isPositive ? 'text-[#C82E31]' : 'text-stone-600'}`}>
                                        {isPositive ? '+' : ''}{t.amount}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    /* Empty state */
                    <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-stone-200">
                        <p className="text-stone-400 text-sm">暂无记录</p>
                    </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <ReportsList />
            </TabsContent>
          </Tabs>
          </div>
        </div>

        {/* Dialogs 保持不变 */}
        <EditProfileDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} profile={profile} onUpdate={() => window.location.reload()} />
        <BindPhoneDialog open={bindPhoneDialogOpen} onOpenChange={setBindPhoneDialogOpen} onSuccess={() => window.location.reload()} />
        <DeleteRecordDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleConfirmDelete} deleting={deleting} />
        <DeletePostDialog open={deletePostDialogOpen} onOpenChange={setDeletePostDialogOpen} onConfirm={handleConfirmDeletePost} deleting={deletingPost} />
        <CoinRulesDialog open={coinRulesDialogOpen} onOpenChange={setCoinRulesDialogOpen} />
        <RechargeDialog
          open={rechargeDialogOpen}
          onOpenChange={setRechargeDialogOpen}
          onSuccess={async () => {
            await refreshWalletData()
          }}
        />
        <ExpRulesDialog open={expRulesDialogOpen} onOpenChange={setExpRulesDialogOpen} />
      </div>
    </>
  )
}
