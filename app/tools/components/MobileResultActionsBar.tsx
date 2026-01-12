'use client'

import { Button } from '@/lib/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { BookOpen, RotateCcw, Save, Send, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type RefObject } from 'react'
import { MobileAiButton } from './MobileAiButton'

export interface MobileResultActionsBarProps {
  /** 重排按钮的目标路由 */
  reroutePath: string
  /** 是否已保存 */
  isSaved: boolean
  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean
  /** 是否正在保存 */
  saving: boolean
  /** 是否正在加载（如问题/姓名更新） */
  loading?: boolean
  /** 保存回调 */
  onSave: () => void
  /** 笔记区域的ref（用于滚动到笔记） */
  noteSectionRef?: RefObject<{ scrollIntoView: (options?: ScrollIntoViewOptions) => void } | null>
  /** AI分析区域的ref（用于滚动到AI分析） */
  aiSectionRef?: RefObject<HTMLDivElement | null>
  /** 是否可以查看笔记 */
  canViewPrivateNotes?: boolean
  /** 分享配置 */
  shareConfig?: {
    title: string
    text: string
  }
  /** 自定义分享回调（如果提供，将使用此回调而不是默认的分享逻辑） */
  onShare?: () => void
  /** 发布回调（可选，如果提供则显示发布按钮） */
  onPublish?: () => void
  /** 是否显示发布按钮（需要 isAuthor 或 isLocalResult） */
  showPublish?: boolean
  /** AI分析回调 */
  onAiAnalyze?: () => void
}

export function MobileResultActionsBar({
  reroutePath,
  isSaved,
  hasUnsavedChanges,
  saving,
  loading = false,
  onSave,
  noteSectionRef,
  aiSectionRef,
  canViewPrivateNotes = false,
  shareConfig,
  onShare,
  onPublish,
  showPublish = false,
  onAiAnalyze,
}: MobileResultActionsBarProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleShare = () => {
    // 如果提供了自定义分享回调，使用它
    if (onShare) {
      onShare()
      return
    }

    // 否则使用默认的分享逻辑
    if (navigator.share && shareConfig) {
      navigator.share({
        title: shareConfig.title,
        text: shareConfig.text,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({ title: '链接已复制', description: '请粘贴分享给好友' })
    }
  }

  const handleScrollToNotes = () => {
    noteSectionRef?.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleAiAnalyzeClick = () => {
    // 执行AI分析回调（可能是异步的，但不等待它完成）
    if (onAiAnalyze) {
      Promise.resolve(onAiAnalyze()).catch(() => {})
    }
  }

  const isDisabled = (isSaved && !hasUnsavedChanges) || saving || loading

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-4 flex-1 justify-between pr-4">
        {/* 重排按钮 */}
        <Button 
          onClick={() => router.push(reroutePath)} 
          variant="ghost"
          className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform h-auto p-0"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="text-[10px] font-medium">重排</span>
        </Button>

        {/* 保存按钮 */}
        <Button 
          onClick={onSave} 
          variant="ghost"
          className={`flex flex-col items-center gap-0.5 active:scale-95 transition-transform h-auto p-0 ${isSaved && !hasUnsavedChanges ? 'text-green-600' : 'text-stone-500'}`}
          disabled={isDisabled}
        >
          <Save className="w-5 h-5" />
          <span className="text-[10px] font-medium">{isSaved && !hasUnsavedChanges ? '已存' : '保存'}</span>
        </Button>

        {/* 笔记按钮 */}
        {canViewPrivateNotes && (
          <Button 
            onClick={handleScrollToNotes} 
            variant="ghost"
            className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform h-auto p-0"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium">笔记</span>
          </Button>
        )}

        {/* 发布按钮 */}
        {showPublish && onPublish && (
          <Button 
            onClick={onPublish} 
            variant="ghost"
            className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform h-auto p-0" 
            disabled={saving}
          >
            <Send className="w-5 h-5" />
            <span className="text-[10px] font-medium">发布</span>
          </Button>
        )}

        {/* 分享按钮 */}
        <Button 
          onClick={handleShare} 
          variant="ghost"
          className="flex flex-col items-center gap-0.5 text-stone-500 active:scale-95 transition-transform h-auto p-0"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">分享</span>
        </Button>
      </div>

      {/* AI分析按钮 */}
      {onAiAnalyze && (
        <MobileAiButton 
          onClick={handleAiAnalyzeClick}
          aiSectionRef={aiSectionRef}
        />
      )}
    </div>
  )
}
