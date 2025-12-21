const S_TERM_INFO = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
  173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
  353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758
] as const

export const SOLAR_TERM_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
] as const

type SolarTermItem = { name: string; date: Date }

const BASE_UTC = Date.UTC(1900, 0, 6, 2, 5)
const YEAR_MILLI = 31556925974.7

export const getSolarTermDate = (year: number, index: number): Date => {
  const time = YEAR_MILLI * (year - 1900) + S_TERM_INFO[index] * 60000 + BASE_UTC
  return new Date(time)
}

export const getSolarTermsForYear = (year: number): SolarTermItem[] =>
  SOLAR_TERM_NAMES.map((name, idx) => ({ name, date: getSolarTermDate(year, idx) }))

const pad2 = (n: number) => n.toString().padStart(2, '0')
export const formatSolarTermDate = (date: Date) =>
  `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`

export const getCurrentSolarTermText = (date: Date): string => {
  const year = date.getFullYear()
  const termsThisYear = getSolarTermsForYear(year)

  let prev: SolarTermItem = termsThisYear[0]
  let next: SolarTermItem | null = termsThisYear[1]

  for (let i = 0; i < termsThisYear.length; i++) {
    const t = termsThisYear[i]
    if (date >= t.date) {
      prev = t
      next = i + 1 < termsThisYear.length ? termsThisYear[i + 1] : null
    } else {
      next = t
      break
    }
  }

  if (!next) {
    const nextYearTerms = getSolarTermsForYear(year + 1)
    next = nextYearTerms[0]
  }

  if (date < termsThisYear[0].date) {
    const lastYearTerms = getSolarTermsForYear(year - 1)
    prev = lastYearTerms[23]
  }

  const ensuredNext = next as SolarTermItem
  return `${prev.name}${formatSolarTermDate(prev.date)} ~ ${ensuredNext.name}${formatSolarTermDate(ensuredNext.date)}`
}

export const getCurrentSolarTerm = (date: Date): { name: string; index: number } => {
  const year = date.getFullYear()
  const termsThisYear = getSolarTermsForYear(year)

  let prev: SolarTermItem = termsThisYear[0]
  let prevIndex = 0

  for (let i = 0; i < termsThisYear.length; i++) {
    const t = termsThisYear[i]
    if (date >= t.date) {
      prev = t
      prevIndex = i
    } else {
      break
    }
  }

  if (date < termsThisYear[0].date) {
    const lastYearTerms = getSolarTermsForYear(year - 1)
    prev = lastYearTerms[23]
    prevIndex = 23
  }

  return { name: prev.name, index: prevIndex }
}

/**
 * 获取节气文本（带默认值处理）
 * @param date 日期，如果为 null 或 undefined 则使用当前时间
 * @returns 节气范围文本
 */
export const solarTermTextFrom = (date?: Date | null): string => {
  return getCurrentSolarTermText(date ?? new Date())
}

