'use client'

import { Button } from '@/lib/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { BookOpen, RotateCcw, Save, Send, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type RefObject } from 'react'

// IconAISparkle 组件定义（复用6yao的样式）
const IconAISparkle = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    style={{ filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.8))' }}
  >
    <path 
      d="M3.5 20L8.5 6L13.5 20" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M18.5 6V20" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M8.5 13.5L9.5 11.5L11.5 11L9.5 10.5L8.5 8.5L7.5 10.5L5.5 11L7.5 11.5L8.5 13.5Z" 
      fill="currentColor" 
      stroke="none"
    />
  </svg>
)

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

      {/* AI分析按钮 - 统一使用6yao的AI按钮样式 */}
      {onAiAnalyze && (
        <div className="relative shrink-0 group" onClick={onAiAnalyze}>
          {/* 1. 动态流光光晕 (底层) */}
          <div className="mobile-ai-border opacity-80 group-active:opacity-100 transition-opacity" />

          {/* 2. 按钮主体 */}
          <Button 
            className="relative z-10 w-12 h-12 rounded-full p-0 border-none overflow-hidden shadow-xl transition-transform active:scale-95 flex items-center justify-center bg-[#1a1a1a]"
            title="AI 智能详批"
          >
            {/* A. 内部深色背景 + 噪点纹理 */}
            <div className="absolute inset-0 bg-[#1a1a1a]">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 mix-blend-overlay" />
            </div>

            {/* B. 内部呼吸红光 (模拟核心能量) */}
            <div className="absolute inset-0 rounded-full mobile-ai-inner-pulse" />
            
            {/* C. 顶部高光反射 (增加立体感，像玻璃球) */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

            {/* D. 图标 (使用白色，保持高对比度) */}
            <IconAISparkle className="w-10 h-10 text-white relative z-20 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
          </Button>
          
          {/* 3. 悬浮提示红点 (可选，用于提示新功能) */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#C82E31] border-2 border-white rounded-full z-20 animate-pulse" />
        </div>
      )}
      
      <style jsx global>{`
        /* AI按钮动画样式 */
        @keyframes mobile-ai-border-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(200, 46, 49, 0.3),
                        0 0 40px rgba(200, 46, 49, 0.2),
                        0 0 60px rgba(200, 46, 49, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(200, 46, 49, 0.5),
                        0 0 60px rgba(200, 46, 49, 0.3),
                        0 0 90px rgba(200, 46, 49, 0.2);
          }
        }
        
        @keyframes mobile-ai-inner-pulse {
          0%, 100% {
            background: radial-gradient(circle at center, rgba(200, 46, 49, 0.3) 0%, transparent 70%);
            opacity: 0.6;
          }
          50% {
            background: radial-gradient(circle at center, rgba(200, 46, 49, 0.5) 0%, transparent 70%);
            opacity: 0.8;
          }
        }
        
        .mobile-ai-border {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: transparent;
          animation: mobile-ai-border-glow 3s ease-in-out infinite;
          pointer-events: none;
        }
        
        .mobile-ai-inner-pulse {
          animation: mobile-ai-inner-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
