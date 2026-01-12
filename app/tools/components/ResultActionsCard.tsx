'use client'

import { Button } from '@/lib/components/ui/button'
import { Card } from '@/lib/components/ui/card'
import { useToast } from '@/lib/hooks/use-toast'
import { type BaZiResult } from '@/lib/utils/bazi'
import { type LineDetail } from '@/lib/utils/liuyaoDetails'
import { BookOpen, Download, Save, Share2 } from 'lucide-react'
import { useState } from 'react'
import { ShareResultDialog } from './ShareResultDialog'

export interface ResultActionsCardProps {
  /** 是否已保存 */
  isSaved: boolean
  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean
  /** 是否正在保存 */
  saving: boolean
  /** 是否正在加载（如问题/姓名更新） */
  loading?: boolean
  /** 是否是作者 */
  isAuthor?: boolean
  /** 是否是本地结果 */
  isLocalResult?: boolean
  /** 保存回调 */
  onSave: () => void
  /** 发布回调（可选，如果提供则显示发布按钮） */
  onPublish?: () => void
  /** 下载/分享结果图回调（可选，如果提供则使用自定义回调） */
  onDownload?: () => void
  /** 写笔记回调（可选，如果提供则显示写笔记按钮） */
  onWriteNote?: () => void
  /** 八字结果数据（用于生成分享图） */
  baziResult?: BaZiResult
  /** 排盘载荷数据 */
  baziPayload?: {
    name?: string
    gender: string
    dateISO: string
  }
  /** AI 分析结果 */
  aiResult?: string
  /** 六爻数据（用于生成分享图） */
  liuyaoData?: {
    question?: string
    dateISO?: string
    lunarDate?: string
    kongWang?: string
    benGua?: {
      name: string
      element: string
      key: string
    }
    bianGua?: {
      name: string
      element: string
      key: string
    }
    lines?: Array<{
      position: number
      yinYang: 0 | 1
      moving: boolean
      detail?: LineDetail
    }>
  }
}

export function ResultActionsCard({
  isSaved,
  hasUnsavedChanges,
  saving,
  loading = false,
  isAuthor = false,
  isLocalResult = false,
  onSave,
  onPublish,
  onDownload,
  onWriteNote,
  baziResult,
  baziPayload,
  aiResult,
  liuyaoData,
}: ResultActionsCardProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const { toast } = useToast()
  
  const isLoading = saving || loading
  const saveButtonText = isLoading
    ? '保存中...'
    : isSaved && !hasUnsavedChanges
      ? '已保存到云端'
      : hasUnsavedChanges
        ? '更新到云端'
        : '保存到云端'

  const showPublishButton = onPublish && (isAuthor || isLocalResult)
  
  // 检查是否有足够的数据生成分享图
  const canGenerateBaziShareImage = baziResult && baziPayload && baziResult.pillars && baziResult.pillars.length === 4
  const canGenerateLiuyaoShareImage = liuyaoData && liuyaoData.lines && liuyaoData.lines.length > 0
  const canGenerateShareImage = canGenerateBaziShareImage || canGenerateLiuyaoShareImage

  const handleDownload = async () => {
    // 如果提供了自定义回调，使用它
    if (onDownload) {
      onDownload()
      return
    }

    // 如果没有数据，显示提示
    if (!canGenerateShareImage) {
      toast({
        title: '无法生成分享图',
        description: '缺少必要的排盘数据',
        variant: 'destructive',
      })
      return
    }

    // 打开对话框
    setShareDialogOpen(true)
  }


  return (
    <>
      <Card className="bg-white border-none shadow-sm p-3">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm"
            onClick={onSave}
            disabled={(isSaved && !hasUnsavedChanges) || isLoading}
          >
            <Save className={`w-4 h-4 ${isSaved && !hasUnsavedChanges ? 'text-green-600' : ''}`} />
            {saveButtonText}
          </Button>
          {showPublishButton && (
            <Button
              variant="ghost"
              className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm"
              onClick={onPublish}
              disabled={saving}
            >
              <Share2 className="w-4 h-4" />
              {saving ? '保存中...' : '发布到社区'}
            </Button>
          )}
          <Button
            variant="ghost"
            className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
            分享结果图
          </Button>
          {onWriteNote && (
            <Button
              variant="ghost"
              className="justify-start gap-3 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 h-9 text-sm"
              onClick={onWriteNote}
            >
              <BookOpen className="w-4 h-4" />
              写笔记
            </Button>
          )}
        </div>
      </Card>

      {/* 分享图对话框 */}
      {canGenerateShareImage && (
        <ShareResultDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          baziResult={baziResult}
          baziPayload={baziPayload}
          aiResult={aiResult}
          liuyaoData={liuyaoData}
        />
      )}
    </>
  )
}
