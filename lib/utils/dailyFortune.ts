import { convertToLunar, getGanZhiInfo, getLunarDateStringWithoutYear } from './lunar'
import { getCurrentSolarTerm } from './solarTerms'

const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
] as const

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
] as const

const WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

// 六十四卦名称（简化版，实际需要根据日期计算）
const HEXAGRAM_NAMES = [
  '乾为天', '坤为地', '水雷屯', '山水蒙', '水天需', '天水讼', '地水师', '水地比',
  '风天小畜', '天泽履', '地天泰', '天地否', '天火同人', '火天大有', '地山谦', '雷地豫',
  '泽雷随', '山风蛊', '地泽临', '风地观', '火雷噬嗑', '山火贲', '山地剥', '地雷复',
  '天雷无妄', '山天大畜', '山雷颐', '泽风大过', '坎为水', '离为火', '泽山咸', '雷风恒',
  '天山遁', '雷天大壮', '火地晋', '地火明夷', '风火家人', '火泽睽', '水山蹇', '雷水解',
  '山泽损', '风雷益', '泽天夬', '天风姤', '泽地萃', '地风升', '泽水困', '水风井',
  '泽火革', '火风鼎', '震为雷', '艮为山', '风山渐', '雷泽归妹', '雷火丰', '火山旅',
  '巽为风', '兑为泽', '风水涣', '水泽节', '风泽中孚', '雷山小过', '水火既济', '火水未济'
] as const

// 宜忌事项（简化版，实际需要根据黄历数据库）
const YI_ITEMS = [
  '纳财', '访友', '开市', '出行', '嫁娶', '祭祀', '祈福', '求嗣',
  '入学', '开仓', '交易', '立券', '安床', '修造', '动土', '栽种'
] as const

const JI_ITEMS = [
  '远行', '动土', '破土', '安葬', '开仓', '伐木', '入宅', '移徙',
  '嫁娶', '出行', '开市', '交易', '纳财', '祭祀', '祈福', '求嗣'
] as const

// 根据日期计算值卦（简化算法，基于日干支）
function getDailyHexagram(date: Date): string {
  const ganZhi = getGanZhiInfo(date)
  const dayStem = ganZhi.stems[2].char
  const dayBranch = ganZhi.branches[2].char
  
  // 简化算法：基于日干支计算卦序
  const stemIndex = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(dayStem)
  const branchIndex = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(dayBranch)
  const hexagramIndex = (stemIndex * 6 + branchIndex) % 64
  
  const fullName = HEXAGRAM_NAMES[hexagramIndex] || '乾为天'
  // 简化卦名：去掉"为"字，如"乾为天" -> "乾天"，"地天泰"保持不变
  return fullName.replace('为', '')
}

// 计算冲煞（基于日地支）
function getChongSha(date: Date): string {
  const ganZhi = getGanZhiInfo(date)
  const dayStem = ganZhi.stems[2].char
  const dayBranch = ganZhi.branches[2].char
  
  // 地支相冲：子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲
  const chongMap: Record<string, string> = {
    '子': '午', '午': '子',
    '丑': '未', '未': '丑',
    '寅': '申', '申': '寅',
    '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰',
    '巳': '亥', '亥': '巳'
  }
  
  const chongBranch = chongMap[dayBranch] || '子'
  
  // 计算冲的地支对应的生肖
  const zodiacMap: Record<string, string> = {
    '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔',
    '辰': '龙', '巳': '蛇', '午': '马', '未': '羊',
    '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪'
  }
  
  const zodiac = zodiacMap[chongBranch] || '鼠'
  
  // 计算煞的方向（简化：基于地支）
  const shaMap: Record<string, string> = {
    '子': '南', '丑': '东', '寅': '北', '卯': '西',
    '辰': '南', '巳': '东', '午': '北', '未': '西',
    '申': '南', '酉': '东', '戌': '北', '亥': '西'
  }
  
  const sha = shaMap[dayBranch] || '北'
  
  // 计算冲的干支
  const branchIndex = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(chongBranch)
  const stemIndex = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(dayStem)
  const chongStemIndex = (stemIndex + 6) % 10
  const chongStem = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'][chongStemIndex]
  
  return `冲${zodiac} (${chongStem}${chongBranch}) 煞${sha}`
}

