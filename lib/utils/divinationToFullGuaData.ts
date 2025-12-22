import type { FullGuaData, GuaLineDetail } from '@/app/community/components/GuaPanelDual'
import { Solar } from 'lunar-javascript'
import { buildChangedLines, isYangLine, lineToNumber } from './divinationLineUtils'
import { calculateChangedLineDetails, calculateLineDetails, getFuShenAndGuaShen, getHexagramFullInfo, getHexagramNature } from './liuyaoDetails'
import { getGanZhiInfo, getKongWangPairForStemBranch, getLunarDateStringWithoutYear } from './lunar'
import { solarTermTextFrom } from './solarTerms'

// 定义后端数据类型
type BackendLine = {
  shi?: boolean
  ying?: boolean
  ganzhi?: string
  ganZhi?: string
  liuqin?: string
  liuQin?: string
  wuxing?: string
  wuXing?: string
  liushou?: string
  liuShou?: string
  yinYang?: 'yin' | 'yang'
  type?: number
}

type BackendRecord = {
  divination_time: string
  lines?: string[]
  changing_flags?: boolean[]
  original_json?: {
    name?: string
    gong?: string
    kongWang?: string
    lines?: BackendLine[]
  } | string
  changed_json?: {
    name?: string
    gong?: string
    lines?: BackendLine[]
  } | string
}

// 辅助函数：解析可能为 JSON 字符串的字段
const parseMaybeJson = <T>(value: T | string | undefined): T | undefined => {
  if (!value) return undefined
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch (err) {
    console.warn('Failed to parse JSON value', err)
    return undefined
  }
}

// 辅助函数：提取 Lines 数组
const extractLines = (json: any): BackendLine[] => {
  if (!json) return []
  if (Array.isArray(json.lines)) return json.lines
  if (Array.isArray(json.lineData)) return json.lineData
  if (Array.isArray(json.data)) return json.data
  return []
}

// 辅助函数：获取阴阳属性
const getLineType = (line: BackendLine | undefined, isMoving: boolean, lineStr?: string): 0 | 1 | 2 | 3 => {
  // 1. 尝试直接读取 type
  if (line?.type !== undefined) return line.type as 0 | 1 | 2 | 3

  // 2. 尝试读取 yinYang
  let isYang = false
  if (line?.yinYang === 'yang') isYang = true
  else if (line?.yinYang === 'yin') isYang = false
  else if (lineStr) {
    // 3. 使用统一的工具函数判断
    isYang = isYangLine(lineStr)
  }

  if (isMoving) return isYang ? 3 : 2
  return isYang ? 1 : 0
}

/**
 * 将 divination_record 转换为 FullGuaData 格式
 * 修复了 convertToLunar 未定义的问题，直接使用 lunar-javascript
 */
