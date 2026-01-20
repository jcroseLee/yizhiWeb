'use client'

import AppSidebar from "@/lib/components/AppSidebar";
import Logo from "@/lib/components/Logo";
import Navigation from "@/lib/components/Navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password'
  const isHomePage = pathname === '/'
  const isReaderPage = pathname.startsWith('/library/reader/')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [navVisible, setNavVisible] = useState(true)
  const navInnerRef = useRef<HTMLDivElement | null>(null)
  const [navHeight, setNavHeight] = useState<number | null>(null)

  useEffect(() => {
    if (isReaderPage) return

    const scroller = document.getElementById('app-scroll-container')
    if (!scroller) return

    let prevScrollTop = scroller.scrollTop
    let ticking = false
    const threshold = 8

    const onScroll = () => {
      if (ticking) return
      ticking = true

      requestAnimationFrame(() => {
        const currentScrollTop = scroller.scrollTop
        const delta = currentScrollTop - prevScrollTop

        if (currentScrollTop < 16) {
          setNavVisible(true)
        } else if (delta > threshold) {
          setNavVisible(false)
        } else if (delta < -threshold) {
          setNavVisible(true)
        }

        prevScrollTop = currentScrollTop
        ticking = false
      })
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [isReaderPage, pathname])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNavVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  useEffect(() => {
    const el = navInnerRef.current
    if (!el) return

    const update = () => {
      const nextHeight = el.getBoundingClientRect().height
      setNavHeight(nextHeight > 0 ? nextHeight : null)
    }

    const raf = requestAnimationFrame(update)

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [pathname, sidebarCollapsed])

  if (isAuthPage || isHomePage) {
    return <>{children}</>
  }

  return (
    <div className="flex relative h-screen max-md:h-[100dvh]">
      <div className="pointer-events-none fixed top-0 left-0 right-0 h-[1.3rem] bg-[#FDFBF7] nav-bg-pattern z-51" />

      <aside className={`hidden lg:flex flex-col relative transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-20' : 'w-64'} border-r border-ink-100 bg-white shadow-[1px_0_20px_rgba(0,0,0,0.02)] z-40`}>
        {/* Header: Logo */}
        <div className="shrink-0 pt-5 pb-2">
          <div className="flex items-center justify-center h-16 relative overflow-hidden">
            <Link href="/" className="flex w-full justify-center transition-all duration-300 hover:opacity-80">
              <Logo variant={sidebarCollapsed ? 'icon' : 'full'} />
            </Link>
          </div>
        </div>

        {/* Body: Nav Items */}
        <div className="flex-1 overflow-hidden">
           <AppSidebar collapsed={sidebarCollapsed} />
        </div>

        {/* Floating Toggle Button (悬浮在边界上) */}
        <button
          onClick={() => setSidebarCollapsed(prev => !prev)}
          className="absolute -right-3 top-24 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 shadow-sm transition-all hover:bg-stone-50 hover:text-[#C82E31] hover:border-[#C82E31]/30 hover:scale-110 active:scale-95 group"
          aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#FDFBF7]">
        <div
          className="sticky top-0 z-50 overflow-hidden"
          style={navHeight == null ? undefined : { height: navVisible ? navHeight : 0 }}
        >
          <div
            ref={navInnerRef}
            className={`transition-transform duration-200 ease-out ${navVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'}`}
          >
            <Suspense fallback={<nav className="h-16" />}>
              <Navigation />
            </Suspense>
          </div>
        </div>

        <main className="flex-1 overflow-hidden relative z-0 paper-texture">
          <div
            id="app-scroll-container"
            className={`h-full overflow-x-hidden ${isReaderPage ? 'overflow-hidden' : 'overflow-y-auto'}`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
