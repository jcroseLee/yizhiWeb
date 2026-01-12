import { getSolarTermDate } from './solarTerms'

const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0,
  0x09ad0, 0x055d2, 0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540,
  0x0d6a0, 0x0ada2, 0x095b0, 0x14977, 0x04970, 0x0a4b0, 0x0b4b5, 0x06a50,
  0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, 0x06566, 0x0d4a0,
  0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2,
  0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573,
  0x052d0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4,
  0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5,
  0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46,
  0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58,
  0x055c0, 0x0ab60, 0x096d5, 0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50,
  0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, 0x0a950, 0x0b4a0,
  0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260,
  0x0ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0,
  0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0,
  0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370,
  0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0,
  0x0a6d0, 0x055d4, 0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50,
  0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, 0x0b273, 0x06930, 0x07337, 0x06aa0,
  0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, 0x0e968, 0x0d520,
  0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0,
  0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370, 0x049f8, 0x04970,
  0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, 0x0a2e0, 0x0d2e3,
  0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4,
  0x0a5b0, 0x052b0, 0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55,
  0x04b60, 0x0a570, 0x054e4, 0x0d160, 0x0e968, 0x0d520, 0x0daa0, 0x16aa6
] as const

const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
] as const

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
] as const

const EARTHLY_BRANCHES_FOR_HOUR = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'
] as const

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

const STEM_TONE_MAP: Record<string, string> = {
  '甲': 'green',
  '乙': 'green',
  '丙': 'red',
  '丁': 'red',
  '戊': 'brown',
  '己': 'brown',
  '庚': 'orange',
  '辛': 'orange',
  '壬': 'blue',
  '癸': 'blue',
}

const BRANCH_TONE_MAP: Record<string, string> = {
  '子': 'blue',
  '丑': 'brown',
  '寅': 'green',
  '卯': 'green',
  '辰': 'brown',
  '巳': 'red',
  '午': 'red',
  '未': 'brown',
  '申': 'orange',
  '酉': 'orange',
  '戌': 'brown',
  '亥': 'blue',
}

const yearDays = (year: number) => {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_INFO[year - 1900] & i) ? 1 : 0
  }
  return sum + leapDays(year)
}

const leapMonth = (year: number) => LUNAR_INFO[year - 1900] & 0xf

const leapDays = (year: number) => {
  const lm = leapMonth(year)
  if (lm) {
    return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29
  }
  return 0
}

const monthDays = (year: number, month: number) => (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29

export const convertToLunar = (date: Date): { year: number; month: number; day: number; isLeap: boolean } => {
  const baseDate = new Date(1900, 0, 31)
  let offset = Math.floor((date.getTime() - baseDate.getTime()) / 86400000)

  let year = 1900
  while (year < 2100 && offset >= yearDays(year)) {
    offset -= yearDays(year)
    year += 1
  }

  const leap = leapMonth(year)
  let isLeap = false
  let month = 1

  while (month <= 12 && offset >= 0) {
    if (leap > 0 && month === leap + 1 && !isLeap) {
      const leapDaysCount = leapDays(year)
      if (offset < leapDaysCount) {
        isLeap = true
        break
      }
      offset -= leapDaysCount
      isLeap = false
    }

    const days = monthDays(year, month)
    if (offset < days) {
      break
    }
    offset -= days
    month += 1
  }

  const day = offset + 1
  return { year, month, day, isLeap }
}

/**
 * 从农历日期转换为公历日期
 * 使用遍历验证的方法，确保准确性
 * @param lunarYear 农历年
 * @param lunarMonth 农历月 (1-12)
 * @param lunarDay 农历日 (1-30)
 * @param isLeap 是否为闰月
 * @returns 对应的公历日期，如果找不到则返回 undefined
 */
export const convertLunarToSolar = (
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeap: boolean = false
): Date | undefined => {
  if (lunarYear < 1900 || lunarYear >= 2100) {
    return undefined
  }

  const leap = leapMonth(lunarYear)
  
  // 验证闰月参数
  if (isLeap && (leap === 0 || lunarMonth !== leap)) {
    // 该年份没有闰月，或者闰月位置不对
    return undefined
  }

  // 使用更简单的方法：在可能的日期范围内搜索
  // 农历年份对应的公历年份范围大约是 lunarYear-1 到 lunarYear+1
  const startYear = Math.max(1900, lunarYear - 1)
  const endYear = Math.min(2099, lunarYear + 1)
  
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const testDate = new Date(year, month, day)
        const lunar = convertToLunar(testDate)
        if (
          lunar.year === lunarYear &&
          lunar.month === lunarMonth &&
          lunar.day === lunarDay &&
          lunar.isLeap === isLeap
        ) {
          return testDate
        }
      }
    }
  }

  return undefined
}