export function convertDivinationRecordToFullGuaData(record: any): FullGuaData | null {
  if (!record) return null

  try {
    const backendRecord = record as BackendRecord
    
    // 1. 解析 JSON
    const originalJson = parseMaybeJson(backendRecord.original_json) || {}
    const changedJson = parseMaybeJson(backendRecord.changed_json) || {}

    // 2. 时间处理 - 使用与排盘结果页相同的计算源
    const divinationTime = new Date(backendRecord.divination_time)
    
    // 日期格式化：与排盘结果页的 formatDateTime 保持一致
    const pad = (n: number) => n.toString().padStart(2, '0')
    const dateStr = `${divinationTime.getFullYear()}年${pad(divinationTime.getMonth() + 1)}月${pad(divinationTime.getDate())}日 ${pad(divinationTime.getHours())}:${pad(divinationTime.getMinutes())}`

    // 使用 getGanZhiInfo 获取干支信息（与排盘结果页一致）
    const ganZhiInfo = getGanZhiInfo(divinationTime)
    const stems = ganZhiInfo.stems || []
    const branches = ganZhiInfo.branches || []
    
    if (stems.length < 4 || branches.length < 4) {
      console.warn('Invalid ganZhi data')
      return null
    }

    // 四柱：使用与排盘结果页相同的格式
    const fourPillars = {
      year: `${stems[0].char}${branches[0].char}`,
      month: `${stems[1].char}${branches[1].char}`,
      day: `${stems[2].char}${branches[2].char}`,
      hour: `${stems[3].char}${branches[3].char}`,
    }

    // 农历信息：使用 getLunarDateStringWithoutYear 确保格式一致
    const lunarDateString = getLunarDateStringWithoutYear(divinationTime)
    const solar = Solar.fromDate(divinationTime)
    const lunar = solar.getLunar()
    
    // 农历年、月、时
    const lunarYear = `${lunar.getYearInGanZhi()}年`
    // 解析 getLunarDateStringWithoutYear 返回的格式（如："十月二十"）
    const lunarDateStr = lunarDateString
    const lunarHour = `${lunar.getTimeZhi()}时`
    
    // 节气：使用 solarTermTextFrom 工具（与排盘结果页一致）
    const solarTerm = solarTermTextFrom(divinationTime).split(' ~ ')[0]

    // 3. 空亡处理：使用与排盘结果页相同的 getKongWangPairForStemBranch
    const kongWang = getKongWangPairForStemBranch(stems[2].char, branches[2]?.char || '')

    // 4. 爻线数据准备
    const changingFlags = Array.isArray(backendRecord.changing_flags) 
      ? backendRecord.changing_flags 
      : Array(6).fill(false)
      
    const lineStrings = Array.isArray(backendRecord.lines) ? backendRecord.lines : []
    
    // 使用统一的工具函数解析爻线字符串为数值
    const parseLineToNumber = (line: string | undefined | null): number => {
      if (!line) return 7
      // 支持纯数字字符串
      if (/^[6789]$/.test(line.trim())) {
        return parseInt(line.trim(), 10) as 6 | 7 | 8 | 9
      }
      // 从字符串中提取数字
      if (/\d/.test(line)) {
        const n = parseInt(line.replace(/\D/g, ''), 10)
        if (!Number.isNaN(n) && [6, 7, 8, 9].includes(n)) return n as 6 | 7 | 8 | 9
      }
      // 使用统一的工具函数
      return lineToNumber(line)
    }
    
    const getHexKey = (lines: number[]) => {
      return lines.map(v => (v === 7 || v === 9 ? '1' : '0')).join('')
    }

    // 5. 计算本卦和变卦的 Key - 使用与排盘结果页相同的逻辑
    const originalKey = (record as any).original_key || (() => {
      const nums = lineStrings.map(l => {
        const num = parseLineToNumber(l)
        return num === 7 || num === 9 ? '1' : '0'
      })
      return nums.join('')
    })()
    
    const changedKey = (record as any).changed_key || (() => {
      const originalNums = lineStrings.map(l => parseLineToNumber(l))
      const changedNums = originalNums.map((val, idx) => {
        const isMoving = changingFlags[idx]
        if (!isMoving) {
          if (val === 6) return 8
          if (val === 9) return 7
          return val
        } else {
          if (val === 6 || val === 8) return 7
          if (val === 9 || val === 7) return 8
        }
        return val
      })
      return getHexKey(changedNums)
    })()

    // 6. 卦名处理 - 使用与排盘结果页相同的 getHexagramFullInfo 和 getHexagramNature
    const originalFullInfo = getHexagramFullInfo(originalKey)
    const changedFullInfo = getHexagramFullInfo(changedKey)
    
    // 获取卦象性质（宫位）
    const originalNature = getHexagramNature(originalKey, (originalJson as any).name || originalFullInfo.fullName || '未知卦')
    const changedNature = getHexagramNature(changedKey, (changedJson as any).name || changedFullInfo.fullName || '未知卦')
    
    // 使用完整卦名，如果没有则使用原始数据
    const originalName = originalFullInfo.fullName || (originalJson as any).name || '未知卦'
    const originalGong = originalNature.nature || (originalJson as any).gong || '本'

    const hasChange = changedFullInfo.fullName && (changedJson as any).name !== '未知'
    const changedName = hasChange ? (changedFullInfo.fullName || (changedJson as any).name) : undefined
    const changedGong = hasChange ? (changedNature.nature || (changedJson as any).gong || '变') : undefined

    // 7. 获取日干用于计算六兽（使用已获取的 stems）
    const dayStem = stems[2]?.char || ''
    
    // 8. 计算爻线详情 - 使用与排盘结果页相同的计算方法
    const lineDetails = calculateLineDetails(originalKey, lineStrings, dayStem)
    
    // 计算变卦详情 - 使用统一的工具函数
    const changedLinesStr = buildChangedLines(lineStrings, changingFlags)
    const changedLineDetails = calculateChangedLineDetails(
      changedKey, changedLinesStr, originalKey, lineStrings, changingFlags
    )

    // 9. 计算伏神和卦身
    const { fuShenMap, guaShen, guaShenLineIndex } = getFuShenAndGuaShen(
      originalKey,
      lineDetails,
      originalNature.nature || '乾宫',
      originalNature.element || '金'
    )

    const lines: FullGuaData['lines'] = []

    for (let i = 0; i < 6; i++) {
      const detail = lineDetails[i]
      const changedDetail = changedLineDetails[i]
      const lineStr = lineStrings[i]
      const num = parseLineToNumber(lineStr)
      const isMoving = !!changingFlags[i]
      
      // 确定 type: 0=少阴, 1=少阳, 2=老阴, 3=老阳
      // num: 7=少阳（阳爻）, 8=少阴（阴爻）, 6=老阴, 9=老阳
      let type: 0 | 1 | 2 | 3
      if (num === 6) type = 2 // 老阴（阴爻，动）
      else if (num === 9) type = 3 // 老阳（阳爻，动）
      else if (num === 7) type = 1 // 少阳（阳爻，静）
      else type = 0 // 少阴（阴爻，静），num === 8

      const original: GuaLineDetail = {
        index: i,
        type,
        liuQin: detail?.relationShort || '',
        ganZhi: detail ? `${detail.stem}${detail.branch}` : '',
        wuXing: detail?.element || '',
        liuShou: detail?.animalShort || '',
        isShi: detail?.isShi || false,
        isYing: detail?.isYing || false,
        isMoving: isMoving, // 使用 changingFlags 作为数据源
        fuShen: fuShenMap[i], // 添加伏神
      }

      // 为所有爻生成变卦信息（如果有变卦的话），完整展示变卦的所有6个爻
      // 如果有变卦（hasChange），即使是非动爻也要显示变卦信息
      let changed: { type: 0 | 1; liuQin: string; ganZhi: string; wuXing: string } | undefined = undefined

      if (hasChange && changedDetail) {
        // 确定变卦后的 type：根据变卦后的爻线字符串确定
        const changedLineStr = changedLinesStr[i]
        const changedNum = parseLineToNumber(changedLineStr)
        const changedType: 0 | 1 = changedNum === 7 ? 1 : 0 // 7=少阳(type 1), 8=少阴(type 0)
        
        changed = {
          type: changedType,
          liuQin: changedDetail.relationShort || '',
          ganZhi: `${changedDetail.stem}${changedDetail.branch}`,
          wuXing: changedDetail.element || ''
        }
      }

      lines.push({ original, changed })
    }

    return {
      dateStr,
      lunarYear,
      lunarDateStr,
      lunarHour,
      solarTerm,
      fourPillars,
      kongWang,
      originalName,
      originalGong,
      changedName,
      changedGong,
      fuShenMap,
      guaShen,
      guaShenLineIndex,
      lines,
    }
  } catch (error) {
    console.error('Error converting divination record to FullGuaData:', error)
    return null
  }
}