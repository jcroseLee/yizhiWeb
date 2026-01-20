'use client'

import { ArrowRight, MoveRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/lib/components/ui/button'

// -----------------------------------------------------------------------------
// 类型定义 (保持不变)
// -----------------------------------------------------------------------------

export interface GuaLineDetail {
  index: number           
  type: 0 | 1 | 2 | 3     
  liuQin: string          
  ganZhi: string          
  wuXing: string          
  liuShou: string         
  isShi: boolean          
  isYing: boolean         
  isMoving: boolean       // 是否为动爻
  fuShen?: string         // 伏神（如果有）
}

export interface FullGuaData {
  dateStr: string        // 公历时间
  lunarYear: string      // 农历年 (如: 乙巳年)
  lunarDateStr: string   // 农历日期 (如: 十月二十)
  lunarHour: string      // 时辰 (如: 未时)
  solarTerm: string      // 节气 (如: 大雪)
  fourPillars: {          
    year: string
    month: string
    day: string
    hour: string
  }
  kongWang: string        
  originalName: string    
  originalGong: string    
  changedName?: string    
  changedGong?: string    
  fuShenMap?: Record<number, string>  // 伏神映射：爻位索引 -> 伏神字符串
  guaShen?: string        // 卦身（如果有）
  guaShenLineIndex?: number | null  // 卦身所在爻位索引
  lines: {
    original: GuaLineDetail
    changed?: {           
      type: 0 | 1
      liuQin: string
      ganZhi: string
      wuXing: string
    }
  }[]
}

// -----------------------------------------------------------------------------
// 子组件：四柱展示块 (优化样式)
// -----------------------------------------------------------------------------
const PillarBlock = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col items-center">
    <div className="w-9 h-9 rounded-lg  border border-gray-200/80 flex items-center justify-center font-serif font-bold text-stone-900 text-sm shadow-[0_2px_6px_rgba(200,46,49,0.08)] mb-1.5">
      {value}
    </div>
    <span className="text-[0.625rem] text-stone-500 scale-90 font-medium">{label}</span>
  </div>
)

