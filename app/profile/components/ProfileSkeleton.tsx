import { Skeleton } from '@/lib/components/ui/skeleton'

export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen relative font-sans text-stone-800 pb-20">
      <div className="max-w-6xl mx-auto p-4 md:p-8 relative z-10">
        
        {/* 1. 顶部身份卡片骨架 */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm relative overflow-hidden mb-6 border border-stone-100">
          <div className="flex flex-col md:flex-row items-center p-8 gap-8 relative z-10">
            {/* 头像区 */}
            <div className="relative shrink-0">
              <Skeleton className="w-28 h-28 rounded-full" />
              <Skeleton className="absolute -bottom-2 -right-2 h-6 w-12 rounded-full" />
            </div>

            {/* 信息区 */}
            <div className="flex-1 text-center md:text-left space-y-3 w-full">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-lg" />
                <Skeleton className="h-4 w-3/4 max-w-md" />
              </div>

              {/* 等级进度条 */}
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200/60">
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="w-full h-1.5 rounded-full" />
                <div className="flex justify-between mt-1">
                  <Skeleton className="h-2.5 w-12" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>

              {/* 易币资产栏 */}
              <div className="flex items-center justify-center md:justify-start gap-6 mt-2 pt-4 border-t border-dashed border-gray-200/60">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </div>

            {/* 顶部操作按钮 */}
            <div className="absolute top-4 right-4">
              <Skeleton className="h-8 w-20 rounded" />
            </div>
          </div>
        </div>

        {/* 2. 学术看板骨架 (Grid Layout) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/80 rounded-lg shadow-sm border border-stone-100 p-5">
              <div className="flex flex-col items-center space-y-3">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>

        {/* 3. 修业日课骨架 (Activity Heatmap) */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-stone-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 49 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded" />
            ))}
          </div>
        </div>

        {/* 4. 内容选项卡骨架 */}
        <div className="w-full">
          {/* Tabs List */}
          <div className="flex gap-0 mb-6 border-b border-gray-200">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-24 rounded-none" />
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {/* 帖子列表头部 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>

            {/* 帖子卡片列表 */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/80 rounded-xl border border-stone-100 shadow-sm p-6">
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
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>

                  <div className="flex gap-6">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <Skeleton className="w-24 h-24 shrink-0 rounded-lg" />
                  </div>

                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-dashed border-stone-100">
                    <div className="flex gap-6">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

