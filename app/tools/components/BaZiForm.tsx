'use client'

import { Button } from '@/lib/components/ui/button'
import { Calendar } from '@/lib/components/ui/calendar'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/components/ui/select'
import { Switch } from '@/lib/components/ui/switch'
import { LUNAR_INFO } from '@/lib/utils/bazi'
import { cn } from '@/lib/utils/cn'
import { convertLunarToSolar, convertToLunar } from '@/lib/utils/lunar'
import { calculateTrueSolarTime, getTimeDifferenceInfo } from '@/lib/utils/solarTime'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  Moon,
  Sun
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CitySelector } from './CitySelector'
import { SiZhuCard } from './SiZhuCard'

// 简单的男女图标组件
const MaleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="14" r="7" />
    <path d="M14 10L21 3M21 3H17M21 3V7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const FemaleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="5" />
    <path d="M12 13V21M8 17H16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
] as const

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
] as const

interface TabsWrapperProps {
  type: 'solar' | 'lunar'
  setType: (type: 'solar' | 'lunar') => void
}

function TabsWrapper({ type, setType }: TabsWrapperProps) {
    return (
        <div className="flex p-1 bg-stone-100 rounded-lg">
            <Button 
                onClick={() => setType('solar')} 
                variant="ghost"
                size="sm"
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                    type === 'solar' 
                        ? "bg-white text-[#C82E31] shadow-sm font-bold hover:bg-white" 
                        : "text-stone-500 hover:text-stone-700"
                )}
            >
                <Sun className="w-3.5 h-3.5" /> 公历
            </Button>
            <Button 
                onClick={() => setType('lunar')} 
                variant="ghost"
                size="sm"
                className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                    type === 'lunar' 
                        ? "bg-white text-[#C82E31] shadow-sm font-bold hover:bg-white" 
                        : "text-stone-500 hover:text-stone-700"
                )}
            >
                <Moon className="w-3.5 h-3.5" /> 农历
            </Button>
        </div>
    )
}

interface BaZiFormProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  gender: 'male' | 'female'
  setGender: (gender: 'male' | 'female') => void
  name?: string
  setName?: (name: string) => void
  hour?: string
  setHour?: (hour: string) => void
  minute?: string
  setMinute?: (minute: string) => void
  city?: string
  setCity?: (city: string) => void
  solarTimeCorrection?: boolean
  setSolarTimeCorrection?: (value: boolean) => void
  earlyZiHour?: boolean
  setEarlyZiHour?: (value: boolean) => void
  nameError?: boolean
}

