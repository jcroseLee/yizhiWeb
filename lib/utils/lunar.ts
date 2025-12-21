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

export const getChineseHourIndex = (hours: number) => Math.floor((hours + 1) / 2) % 12
export const getChineseHour = (hours: number) => EARTHLY_BRANCHES_FOR_HOUR[getChineseHourIndex(hours)]

const getStemTone = (stem: string) => STEM_TONE_MAP[stem] ?? 'green'
const getBranchTone = (branch: string) => BRANCH_TONE_MAP[branch] ?? 'green'

export const getLunarDateString = (date: Date) => {
  const lunar = convertToLunar(date)
  const monthIndex = (lunar.month - 1 + 12) % 12
  const dayIndex = (lunar.day - 1 + 30) % 30

  const yearText = `${lunar.year}年`
  const monthText = `${lunar.isLeap ? '闰' : ''}${LUNAR_MONTH_NAMES[monthIndex] ?? ''}`
  const dayText = LUNAR_DAY_NAMES[dayIndex] ?? ''

  const hourText = getChineseHour(date.getHours())
  return `${yearText}${monthText}${dayText} ${hourText}时`
}

export const getLunarDateStringWithoutYear = (date: Date) => {
  const lunar = convertToLunar(date)
  const monthIndex = (lunar.month - 1 + 12) % 12
  const dayIndex = (lunar.day - 1 + 30) % 30

  const monthText = `${lunar.isLeap ? '闰' : ''}${LUNAR_MONTH_NAMES[monthIndex] ?? ''}`
  const dayText = LUNAR_DAY_NAMES[dayIndex] ?? ''
  const hourText = getChineseHour(date.getHours())
  return `${monthText}${dayText} ${hourText}时`
}

export const getGanZhiInfo = (date: Date) => {
  const year = date.getFullYear()
  const hour = date.getHours()

  const yearStemIndex = ((year - 4) % 10 + 10) % 10
  const yearBranchIndex = ((year - 4) % 12 + 12) % 12
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

  let monthStemStart = 0
  switch (yearStemIndex) {
    case 0:
    case 5:
      monthStemStart = 2
      break
    case 1:
    case 6:
      monthStemStart = 4
      break
    case 2:
    case 7:
      monthStemStart = 6
      break
    case 3:
    case 8:
      monthStemStart = 8
      break
    case 4:
    case 9:
      monthStemStart = 0
      break
  }
  const monthOrdinal = monthBranchIndex >= 2 ? (monthBranchIndex - 1) : (monthBranchIndex === 0 ? 11 : 12)
  const monthStemIndex = (monthStemStart + monthOrdinal - 1 + 10) % 10
  const monthStem = HEAVENLY_STEMS[monthStemIndex]
  const monthBranch = EARTHLY_BRANCHES[monthBranchIndex]

  const baseDate = new Date(1900, 0, 31)
  const dayOffset = Math.floor((date.getTime() - baseDate.getTime()) / 86400000)
  const dayStemIndex = ((dayOffset % 10) + 10) % 10
  const dayBranchIndex = (((dayOffset + 4) % 12) + 12) % 12
  const dayStem = HEAVENLY_STEMS[dayStemIndex]
  const dayBranch = EARTHLY_BRANCHES[dayBranchIndex]

  const hourIndex = Math.floor((hour + 1) / 2) % 12
  const hourStemIndex = (dayStemIndex * 2 + hourIndex) % 10
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

