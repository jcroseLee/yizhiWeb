'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/lib/components/ui/tooltip'
import { getDailyActivityData } from '@/lib/services/profile'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export interface ActivityHeatmapProps {
  totalActivity: number
  activityData?: Array<{ week: number; date: string; count: number }>
}

export const ActivityHeatmap = ({ totalActivity, activityData: propActivityData }: ActivityHeatmapProps) => {
  const [activityData, setActivityData] = useState<Array<{ week: number; date: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [weeksToShow, setWeeksToShow] = useState(52)
  const containerRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // 核心修复：响应式计算周数
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return

    const updateWeeks = () => {
      const width = containerRef.current?.offsetWidth || 0
      if (width > 0) {
        // 左侧星期轴预留宽度 (w-6 = 24px) + 右侧一点余量
        const labelAreaWidth = 28 
        const availableWidth = width - labelAreaWidth
        
        // 每一列的基础宽度：10px 格子 + 3px 间距 = 13px
        // 我们用这个作为基准来计算能放下多少列
        const colBaseWidth = 13 
        
        const weeks = Math.floor(availableWidth / colBaseWidth)
        
        // 至少显示 10 周，避免太窄报错
        setWeeksToShow(Math.max(10, weeks))
      }
    }

    // 初始化计算
    updateWeeks()

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
        updateWeeks()
    })
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  // 数据加载逻辑
  useEffect(() => {
    const loadActivityData = async () => {
      if (propActivityData) {
        setActivityData(propActivityData)
        setLoading(false)
        return
      }

      try {
        const data = await getDailyActivityData()
        setActivityData(data)
      } catch (error) {
        console.error('Failed to load activity data:', error)
        setActivityData([])
      } finally {
        setLoading(false)
      }
    }

    loadActivityData()
  }, [propActivityData])

  // 样式映射
  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-stone-100/80 hover:bg-stone-200' 
    if (count <= 2) return 'bg-stone-300 hover:bg-stone-400' 
    if (count <= 5) return 'bg-stone-400 hover:bg-stone-500' 
    if (count <= 10) return 'bg-stone-600 hover:bg-stone-700' 
    return 'bg-[#C82E31] hover:bg-[#A61B1F]'
  }

  const getIntensityDescription = (count: number): string => {
    if (count === 0) return '无活动'
    if (count <= 2) return '轻度修习'
    if (count <= 5) return '中度修习'
    if (count <= 10) return '精进修习'
    return '潜心悟道'
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  const calculatedTotal = useMemo(() => 
    activityData.reduce((sum, item) => sum + item.count, 0), 
  [activityData])

  // 生成热力图数据
  const heatmapData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 结束日期设为本周六，保证最后一周是完整的
    const endDate = new Date(today)
    const dayOfWeek = endDate.getDay() // 0-6
    const daysUntilSaturday = 6 - dayOfWeek
    endDate.setDate(endDate.getDate() + daysUntilSaturday)

    // 根据动态计算的 weeksToShow 倒推开始日期
    const totalDays = weeksToShow * 7
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - totalDays + 1)

    const days = []
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(currentDate.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]
      
      const activityItem = activityData.find(d => d.date === dateStr)
      const count = activityItem?.count || 0
      
      days.push({
        date: currentDate,
        dateStr,
        count,
        dayOfWeek: currentDate.getDay()
      })
    }
    
    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    
    return { weeks }
  }, [activityData, weeksToShow])

  // 生成月份标签
  const monthLabels = useMemo(() => {
    const labels = []
    let lastMonth = -1
    
    heatmapData.weeks.forEach((week, index) => {
      const firstDayOfWeek = week[0].date
      const month = firstDayOfWeek.getMonth() + 1
      
      if (month !== lastMonth) {
        lastMonth = month
        // 避免在最开始显示标签，如果它离左边太近（除非总周数很少）
        if (index > 1 || weeksToShow < 15) {
             labels.push({
                weekIndex: index,
                label: `${month}月`
            })
        }
      }
    })
    return labels
  }, [heatmapData, weeksToShow])

  const weekLabels = ['日', '', '二', '', '四', '', '六']

  return (
    <div className="w-full" ref={containerRef}>
      <TooltipProvider delayDuration={0}>
        
        {/* 头部标题 */}
        {/* <div className="flex justify-between items-end mb-4 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-stone-700 flex items-center gap-2 font-serif">
              <CalendarCheck className="w-4 h-4 text-[#C82E31]"/> 
              修业日课
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600 cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-stone-800 text-stone-50 border-stone-700">
                <p className="text-xs leading-relaxed">
                  颜色深浅代表每日修习强度。<br/>
                  包括签到、排盘、发布案例等行为。
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="text-[10px] text-stone-400 font-mono bg-stone-100 px-2 py-0.5 rounded-full">
            近一年累积 {calculatedTotal > 0 ? calculatedTotal : totalActivity} 次
          </div>
        </div> */}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-stone-300" />
          </div>
        ) : (
          <div className="w-full">
            
            {/* 月份轴 */}
            <div className="flex mb-1.5 text-[9px] text-stone-400 relative h-4 w-full">
              {/* 左侧占位，对应星期轴宽度 */}
              <div className="w-6 shrink-0" /> 
              <div className="relative flex-1">
                {monthLabels.map((m, i) => (
                  <span 
                    key={i} 
                    className="absolute top-0 transform"
                    style={{ 
                      // 关键：标签位置与周数比例挂钩
                      left: `calc(${(m.weekIndex / weeksToShow) * 100}%)` 
                    }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>

            {/* 主体区域：左侧星期 + 右侧网格 */}
            <div className="flex w-full">
              
              {/* 星期轴 */}
              <div className="flex flex-col justify-between w-6 pr-2 py-[1px] shrink-0 text-[9px] text-stone-300 font-mono h-[88px]"> 
                {weekLabels.map((day, i) => (
                  <span key={i} className="h-[10px] leading-[10px] text-right">{day}</span>
                ))}
              </div>

              {/* 热力图网格 */}
              <div className="flex gap-[3px] flex-1">
                {heatmapData.weeks.map((week, wIndex) => (
                  // flex-1 确保列平分剩余空间，填满容器
                  <div key={wIndex} className="flex flex-col gap-[3px] flex-1"> 
                    {week.map((day, dIndex) => (
                      <Tooltip key={`${wIndex}-${dIndex}`}>
                        <TooltipTrigger asChild>
                          {/* w-full aspect-square 确保格子填满列宽并保持正方形 */}
                          <div 
                            className={`
                              w-full aspect-square rounded-[2px] transition-all duration-300
                              ${getIntensityClass(day.count)}
                            `} 
                          />
                        </TooltipTrigger>
                        <TooltipContent 
                          sideOffset={4}
                          className="bg-stone-900 border-stone-800 text-white text-xs px-3 py-2"
                        >
                          <div className="font-bold mb-0.5">{formatDate(day.dateStr)}</div>
                          <div className="text-stone-400 text-[10px]">
                            {day.count} 次修习 · {getIntensityDescription(day.count)}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 图例 */}
            <div className="flex justify-end items-center gap-2 mt-4 px-1">
              <span className="text-[10px] text-stone-400">少</span>
              <div className="flex gap-1">
                <div className="w-[10px] h-[10px] rounded-[2px] bg-stone-100/80" />
                <div className="w-[10px] h-[10px] rounded-[2px] bg-stone-300" />
                <div className="w-[10px] h-[10px] rounded-[2px] bg-stone-400" />
                <div className="w-[10px] h-[10px] rounded-[2px] bg-stone-600" />
                <div className="w-[10px] h-[10px] rounded-[2px] bg-[#C82E31]" />
              </div>
              <span className="text-[10px] text-stone-400">多</span>
            </div>

          </div>
        )}
      </TooltipProvider>
    </div>
  )
}