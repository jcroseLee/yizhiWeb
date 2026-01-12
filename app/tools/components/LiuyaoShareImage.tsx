'use client'

import Logo from '@/lib/components/Logo'
import { cn } from '@/lib/utils/cn'
import { type LineDetail } from '@/lib/utils/liuyaoDetails'
import { Compass, MoveRight, ScanLine, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useMemo } from 'react'

// --- 样式定义 ---
const liuyaoStyles = `
  /* 复用基础宋风背景 */
  .song-paper-bg {
    background-color: #F9F8F4;
    background-image: 
      url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E"),
      linear-gradient(to bottom, #F9F8F4 0%, #F1EEE5 100%);
  }

  .font-song { font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif; }
  .font-kai { font-family: "Ma Shan Zheng", "Kaiti SC", "STKaiti", serif; }

  .writing-vertical {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.15em; /* 稍微增加字间距，适应葫芦形状 */
  }

  /* 墨迹笔触 */
  .ink-stroke {
    border-radius: 2px;
    background-color: #2C2C2C;
    mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 10' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 5 Q 20 0, 50 5 Q 80 10, 100 5 L 100 10 L 0 10 Z' fill='black'/%3E%3C/svg%3E");
    mask-size: 100% 100%;
    position: relative;
    opacity: 0.9;
  }
  
  .moving-line {
    background-color: #BA3D38 !important;
    box-shadow: 0 0 8px rgba(186, 61, 56, 0.4);
  }
  
  /* 水印 - 卦象 */
  .watermark-text {
    font-family: "Ma Shan Zheng", serif;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 160px;
    color: rgba(0,0,0,0.03);
    pointer-events: none;
    z-index: 0;
  }

  /* ----------------------------------------------------
     ✨ 核心优化：葫芦印 (Hulu Seal) 设计
     ---------------------------------------------------- */
  
  /* 1. 印泥纹理 */
  .seal-texture {
    mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.85'/%3E%3C/svg%3E");
    mask-size: 100px;
  }
  
  /* 2. 朱砂色 */
  .cinnabar-red {
    background-color: #AB3B36; /* 稍微调暗一点，更像老印泥 */
    color: #F9F8F4;
  }

  /* 3. 葫芦形状构造 */
  .seal-hulu {
    position: relative;
    width: 28px;  /* 宽度 */
    padding-top: 6px;
    padding-bottom: 6px;
    
    /* 核心：利用 border-radius 模拟葫芦/花生/随形石的形状 */
    /* 上半部分稍窄，下半部分稍宽，中间收腰 */
    border-radius: 14px 14px 14px 14px; 
    
    /* 阴影：模拟油墨晕染 (Bloom) */
    box-shadow: 
      0 2px 4px rgba(171, 59, 54, 0.25),
      0 0 12px 2px rgba(171, 59, 54, 0.15); /* 边缘光晕 */
      
    mix-blend-mode: multiply;
    
    /* 模拟边缘的自然磨损和不规则 */
    filter: blur(0.4px) contrast(1.1);
  }

  /* 利用伪元素制作"收腰"效果，让矩形变葫芦 */
  .seal-hulu::before, .seal-hulu::after {
    content: "";
    position: absolute;
    left: -2px; right: -2px;
    background-color: inherit;
    z-index: -1;
    border-radius: 50%;
  }
  
  /* 上肚 */
  .seal-hulu::before {
    top: 0;
    height: 24px;
    transform: scaleX(0.95); /* 上面稍小 */
  }
  /* 下肚 */
  .seal-hulu::after {
    bottom: 0;
    height: 28px;
    transform: scaleX(1.05); /* 下面稍大 */
  }

  /* 内部虚线刻痕 (仅在中间显示一部分) */
  .seal-inner-mark {
    position: absolute;
    inset: 3px;
    border: 1px dashed rgba(255,255,255,0.4);
    border-radius: 12px;
    opacity: 0.6;
    pointer-events: none;
    z-index: 10;
  }

  /* 4. 文字样式 */
  .seal-text { 
    font-family: "Noto Serif SC", serif; 
    font-weight: 700; 
    line-height: 1.1; 
    text-shadow: 0 0 2px rgba(255,255,255,0.3); 
    position: relative;
    z-index: 20;
    font-size: 11px;
  }

  /* ----------------------------------------------------
     其他装饰 (保持)
     ---------------------------------------------------- */
  .qr-frame {
    position: relative;
    padding: 6px;
    background-color: #fff;
    border: 1px solid #DCD6CC;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  }
  .qr-corner {
    position: absolute;
    width: 8px;
    height: 8px;
    border-color: #BA3D38;
    border-style: solid;
    opacity: 0.6;
  }
  .qr-tl { top: 2px; left: 2px; border-width: 1.5px 0 0 1.5px; }
  .qr-tr { top: 2px; right: 2px; border-width: 1.5px 1.5px 0 0; }
  .qr-bl { bottom: 2px; left: 2px; border-width: 0 0 1.5px 1.5px; }
  .qr-br { bottom: 2px; right: 2px; border-width: 0 1.5px 1.5px 0; }

  .bg-compass-fade {
    mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
    opacity: 0.08;
    pointer-events: none;
  }

  .divider-decorative {
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0.4;
    margin-top: 12px;
    margin-bottom: 4px;
  }
  .divider-line { flex: 1; h-px; background: linear-gradient(90deg, transparent, #BA3D38, transparent); height: 1px; }
  .divider-dot { width: 4px; height: 4px; background-color: #BA3D38; transform: rotate(45deg); }
`

