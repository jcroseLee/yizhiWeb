'use client'

import { Card, CardContent } from '@/lib/components/ui/card'
import { type BaZiResult } from '@/lib/utils/bazi'
import { cn } from '@/lib/utils/cn'
import { getGanZhiInfo } from '@/lib/utils/lunar'
import { getSolarTermDate } from '@/lib/utils/solarTerms'

interface BaZiDetailedTabProps {
  result: BaZiResult
  date: Date
  stems: Array<{ char: string }>
  branches: Array<{ char: string }>
}

export function BaZiDetailedTab(props: BaZiDetailedTabProps) {
  const { result, date } = props
  
  // --- 常量与辅助函数 ---
  const dayGan = result.pillars[2]?.gan.char || ''
  
  const SHI_SHEN_MAP: Record<string, Record<string, string>> = {
    '甲': { '甲': '比', '乙': '劫', '丙': '食', '丁': '伤', '戊': '偏', '己': '正', '庚': '杀', '辛': '官', '壬': '枭', '癸': '印' },
    '乙': { '甲': '劫', '乙': '比', '丙': '伤', '丁': '食', '戊': '正', '己': '偏', '庚': '官', '辛': '杀', '壬': '印', '癸': '枭' },
    '丙': { '甲': '枭', '乙': '印', '丙': '比', '丁': '劫', '戊': '食', '己': '伤', '庚': '偏', '辛': '正', '壬': '杀', '癸': '官' },
    '丁': { '甲': '印', '乙': '枭', '丙': '劫', '丁': '比', '戊': '伤', '己': '食', '庚': '正', '辛': '偏', '壬': '官', '癸': '杀' },
    '戊': { '甲': '杀', '乙': '官', '丙': '枭', '丁': '印', '戊': '比', '己': '劫', '庚': '食', '辛': '伤', '壬': '偏', '癸': '正' },
    '己': { '甲': '官', '乙': '杀', '丙': '印', '丁': '枭', '戊': '劫', '己': '比', '庚': '伤', '辛': '食', '壬': '正', '癸': '偏' },
    '庚': { '甲': '偏', '乙': '正', '丙': '杀', '丁': '官', '戊': '枭', '己': '印', '庚': '比', '辛': '劫', '壬': '食', '癸': '伤' },
    '辛': { '甲': '正', '乙': '偏', '丙': '官', '丁': '杀', '戊': '印', '己': '枭', '庚': '劫', '辛': '比', '壬': '伤', '癸': '食' },
    '壬': { '甲': '食', '乙': '伤', '丙': '偏', '丁': '正', '戊': '杀', '己': '官', '庚': '枭', '辛': '印', '壬': '比', '癸': '劫' },
    '癸': { '甲': '伤', '乙': '食', '丙': '正', '丁': '偏', '戊': '官', '己': '杀', '庚': '印', '辛': '枭', '壬': '劫', '癸': '比' },
  }

  const getShiShen = (gan: string) => SHI_SHEN_MAP[dayGan]?.[gan] || ''

  const STEM_WUXING: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
    '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water',
  }

  const BRANCH_WUXING: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
    '子': 'water', '亥': 'water', '寅': 'wood', '卯': 'wood', '巳': 'fire', '午': 'fire',
    '申': 'metal', '酉': 'metal', '丑': 'earth', '辰': 'earth', '未': 'earth', '戌': 'earth',
  }

  const getTextColor = (wuxing?: string) => {
    if (!wuxing) return 'text-stone-500'
    switch (wuxing) {
      case 'wood': return 'text-wood'
      case 'fire': return 'text-fire'
      case 'earth': return 'text-earth'
      case 'metal': return 'text-metal'
      case 'water': return 'text-water'
      default: return 'text-stone-800'
    }
  }

  const shortShiShen = (full: string) => {
    if (!full) return ''
    if (full === '元男' || full === '元女') return '日元'
    if (full.includes('比')) return '比'
    if (full.includes('劫')) return '劫'
    if (full.includes('食')) return '食'
    if (full.includes('伤')) return '伤'
    if (full.includes('杀')) return '杀'
    if (full.includes('官')) return '官'
    if (full.includes('枭') || full.includes('偏印')) return '枭'
    if (full.includes('印')) return '印'
    if (full.includes('才') || full.includes('财')) return '才'
    return full
  }

  const addYears = (d: Date, years: number) => {
    const next = new Date(d)
    next.setFullYear(next.getFullYear() + years)
    return next
  }

  const formatAge = (value: number) => {
    if (!Number.isFinite(value)) return '--'
    const floored = Math.max(0, Math.floor(value))
    return `${floored}岁`
  }

  const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  const isYangStem = (gan: string) => ['甲', '丙', '戊', '庚', '壬'].includes(gan)

  // --- 核心修复 1: 只获取“节”（Jie），过滤掉“气”（Qi） ---
  // 八字起运只看节（立春、惊蛰...），不看气（雨水、春分...）
  // getSolarTermDate 的索引 0=小寒(节), 1=大寒(气), 2=立春(节), 3=雨水(气)...
  // 偶数索引为节，奇数索引为气
  const getPrevNextJie = (birth: Date) => {
    const yearsToCheck = [birth.getFullYear() - 1, birth.getFullYear(), birth.getFullYear() + 1]
    const terms: Array<{ name: string; date: Date }> = []
    const names = [
      '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
      '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
      '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
    ]
    for (const y of yearsToCheck) {
      for (let i = 0; i < 24; i++) {
        // 关键修复：只保留偶数索引（节），跳过奇数索引（气）
        if (i % 2 !== 0) continue 
        terms.push({ name: names[i] || '', date: getSolarTermDate(y, i) })
      }
    }
    terms.sort((a, b) => a.date.getTime() - b.date.getTime())

    let prev = terms[0]
    let next = terms[terms.length - 1]
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i]
      if (t.date.getTime() <= birth.getTime()) prev = t
      if (t.date.getTime() > birth.getTime()) {
        next = t
        break
      }
    }
    return { prev, next }
  }

  // --- 核心修复 2: 计算起运逻辑 ---
  const getQiYun = () => {
    const yearStem = result.pillars[0]?.gan.char || ''
    const isForward = (() => {
      if (!yearStem) return true
      const yang = isYangStem(yearStem)
      const gender = result.basic.gender // '乾造' | '坤造'
      
      // 乾造：阳年顺排，阴年逆排
      // 坤造：阳年逆排，阴年顺排
      if (gender === '乾造') {
        return yang
      } else {
        return !yang
      }
    })()

    // 使用修正后的 getPrevNextJie
    const { prev, next } = getPrevNextJie(date)
    
    // 计算时间差
    const diffMs = isForward ? (next.date.getTime() - date.getTime()) : (date.getTime() - prev.date.getTime())
    const diffDays = Math.max(0, diffMs / 86400000)

    // 折算岁数：3天 = 1岁，1天 = 4个月，1时 = 5天
    const totalMonths = diffDays * 4 // 1天=4个月
    const years = Math.floor(totalMonths / 12)
    const months = Math.floor(totalMonths - years * 12)
    // 剩余天数计算
    const daysFloat = (totalMonths - years * 12 - months) * 30
    const days = Math.floor(daysFloat)
    const hours = Math.round((daysFloat - days) * 24)

    const startAgeYears = years + months / 12 + days / 360 + hours / (360 * 24)
    const startDate = new Date(date.getTime() + startAgeYears * 365.2425 * 86400000)

    return {
      isForward,
      prev,
      next,
      startAgeYears,
      startDate,
      breakdown: { years, months, days, hours },
    }
  }

  const qiYun = getQiYun()

  // --- 生成大运列表 ---
  const getDaYunList = () => {
    const yearGan = result.pillars[0]?.gan.char || '' 
    const monthGan = result.pillars[1]?.gan.char || '' 
    const monthZhi = result.pillars[1]?.zhi.char || '' 
    
    const ganIndex = HEAVENLY_STEMS.indexOf(monthGan)
    const zhiIndex = EARTHLY_BRANCHES.indexOf(monthZhi)
    
    if (!yearGan || ganIndex < 0 || zhiIndex < 0) return []

    // 顺逆排逻辑已在 getQiYun 中确定
    const { isForward } = qiYun
    
    const directionStep = isForward ? 1 : -1
    const list = Array.from({ length: 8 }).map((_, i) => {
      const offset = directionStep * (i + 1)
      
      const gIndex = (ganIndex + offset + 1200) % 10
      const zIndex = (zhiIndex + offset + 1200) % 12
      
      const g = HEAVENLY_STEMS[gIndex]
      const z = EARTHLY_BRANCHES[zIndex]
      
      // 大运起止时间
      const startAge = qiYun.startAgeYears + i * 10
      const endAge = startAge + 9.999
      
      const birthYear = date.getFullYear()
      const startYear = Math.floor(birthYear + startAge)
      const endYear = Math.floor(birthYear + endAge)

      // 判断当前大运
      const now = new Date()
      const currentYear = now.getFullYear()
      // 判断逻辑：当前年份在区间内，或者当前日期大于起运日期（更精确）
      const startDate = addYears(qiYun.startDate, i * 10)
      const endDate = addYears(qiYun.startDate, (i + 1) * 10)
      
      // 使用精确日期判断
      const isCurrent = now.getTime() >= startDate.getTime() && now.getTime() < endDate.getTime()

      return {
        gan: g,
        zhi: z,
        ganWuxing: STEM_WUXING[g],
        zhiWuxing: BRANCH_WUXING[z],
        startYear,
        endYear,
        startAge: Math.floor(startAge), 
        endAge: Math.floor(endAge),     
        isCurrent,
      }
    })

    return list
  }

  const daYunList = getDaYunList()
  const currentDaYun = daYunList.find(d => d.isCurrent) || daYunList[0]

  // --- 其他流年流月流日流时逻辑 (保持不变) ---
  const now = new Date()
  const nowGanZhi = getGanZhiInfo(now)
  // 此处逻辑修正：如果还没过立春，流年干支应该显示上一年的
  // getGanZhiInfo 内部通常已经处理了节气，这里直接使用即可
  
  const nowYear = `${nowGanZhi.stems[0]?.char || ''}${nowGanZhi.branches[0]?.char || ''}`
  const nowMonth = `${nowGanZhi.stems[1]?.char || ''}${nowGanZhi.branches[1]?.char || ''}`
  const nowDay = `${nowGanZhi.stems[2]?.char || ''}${nowGanZhi.branches[2]?.char || ''}`
  const nowHour = `${nowGanZhi.stems[3]?.char || ''}${nowGanZhi.branches[3]?.char || ''}`

  const getMonthTermItems = () => {
    const currentYear = now.getFullYear()
    const spring = getSolarTermDate(currentYear, 2)
    const cycleYear = now >= spring ? currentYear : currentYear - 1
    const items = [
      { term: '立春', year: cycleYear, index: 2 },
      { term: '惊蛰', year: cycleYear, index: 4 },
      { term: '清明', year: cycleYear, index: 6 },
      { term: '立夏', year: cycleYear, index: 8 },
      { term: '芒种', year: cycleYear, index: 10 },
      { term: '小暑', year: cycleYear, index: 12 },
      { term: '立秋', year: cycleYear, index: 14 },
      { term: '白露', year: cycleYear, index: 16 },
      { term: '寒露', year: cycleYear, index: 18 },
      { term: '立冬', year: cycleYear, index: 20 },
      { term: '大雪', year: cycleYear, index: 22 },
      { term: '小寒', year: cycleYear + 1, index: 0 },
    ]
    return items.map(it => {
      const termDate = getSolarTermDate(it.year, it.index)
      const after = new Date(termDate.getTime() + 60_000)
      const gz = getGanZhiInfo(after)
      const gan = gz.stems[1]?.char || ''
      const zhi = gz.branches[1]?.char || ''
      const ganShiShen = getShiShen(gan)
      const zhiShiShen = getShiShen(zhi)
      return {
        term: it.term,
        date: termDate,
        gan,
        zhi,
        ganShiShen,
        zhiShiShen,
      }
    })
  }

  const monthTermItems = getMonthTermItems()

  const getDaysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate()
  const getMonthStartWeekday = (year: number, monthIndex: number) => new Date(year, monthIndex, 1).getDay()

  const currentMonthYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()
  const daysInCurrentMonth = getDaysInMonth(currentMonthYear, currentMonthIndex)
  const startWeekday = getMonthStartWeekday(currentMonthYear, currentMonthIndex)
  const dayCellsCount = Math.ceil((startWeekday + daysInCurrentMonth) / 7) * 7

  const dayCells = Array.from({ length: dayCellsCount }).map((_, idx) => {
    const dayNum = idx - startWeekday + 1
    if (dayNum < 1 || dayNum > daysInCurrentMonth) return null
    const d = new Date(currentMonthYear, currentMonthIndex, dayNum, 12, 0, 0)
    const gz = getGanZhiInfo(d)
    const gan = gz.stems[2]?.char || ''
    const zhi = gz.branches[2]?.char || ''
    const isToday = dayNum === now.getDate()
    return { dayNum, gan, zhi, isToday }
  })

  const hourItems = Array.from({ length: 12 }).map((_, i) => {
    const hour = i * 2
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0)
    const gz = getGanZhiInfo(d)
    const gan = gz.stems[3]?.char || ''
    const zhi = gz.branches[3]?.char || ''
    const isCurrent = Math.floor((now.getHours() + 1) / 2) % 12 === i
    return { hour, gan, zhi, isCurrent }
  })

  const summaryColumns = [
    {
      label: '年柱',
      shiShen: shortShiShen(result.pillars[0]?.zhuXing || ''),
      gan: result.pillars[0]?.gan.char || '',
      zhi: result.pillars[0]?.zhi.char || '',
      ganWuxing: result.pillars[0]?.gan.wuxing,
      zhiWuxing: result.pillars[0]?.zhi.wuxing,
    },
    {
      label: '月柱',
      shiShen: shortShiShen(result.pillars[1]?.zhuXing || ''),
      gan: result.pillars[1]?.gan.char || '',
      zhi: result.pillars[1]?.zhi.char || '',
      ganWuxing: result.pillars[1]?.gan.wuxing,
      zhiWuxing: result.pillars[1]?.zhi.wuxing,
    },
    {
      label: '日柱',
      shiShen: '日元',
      gan: result.pillars[2]?.gan.char || '',
      zhi: result.pillars[2]?.zhi.char || '',
      ganWuxing: result.pillars[2]?.gan.wuxing,
      zhiWuxing: result.pillars[2]?.zhi.wuxing,
    },
    {
      label: '时柱',
      shiShen: shortShiShen(result.pillars[3]?.zhuXing || ''),
      gan: result.pillars[3]?.gan.char || '',
      zhi: result.pillars[3]?.zhi.char || '',
      ganWuxing: result.pillars[3]?.gan.wuxing,
      zhiWuxing: result.pillars[3]?.zhi.wuxing,
    },
    {
      label: '大运',
      shiShen: currentDaYun?.gan ? getShiShen(currentDaYun.gan) : '',
      gan: currentDaYun?.gan || '',
      zhi: currentDaYun?.zhi || '',
      ganWuxing: currentDaYun?.gan ? STEM_WUXING[currentDaYun.gan] : undefined,
      zhiWuxing: currentDaYun?.zhi ? BRANCH_WUXING[currentDaYun.zhi] : undefined,
    },
    {
      label: '流年',
      shiShen: nowGanZhi.stems[0]?.char ? getShiShen(nowGanZhi.stems[0].char) : '',
      gan: nowGanZhi.stems[0]?.char || '',
      zhi: nowGanZhi.branches[0]?.char || '',
      ganWuxing: nowGanZhi.stems[0]?.char ? STEM_WUXING[nowGanZhi.stems[0].char] : undefined,
      zhiWuxing: nowGanZhi.branches[0]?.char ? BRANCH_WUXING[nowGanZhi.branches[0].char] : undefined,
    },
    {
      label: '流月',
      shiShen: nowGanZhi.stems[1]?.char ? getShiShen(nowGanZhi.stems[1].char) : '',
      gan: nowGanZhi.stems[1]?.char || '',
      zhi: nowGanZhi.branches[1]?.char || '',
      ganWuxing: nowGanZhi.stems[1]?.char ? STEM_WUXING[nowGanZhi.stems[1].char] : undefined,
      zhiWuxing: nowGanZhi.branches[1]?.char ? BRANCH_WUXING[nowGanZhi.branches[1].char] : undefined,
    },
    {
      label: '流日',
      shiShen: nowGanZhi.stems[2]?.char ? getShiShen(nowGanZhi.stems[2].char) : '',
      gan: nowGanZhi.stems[2]?.char || '',
      zhi: nowGanZhi.branches[2]?.char || '',
      ganWuxing: nowGanZhi.stems[2]?.char ? STEM_WUXING[nowGanZhi.stems[2].char] : undefined,
      zhiWuxing: nowGanZhi.branches[2]?.char ? BRANCH_WUXING[nowGanZhi.branches[2].char] : undefined,
    },
    {
      label: '流时',
      shiShen: nowGanZhi.stems[3]?.char ? getShiShen(nowGanZhi.stems[3].char) : '',
      gan: nowGanZhi.stems[3]?.char || '',
      zhi: nowGanZhi.branches[3]?.char || '',
      ganWuxing: nowGanZhi.stems[3]?.char ? STEM_WUXING[nowGanZhi.stems[3].char] : undefined,
      zhiWuxing: nowGanZhi.branches[3]?.char ? BRANCH_WUXING[nowGanZhi.branches[3].char] : undefined,
    },
  ]
  
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .text-wood { color: #3A7B5E; }
        .text-fire { color: #C82E31; }
        .text-earth { color: #8D6E63; }
        .text-metal { color: #D4AF37; }
        .text-water { color: #4B7BB6; }
      ` }} />
      <div className="space-y-6">
      <Card className="glass-panel rounded-xl overflow-hidden shadow-sm">
        <CardContent className="p-4 lg:p-6">
          <div className="space-y-3 text-sm text-stone-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 w-20 shrink-0">起运:</span>
              <span className="font-serif">
                出生后{qiYun.breakdown.years}年{qiYun.breakdown.months}月{qiYun.breakdown.days}天{qiYun.breakdown.hours}时起运
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 w-20 shrink-0">交运:</span>
              <span className="font-serif">
                {qiYun.isForward ? '顺排' : '逆排'}（{qiYun.isForward ? '至后' : '至前'}一节令：
                {qiYun.isForward ? qiYun.next.name : qiYun.prev.name}）
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 w-20 shrink-0">司令:</span>
              <span className="font-serif text-[#C82E31] font-medium">{result.pillars[1]?.zhi.char || '--'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel rounded-xl overflow-hidden shadow-sm">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-serif font-bold text-stone-800">当前运势汇总</h3>
              <div className="text-xs text-stone-500 mt-1">
                大运 {currentDaYun ? `${currentDaYun.gan}${currentDaYun.zhi}` : '--'} · 流年 {nowYear} · 流月 {nowMonth} · 流日 {nowDay} · 流时 {nowHour}
              </div>
            </div>
            <div className="text-xs text-stone-400">
              流年 {formatAge(now.getFullYear() - date.getFullYear() + 1)}
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {summaryColumns.map((col) => (
              <div key={col.label} className="rounded-lg border bg-stone-50/50 border-stone-200/50 px-2 py-2 text-center">
                <div className="text-[0.625rem] text-stone-500 mb-1">{col.label}</div>
                <div className="text-xs font-medium text-stone-600 mb-1">{col.shiShen}</div>
                <div className={cn("text-lg font-serif font-bold leading-tight", getTextColor(col.ganWuxing))}>{col.gan || '--'}</div>
                <div className={cn("text-lg font-serif font-bold leading-tight", getTextColor(col.zhiWuxing))}>{col.zhi || '--'}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 大运列表 */}
      <Card className="glass-panel rounded-xl overflow-hidden shadow-sm">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-serif font-bold text-stone-800">大运</h3>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-max pb-2">
              {daYunList.map((yun, i) => {
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg border min-w-[5.625rem]",
                      yun.isCurrent
                        ? "bg-[#C82E31]/10 border-[#C82E31]/30 shadow-sm"
                        : "bg-stone-50/50 border-stone-200/50"
                    )}
                  >
                    <div className="text-xs text-stone-500 text-center">
                      {yun.startYear} {`${yun.startAge}~${yun.endAge}岁`}
                    </div>
                    <div className={cn(
                      "text-base font-serif font-bold",
                      yun.isCurrent ? "text-[#C82E31]" : "text-stone-700"
                    )}>
                      {yun.gan}{yun.zhi}
                    </div>
                    <div className="text-[0.625rem] text-stone-500 text-center">
                      {getShiShen(yun.gan)} {getShiShen(yun.zhi)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 此处省略 流年、流月、流日、流时 的UI渲染代码，因逻辑未变动，保持原样即可 */}
      <Card className="glass-panel rounded-xl overflow-hidden shadow-sm">
        <CardContent className="p-4 lg:p-6">
          <h3 className="text-base font-serif font-bold text-stone-800 mb-4">流年</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              {Array.from({ length: 10 }).map((_, i) => {
                const year = new Date().getFullYear() + (i - 5)
                const isCurrent = i === 5
                const anchor = new Date(year, 6, 1, 12, 0, 0)
                const gz = getGanZhiInfo(anchor)
                const gan = gz.stems[0]?.char || ''
                const zhi = gz.branches[0]?.char || ''
                const ganShiShen = getShiShen(gan)
                const zhiShiShen = getShiShen(zhi)
                const age = year - date.getFullYear() + 1
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-1.5 rounded border min-w-[4.0625rem]",
                      isCurrent
                        ? "bg-[#C82E31]/10 border-[#C82E31]/30 shadow-sm"
                        : "bg-stone-50/50 border-stone-200/50"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium",
                      isCurrent ? "text-[#C82E31] font-bold" : "text-stone-700"
                    )}>{year}</div>
                    <div className="text-[0.625rem] text-stone-400">{age > 0 ? `${age}岁` : '--'}</div>
                    <div className={cn(
                      "text-sm font-serif font-medium",
                      isCurrent ? "text-[#C82E31]" : "text-stone-600"
                    )}>
                      {gan}{zhi}
                    </div>
                    <div className="text-[0.625rem] text-stone-500">
                      {ganShiShen} {zhiShiShen}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

       {/* 流月 */}
       <Card className="glass-panel rounded-xl overflow-hidden shadow-sm">
        <CardContent className="p-4 lg:p-6">
          <h3 className="text-base font-serif font-bold text-stone-800 mb-4">流月</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              {monthTermItems.map((item, i) => {
                const gan = item.gan
                const zhi = item.zhi
                const ganShiShen = item.ganShiShen
                const zhiShiShen = item.zhiShiShen
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 px-2 py-1.5 rounded border bg-stone-50/50 border-stone-200/50 min-w-[4.0625rem]"
                  >
                    <div className="text-xs text-stone-500">{item.term}</div>
                    <div className="text-[0.625rem] text-stone-400">{item.date.getMonth() + 1}/{item.date.getDate()}</div>
                    <div className="text-sm font-serif font-medium text-stone-700">
                      {gan}{zhi}
                    </div>
                    <div className="text-[0.625rem] text-stone-500">
                      {ganShiShen} {zhiShiShen}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel rounded-xl overflow-hidden shadow-sm">
        <CardContent className="p-4 lg:p-6">
          <h3 className="text-base font-serif font-bold text-stone-800 mb-4">流日</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              {dayCells.map((cell, idx) => {
                if (!cell) return null
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-1.5 rounded border min-w-[4.0625rem]",
                      cell.isToday
                        ? "bg-[#C82E31]/10 border-[#C82E31]/30 shadow-sm"
                        : "bg-stone-50/50 border-stone-200/50"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-serif font-semibold",
                      cell.isToday ? "text-[#C82E31]" : "text-stone-700"
                    )}>
                      {cell.gan}{cell.zhi}
                    </div>
                    <div className={cn(
                      "text-xs",
                      cell.isToday ? "text-[#C82E31] font-bold" : "text-stone-500"
                    )}>
                      {cell.dayNum}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel rounded-xl overflow-hidden shadow-sm">
        <CardContent className="p-4 lg:p-6">
          <h3 className="text-base font-serif font-bold text-stone-800 mb-4">流时</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              {hourItems.map((it, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded border min-w-[3.875rem]",
                    it.isCurrent
                      ? "bg-[#C82E31]/10 border-[#C82E31]/30 shadow-sm"
                      : "bg-stone-50/50 border-stone-200/50"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium",
                    it.isCurrent ? "text-[#C82E31] font-bold" : "text-stone-700"
                  )}>
                    {it.zhi}时
                  </div>
                  <div className={cn(
                    "text-sm font-serif font-medium",
                    it.isCurrent ? "text-[#C82E31]" : "text-stone-600"
                  )}>
                    {it.gan}{it.zhi}
                  </div>
                  <div className="text-[0.625rem] text-stone-500">
                    {getShiShen(it.gan)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  )
}