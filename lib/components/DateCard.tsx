'use client'

import { illustrationImages } from '@/lib/utils/images'
import { getGanZhiInfo, getLunarDateString } from '@/lib/utils/lunar'
import Image from 'next/image'
import { useMemo } from 'react'

interface DateCardProps {
  date: Date
}

export default function DateCard({ date }: DateCardProps) {
  const lunarDate = useMemo(() => getLunarDateString(date), [date])
  const dateStr = useMemo(() => 
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`, 
    [date])
  
  const ganZhiData = useMemo(() => getGanZhiInfo(date), [date])

  const getToneClass = (tone: string) => {
    switch (tone) {
      case 'green':
        return 'text-[#0c8918] bg-[rgba(12,137,24,0.08)]'
      case 'blue':
        return 'text-[#4b5cc4] bg-[rgba(75,92,196,0.08)]'
      case 'red':
        return 'text-[#f20c00] bg-[rgba(242,12,0,0.08)]'
      case 'orange':
        return 'text-[#f2be45] bg-[rgba(242,190,69,0.08)]'
      case 'brown':
        return 'text-[#7c4b00] bg-[rgba(124,75,0,0.08)]'
      default:
        return 'text-[#0c8918] bg-[rgba(12,137,24,0.08)]'
    }
  }

  return (
    <div className="relative overflow-hidden border border-white/30 text-[#4a3f34] font-serif h-auto min-h-[180px]" style={{ backgroundColor: 'rgba(240, 240, 244, 0.5)' }}>
      {/* 背景图片 */}
      <Image
        src={illustrationImages.baishan}
        alt="背景"
        fill
        className="object-cover opacity-50"
        priority
      />
      
      {/* 毛玻璃效果层 */}
      <div className="relative z-10 p-3.5 flex flex-col gap-2.5 bg-transparent">
        <div className="flex justify-between items-start gap-3 relative">
          <div className="flex flex-col gap-1.5 text-[0.72rem] leading-[1.35] text-[#4a3f34] tracking-wide">
            <div className="solar-date">公历：{dateStr}</div>
            <div className="lunar-date">农历：{lunarDate}</div>
          </div>
        </div>
        
        {/* 分隔线 */}
        <div className="h-[0.0625rem] w-full bg-gradient-to-r from-transparent via-[rgba(181,150,104,0.45)] to-transparent my-1.5" />
        
        {/* 干支 */}
        <div className="flex flex-col gap-1.5 items-center">
          {/* 天干行 */}
          <div className="flex gap-7">
            {ganZhiData.stems.map((item, index) => (
              <span
                key={`stem-${index}`}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[0.95rem] font-semibold tracking-wider ${getToneClass(item.tone)}`}
              >
                {item.char}
              </span>
            ))}
          </div>
          
          {/* 地支行 */}
          <div className="flex gap-7">
            {ganZhiData.branches.map((item, index) => (
              <span
                key={`branch-${index}`}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[0.95rem] font-semibold tracking-wider ${getToneClass(item.tone)}`}
              >
                {item.char}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

