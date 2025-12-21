'use client'

import DateCard from '@/lib/components/DateCard'
import { DateTimePicker } from '@/lib/components/DateTimePicker'
import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/card'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/components/ui/select'

import { getGanZhiInfo, getKongWangPairForStemBranch } from '@/lib/utils/lunar'
import { useEffect, useMemo, useState } from 'react'

export type DivinationMethod = 'manual' | 'auto' | 'manual-set'

interface ParameterPanelProps {
  divinationTime: Date
  onTimeChange: (date: Date) => void
  trueSolarTimeEnabled: boolean
  onTrueSolarTimeToggle: (enabled: boolean) => void
  divinationMethod: DivinationMethod
  onDivinationMethodChange: (method: DivinationMethod) => void
  questionContent?: string
  onQuestionContentChange?: (content: string) => void
}

export default function ParameterPanel({
  divinationTime,
  onTimeChange,
  trueSolarTimeEnabled,
  onTrueSolarTimeToggle,
  divinationMethod,
  onDivinationMethodChange,
  questionContent,
  onQuestionContentChange
}: ParameterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // 更新当前时间（每分钟更新一次）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // 每分钟更新一次

    return () => clearInterval(timer)
  }, [])

  // 计算四柱（基于选择的起卦时间）
  const ganZhiData = useMemo(() => {
    return getGanZhiInfo(divinationTime)
  }, [divinationTime])

  return (
    <Card className="bg-card/95">
      <CardHeader className="pb-3">
        {/* 日期卡片 - 显示当前时间 */}
        <DateCard date={currentTime} /> 
        <div className="flex items-center justify-between mt-3 px-6">        
          <div>
            <CardTitle className="mb-1 text-lg font-serif text-ink-800">参数设置</CardTitle>
            <p className="text-xs text-gray-400">调整占卜相关参数</p>
          </div>
        </div>
      </CardHeader>
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-6 mt-2 mb-4" />
      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* 事项内容 */}
          <div className="space-y-2">
            <Label className="text-ink-700">事项内容</Label>
            <Input
              type="text"
              placeholder="请输入您的问题"
              value={questionContent || ''}
              onChange={(e) => onQuestionContentChange?.(e.target.value)}
              className="bg-background/50 mt-2"
            />
          </div>

          <div className="space-y-2">
            <DateTimePicker date={divinationTime} setDate={onTimeChange} />
          </div>

          {/* 起卦方式 */}
          <div className="space-y-2">
            <Label className="text-ink-700">起卦方式</Label>
            <Select
              value={divinationMethod}
              onValueChange={(value) => onDivinationMethodChange(value as DivinationMethod)}
            >
              <SelectTrigger className="bg-background/50 mt-2 cursor-pointer">
                <SelectValue placeholder="选择起卦方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">手动摇卦</SelectItem>
                <SelectItem value="auto">自动摇卦</SelectItem>
                <SelectItem value="manual-set">手动设置</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-6 my-8" />

          <div className="space-y-2">
            <div className="mt-2">
              <div className="grid grid-cols-4 gap-3">
                {ganZhiData.stems.map((stem, index) => {
                  const branch = ganZhiData.branches[index]
                  const kongWang = getKongWangPairForStemBranch(stem.char, branch.char)
                  const labels = ['年柱', '月柱', '日柱', '时柱']
                  return (
                    <div key={index} className="text-center">
                      <div className="text-xs text-gray-500 mb-1">{labels[index]}</div>
                      <div className="text-base font-semibold text-ink-800">{stem.char}{branch.char}</div>
                      <div className="text-xs text-gray-400 mt-1">空：{kongWang}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </CardContent>
      )}
    </Card>
  )
}

