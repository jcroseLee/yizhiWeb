'use client'

import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import { useToast } from '@/lib/hooks/use-toast'
import { checkIn, hasCheckedInToday } from '@/lib/services/growth'
import { getDailyFortune } from '@/lib/utils/dailyFortune'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * 节气印章组件
 */
const SolarTermSeal = ({ term }: { term: string }) => {
  if (!term || term.length < 2) return null

  return (
    <div className="relative w-11 h-16 shrink-0 select-none">
      {/* SVG 背景：模拟不规则石刻印章 */}
      <svg 
        viewBox="0 0 44 64" 
        className="w-full h-full drop-shadow-sm filter contrast-125" 
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feComposite operator="in" in2="SourceGraphic" result="monoNoise"/>
            <feBlend in="SourceGraphic" in2="monoNoise" mode="multiply" />
          </filter>
        </defs>
        
        <path 
          d="M10,4 Q18,-1 30,5 Q42,10 41,25 Q42,40 38,50 Q35,62 22,62 Q8,63 4,50 Q-1,35 3,20 Q5,8 10,4 Z" 
          fill="#b36d61" 
          filter="url(#noise)" 
        />
        
        <path 
          d="M12,6 Q18,3 28,7 Q36,11 36,25" 
          stroke="#a98175" 
          strokeWidth="1" 
          fill="none" 
          opacity="0.6"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-0.5 z-10">
        <span className="text-white font-serif font-bold text-sm leading-none" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
          {term[0]}
        </span>
        <span className="text-white font-serif font-bold text-sm leading-none mt-1" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
          {term[1]}
        </span>
      </div>
    </div>
  )
}

/**
 * 今日运势卡片 (Daily Fortune Card)
 * 修改版：移除吉凶和宜忌显示
 */
export default function DailyFortuneCard() {
  const { toast } = useToast()
  const [isSigned, setIsSigned] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)

  const today = useMemo(() => {
    const data = getDailyFortune(new Date())
    const dateMatch = data.date.match(/(\d+)月(\d+)日/)
    const month = dateMatch ? dateMatch[1] : ''
    const day = dateMatch ? dateMatch[2].padStart(2, '0') : ''
    return { ...data, month, day }
  }, [])

  // 检查签到状态
  useEffect(() => {
    const checkSignStatus = async () => {
      try {
        setIsLoading(true)
        const checkedIn = await hasCheckedInToday()
        setIsSigned(checkedIn)
      } catch (error) {
        console.error('Failed to check sign status:', error)
      } finally {
        setIsLoading(false)
      }
    }
    checkSignStatus()
  }, [])

  // 处理签到
  const handleCheckIn = async () => {
    try {
      setIsCheckingIn(true)
      const result = await checkIn()
      
      if (result.success) {
        setIsSigned(true)
        
        // 显示成功消息
        toast({
          title: '签到成功！',
          description: result.message || `获得 ${result.coins} 易币，${result.exp} 修业值`,
        })
      } else {
        // 显示错误消息
        toast({
          title: '签到失败',
          description: result.message || '请稍后重试',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to check in:', error)
      toast({
        title: '签到失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setIsCheckingIn(false)
    }
  }

  return (
    <Card className="relative overflow-hidden border border-stone-200/60 bg-[#FDFBF7] rounded-xl shadow-sm hover:shadow-md transition-all duration-500 group">
      {/* 1. 背景纹理 */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ 
          backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }}
      />

      {/* 2. 右上角装饰 SVG */}
      <div className="absolute -right-6 -top-6 opacity-80 pointer-events-none transition-transform duration-700 group-hover:rotate-6">
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="110" cy="50" r="24" fill="url(#sun-gradient)" opacity="0.8"/>
          <path d="M70 70 C 90 60, 130 60, 150 80" stroke="#C82E31" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 6" opacity="0.3"/>
          <path d="M60 90 C 90 80, 120 90, 140 100" stroke="#C82E31" strokeWidth="2" strokeLinecap="round" opacity="0.2"/>
          <defs>
            <linearGradient id="sun-gradient" x1="110" y1="26" x2="110" y2="74" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FCA5A5" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#C82E31" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <CardContent className="p-6 relative z-10">
        {/* ---------------- 头部：日期区域 ---------------- */}
        <div className="flex items-end justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* 节气印章 */}
            {today.solarTerm && <SolarTermSeal term={today.solarTerm} />}

            {/* 日期组合 */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5 font-sans text-stone-800">
                <span className="text-3xl font-bold tracking-tighter">{today.month}</span>
                <span className="text-lg text-stone-400 font-light">/</span>
                <span className="text-3xl font-bold tracking-tighter">{today.day}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500 font-serif mt-1">
                <span>{today.lunar}</span>
                <span className="w-px h-2.5 bg-stone-300"></span>
                <span>{today.week}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 数据条：值卦与冲煞 ---------------- */}
        <div className="relative mb-6">
          {/* 背景虚线框 */}
          <div className="absolute inset-0 border border-dashed border-stone-200 rounded-lg pointer-events-none"></div>
          
          <div className="flex items-center py-2.5 px-3 gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">值卦</span>
              <span className="font-serif font-bold text-stone-700">{today.gua}</span>
            </div>
            <div className="w-px h-3 bg-stone-200"></div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-stone-400">冲煞</span>
              <span className="font-serif text-stone-600 truncate">{today.chong}</span>
            </div>
          </div>
        </div>

        {/* ---------------- 底部：语录与交互 ---------------- */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-400 italic font-serif pr-4 leading-relaxed">
            &ldquo;{today.quote}&rdquo;
          </p>
          
          <Button
            onClick={handleCheckIn}
            disabled={isSigned || isCheckingIn || isLoading}
            variant="outline"
            size="sm"
            className={`
              shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300
              ${isSigned 
                ? 'bg-stone-100 text-stone-400 cursor-default border border-transparent' 
                : 'bg-white text-[#C82E31] border border-[#C82E31]/20 hover:border-[#C82E31] hover:bg-[#fff5f5] shadow-sm hover:shadow-md'
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 加载中
              </>
            ) : isCheckingIn ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 签到中
              </>
            ) : isSigned ? (
              <>
                <Check className="w-3.5 h-3.5" /> 已签
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> 签到
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}