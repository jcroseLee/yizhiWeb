'use client'

import { Button } from '@/lib/components/ui/button'
import { type RefObject } from 'react'

// AI 图标组件（优化版：更粗、更亮）
const IconAI = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    style={{ filter: 'drop-shadow(0 0 0.125rem rgba(255, 255, 255, 0.8))' }}
  >
    {/* 字母 A */}
    <path 
      d="M3.5 20L8.5 6L13.5 20" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    
    {/* 字母 I */}
    <path 
      d="M18.5 6V20" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    
    {/* 中间的星光 (实心填充，更明显) */}
    <path 
      d="M8.5 13.5L9.5 11.5L11.5 11L9.5 10.5L8.5 8.5L7.5 10.5L5.5 11L7.5 11.5L8.5 13.5Z" 
      fill="currentColor" 
      stroke="none"
    />
  </svg>
)

// 样式常量
const STYLES = {
  // 旋转光环渐变
  ROTATING_GRADIENT: 'conic-gradient(from 0deg, transparent 0deg, #7f1d1d 90deg, #ff4d4d 130deg, #f59e0b 150deg, #ff4d4d 170deg, #7f1d1d 210deg, transparent 360deg)',
  // 按钮背景渐变
  BUTTON_GRADIENT: 'radial-gradient(circle at 50% 120%, rgb(69, 10, 10) 0%, rgb(144 4 4) 50%, rgb(0, 0, 0) 100%)',
  // 噪点纹理 SVG
  NOISE_TEXTURE: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
} as const

export interface MobileAiButtonProps {
  /** 点击回调 */
  onClick: () => void
  /** AI分析区域的ref（用于滚动到AI分析） */
  aiSectionRef?: RefObject<HTMLDivElement | null>
  /** 是否显示提示红点 */
  showBadge?: boolean
}

/**
 * 移动端 AI 分析按钮
 * 采用拟物化设计：宝石质感 + 发光材质
 */
export function MobileAiButton({ 
  onClick, 
  aiSectionRef,
  showBadge = true 
}: MobileAiButtonProps) {
  const handleClick = () => {
    onClick()
    
    // 等待AI分析区域渲染后再滚动
    if (aiSectionRef?.current) {
      const maxAttempts = 15
      let attempts = 0
      
      const tryScroll = () => {
        if (aiSectionRef.current) {
          requestAnimationFrame(() => {
            aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          })
          return true
        }
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(tryScroll, 150)
        }
        return false
      }
      
      setTimeout(() => {
        tryScroll()
      }, 100)
    }
  }

  return (
    <>
      <div 
        className="relative shrink-0 group z-50 cursor-pointer" 
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="AI 智能详批"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        {/* 1. 外部旋转流光光环 (加强版) */}
        <div 
          className="absolute inset-[-0.1875rem] rounded-full opacity-70 blur-[0.125rem] animate-[spin_4s_linear_infinite]"
          style={{ background: STYLES.ROTATING_GRADIENT }}
          aria-hidden="true"
        />
        
        {/* 2. 外部扩散光晕 (呼吸效果) */}
        <div 
          className="absolute inset-0 rounded-full bg-red-600/30 blur-md animate-[pulse_3s_infinite]"
          aria-hidden="true"
        />

        {/* 3. 按钮主体 */}
        <Button 
          className="relative w-14 h-14 rounded-full p-0 border-none shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] transition-transform active:scale-95 flex items-center justify-center overflow-hidden"
          style={{ background: STYLES.BUTTON_GRADIENT }}
          title="AI 智能详批"
          aria-label="AI 智能详批"
        >
          {/* A. 内部噪点纹理 (增加质感) */}
          <div 
            className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: STYLES.NOISE_TEXTURE }}
            aria-hidden="true"
          />

          {/* B. 顶部高光反射 (玻璃穹顶感) */}
          <div 
            className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/20 to-transparent rounded-t-full pointer-events-none"
            aria-hidden="true"
          />

          {/* C. 底部反光 (边缘光) */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-red-500/20 to-transparent rounded-b-full pointer-events-none"
            aria-hidden="true"
          />
          
          {/* D. 内部流光扫过动画 */}
          <div 
            className="absolute inset-0 w-[200%] -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[20deg] animate-[shimmer_3s_infinite_ease-in-out] pointer-events-none"
            aria-hidden="true"
          />

          {/* E. 图标 */}
          <div className="relative z-10">
            <IconAI className="w-10 h-10 text-white" />
          </div>
        </Button>
        
        {/* 4. 悬浮提示红点 (带波纹) */}
        {showBadge && (
          <span className="absolute top-0 right-0 flex h-3 w-3" aria-label="新功能提示">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C82E31] border-2 border-[#f2edea]" />
          </span>
        )}
      </div>
      
      <style jsx global>{`
        /* AI按钮流光扫过动画 */
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-20deg); }
          30% { transform: translateX(150%) skewX(-20deg); }
          100% { transform: translateX(150%) skewX(-20deg); }
        }
      `}</style>
    </>
  )
}
