'use client'

import { Button } from '@/lib/components/ui/button'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

// -----------------------------------------------------------------------------
// 类型定义
// -----------------------------------------------------------------------------
export interface DivinationInfo {
  date: string
  time: string
  method: string
  kongWang: string
}

export interface GuaLine {
  position: number
  yinYang: 'yin' | 'yang'
  liuqin: string
  ganzhi: string
  liushou: string
  active: boolean
  subject: boolean
  object: boolean
  change?: { liuqin: string; ganzhi: string }
}

export interface Gua {
  name: string
  type: string
  lines: GuaLine[]
}

// -----------------------------------------------------------------------------
// 组件：卦象侧边栏 (Gua Panel) - 视觉升级版
// -----------------------------------------------------------------------------
interface GuaPanelProps {
  info: DivinationInfo
  gua: Gua
  recordId?: string | null
}

export default function GuaPanel({ info, gua, recordId }: GuaPanelProps) {
  return (
    <div className="bg-white border border-stone-200 shadow-sm rounded-xl overflow-hidden relative group">
      {/* 顶部信息 */}
      <div className="bg-stone-50/80 border-b border-stone-100 p-4 text-xs text-stone-500 flex justify-between items-center backdrop-blur-sm">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-stone-700">{info.date}</span>
          <span>{info.method} · 占事</span>
        </div>
        <div className="text-right">
          <div className="font-medium text-stone-700">{info.time}</div>
          <span>空亡：{info.kongWang}</span>
        </div>
      </div>

      {/* 卦象主体 */}
      <div className="p-5 relative min-h-[280px]">
        {/* 背景大水印 - 增强版 */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none select-none">
          <div 
            className="text-8xl font-black text-stone-900 leading-none tracking-widest"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'upright',
              fontFamily: '"Noto Serif SC", "Songti SC", serif'
            }}
          >
            {gua.name.split('').slice(0, 2).join('')}
          </div>
        </div>

        {/* 爻线列表 */}
        <div className="space-y-4 relative z-10">
          {gua.lines.map((line, idx) => {
            const isActive = line.active
            
            return (
              <div key={idx} className="flex items-center h-5 text-xs">
                {/* 六兽 */}
                <span className="text-stone-400 w-8 text-right mr-3 scale-90">{line.liushou}</span>
                
                {/* 爻画 */}
                <div className="w-16 mr-3 flex justify-between items-center relative">
                  {line.yinYang === 'yang' ? (
                    <div className={`w-full h-1.5 rounded-sm ${isActive ? 'bg-[#C82E31]' : 'bg-stone-700'}`}></div>
                  ) : (
                    <>
                      <div className={`w-[45%] h-1.5 rounded-sm ${isActive ? 'bg-[#C82E31]' : 'bg-stone-700'}`}></div>
                      <div className={`w-[45%] h-1.5 rounded-sm ${isActive ? 'bg-[#C82E31]' : 'bg-stone-700'}`}></div>
                    </>
                  )}
                  {/* 动爻标记 */}
                  {isActive && (
                    <div className="absolute -right-2 w-1.5 h-1.5 rounded-full border border-[#C82E31] bg-white"></div>
                  )}
                </div>
                
                {/* 六亲与干支 */}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className={`${isActive ? 'text-[#C82E31] font-bold' : 'text-stone-700'}`}>
                    {line.liuqin} {line.ganzhi}
                  </span>
                  {/* 世应标记 */}
                  {line.subject && (
                    <span className="text-[10px] px-1 rounded bg-stone-800 text-white">
                      世
                    </span>
                  )}
                  {line.object && (
                    <span className="text-[10px] px-1 rounded bg-stone-200 text-stone-600">
                      应
                    </span>
                  )}
                  {/* 变爻 */}
                  {line.change && (
                    <span className="text-stone-400 scale-90 ml-1">→ {line.change.liuqin} {line.change.ganzhi}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      <div className="border-t border-stone-100 p-3 text-center">
        {recordId ? (
          <Link href={`/6yao/${recordId}`}>
            <Button 
              variant="ghost" 
              className="text-xs font-medium text-stone-500 hover:text-[#C82E31] w-full"
            >
              查看完整排盘 <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        ) : (
          <Button 
            variant="ghost" 
            className="text-xs font-medium text-stone-500 hover:text-[#C82E31] w-full"
            disabled
          >
            查看完整排盘 <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

