'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

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
// 子组件：铜钱 SVG - 磨砂金 · 矢量印刻
// -----------------------------------------------------------------------------

const CoinFrontSVG = ({ coinId }: { coinId: string }) => (
  <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={`gold-surface-front-${coinId}`} x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F3E5AB"/>
        <stop offset="30%" stopColor="#C5A065"/>
        <stop offset="70%" stopColor="#8B6D29"/>
        <stop offset="100%" stopColor="#5C4518"/>
      </linearGradient>
      
      <linearGradient id={`rim-light-front-${coinId}`} x1="128" y1="128" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6"/>
        <stop offset="100%" stopColor="#5C4518" stopOpacity="0.6"/>
      </linearGradient>

      <linearGradient id={`text-highlight-${coinId}`} x1="0" y1="0" x2="0" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFEDBC"/>
        <stop offset="1" stopColor="#CCA860"/>
      </linearGradient>

      <filter id={`drop-shadow-front-${coinId}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/>
      </filter>
      
      <filter id={`inner-depth-front-${coinId}`} x="-50%" y="-50%" width="200%" height="200%">
        <feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
        <feGaussianBlur stdDeviation="2" />
        <feOffset dx="1" dy="2" result="offsetblur" />
        <feFlood floodColor="#5C4010" floodOpacity="0.4" />
        <feComposite in2="offsetblur" operator="in" />
        <feComposite in2="SourceAlpha" operator="in" />
        <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode /></feMerge>
      </filter>
    </defs>

    <g filter={`url(#drop-shadow-front-${coinId})`}>
      <g filter={`url(#inner-depth-front-${coinId})`}>
        <circle cx="64" cy="64" r="60" fill={`url(#gold-surface-front-${coinId})`}/>
      </g>
      
      <circle cx="64" cy="64" r="58" stroke={`url(#rim-light-front-${coinId})`} strokeWidth="1.5" fill="none"/>
      <circle cx="64" cy="64" r="48" fill="#000" fillOpacity="0.1"/>
      <circle cx="64" cy="64" r="48" stroke={`url(#rim-light-front-${coinId})`} strokeWidth="1" opacity="0.5"/>

      <g>
         <rect x="44" y="44" width="40" height="40" rx="2" fill="#3E2B0D"/>
         <rect x="46" y="46" width="36" height="36" rx="1" fill="#FDFBF7"/> 
         <rect x="45" y="45" width="38" height="38" rx="1" stroke={`url(#rim-light-front-${coinId})`} strokeWidth="1"/>
      </g>

      <g fontFamily="'Noto Serif SC', 'Songti SC', serif" fontWeight="900" fontSize="22" textAnchor="middle">
        <g fill="#5C4518" opacity="0.8" transform="translate(1, 1)">
          <text x="65" y="36">乾</text><text x="65" y="112">隆</text><text x="106" y="74">通</text><text x="24" y="74">宝</text>
        </g>
        <g fill={`url(#text-highlight-${coinId})`} transform="translate(-0.5, -0.5)">
          <text x="64" y="35">乾</text><text x="64" y="111">隆</text><text x="105" y="73">通</text><text x="23" y="73">宝</text>
        </g>
      </g>
    </g>
  </svg>
)

const CoinBackSVG = ({ coinId }: { coinId: string }) => (
  <svg 
    viewBox="0 0 128 128" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* 1. 表面金属渐变 (磨砂古金) */}
      <linearGradient id={`gold-surface-back-${coinId}`} x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F3E5AB"/>
        <stop offset="30%" stopColor="#C5A065"/>
        <stop offset="70%" stopColor="#8B6D29"/>
        <stop offset="100%" stopColor="#5C4518"/>
      </linearGradient>
      
      {/* 2. 内边缘高光 (模拟倒角) */}
      <linearGradient id={`rim-light-back-${coinId}`} x1="128" y1="128" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6"/>
        <stop offset="100%" stopColor="#5C4518" stopOpacity="0.6"/>
      </linearGradient>

      {/* 3. 文字/纹路浮雕高光 */}
      <linearGradient id={`text-highlight-back-${coinId}`} x1="0" y1="0" x2="0" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFEDBC"/>
        <stop offset="1" stopColor="#CCA860"/>
      </linearGradient>

      {/* 4. 阴影滤镜 */}
      <filter id={`drop-shadow-back-${coinId}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/>
      </filter>
    </defs>

    {/* 整体容器 */}
    <g filter={`url(#drop-shadow-back-${coinId})`}>
      {/* A. 钱币主体 */}
      {/* 外圆 */}
      <circle cx="64" cy="64" r="60" fill={`url(#gold-surface-back-${coinId})`}/>
      <circle cx="64" cy="64" r="58" stroke={`url(#rim-light-back-${coinId})`} strokeWidth="1.5" fill="none"/>
      
      {/* 内部凹陷区域 */}
      <circle cx="64" cy="64" r="48" fill="#000" fillOpacity="0.1"/>
      <circle cx="64" cy="64" r="48" stroke={`url(#rim-light-back-${coinId})`} strokeWidth="1" opacity="0.5"/>

      {/* B. 方孔 */}
      <g>
         <rect x="44" y="44" width="40" height="40" rx="2" fill="#3E2B0D"/>
         <rect x="46" y="46" width="36" height="36" rx="1" fill="#FDFBF7"/> 
         <rect x="45" y="45" width="38" height="38" rx="1" stroke={`url(#rim-light-back-${coinId})`} strokeWidth="1"/>
      </g>

      {/* C. 满文浮雕 (位置调整版) */}
      {/* translate(64, 64) 将坐标原点移至中心 */}
      <g transform="translate(64, 64)">
          {/* 阴影层 (深色衬底) */}
          <g transform="translate(1, 1)" stroke="#5C4518" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8">
              {/* 左侧：满文"宝"(Boo) - 向左调整至 x=-32 */}
              {/* 路径优化：更加圆润，符合铸造特征 */}
              <path d="M-30 -18 C-36 -18 -38 -10 -32 -8 C-28 -6 -36 -4 -36 2 C-36 8 -30 10 -26 8 M-26 8 C-34 12 -34 20 -28 24"/>
              
              {/* 右侧：满文"泉"(Chiowan) - 向右调整至 x=32 */}
              {/* 路径优化：竖线挺拔，分叉有力 */}
              <path d="M30 -22 V 18 M24 -14 H 36 M24 -4 H 36 M26 12 L 36 8 C 36 8 38 18 30 24"/>
          </g>

          {/* 高光层 (亮色顶层) */}
          <g stroke={`url(#text-highlight-back-${coinId})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
               {/* 左侧：满文"宝"(Boo) */}
              <path d="M-30 -18 C-36 -18 -38 -10 -32 -8 C-28 -6 -36 -4 -36 2 C-36 8 -30 10 -26 8 M-26 8 C-34 12 -34 20 -28 24"/>
              
              {/* 右侧：满文"泉"(Chiowan) */}
              <path d="M30 -22 V 18 M24 -14 H 36 M24 -4 H 36 M26 12 L 36 8 C 36 8 38 18 30 24"/>
          </g>
      </g>
    </g>
  </svg>
)

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
      
      // 触感反馈 (Haptic Feedback)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      
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
            className="relative w-20 h-20 rounded-full"
            style={{ 
              transformStyle: 'preserve-3d',
              boxShadow: '0 10px 15px -3px rgba(28, 25, 23, 0.1), 0 4px 6px -2px rgba(28, 25, 23, 0.05)',
            }}
          >
            {/* 正面 (阴/字) - 0度面 */}
            <div 
              className="absolute inset-0 rounded-full overflow-hidden backface-hidden flex items-center justify-center"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
                backgroundColor: '#fff' // 防止透明穿透
              }}
            >
               <div className="w-full h-full flex items-center justify-center drop-shadow-md">
                 <CoinFrontSVG coinId={`coin-${idx}`} />
               </div>
            </div>
            
            {/* 反面 (阳/花) - 180度面 */}
            <div 
              className="absolute inset-0 rounded-full overflow-hidden backface-hidden flex items-center justify-center"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                backgroundColor: '#fff'
              }}
            >
               <div className="w-full h-full flex items-center justify-center drop-shadow-md">
                 <CoinBackSVG coinId={`coin-${idx}`} />
               </div>
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
