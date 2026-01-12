'use client'

import Logo from '@/lib/components/Logo'
import { type BaZiResult } from '@/lib/utils/bazi'
import { cn } from '@/lib/utils/cn'
import { Fingerprint } from 'lucide-react'

// --- 样式定义 ---
const songStyles = `
  /* 1. 纸张：极简宋纸，温润如玉 */
  .song-paper-bg {
    background-color: #F2F0EB;
    background-image: 
      url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"),
      linear-gradient(180deg, #F9F7F2 0%, #EBE8E0 100%);
  }

  /* 2. 字体配置 */
  .font-song { font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif; }
  .font-kai { font-family: "Ma Shan Zheng", "Kaiti SC", "STKaiti", serif; }

  /* 3. 竖排与工具 */
  .writing-vertical {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.3em;
  }
  
  /* ----------------------------------------------------------------
     ✨ 核心：印章与质感系统
     ---------------------------------------------------------------- */
  
  /* 通用印泥质感 */
  .seal-texture {
    mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.7'/%3E%3C/svg%3E");
    mask-size: 120px;
    mix-blend-mode: multiply;
  }

  /* 1. 葫芦印 (编号) - 实心朱文 */
  .seal-hulu {
    position: relative;
    width: 28px;
    padding-top: 6px;
    padding-bottom: 6px;
    background-color: #AB3B36;
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 
      0 2px 4px rgba(171, 59, 54, 0.25),
      0 0 12px 2px rgba(171, 59, 54, 0.15);
    mix-blend-mode: multiply;
    filter: blur(0.4px) contrast(1.1);
  }
  /* 利用伪元素制作"收腰"效果，让矩形变葫芦 */
  .seal-hulu::before, .seal-hulu::after {
    content: "";
    position: absolute;
    left: -2px;
    right: -2px;
    background-color: inherit;
    z-index: -1;
    border-radius: 50%;
  }
  /* 上肚 */
  .seal-hulu::before {
    top: 0;
    height: 24px;
    transform: scaleX(0.95);
  }
  /* 下肚 */
  .seal-hulu::after {
    bottom: 0;
    height: 28px;
    transform: scaleX(1.05);
  }
  /* 移除旧的 seal-hulu-shape，不再需要 */

  /* 2. 引首章 (顺遂) - 随形椭圆 */
  .seal-oval-solid {
    padding: 6px 3px;
    border-radius: 45% / 50%;
    background-color: #AB3B36;
    color: #FFFFFF;
    font-size: 10px;
    box-shadow: 0 1px 3px rgba(171, 59, 54, 0.2);
    border: 1px solid rgba(0,0,0,0.05);
  }

  /* 3. 压角名章 (坤造) */
  .seal-rect-border {
    padding: 4px 3px;
    border: 1.5px solid #BA3D38;
    color: #BA3D38;
    border-radius: 3px;
    background: rgba(186, 61, 56, 0.02);
    box-shadow: inset 0 0 2px rgba(186, 61, 56, 0.2); 
    position: relative;
  }
  .seal-rect-border::before {
    content: ""; position: absolute; inset: -1px;
    border: 1px dashed rgba(242, 240, 235, 0.6);
    pointer-events: none;
  }

  /* 4. 禁印 (天机) */
  .seal-circle-outline {
    width: 40px; height: 40px;
    border: 2px solid #BA3D38;
    color: #BA3D38;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: "Ma Shan Zheng", serif;
    background: rgba(255,255,255,0.4);
    transform: rotate(-12deg);
    filter: drop-shadow(0 1px 1px rgba(186, 61, 56, 0.1));
  }

  /* 5. 启封按钮 (高亮强调) */
  .btn-unseal {
    background: linear-gradient(135deg, #C2423D 0%, #A6322D 100%);
    color: #FDFBF6;
    box-shadow: 
      0 4px 12px rgba(166, 50, 45, 0.25), 
      inset 0 1px 0 rgba(255,255,255,0.2);
    position: relative;
    overflow: hidden;
  }
  /* 按钮呼吸光晕 */
  @keyframes breathe {
    0%, 100% { box-shadow: 0 4px 12px rgba(166, 50, 45, 0.25); transform: scale(1); }
    50% { box-shadow: 0 4px 16px rgba(166, 50, 45, 0.4); transform: scale(1.02); }
  }
  .animate-breathe {
    animation: breathe 3s infinite ease-in-out;
  }

  /* ----------------------------------------------------------------
     其他装饰
     ---------------------------------------------------------------- */
  .ink-zen-circle {
    position: absolute;
    width: 150px; height: 150px;
    background: radial-gradient(circle, rgba(160, 160, 160, 0.06) 0%, rgba(255, 255, 255, 0) 65%);
    border-radius: 50%;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 0;
    filter: blur(10px);
  }

  .border-wenwu {
    border: 1px solid #D6D2C4;
    position: absolute; inset: 6px;
    border-radius: 4px;
    pointer-events: none;
    z-index: 20;
  }
  .border-wenwu::after {
    content: ""; position: absolute; inset: 3px;
    border: 1px solid #EBE8E0; border-radius: 2px;
  }

  .jade-tablet {
    background: linear-gradient(165deg, #FFFCFA 0%, #F0EBE5 100%);
    box-shadow: 0 2px 8px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.8);
  }
  
  .sealed-pillar {
    background: rgba(235, 232, 225, 0.4);
    backdrop-filter: blur(5px);
    border: 1px solid rgba(0,0,0,0.05);
  }

  .qr-frame { position: relative; padding: 5px; background-color: #fff; border: 1px solid #DCD6CC; }
  .qr-corner { position: absolute; width: 6px; height: 6px; border-color: #BA3D38; border-style: solid; opacity: 0.5; }
  .qr-tl { top: 1px; left: 1px; border-width: 1px 0 0 1px; }
  .qr-tr { top: 1px; right: 1px; border-width: 1px 1px 0 0; }
  .qr-bl { bottom: 1px; left: 1px; border-width: 0 0 1px 1px; }
  .qr-br { bottom: 1px; right: 1px; border-width: 0 1px 1px 0; }
`

