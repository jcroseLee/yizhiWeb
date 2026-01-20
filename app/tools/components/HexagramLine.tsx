import { type LineDetail } from '@/lib/utils/liuyaoDetails'
import React from 'react'

export interface HexagramLineProps {
  line: { barType: 'yin' | 'yang', isChanging: boolean, status: string }
  detail?: LineDetail
  changedDetail?: LineDetail
  isChanged?: boolean
  fuShen?: string
  guaShen?: string
}

export const HexagramLine = React.memo(({ line, detail, changedDetail, isChanged = false, fuShen, guaShen }: HexagramLineProps) => {
  const displayType = isChanged 
    ? (line.isChanging ? (line.barType === 'yang' ? 'yin' : 'yang') : line.barType)
    : line.barType

  const lineColor = line.isChanging ? 'bg-[#C82E31]' : 'bg-stone-800'
  const isYang = displayType === 'yang'
  
  // 高度：移动端 h-10，PC 端严格恢复 h-14
  const heightClass = "h-10 lg:h-14"

  // 1. 变卦显示模式 (右侧)
  if (isChanged) {
    const opacityClass = line.isChanging ? 'opacity-100 text-stone-800' : 'opacity-30 grayscale text-stone-400'
    
    return (
      <div className={`flex flex-col ${heightClass} border-b border-dashed border-stone-100/50 justify-center`}>
        <div className="flex items-center">
          
          {/* 1. 爻线图形 */}
          {/* 移动端 w-16，PC 端严格恢复 w-16 (保持与左侧本卦对齐) */}
          <div className="w-16 h-4 flex items-center justify-between relative shrink-0 mr-1 lg:mr-0">
            {isYang ? (
              <div className={`w-full lg:w-full h-[0.3125rem] lg:h-[0.5rem] rounded-[0.0625rem] lg:rounded-[0.125rem] shadow-sm ${lineColor}`} />
            ) : (
              <>
                <div className={`w-[42%] lg:w-[42%] h-[0.3125rem] lg:h-[0.5rem] rounded-[0.0625rem] lg:rounded-[0.125rem] shadow-sm ${lineColor}`} />
                <div className={`w-[42%] lg:w-[42%] h-[0.3125rem] lg:h-[0.5rem] rounded-[0.0625rem] lg:rounded-[0.125rem] shadow-sm ${lineColor}`} />
              </>
            )}
          </div>
          
          {/* 2. 变卦文字 */}
          {/* PC端：ml-4 (间距恢复) */}
          <div className={`flex flex-col justify-center ml-2 lg:ml-4 ${opacityClass}`}>
            <span className="font-bold font-serif text-stone-900 text-xs lg:text-sm leading-none mb-0.5">
              {changedDetail?.relationShort}
            </span>
            <span className="font-serif text-[0.625rem] lg:text-xs text-stone-900 leading-none scale-90 lg:scale-100 origin-left">
              {changedDetail?.stem}{changedDetail?.branch}{changedDetail?.element}
            </span>
          </div>

          {/* 移动端：六兽简写 */}
          <div className={`lg:hidden flex flex-col justify-center ml-3 ${opacityClass}`}>
             <span className="text-[0.625rem] font-serif text-stone-500">
               {detail?.animalShort}
             </span>
          </div>
        </div>
      </div>
    )
  }

  // 2. 本卦显示模式 (左侧)
  return (
    <div className={`relative group hover:bg-stone-50/80 transition-colors rounded-lg border-b border-dashed border-stone-100 ${heightClass} flex items-center justify-end lg:justify-start -mx-1 lg:-mx-3 px-1 lg:px-3`}>
      
      <div className="flex items-center w-full lg:w-auto">
        
        {/* 第一列：六兽 */}
        {/* 移动端：隐藏 (hidden)，PC端：显示 (lg:flex, w-8) - 严格恢复 */}
        <div className="hidden lg:flex w-8 flex-col items-center justify-center shrink-0 border-r border-stone-100 pr-2 mr-3 h-8">
           <span className="text-xs font-bold text-stone-500 font-serif whitespace-nowrap">
             {detail?.animalShort}
           </span>
        </div>

        {/* 第二列：文字信息 (六亲+干支) */}
        {/* 移动端 w-20，PC端 w-28 - 严格恢复 */}
        <div className="w-20 lg:w-28 flex flex-col items-end lg:justify-center shrink-0 mr-1 lg:mr-2">
           {/* 六亲 */}
           <div className="flex items-baseline gap-1 lg:gap-2">
             <span className="font-bold text-stone-800 font-serif text-sm lg:text-[0.9375rem] leading-none mb-0.5 lg:mb-0">
               {detail?.relationShort}
             </span>
             {/* PC端干支 */}
             <span className="text-stone-600 font-serif text-[0.625rem] lg:text-sm leading-none scale-95 lg:scale-100 origin-right lg:origin-left">
                {detail?.stem}{detail?.branch}<span className="text-stone-400 ml-0.5 text-[0.5625rem] lg:text-xs">{detail?.element}</span>
             </span>
           </div>
           
           {/* 移动端：伏神/卦身/世应 (挤在一起) */}
           <div className="lg:hidden flex items-center gap-1 mt-0.5">
              {detail?.isShi && <span className="text-[0.5625rem] text-white bg-[#C82E31] px-0.5 rounded-[0.125rem] leading-none scale-90">世</span>}
              {detail?.isYing && <span className="text-[0.5625rem] text-stone-500 border border-stone-200 px-0.5 rounded-[0.125rem] leading-none scale-90">应</span>}
              {/* {fuShen && <span className="text-[0.5rem] text-[#C82E31] font-serif scale-75 origin-right">伏:{fuShen}</span>} */}
           </div>

           {/* PC端：伏神/卦身 (独立一行显示，红色高亮 - 严格恢复) */}
           <div className="hidden lg:flex items-center gap-2 mt-0.5">
               {fuShen && (
                 <span className="text-[0.625rem] text-[#C82E31] font-serif tracking-wide">
                   伏神: {fuShen}
                 </span>
               )}
               {guaShen && (
                 <span className="text-[0.625rem] text-stone-400 font-serif scale-90 origin-left">
                   身: {guaShen}
                 </span>
               )}
           </div>
        </div>

        {/* 第三列：爻线图形 */}
        {/* 移动端 w-16，PC端 w-24 - 严格恢复 */}
        <div className="relative flex items-center justify-center w-16 lg:w-24 shrink-0">
          <div className="w-12 lg:w-20 h-4 flex items-center justify-between relative cursor-default">
            {isYang ? (
              <div className={`w-full h-[0.3125rem] lg:h-[0.5rem] rounded-[0.0625rem] lg:rounded-[0.125rem] shadow-sm ${lineColor} opacity-90`} />
            ) : (
              <>
                <div className={`w-[42%] h-[0.3125rem] lg:h-[0.5rem] rounded-[0.0625rem] lg:rounded-[0.125rem] shadow-sm ${lineColor} opacity-90`} />
                <div className={`w-[42%] h-[0.3125rem] lg:h-[0.5rem] rounded-[0.0625rem] lg:rounded-[0.125rem] shadow-sm ${lineColor} opacity-90`} />
              </>
            )}
          </div>
        </div>

        {/* 第四列：PC端专属状态栏 (世应/动爻标记 - 严格恢复) */}
        <div className="hidden lg:flex items-center gap-2 ml-3 w-12 shrink-0">
           {/* 动爻 */}
           <div className="w-4 flex justify-center">
             {line.isChanging && (
                <span className="text-xs font-serif text-[#C82E31] animate-pulse font-bold">
                  {line.barType === 'yin' ? '✕' : '○'}
                </span>
             )}
           </div>

           {/* 世应 */}
           <div className="w-5 flex justify-center">
             {detail?.isShi && (
               <div className="w-5 h-5 flex items-center justify-center border border-[#C82E31] rounded-[0.25rem] bg-[#C82E31]/5 text-[#C82E31]">
                 <span className="text-[0.625rem] font-bold font-serif leading-none mt-[0.0625rem]">世</span>
               </div>
             )}
             {detail?.isYing && (
               <div className="w-5 h-5 flex items-center justify-center border border-stone-300 rounded-[0.25rem] bg-stone-50 text-stone-500">
                 <span className="text-[0.625rem] font-serif leading-none mt-[0.0625rem]">应</span>
               </div>
             )}
           </div>


        </div>

        {/* 移动端 动爻标记 (浮动在右侧) */}
        <div className="lg:hidden w-4 flex justify-center ml-1">
             {line.isChanging && (
                <span className="text-xs font-serif text-[#C82E31] font-bold">
                  {line.barType === 'yin' ? '✕' : '○'}
                </span>
             )}
        </div>

      </div>
    </div>
  )
})
HexagramLine.displayName = 'HexagramLine'
