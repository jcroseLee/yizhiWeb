'use client'

import { Card, CardContent } from '@/lib/components/ui/card'
import { type BaZiPillar } from '@/lib/utils/bazi'
import { cn } from '@/lib/utils/cn'
import { EarthIcon, FireIcon, MetalIcon, WaterIcon, WoodIcon } from '../bazi/components/WuxingIcons'

// 样式定义
const BAZI_CHART_STYLES = `
  .font-ganzhi {
    font-family: "Noto Serif SC", "Songti SC", serif;
  }
  
  .text-wood { color: #3A7B5E; }
  .text-fire { color: #C82E31; }
  .text-earth { color: #8D6E63; }
  .text-metal { color: #D4AF37; }
  .text-water { color: #4B7BB6; }
  
  .bazi-grid {
    display: grid;
    grid-template-columns: 80px repeat(4, 1fr);
    width: 100%;
  }
  .bazi-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0.75rem 0.25rem;
  }
  .bazi-header {
    font-size: 0.75rem;
    color: #a8a29e;
    font-weight: normal;
  }
  
  .row-zebra:nth-child(even) {
    background-color: rgba(28, 25, 23, 0.02);
  }
  
  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.03);
  }
`

// 辅助函数
const getTextColor = (wuxing?: string) => {
  if (!wuxing) return 'text-stone-500'
  switch (wuxing) {
    case 'wood': return 'text-wood'
    case 'fire': return 'text-fire'
    case 'earth': return 'text-earth'
    case 'metal': return 'text-metal'
    case 'water': return 'text-water'
    default: return 'text-stone-800'
  }
}

const WuxingIcon = ({ wuxing }: { wuxing: string }) => {
  const iconClass = "w-4 h-4 ml-2 inline-block align-middle"
  
  switch (wuxing) {
    case 'metal':
      return <MetalIcon className={cn(iconClass, "text-metal")} />
    case 'wood':
      return <WoodIcon className={cn(iconClass, "text-wood")} />
    case 'water':
      return <WaterIcon className={cn(iconClass, "text-water")} />
    case 'fire':
      return <FireIcon className={cn(iconClass, "text-fire")} />
    case 'earth':
      return <EarthIcon className={cn(iconClass, "text-earth")} />
    default:
      return null
  }
}

interface BaZiChartProps {
  pillars: BaZiPillar[]
}

export function BaZiChart({ pillars }: BaZiChartProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BAZI_CHART_STYLES }} />
      <Card className="glass-panel rounded-2xl overflow-hidden shadow-lg">
        <CardContent className="p-0">
        {/* 表头 */}
        <div className="bazi-grid bg-stone-50/50 border-b border-stone-100/50 py-3">
          <div className="bazi-cell bazi-header font-serif"></div>
          {pillars.map((p, i) => (
            <div key={i} className="bazi-cell bazi-header font-serif">{p.label}</div>
          ))}
        </div>

        {/* 数据行 */}
        <div className="divide-y divide-stone-100/50 text-sm">
          {/* 1. 主星 */}
          <div className="bazi-grid row-zebra">
            <div className="bazi-cell text-xs text-stone-400">主星</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell text-stone-500 font-medium">{p.zhuXing}</div>
            ))}
          </div>

          {/* 2. 天干 (Highlight) */}
          <div className="bazi-grid bg-white">
            <div className="bazi-cell text-xs text-stone-400">天干</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell py-5 flex items-center justify-center">
                <span className={`text-4xl font-bold font-ganzhi ${getTextColor(p.gan.wuxing)}`}>{p.gan.char}</span>
                <WuxingIcon wuxing={p.gan.wuxing} />
              </div>
            ))}
          </div>

          {/* 3. 地支 (Highlight) */}
          <div className="bazi-grid bg-white border-t border-stone-100/50">
            <div className="bazi-cell text-xs text-stone-400">地支</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell py-5 flex items-center justify-center">
                <span className={`text-4xl font-bold font-ganzhi ${getTextColor(p.zhi.wuxing)}`}>{p.zhi.char}</span>
                <WuxingIcon wuxing={p.zhi.wuxing} />
              </div>
            ))}
          </div>

          {/* 4. 藏干 */}
          <div className="bazi-grid row-zebra border-t border-dashed border-stone-200/50">
            <div className="bazi-cell text-xs text-stone-400 pt-3 items-start">藏干</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell flex-col gap-1.5 pt-3">
                {p.cangGan.map((cg, idx) => (
                  <div key={idx} className="flex gap-1 items-center justify-center">
                    <span className={`${getTextColor(cg.wuxing)} font-ganzhi font-medium`}>{cg.char}</span>
                    <span className="text-[11px] text-stone-400 scale-90">{p.fuXing[idx] || ''}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 5. 副星 */}
          <div className="bazi-grid row-zebra">
            <div className="bazi-cell text-xs text-stone-400 pt-3 items-start">副星</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell flex-col gap-1 text-xs text-stone-500 pt-3">
                {p.fuXing.map((s, idx) => <div key={idx}>{s}</div>)}
              </div>
            ))}
          </div>

          {/* 6. 纳音 */}
          <div className="bazi-grid row-zebra">
            <div className="bazi-cell text-xs text-stone-400">纳音</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell text-stone-600">{p.naYin}</div>
            ))}
          </div>

          {/* 7. 行运 */}
          <div className="bazi-grid row-zebra">
            <div className="bazi-cell text-xs text-stone-400">行运</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell text-stone-600">{p.xingYun}</div>
            ))}
          </div>

          {/* 8. 自坐 */}
          <div className="bazi-grid row-zebra">
            <div className="bazi-cell text-xs text-stone-400">自坐</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell text-stone-600">{p.ziZuo}</div>
            ))}
          </div>

          {/* 9. 空亡 */}
          <div className="bazi-grid row-zebra">
            <div className="bazi-cell text-xs text-stone-400">空亡</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell text-stone-600">{p.kongWang}</div>
            ))}
          </div>

          {/* 10. 神煞 */}
          <div className="bazi-grid pb-4">
            <div className="bazi-cell text-xs text-stone-400 pt-3 items-start">神煞</div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-cell flex-col gap-1.5 pt-3">
                {p.shenSha.length > 0 ? (
                  p.shenSha.map((s, idx) => (
                    <span key={idx} className="text-[12px] text-stone-500 bg-stone-100/50 px-2 py-0.5 rounded-full border border-stone-100 whitespace-nowrap">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-stone-400">--</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  )
}
