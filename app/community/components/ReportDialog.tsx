'use client'

import React, { useState } from 'react'
import { Flag, AlertTriangle, ShieldAlert } from 'lucide-react'
import { Button } from '@/lib/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/lib/components/ui/dialog'
import { Textarea } from '@/lib/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/lib/components/ui/radio-group'
import { Label } from '@/lib/components/ui/label'
import { useToast } from '@/lib/hooks/use-toast'
import { submitReport, type ReportReasonCategory, type ReportTargetType } from '@/lib/services/reports'

// 举报理由配置
const REPORT_REASONS: Array<{
  id: ReportReasonCategory
  label: string
  icon: typeof ShieldAlert | null
}> = [
  { id: 'compliance', label: '违法违规 / 敏感信息', icon: ShieldAlert },
  { id: 'superstition', label: '封建迷信 / 怪力乱神', icon: AlertTriangle },
  { id: 'scam', label: '广告引流 / 诈骗钱财', icon: Flag },
  { id: 'attack', label: '人身攻击 / 恶意引战', icon: null },
  { id: 'spam', label: '垃圾灌水 / 内容不适', icon: null },
]

interface ReportDialogProps {
  targetId: string
  targetType: ReportTargetType
  trigger?: React.ReactNode
  postTitle?: string
}

export default function ReportDialog({ targetId, targetType, trigger, postTitle }: ReportDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReasonCategory | ''>('')
  const [desc, setDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: '请选择举报理由',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitReport({
        targetId,
        targetType,
        reasonCategory: reason as ReportReasonCategory,
        description: desc || undefined,
      })

      if (result.success) {
        toast({
          title: result.message,
          description: '管理员将在 24 小时内进行审核处理。',
        })
        setOpen(false)
        setReason('')
        setDesc('')
      } else {
        toast({
          title: result.message,
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: '提交失败',
        description: '请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="flex items-center gap-2 px-2 py-1.5 text-sm text-stone-500 hover:bg-red-50 hover:text-[#C82E31] w-full rounded-md transition-colors text-left">
            <Flag className="w-4 h-4" /> 举报内容
          </button>
        )}
      </DialogTrigger>

      {/* 弹窗内容：仿信笺风格 */}
      <DialogContent className="sm:max-w-md bg-[#fdfbf7] border-stone-200 p-0 gap-0 overflow-hidden">
        {/* 顶部装饰条 */}
        <div className="h-1 bg-[#C82E31] w-full"></div>

        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#C82E31]" />
            检举违规
          </DialogTitle>
          <p className="text-xs text-stone-500 font-serif mt-1">
            “易知”提倡理性研讨，请协助我们清除违规内容。
          </p>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          {/* 显示被举报的帖子标题 */}
          {targetType === 'post' && postTitle && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-xs text-stone-500 font-serif mb-1">被举报的帖子：</p>
              <p className="text-sm font-medium text-stone-800 line-clamp-2">{postTitle}</p>
            </div>
          )}
          {/* 理由选择 */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 font-serif block">
              请选择举报理由 <span className="text-[#C82E31]">*</span>
            </label>
            <RadioGroup value={reason} onValueChange={(value) => setReason(value as ReportReasonCategory)} className="grid grid-cols-1 gap-2">
              {REPORT_REASONS.map((item) => (
                <div
                  key={item.id}
                  className={`
                  flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-all
                  ${reason === item.id
                    ? 'border-[#C82E31] bg-[#C82E31]/5'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                  }
                `}
                >
                  <RadioGroupItem value={item.id} id={item.id} className="text-[#C82E31] border-stone-400" />
                  <Label htmlFor={item.id} className="flex-1 cursor-pointer text-sm text-stone-700 flex items-center gap-2">
                    {item.label}
                    {item.icon && <item.icon className="w-3.5 h-3.5 text-stone-400" />}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 补充说明 */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 font-serif">
              补充说明 (可选)
            </label>
            <Textarea
              placeholder="请详细描述违规情况，以便管理员快速判断..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="bg-white border-stone-200 focus:border-[#C82E31] focus:ring-[#C82E31]/20 min-h-[5rem] text-sm resize-none"
              maxLength={200}
            />
            <div className="text-right text-xs text-stone-400">
              {desc.length}/200
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-stone-50/50 border-t border-stone-100 flex items-center justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost" className="text-stone-500 hover:text-stone-800">
              取消
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
            className="bg-[#C82E31] hover:bg-[#A61B1F] text-white shadow-sm font-serif min-w-[6.25rem]"
          >
            {isSubmitting ? '提交中...' : '提交举报'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
