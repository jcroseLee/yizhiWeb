import { Skeleton } from '@/lib/components/ui/skeleton'

export default function PostDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#f9f8f6] pb-20">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 h-14 flex items-center justify-between px-4 lg:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* Post Card Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="p-6 lg:p-8 space-y-6">
              {/* Author Info */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>

              {/* Content */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-stone-100">
                <div className="flex gap-4">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          </div>

          {/* Comments Section Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>

            <div className="space-y-6">
              {/* Comment Items */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="mt-8 pt-6 border-t border-stone-100">
              <div className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full hidden md:block" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <div className="flex justify-end">
                    <Skeleton className="h-8 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Skeleton */}
        <aside className="w-full lg:w-[340px] shrink-0 space-y-6 lg:sticky lg:top-24">
          {/* Author Card */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 py-3 bg-stone-50 rounded-lg">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center space-y-1">
                  <Skeleton className="h-5 w-8 mx-auto" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Gua Panel Skeleton */}
          <div className="bg-white rounded-xl border border-stone-100 p-5 shadow-sm">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-32 w-full rounded" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl border border-stone-100 p-5 shadow-sm">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