// ... (YaoLine, cleanMarkdown, formatDateString, getGuaSymbol 等辅助函数保持不变)
// 辅助组件：单爻绘制
const YaoLine = ({ isYang, isMoving }: { isYang: boolean; isMoving: boolean }) => {
    const h = "h-3.5"
    return (
        <div className="w-full flex items-center justify-center">
            {isYang ? (
                <div className={cn("w-full ink-stroke", h, isMoving ? "moving-line" : "")} />
            ) : (
                <div className="w-full flex justify-between gap-4">
                    <div className={cn("w-[42%] ink-stroke", h, isMoving ? "moving-line" : "")} />
                    <div className={cn("w-[42%] ink-stroke", h, isMoving ? "moving-line" : "")} />
                </div>
            )}
        </div>
    )
}

const TRIGRAM_SYMBOLS: Record<string, string> = {
  '111': '☰', '011': '☴', '101': '☲', '001': '☶',
  '110': '☱', '010': '☵', '100': '☳', '000': '☷',
}

function getGuaSymbol(key?: string) {
  if (!key || key.length !== 6) return '??'
  const lower = key.substring(0, 3)
  const upper = key.substring(3, 6)
  return (TRIGRAM_SYMBOLS[upper] || '?') + (TRIGRAM_SYMBOLS[lower] || '?')
}

const cleanMarkdown = (text: string) => {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/###/g, '').replace(/`/g, '').replace(/[:：]/g, ' ').trim();
}

const formatDateString = (lunarDate?: string, kongWang?: string) => {
  if (!lunarDate && !kongWang) return ''
  const parts: string[] = []
  if (lunarDate) parts.push(lunarDate)
  if (kongWang) parts.push(`空${kongWang}`)
  return parts.join(' ')
}

interface LiuyaoShareCardProps {
  question?: string
  dateISO?: string
  lunarDate?: string
  kongWang?: string
  benGua?: { name: string; element: string; key: string }
  bianGua?: { name: string; element: string; key: string }
  lines?: Array<{ position: number; yinYang: 0 | 1; moving: boolean; detail?: LineDetail }>
  aiResult?: string
  fuShenMap?: Record<number, string>
}

