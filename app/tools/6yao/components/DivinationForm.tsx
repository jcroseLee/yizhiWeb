'use client'

import { DateTimePicker } from '@/lib/components/DateTimePicker'
import { PenLine } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Label } from '@/lib/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/lib/components/ui/select'
import { Textarea } from '@/lib/components/ui/textarea'
import { getKongWangPairForStemBranch } from '@/lib/utils/lunar'

import type { DivinationMethod } from '../page'


interface GanZhiData {
  stems: Array<{ char: string }>
  branches: Array<{ char: string }>
}

interface DivinationFormProps {
  question: string
  onQuestionChange: (value: string) => void
  divinationTime: Date
  onDateChange: (date: Date | null) => void
  divinationMethod: DivinationMethod
  onDivinationMethodChange: (method: DivinationMethod) => void
  ganZhiData: GanZhiData
  questionError?: boolean
}

const EXAMPLE_QUESTIONS = [
  "求测财运：近期财运如何？",
  "求测事业：工作变动是否顺利？",
  "求测感情：这段感情会有结果吗？",
  "求测健康：身体不适何时能好？",
  "求测出行：这次出行是否平安？",
  "求测失物：丢失的物品能找回吗？",
  "求测学业：这次考试能否通过？"
]

export default function DivinationForm({
  question,
  onQuestionChange,
  divinationTime,
  onDateChange,
  divinationMethod,
  onDivinationMethodChange,
  ganZhiData,
  questionError = false,
}: DivinationFormProps) {
  // 当前时间状态，每秒更新一次
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [isQuestionFocused, setIsQuestionFocused] = useState(false)

  useEffect(() => {
    // 每秒更新一次当前时间
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div className="space-y-8 font-serif">
        {/* 1. 四柱信息卡片 (保持不变) */}
        <div className="bg-white border border-stone-200/80 rounded-sm p-5 relative overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#C82E31]/10"></div>
          
          <div className="flex justify-between items-baseline mb-4 border-b border-stone-100 pb-2">
            <span className="text-xs text-stone-400 font-sans">当前时刻</span>
            <span className="text-sm font-bold text-stone-700 font-mono tracking-wide">
              {currentTime.toLocaleString('zh-CN', { 
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false 
              })}
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center">
            {ganZhiData.stems.map((stem, index) => {
              const branch = ganZhiData.branches[index]
              const labels = ['年柱', '月柱', '日柱', '时柱']
              return (
                <div key={index} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-stone-400 tracking-widest">{labels[index]}</span>
                  <div className="flex flex-col gap-1">
                    <div className="w-8 h-8 rounded-full border border-[#C82E31]/30 bg-[#C82E31]/5 text-[#C82E31] flex items-center justify-center font-bold shadow-sm">
                      {stem.char}
                    </div>
                    <div className="w-8 h-8 rounded-sm border border-stone-300 bg-stone-50 text-stone-800 flex items-center justify-center font-bold">
                      {branch.char}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-dashed border-stone-200 flex justify-center gap-6 text-[10px] text-stone-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
              年空: {getKongWangPairForStemBranch(ganZhiData.stems[0].char, ganZhiData.branches[0].char)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
              日空: {getKongWangPairForStemBranch(ganZhiData.stems[2].char, ganZhiData.branches[2].char)}
            </span>
          </div>
        </div>

        {/* 2. 表单区域 */}
        <div className="space-y-6 pl-1">
          
          {/* 事项 */}
          <div className="space-y-3 group">
            <Label className="text-sm font-bold text-stone-800 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#C82E31] rounded-full"></span>
              求测事项
              <span className="text-[#C82E31] text-xs ml-1">*</span>
            </Label>
            <div className="relative">
              <Textarea 
                placeholder="所占何事？请在此处简述（必填）..." 
                value={question}
                onChange={(e) => onQuestionChange(e.target.value)}
                onFocus={() => setIsQuestionFocused(true)}
                onBlur={() => setTimeout(() => setIsQuestionFocused(false), 200)}
                className={`bg-transparent border-0 border-b rounded-none px-0 py-2 min-h-[80px] resize-none text-base text-stone-700 placeholder:text-stone-300 placeholder:font-light focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:bg-stone-50/50 transition-colors ${
                  questionError 
                    ? 'border-solid border-red-500 focus:border-red-500' 
                    : 'border-dashed border-stone-300 focus:border-[#C82E31]'
                }`}
              />
              
              {/* 推荐问题下拉框 */}
              {isQuestionFocused && (
                <div className="absolute top-full left-0 w-full z-10 bg-white border border-stone-200 shadow-lg rounded-sm mt-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-2 text-xs text-stone-400 bg-stone-50 border-b border-stone-100 font-sans">
                    问题示例
                  </div>
                  {EXAMPLE_QUESTIONS.map((q, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 text-sm text-stone-600 hover:bg-[#C82E31]/5 hover:text-[#C82E31] cursor-pointer transition-colors border-b border-stone-50 last:border-0"
                      onMouseDown={(e) => {
                        e.preventDefault() // 防止失去焦点
                        onQuestionChange(q)
                        setIsQuestionFocused(false)
                      }}
                    >
                      {q}
                    </div>
                  ))}
                </div>
              )}

              <PenLine className="absolute right-0 bottom-2 w-4 h-4 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            {questionError && (
              <p className="text-sm text-red-500 font-serif">
                请填写求测事项
              </p>
            )}
          </div>

          {/* 时间调整 - 修复版 */}
          <div className="space-y-3 relative group">
            <Label className="text-sm font-bold text-stone-800 flex items-center gap-2">
              <span className="w-1 h-3 bg-stone-300 rounded-full"></span>
              调整时间
            </Label>
            <div className="relative w-full">
              <DateTimePicker
                date={divinationTime}
                setDate={(date) => onDateChange(date)}
                showLabel={false}
                className="gap-0"
                buttonClassName="border-0 border-b border-dashed border-stone-300 rounded-none bg-transparent hover:bg-transparent hover:border-stone-400 focus:border-[#C82E31] focus:ring-0 focus:outline-none shadow-none w-full h-auto py-2 px-0"
              />
            </div>
          </div>

          {/* 起卦方式 */}
          <div className="space-y-3">
            <Label className="text-sm font-bold text-stone-800 flex items-center gap-2">
              <span className="w-1 h-3 bg-stone-300 rounded-full"></span>
              起卦方式
            </Label>
            <Select 
              value={divinationMethod} 
              onValueChange={(v) => onDivinationMethodChange(v as DivinationMethod)}
            >
              <SelectTrigger className="bg-transparent border-0 border-b border-dashed border-stone-300 rounded-none px-0 py-2 justify-between hover:text-[#C82E31] focus:ring-0 focus:outline-none focus:border-[#C82E31]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">手动摇卦</SelectItem>
                <SelectItem value="auto">自动摇卦</SelectItem>
                <SelectItem value="manual-set">手工指定</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  )
}