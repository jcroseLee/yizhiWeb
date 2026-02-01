'use client'

import { cn } from '@/lib/utils/cn'
import { Coins, Loader2, Lock, Sparkles } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { PaymentModal } from './PaymentModal'

export interface BlurredContentProps {
  /**
   * 预览内容/前置内容。
   * 建议传入前 100-200 字的文本或前两个段落的 ReactNode。
   * 组件会显示这部分内容，并在底部进行渐变遮罩。
   */
  preview?: React.ReactNode
  isUnlocked?: boolean
  amount: number
  itemName: string
  balance: number
  onUnlock: () => Promise<void>
  viewCount?: number
  className?: string
  /** 控制预览区域显示的高度，默认 120px */
  visibleHeight?: string
}

export function BlurredContent({
  preview,
  isUnlocked = false,
  amount,
  itemName,
  balance,
  onUnlock,
  viewCount,
  className,
  visibleHeight = '120px' // 默认露出约 5-6 行文字
}: BlurredContentProps) {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [showPayment, setShowPayment] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)

  useEffect(() => {
    setUnlocked(isUnlocked)
  }, [isUnlocked])

  const handlePaymentConfirm = async () => {
    if (balance < amount) {
      return { success: false, error: 'insufficient_balance' }
    }
    try {
      setIsUnlocking(true)
      await onUnlock()
      // 模拟一点延迟感，让用户感知到状态变化
      await new Promise(resolve => setTimeout(resolve, 500))
      setUnlocked(true)
      return { success: true }
    } catch (error) {
      console.error('Payment failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '支付失败，请重试' 
      }
    } finally {
      setIsUnlocking(false)
    }
  }

  // --- 状态 1: 已解锁 ---
  if (unlocked) {
    return (
      <div className={cn("animate-in fade-in duration-700", className)}>
         {/* 
            这里通常由外部父组件控制显示完整内容。
            如果需要在这里显示完整内容，可以接收一个 fullContent prop。
            但根据常见模式，解锁后该组件通常会卸载，或由父组件替换为完整文本。
            此处仅作为一个占位或过渡容器。
         */}
      </div>
    )
  }

  // --- 状态 2: 未解锁 (半透明遮罩模式) ---
  return (
    <div 
      className={cn(
        "relative rounded-xl border border-stone-100 bg-white shadow-sm overflow-hidden",
        "transition-all duration-300 hover:shadow-md hover:border-stone-200",
        className
      )}
    >
      {/* 1. 内容预览层：限制高度，展示部分内容 */}
      <div 
        className="px-6 pt-6 pb-0 select-none text-stone-800 opacity-90"
        style={{ 
          height: visibleHeight,
          overflow: 'hidden',
          // 使用 mask-image 实现文字底部的柔和消失，比单纯盖一层 div 更自然
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
        }}
      >
        {preview ? (
          <div className="prose prose-stone max-w-none text-justify leading-relaxed">
            {preview}
          </div>
        ) : (
          // 骨架屏：如果没有预览内容，显示优雅的模拟文本
          <div className="space-y-4 opacity-50">
            <div className="h-4 bg-stone-200 rounded w-full" />
            <div className="h-4 bg-stone-200 rounded w-[95%]" />
            <div className="h-4 bg-stone-200 rounded w-[90%]" />
            <div className="h-4 bg-stone-200 rounded w-[98%]" />
            <div className="h-4 bg-stone-200 rounded w-[85%]" />
          </div>
        )}
      </div>

      {/* 2. 交互与遮罩层：位于底部，背景毛玻璃 */}
      <div 
        className="absolute top-0 bottom-0 inset-x-0 z-10 flex flex-col items-center justify-end pb-3 pt-3"
        style={{
            // 背景渐变：从完全透明 -> 半透明白 -> 纯白，确保底部文字不被干扰
            // background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 40%, #ffffff 100%)',
            backdropFilter: 'blur(1px)',
            WebkitBackdropFilter: 'blur(1px)'
        }}
      >
        {/* 紧凑型解锁栏 */}
        <div 
            onClick={() => setShowPayment(true)}
            className={cn(
                "group cursor-pointer relative flex items-center gap-1.5 pl-1.5 pr-2 py-1.5",
                "bg-stone-900 hover:bg-stone-800 text-stone-50",
                "rounded-full shadow-lg shadow-stone-900/10",
                "border border-stone-700",
                "transition-all duration-300 transform active:scale-95 hover:-translate-y-0.5"
            )}
        >
            {/* 左侧圆形图标区 */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-800 border border-stone-700 group-hover:border-stone-600 transition-colors">
                {isUnlocking ? (
                    <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                ) : (
                    <Lock className="w-4 h-4 text-[#C82E31]" /> // 易知红点缀
                )}
            </div>

            {/* 中间文字区 */}
            <div className="flex flex-col px-2 text-left">
                <span className="text-xs font-serif text-stone-300 tracking-wide">
                    {itemName}
                </span>
                <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-white leading-none">
                        解锁全文
                    </span>
                    {/* 分割线 */}
                    <span className="h-3 w-px bg-stone-700" />
                    {/* 价格 */}
                    <div className="flex items-center gap-1">
                        <span className="text-amber-400 font-bold text-xs font-mono">{amount}</span>
                        <Coins className="w-3 h-3 text-amber-500" />
                    </div>
                </div>
            </div>

            {/* 右侧箭头/提示 */}
            <div className="pr-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
        </div>

        {/* 底部辅助信息 (可选) */}
        {(viewCount || 0) > 0 && (
            <p className="mt-3 text-[10px] text-stone-400 font-medium">
                已有 {viewCount} 人解锁此内容
            </p>
        )}
      </div>

      <PaymentModal 
        open={showPayment}
        onOpenChange={setShowPayment}
        balance={balance}
        amount={amount}
        itemName={itemName}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  )
}