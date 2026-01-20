'use client'

import { Button } from '@/lib/components/ui/button'
import { Card, CardContent } from '@/lib/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { Scroll } from 'lucide-react'
import { useState } from 'react'
import { EarthIcon, FireIcon, MetalIcon, WaterIcon, WoodIcon } from '../bazi/components/WuxingIcons'
import { BaZiForm } from '../components/BaZiForm'

// --- 样式补丁 ---
const styles = `

  
  .font-ganzhi {
    font-family: "Noto Serif SC", "Songti SC", serif;
  }

  /* 2. 五行配色系统 (低饱和度高级感) */
  .text-wood { color: #3A7B5E; }   /* 木 - 竹青 */
  .text-fire { color: #C82E31; }   /* 火 - 朱砂 */
  .text-earth { color: #8D6E63; }  /* 土 - 赭石 */
  .text-metal { color: #D4AF37; }  /* 金 - 鎏金 */
  .text-water { color: #4B7BB6; }  /* 水 - 靛蓝 */
  
  /* 3. 排盘表格样式 */
  .bazi-grid {
    display: grid;
    grid-template-columns: 5rem repeat(4, 1fr);
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
    color: #a8a29e; /* stone-400 */
    font-weight: normal;
  }
  
  /* 偶数行斑马纹 (极淡) */
  .row-zebra:nth-child(even) {
    background-color: rgba(28, 25, 23, 0.02);
  }
  
  /* 4. 罗盘动画 */
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .compass-spin {
    animation: spin-slow 60s linear infinite;
  }

  /* 5. 模糊入场 */
  .animate-blur-in {
    animation: blur-in 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    opacity: 0;
  }
  @keyframes blur-in {
    0% { filter: blur(0.75rem); opacity: 0; transform: translateY(0.625rem); }
    100% { filter: blur(0); opacity: 1; transform: translateY(0); }
  }

  /* --- 初始状态专用动效 --- */

/* 1. 轨道旋转 */
@keyframes orbit-cw {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes orbit-ccw {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

.ring-outer { animation: orbit-cw 120s linear infinite; }
.ring-middle { animation: orbit-ccw 80s linear infinite; }
.ring-inner { animation: orbit-cw 40s linear infinite; }

/* 2. 核心呼吸 */
@keyframes core-pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; box-shadow: 0 0 1.875rem rgba(200, 46, 49, 0.1); }
  50% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 3.75rem rgba(200, 46, 49, 0.3); }
}
.ai-core {
  animation: core-pulse 4s ease-in-out infinite;
}

/* 3. 扫描光效 */
@keyframes scan-sweep {
  0% { transform: translateY(-150%) rotate(45deg); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(150%) rotate(45deg); opacity: 0; }
}
.scan-light {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.8), transparent);
  opacity: 0.1;
  animation: scan-sweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  pointer-events: none;
}
`