export default function LiuyaoShareCard(props: LiuyaoShareCardProps) {
  const displayData = useMemo(() => {
    let mappedLines = (props.lines || []).map((line, index) => {
      const detail = line.detail || {} as LineDetail;
      const najia = detail.stem && detail.branch && detail.element
        ? `${detail.stem}${detail.branch}${detail.element}`
        : detail.branch && detail.element ? `${detail.branch}${detail.element}` : '';
      const fuShen = props.fuShenMap && props.fuShenMap[index] ? props.fuShenMap[index] : '';
      return {
          position: line.position,
          yinYang: line.yinYang,
          moving: line.moving,
          beast: detail.animal || '',
          relative: detail.relation || '',
          najia: najia,
          shiYing: detail.isShi ? '世' : (detail.isYing ? '应' : ''),
          fuShen: fuShen
      }
    });
    
    mappedLines = [...mappedLines].sort((a, b) => b.position - a.position);

    if (mappedLines.length < 6) {
      const existingPositions = new Set(mappedLines.map(l => l.position))
        const missingLines: Array<any> = []
      for (let pos = 6; pos >= 1; pos--) {
        if (!existingPositions.has(pos)) {
          missingLines.push({
            position: pos,
            yinYang: (pos % 2 === 1 ? 1 : 0) as 0 | 1,
            moving: false,
            beast: '', relative: '', najia: '', shiYing: '', fuShen: ''
          })
        }
      }
      mappedLines = [...mappedLines, ...missingLines].sort((a, b) => b.position - a.position)
    }

    return {
      question: props.question || "未命名排盘",
      date: formatDateString(props.lunarDate, props.kongWang),
      benGua: {
          name: props.benGua?.name || '未知',
          element: props.benGua?.element || '',
          symbol: getGuaSymbol(props.benGua?.key) || '??'
      },
      bianGua: props.bianGua?.name ? {
          name: props.bianGua.name,
          element: props.bianGua.element || '',
          symbol: getGuaSymbol(props.bianGua.key) || '??'
      } : undefined,
      lines: mappedLines
    }
  }, [props])

  const recordId = props.dateISO 
    ? `${new Date(props.dateISO).getTime().toString().slice(-4)}`
    : `${new Date().getTime().toString().slice(-4)}`
  
  const summary = useMemo(() => {
    if (props.aiResult) {
      const cleaned = cleanMarkdown(props.aiResult)
      return cleaned.length > 200 ? cleaned.slice(0, 200) + '...' : cleaned
    }
    return ''
  }, [props.aiResult])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: liuyaoStyles }} />
      
      {/* 画布容器 */}
      <div className="w-full max-w-[375px] min-h-[667px] song-paper-bg text-[#2C2C2C] font-song relative flex flex-col mx-auto my-4 sm:my-10 shadow-2xl overflow-hidden rounded-lg border border-[#E8E4D8]">
        
        {/* 背景罗盘装饰 */}
        <div className="absolute top-[-40px] right-[-60px] w-48 h-48 sm:w-64 sm:h-64 bg-compass-fade z-0 rotate-12">
             <svg viewBox="0 0 100 100" className="w-full h-full text-[#2C2C2C]">
                 <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" />
                 <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 2" />
                 <path d="M50 2 L50 98 M2 50 L98 50" stroke="currentColor" strokeWidth="0.2" />
             </svg>
        </div>

        {/* 顶部 Header */}
        <div className="relative z-10 pt-6 sm:pt-10 px-4 sm:px-8 flex justify-between items-start">
            <div className="flex flex-col gap-2">
                <div className="flex items-center">
                     <Logo width={100} height={28} className="sm:w-[120px] sm:h-[32px] text-[#1A1A1A]" />
                </div>
                <span className="text-[9px] text-[#888] tracking-[0.2em] uppercase pl-1 opacity-70">
                    Liuyao Divination
                </span>
            </div>
            
            {/* 
               ✨ 优化点：葫芦形印章 
               形状由之前的生硬矩形改为灵动的葫芦/随形，更符合玄学/中医/风水调性
            */}
            <div className="relative mt-2 mr-1 group">
                <div className="seal-hulu cinnabar-red seal-texture flex flex-col items-center justify-center gap-1 transform rotate-[-3deg] transition-transform duration-500 hover:rotate-0">
                    <div className="seal-inner-mark"></div>
                    {/* 拆分文字：上卦 下号 */}
                    <span className="text-[10px] seal-text opacity-95 scale-90">
                        卦
                    </span>
                    <span className="text-[10px] seal-text writing-vertical tracking-widest block opacity-95 h-12">
                        {recordId}
                    </span>
                </div>
                {/* 装饰：印泥残留点 */}
                <div className="absolute -bottom-1 -left-1 w-0.5 h-0.5 bg-[#B23A36] opacity-30 rounded-full blur-[0.5px]"></div>
            </div>
        </div>

        {/* 装饰分割线 */}
        <div className="px-4 sm:px-8 mt-2 relative z-10">
            <div className="divider-decorative">
                <div className="divider-line"></div>
                <div className="divider-dot"></div>
                <div className="divider-line"></div>
            </div>
        </div>

        {/* --- 所测之事 --- */}
        <div className="px-4 sm:px-8 mt-3 relative z-10">
            <div className="pl-2 py-1 mb-1">
                <h2 className="text-lg sm:text-xl font-kai text-[#1A1A1A] leading-relaxed line-clamp-2">
                    {displayData.question}
                </h2>
            </div>
            <div className="text-[10px] text-[#888] pl-2.5 font-mono flex items-center gap-2">
                <Compass className="w-3 h-3 text-[#BA3D38]" />
                {displayData.date}
            </div>
        </div>

        {/* --- 卦象展示区 (内容保持不变) --- */}
        <div className="px-4 sm:px-8 mt-4 sm:mt-6 relative z-10">
            <div className="bg-white/40 border border-[#E0Dcd0] rounded-lg p-4 sm:p-6 relative overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="watermark-text">{displayData.benGua.name.slice(-1)}</div>
                
                <div className="flex justify-between items-center mb-6 border-b border-[#E0Dcd0]/60 pb-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[#999] tracking-widest mb-0.5">本卦</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-kai text-[#1A1A1A]">{displayData.benGua.name}</span>
                            <span className="text-xs text-[#666]">{displayData.benGua.symbol}</span>
                        </div>
                    </div>
                    {displayData.bianGua && displayData.bianGua.name ? (
                        <>
                            <div className="flex items-center gap-2 opacity-60">
                                <MoveRight className="w-4 h-4 text-[#BA3D38]" />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-[#999] tracking-widest mb-0.5">变卦</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs text-[#666]">{displayData.bianGua.symbol}</span>
                                    <span className="text-xl font-song text-[#555]">{displayData.bianGua.name}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1"></div>
                    )}
                </div>

                <div className="flex flex-col gap-3 relative px-2 z-10">
                    {displayData.lines.length > 0 ? (
                        displayData.lines.slice().reverse().map((line, index) => (
                            <div key={`line-${line.position}-${index}`} className="flex items-center justify-between h-8 relative group">
                                <div className="w-8 text-[10px] text-[#888] font-song text-left opacity-80 pt-0.5">
                                    {line.beast || ''}
                                </div>
                                <div className="flex-1 mx-2 sm:mx-3 max-w-[140px] relative">
                                    <YaoLine isYang={line.yinYang === 1} isMoving={line.moving} />
                                    {line.moving && (
                                        <span className="absolute right-[-14px] top-1/2 transform -translate-y-1/2 text-[#BA3D38] text-xs font-bold leading-none">
                                            {line.yinYang === 1 ? '○' : '✕'}
                                        </span>
                                    )}
                                </div>
                                <div className="w-20 flex items-center justify-end gap-2">
                                    {line.shiYing && (
                                        <div className={cn(
                                            "text-[9px] w-4 h-4 rounded-full flex items-center justify-center border shrink-0",
                                            line.shiYing === '世' 
                                                ? "bg-[#BA3D38] text-white border-[#BA3D38]" 
                                                : "border-[#BA3D38] text-[#BA3D38] bg-transparent"
                                        )}>
                                            {line.shiYing}
                                        </div>
                                    )}
                                    <div className="flex flex-col items-end leading-none">
                                        <span className="text-[11px] text-[#444] font-bold">{line.relative || ''}</span>
                                        <span className="text-[9px] text-[#999] scale-90 origin-right mt-0.5">{line.najia || ''}</span>
                                        {line.fuShen && (
                                            <span className="text-[8px] text-[#BA3D38] scale-85 origin-right mt-0.5 font-song">
                                                伏神:{line.fuShen}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-[#999] text-sm py-8">暂无排盘数据</div>
                    )}
                </div>
            </div>
        </div>

        {/* --- 解卦区域 --- */}
        <div className="px-4 sm:px-6 mt-4 sm:mt-6 flex-1 relative z-10 flex flex-col">
            <div className="bg-white/50 border border-[#E8E4D8] rounded-lg p-4 sm:p-5 shadow-sm flex-1 backdrop-blur-[2px] relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                     <Sparkles className="w-3.5 h-3.5 text-[#BA3D38]" />
                     <span className="text-xs font-bold text-[#555] tracking-[0.2em]">天机预言</span>
                     <div className="h-px w-full bg-gradient-to-r from-[#BA3D38]/30 to-transparent"></div>
                </div>

                {summary ? (
                    <>
                        <div className="relative">
                            <p className="text-sm text-[#3E3E3E] leading-7 font-song text-justify pb-2">
                                <span className="text-[#BA3D38] font-bold">断曰：</span>
                                {summary}
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#FFFDFC] to-transparent"></div>
                        </div>
                        <div className="mt-auto flex justify-center pt-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#BA3D38]/5 border border-[#BA3D38]/10">
                                <ScanLine className="w-3 h-3 text-[#BA3D38]" />
                                <span className="text-[10px] text-[#BA3D38] tracking-widest opacity-80">
                                    扫码阅览全篇
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center py-8">
                        <span className="text-sm text-[#999] font-song">暂无 AI 分析结果</span>
                    </div>
                )}
            </div>
        </div>

        {/* 底部 Footer */}
        <div className="mt-auto px-4 sm:px-8 pb-6 sm:pb-8 pt-4 sm:pt-6 relative z-10">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E0Dcd0] to-transparent"></div>

            <div className="flex items-end justify-between pt-5">
                <div className="flex flex-col gap-2">
                    <div className="text-[#BA3D38] font-kai text-sm tracking-wide">
                        知命 · 顺势 · 有为
                    </div>
                    <p className="text-[10px] text-[#999] font-song leading-relaxed opacity-80">
                        易知 AI 监制<br/>
                        探索你的命运图谱
                    </p>
                </div>
                
                <div className="flex items-end gap-3">
                    <div className="text-[9px] writing-vertical text-[#999] h-12 leading-none opacity-60 tracking-widest font-song">
                        扫码 · 详批
                    </div>
                    <div className="qr-frame">
                        <div className="qr-corner qr-tl"></div>
                        <div className="qr-corner qr-tr"></div>
                        <div className="qr-corner qr-bl"></div>
                        <div className="qr-corner qr-br"></div>
                        <Image 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://47.101.172.131&color=4a3b3b" 
                            alt="QR" 
                            width={48}
                            height={48}
                            className="w-12 h-12 mix-blend-multiply opacity-90 relative z-10" 
                            unoptimized
                        />
                    </div>
                </div>
            </div>
        </div>

      </div>
    </>
  )
}