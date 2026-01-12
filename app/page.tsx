'use client'

import Logo from '@/lib/components/Logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/lib/components/ui/avatar'
import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import { getSession, onAuthStateChange, signOut } from '@/lib/services/auth'
import { getUserProfile, type UserProfile } from '@/lib/services/profile'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  ChevronDown,
  ChevronRight, Github,
  LogOut,
  PlayCircle,
  Sparkles,
  Terminal,
  User
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'

// --- 样式补丁 ---
const styles = `
  /* 1. 全局重置：禁用默认滚动，防止冲突 */
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden; /* 关键：禁止 body 滚动 */
    overscroll-behavior: none; /* 禁止橡皮筋效果 */
  }

  /* 2. 独立的滚动容器：接管滚动权 */
  .snap-container {
    height: 100vh; /* 强制占满屏幕 */
    overflow-y: scroll; /* 允许垂直滚动 */
    overflow-x: hidden;
    scroll-snap-type: y mandatory; /* 强制吸附 */
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch; /* 移动端惯性滚动 */
    
    /* 基础纹理移到这里 */
    background-color: #FDFBF7;
    background-image: 
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
  }

  /* 3. 每一屏的吸附规则 */
  .scroll-section {
    min-height: 100vh; /* 每一屏至少一屏高 */
    width: 100%;
    scroll-snap-align: start; /* 顶部对齐 */
    scroll-snap-stop: always; /* 关键：强制停靠，防止飞过 */
    position: relative;
    /* 解决部分浏览器吸附抖动 */
    overflow: hidden; 
  }

  /* 4. 导航栏 */
  .nav-scrolled {
    background: rgba(253, 251, 247, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(28, 25, 23, 0.05);
    box-shadow: 0 4px 20px -5px rgba(0,0,0,0.05);
  }

  /* 卡片悬浮视差 */
  .parallax-card {
    transition: transform 0.1s linear, box-shadow 0.3s ease;
    will-change: transform;
  }
  .parallax-card:hover {
    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }

  /* 藏经阁书页堆叠 */
  .book-layer {
    position: absolute;
    inset: 0;
    border-radius: 2.5rem;
    background: white;
    border: 1px solid rgba(0,0,0,0.05);
    transition: transform 0.4s ease;
    transform-origin: bottom center;
  }
  .group:hover .book-layer-1 { transform: translateY(-6px) scale(0.98); opacity: 0.6; }
  .group:hover .book-layer-2 { transform: translateY(-12px) scale(0.96); opacity: 0.4; }

  /* 社区点阵 */
  .dot-grid {
    background-image: radial-gradient(rgba(16, 185, 129, 0.2) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  /* 3. 第一屏：水墨呼吸 (移动端优化) */
  @keyframes organic-breathe {
    0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    33% { transform: translate(-50%, -50%) scale(1.1) rotate(5deg); border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
    66% { transform: translate(-50%, -50%) scale(1.05) rotate(-5deg); border-radius: 70% 30% 50% 50% / 30% 60% 40% 70%; }
    100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  }
  .ink-aura-main {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 650px;
    height: 650px;
    background: radial-gradient(circle at center, rgba(60, 60, 60, 0.15) 0%, rgba(200, 200, 200, 0) 70%);
    filter: blur(50px);
    animation: organic-breathe 12s infinite ease-in-out;
    z-index: 0;
    pointer-events: none;
  }
  .ink-aura-sub {
    position: absolute;
    top: 45%;
    left: 55%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle at center, rgba(220, 50, 50, 0.12) 0%, transparent 70%);
    mix-blend-mode: multiply;
    filter: blur(60px);
    animation: organic-breathe 15s infinite ease-in-out reverse;
    z-index: 0;
    pointer-events: none;
  }

  /* 移动端媒体查询：减小光晕尺寸，防止喧宾夺主 */
  @media (max-width: 768px) {
    .ink-aura-main { width: 90vw; height: 90vw; opacity: 0.6; filter: blur(30px); }
    .ink-aura-sub { width: 70vw; height: 70vw; opacity: 0.5; filter: blur(40px); }
    /* 移动端隐藏部分多余粒子 */
    .digital-trigram:nth-child(even) {
        display: none;
    }
  }

  /* 4. 第一屏：浮动卦象 */
  @keyframes float-up {
    0% { transform: translateY(120px) rotate(0deg) scale(0.8); opacity: 0; }
    20% { opacity: 0.3; }
    80% { opacity: 0.3; }
    100% { transform: translateY(-120px) rotate(15deg) scale(1.1); opacity: 0; }
  }
  .digital-trigram {
    position: absolute;
    color: #44403c;
    font-family: serif;
    pointer-events: none;
    animation: float-up linear infinite;
    z-index: 1;
  }

  /* 模糊入场 */
  @keyframes blur-in {
    0% { filter: blur(12px); opacity: 0; transform: translateY(10px); }
    100% { filter: blur(0); opacity: 1; transform: translateY(0); }
  }
  .animate-blur-in {
    animation: blur-in 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    opacity: 0;
  }

  /* 共建计划卡片样式 */
  .co-build-card {
    position: relative;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 4px 20px -2px rgba(28, 25, 23, 0.05);
    transition: all 0.3s ease;
  }

  .co-build-card:hover {
    background: rgba(255, 255, 255, 0.85);
    transform: translateY(-2px);
    box-shadow: 0 8px 30px -5px rgba(28, 25, 23, 0.08);
  }

  /* 脉冲光点 */
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(200, 46, 49, 0.2); transform: scale(1); }
    50% { box-shadow: 0 0 0 6px rgba(200, 46, 49, 0); transform: scale(1.1); }
  }

  /* 动态边框遮罩 */
  .gradient-border-mask {
    position: absolute;
    inset: -1px;
    border-radius: 9999px;
    padding: 1px;
    background: linear-gradient(90deg, transparent, rgba(200, 46, 49, 0.3), transparent);
    background-size: 200% 100%;
    animation: border-flow 3s linear infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  @keyframes border-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`

