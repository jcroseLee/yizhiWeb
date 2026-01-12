'use client'

import { getGanZhiInfo, getKongWangPairForStemBranch, getLunarDateString } from '@/lib/utils/lunar';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface GanZhiData {
  stems: Array<{ char: string; tone: string }>
  branches: Array<{ char: string; tone: string }>
}

export function SiZhuCard() {
  // 使用当前时间，每分钟刷新
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 更新时间的函数
    const updateTime = () => setCurrentTime(new Date())
    
    // 立即更新一次，确保时间是最新的
    updateTime()
    
    // 计算到下一个整分钟的剩余时间（毫秒）
    const now = new Date()
    const seconds = now.getSeconds()
    const milliseconds = now.getMilliseconds()
    const msUntilNextMinute = (60 - seconds) * 1000 - milliseconds
    
    // 先设置一个定时器，在下一个整分钟时更新
    const firstTimeoutId = setTimeout(() => {
      updateTime()
      // 之后每分钟更新一次
      intervalRef.current = setInterval(updateTime, 60000)
    }, msUntilNextMinute)

    // 清理定时器
    return () => {
      clearTimeout(firstTimeoutId)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // 格式化日期显示
  const dateStr = useMemo(() => 
    `${currentTime.getFullYear()}年${currentTime.getMonth() + 1}月${currentTime.getDate()}日 ${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`, 
    [currentTime]
  )
  
  const lunarDate = useMemo(() => getLunarDateString(currentTime), [currentTime])

  // 基于当前时间计算四柱信息，不受其他表单控件影响
  const ganZhiData = useMemo(() => getGanZhiInfo(currentTime), [currentTime])

  // 五行颜色映射函数
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
        return 'text-stone-700 bg-stone-50'
    }
  }

  return (
    <div className="bg-white border border-stone-200/80 rounded-sm p-5 relative overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#C82E31]/10"></div>
      
      {/* 日期信息 */}
      <div className="mb-4 border-b border-stone-100 pb-3 space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-stone-400 font-sans">公历</span>
          <span className="text-sm font-bold text-stone-700 font-mono tracking-wide">
            {dateStr}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-stone-400 font-sans">农历</span>
          <span className="text-sm font-semibold text-stone-600 font-serif">
            {lunarDate}
          </span>
        </div>
      </div>
      
      {/* 四柱展示 */}
      <div className="grid grid-cols-4 gap-3 text-center mb-4">
        {ganZhiData.stems.map((stem, index) => {
          const branch = ganZhiData.branches[index]
          const labels = ['年柱', '月柱', '日柱', '时柱']
          const kongWang = getKongWangPairForStemBranch(stem.char, branch.char)
          return (
            <div key={index} className="flex flex-col items-center gap-2">
              <span className="text-[12px] text-stone-400 tracking-widest font-sans">{labels[index]}</span>
              <div className="flex flex-col gap-1.5">
                {/* 天干 */}
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shadow-sm ${getToneClass(stem.tone)}`}>
                  {stem.char}
                </div>
                {/* 地支 */}
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shadow-sm ${getToneClass(branch.tone)}`}>
                  {branch.char}
                </div>
              </div>
              {/* 空亡信息 */}
              <span className="text-[11px] text-stone-400 mt-0.5">{kongWang}</span>
            </div>
          )
        })}
      </div>
      
      {/* 空亡汇总 */}
      {/* <div className="mt-4 pt-3 border-t border-dashed border-stone-200 flex justify-center gap-6 text-[10px] text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
          <span className="font-sans">年空: {getKongWangPairForStemBranch(ganZhiData.stems[0].char, ganZhiData.branches[0].char)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
          <span className="font-sans">日空: {getKongWangPairForStemBranch(ganZhiData.stems[2].char, ganZhiData.branches[2].char)}</span>
        </span>
      </div> */}
    </div>
  )
}
