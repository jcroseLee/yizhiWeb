'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/lib/components/ui/button'
import { type BaZiResult } from '@/lib/utils/bazi'
import { cn } from '@/lib/utils/cn'

// -----------------------------------------------------------------------------
// 类型定义
// -----------------------------------------------------------------------------

export interface BaZiPanelDualData {
  pillars: Array<{
    label: string
    gan: { char: string; wuxing: string }
    zhi: { char: string; wuxing: string }
    zhuXing?: string
    fuXing?: string[]
    cangGan?: Array<{ char: string; wuxing: string }>
    naYin?: string
    shenSha?: string[]
    xingYun?: string
    ziZuo?: string
    kongWang?: string
  }>
  basic?: BaZiResult['basic']
  fullResult?: BaZiResult
}

interface BaZiPanelDualProps {
  data: BaZiPanelDualData | null
  recordId?: string
}

// -----------------------------------------------------------------------------
// 样式定义
// -----------------------------------------------------------------------------

const BAZI_PANEL_STYLES = `
  .font-ganzhi {
    font-family: "Noto Serif SC", "Songti SC", serif;
  }
  
  .text-wood { color: #3A7B5E; }
  .text-fire { color: #C82E31; }
  .text-earth { color: #8D6E63; }
  .text-metal { color: #D4AF37; }
  .text-water { color: #4B7BB6; }
  
  .bazi-panel-grid {
    display: grid;
    grid-template-columns: 3.75rem repeat(4, 1fr);
    width: 100%;
  }
  .bazi-panel-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0.5rem 0.25rem;
  }
  .bazi-panel-header {
    font-size: 0.7rem;
    color: #a8a29e;
    font-weight: normal;
  }
`

// -----------------------------------------------------------------------------
// 辅助函数
// -----------------------------------------------------------------------------

const getWuxingColor = (wuxing: string) => {
  switch (wuxing) {
    case 'wood': return 'text-wood'
    case 'fire': return 'text-fire'
    case 'earth': return 'text-earth'
    case 'metal': return 'text-metal'
    case 'water': return 'text-water'
    default: return 'text-stone-700'
  }
}

// -----------------------------------------------------------------------------
// 主组件
// -----------------------------------------------------------------------------

