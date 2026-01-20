import { Badge } from '@/lib/components/ui/badge'
import { Button } from '@/lib/components/ui/button'

type BookCoverProps = {
  id: string
  title: string
  author: string
  dynasty: string
  color: string
  volumeType: 'none' | 'upper' | 'lower' | null
  isManuallyReviewed: boolean
  onClick: () => void
}

const splitTitleIntoTwoLines = (title: string): [string, string] => {
  const chars = title.split('')
  const maxCharsPerLine = 5
  
  if (chars.length <= maxCharsPerLine) {
    return [title, '']
  }
  
  const firstLine = chars.slice(0, maxCharsPerLine).join('')
  const secondLine = chars.slice(maxCharsPerLine, maxCharsPerLine * 2).join('')
  return [firstLine, secondLine]
}

export function BookCover({
  id,
  title,
  author,
  dynasty,
  color,
  volumeType,
  isManuallyReviewed,
  onClick,
}: BookCoverProps) {
  return (
    <>
      {/* 书籍拟物化主体 */}
      <div
        className="relative w-full aspect-2/3 cursor-pointer transition-all duration-300 group-hover:-translate-y-2"
        onClick={onClick}
      >
        {/* 阴影层 - Hover时加深 */}
        <div className="absolute top-2 left-2 w-full h-full bg-slate-200 rounded-sm -z-10 transition-all duration-300 group-hover:top-3 group-hover:left-3 group-hover:bg-slate-300" />

        {/* 封面主体 */}
        <div
          className={`${color} w-full h-full rounded-sm border border-stone-200/60 shadow-sm overflow-hidden relative flex flex-col`}
        >
          {/* 左侧装订区 */}
          <div className="absolute left-0 top-0 bottom-0 w-[0.875rem] bg-black/5 border-r border-black/5 z-10 flex flex-col justify-around py-4 items-center">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full h-px bg-stone-400/40" />
            ))}
          </div>

          {/* 精校徽章 */}
          {isManuallyReviewed && (
            <div className="absolute top-2 right-2">
              <Badge
                variant="secondary"
                className="text-[0.625rem] h-5 bg-white/60 backdrop-blur-sm border-stone-200 text-stone-500 px-1.5 shadow-none"
              >
                精校
              </Badge>
            </div>
          )}

          {/* 封面内容 */}
          <div className="flex-1 flex items-center justify-center pl-4 relative">
            <div className="bg-white/50 border border-stone-800/20 px-3 py-6 min-h-[60%] flex items-center justify-center shadow-inner relative">
              <div className="flex flex-row-reverse items-start gap-1">
                {(() => {
                  const [firstLine, secondLine] = splitTitleIntoTwoLines(title)
                  const hasTwoLines = !!secondLine
                  const fontSizeClass = hasTwoLines 
                    ? 'text-base md:text-lg' 
                    : 'text-lg md:text-xl'
                  return (
                    <>
                      <h3
                        className={`font-serif ${fontSizeClass} font-bold text-slate-900 tracking-[0.2em] leading-relaxed`}
                        style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                      >
                        {firstLine}
                      </h3>
                      {secondLine && (
                        <h3
                          className={`font-serif ${fontSizeClass} font-bold text-slate-900 tracking-[0.2em] leading-relaxed`}
                          style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                        >
                          {secondLine}
                        </h3>
                      )}
                    </>
                  )
                })()}
              </div>
              {/* 上下册标识 - 在框外面，与title外框底部对齐 */}
              {(() => {
                const hasVolume = volumeType === 'upper' || volumeType === 'lower'
                const volumeLabel = volumeType === 'upper' ? '上册' : volumeType === 'lower' ? '下册' : ''
                return hasVolume ? (
                  <div
                    className="absolute -left-8 bottom-0 font-serif text-xs font-bold text-slate-600 tracking-[0.1em]"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                  >
                    {volumeLabel}
                  </div>
                ) : null
              })()}
            </div>
          </div>

          {/* 底部朝代/作者 (封面内) */}
          <div className="absolute bottom-3 right-3 text-[0.625rem] text-stone-500 font-serif flex flex-col items-end gap-0.5 opacity-60">
            <span>{dynasty}</span>
            <span>{author}</span>
          </div>
        </div>

        {/* Hover Overlay: 快速操作 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pl-4">
          <Button
            size="sm"
            className="bg-[#C82E31] text-white hover:bg-[#a61b1f] shadow-lg scale-90 group-hover:scale-100 transition-transform"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            立即阅读
          </Button>
        </div>
      </div>
    </>
  )
}
