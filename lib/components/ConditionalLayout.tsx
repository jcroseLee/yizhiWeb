'use client'

import AppSidebar from "@/lib/components/AppSidebar";
import Navigation from "@/lib/components/Navigation";
import { usePathname } from 'next/navigation';

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  const isHomePage = pathname === '/'

  if (isAuthPage || isHomePage) {
    return <>{children}</>
  }

  return (
    <>
      {/* 顶部导航栏 - 固定 */}
      <Navigation />
      
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
            className="h-full overflow-y-auto overflow-x-hidden"
          >
            {children}
          </div>
        </main>
      </div>
    </>
  )
}

