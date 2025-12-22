'use client'

import { Loader2, MessageSquare, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import { calculateLevel, getTitleName } from '@/lib/services/growth'
import { type UserProfile } from '@/lib/services/profile'

export interface UserCardProps {
  user: UserProfile
  onUnfollow?: (userId: string) => void
  showFollowButton?: boolean
  onFollowChange?: () => void
}

export function UserCard({ user, onUnfollow, showFollowButton = false, onFollowChange }: UserCardProps) {
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