export function BaZiForm({ 
  date, 
  setDate, 
  gender, 
  setGender,
  name = '',
  setName,
  hour = 'unknown',
  setHour,
  minute = '0',
  setMinute,
  city = '',
  setCity,
  solarTimeCorrection = true,
  setSolarTimeCorrection,
  earlyZiHour = false,
  setEarlyZiHour,
  nameError = false,
}: BaZiFormProps) {
  const [open, setOpen] = useState(false)
  const [dateType, setDateType] = useState<'solar' | 'lunar'>('solar')
  
  // 农历日期选择器的状态
  const [lunarYear, setLunarYear] = useState<number | ''>('')
  const [lunarMonth, setLunarMonth] = useState<number | ''>('')
  const [lunarDay, setLunarDay] = useState<number | ''>('')
  const [isLeapMonth, setIsLeapMonth] = useState(false)

  // 从公历日期初始化农历日期选择器
  useEffect(() => {
    if (date && dateType === 'lunar') {
      const lunar = convertToLunar(date)
      setLunarYear(lunar.year)
      setLunarMonth(lunar.month)
      setLunarDay(lunar.day)
      setIsLeapMonth(lunar.isLeap)
    }
  }, [date, dateType])

  // 当切换日期类型时，设置时的默认值
  useEffect(() => {
    if (dateType === 'solar') {
      setLunarYear('')
      setLunarMonth('')
      setLunarDay('')
      setIsLeapMonth(false)
      // 切换到公历时，如果hour是'unknown'或时辰值，设置为'0'
      if (hour === 'unknown' || !hour || ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'].includes(hour)) {
        setHour?.('0')
      }
    } else {
      // 切换到农历时，如果hour是数字（0-23），设置为'unknown'
      if (hour && /^\d+$/.test(hour) && parseInt(hour) >= 0 && parseInt(hour) <= 23) {
        setHour?.('unknown')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateType])

  // 生成年份选项 (1900-2099)
  const yearOptions = useMemo(() => {
    return Array.from({ length: 200 }, (_, i) => 1900 + i)
  }, [])

  // 生成月份选项（根据年份和是否闰月）
  const monthOptions = useMemo(() => {
    if (!lunarYear || typeof lunarYear !== 'number') return []
    const months: Array<{ value: number; label: string; isLeap: boolean }> = []
    
    // 获取该年份的闰月
    const leap = (LUNAR_INFO[lunarYear - 1900] & 0xf) || 0
    
    for (let m = 1; m <= 12; m++) {
      months.push({ value: m, label: LUNAR_MONTH_NAMES[m - 1], isLeap: false })
      if (leap > 0 && m === leap) {
        months.push({ value: m, label: `闰${LUNAR_MONTH_NAMES[m - 1]}`, isLeap: true })
      }
    }
    
    return months
  }, [lunarYear])

  // 生成日期选项（根据年份和月份）
  const dayOptions = useMemo(() => {
    if (!lunarYear || typeof lunarYear !== 'number' || !lunarMonth || typeof lunarMonth !== 'number') return []
    
    const monthDays = (year: number, month: number) => 
      (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29
    
    const leap = (LUNAR_INFO[lunarYear - 1900] & 0xf) || 0
    const days = isLeapMonth && leap === lunarMonth 
      ? ((LUNAR_INFO[lunarYear - 1900] & 0x10000) ? 30 : 29)
      : monthDays(lunarYear, lunarMonth)
    
    return Array.from({ length: days }, (_, i) => i + 1)
  }, [lunarYear, lunarMonth, isLeapMonth])

  // 处理公历日期选择
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate) {
      setOpen(false)
    }
  }

  // 当农历年月日或闰月状态改变时，更新公历日期
  useEffect(() => {
    if (dateType === 'lunar' && lunarYear && lunarMonth && lunarDay && 
        typeof lunarYear === 'number' && typeof lunarMonth === 'number' && typeof lunarDay === 'number') {
      const solarDate = convertLunarToSolar(lunarYear, lunarMonth, lunarDay, isLeapMonth)
      if (solarDate) {
        setDate(solarDate)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lunarYear, lunarMonth, lunarDay, isLeapMonth, dateType])

  // 时辰到小时的映射（用于农历模式）
  const hourMap: Record<string, number> = {
    'zi': 23, 'chou': 1, 'yin': 3, 'mao': 5, 'chen': 7, 'si': 9,
    'wu': 11, 'wei': 13, 'shen': 15, 'you': 17, 'xu': 19, 'hai': 21,
  }

  // 计算真太阳时（用于显示）
  const trueSolarTimeInfo = useMemo(() => {
    if (!solarTimeCorrection || !date || !city) {
      return null
    }
    
    // 创建用于计算的日期对象（包含小时和分钟）
    const calcDate = new Date(date)
    
    if (dateType === 'solar') {
      // 公历模式：使用选择的小时和分钟
      if (hour !== 'unknown' && /^\d+$/.test(hour)) {
        calcDate.setHours(parseInt(hour, 10))
        if (minute && /^\d+$/.test(minute)) {
          calcDate.setMinutes(parseInt(minute, 10))
          calcDate.setSeconds(0)
        } else {
          calcDate.setMinutes(0)
          calcDate.setSeconds(0)
        }
      }
    } else {
      // 农历模式：如果有选择的时辰，转换为小时（使用时辰的中点）
      if (hour !== 'unknown' && hourMap[hour] !== undefined) {
        calcDate.setHours(hourMap[hour])
        calcDate.setMinutes(0)
        calcDate.setSeconds(0)
      }
    }
    
    const correctedDate = calculateTrueSolarTime(calcDate, city)
    const timeDiffInfo = getTimeDifferenceInfo(calcDate, city)
    
    return {
      originalDate: calcDate,
      correctedDate,
      timeDiffInfo,
    }
  }, [solarTimeCorrection, date, city, hour, minute, dateType])

  return (
    <div className="px-4 lg:px-4 space-y-6 pb-4">
      <SiZhuCard />
       <div className="space-y-3">
          <Label className="text-xs font-bold text-stone-500 uppercase tracking-wider">求测人信息</Label>
          <div className="grid grid-cols-5 gap-3">
             <div className="col-span-3 space-y-1">
               <Input 
                 placeholder="姓名" 
                 className={cn(
                   "bg-white border-stone-200 focus-visible:ring-[#C82E31]/20 h-10",
                   nameError && "border-red-500 focus-visible:ring-red-500/20"
                 )}
                 value={name}
                 onChange={(e) => setName?.(e.target.value)}
               />
               {nameError && (
                 <p className="text-xs text-red-500">请输入姓名</p>
               )}
             </div>
             <div className="col-span-2 flex bg-stone-50 rounded-lg p-1 border border-stone-200 h-10">
                <Button 
                  onClick={() => setGender('male')} 
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex-1 text-xs rounded-md flex items-center justify-center gap-0 transition-all font-medium h-full px-0.5 min-w-0",
                    gender === 'male' 
                      ? "bg-white text-stone-900 shadow-sm hover:bg-white" 
                      : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                  )}
                >
                  <MaleIcon className="w-3 h-3 scale-70" />
                  乾
                </Button>
                <Button 
                  onClick={() => setGender('female')} 
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex-1 text-xs rounded-md flex items-center justify-center gap-0 transition-all font-medium h-full px-0.5 min-w-0",
                    gender === 'female' 
                      ? "bg-white text-stone-900 shadow-sm hover:bg-white" 
                      : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                  )}
                >
                  <FemaleIcon className="w-3 h-3 scale-70" />
                  坤
                </Button>
             </div>
          </div>
       </div>

       <div className="space-y-3">
          <Label className="text-xs font-bold text-stone-500 uppercase tracking-wider">出生时间</Label>
          <TabsWrapper type={dateType} setType={setDateType} />
          <div className="space-y-3">
             {dateType === 'solar' ? (
               <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Popover open={open} onOpenChange={setOpen}>
                     <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal pl-10 border-stone-200 bg-white h-10 hover:bg-stone-50", !date && "text-muted-foreground")}>
                          {date ? format(date, "yyyy年MM月dd日") : <span>选择日期</span>}
                        </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar 
                          mode="single" 
                          selected={date} 
                          onSelect={handleDateSelect} 
                          initialFocus 
                          locale={zhCN} 
                          captionLayout="dropdown"
                          className="rounded-md border border-stone-200 [&_.rdp-day]:cursor-pointer [&_.rdp-day:hover]:bg-stone-100" 
                        />
                     </PopoverContent>
                  </Popover>
               </div>
             ) : (
               <div className="grid grid-cols-3 gap-2">
                  <Select 
                    value={lunarYear ? lunarYear.toString() : ''} 
                    onValueChange={(value) => {
                      const year = value ? parseInt(value, 10) : ''
                      setLunarYear(year)
                      // 切换年份时，重置月份和日期
                      setLunarMonth('')
                      setLunarDay('')
                      setIsLeapMonth(false)
                    }}
                  >
                     <SelectTrigger className="border-stone-200 bg-white h-10 cursor-pointer">
                        <SelectValue placeholder="年" />
                     </SelectTrigger>
                     <SelectContent className='cursor-pointer max-h-[300px] bg-white'>
                        {yearOptions.map(year => (
                           <SelectItem key={year} value={year.toString()}>
                              {year}年
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
                  <Select 
                    value={lunarMonth ? `${lunarMonth}-${isLeapMonth ? 'leap' : 'normal'}` : ''} 
                    onValueChange={(value) => {
                      if (value) {
                        const [month, leap] = value.split('-')
                        setLunarMonth(parseInt(month, 10))
                        setIsLeapMonth(leap === 'leap')
                        // 如果日期超出范围，需要重置
                        setLunarDay('')
                      } else {
                        setLunarMonth('')
                        setIsLeapMonth(false)
                        setLunarDay('')
                      }
                    }}
                    disabled={!lunarYear}
                  >
                     <SelectTrigger className="border-stone-200 bg-white h-10 cursor-pointer">
                        <SelectValue placeholder="月" />
                     </SelectTrigger>
                     <SelectContent className='cursor-pointer max-h-[300px] bg-white'>
                        {monthOptions.map((month, index) => (
                           <SelectItem 
                              key={`${month.value}-${month.isLeap ? 'leap' : 'normal'}-${index}`} 
                              value={`${month.value}-${month.isLeap ? 'leap' : 'normal'}`}
                           >
                              {month.label}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
                  <Select 
                    value={lunarDay ? lunarDay.toString() : ''} 
                    onValueChange={(value) => setLunarDay(value ? parseInt(value, 10) : '')}
                    disabled={!lunarMonth}
                  >
                     <SelectTrigger className="border-stone-200 bg-white h-10 cursor-pointer">
                        <SelectValue placeholder="日" />
                     </SelectTrigger>
                     <SelectContent className='cursor-pointer max-h-[300px] bg-white'>
                        {dayOptions.map(day => (
                           <SelectItem key={day} value={day.toString()}>
                              {LUNAR_DAY_NAMES[day - 1]}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
             )}
             <div className={cn("grid gap-3", dateType === 'solar' ? "grid-cols-2" : "grid-cols-1")}>
                {dateType === 'solar' ? (
                  <>
                    <Select value={hour} onValueChange={(value) => setHour?.(value)}>
                       <SelectTrigger className="border-stone-200 bg-white h-10 cursor-pointer"><SelectValue placeholder="时" /></SelectTrigger>
                       <SelectContent className='cursor-pointer max-h-[250px] bg-white'>
                          {Array.from({ length: 24 }, (_, i) => i).map(h => (
                             <SelectItem key={h} value={h.toString()}>
                                {String(h).padStart(2, '0')}时
                             </SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                    <Select value={minute} onValueChange={(value) => setMinute?.(value)}>
                       <SelectTrigger className="border-stone-200 bg-white h-10 cursor-pointer"><SelectValue placeholder="分" /></SelectTrigger>
                       <SelectContent className='cursor-pointer max-h-[250px] bg-white'>
                          {Array.from({ length: 60 }, (_, i) => i).map(m => (
                             <SelectItem key={m} value={m.toString()}>
                                {String(m).padStart(2, '0')}分
                             </SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                  </>
                ) : (
                  <Select value={hour} onValueChange={(value) => setHour?.(value)}>
                     <SelectTrigger className="border-stone-200 bg-white h-10 cursor-pointer"><SelectValue placeholder="时辰" /></SelectTrigger>
                     <SelectContent className='cursor-pointer max-h-[250px] bg-white'>
                        <SelectItem value="unknown">不详</SelectItem>
                        <SelectItem value="zi">子时 (23-01)</SelectItem>
                        <SelectItem value="chou">丑时 (01-03)</SelectItem>
                        <SelectItem value="yin">寅时 (03-05)</SelectItem>
                        <SelectItem value="mao">卯时 (05-07)</SelectItem>
                        <SelectItem value="chen">辰时 (07-09)</SelectItem>
                        <SelectItem value="si">巳时 (09-11)</SelectItem>
                        <SelectItem value="wu">午时 (11-13)</SelectItem>
                        <SelectItem value="wei">未时 (13-15)</SelectItem>
                        <SelectItem value="shen">申时 (15-17)</SelectItem>
                        <SelectItem value="you">酉时 (17-19)</SelectItem>
                        <SelectItem value="xu">戌时 (19-21)</SelectItem>
                        <SelectItem value="hai">亥时 (21-23)</SelectItem>
                     </SelectContent>
                  </Select>
                )}
             </div>
          </div>
       </div>

       <div className="pt-6 border-t border-dashed border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
             <div className="flex flex-col"><span className="text-sm font-bold text-stone-700">早晚子时</span><span className="text-[10px] text-stone-400">早子时(23-00) 晚子时(00-01)</span></div>
             <Switch 
               checked={earlyZiHour} 
               onCheckedChange={setEarlyZiHour}
               className="data-[state=checked]:bg-[#C82E31] data-[state=unchecked]:bg-stone-300 hover:data-[state=checked]:bg-[#B02528] hover:data-[state=unchecked]:bg-stone-200 transition-colors cursor-pointer" 
             />
          </div>
          <div className="flex items-center justify-between">
             <div className="flex flex-col"><span className="text-sm font-bold text-stone-700">真太阳时校正</span><span className="text-[10px] text-stone-400">经纬度时差</span></div>
             <Switch 
               checked={solarTimeCorrection} 
               onCheckedChange={setSolarTimeCorrection}
               className="data-[state=checked]:bg-[#C82E31] data-[state=unchecked]:bg-stone-300 hover:data-[state=checked]:bg-[#B02528] hover:data-[state=unchecked]:bg-stone-200 transition-colors cursor-pointer" 
             />
          </div>
          {solarTimeCorrection && <CitySelector value={city} onChange={(value) => setCity?.(value)} placeholder="出生城市" />}
          {solarTimeCorrection && city && date && trueSolarTimeInfo && (
            <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">原始时间:</span>
                  <span className="text-stone-700 font-medium">
                    {format(trueSolarTimeInfo.originalDate, "yyyy-MM-dd HH:mm:ss")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">真太阳时:</span>
                  <span className="text-[#C82E31] font-medium">
                    {format(trueSolarTimeInfo.correctedDate, "yyyy-MM-dd HH:mm:ss")}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                  <span className="text-stone-400">时差:</span>
                  <span className="text-stone-600">
                    {trueSolarTimeInfo.timeDiffInfo.totalDiff > 0 ? '+' : ''}
                    {trueSolarTimeInfo.timeDiffInfo.totalDiff.toFixed(1)} 分钟
                  </span>
                </div>
                {trueSolarTimeInfo.timeDiffInfo.longitudeDiff !== 0 && (
                  <div className="flex justify-between items-center text-[10px] text-stone-400">
                    <span>经度 {trueSolarTimeInfo.timeDiffInfo.longitude.toFixed(1)}°E</span>
                    <span>
                      {trueSolarTimeInfo.timeDiffInfo.longitudeDiff > 0 ? '+' : ''}
                      {trueSolarTimeInfo.timeDiffInfo.longitudeDiff.toFixed(1)}° 
                      ({trueSolarTimeInfo.timeDiffInfo.longitudeDiff * 4 > 0 ? '+' : ''}
                      {(trueSolarTimeInfo.timeDiffInfo.longitudeDiff * 4).toFixed(1)}分钟)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
       </div>
    </div>
  )
}
