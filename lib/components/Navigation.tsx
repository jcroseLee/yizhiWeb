'use client'

import { HeaderSearch } from '@/lib/components/HeaderSearch'
import Logo from '@/lib/components/Logo'
import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import { getSession, onAuthStateChange, signOut } from '@/lib/services/auth'
import { getTotalUnreadCount, subscribeToConversations } from '@/lib/services/messages'
import { subscribeToNotifications } from '@/lib/services/notifications'
import { getUserProfile, type UserProfile } from '@/lib/services/profile'
import type { Session } from '@supabase/supabase-js'
import { AlertTriangle, Bell, ChevronDown, FileText, LogOut, Menu, Search, User, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

interface NavItem {
  href: string
  label: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { href: '/', label: '首页' },
  { href: '/community', label: '社区' },
  { href: '/cases', label: '案例库' },
  { href: '/library', label: '藏经阁' },
  { 
    href: '/tools', 
    label: '排盘工具',
    children: [
      { href: '/tools/bazi', label: '四柱八字' },
      { href: '/tools/6yao', label: '六爻排盘' },
      { href: '/tools/qimen', label: '奇门遁甲' },
    ]
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hydrated, setHydrated] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [mobileSearchQuery, setMobileSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)

  // 计算应该展开的主导航项（基于当前路径）
  const shouldExpandItem = useMemo(() => {
    for (const item of navItems) {
      if (item.children) {
        // 检查当前路径是否匹配主导航或其子导航
        if (pathname === item.href || item.children.some(child => pathname === child.href)) {
          return item.href
        }
      }
    }
    return null
  }, [pathname])

  // 当路径变化时，同步展开状态
  useEffect(() => {
    setExpandedItem(shouldExpandItem)
  }, [shouldExpandItem])

  useEffect(() => {
    setHydrated(true)
  }, [])

  // 合并session初始化和auth状态监听，避免重复查询
  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | null = null

    const initSession = async () => {
      const currentSession = await getSession()
      if (isMounted) {
        setSession(currentSession)
        // 如果有session，获取用户资料
        if (currentSession) {
          const profile = await getUserProfile()
          if (isMounted) {
            setUserProfile(profile)
          }
        }
      }
    }

    // 初始化session
    initSession()

    // 监听认证状态变化
    unsubscribe = onAuthStateChange(async (event, session) => {
      if (isMounted) {
        setSession(session)
        if (session) {
          // 只在登录或token刷新时获取用户资料，避免重复查询
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const profile = await getUserProfile()
            if (isMounted) {
              setUserProfile(profile)
            }
          }
        } else {
          // 用户登出时清空用户资料
          setUserProfile(null)
        }
      }
    })

    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  // 加载和订阅未读消息数
  const loadUnreadCount = useCallback(async () => {
    if (!session) {
      setTotalUnreadCount(0)
      return
    }
    try {
      const count = await getTotalUnreadCount()
      setTotalUnreadCount(count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }, [session])

  // 初始加载未读消息数
  useEffect(() => {
    loadUnreadCount()
  }, [loadUnreadCount])

  // 订阅会话更新，实时更新未读消息数
  useEffect(() => {
    if (!session) return

    const unsubscribeConversations = subscribeToConversations(() => {
      // 延迟一点刷新，确保数据库已更新
      setTimeout(() => {
        loadUnreadCount()
      }, 300)
    })

    // 订阅通知更新（系统消息和互动消息）
    const unsubscribeNotifications = subscribeToNotifications(() => {
      // 延迟一点刷新，确保数据库已更新
      setTimeout(() => {
        loadUnreadCount()
      }, 300)
    })

    // 添加定期刷新作为备用机制（每10秒刷新一次）
    const intervalId = setInterval(() => {
      loadUnreadCount()
    }, 10000)

    // 当页面变为可见时刷新未读消息数
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUnreadCount()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 当窗口获得焦点时刷新未读消息数
    const handleFocus = () => {
      loadUnreadCount()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      unsubscribeConversations()
      unsubscribeNotifications()
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [session, loadUnreadCount])

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      // 如果有子导航，切换展开状态
      setExpandedItem(expandedItem === item.href ? null : item.href)
    } else {
      // 如果没有子导航，点击时收起其他所有子导航
      setExpandedItem(null)
    }
  }

  const handleLogout = async () => {
    try {
      setUserMenuOpen(false)
      await signOut()
      // router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('退出登录失败:', error)
      // 即使退出失败，也跳转到登录页
      // router.push('/login')
    }
  }

  return (
    <>   
      {/* 顶部导航栏：同色系米色背景 + 毛玻璃效果 */}
      <header className="sticky top-0 pt-[1.2rem] z-50 w-full  bg-[#FDFBF7]/85 backdrop-blur-md transition-all">
        <div className="relative flex h-16 items-center justify-between px-4 sm:px-6 max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 w-12 sm:w-auto">
            <Link
              href="/"
              className="flex items-center justify-center lg:hidden"
              aria-label="返回首页"
              onClick={() => {
                setMobileMenuOpen(false)
                setExpandedItem(null)
              }}
            >
              <Logo variant="icon" width={32} height={32} />
            </Link>
          </div>

          {/* 右侧：功能区 */}
          <div className="flex items-center gap-2 sm:gap-3 justify-end w-auto sm:min-w-fit">
            <Button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-stone-500 hover:bg-stone-200/50 rounded-full"
              variant="ghost"
              size="icon"
              aria-label="菜单"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* 搜索图标 - 桌面端显示 */}
            <div className="hidden md:block">
              <HeaderSearch />
            </div>

            {/* 通知按钮 - 仅已登录用户显示 */}
            {session && (
              <Link href="/messages">
                <Button 
                  className="text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 relative h-9 w-9 rounded-full"
                  variant="ghost" 
                  size="icon"
                >
                  <Bell className="h-5 w-5" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#C82E31] ring-2 ring-[#FDFBF7]" />
                  )}
                </Button>
              </Link>
            )}

            {/* 已登录用户：头像下拉菜单 */}
            {session ? (
              <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <PopoverTrigger asChild>
                  <Button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-stone-200/60 transition-colors" variant="ghost">
                    <div className="w-8 h-8 rounded-full border border-white shadow-sm flex items-center justify-center overflow-hidden bg-stone-100 hover:ring-2 hover:ring-[#C82E31]/20 transition-all">
                      {userProfile?.avatar_url ? (
                        <Image
                          src={userProfile.avatar_url}
                          alt={userProfile.nickname || '用户头像'}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <User className="h-4 w-4 text-stone-600" />
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-stone-500 hidden lg:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  align="end" 
                  sideOffset={8}
                  className="w-48 p-1 bg-white border border-ink-200 shadow-lg rounded-lg"
                >
                  <div className="flex flex-col">
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 rounded-md transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span>个人中心</span>
                    </Link>
                    <Link
                      href="/community/drafts"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 rounded-md transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      <span>我的草稿</span>
                    </Link>
                    <Link
                      href="/profile/reports"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 rounded-md transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>我的举报</span>
                    </Link>
                    <Button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 rounded-md transition-colors text-left w-full justify-start"
                      variant="ghost"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>退出登录</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              /* 未登录用户：显示登录链接 */
              <Link
                href={`/login?redirect=${encodeURIComponent(
                  pathname + (hydrated && searchParams?.toString() ? `?${searchParams.toString()}` : '')
                )}`}
                className="px-4 py-2 text-sm text-stone-700 hover:text-stone-900 transition-colors"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 移动端菜单 - 悬浮显示，带遮罩 */}
      {hydrated && mobileMenuOpen
        ? createPortal(
            <>
              <div 
                className="fixed inset-0 bg-white/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />

              <div className="fixed top-[calc(4rem+1.2rem)] left-0 right-0 bg-white border-b shadow-lg z-50 md:hidden transition-all duration-200 ease-in-out max-h-[calc(100vh-5.2rem)] overflow-y-auto">
                <div className="px-4 py-3 border-b border-ink-100">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ink-400" />
                      <Input
                        type="text"
                        placeholder="搜索案例、关键词、卦象..."
                        value={mobileSearchQuery}
                        onChange={(e) => setMobileSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && mobileSearchQuery.trim()) {
                            if (pathname !== '/cases') {
                              router.push(`/cases?q=${encodeURIComponent(mobileSearchQuery.trim())}`)
                            }
                            setMobileMenuOpen(false)
                          }
                        }}
                        className="pl-10 bg-white border-ink-200"
                      />
                    </div>
                    <Button 
                      className="bg-ink-800 hover:bg-ink-900 text-white"
                      onClick={() => {
                        if (mobileSearchQuery.trim()) {
                          if (pathname !== '/cases') {
                            router.push(`/cases?q=${encodeURIComponent(mobileSearchQuery.trim())}`)
                          }
                          setMobileMenuOpen(false)
                        }
                      }}
                    >
                      搜索
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col py-2">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || 
                      pathname.startsWith(item.href + '/') ||
                      (item.children && item.children.some(child => pathname === child.href))
                    const isExpanded = expandedItem === item.href
                    const hasChildren = item.children && item.children.length > 0

                    return (
                      <div key={item.href}>
                        <div className="flex items-center">
                          <Link
                            href={item.href}
                            onClick={(e) => {
                              if (hasChildren) {
                                e.preventDefault()
                                handleNavClick(item)
                              } else {
                                setMobileMenuOpen(false)
                                handleNavClick(item)
                              }
                            }}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors rounded-lg mx-2 ${
                              isActive
                                ? 'text-ink-800 bg-ink-50'
                                : 'text-ink-600 hover:bg-ink-50 hover:text-ink-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{item.label}</span>
                              {hasChildren && (
                                <ChevronDown 
                                  className={`h-4 w-4 text-ink-500 transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              )}
                            </div>
                          </Link>
                        </div>
                        {hasChildren && isExpanded && (
                          <div className="ml-4 mt-1 space-y-1">
                            {item.children!.map((child) => {
                              const isChildActive = pathname === child.href
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => {
                                    setMobileMenuOpen(false)
                                    setExpandedItem(null)
                                  }}
                                  className={`block px-4 py-2 text-sm font-medium transition-colors rounded-lg mx-2 ${
                                    isChildActive
                                      ? 'text-ink-800 bg-ink-50'
                                      : 'text-ink-800 hover:bg-ink-50'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  )
}