// --- 模拟数据 ---
const MOCK_DATA = {
  basic: {
    name: '案例2',
    gender: '乾造',
    lunarDate: '1971年腊月初八 午时',
    solarDate: '1972年01月23日 12:00:00',
    trueSolarDate: '1972-01-23 12:00:00',
    place: '未知地',
    solarTerm: '小寒后16天22小时',
    zodiac: '猪',
    mingGong: '坤卦',
  },
  // 核心数据
  pillars: [
    { label: '年柱', gan: { char: '辛', wuxing: 'metal' }, zhi: { char: '亥', wuxing: 'water' }, zhuXing: '偏印', fuXing: ['劫财', '伤官'], cangGan: [{char:'壬', wuxing:'water'}, {char:'甲', wuxing:'wood'}], naYin: '钗钏金', shenSha: ['太极贵人', '驿马', '金舆'], xingYun: '帝旺', ziZuo: '沐浴', kongWang: '寅卯' },
    { label: '月柱', gan: { char: '辛', wuxing: 'metal' }, zhi: { char: '丑', wuxing: 'earth' }, zhuXing: '偏印', fuXing: ['七杀', '比肩', '偏印'], cangGan: [{char:'己', wuxing:'earth'}, {char:'癸', wuxing:'water'}, {char:'辛', wuxing:'metal'}], naYin: '壁上土', shenSha: ['福星贵人', '华盖', '丧门'], xingYun: '冠带', ziZuo: '养', kongWang: '辰巳' },
    { label: '日柱', gan: { char: '癸', wuxing: 'water' }, zhi: { char: '丑', wuxing: 'earth' }, zhuXing: '元男', fuXing: ['七杀', '比肩', '偏印'], cangGan: [{char:'己', wuxing:'earth'}, {char:'癸', wuxing:'water'}, {char:'辛', wuxing:'metal'}], naYin: '桑柘木', shenSha: ['福星贵人', '八专日'], xingYun: '冠带', ziZuo: '冠带', kongWang: '寅卯' },
    { label: '时柱', gan: { char: '戊', wuxing: 'earth' }, zhi: { char: '午', wuxing: 'fire' }, zhuXing: '正官', fuXing: ['偏财', '七杀'], cangGan: [{char:'丁', wuxing:'fire'}, {char:'己', wuxing:'earth'}], naYin: '天上火', shenSha: ['天乙贵人', '桃花'], xingYun: '绝', ziZuo: '帝旺', kongWang: '子丑' },
  ],
  // 大运流年
  daYun: [
    { gan: '庚', zhi: '子', age: 7, year: 1977, wuxing: ['metal', 'water'] },
    { gan: '己', zhi: '亥', age: 17, year: 1987, wuxing: ['earth', 'water'] },
    { gan: '戊', zhi: '戌', age: 27, year: 1997, wuxing: ['earth', 'earth'] },
    { gan: '丁', zhi: '酉', age: 37, year: 2007, wuxing: ['fire', 'metal'] },
    { gan: '丙', zhi: '申', age: 47, year: 2017, wuxing: ['fire', 'metal'], isCurrent: true },
    { gan: '乙', zhi: '未', age: 57, year: 2027, wuxing: ['wood', 'earth'] },
    { gan: '甲', zhi: '午', age: 67, year: 2037, wuxing: ['wood', 'fire'] },
  ],
  liuNian: Array.from({length: 10}).map((_, i) => ({ year: 2017+i, gan: '丁', zhi: '酉', wuxing: ['fire', 'metal'], name: '才/枭' }))
}

// 排盘表格结构数据
const MOCK_BAZI_DATA = {
  headers: ['', '年柱', '月柱', '日柱', '时柱'],
  mainStars: ['', ...MOCK_DATA.pillars.map(p => p.zhuXing)],
  rows: [
    { label: '纳音', values: MOCK_DATA.pillars.map(p => p.naYin) },
    { label: '行运', values: MOCK_DATA.pillars.map(p => p.xingYun) },
    { label: '自坐', values: MOCK_DATA.pillars.map(p => p.ziZuo) },
    { label: '空亡', values: MOCK_DATA.pillars.map(p => p.kongWang) },
  ]
}

// 辅助函数
const getTextColor = (wuxing?: string) => {
  if (!wuxing) return 'text-stone-500';
  switch (wuxing) {
    case 'wood': return 'text-wood';
    case 'fire': return 'text-fire';
    case 'earth': return 'text-earth';
    case 'metal': return 'text-metal';
    case 'water': return 'text-water';
    default: return 'text-stone-800';
  }
}
const WuxingIcon = ({ wuxing }: { wuxing: string }) => {
  // 调整图标大小和位置，居中对齐
  const iconClass = "w-4 h-4 ml-2 inline-block align-middle opacity-80";
  
  switch (wuxing) {
    case 'metal':
      return <MetalIcon className={cn(iconClass, "text-metal")} />;
    case 'wood':
      return <WoodIcon className={cn(iconClass, "text-wood")} />;
    case 'water':
      return <WaterIcon className={cn(iconClass, "text-water")} />;
    case 'fire':
      return <FireIcon className={cn(iconClass, "text-fire")} />;
    case 'earth':
      return <EarthIcon className={cn(iconClass, "text-earth")} />;
    default:
      return null;
  }
}