// --- 辅助逻辑 ---
const cleanContent = (text: string) => {
  if (!text) return '';
  // 移除所有 emoji 和 markdown
  return text
    .replace(/\*\*/g, '')
    .replace(/###/g, '')
    .replace(/`/g, '')
    .replace(/[-—]{3,}/g, '')
    .replace(/[:：]/g, ' ')
    // 移除 emoji 范围
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
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

const getYearInfo = (yearPillar?: { gan: { char: string }, zhi: { char: string } }, dateISO?: string) => {
  if (yearPillar) {
    const zodiacs = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const zhis = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const zhiIndex = zhis.indexOf(yearPillar.zhi.char);
    const zodiac = zhiIndex > -1 ? zodiacs[zhiIndex] : '';
    return `${yearPillar.gan.char}${yearPillar.zhi.char}年 · 属${zodiac}`;
  }
  if (dateISO) {
    return `${new Date(dateISO).getFullYear()}年`;
  }
  return '';
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
  
  const recordId = dateISO ? new Date(dateISO).getTime().toString().slice(-4) : '0001'
  const aiContent = aiResult ? cleanContent(aiResult).slice(0, 150) : ''
  
  const pillarsData = pillars.length === 4 ? pillars.map((p, index) => ({
    label: p.label,
    gan: p.gan.char,
    zhi: p.zhi.char,
    wuxing: p.gan.wuxing,
    color: getSongWuxingColor(p.gan.wuxing),
    isSelf: index === 2, 
    isHidden: index === 3, 
  })) : []

  const yearInfo = getYearInfo(
    pillarsData.length > 0 ? { gan: { char: pillarsData[0].gan }, zhi: { char: pillarsData[0].zhi } } : undefined, 
    dateISO
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: songStyles }} />
      
      {/* 整体容器 */}
      <div className="w-[375px] min-h-[667px] song-paper-bg text-[#2C2C2C] font-song relative flex flex-col mx-auto my-10 shadow-2xl overflow-hidden rounded-lg">
        
        {/* --- 装饰：文武边框 --- */}
        <div className="border-wenwu"></div>

        {/* --- 装饰：背景罗盘 (极致隐形：古铜色 + 极低透明度) --- */}
        <div className="absolute top-10 right-[-60px] w-[320px] h-[320px] opacity-[0.07] pointer-events-none">
             <svg viewBox="0 0 100 100" className="w-full h-full text-[#8B6D48]">
                 <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.3" />
                 <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.2" strokeDasharray="1 3" />
                 <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="0.1" />
                 <path d="M50 0 L50 100 M0 50 L100 50" stroke="currentColor" strokeWidth="0.1" />
                 {/* 增加八卦方位刻度暗示 */}
                 <path d="M50 2 L50 10" stroke="currentColor" strokeWidth="0.5" />
                 <path d="M98 50 L90 50" stroke="currentColor" strokeWidth="0.5" />
                 <path d="M50 98 L50 90" stroke="currentColor" strokeWidth="0.5" />
                 <path d="M2 50 L10 50" stroke="currentColor" strokeWidth="0.5" />
             </svg>
        </div>

        {/* ================= 1. 顶部 Header ================= */}
        <div className="relative z-10 pt-12 px-8 flex justify-between items-start">
            <Logo width={100} height={24} className="text-[#1A1A1A] opacity-90" />
            
            {/* 编号：亚腰葫芦印 */}
            <div className="relative mt-2 mr-2">
                 <div className="seal-hulu seal-texture transform rotate-[-2deg]">
                    <span className="text-[10px] text-[#F9F8F4] font-song relative z-20 font-bold">命</span>
                    <span className="text-[9px] writing-vertical font-bold tracking-widest text-[#F9F8F4] relative z-20 leading-none">{recordId}</span>
                 </div>
            </div>
        </div>

        {/* ================= 2. 核心名帖区域 ================= */}
        <div className="mt-6 mb-8 relative z-10 flex flex-col items-center justify-center min-h-[160px]">
            
            <div className="ink-zen-circle"></div>

            <div className="relative z-10 mb-5">
                {/* 顺遂 (引首章) */}
                <div className="absolute -top-1 -left-10 transform -rotate-12">
                    <div className="seal-oval-solid ">
                        <span className="text-[10px] writing-vertical font-kai tracking-wide block">顺遂</span>
                    </div>
                </div>

                <h1 className="text-[48px] font-kai text-[#1A1A1A] tracking-widest drop-shadow-sm leading-none">
                    {userName}
                </h1>

                {/* 坤造 (压角章) */}
                <div className="absolute -bottom-1 -right-8 opacity-90">
                    <div className="seal-rect-border">
                        <span className="text-[9px] writing-vertical font-song tracking-widest block">{gender}</span>
                    </div>
                </div>
            </div>

            {/* 隐私日期：年柱 + 生肖 */}
            <div className="flex items-center gap-3 z-10 mt-3 opacity-70">
                <div className="h-px w-6 bg-gradient-to-r from-transparent via-[#BA3D38] to-transparent opacity-40"></div>
                <div className="text-[14px] text-[#555] font-song tracking-[0.2em] font-bold">
                    {yearInfo}
                </div>
                <div className="h-px w-6 bg-gradient-to-r from-transparent via-[#BA3D38] to-transparent opacity-40"></div>
            </div>
        </div>

        {/* ================= 3. 四柱展示区 ================= */}
        <div className="px-8 mt-2 relative z-10">
             {pillarsData.length === 4 ? (
                 <div className="flex justify-between items-center h-44">
                     {pillarsData.map((p, i) => (
                         <div key={i} className="flex flex-col items-center w-[22%] relative group">
                             {/* 标签 */}
                             <span className="text-[11px] text-[#555] font-song mb-3 tracking-[0.3em] border-b border-[#E0Dcd0] pb-1 opacity-70">
                                 {p.label}
                             </span>
                             
                             {/* 玉牌 */}
                             <div className={cn(
                                 "w-full h-32 rounded-lg border flex flex-col items-center justify-center gap-2 relative overflow-hidden transition-all duration-500",
                                 p.isHidden 
                                    ? "sealed-pillar border-[#DCD6CC]" 
                                    : "jade-tablet border-[#EAE6DD]",
                                 p.isSelf && !p.isHidden ? "border-[#DCC8B3] shadow-[0_4px_12px_rgba(200,180,160,0.2)]" : ""
                             )}>
                                 
                                 <div className={cn(
                                     "flex flex-col items-center gap-4",
                                     p.isHidden ? "opacity-20 blur-[3px] scale-90 grayscale" : "opacity-100"
                                 )}>
                                     <span className={cn("text-3xl font-kai", p.color)}>{p.gan}</span>
                                     <span className={cn("text-3xl font-kai", p.color)}>{p.zhi}</span>
                                 </div>

                                 {/* 天机印 */}
                                 {p.isHidden && (
                                     <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                         <div className="seal-circle-outline seal-texture">
                                             <span className="text-lg pt-0">封</span>
                                         </div>
                                         <span className="text-[9px] text-[#BA3D38] font-song mt-2 tracking-[0.3em] opacity-80">天机</span>
                                     </div>
                                 )}
                             </div>
                         </div>
                     ))}
                 </div>
             ) : (
                 <div className="h-44 flex flex-col items-center justify-center border border-dashed border-[#DCD6CC] rounded-lg">
                     <span className="text-xs text-[#999] font-song">推演中...</span>
                 </div>
             )}
        </div>

        {/* ================= 4. 批断内容区 ================= */}
        {aiContent && (
            <div className="px-10 mt-6 flex-1 relative z-10 flex flex-col items-center">
                {/* 装饰短线 */}
                <div className="w-8 h-[2px] bg-[#BA3D38]/10 mb-4 rounded-full"></div>
                
                {/* 文本内容 (去Emoji, 首字高亮) */}
                <div className="relative w-full">
                    <p className="text-[13px] text-[#444] leading-[2.2] font-song text-justify tracking-wide opacity-90 h-[96px] overflow-hidden mask-image-b-fade first-letter:text-2xl first-letter:font-kai first-letter:float-left first-letter:mr-1 first-letter:text-[#BA3D38]">
                        {aiContent}
                    </p>
                </div>
                
                {/* ✨ 核心优化：启封按钮 (高亮实心 + 呼吸动画) ✨ */}
                <div className="mt-5 mb-2 cursor-pointer group">
                     <div className="btn-unseal seal-texture px-6 py-2 rounded-full flex items-center gap-2 border border-[#EAE6DD]/30">
                        <Fingerprint className="w-4 h-4 text-white opacity-90" />
                        <span className="text-[12px] font-song tracking-[0.3em] font-bold text-white">长按启封</span>
                     </div>
                </div>
            </div>
        )}

        {/* ================= 5. 底部 Footer ================= */}
        <div className="mt-auto relative z-10">
            {/* 水墨山水 (更淡) */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none opacity-[0.08] mix-blend-multiply text-[#555]">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-current">
                    <path d="M0 100 L0 92 Q 25 100, 50 88 T 100 96 L 100 100 Z" />
                </svg>
            </div>

            <div className="px-8 pb-8 pt-4 flex items-end justify-between relative">
                <div className="flex flex-col gap-1.5">
                    <div className="text-[#BA3D38] font-kai text-sm tracking-[0.3em]">知命·顺势</div>
                    <div className="text-[8px] text-[#999] font-song scale-90 origin-left opacity-60 uppercase tracking-widest">
                        Yizhi AI Monitoring
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-[9px] writing-vertical text-[#999] opacity-50 tracking-widest font-song h-8 border-r border-[#E0Dcd0] pr-2">
                        扫码详批
                    </div>
                    <div className="qr-frame shadow-sm bg-white/80 backdrop-blur-[2px]">
                        <div className="qr-corner qr-tl"></div>
                        <div className="qr-corner qr-tr"></div>
                        <div className="qr-corner qr-bl"></div>
                        <div className="qr-corner qr-br"></div>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://47.101.171.1311&color=2C2C2C" alt="QR" className="w-11 h-11 mix-blend-multiply opacity-85" />
                    </div>
                </div>
            </div>
        </div>

      </div>
    </>
  )
}