// -----------------------------------------------------------------------------
// 主组件：GuaPanelDual (重构布局)
// -----------------------------------------------------------------------------
const GuaPanelDual = ({ data, recordId }: { data: FullGuaData; recordId?: string }) => {
  const router = useRouter()

  // 判断是否为静卦（无动爻）
  const isQuietGua = !data.lines.some(l => l.original.isMoving)

  const handleViewDetail = () => {
    if (recordId) {
      router.push(`/tools/6yao/${recordId}?from=community`)
    }
  }
  
  // 渲染单条爻线图形 (优化样式与颜色)
  const renderLineGraphic = (type: 0 | 1 | 2 | 3, isMoving: boolean, isGhost: boolean = false) => {
    // 判断是否为阳爻（连实线）：type 1=少阳, type 3=老阳 都是阳爻
    // 0: 少阴 (--), 1: 少阳 (—), 2: 老阴 (X), 3: 老阳 (O)
    const isBarConnected = type === 1 || type === 3
    
    // 颜色逻辑：
    // 1. 动爻: 朱砂红 (#C82E31)
    // 2. 静爻: 深墨灰 (Stone-700)
    // 3. 幽灵模式(占位符): 极浅灰 (Stone-200)
    let colorClass = 'bg-stone-600'
    if (isGhost) colorClass = 'bg-stone-200'
    else if (isMoving) colorClass = 'bg-[#C82E31]'
    
    // 容器样式
    const containerClass = `w-full h-full flex items-center justify-center relative`

    return (
      <div className={containerClass}>
        {isBarConnected ? (
          // 阳爻: 一条长实线
          <div className={`w-full h-[0.4375rem] rounded-[0.0625rem] ${colorClass} transition-colors`} />
        ) : (
          // 阴爻: 两条短实线
          <div className="w-full flex justify-between">
            <div className={`w-[42%] h-[0.4375rem] rounded-[0.0625rem] ${colorClass} transition-colors`} />
            <div className={`w-[42%] h-[0.4375rem] rounded-[0.0625rem] ${colorClass} transition-colors`} />
          </div>
        )}
        
        {/* 动爻标记 (O/X) - 仅在非幽灵模式且动爻时显示 */}
        {!isGhost && isMoving && (
          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 text-[0.625rem] text-[#C82E31] font-bold font-serif leading-none">
            {isBarConnected ? '○' : '✕'}
          </div>
        )}
      </div>
    )
  }

  // 渲染单行 - 使用 CSS Grid 严格对齐
  const renderRow = (lineIndex: number) => {
    const lineData = data.lines[lineIndex]
    if (!lineData) return null
    const org = lineData.original
    const chg = lineData.changed
    const isMoving = org.isMoving
    
    // 定义列宽配置：
    // 1. 六兽 (1.75rem)
    // 2. 本卦六亲 (2rem)
    // 3. 本卦纳甲 (2.25rem)
    // 4. 本卦爻线 (3.375rem)
    // 5. 箭头 (1.25rem)
    // 6. 变卦六亲 (2rem)
    // 7. 变卦爻线 (2.75rem)
    // 8. 变卦纳甲 (2.25rem)
    const gridCols = "grid-cols-[22px_32px_46px_54px_20px_32px_44px_2.25rem]"
    
    return (
      <div 
        key={lineIndex} 
        className={`grid ${gridCols} gap-1 items-center py-2.5 border-b border-stone-50 last:border-0 hover:bg-stone-50/80 transition-colors h-[3.25rem]`}
      >
        {/* 1. 六兽 (居中, 弱化) */}
        <div className="text-[0.75rem] text-stone-500 text-center font-serif tracking-tighter">
          {org.liuShou}
        </div>
        
        {/* 2. 本卦六亲 (右对齐，加粗重点) */}
        <div className={`text-[0.8125rem] font-bold text-right pr-1 truncate ${isMoving ? 'text-[#C82E31]' : 'text-stone-600'}`}>
          {org.liuQin}
        </div>
        
        {/* 3. 本卦纳甲 (左对齐) */}
        <div className="flex flex-col justify-center leading-none pl-1">
          <div className="flex items-center gap-1">
            <span className="text-[0.8125rem] font-bold text-stone-700 mb-[0.1875rem] font-serif">{org.ganZhi}</span>
            <span className="text-[0.6875rem] text-stone-400 scale-95 origin-left mb-0.5">{org.wuXing}</span>
          </div>
          {/* 伏神显示 */}
          {org.fuShen && (
            <span className="text-[0.5625rem] text-[#C82E31] font-serif scale-90 origin-left mt-0.5 leading-tight">
              伏:{org.fuShen}
            </span>
          )}
          {/* 卦身显示 */}
          {data.guaShen && data.guaShenLineIndex === lineIndex && (
            <span className="text-[0.5625rem] text-stone-500 font-serif scale-90 origin-left mt-0.5 leading-tight">
              身:{data.guaShen}
            </span>
          )}
        </div>
        
        {/* 4. 本卦爻线 + 世应 */}
        <div className="relative px-1 h-full flex items-center">
          {renderLineGraphic(org.type, isMoving)}
          
          {/* 世应标记: 绝对定位在爻线右侧，使用红/灰底色区分 */}
          {org.isShi && (
            <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-[0.625rem] bg-[#C82E31] text-white px-[0.1875rem] py-px rounded-[0.125rem] leading-none z-10 shadow-sm font-serif">
              世
            </span>
          )}
          {org.isYing && (
            <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-[0.625rem] bg-stone-200 text-stone-500 px-[0.1875rem] py-px rounded-[0.125rem] leading-none z-10 font-serif">
              应
            </span>
          )}
        </div>
        
        {/* 5. 动爻箭头 (仅动爻显示) */}
        <div className="flex justify-center items-center">
          {isMoving ? (
            <MoveRight size={14} className="text-[#C82E31]/80 ml-0.5" />
          ) : (
            // 静态占位线，保持视觉分割
            <div className="w-px h-3 bg-stone-100" />
          )}
        </div>
        
        {/* ---------------- 变卦区域 (完整显示所有爻的变卦信息) ---------------- */}
        
        {/* 6. 变卦六亲 */}
        <div className={`text-[0.8125rem] text-right pr-1 truncate ${
          !isQuietGua && chg 
            ? (isMoving ? 'text-stone-600 font-medium' : 'text-stone-500') 
            : 'opacity-0'
        }`}>
          {!isQuietGua ? chg?.liuQin : ''}
        </div>
        
        {/* 7. 变卦爻线 */}
        <div className="px-1 h-full flex items-center">
          {isQuietGua ? (
            // 静卦模式：显示极浅的占位符 (Ghost Line)
            <div className="w-full h-full flex items-center opacity-30">
               <div className="w-full h-[0.3125rem] bg-stone-100 rounded-full border border-stone-200 border-dashed"></div>
            </div>
          ) : (
            // 动卦模式：完整显示所有爻的变卦爻线
            chg ? (
              <div className={`w-full h-full flex items-center scale-95 ${isMoving ? 'opacity-100' : 'opacity-70'}`}>
                {renderLineGraphic(chg.type, false)}
              </div>
            ) : (
               // 没有变卦数据时留白
               <div className="w-full h-2"></div>
            )
          )}
        </div>
        
        {/* 8. 变卦纳甲 */}
        <div className={`flex flex-col justify-center leading-none pl-1 ${
          !isQuietGua && chg 
            ? (isMoving ? 'opacity-100' : 'opacity-80') 
            : 'opacity-0'
        }`}>
          {!isQuietGua && chg && (
            <>
              <span className={`text-[0.75rem] font-medium mb-[0.1875rem] font-serif ${
                isMoving ? 'text-stone-700' : 'text-stone-500'
              }`}>
                {chg.ganZhi}
              </span>
              <span className={`text-[0.6875rem] scale-95 origin-left ${
                isMoving ? 'text-stone-500' : 'text-stone-500'
              }`}>
                {chg.wuXing}
              </span>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden w-full relative">
      {/* 顶部：时间与四柱 (信息增强版) */}
      <div className="bg-linear-to-br p-4 border-b border-stone-100 relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-[#C82E31]/60 via-[#C82E31]/40 to-transparent"></div>
        
        {/* 第一行：公历与空亡 */}
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <div className="text-[0.625rem] text-stone-500 mb-0.5 font-medium tracking-wide">起卦时间</div>
            <div className="text-sm font-mono font-bold text-stone-900 tracking-tight">{data.dateStr}</div>
          </div>
          <div className="text-right">
            <div className="text-[0.625rem] text-stone-500 mb-0.5 font-medium tracking-wide">空亡 (日)</div>
            <div className="text-xs font-serif text-[#635858]  border px-2 py-0.5 rounded-md shadow-sm font-bold">{data.kongWang || '--'}</div>
          </div>
        </div>
        
        {/* 第二行：农历与节气 */}
        <div className="flex items-center flex-wrap gap-y-1 gap-x-2 mb-5 text-xs font-serif">
          <span className=" text-amber-900 px-1.5 rounded font-medium">{data.lunarYear}</span>
          <span className="font-bold text-stone-800">{data.lunarDateStr}</span>
          {/* <span className="text-stone-600">{data.lunarHour}</span> */}
          <span className="text-stone-300">|</span>
          <span className="text-[#C82E31] px-1.5 rounded font-bold">{data.solarTerm}</span>
        </div>
        
        {/* 第三行：四柱排盘 */}
        <div className="grid grid-cols-4 gap-2 px-0.5">
          <PillarBlock label="年柱" value={data.fourPillars.year} />
          <PillarBlock label="月柱" value={data.fourPillars.month} />
          <PillarBlock label="日柱" value={data.fourPillars.day} />
          <PillarBlock label="时柱" value={data.fourPillars.hour} />
        </div>
      </div>
      
      {/* 中部：卦象列表 */}
      <div className="p-3 relative min-h-[21.25rem]">
        {/* 表头 - 使用相同的 Grid 定义 */}
        <div className="grid grid-cols-[28px_32px_54px_36px_20px_7rem] gap-1 pb-2 border-b border-stone-100 mb-1 items-end">
          <div className="text-center text-[0.75rem] text-stone-400 font-serif">六神</div>
          {/* 合并本卦区域 */}
          <div className="col-span-3 text-center">
            <span className="text-sm font-bold text-stone-800 font-serif tracking-wide">{data.originalName}</span>
            <span className="text-[0.75rem] text-stone-400 scale-90 ml-1">{data.originalGong}</span>
          </div>
          <div></div>
          {/* 合并变卦区域 */}
          <div className={`col-span-1 text-center transition-opacity ${isQuietGua ? 'opacity-30' : 'opacity-100'}`}>
            <span className="text-sm font-bold text-stone-600 font-serif tracking-wide">
              {isQuietGua ? '六爻安静' : data.changedName}
            </span>
            <span className="text-[0.625rem] text-stone-400 scale-90 ml-1">
              {isQuietGua ? '无变卦' : data.changedGong}
            </span>
          </div>
        </div>
        
        {/* 爻行 (倒序渲染: 5 -> 0) */}
        <div className="flex flex-col relative z-10">
          {[5, 4, 3, 2, 1, 0].map(idx => renderRow(idx))}
        </div>

        {/* 静卦水印印章 (仅在静卦时显示) */}
        {isQuietGua && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-10">
             <div className="w-24 h-24 border-4 border-stone-800 rounded-full flex items-center justify-center rotate-[-15deg]">
                <div className="w-20 h-20 border border-stone-800 rounded-full flex flex-col items-center justify-center gap-0">
                  <span className="text-2xl font-black font-serif text-stone-900 leading-none">六爻</span>
                  <span className="text-2xl font-black font-serif text-stone-900 leading-none">安静</span>
                </div>
             </div>
          </div>
        )}
      </div>
      
      {/* 底部：操作 */}
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
  )
}

export default GuaPanelDual