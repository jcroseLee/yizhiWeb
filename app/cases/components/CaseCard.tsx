'use client'

import GuaBlock from '@/lib/components/GuaBlock'
import { Card, CardContent } from '@/lib/components/ui/card'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Author {
  id?: string
  name: string
  avatar: string
  level: number
  isVerified: boolean
}

interface CaseStats {
  views: number
  comments: number
  favorites: number
}

export interface CaseItem {
  id: string
  question: string
  background: string
  tags: string[]
  guaName: string
  author: Author
  feedback: {
    status: 'verified' | 'pending'
    accuracy?: 'accurate' | 'inaccurate' | 'partial'
    text: string
  }
  stats: CaseStats
  publishTime: string
  lines: boolean[]
  changingLines: number[]
}

interface CaseCardProps {
  data: CaseItem
  className?: string
}

function CaseStamp({ feedback }: { feedback: CaseItem['feedback'] }) {
  if (!feedback) return null

  // 定义样式配置
  const styles = {
    accurate: {
      border: 'border-[#2E7D63]/40',
      text: 'text-[#2E7D63]/40',
      label: '准确',
      subLabel: 'ACCURATE'
    },
    partial: {
      border: 'border-[#A16207]/40',
      text: 'text-[#A16207]/40',
      label: '半准',
      subLabel: 'PARTIAL'
    },
    inaccurate: {
      border: 'border-[#B91C1C]/40',
      text: 'text-[#B91C1C]/40',
      label: '不准',
      subLabel: 'WRONG'
    },
    pending: {
      border: 'border-stone-400/40',
      text: 'text-stone-400/40',
      label: '待验',
      subLabel: 'PENDING'
    }
  }

  const config = feedback.status === 'pending' 
    ? styles.pending 
    : (feedback.accuracy && styles[feedback.accuracy]) || styles.pending

  return (
    <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-2 pointer-events-none select-none">
      <div className={cn(
        "relative flex items-center justify-center",
        "w-20 h-20 sm:w-24 sm:h-24 rounded-full",
        "border-[3px] border-double",
        config.border,
        config.text,
        "transform -rotate-15",
        "mix-blend-multiply transition-all duration-500",
        "group-hover:scale-105"
      )}>
        {/* 内圈装饰线 */}
        <div className="absolute inset-1.5 rounded-full border border-current opacity-50"></div>
        
        {/* 文本内容 */}
        <div className="flex flex-col items-center justify-center gap-0.5 z-10 relative">
          <span className="text-[9px] sm:text-[10px] font-serif tracking-widest opacity-80 whitespace-nowrap">
            易知案例
          </span>
          <span className="text-lg sm:text-xl font-black font-serif tracking-[0.15em] leading-none whitespace-nowrap">
            {config.label}
          </span>
          <span className="text-[7px] sm:text-[8px] font-sans tracking-tight uppercase opacity-60 whitespace-nowrap">
            {config.subLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function CaseCard({ data, className }: CaseCardProps) {
  const router = useRouter()

  return (
    <Link href={`/cases/${data.id}`} className={cn('block group', className)}>
      <Card className="bg-white border border-ink-200/50 card-shadow active:scale-[0.99] transition-transform duration-200 lg:hover:shadow-lg lg:hover:border-ink-300/60 cursor-pointer relative overflow-hidden">
        {/* 印章 */}
        <CaseStamp feedback={data.feedback} />
        
        <CardContent className="p-4 lg:p-7">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 lg:mb-4 pb-2 lg:pb-3 border-b border-ink-200/40">
            <div className="flex items-center gap-2 lg:gap-2.5">
              <div 
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-ink-200 to-ink-300 flex items-center justify-center text-xs lg:text-sm text-ink-700 font-medium shadow-sm overflow-hidden"
                onClick={(e) => {
                  if (data.author.id) {
                    e.preventDefault()
                    e.stopPropagation()
                    router.push(`/u/${data.author.id}`)
                  }
                }}
              >
                {data.author.avatar ? <img src={data.author.avatar} alt="" className="w-full h-full object-cover" /> : data.author.name.charAt(0)}
              </div>
              <div className="flex items-center gap-1.5 text-xs lg:text-sm">
                <span className="font-medium text-ink-800">{data.author.name}</span>
                <span className="text-ink-400">·</span>
                <span className="text-ink-500 scale-90 lg:scale-100 origin-left">LV.{data.author.level}</span>
                {data.author.isVerified && (
                  <>
                    <span className="text-ink-400 hidden lg:inline">·</span>
                    <span className="font-medium text-[#C82E31] scale-90 lg:scale-100 origin-left hidden lg:inline">认证卦师</span>
                    <span className="lg:hidden text-[#C82E31] scale-75 origin-left border border-[#C82E31] px-1 rounded ml-1">V</span>
                  </>
                )}
              </div>
            </div>
            {/* Old stamp placeholder was here */}
          </div>

          {/* Content */}
          <div className="flex gap-3 lg:gap-5">
            {/* Left: Gua */}
            <div className="shrink-0 pt-1">
              <div className="scale-90 origin-top-left lg:scale-100">
                <GuaBlock name={data.guaName} lines={data.lines} changingLines={data.changingLines} />
              </div>
            </div>

            {/* Right: Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg lg:text-2xl font-serif font-bold text-ink-900 mb-2 lg:mb-3 leading-snug line-clamp-2">
                <span className="text-[#C82E31] mr-1">求测：</span>{data.question}
              </h3>
              <p className="text-xs lg:text-sm text-[#666] mb-3 lg:mb-4 line-clamp-2 leading-relaxed">
                {data.background.includes('卦理推演') 
                  ? data.background.split('卦理推演')[0] 
                  : data.background}
              </p>
              <div className="flex flex-wrap gap-1.5 lg:gap-2 mb-2 lg:mb-4">
                {data.tags.map((tag: string, idx: number) => (
                  <span key={idx} className="text-[10px] lg:text-xs text-[#666] bg-gray-50 px-1.5 py-0.5 lg:px-2 lg:py-0.5 rounded border border-gray-100">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 lg:mt-4 pt-2 lg:pt-3 border-t border-ink-200/40 text-[10px] lg:text-xs text-ink-500">
            <div className="flex items-center gap-3 lg:gap-5">
              <span>{data.stats.views} 浏览</span>
              <span>{data.stats.comments} 断语</span>
              <span className="hidden lg:inline">{data.stats.favorites} 收藏</span>
            </div>
            <span className="text-ink-400">{data.publishTime}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
