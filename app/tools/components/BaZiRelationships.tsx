'use client'

import { calculateRelationships, type BaZiPillar, type Relationship } from '@/lib/utils/bazi'
import { useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

interface BaZiRelationshipsProps {
  pillars: BaZiPillar[]
}

export function BaZiRelationships({ pillars }: BaZiRelationshipsProps) {
  // 1. 状态管理
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800) 
  const [isMobile, setIsMobile] = useState(false)
  const [hoveredRelIndex, setHoveredRelIndex] = useState<number | null>(null)

  useEffect(() => {
    const startedAt = Date.now()
    return () => {
      trackEvent('tool_view_relationship', {
        view_duration: Date.now() - startedAt,
        type: 'bazi',
      })
    }
  }, [])

  // 2. 响应式监听
  useEffect(() => {
    if (!containerRef.current) return
    
    const updateDimensions = () => {
      const width = containerRef.current?.offsetWidth || 800
      setContainerWidth(width)
      setIsMobile(width < 640)
    }
    
    updateDimensions()
    
    const resizeObserver = new ResizeObserver(() => {
       window.requestAnimationFrame(updateDimensions)
    })
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  // 3. 关系类型配置
  const relationshipTypes = [
    { key: 'ganHe', label: '天干合', color: '#22c55e', group: 'gan' },
    { key: 'zhiHe', label: '地支六合', color: '#22c55e', group: 'zhi' },
    { key: 'zhengHe', label: '争合/妒合', color: '#15803d', group: 'zhi' }, // 新增争合类型
    { key: 'tuJu', label: '土局', color: '#a8a29e', group: 'zhi' }, // 土局颜色调整为土色系
    { key: 'gongHui', label: '拱/暗会', color: '#8b5cf6', group: 'zhi' },
    { key: 'sanHe', label: '三合局', color: '#3b82f6', group: 'zhi' },
    { key: 'sanHui', label: '三会局', color: '#6366f1', group: 'zhi' },
    { key: 'banHe', label: '半合', color: '#14b8a6', group: 'zhi' },
    { key: 'zhiChong', label: '地支六冲', color: '#ef4444', group: 'zhi' },
    { key: 'zhiHai', label: '地支六害', color: '#f97316', group: 'zhi' },
    { key: 'zhiPo', label: '地支相破', color: '#f59e0b', group: 'zhi' },
    { key: 'zhiXing', label: '地支相刑', color: '#a855f7', group: 'zhi' },
    { key: 'zhiAnHe', label: '地支暗合', color: '#06b6d4', group: 'zhi' },
  ]

  // 4. 动态配置参数
  const CONFIG = useMemo(() => ({
    canvasWidth: containerWidth, 
    colWidth: containerWidth / 4, 
    ganY: isMobile ? 60 : 80, 
    zhiY: isMobile ? 140 : 180,
    trackHeight: isMobile ? 24 : 28, 
    groupGap: isMobile ? 8 : 12,     
    nodeRadius: isMobile ? 16 : 20,
  }), [containerWidth, isMobile])

  // --- 数据预处理 (核心修改逻辑) ---
  const cleanedRelationships = useMemo(() => {
    // 获取原始计算结果
    const rawRels = calculateRelationships(pillars)
    
    // -----------------------------------------------------------------------
    // 修正逻辑 1: 过滤错误的合局 (修复上一问中的蓝线错误)
    // -----------------------------------------------------------------------
    // 原理：三合(如寅午戌)、三会(如申酉戌)、半合，必须是不同的地支组合。
    // 如果“从 戌 到 戌”也被算作三合/三会，那是算法错误（属于伏吟），必须剔除。
    const validRawRels = rawRels.filter(rel => {
        if (['sanHe', 'sanHui', 'banHe'].includes(rel.type)) {
            // 如果两个地支字符相同（例如 戌-戌），则不构成合局
            return rel.from.char !== rel.to.char
        }
        return true
    })

    const extraRels: Relationship[] = []

    // -----------------------------------------------------------------------
    // 修正逻辑 2: 优化土局逻辑
    // -----------------------------------------------------------------------
    const earthBranches = ['辰', '戌', '丑', '未']
    const earthIndices = pillars.map((p, i) => earthBranches.includes(p.zhi.char) ? i : -1).filter(i => i !== -1)
    
    // 只有当存在3个或以上土支时才显示土局，且用虚线或特殊颜色表示气势，而非严格的合局
    if (earthIndices.length >= 3) {
       const start = Math.min(...earthIndices)
       const end = Math.max(...earthIndices)
       // 只有跨度大于0才画线
       if (start !== end) {
         const label = earthIndices.map(i => ['年','月','日','时'][i]).join('-')
         extraRels.push({ 
           from: { type: 'zhi', pillar: start, char: pillars[start].zhi.char }, 
           to: { type: 'zhi', pillar: end, char: pillars[end].zhi.char }, 
           type: 'tuJu', 
           label: `土局旺势`,
           description: '土局旺势'
         })
       }
    }

    // 拱会逻辑 (保持不变)
    const archMap: Record<string, string> = { '亥丑': '拱会水', '丑亥': '拱会水', '寅辰': '拱会木', '辰寅': '拱会木', '巳未': '拱会火', '未巳': '拱会火', '申戌': '拱会金', '戌申': '拱会金' }
    for (let i = 0; i < pillars.length; i++) {
        for (let j = i + 1; j < pillars.length; j++) {
            const pair = pillars[i].zhi.char + pillars[j].zhi.char
            if (archMap[pair]) {
                extraRels.push({ 
                    from: { type: 'zhi', pillar: i, char: pillars[i].zhi.char }, 
                    to: { type: 'zhi', pillar: j, char: pillars[j].zhi.char }, 
                    type: 'gongHe', 
                    label: archMap[pair],
                    description: '拱会'
                })
            }
        }
    }

    let allRels = [...validRawRels, ...extraRels]

    // -----------------------------------------------------------------------
    // 修正逻辑 3: 识别“争合” (一字合多字)
    // -----------------------------------------------------------------------
    // 统计每个柱子参与“地支六合”的次数
    const heCounts: Record<number, number> = {}
    allRels.forEach(rel => {
        if (rel.type === 'zhiHe') {
            heCounts[rel.from.pillar] = (heCounts[rel.from.pillar] || 0) + 1
            heCounts[rel.to.pillar] = (heCounts[rel.to.pillar] || 0) + 1
        }
    })

    // 如果某条关系的任一端参与了多次六合，将其标记为“争合”
    allRels = allRels.map(rel => {
        if (rel.type === 'zhiHe') {
            if ((heCounts[rel.from.pillar] > 1) || (heCounts[rel.to.pillar] > 1)) {
                return { ...rel, type: 'zhiHe' as const, label: '争合', description: '争合' } // 保持类型为 zhiHe，通过 label 区分
            }
        }
        return rel
    })

    // 去重
    return allRels.filter((rel, index, self) => 
        index === self.findIndex((r) => (r.type === rel.type && ((r.from.pillar === rel.from.pillar && r.to.pillar === rel.to.pillar) || (r.from.pillar === rel.to.pillar && r.to.pillar === rel.from.pillar))))
    )
  }, [pillars])

  // --- 布局计算 ---
  const layoutData = useMemo(() => {
    if (containerWidth === 0) return { ganPaths: [], zhiPaths: [], typeLabels: [], totalHeight: 400, offsetY: 50 }

    const getNodeX = (idx: number) => idx * CONFIG.colWidth + CONFIG.colWidth / 2
    
    // 轨道分配算法
    const assignTracks = (rels: Relationship[]) => {
      const sorted = [...rels].sort((a, b) => {
        const spanA = Math.abs(a.from.pillar - a.to.pillar)
        const spanB = Math.abs(b.from.pillar - b.to.pillar)
        return spanA - spanB 
      })

      const tracks: { end: number }[] = []
      const results: { rel: Relationship, track: number }[] = []

      sorted.forEach(rel => {
        const start = Math.min(rel.from.pillar, rel.to.pillar)
        const end = Math.max(rel.from.pillar, rel.to.pillar)
        let assignedTrack = -1
        const buffer = isMobile ? 0.05 : 0.1 

        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].end < start - buffer) { 
                assignedTrack = i; tracks[i].end = end; break;
            }
        }
        if (assignedTrack === -1) { assignedTrack = tracks.length; tracks.push({ end }); }
        results.push({ rel, track: assignedTrack })
      })
      return { results, totalTracks: tracks.length }
    }

    // 1. 天干 (向上)
    let currentGanY = CONFIG.ganY - (isMobile ? 35 : 50) 
    const ganPaths: any[] = []
    const ganRels = cleanedRelationships.filter(r => r.from.type === 'gan' && r.to.type === 'gan')
    const typeLabelsGan: any[] = []

    relationshipTypes.filter(t => t.group === 'gan').forEach(type => {
      const typeRels = ganRels.filter(r => r.type === type.key)
      if (typeRels.length === 0) return
      const { results, totalTracks } = assignTracks(typeRels)
      
      const groupCenterY = currentGanY - ((totalTracks - 1) * CONFIG.trackHeight) / 2
      typeLabelsGan.push({ y: groupCenterY, label: type.label, color: type.color })

      results.forEach(({ rel, track }) => {
        const x1 = getNodeX(rel.from.pillar)
        const x2 = getNodeX(rel.to.pillar)
        const y = currentGanY - (track * CONFIG.trackHeight)
        const typeConf = relationshipTypes.find(t => t.key === rel.type)

        const pathD = `M ${x1} ${CONFIG.ganY - CONFIG.nodeRadius - (isMobile ? 10 : 20)} L ${x1} ${y} L ${x2} ${y} L ${x2} ${CONFIG.ganY - CONFIG.nodeRadius - (isMobile ? 10 : 20)}`

        ganPaths.push({
          d: pathD,
          color: typeConf?.color,
          label: rel.label,
          labelX: (x1 + x2) / 2, 
          labelY: y,
          originalRel: rel,
        })
      })
      if (typeRels.length > 0) currentGanY -= (totalTracks * CONFIG.trackHeight + CONFIG.groupGap)
    })

    // 2. 地支 (向下)
    let currentZhiY = CONFIG.zhiY + (isMobile ? 35 : 50)
    const zhiPaths: any[] = []
    const typeLabelsZhi: any[] = []
    const zhiRels = cleanedRelationships.filter(r => r.from.type === 'zhi' && r.to.type === 'zhi')

    relationshipTypes.filter(t => t.group === 'zhi').forEach(type => {
      const typeRels = zhiRels.filter(r => r.type === type.key)
      if (typeRels.length === 0) return
      const { results, totalTracks } = assignTracks(typeRels)
      
      const groupCenterY = currentZhiY + ((totalTracks - 1) * CONFIG.trackHeight) / 2
      typeLabelsZhi.push({ y: groupCenterY, label: type.label, color: type.color })

      results.forEach(({ rel, track }) => {
        const x1 = getNodeX(rel.from.pillar)
        const x2 = getNodeX(rel.to.pillar)
        const y = currentZhiY + (track * CONFIG.trackHeight)
        const typeConf = relationshipTypes.find(t => t.key === rel.type)

        zhiPaths.push({
          d: `M ${x1} ${CONFIG.zhiY + CONFIG.nodeRadius} L ${x1} ${y} L ${x2} ${y} L ${x2} ${CONFIG.zhiY + CONFIG.nodeRadius}`,
          color: typeConf?.color,
          label: rel.label,
          labelX: (x1 + x2) / 2, 
          labelY: y,
          originalRel: rel
        })
      })
      if (typeRels.length > 0) currentZhiY += (totalTracks * CONFIG.trackHeight + CONFIG.groupGap)
    })

    const totalHeight = Math.max(currentZhiY + 30, 400)
    const topPadding = Math.abs(Math.min(currentGanY, 0)) + 40

    return { 
      ganPaths, 
      zhiPaths, 
      typeLabels: [...typeLabelsGan, ...typeLabelsZhi],
      totalHeight: totalHeight + topPadding,
      offsetY: topPadding 
    }
  }, [cleanedRelationships, relationshipTypes, CONFIG, containerWidth, isMobile])

  return (
    <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden p-4 md:p-6" ref={containerRef}>
      <div className="mb-6">
        <h3 className="text-base md:text-lg font-serif font-bold text-stone-800 mb-1">刑冲會合法則</h3>
        <p className="text-[0.625rem] md:text-xs text-stone-500">
          天干地支能量交互网络 (点击高亮)
        </p>
      </div>

      <div 
        className="relative w-full select-none bg-stone-50/20 rounded-lg border border-stone-100/50" 
        style={{ height: `${layoutData.totalHeight}px` }}
      >
        
        {/* 背景参考线 */}
        <div className="absolute inset-0 pointer-events-none">
          {[0, 1, 2, 3].map(i => (
             <div 
               key={i} 
               className="absolute top-0 bottom-0 border-l border-dashed border-stone-200" 
               style={{ left: `${i * 25 + 12.5}%` }} 
             />
          ))}
        </div>

        {/* SVG 线条层 */}
        <svg 
          className="absolute inset-0 w-full h-full z-10 pointer-events-none" 
          viewBox={`0 0 ${CONFIG.canvasWidth} ${layoutData.totalHeight}`}
          preserveAspectRatio="none" 
        >
          <g transform={`translate(0, ${layoutData.offsetY})`}>
              {layoutData.ganPaths.concat(layoutData.zhiPaths).map((item, idx) => {
                const originalIdx = cleanedRelationships.indexOf(item.originalRel)
                const isHovered = hoveredRelIndex === originalIdx
                const isDimmed = hoveredRelIndex !== null && !isHovered
                const strokeColor = isHovered ? item.color : (isMobile ? item.color : `${item.color}CC`)

                return (
                  <g key={idx} className="transition-opacity duration-300" style={{ opacity: isDimmed ? 0.1 : 1 }}>
                    <path
                      d={item.d}
                      stroke={strokeColor}
                      strokeWidth={isHovered ? 2.5 : (isMobile ? 1.5 : 1.5)}
                      fill="none"
                      strokeLinejoin="round" 
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle cx={item.d.split(' ')[1]} cy={item.d.split(' ')[2]} r={isMobile?2:2.5} fill={strokeColor} />
                    <circle cx={item.d.split('L')[3].trim().split(' ')[0]} cy={item.d.split('L')[3].trim().split(' ')[1]} r={isMobile?2:2.5} fill={strokeColor} />
                  </g>
                )
              })}
          </g>
        </svg>

        {/* HTML 标签层 */}
        <div className="absolute inset-0 z-20 pointer-events-none" style={{ top: `${layoutData.offsetY}px` }}>
            {layoutData.ganPaths.concat(layoutData.zhiPaths).map((item, idx) => {
                const originalIdx = cleanedRelationships.indexOf(item.originalRel)
                const isHovered = hoveredRelIndex === originalIdx
                
                return (
                    <div
                        key={idx}
                        className="absolute pointer-events-auto cursor-pointer flex items-center justify-center transition-all duration-200"
                        style={{
                            left: `${Math.round(item.labelX)}px`,
                            top: `${Math.round(item.labelY)}px`,
                            transform: `translate(-50%, -50%) scale(${isHovered ? 1.1 : 1})`,
                            zIndex: isHovered ? 50 : 20,
                            width: 0, 
                            height: 0, 
                            overflow: 'visible' 
                        }}
                        onMouseEnter={() => setHoveredRelIndex(originalIdx)}
                        onMouseLeave={() => setHoveredRelIndex(null)}
                        onClick={() => setHoveredRelIndex(hoveredRelIndex === originalIdx ? null : originalIdx)}
                    >
                        <span 
                            className="bg-white border shadow-sm rounded-full whitespace-nowrap flex items-center justify-center leading-none"
                            style={{
                                fontSize: isMobile ? '0.5625rem' : '0.625rem',
                                padding: isMobile ? '0.1875rem 0.375rem' : '0.25rem 0.5rem',
                                color: item.color,
                                borderColor: isHovered ? item.color : 'transparent',
                                fontWeight: isHovered ? 'bold' : 'normal',
                                boxShadow: '0 0.0625rem 0.125rem rgba(0,0,0,0.05)',
                                fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif'
                            }}
                        >
                            {item.label}
                        </span>
                    </div>
                )
            })}
        </div>

        {/* 节点层 (HTML) */}
        <div className="absolute inset-0 z-30 pointer-events-none grid grid-cols-4 h-full" style={{ top: `${layoutData.offsetY}px` }}>
          {pillars.map((pillar, idx) => (
            <div key={idx} className="relative h-full">
              {/* 天干 */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
                style={{ top: `${CONFIG.ganY}px`, transform: 'translate(-50%, -50%)' }}
              >
                 <span className="text-[0.625rem] md:text-xs text-stone-400 font-serif mb-1 md:mb-2 block relative z-10 px-1.5 py-0.5 bg-[#FDFBF7] rounded border border-stone-100 shadow-sm whitespace-nowrap">
                    {pillar.label.substring(0,1)}柱
                 </span>
                 <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center z-10 pointer-events-auto hover:border-[#C82E31] transition-colors cursor-default">
                    <span className="font-serif font-bold text-base md:text-xl text-stone-800">{pillar.gan.char}</span>
                 </div>
              </div>

              {/* 地支 */}
              <div 
                 className="absolute left-1/2 -translate-x-1/2"
                 style={{ top: `${CONFIG.zhiY}px`, transform: 'translate(-50%, -50%)' }}
              >
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center z-10 pointer-events-auto hover:border-[#C82E31] transition-colors cursor-default">
                     <span className="font-serif font-bold text-base md:text-xl text-stone-800">{pillar.zhi.char}</span>
                  </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 底部图例 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {relationshipTypes.map((type) => {
          const count = cleanedRelationships.filter(r => r.type === type.key).length
          if (count === 0) return null
          return (
            <div key={type.key} className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-50 border border-stone-100">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: type.color }}></div>
              <span className="text-xs text-stone-600 truncate">{type.label}</span>
              <span className="ml-auto text-[0.625rem] text-stone-400 font-mono bg-white px-1.5 rounded">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
