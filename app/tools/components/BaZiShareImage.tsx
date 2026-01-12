'use client'

import Logo from '@/lib/components/Logo'
import { type BaZiResult } from '@/lib/utils/bazi'
import { cn } from '@/lib/utils/cn'
import { Fingerprint } from 'lucide-react'

// --- 样式定义 ---
const songStyles = `
  /* 1. 纸张背景 */
  .song-paper-bg {
    background-color: #F9F8F4;
    background-image: 
      url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"),
      linear-gradient(180deg, #FDFBF6 0%, #F3F0E7 100%);
  }

  /* 2. 字体系统 */
  .font-song { font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif; }
  .font-kai { font-family: "Ma Shan Zheng", "Kaiti SC", "STKaiti", serif; }

  /* 3. 核心工具类 */
  .writing-vertical {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.1em;
  }
  
  /* 4. 印章系统 */
  .texture-noise {
    mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
    mask-size: 80px;
  }
  
  /* 天机印 (实心朱砂) */
  .seal-tianji {
    background-color: #B23A36; 
    color: #F9F8F4;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(178, 58, 54, 0.2), inset 0 0 0 1px rgba(0,0,0,0.1);
    mix-blend-mode: multiply;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(0,0,0,0.1);
  }
  .seal-tianji::after {
    content: "";
    position: absolute;
    inset: 2px;
    border: 1px dashed rgba(255,255,255,0.3);
    border-radius: 2px;
  }

  /* 闲章 (椭圆) */
  .seal-oval {
    border: 1.5px solid #BA3D38;
    border-radius: 40% / 50%;
    color: #BA3D38;
    background: rgba(186, 61, 56, 0.02);
    box-shadow: inset 0 0 4px rgba(186, 61, 56, 0.1);
    mix-blend-mode: multiply;
  }

  /* 5. 装饰元素 */
  /* 文武边框 (内细外粗) */
  .border-wenwu {
    box-shadow: 
      inset 0 0 0 1px #E0Dcd0, /* 内细 */
      inset 0 0 0 5px #F9F8F4, /* 留白 */
      inset 0 0 0 6px #D6D2C4; /* 外粗 */
  }

  /* 玉牌质感 */
  .jade-tablet {
    background: linear-gradient(145deg, #FCFAF7 0%, #F1EEE5 100%);
    box-shadow: 
      0 4px 8px rgba(0,0,0,0.03), 
      inset 0 0 0 1px rgba(255,255,255,0.8),
      inset 0 0 12px rgba(230, 226, 216, 0.4);
  }
  
  /* 6. 日期侧边栏样式 (新) */
  .date-sidebar {
    background-color: rgba(255,255,255,0.5);
    border: 1px double #DCD6CC;
    border-top: none;
    border-bottom: none;
    box-shadow: inset 0 0 10px rgba(220,210,200, 0.2);
  }
`

