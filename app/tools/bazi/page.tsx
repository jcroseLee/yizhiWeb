'use client'

import { Button } from '@/lib/components/ui/button';
import { ScrollArea } from '@/lib/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/lib/components/ui/sheet'; // 需要确保引入了 Sheet 组件
import { calculateBaZi, type BaZiResult } from '@/lib/utils/bazi';
import { calculateTrueSolarTime } from '@/lib/utils/solarTime';
import { Edit3, Scroll, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BaZiForm } from '../components/BaZiForm';
import { BaZiInitialState } from '../components/BaZiInitialState';

// ... (存储常量、类型定义、样式补丁保持不变)
const BAZI_RESULT_STORAGE_KEY = 'latestBaZiResult'
const BAZI_RESULTS_LIST_STORAGE_KEY = 'baZiResultsList'

interface StoredBaZiResultWithId {
  id: string
  name?: string
  gender: 'male' | 'female'
  dateISO: string
  trueSolarDateISO?: string
  hour?: string
  minute?: string
  city?: string
  solarTimeCorrection?: boolean
  earlyZiHour?: boolean
  result: BaZiResult
  createdAt: string
}

interface BaZiFormContentProps {
  date: Date | undefined
  setDate: (value: Date | undefined) => void
  gender: 'male' | 'female'
  setGender: (value: 'male' | 'female') => void
  name: string
  setName: (value: string) => void
  hour: string
  setHour: (value: string) => void
  minute: string
  setMinute: (value: string) => void
  city: string
  setCity: (value: string) => void
  solarTimeCorrection: boolean
  setSolarTimeCorrection: (value: boolean) => void
  earlyZiHour: boolean
  setEarlyZiHour: (value: boolean) => void
  nameError: boolean
  loading: boolean
  onCalculate: () => void
}

function BaZiFormContent({
  date,
  setDate,
  gender,
  setGender,
  name,
  setName,
  hour,
  setHour,
  minute,
  setMinute,
  city,
  setCity,
  solarTimeCorrection,
  setSolarTimeCorrection,
  earlyZiHour,
  setEarlyZiHour,
  nameError,
  loading,
  onCalculate,
}: BaZiFormContentProps) {
  return (
    <div className="space-y-6">
      <BaZiForm
        date={date}
        setDate={setDate}
        gender={gender}
        setGender={setGender}
        name={name}
        setName={setName}
        hour={hour}
        setHour={setHour}
        minute={minute}
        setMinute={setMinute}
        city={city}
        setCity={setCity}
        solarTimeCorrection={solarTimeCorrection}
        setSolarTimeCorrection={setSolarTimeCorrection}
        earlyZiHour={earlyZiHour}
        setEarlyZiHour={setEarlyZiHour}
        nameError={nameError}
      />
      <Button
        className="w-full h-12 bg-[#C82E31] hover:bg-[#B02629] text-white text-lg font-bold shadow-lg shadow-red-900/20 rounded-xl transition-all active:scale-95 mt-4"
        onClick={onCalculate}
        disabled={loading}
      >
        {loading ? "正在推演..." : "开始排盘"}
      </Button>
    </div>
  )
}

const styles = `
  /* ... (原有样式保持不变) ... */
  .font-ganzhi { font-family: "Noto Serif SC", "Songti SC", serif; }
  .text-wood { color: #3A7B5E; }
  .text-fire { color: #C82E31; }
  .text-earth { color: #8D6E63; }
  .text-metal { color: #D4AF37; }
  .text-water { color: #4B7BB6; }
  
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .compass-spin { animation: spin-slow 60s linear infinite; }

  @keyframes breathe-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(200, 46, 49, 0.05); }
    50% { box-shadow: 0 0 40px rgba(200, 46, 49, 0.15); }
  }
  .active-pillar {
    animation: breathe-glow 4s infinite ease-in-out;
    border-color: rgba(200, 46, 49, 0.2);
  }
  
  .writing-vertical {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.2em;
  }
  
  /* 移动端优化：浑天仪缩放 */
  @media (max-width: 768px) {
    .armillary-sphere-container {
        transform: scale(0.7);
        transform-origin: center center;
    }
  }
`

