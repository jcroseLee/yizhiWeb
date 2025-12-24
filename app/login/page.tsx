'use client'

import Galaxy from '@/lib/components/Galaxy'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
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

      {/* 氛围光晕：在卡片背后添加一个极淡的紫色/金色光晕，增加神秘感 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* 登录卡片容器 */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4 max-md:p-4">
        {/* 顶部 Logo 与 标题 */}
        <div className="flex flex-col items-center space-y-4 mb-8">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.4)" />
                </linearGradient>
              </defs>
              <rect width="200" height="200" rx="40" fill="url(#whiteGradient)"/>
              <path d="M100 40 C 50 40, 20 80, 20 100 C 20 120, 50 160, 100 160 C 150 160, 180 120, 180 100 C 180 80, 150 40, 100 40 Z" 
                    fill="none" stroke="#2C3E50" strokeWidth="8" strokeLinecap="round"/>

              <line x1="70" y1="75" x2="130" y2="75" stroke="#2C3E50" strokeWidth="10" strokeLinecap="round" />
              <line x1="65" y1="100" x2="85" y2="100" stroke="#2C3E50" strokeWidth="10" strokeLinecap="round" />
              <line x1="115" y1="100" x2="135" y2="100" stroke="#2C3E50" strokeWidth="10" strokeLinecap="round" />
              <circle cx="100" cy="100" r="10" fill="#C82E31" />
              <line x1="70" y1="125" x2="130" y2="125" stroke="#2C3E50" strokeWidth="10" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-serif font-medium tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              易 知
            </h1>
            <p className="text-sm text-white/40 tracking-wide font-light">
              探 索 东 方 智 慧 · 洞 见 未 来 之 变
            </p>
          </div>
        </div>

        {/* 玻璃拟态卡片主体 - 磨砂玻璃效果，隐约可见背景星空 */}
        <div className="backdrop-blur-2xl bg-black/20 border border-white/10 rounded-2xl p-8 max-md:p-6 shadow-2xl relative overflow-hidden group">
          {/* 卡片顶部的流光线条 */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {/* 根据模式显示登录或注册表单 */}
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          }>
            {isRegisterMode ? (
              <RegisterForm onSwitchToLogin={() => setIsRegisterMode(false)} />
            ) : (
              <LoginForm onSwitchToRegister={() => setIsRegisterMode(true)} />
            )}
          </Suspense>
        </div>
      </div>

      {/* 底部版权 - 极淡 */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] text-white/20 space-y-1 z-10">
        <p>
          登录即表示您同意我们的{' '}
          <Link href="/terms" className="hover:text-white/40 underline">
            服务条款
          </Link>{' '}
          和{' '}
          <Link href="/privacy" className="hover:text-white/40 underline">
            隐私政策
          </Link>
        </p>
        <p>© 2025 易经摇卦, 保留所有权利</p>
      </div>
    </div>
  )
}