// 辅助：清洗 Markdown 符号
const cleanMarkdown = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')   // 去除加粗
    .replace(/###/g, '')    // 去除标题
    .replace(/`/g, '')      // 去除代码块
    .replace(/[:：]/g, ' ') // 替换冒号为空格优化排版
    .trim();
}

const formatDateToChinese = (dateISO: string) => {
  if (!dateISO) return { year: '', month: '', day: '' }
  const d = new Date(dateISO)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return {
    year: `${y}`, // 保持数字，用字体美化
    month: `${m}月`,
    day: `${day}日`
  }
}

const getSongWuxingColor = (wuxing: string) => {
  switch (wuxing) {
    case 'wood': return 'text-[#4A6E5D]' 
    case 'fire': return 'text-[#B04E4A]' 
    case 'earth': return 'text-[#8B6D48]' 
    case 'metal': return 'text-[#B09962]' 
    case 'water': return 'text-[#4A637B]' 
    default: return 'text-[#333]'
  }
}

const generateId = (dateISO?: string) => {
    const ts = dateISO ? new Date(dateISO).getTime() : Date.now()
    return `NO.${ts.toString().slice(-6)}`
}

interface ShareImageCardProps {
  result?: BaZiResult
  payload?: { name?: string; gender: string; dateISO: string }
  aiResult?: string
}

export default function ShareImageCard({ result, payload, aiResult }: ShareImageCardProps) {
  const userName = result?.basic?.name || payload?.name || '易友'
  const gender = result?.basic?.gender || (payload?.gender === 'male' ? '乾造' : '坤造')
  const pillars = result?.pillars || []
  
  let dateISO = payload?.dateISO || ''
  if (!dateISO && result?.basic?.trueSolarDate) {
    try { dateISO = new Date(result.basic.trueSolarDate.replace(' ', 'T')).toISOString() } catch { dateISO = '' }
  }
  
  const dateObj = formatDateToChinese(dateISO)
  const recordId = generateId(dateISO)
  const aiContent = aiResult ? cleanMarkdown(aiResult).slice(0, 160) : ''
  
  const pillarsData = pillars.length === 4 ? pillars.map((p, index) => ({
    label: p.label,
    gan: p.gan.char,
    zhi: p.zhi.char,
    wuxing: p.gan.wuxing,
    color: getSongWuxingColor(p.gan.wuxing),
    isSelf: index === 2, 
    isHidden: index === 3, // 强制隐藏时柱
  })) : []

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: songStyles }} />
      
      {/* 整体容器 */}
      <div className="w-[375px] min-h-[667px] song-paper-bg text-[#2C2C2C] font-song relative flex flex-col mx-auto my-10 shadow-2xl overflow-hidden rounded-lg border-none">
        
        {/* --- 装饰：文武边框 --- */}
        <div className="absolute inset-0 border-wenwu pointer-events-none z-30 rounded-lg"></div>
        
        {/* --- 装饰：背景山水 --- */}
        <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none z-0 opacity-[0.08] mix-blend-multiply">
             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                 <path d="M0 100 C 20 70, 50 80, 100 40 L 100 100 Z" fill="#555" />
             </svg>
        </div>

        {/* ================= 顶部 Header ================= */}
        <div className="relative z-10 pt-10 px-8 pb-2 flex justify-between items-start">
            <div className="flex flex-col gap-1 opacity-90">
                <Logo width={100} height={24} />
            </div>
            <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] text-[#A8A499] tracking-widest font-serif">命书编号</span>
                <span className="text-[10px] text-[#8B6D48] font-song tracking-wider border-b border-[#DCD6CC] pb-0.5">
                    {recordId}
                </span>
            </div>
        </div>

        {/* ================= 核心信息区 ================= */}
        <div className="px-8 mt-6 mb-2 relative z-10 grid grid-cols-[1fr_auto] gap-2">
            
            {/* 左侧：名帖 */}
            <div className="relative pt-2">
                {/* 引首章 */}
                <div className="mb-4 opacity-90">
                     <div className="seal-oval w-5 h-7 flex items-center justify-center border-[#BA3D38]">
                         <span className="text-[9px] writing-vertical font-kai text-[#BA3D38]">顺遂</span>
                     </div>
                </div>

                <div className="flex flex-col gap-3">
                    <h1 className="text-[40px] leading-tight font-kai text-[#1A1A1A] tracking-wide break-all mr-2">
                        {userName}
                    </h1>
                </div>
                
                <div className="mt-5 flex items-center gap-3">
                    <span className="text-xs text-[#BA3D38] border border-[#BA3D38] px-2 py-0.5 rounded-[2px] tracking-widest">
                        {gender}
                    </span>
                    <div className="h-px w-8 bg-[#DCD6CC]"></div>
                    <span className="text-xs text-[#999] tracking-widest font-song">八字排盘</span>
                </div>
            </div>

            {/* 右侧：日期书签样式 (优化版) */}
            <div className="h-full pt-1 pr-1">
                {dateISO && (
                    <div className="flex flex-col items-center py-3 px-2 date-sidebar h-36 gap-2 rounded-sm relative">
                        {/* 顶部挂孔装饰 */}
                        <div className="w-1 h-1 rounded-full bg-[#DCD6CC] mb-1"></div>
                        
                        <div className="writing-vertical text-[11px] text-[#555] font-kai tracking-widest opacity-80 h-full flex justify-between items-center py-1">
                             <span className="text-[#333] font-bold text-[13px]">
                                 {dateObj.year}
                             </span>
                             <span className="h-px w-3 bg-[#ccc] opacity-50 rotate-90 my-1"></span>
                             <span>{dateObj.month}</span>
                             <span>{dateObj.day}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- 装饰分割线 --- */}
        <div className="px-10 my-4 relative z-10 flex items-center gap-4 opacity-50">
            <div className="h-px bg-gradient-to-r from-transparent via-[#BA3D38] to-transparent flex-1 opacity-40"></div>
            <div className="rotate-45 w-1.5 h-1.5 border border-[#BA3D38] bg-[#F9F8F4]"></div>
            <div className="h-px bg-gradient-to-r from-transparent via-[#BA3D38] to-transparent flex-1 opacity-40"></div>
        </div>

        {/* ================= 四柱展示区 (修复时柱隐藏) ================= */}
        <div className="px-8 mt-2 relative z-10">
             {pillarsData.length === 4 ? (
                 <div className="flex justify-between items-stretch h-40 relative">
                     {pillarsData.map((p, i) => (
                         <div key={i} className="flex flex-col items-center group relative w-[22%] z-10">
                             <div className="mb-2 opacity-60">
                                 <span className="text-[10px] text-[#888] font-song tracking-widest">
                                     {p.label}
                                 </span>
                             </div>
                             
                             <div className={cn(
                                 "w-full h-full rounded-md border border-[#EAE6DD] flex flex-col items-center justify-center gap-2 relative overflow-hidden jade-tablet transition-all duration-500",
                                 p.isSelf ? "border-[#DCC8B3] bg-[#fffbf4] shadow-sm" : ""
                             )}>
                                 {/* 内容层：如果隐藏，则模糊处理 */}
                                 <div className={cn(
                                     "flex flex-col items-center gap-3 transition-all duration-500",
                                     p.isHidden ? "filter blur-[6px] opacity-30 select-none" : ""
                                 )}>
                                     <span className={cn("text-2xl font-kai", p.color)}>{p.gan}</span>
                                     <span className={cn("text-2xl font-kai", p.color)}>{p.zhi}</span>
                                 </div>

                                 {/* 天机印章覆盖 (仅隐藏时显示) */}
                                 {p.isHidden && (
                                     <div className="absolute inset-0 flex items-center justify-center z-20">
                                        {/* 恢复实心红章 */}
                                        <div className="seal-tianji w-9 h-9 rotate-12 texture-noise">
                                            <span className="text-[11px] font-song font-bold writing-vertical leading-none text-[#F9F8F4] tracking-widest">
                                                天机
                                            </span>
                                        </div>
                                     </div>
                                 )}
                             </div>
                             
                             {p.isSelf && (
                                <div className="absolute -bottom-1 w-10 h-1 bg-[#BA3D38]/20 rounded-full blur-[1px]"></div>
                             )}
                         </div>
                     ))}
                 </div>
             ) : (
                 <div className="h-40 flex flex-col items-center justify-center border border-dashed border-[#DCD6CC] rounded-lg bg-[#F9F8F4]/50">
                     <span className="text-xs text-[#999] font-song">排盘推演中...</span>
                 </div>
             )}
        </div>

        {/* ================= 批断内容区 (清洗 Markdown) ================= */}
        {aiContent && (
            <div className="px-8 mt-6 flex-1 relative z-10">
                <div className="relative pl-3">
                    {/* 左侧装饰线 */}
                    <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#BA3D38] opacity-60 rounded-full"></div>
                    
                    <h3 className="text-xs font-bold text-[#555] mb-2 font-song flex items-center gap-2">
                        <span>命局精要</span>
                        <div className="px-1 py-[1px] border border-[#d0d0d0] rounded-[2px]">
                            <span className="text-[9px] text-[#999] font-normal block scale-90">AI 批注</span>
                        </div>
                    </h3>
                    
                    <p className="text-[13px] text-[#444] leading-[1.7] font-song text-justify opacity-95 h-[100px] overflow-hidden mask-image-b-fade">
                        {/* 使用清洗后的文本 */}
                        {aiContent}
                    </p>
                </div>
                
                {/* 底部按钮 (悬浮) */}
                <div className="absolute bottom-[-6px] left-0 right-0 flex justify-center z-20">
                     <div className="bg-[#2C2C2C] text-[#F9F8F4] pl-5 pr-6 py-2 rounded-full shadow-lg flex items-center gap-2 transform scale-90 border border-[#444] cursor-pointer">
                         <Fingerprint className="w-4 h-4 text-[#BA3D38]" />
                         <span className="text-xs font-song tracking-widest">长按 · 解锁全盘</span>
                     </div>
                </div>
            </div>
        )}

        {/* ================= 底部 Footer ================= */}
        <div className="mt-auto px-8 pb-8 pt-8 relative z-10">
            <div className="border-t border-[#E0Dcd0] pt-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <div className="text-[#BA3D38] font-kai text-base tracking-widest">知命 · 顺势</div>
                    <div className="text-[8px] text-[#999] font-sans scale-90 origin-left mt-1 tracking-wider">
                        POWERED BY YIZHI AI
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                   <div className="text-[9px] writing-vertical text-[#999] font-song h-8 leading-none opacity-60 tracking-widest">
                       批扫<br/>详码
                   </div>
                   <div className="p-0.5 bg-white border border-[#DCD6CC] rounded-sm shadow-sm">
                       <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://47.101.171.131&color=4a3b3b" alt="QR" className="w-11 h-11 mix-blend-multiply opacity-90" />
                   </div>
                </div>
            </div>
        </div>

      </div>
    </>
  )
}