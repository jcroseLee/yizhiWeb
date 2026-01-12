'use client'

import { Button } from '@/lib/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'
import { ScrollArea } from '@/lib/components/ui/scroll-area'
import { useToast } from '@/lib/hooks/use-toast'
import { type BaZiResult } from '@/lib/utils/bazi'
import { type LineDetail } from '@/lib/utils/liuyaoDetails'
import { toPng } from 'html-to-image'
import { useRef, useState } from 'react'
import ShareImageCard from './BaZiShareImage'
import LiuyaoShareCard from './LiuyaoShareImage'

export interface ShareResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  baziResult?: BaZiResult
  baziPayload?: {
    name?: string
    gender: string
    dateISO: string
  }
  aiResult?: string
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

export function ShareResultDialog({
  open,
  onOpenChange,
  baziResult,
  baziPayload,
  aiResult,
  liuyaoData,
}: ShareResultDialogProps) {
  const [downloading, setDownloading] = useState(false)
  const shareImageRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // 检查是否有足够的数据生成分享图
  const canGenerateBaziShareImage = baziResult && baziPayload && baziResult.pillars && baziResult.pillars.length === 4
  const canGenerateLiuyaoShareImage = liuyaoData && liuyaoData.lines && liuyaoData.lines.length > 0

  const handleDownloadImage = async () => {
    if (!shareImageRef.current) return

    setDownloading(true)
    try {
      // 使用 html-to-image 生成图片
      const dataUrl = await toPng(shareImageRef.current, {
        backgroundColor: '#F9F8F4',
        pixelRatio: 2, // 2倍图，提高清晰度
        cacheBust: true,
      })

      const link = document.createElement('a')
      link.href = dataUrl
      const fileName = canGenerateBaziShareImage
        ? `易知命书_${baziPayload?.name || '八字'}_${new Date().toISOString().split('T')[0]}.png`
        : `易知六爻_${liuyaoData?.question?.slice(0, 10) || '六爻'}_${new Date().toISOString().split('T')[0]}.png`
      link.download = fileName
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="paper-texture bg-[#FAF9F6] max-w-[95vw] sm:max-w-[90vw] max-h-[95vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">分享结果图</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-2 sm:py-4">
          <ScrollArea className="w-full max-h-[75vh] sm:max-h-[80vh] overflow-y-auto">
            <div ref={shareImageRef} className="w-full flex justify-center px-2 sm:px-0">
              {canGenerateBaziShareImage ? (
                <ShareImageCard
                  result={baziResult}
                  payload={baziPayload!}
                  aiResult={aiResult}
                />
              ) : canGenerateLiuyaoShareImage ? (
                <LiuyaoShareCard
                  question={liuyaoData?.question}
                  dateISO={liuyaoData?.dateISO}
                  lunarDate={liuyaoData?.lunarDate}
                  kongWang={liuyaoData?.kongWang}
                  benGua={liuyaoData?.benGua}
                  bianGua={liuyaoData?.bianGua}
                  lines={liuyaoData?.lines}
                  aiResult={aiResult}
                />
              ) : null}
            </div>
          </ScrollArea>
          <Button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="w-full bg-[#C82E31] hover:bg-[#A61B1F] text-white mt-3 sm:mt-4 text-sm sm:text-base"
          >
            {downloading ? '生成中...' : '下载图片'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