export default function BaZiPanelDual({ data, recordId }: BaZiPanelDualProps) {
  const router = useRouter()

  if (!data || !data.pillars || data.pillars.length !== 4) {
    return null
  }

  const pillars = data.pillars
  const basic = data.basic || data.fullResult?.basic

  const handleViewDetail = () => {
    if (recordId) {
      router.push(`/tools/bazi/${recordId}?from=community`)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BAZI_PANEL_STYLES }} />
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden w-full">
        {/* 顶部：基本信息 */}
        {basic && (
          <div className="bg-linear-to-br from-stone-50 to-stone-100/50 border-b border-stone-100 relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-[#C82E31]/60 via-[#C82E31]/40 to-transparent"></div>
          </div>
        )}

        {/* 中部：八字排盘表格 */}
        <div className="p-3">
          {/* 表头 */}
          <div className="bazi-panel-grid bg-stone-50/50 border-b border-stone-100/50 py-2.5 mb-1">
            <div className="bazi-panel-cell bazi-panel-header font-serif text-[0.625rem]"></div>
            {pillars.map((p, i) => (
              <div key={i} className="bazi-panel-cell bazi-panel-header font-serif text-[0.625rem]">
                {p.label}
              </div>
            ))}
          </div>

          {/* 数据行 */}
          <div className="divide-y divide-stone-100/50 text-xs">
            {/* 1. 主星 */}
            {pillars[0]?.zhuXing && (
              <div className="bazi-panel-grid">
                <div className="bazi-panel-cell text-[0.625rem] text-stone-400">主星</div>
                {pillars.map((p, i) => (
                  <div key={i} className="bazi-panel-cell text-stone-600 font-medium text-[0.6875rem]">
                    {p.zhuXing || '--'}
                  </div>
                ))}
              </div>
            )}

            {/* 2. 天干 */}
            <div className="bazi-panel-grid bg-white">
              <div className="bazi-panel-cell text-[0.625rem] text-stone-400">天干</div>
              {pillars.map((p, i) => (
                <div key={i} className="bazi-panel-cell py-3 flex items-center justify-center">
                  <span className={cn(
                    "text-2xl font-bold font-ganzhi",
                    getWuxingColor(p.gan.wuxing)
                  )}>
                    {p.gan.char}
                  </span>
                </div>
              ))}
            </div>

            {/* 3. 地支 */}
            <div className="bazi-panel-grid bg-white border-t border-stone-100/50">
              <div className="bazi-panel-cell text-[0.625rem] text-stone-400">地支</div>
              {pillars.map((p, i) => (
                <div key={i} className="bazi-panel-cell py-3 flex items-center justify-center">
                  <span className={cn(
                    "text-2xl font-bold font-ganzhi",
                    getWuxingColor(p.zhi.wuxing)
                  )}>
                    {p.zhi.char}
                  </span>
                </div>
              ))}
            </div>

            {/* 4. 藏干 */}
            {pillars[0]?.cangGan && pillars[0].cangGan.length > 0 && (
              <div className="bazi-panel-grid border-t border-dashed border-stone-200/50">
                <div className="bazi-panel-cell text-[0.625rem] text-stone-400 pt-2 items-start">藏干</div>
                {pillars.map((p, i) => (
                  <div key={i} className="bazi-panel-cell flex-col gap-1 pt-2">
                    {p.cangGan?.map((cg, idx) => (
                      <div key={idx} className="flex gap-1 items-center justify-center">
                        <span className={cn(
                          "font-ganzhi font-medium text-[0.6875rem]",
                          getWuxingColor(cg.wuxing)
                        )}>
                          {cg.char}
                        </span>
                        {p.fuXing?.[idx] && (
                          <span className="text-[0.5625rem] text-stone-400 scale-90">{p.fuXing[idx]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* 5. 纳音 */}
            {pillars[0]?.naYin && (
              <div className="bazi-panel-grid">
                <div className="bazi-panel-cell text-[0.625rem] text-stone-400">纳音</div>
                {pillars.map((p, i) => (
                  <div key={i} className="bazi-panel-cell text-stone-600 text-[0.6875rem]">
                    {p.naYin || '--'}
                  </div>
                ))}
              </div>
            )}

            {/* 6. 行运 */}
            {pillars[0]?.xingYun && (
              <div className="bazi-panel-grid">
                <div className="bazi-panel-cell text-[0.625rem] text-stone-400">行运</div>
                {pillars.map((p, i) => (
                  <div key={i} className="bazi-panel-cell text-stone-600 text-[0.6875rem]">
                    {p.xingYun || '--'}
                  </div>
                ))}
              </div>
            )}

            {/* 7. 自坐 */}
            {pillars[0]?.ziZuo && (
              <div className="bazi-panel-grid">
                <div className="bazi-panel-cell text-[0.625rem] text-stone-400">自坐</div>
                {pillars.map((p, i) => (
                  <div key={i} className="bazi-panel-cell text-stone-600 text-[0.6875rem]">
                    {p.ziZuo || '--'}
                  </div>
                ))}
              </div>
            )}

            {/* 8. 空亡 */}
            {pillars[0]?.kongWang && (
              <div className="bazi-panel-grid">
                <div className="bazi-panel-cell text-[0.625rem] text-stone-400">空亡</div>
                {pillars.map((p, i) => (
                  <div key={i} className="bazi-panel-cell text-stone-600 text-[0.6875rem]">
                    {p.kongWang || '--'}
                  </div>
                ))}
              </div>
            )}

            {/* 9. 神煞 */}
            {pillars[0]?.shenSha && (
              <div className="bazi-panel-grid pb-3">
                <div className="bazi-panel-cell text-[0.625rem] text-stone-400 pt-2 items-start">神煞</div>
                {pillars.map((p, i) => (
                  <div key={i} className="bazi-panel-cell flex-col gap-1 pt-2">
                    {p.shenSha && p.shenSha.length > 0 ? (
                      p.shenSha.map((s, idx) => (
                        <span 
                          key={idx} 
                          className="text-[0.625rem] text-stone-500 bg-stone-100/50 px-1.5 py-0.5 rounded-full border border-stone-100 whitespace-nowrap"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-[0.5625rem] text-stone-400">--</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部：操作按钮 */}
        {recordId && (
          <div className="bg-stone-50 p-2 text-center border-t border-stone-100 group">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs h-9 text-stone-500 font-medium hover:text-[#C82E31] hover:bg-white transition-all gap-1"
              onClick={handleViewDetail}
            >
              查看排盘详解 <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
