'use client'

import { Skeleton } from '@/lib/components/ui/skeleton'

/**
 * 帖子卡片骨架屏组件
 * 匹配 PostCard 的结构和布局
 */
export default function PostCardSkeleton() {
  return (
    <div className="bg-white p-6 pb-3 rounded-xl border border-stone-100 shadow-sm relative overflow-hidden">
      {/* 顶部彩色条 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-stone-200" />
      
      <div className="relative z-10">
        {/* Author Info */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          {/* 右上角状态胶囊（可选） */}
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Content Body */}
        <div className="flex gap-6">
          <div className="flex-1">
            {/* 标题 */}
            <Skeleton className="h-6 w-3/4 mb-2" />
            {/* 摘要 */}
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            {/* 标签 */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          </div>

          {/* 卦象展示区（可选） */}
          <div className="w-24 h-24 shrink-0">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-5 pt-3 border-t border-dashed border-stone-100">
          <div className="flex gap-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      </div>
    </div>
  )
}

