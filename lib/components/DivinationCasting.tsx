'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import Image from 'next/image'

import { AnimatePresence, motion } from 'framer-motion'

import { Button } from '@/lib/components/ui/button'

import { cn } from '@/lib/utils/cn'

// -----------------------------------------------------------------------------
// 类型定义与常量
// -----------------------------------------------------------------------------

interface DivinationCastingProps {
  divinationMethod: number // 0: 手动摇卦, 1: 自动摇卦, 2: 手工起卦
  onCastComplete: (lines: string[], changingFlags: boolean[]) => void
  onStartCasting?: () => boolean | void
}

type LineType = '少阳' | '少阴' | '老阳' | '老阴'

const LINE_CONFIG: Record<LineType, { value: string; isChanging: boolean }> = {
  '少阳': { value: '-----', isChanging: false },  // 少阳 = 阳爻（实线）
  '少阴': { value: '-- --', isChanging: false },  // 少阴 = 阴爻（虚线）
  '老阳': { value: '---O---', isChanging: true },
  '老阴': { value: '---X---', isChanging: true }
}

const LINE_POSITIONS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

// -----------------------------------------------------------------------------
// 子组件：SVG 书法爻线
// -----------------------------------------------------------------------------

const CalligraphyLine = ({ type, isChanging }: { type: LineType; isChanging: boolean }) => {
  const isYang = type === '少阳' || type === '老阳'
  
  return (
    <div className="relative w-32 h-8 flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 140 20" className="drop-shadow-sm">
        {isYang ? (
          <path d="M10 10 Q 70 8, 130 10" stroke="#2C3E50" strokeWidth="6" strokeLinecap="round" fill="none" />
        ) : (
          <>
            <path d="M10 10 Q 35 9, 60 10" stroke="#2C3E50" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M80 10 Q 105 9, 130 10" stroke="#2C3E50" strokeWidth="6" strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
      {isChanging && (
        <div className="absolute -right-6 top-1/2 -translate-y-1/2">
          {type === '老阳' ? (
            <div className="w-3 h-3 rounded-full border-2 border-[#C82E31]" />
          ) : (
             <div className="w-3 h-3 text-[#C82E31] font-bold leading-none">×</div>
          )}
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// 子组件：手工起卦选择器
// -----------------------------------------------------------------------------

const ManualSelector = ({ 
  value, 
  onChange 
}: { 
  value: LineType; 
  onChange: (val: LineType) => void 
}) => {
  return (
    <div className="flex gap-2 bg-stone-100 p-1 rounded-lg">
      {(['少阴', '少阳', '老阴', '老阳'] as LineType[]).map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-md text-xs font-serif transition-all",
            value === type 
              ? "bg-white text-[#C82E31] shadow-sm font-bold ring-1 ring-[#C82E31]/20" 
              : "text-stone-500 hover:bg-stone-200"
          )}
        >
          {type}
        </button>
      ))}
    </div>
  )
}

// -----------------------------------------------------------------------------
// 主组件
// -----------------------------------------------------------------------------

export default function DivinationCasting({
  divinationMethod,
  onCastComplete,
  onStartCasting
}: DivinationCastingProps) {
  // 核心数据状态
  const [lines, setLines] = useState<string[]>([]) 
  const [changingFlags, setChangingFlags] = useState<boolean[]>([])
  const [displayLines, setDisplayLines] = useState<LineType[]>([]) 
  
  // 动画状态
  const [isAnimating, setIsAnimating] = useState(false)
  
  // 关键：使用旋转角度数组，而不是 'yin'/'yang' 字符串
  // 初始全为 0 (阴面朝上)
  const [coinRotations, setCoinRotations] = useState<number[]>([0, 0, 0])
  
  // 其他状态
  const [hasStarted, setHasStarted] = useState(false)
  const [manualSelection, setManualSelection] = useState<LineType[]>(Array(6).fill('少阳'))
  const [showManualUI, setShowManualUI] = useState(false)
  
  const prevMethodRef = useRef(divinationMethod)
  
  // 切换方法时重置
  useLayoutEffect(() => {
    if (prevMethodRef.current !== divinationMethod) {
      prevMethodRef.current = divinationMethod
      setTimeout(() => {
        setHasStarted(false)
        setShowManualUI(false)
        setLines([])
        setChangingFlags([])
        setDisplayLines([])
        setCoinRotations([0, 0, 0])
        setManualSelection(Array(6).fill('少阳'))
        setIsAnimating(false)
      }, 0)
    }
  }, [divinationMethod])

  // ---------------------------------------------------------------------------
  // 核心摇卦逻辑
  // ---------------------------------------------------------------------------
  
  const performCast = useCallback(() => {
    if (lines.length >= 6 || isAnimating) return
    
    setIsAnimating(true)
    // 1. 计算这一轮的结果
    const newRotations = [...coinRotations]
    const currentResults: ('yin'|'yang')[] = []
    
    for (let i = 0; i < 3; i++) {
      const isYang = Math.random() < 0.5
      currentResults.push(isYang ? 'yang' : 'yin')
      
      // 计算目标旋转角度：
      // 基础增加 5圈 (1800度) 保证动画够长
      let nextRotation = newRotations[i] + 1800 
      
      // 修正角度以匹配结果：
      // Yang (花) 需要停在 180, 540, 900... (mod 360 === 180)
      // Yin (字) 需要停在 360, 720, 1080... (mod 360 === 0)
      const remainder = nextRotation % 360
      
      if (isYang) {
        // 目标是余数 180
        if (remainder !== 180) {
           nextRotation += (180 - remainder + 360) % 360
        }
      } else {
        // 目标是余数 0
        if (remainder !== 0) {
           nextRotation += (360 - remainder) % 360
        }
      }
      
      newRotations[i] = nextRotation
    }
    
    const yangCount = currentResults.filter(r => r === 'yang').length
    
    // 2. 判定爻象
    let type: LineType = '少阳'
    if (yangCount === 0) type = '老阴'
    else if (yangCount === 1) type = '少阳'
    else if (yangCount === 2) type = '少阴'
    else if (yangCount === 3) type = '老阳'
    
    // 3. 触发动画：直接更新角度，Framer Motion 会自动处理过渡
    setCoinRotations(newRotations)
    
    // 4. 时序控制
    // 动画总时长设为 1.0秒 (与 duration 匹配)
    setTimeout(() => {
      // 动画已完成，铜钱静止。
      // 关键：这里什么都不做，只等待。让用户看清铜钱结果。
      
      // 5. 延迟 400ms 后，才出卦象
      setTimeout(() => {
        const config = LINE_CONFIG[type]
        const newLines = [...lines, config.value]
        const newFlags = [...changingFlags, config.isChanging]
        const newDisplay = [...displayLines, type]
        
        setLines(newLines)
        setChangingFlags(newFlags)
        setDisplayLines(newDisplay)
        
        // 此时才允许下一次点击
        setIsAnimating(false)
        
        if (newLines.length === 6) {
          onCastComplete(newLines, newFlags)
        }
      }, 400) // 静止观看时间
      
    }, 1000) // 必须 >= 动画 duration
  }, [lines, changingFlags, displayLines, isAnimating, coinRotations, onCastComplete])

  // 自动起卦副作用
  useEffect(() => {
    if (divinationMethod !== 1 || !hasStarted) return
    if (lines.length >= 6 || isAnimating) return
    // 自动模式节奏：动画1.0s + 静止0.4s + 间隔0.5s = 1.9s 一爻
    const timer = setTimeout(() => performCast(), 500)
    return () => clearTimeout(timer)
  }, [divinationMethod, hasStarted, lines.length, isAnimating, performCast])

  // 手工确认
  const confirmManual = () => {
    const finalLines = manualSelection.map(type => LINE_CONFIG[type].value)
    const finalFlags = manualSelection.map(type => LINE_CONFIG[type].isChanging)
    setLines(finalLines)
    setChangingFlags(finalFlags)
    setDisplayLines(manualSelection)
    setShowManualUI(false)
    onCastComplete(finalLines, finalFlags)
  }

  // ---------------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------------
  
  if (divinationMethod === 2 && showManualUI) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white/50 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-stone-100 animate-in fade-in slide-in-from-bottom-4">
        <h3 className="text-center font-serif text-stone-600 mb-6 font-bold">请逐一指定六爻状态</h3>
        <div className="flex flex-col-reverse gap-4 mb-8">
          {manualSelection.map((val, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-3">
                 <span className="text-xs font-bold text-stone-400 font-serif w-8 text-right">
                    {LINE_POSITIONS[idx]}
                 </span>
                 <div className="w-24 flex justify-center scale-75 origin-left">
                    <CalligraphyLine type={val} isChanging={LINE_CONFIG[val].isChanging} />
                 </div>
              </div>
              <ManualSelector 
                value={val} 
                onChange={(newVal) => {
                  const copy = [...manualSelection]
                  copy[idx] = newVal
                  setManualSelection(copy)
                }} 
              />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4">
          <Button variant="ghost" onClick={() => setShowManualUI(false)}>返回</Button>
          <Button onClick={confirmManual} className="bg-stone-800 hover:bg-stone-900 text-white px-8">
            生成卦象
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* 铜钱展示区 */}
      <div className="relative h-32 w-full flex justify-center items-center gap-6 mb-8" style={{ perspective: '800px' }}>
        {coinRotations.map((rotation, idx) => (
          <motion.div
            key={`coin-${idx}`}
            // 关键优化：控制 Y 轴位移和旋转的曲线，使其完全同步
            animate={{
              rotateY: rotation,
              y: isAnimating ? [0, -150, 0] : 0, // 去掉回弹，只有 [起 -> 落]
              scale: isAnimating ? [1, 1.4, 1] : 1
            }}
            transition={{ 
              duration: 1.0, // 缩短时间，使其更干脆
              ease: "easeOut", // 使用 easeOut 让结束时平缓减速，而不是回弹
              // 错开每个铜钱的起跳时间
              delay: idx * 0.1 
            }}
            className="relative w-20 h-20 shadow-xl rounded-full"
            style={{ 
              transformStyle: 'preserve-3d',
            }}
          >
            {/* 正面 (阴/字) - 0度面 */}
            <div 
              className="absolute inset-0 rounded-full overflow-hidden backface-hidden"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
                backgroundColor: '#fff' // 防止透明穿透
              }}
            >
               <Image 
                 src="/images/ui/coin.svg" 
                 alt="阴" 
                 fill 
                 className="object-contain drop-shadow-md" 
               />
            </div>
            
            {/* 反面 (阳/花) - 180度面 */}
            <div 
              className="absolute inset-0 rounded-full overflow-hidden backface-hidden"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                backgroundColor: '#fff'
              }}
            >
               <Image 
                 src="/images/ui/coin-reverse.svg" 
                 alt="阳" 
                 fill 
                 className="object-contain drop-shadow-md" 
               />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 卦象生成区 (从下往上堆叠) */}
      <div className="w-full max-w-xs min-h-[280px] flex flex-col-reverse justify-start items-center gap-2 mb-8 bg-stone-50/50 rounded-xl p-4 border border-stone-100">
        <AnimatePresence initial={false}>
           {displayLines.map((type, idx) => (
             <motion.div
               key={idx}
               initial={{ opacity: 0, y: 10, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               transition={{ type: "spring", stiffness: 300, damping: 20 }}
               className="flex items-center w-full justify-between px-4 py-1"
             >
               <span className="text-xs text-stone-400 font-serif w-8 text-right">{LINE_POSITIONS[idx]}</span>
               <CalligraphyLine type={type} isChanging={LINE_CONFIG[type].isChanging} />
               <span className="text-xs text-stone-500 font-serif w-8 text-left">{type}</span>
             </motion.div>
           ))}
        </AnimatePresence>
        
        {lines.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-stone-300 text-sm font-serif italic">
             虚位以待，静候天机
          </div>
        )}
      </div>

      {/* 按钮区 */}
      <div className="z-10">
         {divinationMethod === 2 && !showManualUI && lines.length === 0 && (
            <Button 
               size="lg"
               onClick={() => { 
                 const canStart = onStartCasting?.() !== false
                 if (canStart) {
                   setShowManualUI(true)
                 }
               }}
               className="bg-[#C82E31] hover:bg-[#A61B1F] text-white font-serif px-12 shadow-lg shadow-red-900/20"
            >
               开始手工排盘
            </Button>
         )}
         {divinationMethod === 1 && lines.length === 0 && (
             <Button
               size="lg"
               onClick={() => { 
                 const canStart = onStartCasting?.() !== false
                 if (canStart) {
                   setHasStarted(true)
                   performCast()
                 }
               }}
               className="bg-[#C82E31] hover:bg-[#A61B1F] text-white font-serif px-12 shadow-lg shadow-red-900/20"
            >
               启动自动演算
            </Button>
         )}
         {divinationMethod === 0 && lines.length < 6 && (
            <Button
              size="lg"
              disabled={isAnimating}
              onClick={() => {
                 if (lines.length === 0) {
                   const canStart = onStartCasting?.() !== false
                   if (!canStart) return
                 }
                 performCast()
              }}
              className="bg-[#C82E31] hover:bg-[#A61B1F] text-white font-serif px-12 h-14 text-lg shadow-lg shadow-red-900/20 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {lines.length === 0 ? '掷第一爻' : `掷${LINE_POSITIONS[lines.length]}`}
            </Button>
         )}
         
         {lines.length > 0 && lines.length < 6 && (
            <p className="mt-4 text-stone-500 text-xs font-serif animate-pulse h-4 text-center">
               {isAnimating ? '...' : '请继续掷下一爻'}
            </p>
         )}
      </div>
    </div>
  )
}