// --- SVG 图标 ---
const IconAIChip = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" className={`w-16 h-16 opacity-90 ${className || ''}`}>
    <path d="M32 4L32 12M32 52L32 60M4 32L12 32M52 32L60 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
    <rect x="16" y="16" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="rgba(200, 46, 49, 0.05)" />
    <circle cx="32" cy="32" r="6" stroke="currentColor" strokeWidth="2" />
    <path d="M32 26V16M32 48V38M26 32H16M48 32H38" stroke="currentColor" strokeWidth="2" />
    <path d="M20 20L24 24M44 20L40 24M20 44L24 40M44 44L40 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const IconScroll = () => (
  <svg viewBox="0 0 64 64" fill="none" className="w-12 h-12 text-stone-700">
    <path d="M12 12H44C48.4183 12 52 15.5817 52 20V52" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 16V48M24 16V48M32 16V48M40 16V48" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
    <path d="M12 12V44C12 48.4183 15.5817 52 20 52H52" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 52V56M26 52V56M34 52V56M42 52V56" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const IconCompass = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className || "w-10 h-10 text-orange-600"}>
    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.3" strokeDasharray="4 4" className="spin-slow" style={{animationDuration: '30s'}}/>
    <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
    <path d="M32 12L32 52M12 32L52 32" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    <path d="M32 20L36 32L32 44L28 32L32 20Z" fill="currentColor" />
  </svg>
)

const IconCommunity = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className || "w-10 h-10 text-emerald-600"}>
    <circle cx="32" cy="20" r="8" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 52C16 42 24 42 32 42C40 42 48 42 48 52" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 32C8 32 12 28 16 28M56 32C56 32 52 28 48 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

// --- 组件部分 ---

const CentralAura = () => (
  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
    <div className="ink-aura-main" />
    <div className="ink-aura-sub" />
  </div>
)

const TRIGRAMS = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷', '0', '1', '∞', '☳', '☵'];

