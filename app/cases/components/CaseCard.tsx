'use client'

import BaZiThumbnail from '@/app/community/components/BaZiThumbnail'
import GuaBlock from '@/lib/components/GuaBlock'
import { cn } from '@/lib/utils/cn'
import { Eye, MessageSquare, Star } from 'lucide-react'
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
  hasBazi?: boolean
  baziPillars?: Array<{
    label: string
    gan: { char: string; wuxing: string }
    zhi: { char: string; wuxing: string }
  }>
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
        "border-[0.1875rem] border-double",
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
          <span className="text-[0.5625rem] sm:text-[0.625rem] font-serif tracking-widest opacity-80 whitespace-nowrap">
            易知案例
          </span>
          <span className="text-lg sm:text-xl font-black font-serif tracking-[0.15em] leading-none whitespace-nowrap">
            {config.label}
          </span>
          <span className="text-[0.4375rem] sm:text-[0.5rem] font-sans tracking-tight uppercase opacity-60 whitespace-nowrap">
            {config.subLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function CaseCard({ data, className }: CaseCardProps) {
  const router = useRouter()

  // 提取纯文本摘要
  const cleanBackground = data.background
    .replace(/<[^>]+>/g, '') // 去除HTML标签
    .replace(/卦理推演[\s\S]*/, '') // 去除推演部分
    .trim()

  return (
    <Link 
      href={`/cases/${data.id}`} 
      className={cn(
        "block group relative bg-white rounded-xl border border-stone-200/60 overflow-hidden transition-all duration-300",
        "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-stone-300",
        className
      )}
    >
      {/* 印章 */}
      <CaseStamp feedback={data.feedback} />

      <div className="p-5 sm:p-6 flex gap-6">
        
        {/* 左侧：排盘缩略图 (视觉锚点) - 桌面端显示 */}
        <div className="shrink-0 hidden sm:block pt-1">
          <div className="w-[100px] h-[100px] bg-stone-50 rounded-lg border border-stone-100 flex items-center justify-center relative overflow-hidden group-hover:border-stone-200 transition-colors">
            {/* 放大一点显示，增加视觉冲击力 */}
            <div className="scale-90 origin-center opacity-90 group-hover:opacity-100 transition-opacity">
              {data.hasBazi && data.baziPillars ? (
                <BaZiThumbnail pillars={data.baziPillars} />
              ) : (
                <GuaBlock name={data.guaName} lines={data.lines} changingLines={data.changingLines} />
              )}
            </div>
            {/* 类型角标 */}
            {/* <div className="absolute bottom-0 right-0 px-1.5 py-0.5 bg-stone-100/90 text-[9px] text-stone-500 rounded-tl-md font-mono">
              {data.hasBazi ? '八字' : '六爻'}
            </div> */}
          </div>
        </div>

        {/* 右侧：内容流 */}
        <div className="flex-1 min-w-0 flex flex-col relative z-10">
          
          {/* Header: User & Time */}
          <div className="flex items-center justify-between mb-2 text-xs text-stone-400">
            <div 
              className="flex items-center gap-2 hover:text-stone-600 transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (data.author.id) router.push(`/u/${data.author.id}`)
              }}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-stone-100 border border-stone-200">
                {data.author.avatar 
                  ? <img src={data.author.avatar} alt="" className="w-full h-full object-cover" /> 
                  : <div className="w-full h-full flex items-center justify-center text-[9px]">{data.author.name[0]}</div>
                }
              </div>
              <span>{data.author.name}</span>
            </div>
            <span>{data.publishTime}</span>
          </div>

          {/* Title */}
          <h3 className="text-lg sm:text-xl font-bold font-serif text-stone-900 mb-2 leading-snug group-hover:text-[#C82E31] transition-colors line-clamp-1">
            {data.question}
          </h3>

          {/* Excerpt */}
          <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 mb-4 h-10">
            {cleanBackground || '暂无背景描述...'}
          </p>

          {/* Footer: Tags & Stats */}
          <div className="mt-auto flex items-center justify-between">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 overflow-hidden h-6">
              {data.tags.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 bg-stone-50 text-stone-500 rounded-full border border-stone-100 group-hover:border-stone-200 transition-colors">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-stone-400 group-hover:text-stone-500 transition-colors">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{data.stats.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{data.stats.comments}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5" />
                <span>{data.stats.favorites}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 移动端排盘缩略图 */}
      <div className="sm:hidden px-5 pb-5">
         <div className="bg-stone-50 rounded p-2 flex justify-center border border-stone-100">
            <div className="scale-75 origin-center">
              {data.hasBazi && data.baziPillars ? (
                <BaZiThumbnail pillars={data.baziPillars} />
              ) : (
                <GuaBlock name={data.guaName} lines={data.lines} changingLines={data.changingLines} />
              )}
            </div>
         </div>
      </div>
      
    </Link>
  )
}
