'use client'

import { Feather, History, Scroll, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// UI Components
import DivinationCasting from '@/lib/components/DivinationCasting'
import { Button } from '@/lib/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/lib/components/ui/drawer'

// Constants & Utils
import { RESULT_STORAGE_KEY, RESULTS_LIST_STORAGE_KEY, type StoredDivinationPayload, type StoredResultWithId } from '@/lib/constants/divination'
import { getHexagramResult } from '@/lib/constants/hexagrams'
import { useAlert } from '@/lib/utils/alert'
import { buildChangedLines, linesToBinaryString } from '@/lib/utils/divinationLineUtils'
import { getGanZhiInfo } from '@/lib/utils/lunar'

// Components
import DivinationForm from './components/DivinationForm'
import { TurtleIcon } from './components/TurtleIcon'

// -----------------------------------------------------------------------------
// 样式补丁：增强纸质感与书写感
// -----------------------------------------------------------------------------
const styles = `
  /* 宣纸纹理背景 */
  .paper-texture {
    background-color: #fdfbf7;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
  }

  /* 仿毛笔书写的输入框样式 */
  .calligraphy-input {
    background-color: transparent;
    border: none;
    border-bottom: 1px dashed #d6d3d1;
    border-radius: 0;
    padding-left: 0;
    transition: all 0.3s ease;
  }

  .calligraphy-input:focus {
    border-bottom: 1px solid #C82E31;
    box-shadow: none;
    background: linear-gradient(to bottom, transparent 95%, rgba(200, 46, 49, 0.05) 100%);
  }
  
  /* 选中文字颜色 */
  ::selection {
    background: rgba(200, 46, 49, 0.1);
    color: #C82E31;
  }

  /* react-datepicker 弹窗样式修复 */
  .react-datepicker-popper {
    z-index: 9999 !important;
  }

  .react-datepicker {
    font-family: 'Noto Sans SC', system-ui, sans-serif;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    background-color: white;
  }

  .react-datepicker__header {
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    border-radius: 8px 8px 0 0;
    padding-top: 8px;
  }

  .react-datepicker__current-month {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .react-datepicker__day-name {
    color: #6b7280;
    font-weight: 500;
    width: 2.5rem;
    line-height: 2.5rem;
  }

  .react-datepicker__day {
    width: 2.5rem;
    line-height: 2.5rem;
    margin: 0.166rem;
    color: #1f2937;
    border-radius: 4px;
  }

  .react-datepicker__day:hover {
    background-color: #f3f4f6;
    border-radius: 4px;
  }

  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected {
    background-color: #C82E31 !important;
    color: white !important;
    border-radius: 4px;
  }

  .react-datepicker__day--today {
    font-weight: 600;
    color: #C82E31;
  }

  .react-datepicker__time-container {
    border-left: 1px solid #e5e7eb;
  }

  .react-datepicker__time-container .react-datepicker__time {
    background-color: white;
  }

  .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box {
    width: 100%;
  }

  .react-datepicker__time-list-item {
    padding: 8px 10px;
    color: #1f2937;
  }

  .react-datepicker__time-list-item:hover {
    background-color: #f3f4f6;
  }

  .react-datepicker__time-list-item--selected {
    background-color: #C82E31 !important;
    color: white !important;
    font-weight: 600;
  }

  .react-datepicker__navigation {
    top: 8px;
  }

  .react-datepicker__navigation-icon::before {
    border-color: #6b7280;
  }

  .react-datepicker__navigation:hover *::before {
    border-color: #C82E31;
  }
  
  /* 错误震动动画 */
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }
  
  .animate-shake {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  }
`

// 类型定义
export type DivinationMethod = 'manual' | 'auto' | 'manual-set'

// 辅助函数
const methodToNumber = (method: DivinationMethod): number => {
  switch (method) {
    case 'manual':
      return 0 // 手动摇卦
    case 'auto':
      return 1 // 自动摇卦
    case 'manual-set':
      return 2 // 手工起卦
    default:
      return 0
  }
}

export default function ToolsPage() {
  const router = useRouter()
  const { alert } = useAlert()
  
  // 状态管理
  const [question, setQuestion] = useState('')
  const questionInputRef = useRef<HTMLTextAreaElement>(null)
  const [questionError, setQuestionError] = useState(false)
  const [divinationTime, setDivinationTime] = useState(new Date())
  const [isTimeManuallySelected, setIsTimeManuallySelected] = useState(false)
  const [divinationMethod, setDivinationMethod] = useState<DivinationMethod>('manual')
  const [trueSolarTimeEnabled, setTrueSolarTimeEnabled] = useState(false)
  
  // 摇卦状态
  const [isCasting, setIsCasting] = useState(false)
  const [lines, setLines] = useState<string[]>([])
  const [changingFlags, setChangingFlags] = useState<boolean[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [lastResultId, setLastResultId] = useState<string | null>(null)

  // 计算四柱（基于选择的起卦时间）
  const ganZhiData = useMemo(() => {
    return getGanZhiInfo(divinationTime)
  }, [divinationTime])

  // 时间自动更新
  useEffect(() => {
    if (isTimeManuallySelected || isCasting) return
    const timer = setInterval(() => setDivinationTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [isTimeManuallySelected, isCasting])

  const handleDateChange = useCallback((date: Date | null) => {
    if (date) {
      setIsTimeManuallySelected(true)
      setDivinationTime(date)
    }
  }, [])

  // 摇卦完成回调
  const handleCastComplete = useCallback((castLines: string[], castChangingFlags: boolean[]) => {
    setLines(castLines)
    setChangingFlags(castChangingFlags)
    
    // 计算结果逻辑 - 使用统一的工具函数
    const binaryLines = linesToBinaryString(castLines)
    const changedLines = buildChangedLines(castLines, castChangingFlags)
    const changedBinaryLines = linesToBinaryString(changedLines)

    const result = {
      originalKey: binaryLines,
      changedKey: changedBinaryLines,
      original: getHexagramResult(binaryLines),
      changed: getHexagramResult(changedBinaryLines),
      changingLines: castChangingFlags.map((flag, idx) => flag ? idx + 1 : 0).filter(Boolean)
    }

    const payload: StoredDivinationPayload = {
      question: question || '未填写事项',
      divinationTimeISO: divinationTime.toISOString(),
      divinationMethod: methodToNumber(divinationMethod),
      lines: castLines,
      changingFlags: castChangingFlags,
      result
    }

    try {
      if (typeof window !== 'undefined') {
        // 生成唯一ID
        const resultId = `result_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        
        // 创建带ID的结果对象
        const resultWithId: StoredResultWithId = {
          ...payload,
          id: resultId,
          createdAt: new Date().toISOString()
        }
        
        // 保存到最新结果（向后兼容）
        localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(payload))
        
        // 保存到结果列表
        const existingResultsStr = localStorage.getItem(RESULTS_LIST_STORAGE_KEY)
        const existingResults: StoredResultWithId[] = existingResultsStr 
          ? JSON.parse(existingResultsStr) 
          : []
        
        // 将新结果添加到列表开头（最新的在前）
        const updatedResults = [resultWithId, ...existingResults].slice(0, 100) // 最多保留100个结果
        
        localStorage.setItem(RESULTS_LIST_STORAGE_KEY, JSON.stringify(updatedResults))
        
        // 保存结果ID，等待用户手动点击查看结果按钮
        setLastResultId(resultId)
      }
      setIsComplete(true)
    } catch (e) {
      console.error('Storage error', e)
    }
  }, [question, divinationTime, divinationMethod])

  const handleViewResult = () => {
    // 优先使用保存的结果ID
    if (lastResultId) {
      router.push(`/6yao/${lastResultId}`)
      return
    }
    
    // 如果没有保存的ID，尝试从localStorage获取最新的结果ID
    if (typeof window !== 'undefined') {
      const resultsListStr = localStorage.getItem(RESULTS_LIST_STORAGE_KEY)
      if (resultsListStr) {
        const resultsList: StoredResultWithId[] = JSON.parse(resultsListStr)
        if (resultsList.length > 0) {
          router.push(`/6yao/${resultsList[0].id}`)
          return
        }
      }
      // 向后兼容：如果没有结果列表，尝试读取旧存储
      const stored = localStorage.getItem(RESULT_STORAGE_KEY)
      if (stored) {
        router.push('/6yao/latest')
        return
      }
    }
    router.push('/6yao')
  }
  
  const handleGoBack = () => {
    setLines([])
    setChangingFlags([])
    setIsComplete(false)
    setIsCasting(false)
    setLastResultId(null)
    setResetKey(prev => prev + 1)
  }

  const startCasting = (): boolean => {
    // 校验求测事项必填
    if (!question || question.trim().length === 0) {
      setQuestionError(true)
      // alert('请填写求测事项') // 移除 alert
      
      // 聚焦并震动提示
      // 检查 ref 是否存在且元素可见（offsetParent 不为 null 表示可见）
      if (questionInputRef.current && questionInputRef.current.offsetParent !== null) {
        questionInputRef.current.focus()
        questionInputRef.current.classList.add('animate-shake')
        setTimeout(() => questionInputRef.current?.classList.remove('animate-shake'), 500)
      } else {
        // PC 端或输入框不可见时，使用弹窗提示（后续可优化为 Toast）
        alert('请填写求测事项')
      }
      return false
    }
    if (question.trim().length > 100) {
      alert('事项内容过长')
      return false
    }
    setQuestionError(false)
    setIsCasting(true)
    return true
  }

  const handleQuestionChange = (value: string) => {
    setQuestion(value)
    // 用户开始输入时清除错误状态
    if (questionError && value.trim().length > 0) {
      setQuestionError(false)
    }
  }

  return (
    <>
      <style jsx global>{styles}</style>
      <div className="h-full flex relative bg-[#f5f5f7] paper-texture">
        
        {/* 左侧主内容区 - 摇卦台 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          
          {/* 背景装饰：更具象的罗盘/太极底纹 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
            {/* 外圈罗盘刻度 (示意) - 扩大范围 */}
            <svg width="950" height="950" viewBox="0 0 950 950" className="opacity-[0.05] animate-[spin_60s_linear_infinite]">
              <circle cx="475" cy="475" r="356.25" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="475" cy="475" r="415.625" fill="none" stroke="currentColor" strokeWidth="1" />
              {Array.from({ length: 12 }).map((_, i) => (
                <line 
                  key={i} 
                  x1="475" y1="118.75" x2="475" y2="142.5" 
                  transform={`rotate(${i * 30} 475 475)`} 
                  stroke="currentColor" 
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>

          <div className="min-h-full flex flex-col items-center justify-start lg:justify-center pt-24 pb-12 px-4 lg:p-8 relative z-10">
            <div className="w-full max-w-xl space-y-12">
              
              {/* 头部提示 */}
              {!isCasting && !isComplete && (
                <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 mb-2">
                    {/* 草龟壳图标 SVG - 模拟三棱特征 */}
                    <TurtleIcon className="w-8 h-8" />
                  </div>
                  <h1 className="text-3xl font-serif font-bold text-stone-800 tracking-widest">
                    诚心问道
                  </h1>
                  <p className="text-stone-500 text-sm font-serif">
                    &ldquo;凡占，必诚必敬。右侧录入事项，静心点击下方。&rdquo;
                  </p>
                </div>
              )}

              {/* 移动端主界面输入框 (仅在未摇卦时显示) */}
              {!isCasting && !isComplete && (
                <div className="lg:hidden w-full animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                  <div className="relative">
                    <textarea
                      ref={questionInputRef}
                      value={question}
                      onChange={(e) => handleQuestionChange(e.target.value)}
                      placeholder="所占何事？在此处输入..."
                      className={`w-full bg-white/40 backdrop-blur-sm border-0 border-b-2 rounded-t-lg px-4 py-4 text-lg min-h-[80px] resize-none text-stone-800 placeholder:text-stone-400 focus:ring-0 focus:outline-none transition-all ${
                        questionError 
                          ? 'border-red-400 bg-red-50/20' 
                          : 'border-stone-200 focus:border-[#C82E31] focus:bg-white/60'
                      }`}
                    />
                    {/* 错误提示角标 */}
                    {questionError && (
                      <div className="absolute right-2 top-2 text-red-500 animate-pulse">
                        <Feather className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 核心摇卦组件容器：增加垫子/托盘的感觉 */}
              <div className="relative">
                {/* 光晕效果 */}
                {isCasting && (
                  <div className="absolute inset-0 bg-[#C82E31]/5 blur-3xl rounded-full animate-pulse"></div>
                )}
                
                <div className="bg-white/60 backdrop-blur-sm rounded-full p-8 lg:p-16 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 transition-all duration-500">
                  <DivinationCasting
                    key={resetKey}
                    divinationMethod={methodToNumber(divinationMethod)}
                    onCastComplete={handleCastComplete}
                    onStartCasting={startCasting}
                  />
                </div>
              </div>

              {/* 结果操作区 */}
              {isComplete && lines.length === 6 && (
                <div className="flex flex-col items-center justify-center pt-8 space-y-6 animate-in zoom-in-95 duration-500">
                  <Button
                    onClick={handleViewResult}
                    className="h-14 px-12 text-lg font-serif tracking-widest bg-[#C82E31] hover:bg-[#A61B1F] text-white rounded-full shadow-lg shadow-red-900/20 border-2 border-white ring-4 ring-[#C82E31]/10 transition-all hover:scale-105 active:scale-95"
                  >
                    查看排盘
                  </Button>
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-600 transition-colors font-serif group px-4 py-2 rounded-full hover:bg-stone-100"
                  >
                    <History className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
                    重新起卦
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* 底部版权/提示 */}
          <div className="text-center pb-4 opacity-30 text-[10px] text-stone-500 font-serif">
            易知 · 实证易学平台
          </div>
        </main>

        {/* 右侧边栏 - 参数设置 */}
        <aside className="hidden lg:block w-80 shrink-0 h-full overflow-y-auto bg-white/90 border-l border-stone-200/60 shadow-[ -1px_0_2px_rgba(0,0,0,0.02)] relative z-20 backdrop-blur-sm">
          <div className="p-8 min-h-full">
            <h2 className="text-lg font-serif font-bold text-stone-800 mb-8 flex items-center gap-2 select-none">
              <Scroll className="w-5 h-5 text-[#C82E31]" />
              <span>录入契文</span>
            </h2>
            <DivinationForm
              question={question}
              onQuestionChange={handleQuestionChange}
              divinationTime={divinationTime}
              onDateChange={handleDateChange}
              divinationMethod={divinationMethod}
              onDivinationMethodChange={setDivinationMethod}
              ganZhiData={ganZhiData}
              questionError={questionError}
            />
          </div>
        </aside>

        {/* 移动端设置抽屉 */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              className="fixed bottom-6 right-6 lg:hidden z-40 h-14 w-14 rounded-full bg-[#C82E31] hover:bg-[#A61B1F] text-white shadow-lg shadow-red-900/30"
              aria-label="打开设置"
            >
              <Settings className="h-6 w-6" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="rounded-t-3xl bg-paper-50 paper-texture border-none">
            <DrawerHeader className="border-b border-stone-100/50 pb-4">
              <div className="flex items-center justify-between px-2">
                <DrawerTitle className="text-xl font-serif text-stone-800">录入契文</DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400">
                    <span className="sr-only">关闭</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="p-8 max-h-[75vh] overflow-y-auto">
              <DivinationForm
                question={question}
                onQuestionChange={handleQuestionChange}
                divinationTime={divinationTime}
                onDateChange={handleDateChange}
                divinationMethod={divinationMethod}
                onDivinationMethodChange={setDivinationMethod}
                ganZhiData={ganZhiData}
                questionError={questionError}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  )
}
