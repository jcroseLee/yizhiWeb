'use client'

import { cn } from '@/lib/utils/cn';

interface BaZiPillar {
  label: string
  gan: { char: string; wuxing: string }
  zhi: { char: string; wuxing: string }
}

interface BaZiThumbnailProps {
  pillars: BaZiPillar[]
}

// 五行颜色映射
const getWuxingColor = (wuxing: string) => {
  switch (wuxing) {
    case 'wood':
      return 'text-[#3A7B5E] bg-[rgba(58,123,94,0.08)] border-[rgba(58,123,94,0.15)]'
    case 'fire':
      return 'text-[#C82E31] bg-[rgba(200,46,49,0.08)] border-[rgba(200,46,49,0.15)]'
    case 'earth':
      return 'text-[#8D6E63] bg-[rgba(141,110,99,0.08)] border-[rgba(141,110,99,0.15)]'
    case 'metal':
      return 'text-[#D4AF37] bg-[rgba(212,175,55,0.08)] border-[rgba(212,175,55,0.15)]'
    case 'water':
      return 'text-[#4B7BB6] bg-[rgba(75,123,182,0.08)] border-[rgba(75,123,182,0.15)]'
    default:
      return 'text-stone-700 bg-stone-50 border-stone-200'
  }
}

export default function BaZiThumbnail({ pillars }: BaZiThumbnailProps) {
  if (!pillars || pillars.length !== 4) return null

  return (
    <div className="w-full h-full min-h-[7.5rem] bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-center p-3 relative overflow-hidden">
      {/* 背景装饰文字 */}
      <div className="opacity-10 absolute -right-2 -bottom-4 text-6xl font-serif select-none pointer-events-none text-stone-400">柱</div>
      
      {/* 四柱展示 */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full scale-[0.75] sm:scale-90 origin-center">
        {pillars.map((pillar, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            {/* 标签 */}
            <span className="text-[0.5625rem] sm:text-[0.625rem] text-stone-400 tracking-widest font-sans">
              {pillar.label}
            </span>
            
            {/* 天干 */}
            <div className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center font-bold text-sm sm:text-base shadow-sm font-serif",
              getWuxingColor(pillar.gan.wuxing)
            )}>
              {pillar.gan.char}
            </div>
            
            {/* 地支 */}
            <div className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center font-bold text-sm sm:text-base shadow-sm font-serif",
              getWuxingColor(pillar.zhi.wuxing)
            )}>
              {pillar.zhi.char}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
