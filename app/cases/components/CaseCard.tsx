'use client'

import GuaBlock from '@/lib/components/GuaBlock'
import { Card, CardContent } from '@/lib/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { Eye, MessageCircle, Star } from 'lucide-react'
import Link from 'next/link'

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
  id: number
  question: string
  background: string
  tags: string[]
  guaName: string
  author: Author
  feedback: { 
    status: 'verified' | 'pending'
    accuracy?: 'accurate' | 'inaccurate'
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

export default function CaseCard({ data, className }: CaseCardProps) {
  return (
    <Link href={`/cases/${data.id}`} className={cn('block group', className)}>
        <Card className="bg-white border border-ink-200/50 card-shadow hover:shadow-lg transition-all duration-300 hover:border-ink-300/60 cursor-pointer">
        <CardContent className="p-6 lg:p-7">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-ink-200/40">
            <div className="flex items-center gap-2.5">
              {data.author.id ? (
                <Link href={`/u/${data.author.id}`} className="flex items-center gap-2.5 group/author">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ink-200 to-ink-300 flex items-center justify-center text-sm text-ink-700 font-medium shadow-sm overflow-hidden group-hover/author:ring-2 group-hover/author:ring-[#C82E31]/20 transition-all">
                    {data.author.avatar ? (
                      <img src={data.author.avatar} alt={data.author.name} className="w-full h-full object-cover" />
                    ) : (
                      data.author.name.charAt(0)
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-medium text-ink-800 group-hover/author:text-[#C82E31] transition-colors">{data.author.name}</span>
                    <span className="text-ink-400">·</span>
                    <span className="text-ink-500">LV.{data.author.level}</span>
                    {data.author.isVerified && (
                      <>
                        <span className="text-ink-400">·</span>
                        <span className="font-medium text-[#C82E31]">认证卦师</span>
                      </>
                    )}
                  </div>
                </Link>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ink-200 to-ink-300 flex items-center justify-center text-sm text-ink-700 font-medium shadow-sm overflow-hidden">
                    {data.author.avatar ? (
                      <img src={data.author.avatar} alt={data.author.name} className="w-full h-full object-cover" />
                    ) : (
                      data.author.name.charAt(0)
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-medium text-ink-800">{data.author.name}</span>
                    <span className="text-ink-400">·</span>
                    <span className="text-ink-500">LV.{data.author.level}</span>
                    {data.author.isVerified && (
                      <>
                        <span className="text-ink-400">·</span>
                        <span className="font-medium text-[#C82E31]">认证卦师</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className={`seal-stamp ${data.feedback.status === 'pending' ? 'seal-stamp-pending' : ''}`}>
              {data.feedback.text}
            </div>
          </div>

          <div className="flex gap-5">
            {/* 左侧：卦象与竖排文字 - 使用统一的 GuaBlock 组件 */}
            {data.guaName && (
              <GuaBlock 
                name={data.guaName}
                lines={data.lines}
                changingLines={data.changingLines}
              />
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-serif font-bold text-ink-900 mb-3 leading-tight">
                求测：{data.question}
              </h3>
              <p className="text-sm text-[#666] mb-4 line-clamp-2 leading-relaxed">
                [背景] {data.background}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {data.tags.map((tag, idx) => (
                  <span key={idx} className="text-xs text-[#666] bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                    <span className="text-[#C82E31] mr-0.5">#</span>{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-200/40 text-xs text-ink-500">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {data.stats.views}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {data.stats.comments}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4" />
                {data.stats.favorites}
              </span>
            </div>
            <span className="text-ink-400">{data.publishTime}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

