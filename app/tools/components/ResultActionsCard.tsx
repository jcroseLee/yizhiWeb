'use client'

import { Button } from '@/lib/components/ui/button'
import { Card } from '@/lib/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { type BaZiResult } from '@/lib/utils/bazi'
import { toPng } from 'html-to-image'
import { BookOpen, Download, Save, Share2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { ScrollArea } from '../../../lib/components/ui/scroll-area'
import ShareImageCard from './BaZiShareImage'

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
}: ResultActionsCardProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const shareImageRef = useRef<HTMLDivElement>(null)
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
  const canGenerateShareImage = baziResult && baziPayload && baziResult.pillars && baziResult.pillars.length === 4

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

  const handleDownloadImage = async () => {
    if (!shareImageRef.current) return

    setDownloading(true)
    try {
      // 使用 html-to-image 生成图片
      const dataUrl = await toPng(shareImageRef.current, {
        backgroundColor: '#FDFBF7',
        pixelRatio: 2, // 2倍图，提高清晰度
        cacheBust: true,
      })

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `易知命书_${baziPayload?.name || '八字'}_${new Date().toISOString().split('T')[0]}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: '下载成功',
        description: '分享图已保存到本地',
      })
    } catch (error) {
      console.error('Failed to generate share image:', error)
      toast({
        title: '下载失败',
        description: '生成图片时出错，请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setDownloading(false)
    }
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
            disabled={!canGenerateShareImage && !onDownload}
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
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="paper-texture bg-[#FAF9F6]">
            <DialogHeader>
              <DialogTitle>分享结果图</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <ScrollArea className="w-full max-h-[80vh] overflow-y-auto">
                <div ref={shareImageRef} className="w-full flex justify-center">
                  <ShareImageCard
                    result={baziResult}
                    payload={baziPayload!}
                    aiResult={aiResult}
                  />
                </div>
              </ScrollArea>
              <Button
                onClick={handleDownloadImage}
                disabled={downloading}
                className="w-full bg-[#C82E31] hover:bg-[#A61B1F] text-white"
              >
                {downloading ? '生成中...' : '下载图片'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
