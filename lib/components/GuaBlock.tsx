// -----------------------------------------------------------------------------
// 组件接口
// -----------------------------------------------------------------------------
interface GuaBlockProps {
  name: string
  lines?: boolean[]
  changingLines?: number[]
}

/**
 * 更精致的卦象图组件 - 增强八卦底纹质感
 */
export default function GuaBlock({ name, lines, changingLines }: GuaBlockProps) {
  // 如果没有lines数据,使用默认值
  const displayLines = lines || [true, true, true, false, false, false];
  
  return (
    <div className="relative flex bg-[#fcfbf9] border border-stone-200 rounded-lg overflow-hidden h-24 w-auto shrink-0 select-none group-hover:border-[#C82E31]/30 transition-colors cursor-pointer">
        {/* 八卦底纹装饰 - 极淡的云纹 */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* 卦画 */}
        <div className="relative z-10 flex flex-col justify-center gap-[3px] px-3 py-2 bg-white/50 w-14">
          {displayLines.map((yang, i) => {
            const isChanging = changingLines?.includes(5 - i);
            const lineColor = isChanging ? '#C82E31' : '#2B2B2B';
            
            return (
              <div key={i} className="w-full flex justify-between h-[4px]">
                {yang ? (
                  <div className="w-full bg-stone-800 rounded-[1px]" style={{ backgroundColor: lineColor }} />
                ) : (
                  <>
                    <div className="w-[42%] bg-stone-800 rounded-[1px]" style={{ backgroundColor: lineColor }} />
                    <div className="w-[42%] bg-stone-800 rounded-[1px]" style={{ backgroundColor: lineColor }} />
                  </>
                )}
              </div>
            );
          })}
        </div>
        {/* 竖排文字 - 模拟排盘纸质感 */}
        <div className="relative z-10 vertical-serif text-sm text-stone-600 border-l border-stone-200 px-2 py-2 flex items-center justify-center bg-[#f5f5f4]/30">
          {name}
        </div>
      </div>
  );
}