export const getChineseHourIndex = (hours: number) => Math.floor((hours + 1) / 2) % 12
export const getChineseHour = (hours: number) => EARTHLY_BRANCHES_FOR_HOUR[getChineseHourIndex(hours)]

// 时辰代码到时辰名称的映射（用于农历模式）
const HOUR_CODE_TO_NAME: Record<string, string> = {
  'zi': '子', 'chou': '丑', 'yin': '寅', 'mao': '卯', 'chen': '辰', 'si': '巳',
  'wu': '午', 'wei': '未', 'shen': '申', 'you': '酉', 'xu': '戌', 'hai': '亥',
}

// 时辰代码到地支索引的映射（用于计算时柱）
const HOUR_CODE_TO_INDEX: Record<string, number> = {
  'zi': 0, 'chou': 1, 'yin': 2, 'mao': 3, 'chen': 4, 'si': 5,
  'wu': 6, 'wei': 7, 'shen': 8, 'you': 9, 'xu': 10, 'hai': 11,
}

const getStemTone = (stem: string) => STEM_TONE_MAP[stem] ?? 'green'
const getBranchTone = (branch: string) => BRANCH_TONE_MAP[branch] ?? 'green'

export const getLunarDateString = (date: Date, selectedHour?: string) => {
  const lunar = convertToLunar(date)
  const monthIndex = (lunar.month - 1 + 12) % 12
  const dayIndex = (lunar.day - 1 + 30) % 30

  const yearText = `${lunar.year}年`
  const monthText = `${lunar.isLeap ? '闰' : ''}${LUNAR_MONTH_NAMES[monthIndex] ?? ''}`
  const dayText = LUNAR_DAY_NAMES[dayIndex] ?? ''

  // 如果提供了用户选择的时辰（农历模式），使用它；否则从日期推导
  const hourText = selectedHour && HOUR_CODE_TO_NAME[selectedHour] 
    ? HOUR_CODE_TO_NAME[selectedHour]
    : getChineseHour(date.getHours())
  return `${yearText}${monthText}${dayText} ${hourText}时`
}

export const getLunarDateStringWithoutYear = (date: Date, selectedHour?: string) => {
  const lunar = convertToLunar(date)
  const monthIndex = (lunar.month - 1 + 12) % 12
  const dayIndex = (lunar.day - 1 + 30) % 30

  const monthText = `${lunar.isLeap ? '闰' : ''}${LUNAR_MONTH_NAMES[monthIndex] ?? ''}`
  const dayText = LUNAR_DAY_NAMES[dayIndex] ?? ''
  // 如果提供了用户选择的时辰（农历模式），使用它；否则从日期推导
  const hourText = selectedHour && HOUR_CODE_TO_NAME[selectedHour] 
    ? HOUR_CODE_TO_NAME[selectedHour]
    : getChineseHour(date.getHours())
  return `${monthText}${dayText} ${hourText}时`
}