// 根据日期计算运势（简化算法）
function getFortune(date: Date): string {
  const ganZhi = getGanZhiInfo(date)
  const dayStem = ganZhi.stems[2].char
  const dayBranch = ganZhi.branches[2].char
  
  // 简化算法：基于日干支计算吉凶
  const stemIndex = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(dayStem)
  const branchIndex = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(dayBranch)
  
  const fortuneIndex = (stemIndex + branchIndex) % 5
  const fortunes = ['大吉', '小吉', '平', '小凶', '大凶']
  
  return fortunes[fortuneIndex] || '平'
}

// 获取宜忌事项（简化版，实际需要查询黄历数据库）
function getYiJi(date: Date): { yi: string; ji: string } {
  const ganZhi = getGanZhiInfo(date)
  const dayStem = ganZhi.stems[2].char
  const dayBranch = ganZhi.branches[2].char
  
  const stemIndex = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(dayStem)
  const branchIndex = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(dayBranch)
  
  // 简化算法：基于日干支选择宜忌
  const yiStart = (stemIndex * 2 + branchIndex) % YI_ITEMS.length
  const jiStart = (stemIndex * 3 + branchIndex * 2) % JI_ITEMS.length
  
  const yi = [
    YI_ITEMS[yiStart % YI_ITEMS.length],
    YI_ITEMS[(yiStart + 1) % YI_ITEMS.length],
    YI_ITEMS[(yiStart + 2) % YI_ITEMS.length]
  ].join(' · ')
  
  const ji = [
    JI_ITEMS[jiStart % JI_ITEMS.length],
    JI_ITEMS[(jiStart + 1) % JI_ITEMS.length]
  ].join(' · ')
  
  return { yi, ji }
}

// 经典语录（随机选择）
const QUOTES = [
  '君子终日乾乾，夕惕若厉，无咎。',
  '天行健，君子以自强不息。',
  '地势坤，君子以厚德载物。',
  '积善之家，必有余庆；积不善之家，必有余殃。',
  '穷则变，变则通，通则久。',
  '知者不惑，仁者不忧，勇者不惧。',
  '学而时习之，不亦说乎？',
  '己所不欲，勿施于人。'
] as const

export interface DailyFortuneData {
  date: string // 公历日期，如 "10月24日"
  week: string // 星期，如 "周二"
  lunar: string // 农历，如 "九月初十"
  solarTerm: string | null // 节气，如 "霜降"
  fortune: string // 运势，如 "小吉"
  yi: string // 宜，如 "纳财 · 访友 · 开市"
  ji: string // 忌，如 "远行 · 动土"
  gua: string // 值卦，如 "地天泰"
  chong: string // 冲煞，如 "冲龙 (戊辰) 煞北"
  quote: string // 语录
}

/**
 * 获取今日运势数据
 */
export function getDailyFortune(date: Date = new Date()): DailyFortuneData {
  const lunar = convertToLunar(date)
  const solarTerm = getCurrentSolarTerm(date)
  const ganZhi = getGanZhiInfo(date)
  
  // 格式化公历日期
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dateStr = `${month}月${day}日`
  
  // 格式化星期
  const weekIndex = date.getDay()
  const weekStr = WEEK_NAMES[weekIndex] || '周一'
  
  // 格式化农历
  const monthIndex = (lunar.month - 1 + 12) % 12
  const dayIndex = (lunar.day - 1 + 30) % 30
  const lunarMonth = LUNAR_MONTH_NAMES[monthIndex] || '正月'
  const lunarDay = LUNAR_DAY_NAMES[dayIndex] || '初一'
  const lunarStr = `${lunarMonth}${lunarDay}`
  
  // 获取运势数据
  const fortune = getFortune(date)
  const { yi, ji } = getYiJi(date)
  const gua = getDailyHexagram(date)
  const chong = getChongSha(date)
  
  // 选择语录（基于日期）
  const quoteIndex = (date.getDate() + date.getMonth() * 31) % QUOTES.length
  const quote = QUOTES[quoteIndex] || QUOTES[0]
  
  return {
    date: dateStr,
    week: weekStr,
    lunar: lunarStr,
    solarTerm: solarTerm.name,
    fortune,
    yi,
    ji,
    gua,
    chong,
    quote
  }
}

