'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import { calculateLevel, getTitleName } from '@/lib/services/growth'
import { getUserFollowStats, getUserProfileById, getUserStats, isFollowingUser, toggleFollowUser } from '@/lib/services/profile'
import { Loader2, MessageSquare, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UserHoverCardProps {
  userId?: string
  nickname: string
  avatar?: string
  children: React.ReactNode
}

export default function UserHoverCard({ userId, nickname, avatar, children }: UserHoverCardProps) {
  const { toast } = useToast()
  const [userInfo, setUserInfo] = useState<{
    profile: { nickname: string | null; avatar_url: string | null; exp: number; reputation: number; title_level: number } | null
    stats: { publishedCases: number; likesReceived: number; participatedDeductions: number } | null
    followStats: { postsCount: number; followersCount: number } | null
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowingLoading, setIsFollowingLoading] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    getCurrentUser().then(setCurrentUser)
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const loadUserInfo = useCallback(async () => {
    if (!userId || userInfo || loading) return
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    try {
      // 如果 currentUser 还没加载，先加载它
      let user = currentUser
      if (!user) {
        user = await getCurrentUser()
        setCurrentUser(user)
      }
      
      if (controller.signal.aborted) return

      const [profile, stats, followStats, followStatus] = await Promise.all([
        getUserProfileById(userId, { signal: controller.signal }),
        getUserStats(userId, controller.signal),
        getUserFollowStats(userId, controller.signal),
        user && user.id !== userId ? isFollowingUser(userId).catch(() => false) : Promise.resolve(false)
      ])

      if (controller.signal.aborted) return

      if (profile) {
        setUserInfo({
          profile: {
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            exp: profile.exp || 0,
            reputation: profile.reputation || 0,
            title_level: profile.title_level || 1
          },
          stats: stats || null,
          followStats: followStats || null
        })
        setIsFollowing(followStatus)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Failed to load user info:', error)
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
        setLoading(false)
      }
    }
  }, [userId, userInfo, loading, currentUser])

  if (!userId || !nickname || nickname === '匿名') {
    return <>{children}</>
  }

  return (
    <Popover onOpenChange={(open) => {
      if (open && !userInfo && !loading) {
        loadUserInfo()
      }
    }}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white border border-stone-200 shadow-sm" align="start">
        {loading ? (
          <div className="p-4 text-center text-sm text-stone-400">加载中...</div>
        ) : userInfo?.profile ? (
          <div className="p-4">
            <Link href={`/u/${userId}`} className="block group">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-12 h-12 border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-[#C82E31]/20 transition-all">
                  <AvatarImage src={userInfo.profile.avatar_url || ''} />
                  <AvatarFallback className="bg-stone-100 text-stone-400 font-serif">
                    {userInfo.profile.nickname?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-stone-800 truncate group-hover:text-[#C82E31] transition-colors">
                      {userInfo.profile.nickname}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-white font-mono shrink-0">
                      Lv.{calculateLevel(userInfo.profile.exp)}
                    </span>
                    {userInfo.profile.title_level > 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        {getTitleName(userInfo.profile.title_level)}
                      </span>
                    )}
                  </div>
                  {/* 统计数据 */}
                  {(userInfo.stats || userInfo.followStats) && (
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-stone-800">{userInfo.followStats?.postsCount || 0}</span>
                        <span>帖子</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-stone-800">{userInfo.followStats?.followersCount || 0}</span>
                        <span>关注者</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-stone-800">{userInfo.stats?.participatedDeductions || 0}</span>
                        <span>案例</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
            
            {/* 按钮组 */}
            {currentUser && currentUser.id !== userId && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                <Button
                  className={`flex-1 shadow-sm transition-all ${
                    isFollowing
                      ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      : 'bg-[#C82E31] text-white hover:bg-[#A93226]'
                  }`}
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (isFollowingLoading) return
                    try {
                      setIsFollowingLoading(true)
                      const newFollowingStatus = await toggleFollowUser(userId)
                      setIsFollowing(newFollowingStatus)
                      toast({
                        title: newFollowingStatus ? '已关注' : '已取消关注',
                        description: newFollowingStatus ? `现在可以查看 ${userInfo.profile?.nickname || '该用户'} 的动态了` : ''
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
                  size="sm"
                >
                  {isFollowingLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      处理中
                    </>
                  ) : isFollowing ? (
                    '已关注'
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3 mr-1.5" />
                      关注
                    </>
                  )}
                </Button>
                
                <Link href={`/messages?userId=${userId}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-stone-600 hover:text-stone-800 hover:bg-stone-50">
                    <MessageSquare className="h-3 w-3 mr-1.5" />
                    私信
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-stone-400">用户信息加载失败</div>
        )}
      </PopoverContent>
    </Popover>
  )
}
