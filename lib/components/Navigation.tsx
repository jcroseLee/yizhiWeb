'use client'

import { HeaderSearch } from '@/lib/components/HeaderSearch'
import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import { getSession, onAuthStateChange, signOut } from '@/lib/services/auth'
import { getTotalUnreadCount, subscribeToConversations } from '@/lib/services/messages'
import { subscribeToNotifications } from '@/lib/services/notifications'
import { getUserProfile, type UserProfile } from '@/lib/services/profile'
import type { Session } from '@supabase/supabase-js'
import { Bell, ChevronDown, FileText, LogOut, Menu, Search, User, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  { href: '/6yao', label: '排盘工具' },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
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
      {/* 导航栏 - 响应式布局 */}
      <nav className="bg-white/90 border-b sticky top-0 z-50 pt-5 nav-bg-pattern">
        <div className="flex items-center h-16 relative max-w-full overflow-hidden">
          {/* 左侧：Logo区域 - 响应式宽度 */}
          <div className="w-64 shrink-0 flex px-4 h-full border-r max-md:w-auto max-md:px-2 max-md:border-r-0 max-md:min-w-0">
            <Link href="/" className="flex pl-2 pt-2 max-md:pl-1">
              <svg width="300" height="50" viewBox="0 0 300 50" className="max-md:w-[200px] max-md:h-[33px]" xmlns="http://www.w3.org/2000/svg">
                <g transform="translate(0, 5)">
                  <path d="M10 6 Q 8 12 8 18" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                  <path d="M8 22 Q 8 28 10 34" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                  <path d="M18 8 Q 30 6, 42 8" stroke="#2C3E50" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M16 20 L 22 20" stroke="#2C3E50" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="30" cy="20" r="3.5" fill="#C82E31" />
                  <path d="M38 20 L 44 20" stroke="#2C3E50" strokeWidth="4" strokeLinecap="round" />
                  <path d="M18 32 Q 30 34, 42 32" stroke="#2C3E50" strokeWidth="4" strokeLinecap="round" fill="none" />
                </g>
                <text x="58" y="34" fontFamily="'Noto Serif SC', 'Songti SC', serif" fontWeight="bold" fontSize="34" fill="#2C3E50" letterSpacing="6">
                  易知
                </text>
                
              </svg>
            </Link>
          </div>
          
          {/* 右侧：操作区 - 响应式布局，靠右对齐 */}
          <div className="flex-1 flex items-center justify-end gap-4 px-4 max-md:gap-2 max-md:px-2 min-w-0">            
            {/* 搜索栏 - 桌面端显示，移动端隐藏 */}
            <div className="max-md:hidden">
              <HeaderSearch />
            </div>
            
            {/* 移动端菜单按钮 */}
            <Button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-ink-50 rounded-full transition-colors"
              variant="ghost"
              size="icon"
              aria-label="菜单"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-ink-600" />
              ) : (
                <Menu className="h-5 w-5 text-ink-600" />
              )}
            </Button>

            {/* 通知按钮 - 仅已登录用户显示 */}
            {session && (
              <Link href="/messages">
                <Button className="p-2 hover:bg-ink-50 rounded-full transition-colors relative" variant="ghost" size="icon">
                  <Bell className="h-5 w-5 text-ink-600" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 bg-cinnabar-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            
            {/* 已登录用户：显示用户头像下拉菜单 */}
            {session ? (
              <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <PopoverTrigger asChild>
                  <Button className="flex items-center gap-2 p-2 hover:bg-ink-50 rounded-full transition-colors" variant="ghost">
                    <div className="w-8 h-8 rounded-full border border-ink-200 flex items-center justify-center overflow-hidden bg-ink-100">
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
                        <User className="h-4 w-4 text-ink-800" />
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-ink-600 hidden lg:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
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
                href="/login"
                className="px-4 py-2 text-sm text-ink-700 hover:text-ink-800 transition-colors"
              >
                登录
              </Link>
            )}
          </div>
        </div>

      </nav>

      {/* 移动端菜单 - 悬浮显示，带遮罩 */}
      {mobileMenuOpen && (
        <>
          {/* 半透明白色遮罩 */}
          <div 
            className="fixed inset-0 bg-white/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          
          {/* 菜单内容 - 悬浮在遮罩上方 */}
          <div className="fixed top-16 left-0 right-0 bg-white border-b shadow-lg z-50 md:hidden transition-all duration-200 ease-in-out">
            {/* 移动端搜索栏 */}
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
                // 判断是否激活：精确匹配或路径以该导航项开头（用于详情页）
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
        </>
      )}
    </>
  )
}
