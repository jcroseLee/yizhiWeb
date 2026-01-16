'use client'

import AppSidebar from "@/lib/components/AppSidebar";
import Navigation from "@/lib/components/Navigation";
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  const isHomePage = pathname === '/'
  const isReaderPage = pathname.startsWith('/library/reader/')

  if (isAuthPage || isHomePage) {
    return <>{children}</>
  }

  return (
    <>
      {/* 顶部导航栏 - 固定 */}
      <Suspense fallback={
        <nav className="bg-white/90 border-b sticky top-0 z-50 pt-5 nav-bg-pattern">
          <div className="flex items-center h-16 relative max-w-full overflow-hidden">
            <div className="w-64 shrink-0 flex px-4 h-full border-r max-md:w-auto max-md:px-2 max-md:border-r-0 max-md:min-w-0">
              <div className="flex pl-2 pt-2 max-md:pl-1">
                <div className="w-32 h-8 bg-ink-100 animate-pulse rounded" />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-end gap-4 px-4 max-md:gap-2 max-md:px-2 min-w-0">
              <div className="w-24 h-8 bg-ink-100 animate-pulse rounded" />
            </div>
          </div>
        </nav>
      }>
        <Navigation />
      </Suspense>
      
      {/* 主布局容器 - 响应式高度，移动端使用 100dvh 解决地址栏问题 */}
      <div className="flex relative h-[calc(100vh-5.5rem)] max-md:h-[calc(100dvh-5.5rem)]">
        {/* 左侧边栏 - 固定，移动端隐藏 */}
        <aside className="hidden lg:block w-64 border-r border-ink-200 shrink-0 overflow-y-auto bg-white">
          <AppSidebar />
        </aside>
        
        {/* 主内容区 */}
        <main className="flex-1 overflow-hidden relative z-0 h-full paper-texture">
          <div
            id="app-scroll-container"
            className={`h-full overflow-x-hidden ${isReaderPage ? 'overflow-hidden' : 'overflow-y-auto'}`}
          >
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