function createRng(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const FloatingTrigrams = () => {
  const particles = useMemo(() => {
    const rng = createRng(20260111)
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      char: TRIGRAMS[Math.floor(rng() * TRIGRAMS.length)],
      left: `${rng() * 80 + 10}%`,
      top: `${rng() * 80 + 10}%`,
      delay: `${rng() * 8}s`,
      duration: `${20 + rng() * 15}s`,
      size: `${14 + rng() * 24}px`
    }))
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div key={p.id} className="digital-trigram" style={{ left: p.left, top: p.top, fontSize: p.size, animationDelay: p.delay, animationDuration: p.duration }}>
          {p.char}
        </div>
      ))}
    </div>
  )
}

function LandingPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [scrolled, setScrolled] = useState(false)
  
  // 滚动容器的 Ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [scrollY, setScrollY] = useState(0);
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // 核心修复：滚动监听需要绑定在 scrollContainerRef 上，而不是 window
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
        setScrolled(container.scrollTop > 20);
        setScrollY(container.scrollTop);
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Auth Logic
  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | null = null

    const initSession = async () => {
      const currentSession = await getSession()
      if (isMounted) {
        setSession(currentSession)
        if (currentSession) {
          const profile = await getUserProfile()
          if (isMounted) setUserProfile(profile)
        }
      }
    }
    initSession()

    unsubscribe = onAuthStateChange(async (event, session) => {
      if (isMounted) {
        setSession(session)
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const profile = await getUserProfile()
          if (isMounted) setUserProfile(profile)
        } else if (!session) {
          setUserProfile(null)
        }
      }
    })

    return () => { isMounted = false; if (unsubscribe) unsubscribe() }
  }, [])

  const handleLogout = async () => {
    try {
      setUserMenuOpen(false)
      await signOut()
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Parallax Calculation
  const getParallaxY = (speed: number) => {
      if (scrollY < 200) return 0;
      return (scrollY - 200) * speed;
  }

  // Scroll to features within the container
  const scrollToFeatures = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const container = scrollContainerRef.current;
    const featuresSection = document.getElementById('features');
    
    if (container && featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Mouse move effect (Spotlight)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (scrollContainerRef.current) {
        // Spotlight works relative to viewport, so clientX/Y is fine
        const x = e.clientX;
        const y = e.clientY;
        scrollContainerRef.current.style.setProperty('--mouse-x', `${x}px`);
        scrollContainerRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <style jsx global>{styles}</style>
      
      {/* 
          Main Scroll Container 
          - snap-container class handles the snap behavior
          - paper-texture class handles the background
      */}
      <div 
        ref={scrollContainerRef}
        className="snap-container text-stone-800 font-sans selection:bg-[#C82E31] selection:text-white relative"
      >
        {/* Spotlight Overlay */}
        <div 
            className="fixed inset-0 pointer-events-none z-30"
            style={{
                background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(200, 46, 49, 0.03), transparent 40%)`
            }} 
        />

        {/* --- Fixed Navigation --- */}
        <header className={`fixed top-0 inset-x-0 z-50 h-20 transition-all duration-500 flex items-center px-6 lg:px-12 ${scrolled ? 'nav-scrolled h-16' : 'bg-transparent'}`}>
           <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between">
              <div className="flex items-center gap-3 group cursor-pointer">
                <Logo />
              </div>

              <nav className="hidden md:flex items-center gap-10">
                  {[
                      { label: '功能特色', href: '#features', isAnchor: true },
                      { label: '藏经阁', href: '/library', isAnchor: false },
                      { label: '社区', href: '/community', isAnchor: false },
                      { label: '案例库', href: '/cases', isAnchor: false },
                      { label: '工具', href: '/tools/6yao', isAnchor: false },
                      { label: '关于我们', href: '#', isAnchor: false }
                  ].map((item) => (
                      item.isAnchor ? (
                          <a 
                              key={item.label} 
                              href={item.href} 
                              onClick={scrollToFeatures}
                              className="text-sm font-medium text-stone-600 hover:text-[#C82E31] transition-all relative group cursor-pointer"
                          >
                              {item.label}
                              <span className="absolute -bottom-2 left-1/2 w-0 h-0.5 bg-[#C82E31] transition-all duration-300 group-hover:w-full group-hover:left-0" />
                          </a>
                      ) : (
                          <Link key={item.label} href={item.href} className="text-sm font-medium text-stone-600 hover:text-[#C82E31] transition-all relative group">
                              {item.label}
                              <span className="absolute -bottom-2 left-1/2 w-0 h-0.5 bg-[#C82E31] transition-all duration-300 group-hover:w-full group-hover:left-0" />
                          </Link>
                      )
                  ))}
              </nav>

              <div className="flex items-center gap-4">
                  {session ? (
                    <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                      <PopoverTrigger asChild>
                        <Button className="flex items-center gap-2 p-2 hover:bg-stone-100 rounded-full transition-colors" variant="ghost">
                          <Avatar className="w-8 h-8 border border-stone-200">
                            {userProfile?.avatar_url ? (
                              <AvatarImage src={userProfile.avatar_url} alt={userProfile.nickname || '用户头像'} />
                            ) : null}
                            <AvatarFallback className="bg-stone-100 text-stone-600">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <ChevronDown className={`h-4 w-4 text-stone-600 hidden md:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" sideOffset={8} className="w-48 p-1 bg-white border border-stone-200 shadow-lg rounded-lg">
                        <div className="flex flex-col">
                          <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-md transition-colors">
                            <User className="h-4 w-4" /> <span>个人中心</span>
                          </Link>
                          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-md transition-colors text-left">
                            <LogOut className="h-4 w-4" /> <span>退出登录</span>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <>
                      <Link href="/login" className="hidden md:block text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">登录</Link>
                      <Link href="/register">
                          <Button className="bg-[#1c1917] hover:bg-[#333] text-white rounded-full px-6 h-10 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 font-medium">
                              立即注册
                          </Button>
                      </Link>
                    </>
                  )}
              </div>
           </div>
        </header>

        {/* --- 1. Hero Section (Mobile Optimized) --- */}
        <section className="scroll-section relative px-6 min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden pt-24 pb-20 md:pt-60 md:pb-48">
            <CentralAura />
            <FloatingTrigrams />
            
            <div className="max-w-5xl mx-auto text-center relative z-20 animate-in fade-in zoom-in duration-1000">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/40 border border-white/60 backdrop-blur-md shadow-sm mb-8 md:mb-12 hover:bg-white/60 hover:border-[#C82E31]/30 transition-all duration-300 cursor-pointer group">
                    <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#C82E31] group-hover:rotate-12 transition-transform" />
                    <span className="text-[10px] md:text-xs font-bold text-stone-600 tracking-wide">v2.0 全新上线：大模型辅助研判</span>
                    <ChevronRight className="w-3 h-3 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* Headline */}
                <h1 className="text-5xl md:text-8xl font-serif font-bold text-stone-900 leading-[1.1] md:leading-[1.15] mb-6 md:mb-10 tracking-tight relative">
                    <div className="animate-blur-in" style={{ animationDelay: '0.3s' }}>
                        连接<span className="text-[#C82E31] relative inline-block mx-1 md:mx-2">
                            古老智慧
                            <svg className="absolute w-full h-3 md:h-4 -bottom-1 md:-bottom-2 left-0 text-[#C82E31] opacity-40" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 12 100 5" stroke="currentColor" strokeWidth="3" fill="none">
                                    <animate attributeName="d" dur="6s" repeatCount="indefinite" values="M0 5 Q 50 12 100 5; M0 5 Q 50 -2 100 5; M0 5 Q 50 12 100 5" />
                                </path>
                            </svg>
                        </span>
                    </div>
                    {/* 移动端换行显示，桌面端同行 */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-0 md:gap-4 animate-blur-in mt-2 md:mt-0" style={{ animationDelay: '0.5s' }}>
                         <span className="hidden md:inline text-stone-300 font-light text-5xl lg:text-7xl">/</span>
                         <span className="mt-1 md:mt-0">与未来算力</span>
                    </div>
                </h1>

                {/* Description */}
                <p className="text-base md:text-xl text-stone-500 mb-10 md:mb-14 max-w-sm md:max-w-2xl mx-auto leading-relaxed font-light animate-blur-in px-2" style={{ animationDelay: '0.7s' }}>
                    易知不仅仅是一个工具，它是通往传统文化的数字桥梁。<br className="hidden md:block" />
                    以<span className="text-stone-900 font-medium border-b border-stone-300/50">数据</span>重构文化脉络，以<span className="text-stone-900 font-medium border-b border-stone-300/50">AI</span> 演绎易理逻辑。
                </p>

                {/* CTAs */}
                <div className="flex flex-col w-full max-w-xs mx-auto md:max-w-none md:flex-row items-center justify-center gap-4 md:gap-5 animate-blur-in" style={{ animationDelay: '0.9s' }}>
                    <Link href="/community" className="w-full md:w-auto">
                        <Button size="lg" className="w-full md:w-auto relative overflow-hidden h-12 md:h-14 px-10 rounded-full bg-gradient-to-r from-[#C82E31] to-[#E63E41] hover:from-[#a61b1f] hover:to-[#C82E31] text-white text-base md:text-lg font-bold shadow-xl shadow-red-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all group">
                            <span className="relative z-10 flex items-center justify-center">
                                开始修习 <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
                        </Button>
                    </Link>
                    <Button size="lg" variant="outline" className="w-full md:w-auto h-12 md:h-14 px-10 rounded-full border-stone-300 text-stone-600 hover:text-stone-900 hover:bg-white/80 backdrop-blur-md hover:border-stone-400 transition-all text-base md:text-lg">
                        <PlayCircle className="w-5 h-5 mr-2" /> 观看演示
                    </Button>
                </div>

                {/* Invitation Card (Simplified for Mobile) */}
                <Link href="/co-build">
                    <div 
                        className="mt-12 md:mt-20 relative group cursor-pointer animate-blur-in opacity-80 hover:opacity-100 transition-opacity"
                        style={{ animationDelay: '1.2s' }}
                    >
                        {/* Decorative Line (Hidden on mobile to reduce noise) */}
                        <div className="hidden md:block absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-transparent to-stone-300/50" />
                        
                        <div className="co-build-card rounded-full p-1.5 md:px-3 md:py-2 pr-4 md:pr-6 flex items-center gap-3 md:gap-4 max-w-[280px] md:max-w-md mx-auto bg-white/50 backdrop-blur-md border border-white/60 shadow-sm">
                            <div className="gradient-border-mask" />
                            
                            {/* Icon */}
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-stone-100 to-white border border-stone-100 shadow-sm flex items-center justify-center relative overflow-hidden shrink-0">
                                <div className="absolute inset-0 bg-[#C82E31]/5 animate-pulse" />
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#C82E31] relative z-10" style={{ animation: 'pulse-glow 2s infinite' }} />
                            </div>
                            
                            {/* Text */}
                            <div className="text-left flex-1 min-w-0">
                                <div className="text-[10px] md:text-xs text-stone-500 flex items-center gap-1.5">
                                    <span className="font-serif italic text-stone-400">Join Us</span>
                                </div>
                                <div className="text-xs md:text-sm text-stone-800 truncate">
                                    成为 <span className="font-bold font-serif text-[#C82E31]">数字易学</span> 共建者
                                </div>
                            </div>
                            
                            {/* Arrow */}
                            <div className="text-stone-300 group-hover:text-[#C82E31] group-hover:translate-x-1 transition-all duration-300">
                                <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        </section>

        {/* --- 2. Features Section --- */}
        <section id="features" className="scroll-section py-32 px-6 relative z-10 overflow-hidden min-h-screen flex flex-col justify-center">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-24 relative">
                    <h2 className="text-3xl lg:text-4xl font-serif font-bold text-stone-900 mb-4">全栈式修习体验</h2>
                    <p className="text-stone-400">从起卦到研判，从理论到实战，一站式打通</p>
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-12 w-px h-24 bg-gradient-to-b from-stone-300 to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8 lg:min-h-[700px] items-start">
                    
                    {/* Feature 1: AI */}
                    <Link 
                        href="/chat"
                        className="md:col-span-6 lg:col-span-7 parallax-card block"
                        style={{ transform: `translateY(${getParallaxY(0.05)}px)` }}
                    >
                        <Card className="h-full bg-[#0c0a09] border-[#1c1917] shadow-2xl relative overflow-hidden group rounded-[2.5rem] cursor-pointer">
                            <div className="holo-scan" />
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#C82E31]/20 to-transparent rounded-full blur-[100px] opacity-50 group-hover:opacity-80 transition-opacity duration-1000" />

                            <CardContent className="h-full p-12 flex flex-col justify-between relative z-10 text-white">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#C82E31] transition-colors duration-500 shadow-inner">
                                            <IconAIChip className="text-[#C82E31] group-hover:text-white transition-colors duration-500" />
                                        </div>
                                        <span className="font-mono text-[10px] text-stone-500 border border-stone-800 px-2 py-1 rounded-full">MODEL-GEN-3</span>
                                    </div>
                                    <div>
                                        <h3 className="text-3xl lg:text-4xl font-serif font-bold text-white mb-4 tracking-wide">易知 AI 助手</h3>
                                        <p className="text-stone-400 text-lg leading-relaxed font-light">它读过三千古籍，亦懂现代逻辑。<br/>无需繁琐查询，只需一句自然语言，即刻获得包含<span className="text-[#C82E31]">象数理</span>的深度解析。</p>
                                    </div>
                                </div>
                                <div className="mt-12 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 font-mono text-xs shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                                        <Terminal className="w-3 h-3 text-emerald-500" />
                                        <span className="text-stone-500">SYSTEM_READY</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-3 opacity-60"><span className="text-stone-500">user&gt;</span><span className="text-stone-300">解析火风鼎变大有...</span></div>
                                        <div className="flex gap-3"><span className="text-[#C82E31]">ai&gt;</span><span className="text-emerald-400">正在检索《增删卜易》...</span></div>
                                        <div className="pl-8 text-stone-400 leading-relaxed border-l border-white/10 ml-1"><span className="text-white">结论：</span>化进神，吉。<br/>鼎卦五爻动，以此为基，变卦火天大有...</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <div className="md:col-span-6 lg:col-span-5 flex flex-col gap-8">
                      {/* Feature 2: Library */}
                      <Link href="/library" className="flex-1 parallax-card relative group cursor-pointer block" style={{ transform: `translateY(${getParallaxY(-0.08)}px)` }}>
                          <div className="book-layer book-layer-2 bg-stone-100" />
                          <div className="book-layer book-layer-1 bg-stone-50" />
                          <Card className="h-full bg-[#FAF9F6] border-none shadow-xl rounded-[2.5rem] relative overflow-hidden z-10">
                              <div className="absolute right-6 top-6 opacity-10 font-serif text-4xl writing-vertical-rl text-stone-900 pointer-events-none select-none">知古鉴今</div>
                              <CardContent className="p-10 h-full flex flex-col justify-between relative">
                                  <div>
                                      <div className="w-14 h-14 rounded-2xl bg-stone-200/50 flex items-center justify-center mb-6 group-hover:bg-[#C82E31] group-hover:text-white transition-colors duration-500"><IconScroll /></div>
                                      <h3 className="text-2xl font-serif font-bold text-stone-900 mb-2">数字藏经阁</h3>
                                      <p className="text-stone-500 leading-relaxed text-sm">收录百余部经典古籍。支持<span className="text-stone-800 font-bold">全文检索</span>、<span className="text-stone-800 font-bold">逐句对照</span>，构建结构化知识图谱。</p>
                                  </div>
                                  <div className="flex items-center justify-between mt-6">
                                      <div className="flex -space-x-2 overflow-hidden">
                                          {[1,2,3].map(i => <div key={i} className="w-8 h-10 bg-amber-100 border border-stone-200 rounded-sm shadow-sm transform rotate-3" />)}
                                      </div>
                                      <div className="flex items-center text-sm font-bold text-[#C82E31] gap-2 opacity-80 group-hover:opacity-100 transition-opacity"><span>阅览</span> <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
                                  </div>
                              </CardContent>
                          </Card>
                      </Link>

                      {/* Split Cards */}
                      <div className="flex-1 grid grid-cols-2 gap-6" style={{ transform: `translateY(${getParallaxY(-0.02)}px)` }}>
                          <Link href="/tools/6yao" className="block h-full">
                              <Card className="border-none shadow-lg rounded-[2.5rem] p-6 flex flex-col justify-between group cursor-pointer bg-[#2c2826] text-white relative overflow-hidden parallax-card h-full">
                              <div className="absolute -right-12 -bottom-12 opacity-10"><IconCompass className="w-48 h-48 compass-spin text-white" /></div>
                              <div className="relative z-10">
                                  <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mb-4 border border-orange-500/30 group-hover:bg-orange-500 group-hover:text-white transition-all"><IconCompass className="w-6 h-6" /></div>
                                  <h4 className="font-serif font-bold text-lg mb-1">专业排盘</h4>
                                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Precision Tools</p>
                              </div>
                              <div className="relative z-10 mt-4 flex gap-2">{['四柱','六爻','奇门'].map(t => <span key={t} className="text-[10px] bg-white/10 px-2 py-1 rounded-md text-white/80">{t}</span>)}</div>
                          </Card>
                          </Link>
                          <Link href="/community" className="block h-full">
                              <Card className="border-none shadow-lg rounded-[2.5rem] p-6 flex flex-col justify-between group cursor-pointer bg-white relative overflow-hidden parallax-card h-full">
                              <div className="absolute inset-0 dot-grid opacity-30" />
                              <div className="relative z-10">
                                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm"><IconCommunity className="w-6 h-6" /></div>
                                  <h4 className="font-serif font-bold text-stone-900 text-lg mb-1">易友社区</h4>
                                  <p className="text-[10px] text-stone-400 uppercase tracking-wider">Global Network</p>
                              </div>
                              <div className="relative z-10 mt-4"><div className="flex -space-x-2">{[1,2,3,4].map(i => <Avatar key={i} className="w-6 h-6 border border-white"><AvatarImage src={`https://i.pravatar.cc/100?img=${i+20}`} /></Avatar>)}<div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[8px] border border-white">+99</div></div></div>
                          </Card>
                          </Link>
                      </div>
                  </div>
                </div>
            </div>
        </section>

        {/* --- 4. Showcase: Digital Void --- */}
        <section className="scroll-section py-48 bg-[#050505] relative overflow-hidden text-center min-h-screen flex flex-col justify-center">
            <div className="absolute inset-0 z-0">
                <div className="absolute bottom-0 w-full h-1/2 overflow-hidden perspective-1000"><div className="cyber-grid" /></div>
                <div className="absolute top-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse" />
                <div className="abyss-glow" />
            </div>
            <div className="max-w-5xl mx-auto relative z-10 px-6">
                <div className="mb-20 inline-block relative">
                    <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-red-900/10 to-transparent blur-xl" />
                    <div className="w-px h-20 bg-gradient-to-b from-transparent via-stone-500 to-transparent mx-auto mb-8 opacity-50" />
                    <h2 className="text-3xl lg:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/30 mb-6 leading-tight tracking-wide">“君子居则观其象而玩其辞，<br/>动则观其变而玩其占。”</h2>
                    <p className="text-white/30 text-sm font-mono tracking-[0.3em] uppercase">The Logic of Change · The Code of Life</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 border-t border-white/5 pt-20">
                    {[
                        { title: 'Vector DB', sub: '向量古籍库', desc: 'Embedding', icon: <svg viewBox="0 0 100 100" className="w-full h-full text-stone-500 opacity-50"><circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="totem-spin" /><rect x="35" y="35" width="30" height="30" stroke="currentColor" strokeWidth="1" className="totem-spin-rev" /></svg> },
                        { title: 'Graph RAG', sub: '图谱增强生成', desc: 'Reasoning', icon: <svg viewBox="0 0 100 100" className="w-full h-full text-stone-500 opacity-50"><path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="1" fill="none" className="totem-spin" /><circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1" className="totem-spin-rev" /></svg> },
                        { title: 'Fine-Tuning', sub: '易理微调模型', desc: 'Intelligence', icon: <svg viewBox="0 0 100 100" className="w-full h-full text-stone-500 opacity-50"><circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="8 8" className="totem-spin-rev" /><path d="M50 20 V80 M20 50 H80" stroke="currentColor" strokeWidth="1" className="totem-spin" /></svg> },
                        { title: 'Open Source', sub: '开源共建协议', desc: 'Community', icon: <svg viewBox="0 0 100 100" className="w-full h-full text-stone-500 opacity-50"><path d="M20 20 L80 80 M80 20 L20 80" stroke="currentColor" strokeWidth="1" className="totem-spin" /><rect x="25" y="25" width="50" height="50" stroke="currentColor" strokeWidth="1" className="totem-spin-rev" /></svg> },
                    ].map((item, i) => (
                        <div key={i} className="group relative flex flex-col items-center justify-center">
                            <div className="absolute w-32 h-32 -top-6 transition-all duration-500 group-hover:scale-110 group-hover:text-[#C82E31]">{item.icon}</div>
                            <div className="relative z-10 bg-[#050505]/80 backdrop-blur-sm p-4 rounded-xl border border-white/5 hover:border-[#C82E31]/30 transition-colors">
                                <div className="text-xl font-bold font-serif text-white mb-1 group-hover:text-[#C82E31] transition-colors">{item.title}</div>
                                <div className="text-xs text-stone-400 uppercase tracking-widest mb-1">{item.sub}</div>
                                <div className="text-[10px] font-mono text-stone-600 bg-white/5 px-2 py-0.5 rounded-full inline-block">{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* --- 5. Footer --- */}
        <footer className="scroll-section bg-white border-t border-stone-100 py-20 px-6 relative z-10 min-h-screen flex flex-col justify-center">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
                <div>
                    <div className="flex items-center gap-3 mb-6"><Logo /></div>
                    <p className="text-stone-400 text-sm max-w-xs leading-relaxed">让传统文化在数字时代焕发新生。<br/>Connecting ancient wisdom with future computing.</p>
                </div>
                <div className="grid grid-cols-3 gap-12 lg:gap-24 text-sm">
                    <div className="space-y-4"><h4 className="font-bold text-stone-900">产品</h4><ul className="space-y-2 text-stone-500"><li><a href="#" className="hover:text-[#C82E31]">功能特色</a></li><li><a href="#" className="hover:text-[#C82E31]">藏经阁</a></li><li><a href="#" className="hover:text-[#C82E31]">API 接口</a></li></ul></div>
                    <div className="space-y-4"><h4 className="font-bold text-stone-900">资源</h4><ul className="space-y-2 text-stone-500"><li><a href="#" className="hover:text-[#C82E31]">开发文档</a></li><li><a href="#" className="hover:text-[#C82E31]">社区指南</a></li><li><a href="#" className="hover:text-[#C82E31]">更新日志</a></li></ul></div>
                    <div className="space-y-4"><h4 className="font-bold text-stone-900">关于</h4><ul className="space-y-2 text-stone-500"><li><a href="#" className="hover:text-[#C82E31]">关于我们</a></li><li><a href="#" className="hover:text-[#C82E31]">加入我们</a></li><li><a href="#" className="hover:text-[#C82E31] flex items-center gap-1">Github <Github className="w-3 h-3"/></a></li></ul></div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-stone-100 text-xs text-stone-400 flex flex-col sm:flex-row justify-between items-center gap-4">
                <span>© 2024 YiZhi Platform. All rights reserved.</span>
                <div className="flex gap-6"><span className="cursor-pointer hover:text-stone-600">Privacy Policy</span><span className="cursor-pointer hover:text-stone-600">Terms of Service</span></div>
            </div>
        </footer>
      </div>
    </>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFBF7]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
          <p className="text-stone-600">加载中...</p>
        </div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  )
}
