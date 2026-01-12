'use client'

import { Button } from '@/lib/components/ui/button'
import { calculateBaZi, type BaZiResult } from '@/lib/utils/bazi'
import { calculateTrueSolarTime } from '@/lib/utils/solarTime'
import { Scroll } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BaZiForm } from '../components/BaZiForm'
import { BaZiInitialState } from '../components/BaZiInitialState'

// 存储常量
const BAZI_RESULT_STORAGE_KEY = 'latestBaZiResult'
const BAZI_RESULTS_LIST_STORAGE_KEY = 'baZiResultsList'

// 类型定义
interface StoredBaZiResultWithId {
  id: string
  name?: string
  gender: 'male' | 'female'
  dateISO: string // 原始时间（用于显示"阳历"）
  trueSolarDateISO?: string // 真太阳时（校正后的时间，用于显示"真太阳时"）
  hour?: string
  minute?: string
  city?: string
  solarTimeCorrection?: boolean
  earlyZiHour?: boolean
  result: BaZiResult
  createdAt: string
}

// --- 样式补丁 ---
const styles = `

  
  .font-ganzhi {
    font-family: "Noto Serif SC", "Songti SC", serif;
  }

  /* 2. 五行配色系统 (低饱和度高级感) */
  .text-wood { color: #3A7B5E; }   /* 木 - 竹青 */
  .text-fire { color: #C82E31; }   /* 火 - 朱砂 */
  .text-earth { color: #8D6E63; }  /* 土 - 赭石 */
  .text-metal { color: #D4AF37; }  /* 金 - 鎏金 */
  .text-water { color: #4B7BB6; }  /* 水 - 靛蓝 */
  
  /* 3. 排盘表格样式 */
  .bazi-grid {
    display: grid;
    grid-template-columns: 80px repeat(4, 1fr);
    width: 100%;
  }
  .bazi-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0.75rem 0.25rem;
  }
  .bazi-header {
    font-size: 0.75rem;
    color: #a8a29e; /* stone-400 */
    font-weight: normal;
  }
  
  /* 偶数行斑马纹 (极淡) */
  .row-zebra:nth-child(even) {
    background-color: rgba(28, 25, 23, 0.02);
  }
  
  /* 4. 罗盘动画 */
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .compass-spin {
    animation: spin-slow 60s linear infinite;
  }

  /* 5. 模糊入场 */
  .animate-blur-in {
    animation: blur-in 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    opacity: 0;
  }
  @keyframes blur-in {
    0% { filter: blur(12px); opacity: 0; transform: translateY(10px); }
    100% { filter: blur(0); opacity: 1; transform: translateY(0); }
  }

  /* 玻璃拟态 */
  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.03);
  }

  /* 呼吸光晕 */
  @keyframes breathe-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(200, 46, 49, 0.05); }
    50% { box-shadow: 0 0 40px rgba(200, 46, 49, 0.15); }
  }
  .active-pillar {
    animation: breathe-glow 4s infinite ease-in-out;
    border-color: rgba(200, 46, 49, 0.2);
  }
  
  /* 按钮呼吸感动效 */
  @keyframes breathe-button {
    0%, 100% { 
      box-shadow: 0 10px 25px rgba(200, 46, 49, 0.2), 0 0 0 0 rgba(200, 46, 49, 0.1);
    }
    50% { 
      box-shadow: 0 10px 35px rgba(200, 46, 49, 0.3), 0 0 0 8px rgba(200, 46, 49, 0.05);
    }
  }
  .breathe-button {
    animation: breathe-button 2s infinite ease-in-out;
  }
  
  /* 竖排文字 */
  .writing-vertical {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.2em;
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

  // 时辰到小时的映射
  const hourMap: Record<string, number> = {
    'zi': 23, 'chou': 1, 'yin': 3, 'mao': 5, 'chen': 7, 'si': 9,
    'wu': 11, 'wei': 13, 'shen': 15, 'you': 17, 'xu': 19, 'hai': 21,
  }

  const handleCalculate = () => {
    // 校验姓名必填
    if (!name || name.trim() === '') {
      setNameError(true)
      return
    }
    setNameError(false)

    if (!date) {
      return
    }

    setLoading(true)

    // 创建计算用的日期对象
    const calcDate = new Date(date)
    
    // 设置小时：支持公历模式的数字小时和农历模式的时辰
    if (hour !== 'unknown') {
      // 如果是数字字符串（公历模式），直接使用
      if (/^\d+$/.test(hour)) {
        calcDate.setHours(parseInt(hour, 10))
      } 
      // 如果是时辰（农历模式），使用映射表
      else if (hourMap[hour] !== undefined) {
        calcDate.setHours(hourMap[hour])
      }
    }
    
    // 如果选择了分钟，更新分钟
    if (minute) {
      calcDate.setMinutes(parseInt(minute, 10))
      calcDate.setSeconds(0)
    } else {
      calcDate.setSeconds(0)
    }

    // 保存原始时间（未校正的）
    const originalDate = new Date(calcDate)

    // 如果启用了真太阳时校正，应用校正
    let finalDate = calcDate
    if (solarTimeCorrection && city) {
      finalDate = calculateTrueSolarTime(calcDate, city)
    }

    // 计算排盘（使用校正后的时间）
    // 如果hour是时辰代码（农历模式），传递给calculateBaZi用于显示农历日期
    const selectedHour = hour !== 'unknown' && !/^\d+$/.test(hour) ? hour : undefined
    try {
      const result = calculateBaZi(finalDate, gender, name || undefined, city || undefined, earlyZiHour, selectedHour)
      
      // 保存结果到 localStorage
      if (typeof window !== 'undefined') {
        const resultId = `bazi_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        
        const payload: StoredBaZiResultWithId = {
          id: resultId,
          name: name || undefined,
          gender,
          dateISO: originalDate.toISOString(), // 保存原始时间用于显示"阳历"
          trueSolarDateISO: solarTimeCorrection && city ? finalDate.toISOString() : undefined, // 保存校正后的时间用于显示"真太阳时"
          hour: hour !== 'unknown' ? hour : undefined,
          minute: minute !== '0' ? minute : undefined,
          city: city || undefined,
          solarTimeCorrection,
          earlyZiHour,
          result,
          createdAt: new Date().toISOString(),
        }
        
        // 保存到最新结果（向后兼容）
        localStorage.setItem(BAZI_RESULT_STORAGE_KEY, JSON.stringify(payload))
        
        // 保存到结果列表
        const existingResultsStr = localStorage.getItem(BAZI_RESULTS_LIST_STORAGE_KEY)
        const existingResults: StoredBaZiResultWithId[] = existingResultsStr 
          ? JSON.parse(existingResultsStr) 
          : []
        
        // 将新结果添加到列表开头（最新的在前）
        const updatedResults = [payload, ...existingResults].slice(0, 100) // 最多保留100个结果
        
        localStorage.setItem(BAZI_RESULTS_LIST_STORAGE_KEY, JSON.stringify(updatedResults))
        
        // 直接跳转到结果页
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
      
      <div className="h-full flex relative bg-[#f5f5f7] paper-texture">

        {/* 左侧主内容区 - 排盘展示 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">

          <div className="min-h-full flex flex-col items-center justify-start lg:justify-center pt-24 pb-12 px-4 lg:p-8 relative z-10">
            <div className="w-full max-w-3xl space-y-6">
              {/* 初始状态：时空四柱 · 浑天仪 */}
              <BaZiInitialState />
            </div>
          </div>
          
          {/* 底部版权/提示 */}
          <div className="text-center pb-4 opacity-30 text-[10px] text-stone-500 font-serif">
            易知 · 实证易学平台
          </div>
        </main>

        {/* 右侧边栏 - 参数设置 */}
        <aside className="hidden lg:block w-90 shrink-0 h-full overflow-y-auto bg-white/90 border-l border-stone-200/60 shadow-[ -1px_0_2px_rgba(0,0,0,0.02)] relative z-20 backdrop-blur-sm">
          <div className="p-8 min-h-full">
            <h2 className="text-lg font-serif font-bold text-stone-800 mb-8 flex items-center gap-2 select-none">
              <Scroll className="w-5 h-5 text-[#C82E31]" />
              <span>录入契文</span>
            </h2>
            <BaZiForm 
              date={date} 
              setDate={setDate} 
              gender={gender} 
              setGender={setGender}
              name={name}
              setName={(value) => {
                setName(value)
                if (nameError && value.trim() !== '') {
                  setNameError(false)
                }
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
            />
            <div className="sticky bottom-0 pt-10 pb-8 bg-white/90 backdrop-blur-sm -mx-8 px-8">
              <Button 
                className="w-full h-12 bg-[#C82E31] hover:bg-[#B02629] text-white text-lg font-bold shadow-lg shadow-red-900/20 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                onClick={handleCalculate}
                disabled={loading}
              >
                {loading ? "正在推演..." : "开始排盘"}
              </Button>
            </div>
          </div>
        </aside>

      </div>
    </>
  )
}

