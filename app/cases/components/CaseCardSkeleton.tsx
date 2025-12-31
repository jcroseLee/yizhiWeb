import { Skeleton } from '@/lib/components/ui/skeleton'

export default function CaseCardSkeleton() {
  return (
    <div className="bg-white border border-ink-200/50 rounded-xl p-4 lg:p-7 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 lg:mb-4 pb-2 lg:pb-3 border-b border-ink-200/40">
        <div className="flex items-center gap-2 lg:gap-2.5">
          <Skeleton className="w-8 h-8 lg:w-9 lg:h-9 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-10 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded" />
      </div>

      {/* Content */}
      <div className="flex gap-4 lg:gap-6">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-6 w-3/4 mb-3" />
          <div className="space-y-2 mb-3 lg:mb-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        </div>

        {/* Gua Graphic Placeholder */}
        <div className="shrink-0 flex flex-col items-center gap-2 pt-1">
          <Skeleton className="w-10 lg:w-12 h-16" />
          <Skeleton className="w-4 h-12" />
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-dashed border-ink-100">
         <Skeleton className="h-3 w-24" />
         <div className="flex gap-4">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
         </div>
      </div>
    </div>
  )
}
