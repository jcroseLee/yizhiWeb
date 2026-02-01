'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Card, CardContent } from '@/lib/components/ui/card'
import { calculateLevel, getUserGrowth } from '@/lib/services/growth'
import { getUserFollowStats, getUserProfile } from '@/lib/services/profile'
import { Coins, FileText, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * 作者/用户信息卡片 (User Info Card)
 */
export default function UserInfoCard() {
  const [user, setUser] = useState<{
    id: string
    name: string
    level: number
    avatar: string | null
    motto: string | null
    stats: {
      posts: number
      followers: number
      coins: number
    }
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let timer: NodeJS.Timeout

    const loadUserInfo = async () => {
      try {
        if (controller.signal.aborted) return
        const profile = await getUserProfile({ signal: controller.signal })
        if (controller.signal.aborted) return

        if (profile) {
          const growth = await getUserGrowth() // getUserGrowth doesn't support signal yet, but it's okay
          if (controller.signal.aborted) return

          const followStats = await getUserFollowStats(undefined, controller.signal)
          if (controller.signal.aborted) return

          setUser({
            id: profile.id,
            name: profile.nickname || '易学研习者',
            level: growth ? calculateLevel(growth.exp) : profile.level || 1,
            avatar: profile.avatar_url,
            motto: profile.motto,
            stats: {
              posts: followStats.postsCount || 0,
              followers: followStats.followersCount || 0,
              coins: growth?.yiCoins || 0,
            }
          })
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return
        console.error('Failed to load user info:', error)
      }
    }
    
    // Use a small delay to avoid React Strict Mode double-mount causing immediate abort
    timer = setTimeout(() => {
      loadUserInfo()
    }, 0)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [])

  if (!user) {
    return null
  }

  return (
    <Card className="bg-white border border-stone-200/50 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* 上半部分：基础信息 */}
        <Link href={`/u/${user.id}`} className="flex p-5 items-center gap-3 border-b border-dashed border-stone-100 hover:bg-stone-50/50 transition-colors group">
          <Avatar className="w-12 h-12 border border-white shadow-sm group-hover:shadow-md group-hover:ring-2 group-hover:ring-[#C82E31]/20 transition-all">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-linear-to-br from-stone-100 to-stone-200 text-stone-600 font-serif font-bold text-lg">
              {user.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-stone-800 truncate group-hover:text-[#C82E31] transition-colors">{user.name}</h3>
              <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 shadow-sm">
                LV.{user.level}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5 font-serif line-clamp-2">
              {user.motto || '每日一卦，精进不止。'}
            </p>
          </div>
        </Link>

        {/* 下半部分：数据统计 */}
        <div className="flex items-center py-4">
          {/* 帖子 */}
          <div className="flex-1 flex flex-col items-center gap-1 border-r border-stone-100/50 cursor-pointer group hover:bg-gray-50/50 transition-colors">
            <span className="text-xl font-bold text-stone-800 group-hover:text-[#C82E31] transition-colors font-serif">
              {user.stats.posts}
            </span>
            <div className="flex items-center gap-1 text-xs text-stone-400">
              <FileText className="w-3 h-3" />
              帖子
            </div>
          </div>

          {/* 关注者 */}
          <div className="flex-1 flex flex-col items-center gap-1 border-r border-stone-100/50 cursor-pointer group hover:bg-gray-50/50 transition-colors">
            <span className="text-xl font-bold text-stone-800 group-hover:text-[#C82E31] transition-colors font-serif">
              {user.stats.followers}
            </span>
            <div className="flex items-center gap-1 text-xs text-stone-400">
              <Users className="w-3 h-3" />
              关注者
            </div>
          </div>

          {/* 易币 (重点高亮) */}
          <div className="flex-1 flex flex-col items-center gap-1 cursor-pointer group hover:bg-amber-50/30 transition-colors">
            <span className="text-xl font-bold text-amber-600 font-serif group-hover:text-amber-700 transition-colors">
              {user.stats.coins}
            </span>
            <div className="flex items-center gap-1 text-xs text-stone-400">
              <Coins className="w-3 h-3 text-amber-500" />
              易币
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