export default function BaZiPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [isResultVisible, setIsResultVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCalculate = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setIsResultVisible(true) }, 800)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      <div className="h-full flex relative bg-[#f5f5f7] paper-texture">

        {/* 左侧主内容区 - 排盘展示 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          
          {/* 背景装饰：更具象的罗盘/太极底纹 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
            {/* 外圈罗盘刻度 (示意) - 扩大范围 */}
            {/* <svg width="950" height="950" viewBox="0 0 950 950" className="opacity-[0.05] animate-[spin_60s_linear_infinite]">
              <circle cx="475" cy="475" r="356.25" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="475" cy="475" r="415.625" fill="none" stroke="currentColor" strokeWidth="1" />
              {Array.from({ length: 12 }).map((_, i) => (
                <line 
                  key={i} 
                  x1="475" y1="118.75" x2="475" y2="142.5" 
                  transform={`rotate(${i * 30} 475 475)`} 
                  stroke="currentColor" 
                  strokeWidth="2"
                />
              ))}
            </svg> */}
          </div>

          <div className="min-h-full flex flex-col items-center justify-start lg:justify-center pt-24 pb-12 px-4 lg:p-8 relative z-10">
            <div className="w-full max-w-3xl space-y-6">
            
            {!isResultVisible ? (
              // --- 初始状态：乾坤运转 · 数据之眼 ---
                <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full overflow-hidden select-none">
                        
                    {/* 1. 氛围背景层 */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* 中心光晕 */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[37.5rem] h-[37.5rem] bg-linear-to-br from-stone-200/20 to-transparent rounded-full blur-3xl" />
                        {/* 扫描光线 */}
                        <div className="absolute inset-0 overflow-hidden opacity-30">
                            <div className="w-[200%] h-[1.25rem] bg-linear-to-r from-transparent via-stone-100 to-transparent absolute top-1/2 left-[-50%] -rotate-45 blur-md animate-[scan-sweep_8s_infinite]" />
                        </div>
                    </div>

                    {/* 3. 文字引导区 */}
                    <div className="text-center space-y-4 z-20 mb-8">

                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-800 tracking-tight leading-tight">
                            <span className="inline-block hover:text-[#C82E31] transition-colors duration-500 cursor-default">命理探源</span>
                            <span className="mx-4 text-stone-300 font-light">·</span>
                            <span className="inline-block hover:text-[#C82E31] transition-colors duration-500 cursor-default">洞察先机</span>
                        </h2>
                        
                        <p className="text-stone-500 text-sm md:text-base font-light max-w-lg mx-auto leading-relaxed">
                            请在右侧录入契文，点击开始排盘，为您推演四柱乾坤。
                        </p>
                    </div>

                    {/* 2. 核心罗盘系统 (SVG) */}
                    <div className="relative w-[31.25rem] h-[31.25rem] md:w-[37.5rem] md:h-[37.5rem] flex items-center justify-center scale-90 md:scale-100 transition-transform duration-700">
                        
                        {/* 外环：二十四山/刻度 */}
                        <div className="absolute inset-0 ring-outer opacity-20 text-stone-400">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <defs>
                                    <path id="textCircleOuter" d="M 50, 50 m -44, 0 a 44,44 0 1,1 88, 0 a 44,44 0 1,1 -88, 0" />
                                </defs>
                                <circle cx="50" cy="50" r="49" stroke="currentColor" strokeWidth="0.1" fill="none" strokeDasharray="1 1" />
                                <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="0.2" fill="none" />
                                {/* 刻度线 */}
                                {[...Array(24)].map((_, i) => (
                                    <line key={i} x1="50" y1="2" x2="50" y2="5" transform={`rotate(${i * 15} 50 50)`} stroke="currentColor" strokeWidth="0.3" />
                                ))}
                                {/* 装饰性文字环绕 */}
                                <text fontSize="2" letterSpacing="3" fill="currentColor">
                                    <textPath href="#textCircleOuter" startOffset="0%">
                                        乾坎艮震巽离坤兑 · 天行健君子以自强不息 · 地势坤君子以厚德载物
                                    </textPath>
                                </text>
                            </svg>
                        </div>

                        {/* 中环：天干地支 */}
                        <div className="absolute inset-[15%] ring-middle opacity-40 text-stone-600">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.3" fill="none" strokeDasharray="4 4"/>
                                {/* 十天干 */}
                                {[...Array(10)].map((_, i) => (
                                    <g key={`gan-${i}`} transform={`rotate(${i * 36} 50 50)`}>
                                        <text x="50" y="8" fontSize="4" textAnchor="middle" className="font-serif font-bold fill-current">
                                            {['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'][i]}
                                        </text>
                                        <line x1="50" y1="12" x2="50" y2="15" stroke="currentColor" strokeWidth="0.2" />
                                    </g>
                                ))}
                            </svg>
                        </div>

                        {/* 内环：八卦符号 */}
                        <div className="absolute inset-[35%] ring-inner opacity-60 text-stone-800">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" fill="none"/>
                                {[...Array(8)].map((_, i) => (
                                    <g key={`gua-${i}`} transform={`rotate(${i * 45} 50 50)`}>
                                        {/* 简单的卦象线条模拟 */}
                                        <rect x="46" y="4" width="8" height="1" rx="0.5" fill="currentColor" />
                                        <rect x="46" y="6.5" width="8" height="1" rx="0.5" fill="currentColor" />
                                        <rect x="46" y="9" width="8" height="1" rx="0.5" fill="currentColor" opacity={i%2===0?1:0.3} />
                                    </g>
                                ))}
                            </svg>
                        </div>

                        {/* 核心：AI 能量球 */}
                        <div className="absolute w-24 h-24 rounded-full bg-linear-to-br from-stone-100 to-white shadow-2xl flex items-center justify-center ai-core border border-stone-100/50 backdrop-blur-md z-10">
                            <div className="w-16 h-16 rounded-full border border-[#C82E31]/20 flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-[#C82E31]/5 rounded-full animate-pulse" />
                                <span className="font-serif font-bold text-2xl text-[#C82E31] tracking-widest relative z-10">易</span>
                            </div>
                        </div>

                    </div>
                </div>
            ) : (
              // --- 结果状态 ---
              <div className="w-full animate-blur-in space-y-6">

                {/* 核心排盘表格 (Card Style) */}
                <Card className="bg-white/80 backdrop-blur-sm border-none shadow-sm rounded-2xl overflow-hidden ring-1 ring-stone-100">
                    <CardContent className="p-0">
                        {/* 表头 */}
                        <div className="bazi-grid bg-stone-50/50 border-b border-stone-100/50 py-3">
                            {MOCK_BAZI_DATA.headers.map((h, i) => (
                                <div key={i} className="bazi-cell bazi-header font-serif">{h}</div>
                            ))}
                        </div>

                        {/* 数据行 */}
                        <div className="divide-y divide-stone-100/50 text-sm">
                            
                            {/* 1. 主星 */}
                            <div className="bazi-grid row-zebra">
                                <div className="bazi-cell text-xs text-stone-400">主星</div>
                                {MOCK_BAZI_DATA.mainStars.slice(1).map((s, i) => (
                                    <div key={i} className="bazi-cell text-stone-500 font-medium">{s}</div>
                                ))}
                            </div>

                            {/* 2. 天干 (Highlight) */}
                            <div className="bazi-grid bg-white">
                                <div className="bazi-cell text-xs text-stone-400">天干</div>
                                {MOCK_DATA.pillars.map((p,i) => (
                                    <div key={i} className="bazi-cell py-5 flex items-center justify-center">
                                        <span className={`text-4xl font-bold font-ganzhi ${getTextColor(p.gan.wuxing)}`}>{p.gan.char}</span>
                                        <WuxingIcon wuxing={p.gan.wuxing} />
                                    </div>
                                ))}
                            </div>

                            {/* 3. 地支 (Highlight) */}
                            <div className="bazi-grid bg-white border-t border-stone-100/50">
                                <div className="bazi-cell text-xs text-stone-400">地支</div>
                                {MOCK_DATA.pillars.map((p,i) => (
                                    <div key={i} className="bazi-cell py-5 flex items-center justify-center">
                                        <span className={`text-4xl font-bold font-ganzhi ${getTextColor(p.zhi.wuxing)}`}>{p.zhi.char}</span>
                                        <WuxingIcon wuxing={p.zhi.wuxing} />
                                    </div>
                                ))}
                            </div>

                            {/* 4. 藏干 */}
                            <div className="bazi-grid row-zebra border-t border-dashed border-stone-200/50">
                                <div className="bazi-cell text-xs text-stone-400 pt-3 items-start">藏干</div>
                                {MOCK_DATA.pillars.map((p,i) => (
                                    <div key={i} className="bazi-cell flex-col gap-1.5 pt-3">
                                        {p.cangGan.map((cg, idx) => (
                                            <div key={idx} className="flex gap-1 items-center">
                                                <span className={`${getTextColor(cg.wuxing)} font-ganzhi font-medium`}>{cg.char}</span>
                                                <span className="text-[0.625rem] text-stone-400 scale-90">{p.fuXing[idx] || ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* 5. 副星 */}
                            <div className="bazi-grid row-zebra">
                                <div className="bazi-cell text-xs text-stone-400 pt-3 items-start">副星</div>
                                {MOCK_DATA.pillars.map((p,i) => (
                                    <div key={i} className="bazi-cell flex-col gap-1 text-xs text-stone-500 pt-3">
                                        {p.fuXing.map((s, idx) => <div key={idx}>{s}</div>)}
                                    </div>
                                ))}
                            </div>

                            {/* 6. 常规行 */}
                            {MOCK_BAZI_DATA.rows.map((row, rIdx) => (
                                <div key={rIdx} className="bazi-grid row-zebra">
                                    <div className="bazi-cell text-xs text-stone-400">{row.label}</div>
                                    {row.values.map((v, i) => (
                                        <div key={i} className="bazi-cell text-stone-600">{v}</div>
                                    ))}
                                </div>
                            ))}

                            {/* 7. 神煞 */}
                            <div className="bazi-grid pb-4">
                                <div className="bazi-cell text-xs text-stone-400 pt-3 items-start">神煞</div>
                                {MOCK_DATA.pillars.map((p,i) => (
                                    <div key={i} className="bazi-cell flex-col gap-1.5 pt-3">
                                        {p.shenSha.map((s, idx) => (
                                            <span key={idx} className="text-[0.625rem] text-stone-500 bg-stone-100/50 px-2 py-0.5 rounded-full border border-stone-100 whitespace-nowrap">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                ))}
                            </div>

                        </div>
                    </CardContent>
                </Card>
                
                {/* 底部：大运流年 (Timeline) */}
                <Card className="bg-white/60 border border-stone-200/40 shadow-sm rounded-xl">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">大运流年</h3>
                            <div className="text-[0.625rem] text-stone-400">起运：5岁</div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {MOCK_DATA.daYun.map((yun, i) => (
                                <div key={i} className={`flex flex-col items-center p-2 rounded-lg min-w-[3.5rem] cursor-pointer transition-all border ${yun.isCurrent ? 'bg-stone-800 text-white border-stone-800 shadow-md' : 'bg-white border-stone-100 text-stone-600 hover:border-stone-300'}`}>
                                    <div className="text-sm font-bold font-ganzhi mb-1">{yun.gan}{yun.zhi}</div>
                                    <div className={`text-[0.5625rem] ${yun.isCurrent ? 'text-stone-400' : 'text-stone-300'}`}>{yun.year}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

              </div>
            )}
            </div>
          </div>
          
          {/* 底部版权/提示 */}
          <div className="text-center pb-4 opacity-30 text-[0.625rem] text-stone-500 font-serif">
            易知 · 实证易学平台
          </div>
        </main>

        {/* 右侧边栏 - 参数设置 */}
        <aside className="hidden lg:block w-90 shrink-0 h-full overflow-y-auto bg-white/90 border-l border-stone-200/60 shadow-[ -1px_0_2px_rgba(0,0,0,0.02)] relative z-20 backdrop-blur-sm">
          <div className="p-8 min-h-full">
            <h2 className="text-lg font-serif font-bold text-stone-800 mb-8 flex items-center gap-2 select-none">
              <Scroll className="w-5 h-5 text-[#C82E31]" />
              <span>录入契文</span>
            </h2>
            <BaZiForm date={date} setDate={setDate} gender={gender} setGender={setGender} />
            <Button 
                className="w-full h-12 bg-[#C82E31] hover:bg-[#B02629] text-white text-lg font-bold shadow-lg shadow-red-900/20 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                onClick={handleCalculate}
                disabled={loading}
            >
                {loading ? "正在推演..." : "开始排盘"}
            </Button>
          </div>
        </aside>

      </div>
    </>
  )
}