/**
 * 获取干支信息
 * @param date 日期对象
 * @param earlyZiHour 是否使用早晚子时
 * @param selectedHour 用户选择的时辰代码（农历模式，如 'xu' 表示戌时），如果提供则用于计算时柱地支
 */
export const getGanZhiInfo = (date: Date, earlyZiHour: boolean = false, selectedHour?: string) => {
  const year = date.getFullYear()
  let hour = date.getHours()
  let dateForDayPillar = date
  let dateForHourStem = date // 用于计算时柱天干的日期

  // 早晚子时处理
  // 早子时（23:00-00:00）：日柱和时柱天干都用第二天的日干计算
  // 晚子时（00:00-01:00）：日柱和时柱天干都用第二天的日干计算
  if (earlyZiHour) {
    if (hour >= 23 || hour < 1) {
      // 子时范围：23:00-01:00
      if (hour >= 23) {
        // 早子时（23:00-00:00）：日柱和时柱天干都用第二天的日干
        dateForDayPillar = new Date(date)
        dateForDayPillar.setDate(dateForDayPillar.getDate() + 1)
        dateForHourStem = dateForDayPillar
      } else if (hour >= 0 && hour < 1) {
        // 晚子时（00:00-01:00）：日柱和时柱天干都用第二天的日干
        dateForDayPillar = new Date(date)
        dateForDayPillar.setDate(dateForDayPillar.getDate() + 1)
        dateForHourStem = dateForDayPillar
      }
    }
  } else {
    // 传统方式：23:00-01:00 都使用当天的日柱
    // 保持原有逻辑，不改变 dateForDayPillar 和 dateForHourStem
  }

  // 年柱：以立春为界，如果日期在立春之前，使用上一年的干支
  // 立春是第2个节气（index=2）
  const springBeginDate = getSolarTermDate(year, 2) // 立春日期
  let yearForGanZhi = year
  if (date < springBeginDate) {
    // 在立春之前，使用上一年的干支
    yearForGanZhi = year - 1
  }

  const yearStemIndex = ((yearForGanZhi - 4) % 10 + 10) % 10
  const yearBranchIndex = ((yearForGanZhi - 4) % 12 + 12) % 12
  const yearStem = HEAVENLY_STEMS[yearStemIndex]
  const yearBranch = EARTHLY_BRANCHES[yearBranchIndex]

  const m = date.getMonth() + 1
  const d = date.getDate()
  let monthBranchIndex = 2
  switch (m) {
    case 1:
      monthBranchIndex = d < 6 ? 0 : 1
      break
    case 2:
      monthBranchIndex = d < 4 ? 1 : 2
      break
    case 3:
      monthBranchIndex = d < 6 ? 2 : 3
      break
    case 4:
      monthBranchIndex = d < 5 ? 3 : 4
      break
    case 5:
      monthBranchIndex = d < 6 ? 4 : 5
      break
    case 6:
      monthBranchIndex = d < 6 ? 5 : 6
      break
    case 7:
      monthBranchIndex = d < 7 ? 6 : 7
      break
    case 8:
      monthBranchIndex = d < 8 ? 7 : 8
      break
    case 9:
      monthBranchIndex = d < 8 ? 8 : 9
      break
    case 10:
      monthBranchIndex = d < 8 ? 9 : 10
      break
    case 11:
      monthBranchIndex = d < 8 ? 10 : 11
      break
    case 12:
      monthBranchIndex = d < 8 ? 11 : 0
      break
  }

  // 月柱：月干基于年柱的天干（yearStemIndex）来计算，而不是公历年的天干
  let monthStemStart = 0
  switch (yearStemIndex) {
    case 0: // 甲
    case 5: // 己
      monthStemStart = 2 // 丙寅
      break
    case 1: // 乙
    case 6: // 庚
      monthStemStart = 4 // 戊寅
      break
    case 2: // 丙
    case 7: // 辛
      monthStemStart = 6 // 庚寅
      break
    case 3: // 丁
    case 8: // 壬
      monthStemStart = 8 // 壬寅
      break
    case 4: // 戊
    case 9: // 癸
      monthStemStart = 0 // 甲寅
      break
  }
  // 将月支转换为序（寅=1, 卯=2, ..., 子=11, 丑=12）以确定月干
  const monthOrdinal = monthBranchIndex >= 2 ? (monthBranchIndex - 1) : (monthBranchIndex === 0 ? 11 : 12)
  const monthStemIndex = (monthStemStart + monthOrdinal - 1 + 10) % 10
  const monthStem = HEAVENLY_STEMS[monthStemIndex]
  const monthBranch = EARTHLY_BRANCHES[monthBranchIndex]

  // 日柱：使用 dateForDayPillar（考虑早晚子时）
  const baseDate = new Date(1900, 0, 31)
  const dayOffset = Math.floor((dateForDayPillar.getTime() - baseDate.getTime()) / 86400000)
  const dayStemIndex = ((dayOffset % 10) + 10) % 10
  const dayBranchIndex = (((dayOffset + 4) % 12) + 12) % 12
  const dayStem = HEAVENLY_STEMS[dayStemIndex]
  const dayBranch = EARTHLY_BRANCHES[dayBranchIndex]

  // 时柱：基于日干确定子时起干，按 12 时支顺推
  // 对于早子时（23:00-00:00），时干用第二天的日干计算
  // 对于晚子时（00:00-01:00），时干也用第二天的日干计算
  // 如果提供了用户选择的时辰（农历模式），使用它来确定时柱地支；否则从日期的小时数推导
  let hourIndex: number
  if (selectedHour && HOUR_CODE_TO_INDEX[selectedHour] !== undefined) {
    // 使用用户选择的时辰
    hourIndex = HOUR_CODE_TO_INDEX[selectedHour]
  } else {
    // 从日期的小时数推导
    hourIndex = Math.floor((hour + 1) / 2) % 12
  }
  // 使用 dateForHourStem 来计算时柱天干
  const hourStemDayOffset = Math.floor((dateForHourStem.getTime() - baseDate.getTime()) / 86400000)
  const hourStemDayIndex = ((hourStemDayOffset % 10) + 10) % 10
  const hourStemIndex = (hourStemDayIndex * 2 + hourIndex) % 10
  const hourStem = HEAVENLY_STEMS[hourStemIndex]
  const hourBranch = EARTHLY_BRANCHES[hourIndex]

  const stems = [
    { char: yearStem, tone: getStemTone(yearStem) },
    { char: monthStem, tone: getStemTone(monthStem) },
    { char: dayStem, tone: getStemTone(dayStem) },
    { char: hourStem, tone: getStemTone(hourStem) },
  ]

  const branches = [
    { char: yearBranch, tone: getBranchTone(yearBranch) },
    { char: monthBranch, tone: getBranchTone(monthBranch) },
    { char: dayBranch, tone: getBranchTone(dayBranch) },
    { char: hourBranch, tone: getBranchTone(hourBranch) },
  ]

  return { stems, branches }
}

type StemChar = typeof HEAVENLY_STEMS[number]
type BranchChar = typeof EARTHLY_BRANCHES[number]

export const getKongWangPairForStemBranch = (stemChar: StemChar | string, branchChar: BranchChar | string): string => {
  const stemIndex = HEAVENLY_STEMS.indexOf(stemChar as StemChar)
  const branchIndex = EARTHLY_BRANCHES.indexOf(branchChar as BranchChar)
  if (stemIndex < 0 || branchIndex < 0) return '--'
  const xunStartBranch = (branchIndex - stemIndex + 120) % 12
  switch (xunStartBranch) {
    case 0: return '戌亥'
    case 10: return '申酉'
    case 8: return '午未'
    case 6: return '辰巳'
    case 4: return '寅卯'
    case 2: return '子丑'
    default: return '--'
  }
}

