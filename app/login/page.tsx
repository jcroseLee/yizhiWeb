'use client'

import Galaxy from '@/lib/components/Galaxy'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import LoginForm from './components/LoginForm'
import LogoHeader from './components/LogoHeader'
import RegisterForm from './components/RegisterForm'

function AuthContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const [isRegisterMode, setIsRegisterMode] = useState(mode === 'register')

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isRegisterMode ? (
        <RegisterForm onSwitchToLogin={() => setIsRegisterMode(false)} />
      ) : (
        <LoginForm onSwitchToRegister={() => setIsRegisterMode(true)} />
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-black via-slate-950 to-black">
      {/* Galaxy 背景 */}
      <div className="fixed inset-0 w-full h-full z-0">
        <Galaxy
          mouseRepulsion={false}
          mouseInteraction={false}
          density={3}
          glowIntensity={0.3}
          saturation={0}
          hueShift={100}
          transparent={true}
          twinkleIntensity={0.6}
          rotationSpeed={0.15}
          repulsionStrength={2.5}
          autoCenterRepulsion={0}
          speed={1.2}
          rotation={[0.5, 0.3]}
          focal={[0.5, 0.5]}
          starSpeed={0.6}
        />
      </div>

      {/* 多层氛围光晕 - 增强深度感 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-indigo-900/15 rounded-full blur-[8.75rem] pointer-events-none z-0 animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[31.25rem] h-[31.25rem] bg-purple-900/10 rounded-full blur-[6.25rem] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18.75rem] h-[18.75rem] bg-blue-900/20 rounded-full blur-[5rem] pointer-events-none z-0" />

      {/* 登录卡片容器 */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4 max-md:p-4 max-md:max-w-sm">
        {/* 顶部 Logo 与 标题 */}
        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <LogoHeader />
        </div>

        {/* 玻璃拟态卡片主体 - 增强的磨砂玻璃效果 */}
        <div className="backdrop-blur-2xl bg-gradient-to-br from-black/30 via-black/20 to-black/30 border border-white/10 rounded-2xl p-8 max-md:p-6 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-white/20 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]">
          {/* 卡片内部光效 - 顶部渐变 */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          {/* 卡片顶部的流光线条 - 增强动画 */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          
          {/* 卡片底部微光 */}
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          
          {/* 卡片侧边微光效果 */}
          <div className="absolute left-0 top-1/4 w-px h-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <div className="absolute right-0 top-1/4 w-px h-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          
          {/* 根据模式显示登录或注册表单 */}
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <div className="absolute inset-0 w-10 h-10 border-2 border-transparent border-r-indigo-500/40 rounded-full animate-spin animate-reverse" />
              </div>
            </div>
          }>
            <AuthContent />
          </Suspense>
        </div>
      </div>

      {/* 底部版权 - 优化样式和动画 */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-[0.625rem] text-white/25 space-y-1 z-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
        <p className="leading-relaxed">
          登录即表示您同意我们的{' '}
          <Link 
            href="/terms" 
            className="hover:text-white/50 underline underline-offset-2 transition-colors duration-200"
          >
            服务条款
          </Link>
          {' '}和{' '}
          <Link 
            href="/privacy" 
            className="hover:text-white/50 underline underline-offset-2 transition-colors duration-200"
          >
            隐私政策
          </Link>
        </p>
        <p className="text-white/20">© 2025 易知, 保留所有权利</p>
      </div>

    </div>
  )
}

