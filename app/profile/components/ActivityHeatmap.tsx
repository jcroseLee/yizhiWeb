'use client'

import { Card } from '@/lib/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/lib/components/ui/tooltip'
import { getDailyActivityData } from '@/lib/services/profile'
import { CalendarCheck, HelpCircle, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export interface ActivityHeatmapProps {
  totalActivity: number
  activityData?: Array<{ week: number; date: string; count: number }>
}

export const ActivityHeatmap = ({ totalActivity, activityData: propActivityData }: ActivityHeatmapProps) => {
  const [activityData, setActivityData] = useState<Array<{ week: number; date: string; count: number }>>([])
  const [loading, setLoading] = useState(true)

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
        // 如果加载失败，使用空数据
        setActivityData([])
      } finally {
        setLoading(false)
      }
    }

    loadActivityData()
  }, [propActivityData])

  // 获取强度对应的样式类（墨色深浅 + 朱砂红）
  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-gray-100/50'      // 0: 极浅灰（无活动）
    if (count <= 2) return 'bg-[#D1D5DB]'        // 1-2: 浅墨
    if (count <= 5) return 'bg-[#9CA3AF]'        // 3-5: 中墨
    if (count <= 10) return 'bg-[#4B5563]'       // 6-10: 深墨
    return 'bg-[#C0392B]'                        // 11+: 朱砂红（极活跃，点睛之笔）
  }

  // 获取强度说明文案（用于tooltip）
  const getIntensityDescription = (count: number): string => {
    if (count === 0) return '无活动'
    if (count <= 2) return '轻度活动（1-2次）'
    if (count <= 5) return '中度活动（3-5次）'
    if (count <= 10) return '高度活动（6-10次）'
    return '极活跃（11次以上）'
  }

  // 格式化日期显示
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  }

  // 计算实际的总活动数
  const calculatedTotal = activityData.reduce((sum, item) => sum + item.count, 0)

  // 生成过去52周（364天）的数据，按周和星期组织
  const heatmapData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 计算52周前的日期（364天前）
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 363) // 364天前，包含今天共365天
    
    // 调整到最近的周日（确保第一周从周日开始）
    const dayOfWeek = startDate.getDay() // 0=周日, 1=周一, ..., 6=周六
    startDate.setDate(startDate.getDate() - dayOfWeek)
    
    // 生成52周的数据（364天，7天×52周）
    const days: Array<{ date: Date; dateStr: string; count: number; dayOfWeek: number }> = []
    
    for (let i = 0; i < 364; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      // 查找对应的活动数据
      const activityItem = activityData.find(d => d.date === dateStr)
      const count = activityItem?.count || 0
      
      // 获取星期几 (0=周日, 1=周一, ..., 6=周六)
      const currentDayOfWeek = date.getDay()
      
      days.push({ date, dateStr, count, dayOfWeek: currentDayOfWeek })
    }
    
    // 按周分组（7天一组，共52周）
    const weeks: Array<Array<typeof days[0]>> = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    
    return { days, weeks }
  }, [activityData])

  // 获取月份标签（用于横坐标）
  const getMonthLabels = useMemo(() => {
    const labels: Array<{ weekIndex: number; month: number; label: string }> = []
    let lastMonth = -1
    
    heatmapData.weeks.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const firstDay = week[0].date
        const month = firstDay.getMonth() + 1
        
        // 只在月份变化时或第一个周显示标签
        if (month !== lastMonth || weekIndex === 0) {
          lastMonth = month
          labels.push({
            weekIndex,
            month,
            label: `${month}月`
          })
        }
      }
    })
    
    return labels
  }, [heatmapData])

  // 星期标签（用于纵坐标）
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <Card className="mb-8 bg-white/80 backdrop-blur-sm glass-card rounded-xl p-6 border-none shadow-sm">
      <TooltipProvider>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2 font-serif">
            <CalendarCheck size={16} className="text-[#C0392B]"/> 修业日课
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle size={14} className="text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[280px] bg-[#1F2937] border-gray-700 text-white">
                <div className="space-y-2">
                  <div className="font-semibold text-white text-sm mb-2">修业记录规则</div>
                  <div className="text-xs text-gray-300 space-y-1.5">
                    <p>每一个格子记录了当日的活跃贡献。</p>
                    <p>每日签到、排盘、发布案例或验证反馈，均可增加修业值。</p>
                    <p>颜色越深，代表当日投入的精力越多。坚持修习，点亮您的易学之路。</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            最近一年修业 {calculatedTotal > 0 ? calculatedTotal : totalActivity} 次
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#C0392B]" />
          </div>
        ) : (
          <>
            <div className="w-full">
              {/* 横坐标：月份标签 */}
              <div className="mb-2 relative h-4 w-full">
                {getMonthLabels.map((label, idx) => {
                  // 计算该月份标签应该放置的位置（基于周索引）
                  // 使用百分比定位，使其自适应容器宽度
                  // 纵坐标标签列宽度约24px，热力图主体占剩余空间
                  const totalWeeks = heatmapData.weeks.length
                  // 假设纵坐标列占约5%宽度，热力图占95%
                  const labelColumnPercent = 5
                  const heatmapPercent = 95
                  const weekWidthPercent = heatmapPercent / totalWeeks
                  const leftOffsetPercent = labelColumnPercent + (label.weekIndex * weekWidthPercent)
                  return (
                    <div
                      key={idx}
                      className="text-[10px] text-gray-500 absolute whitespace-nowrap top-0"
                      style={{ left: `${leftOffsetPercent}%` }}
                    >
                      {label.label}
                    </div>
                  )
                })}
              </div>
              
              <div className="flex gap-[2px] w-full">
                {/* 纵坐标：星期标签 */}
                <div className="flex flex-col gap-[2px] mr-1 shrink-0">
                  {weekLabels.map((label, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="text-[10px] text-gray-500 flex items-center justify-end pr-1 flex-1"
                    >
                      {dayIndex % 2 === 0 ? label : ''}
                    </div>
                  ))}
                </div>
                
                {/* 热力图主体 */}
                <div className="flex flex-col gap-[2px] flex-1">
                  {weekLabels.map((_, dayIndex) => (
                    <div key={dayIndex} className="flex gap-[2px] w-full">
                      {heatmapData.weeks.map((week, weekIndex) => {
                        const day = week[dayIndex]
                        if (!day) {
                          return (
                            <div
                              key={`${weekIndex}-${dayIndex}`}
                              className="flex-1 aspect-square rounded-[1px] min-w-[8px]"
                            />
                          )
                        }
                        
                        const bgClass = getIntensityClass(day.count)
                        const dateStr = formatDate(day.dateStr)
                        const intensityDesc = getIntensityDescription(day.count)
                        
                        return (
                          <Tooltip key={`${weekIndex}-${dayIndex}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={`flex-1 aspect-square rounded-[1px] min-w-[8px] ${bgClass} hover:ring-1 hover:ring-[#C0392B]/50 transition-all cursor-pointer`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] bg-[#1F2937] border-gray-700 text-white">
                              <div className="space-y-1">
                                <div className="font-semibold text-white">{dateStr}</div>
                                <div className="text-xs text-gray-300">星期{weekLabels[day.dayOfWeek]}</div>
                                <div className="text-xs">
                                  <span className="font-medium text-gray-200">活动次数：</span>
                                  <span className="text-[#C0392B]">{day.count} 次</span>
                                </div>
                                <div className="text-xs text-gray-400">{intensityDesc}</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end items-center gap-1 mt-3 text-[10px] text-gray-400">
              <span>少</span>
              <div className="w-[8px] h-[8px] bg-gray-100 rounded-[1px]"></div>
              <div className="w-[8px] h-[8px] bg-[#9CA3AF] rounded-[1px]"></div>
              <div className="w-[8px] h-[8px] bg-[#4B5563] rounded-[1px]"></div>
              <div className="w-[8px] h-[8px] bg-[#C0392B] rounded-[1px]"></div>
              <span>多</span>
            </div>
          </>
        )}
      </TooltipProvider>
    </Card>
  )
}

