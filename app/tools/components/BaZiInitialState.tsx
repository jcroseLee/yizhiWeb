'use client'

// 初始状态专用样式
const initialStateStyles = `
/* --- 四柱八字初始状态专用动效 --- */

/* 1. 浑天仪背景旋转 */
@keyframes orbit-slow {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.05); }
  100% { transform: rotate(360deg) scale(1); }
}
.armillary-sphere {
  animation: orbit-slow 120s linear infinite;
  transform-origin: center;
}

/* 2. 字符流滚动 (Matrix Rain Style) */
@keyframes scroll-up {
  0% { transform: translateY(0%); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-100%); opacity: 0; }
}
.char-stream {
  animation: scroll-up 8s linear infinite;
}

/* 3. 灵柱呼吸悬浮 */
@keyframes pillar-float {
  0%, 100% { transform: translateY(0); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); }
  50% { transform: translateY(-10px); box-shadow: 0 20px 40px -10px rgba(200, 46, 49, 0.15); }
}
.spirit-pillar {
  backdrop-filter: blur(12px);
  background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%);
  border: 1px solid rgba(255,255,255,0.5);
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
  transition: all 0.5s ease;
}
.spirit-pillar:hover {
  background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 100%);
  border-color: rgba(200, 46, 49, 0.3);
  box-shadow: 0 0 30px rgba(200, 46, 49, 0.2);
}

/* 4. 底部聚光灯 */
.pillar-spotlight {
  background: radial-gradient(ellipse at center, rgba(200, 46, 49, 0.15) 0%, transparent 70%);
  filter: blur(20px);
  opacity: 0.5;
  animation: pulse-opacity 4s infinite;
}
@keyframes pulse-opacity {
  0%, 100% { opacity: 0.3; transform: scaleX(1); }
  50% { opacity: 0.6; transform: scaleX(1.2); }
}
`

export function BaZiInitialState() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: initialStateStyles }} />
      
      <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full overflow-hidden select-none">
        
        {/* 1. 头部文字引导 */}
        <div className="text-center space-y-3 z-20 animate-in fade-in slide-in-from-bottom-4 duration-700 mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 tracking-tight">
            推演四柱 · <span className="text-[#C82E31]">定格乾坤</span>
          </h2>
          <p className="text-stone-500 text-sm font-light max-w-md mx-auto">
            时间是流动的能量。请在右侧输入信息，点击按钮，开始排盘。
          </p>
        </div>

        {/* 2. 背景层：浑天仪星轨 */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
          <svg viewBox="0 0 800 800" className="w-[150%] h-[150%] armillary-sphere text-stone-900">
            {/* 经纬线 */}
            <circle cx="400" cy="400" r="390" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="10 10" />
            <circle cx="400" cy="400" r="300" fill="none" stroke="currentColor" strokeWidth="1" />
            <ellipse cx="400" cy="400" rx="390" ry="100" fill="none" stroke="currentColor" strokeWidth="0.5" transform="rotate(45 400 400)" />
            <ellipse cx="400" cy="400" rx="390" ry="100" fill="none" stroke="currentColor" strokeWidth="0.5" transform="rotate(-45 400 400)" />
            {/* 装饰节点 */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
              <circle key={i} cx="400" cy="10" r="4" fill="currentColor" transform={`rotate(${deg} 400 400)`} />
            ))}
          </svg>
        </div>

        {/* 3. 核心：全息四柱 (The Four Pillars) */}
        <div className="relative z-10 flex gap-4 py-6 md:gap-8 lg:gap-12 h-64 md:h-80 items-center justify-center perspective-1000">
          
          {/* 定义四柱数据 */}
          {[
            { label: '年', sub: 'Year', delay: '0s', chars: '甲乙丙丁戊己庚辛壬癸' },
            { label: '月', sub: 'Month', delay: '0.5s', chars: '子丑寅卯辰巳午未申酉戌亥' },
            { label: '日', sub: 'Day', delay: '1s', chars: '甲乙丙丁戊己庚辛壬癸' },
            { label: '时', sub: 'Hour', delay: '1.5s', chars: '子丑寅卯辰巳午未申酉戌亥' },
          ].map((pillar, index) => (
            <div 
              key={index}
              className="relative group flex flex-col items-center"
              style={{ animation: `pillar-float 6s ease-in-out infinite ${pillar.delay}` }}
            >
              {/* 柱顶：光晕 */}
              <div className="w-12 h-1 bg-white/50 blur-md mb-2 rounded-full" />
              
              {/* 柱体：灵柱 */}
              <div className="spirit-pillar w-16 md:w-20 h-full rounded-full flex flex-col items-center justify-between py-6 overflow-hidden relative">
                
                {/* 内部：流动的字符 (Data Stream) */}
                <div className="absolute inset-0 flex justify-center opacity-20 pointer-events-none">
                  <div 
                    className="flex flex-col items-center gap-4 text-lg font-serif font-bold text-stone-800 char-stream" 
                    style={{ animationDuration: `${8 + index * 2}s` }} // 错落速度
                  >
                    {/* 重复两遍字符以实现无缝滚动 */}
                    {pillar.chars.split('').map((c, i) => <span key={`1-${i}`}>{c}</span>)}
                    {pillar.chars.split('').map((c, i) => <span key={`2-${i}`}>{c}</span>)}
                  </div>
                </div>

                {/* 顶部标签 */}
                <div className="z-10 flex flex-col items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C82E31] mb-2" />
                  <span className="text-2xl font-serif font-bold text-stone-800">{pillar.label}</span>
                </div>

                {/* 底部标签 */}
                <div className="z-10 text-[10px] text-stone-400 uppercase tracking-widest font-sans transform -rotate-90 origin-bottom translate-y-6">
                  {pillar.sub}
                </div>
              </div>

              {/* 柱底：底座与阴影 */}
              <div className="w-full h-4 mt-4 pillar-spotlight rounded-full" />
              <div className="absolute -bottom-8 text-xs text-stone-300 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                WAITING...
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
