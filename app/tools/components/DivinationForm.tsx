'use client'

import { DateTimePicker } from '@/lib/components/DateTimePicker'
import { PenLine } from 'lucide-react'
import { useState } from 'react'

import { Label } from '@/lib/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/lib/components/ui/select'
import { Textarea } from '@/lib/components/ui/textarea'

import type { DivinationMethod } from '../6yao/page'
import { SiZhuCard } from './SiZhuCard'

interface DivinationFormProps {
  question: string
  onQuestionChange: (value: string) => void
  divinationTime: Date
  onDateChange: (date: Date | null) => void
  divinationMethod: DivinationMethod
  onDivinationMethodChange: (method: DivinationMethod) => void
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
  questionError = false,
}: DivinationFormProps) {
  const [isQuestionFocused, setIsQuestionFocused] = useState(false)

  return (
    <>
      <div className="space-y-6 xl:space-y-8 font-serif">
        {/* 1. 四柱信息卡片 */}
        <SiZhuCard />

        {/* 2. 表单区域 */}
        <div className="space-y-5 xl:space-y-6 pl-1">
          
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
                className={`bg-transparent border-0 border-b rounded-none px-0 py-2 min-h-[4rem] xl:min-h-[5rem] resize-none text-base text-stone-700 placeholder:text-stone-300 placeholder:font-light focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:bg-stone-50/50 transition-colors ${
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
