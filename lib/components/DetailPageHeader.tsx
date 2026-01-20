'use client'

import ReportDialog from '@/app/community/components/ReportDialog'
import { Button } from '@/lib/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/lib/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/lib/components/ui/tooltip"
import { useToast } from '@/lib/hooks/use-toast'
import { type ReportTargetType } from '@/lib/services/reports'
import { cn } from '@/lib/utils/cn'
import { ArrowLeft, Flag, MoreHorizontal, Share2 } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'

export interface DetailPageHeaderProps {
  /** 返回链接 (必填，例如 /community) */
  backHref: string
  /** 返回按钮文案 (例如 "返回社区"，不填则默认显示 "返回") */
  backLabel?: string
  
  /** 分享配置 */
  share?: {
    title: string
    url?: string
  }
  /** 举报配置 */
  report?: {
    targetId: string
    targetType: ReportTargetType
    postTitle?: string
  }
  /** 额外的操作按钮 */
  actions?: ReactNode
  /** 自定义样式类名 */
  className?: string
}

export default function DetailPageHeader({
  backHref,
  backLabel = "返回",
  share,
  report,
  actions,
  className = '',
}: DetailPageHeaderProps) {
  const { toast } = useToast()

  const handleShare = async () => {
    if (!share) return
    const url = share.url || (typeof window !== 'undefined' ? window.location.href : '')
    const title = share.title

    try {
      if (typeof window !== 'undefined' && 'share' in window.navigator) {
        await window.navigator.share({ title, url })
        return
      }
      if (typeof window !== 'undefined' && window.navigator.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(url)
        toast({ title: '链接已复制' })
        return
      }
      toast({ title: '无法分享', variant: 'destructive' })
    } catch (error) {
      toast({ title: '分享失败', variant: 'destructive' })
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <header 
        className={cn(
          "sticky top-0 z-40 h-14 w-full transition-all duration-300",
          // --- 核心修改区域 ---
          // 1. 背景色：改为 #fdfbf7 (米色)，与页面背景一致
          // 2. 透明度：/90 保证内容滚动过去时有模糊遮挡，但基调是暖的
          // 3. 边框：颜色调淡到 stone-200/40，几乎不可见，仅作逻辑分割
          "bg-[#fdfbf7]/90 backdrop-blur-md border-b border-stone-200/40",
          // ------------------
          className
        )}
      >
        <div className="max-w-7xl mx-auto h-full px-4 lg:px-8 flex items-center justify-between">
          
          {/* Left: Clean Back Button */}
          <div className="flex items-center">
            <Link 
              href={backHref} 
              className={cn(
                "group flex items-center gap-2 px-2 py-1.5 -ml-2 rounded-lg transition-all duration-200",
                // Hover 状态改为深一点的米色，而不是纯白或纯灰
                "text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 active:scale-[0.98]"
              )}
              aria-label={backLabel}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-transparent group-hover:bg-stone-200/30 transition-colors">
                <ArrowLeft className="h-4.5 w-4.5 transition-transform group-hover:-translate-x-0.5" />
              </div>
              <span className="text-sm font-medium tracking-wide font-sans">{backLabel}</span>
            </Link>
          </div>

          {/* Right: Actions Area */}
          <div className="flex items-center gap-1 sm:gap-2">
            {actions}
            
            {share && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-9 h-9 text-stone-400 hover:text-stone-800 hover:bg-stone-200/50 rounded-full transition-all active:scale-95"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">分享</TooltipContent>
              </Tooltip>
            )}

            {report && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-9 h-9 text-stone-400 hover:text-stone-800 hover:bg-stone-200/50 rounded-full transition-all active:scale-95"
                  >
                    <MoreHorizontal className="h-4.5 w-4.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-32 p-1 bg-white border-stone-100 shadow-lg rounded-lg">
                  <ReportDialog
                    targetId={report.targetId}
                    targetType={report.targetType}
                    postTitle={report.postTitle}
                    trigger={
                      <Button 
                        variant="ghost" 
                        className="w-full h-8 text-xs justify-start px-2 text-stone-600 hover:text-[#C82E31] hover:bg-red-50 rounded-md" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Flag className="w-3.5 h-3.5 mr-2" /> 举报违规
                      </Button>
                    }
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
