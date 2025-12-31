import { Skeleton } from '@/lib/components/ui/skeleton'

const styles = `
  .paper-texture {
    background-color: #f7f7f9;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
`

export default function CaseDetailSkeleton() {
  return (
    <>
      <style jsx global>{styles}</style>
      <div className="min-h-screen paper-texture font-sans text-stone-800 pb-20 lg:pb-8">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 h-14 flex items-center justify-between px-4 lg:px-8 shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-1 hidden sm:block" />
          <Skeleton className="h-4 w-48 sm:w-64" />
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-6 py-4 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* Main Card Skeleton */}
          <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-stone-100 overflow-hidden">
            <div className="p-4 sm:p-6 lg:p-12 space-y-6">
              {/* Header Meta */}
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-5 w-16 rounded-[2px]" />
                <Skeleton className="h-5 w-20 rounded-[2px]" />
                <Skeleton className="h-3 w-32 ml-2" />
              </div>

              {/* Title */}
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-2/3" />
              </div>

              {/* Background Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-[3px] h-3.5" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </div>

              {/* Divider */}
              <div className="flex justify-center">
                <Skeleton className="h-3 w-3 rounded-full" />
              </div>

              {/* Gua Panel Skeleton (Mobile) */}
              <div className="lg:hidden space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>

              {/* Analysis Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-[3px] h-3.5" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>

              {/* Result Section */}
              <div className="relative overflow-hidden rounded-xl p-6 sm:p-8 bg-stone-50">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <Skeleton className="h-3 w-24" />
                {/* Stamp placeholder */}
                <div className="absolute -right-6 -bottom-6 w-40 h-40">
                  <Skeleton className="w-full h-full rounded-full" />
                </div>
              </div>

              {/* Featured Comment Section */}
              <div className="space-y-4">
                <div className="w-full h-px bg-stone-200" />
                <div className="flex items-center gap-3">
                  <Skeleton className="w-1 h-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="bg-white border border-stone-200 rounded-lg p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              </div>

              {/* Footer Stats */}
              <div className="flex items-center justify-between pt-8 border-t border-stone-100">
                <div className="flex items-center gap-6">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>

          {/* Related Cases Skeleton */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-1 h-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-stone-200 rounded-lg p-4 space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Skeleton (Desktop) */}
        <div className="hidden lg:block lg:flex-[0_0_360px] w-full">
          <div className="sticky top-24 space-y-4">
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </main>
      </div>
    </>
  )
}