export default function BaZiPage() {
  const router = useRouter()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [name, setName] = useState<string>('')
  const [hour, setHour] = useState<string>('unknown')
  const [minute, setMinute] = useState<string>('0')
  const [city, setCity] = useState<string>('')
  const [solarTimeCorrection, setSolarTimeCorrection] = useState(true)
  const [earlyZiHour, setEarlyZiHour] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState(false)
  
  // 控制移动端 Sheet 开关
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)

  const hourMap: Record<string, number> = {
    'zi': 23, 'chou': 1, 'yin': 3, 'mao': 5, 'chen': 7, 'si': 9,
    'wu': 11, 'wei': 13, 'shen': 15, 'you': 17, 'xu': 19, 'hai': 21,
  }

  const handleCalculate = () => {
    if (!name || name.trim() === '') {
      setNameError(true)
      // 如果在移动端，确保 Sheet 打开以显示错误
      if (window.innerWidth < 1024) setIsMobileSheetOpen(true)
      return
    }
    setNameError(false)

    if (!date) return

    setLoading(true)

    const calcDate = new Date(date)
    
    if (hour !== 'unknown') {
      if (/^\d+$/.test(hour)) {
        calcDate.setHours(parseInt(hour, 10))
      } else if (hourMap[hour] !== undefined) {
        calcDate.setHours(hourMap[hour])
      }
    }
    
    if (minute) {
      calcDate.setMinutes(parseInt(minute, 10))
      calcDate.setSeconds(0)
    } else {
      calcDate.setSeconds(0)
    }

    const originalDate = new Date(calcDate)

    let finalDate = calcDate
    if (solarTimeCorrection && city) {
      finalDate = calculateTrueSolarTime(calcDate, city)
    }

    const selectedHour = hour !== 'unknown' && !/^\d+$/.test(hour) ? hour : undefined
    try {
      const result = calculateBaZi(finalDate, gender, name || undefined, city || undefined, earlyZiHour, selectedHour)
      
      if (typeof window !== 'undefined') {
        const resultId = `bazi_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        
        const payload: StoredBaZiResultWithId = {
          id: resultId,
          name: name || undefined,
          gender,
          dateISO: originalDate.toISOString(),
          trueSolarDateISO: solarTimeCorrection && city ? finalDate.toISOString() : undefined,
          hour: hour !== 'unknown' ? hour : undefined,
          minute: minute !== '0' ? minute : undefined,
          city: city || undefined,
          solarTimeCorrection,
          earlyZiHour,
          result,
          createdAt: new Date().toISOString(),
        }
        
        localStorage.setItem(BAZI_RESULT_STORAGE_KEY, JSON.stringify(payload))
        
        const existingResultsStr = localStorage.getItem(BAZI_RESULTS_LIST_STORAGE_KEY)
        const existingResults: StoredBaZiResultWithId[] = existingResultsStr ? JSON.parse(existingResultsStr) : []
        const updatedResults = [payload, ...existingResults].slice(0, 100)
        localStorage.setItem(BAZI_RESULTS_LIST_STORAGE_KEY, JSON.stringify(updatedResults))
        
        router.push(`/tools/bazi/${resultId}`)
      }
    } catch (error) {
      console.error('排盘计算错误:', error)
      setLoading(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      <div className="h-[calc(100vh-90px)] lg:h-full flex relative bg-[#f5f5f7] paper-texture overflow-hidden">

        {/* 左侧主内容区 - 排盘展示 */}
        <main className="flex-1 w-full h-full relative flex flex-col overflow-hidden">
          
          
            <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 relative z-10">
              <div className="w-full max-w-3xl space-y-6 armillary-sphere-container">
                {/* 初始状态：时空四柱 · 浑天仪 */}
                <BaZiInitialState />
              </div>
              
              {/* 移动端引导提示 */}
              <div className="lg:hidden text-center mt-8 animate-pulse text-stone-400 text-sm">
                  点击下方按钮开始排盘
              </div>
            </div>
            
            {/* 底部版权 */}
            <div className="text-center py-4 opacity-60 text-[11px] text-stone-600 font-serif w-full shrink-0 relative z-10">
                易知 · 实证易学平台
            </div>

          {/* 移动端底部悬浮按钮 (FAB) */}
          <div className="lg:hidden absolute bottom-12 left-0 right-0 flex justify-center z-30 px-6">
              <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                  <SheetTrigger asChild>
                      <Button className="w-full max-w-md h-12 rounded-full bg-[#C82E31] hover:bg-[#B02629] text-white shadow-xl shadow-red-900/20 font-bold text-lg flex items-center justify-center gap-2">
                          <Edit3 className="w-5 h-5" /> 录入生辰信息
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] px-0 bg-[#f5f5f7]">
                  <SheetHeader className="px-6 mb-4">
                      <SheetTitle className="text-left font-serif text-xl font-bold flex items-center gap-2 text-stone-800">
                          <Settings2 className="w-5 h-5 text-[#C82E31]" /> 录入契文
                      </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-full px-6 pb-6">
                          <BaZiFormContent
                            date={date}
                            setDate={setDate}
                            gender={gender}
                            setGender={setGender}
                            name={name}
                            setName={(value) => {
                              setName(value)
                              if (nameError && value.trim() !== '') setNameError(false)
                            }}
                            hour={hour}
                            setHour={setHour}
                            minute={minute}
                            setMinute={setMinute}
                            city={city}
                            setCity={setCity}
                            solarTimeCorrection={solarTimeCorrection}
                            setSolarTimeCorrection={setSolarTimeCorrection}
                            earlyZiHour={earlyZiHour}
                            setEarlyZiHour={setEarlyZiHour}
                            nameError={nameError}
                            loading={loading}
                            onCalculate={handleCalculate}
                          />
                          <div className="h-20" /> {/* 底部垫高 */}
                  </ScrollArea>
              </SheetContent>
          </Sheet>
      </div>
        </main>

        {/* 右侧边栏 - 参数设置 (仅 PC 端显示) */}
        <aside className="hidden lg:block w-90 shrink-0 h-full bg-white/90 border-l border-stone-200/60 shadow-[-1px_0_2px_rgba(0,0,0,0.02)] relative z-20 backdrop-blur-sm flex flex-col">
          <ScrollArea className="h-[calc(100%-112px)] p-8">
            <h2 className="text-lg font-serif font-bold text-stone-800 mb-8 flex items-center gap-2 select-none">
              <Scroll className="w-5 h-5 text-[#C82E31]" />
              <span>录入契文</span>
            </h2>
            
            {/* PC端直接渲染表单 */}
            <BaZiForm 
              date={date} setDate={setDate} 
              gender={gender} setGender={setGender}
              name={name} setName={(value) => { setName(value); if (nameError && value.trim() !== '') setNameError(false) }}
              hour={hour} setHour={setHour}
              minute={minute} setMinute={setMinute}
              city={city} setCity={setCity}
              solarTimeCorrection={solarTimeCorrection} setSolarTimeCorrection={setSolarTimeCorrection}
              earlyZiHour={earlyZiHour} setEarlyZiHour={setEarlyZiHour}
              nameError={nameError}
            />
          </ScrollArea>

          {/* PC端底部固定按钮 */}
          <div className="p-8 pt-4 border-t border-stone-100 bg-white/95 backdrop-blur shrink-0">
              <Button 
                className="w-full h-12 bg-[#C82E31] hover:bg-[#B02629] text-white text-lg font-bold shadow-lg shadow-red-900/20 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                onClick={handleCalculate}
                disabled={loading}
              >
                {loading ? "正在推演..." : "开始排盘"}
              </Button>
          </div>
        </aside>

      </div>
    </>
  )
}
