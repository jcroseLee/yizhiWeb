/**
 * 八字排盘计算工具
 */

import { getGanZhiInfo, getKongWangPairForStemBranch, getLunarDateString } from './lunar'

// 农历信息表（1900-2099年）
export const LUNAR_INFO = [
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

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

// 天干五行映射
const STEM_WUXING: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  '甲': 'wood', '乙': 'wood',
  '丙': 'fire', '丁': 'fire',
  '戊': 'earth', '己': 'earth',
  '庚': 'metal', '辛': 'metal',
  '壬': 'water', '癸': 'water',
}

// 地支五行映射
const BRANCH_WUXING: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  '子': 'water', '亥': 'water',
  '寅': 'wood', '卯': 'wood',
  '巳': 'fire', '午': 'fire',
  '申': 'metal', '酉': 'metal',
  '丑': 'earth', '辰': 'earth', '未': 'earth', '戌': 'earth',
}

// 地支藏干
const BRANCH_CANGGAN: Record<string, Array<{ char: string; wuxing: 'wood' | 'fire' | 'earth' | 'metal' | 'water' }>> = {
  '子': [{ char: '癸', wuxing: 'water' }],
  '丑': [{ char: '己', wuxing: 'earth' }, { char: '癸', wuxing: 'water' }, { char: '辛', wuxing: 'metal' }],
  '寅': [{ char: '甲', wuxing: 'wood' }, { char: '丙', wuxing: 'fire' }, { char: '戊', wuxing: 'earth' }],
  '卯': [{ char: '乙', wuxing: 'wood' }],
  '辰': [{ char: '戊', wuxing: 'earth' }, { char: '乙', wuxing: 'wood' }, { char: '癸', wuxing: 'water' }],
  '巳': [{ char: '丙', wuxing: 'fire' }, { char: '戊', wuxing: 'earth' }],
  '午': [{ char: '丁', wuxing: 'fire' }, { char: '己', wuxing: 'earth' }],
  '未': [{ char: '己', wuxing: 'earth' }, { char: '丁', wuxing: 'fire' }, { char: '乙', wuxing: 'wood' }],
  '申': [{ char: '庚', wuxing: 'metal' }, { char: '壬', wuxing: 'water' }, { char: '戊', wuxing: 'earth' }],
  '酉': [{ char: '辛', wuxing: 'metal' }],
  '戌': [{ char: '戊', wuxing: 'earth' }, { char: '辛', wuxing: 'metal' }, { char: '丁', wuxing: 'fire' }],
  '亥': [{ char: '壬', wuxing: 'water' }, { char: '甲', wuxing: 'wood' }],
}

// 十神映射（以日干为基准）
const SHI_SHEN_MAP: Record<string, Record<string, string>> = {
  // 日干为甲
  '甲': {
    '甲': '比肩', '乙': '劫财', '丙': '食神', '丁': '伤官', '戊': '偏财', '己': '正财', '庚': '七杀', '辛': '正官', '壬': '偏印', '癸': '正印',
  },
  // 日干为乙
  '乙': {
    '甲': '劫财', '乙': '比肩', '丙': '伤官', '丁': '食神', '戊': '正财', '己': '偏财', '庚': '正官', '辛': '七杀', '壬': '正印', '癸': '偏印',
  },
  // 日干为丙
  '丙': {
    '甲': '偏印', '乙': '正印', '丙': '比肩', '丁': '劫财', '戊': '食神', '己': '伤官', '庚': '偏财', '辛': '正财', '壬': '七杀', '癸': '正官',
  },
  // 日干为丁
  '丁': {
    '甲': '正印', '乙': '偏印', '丙': '劫财', '丁': '比肩', '戊': '伤官', '己': '食神', '庚': '正财', '辛': '偏财', '壬': '正官', '癸': '七杀',
  },
  // 日干为戊
  '戊': {
    '甲': '七杀', '乙': '正官', '丙': '偏印', '丁': '正印', '戊': '比肩', '己': '劫财', '庚': '食神', '辛': '伤官', '壬': '偏财', '癸': '正财',
  },
  // 日干为己
  '己': {
    '甲': '正官', '乙': '七杀', '丙': '正印', '丁': '偏印', '戊': '劫财', '己': '比肩', '庚': '伤官', '辛': '食神', '壬': '正财', '癸': '偏财',
  },
  // 日干为庚
  '庚': {
    '甲': '偏财', '乙': '正财', '丙': '七杀', '丁': '正官', '戊': '偏印', '己': '正印', '庚': '比肩', '辛': '劫财', '壬': '食神', '癸': '伤官',
  },
  // 日干为辛
  '辛': {
    '甲': '正财', '乙': '偏财', '丙': '正官', '丁': '七杀', '戊': '正印', '己': '偏印', '庚': '劫财', '辛': '比肩', '壬': '伤官', '癸': '食神',
  },
  // 日干为壬
  '壬': {
    '甲': '食神', '乙': '伤官', '丙': '偏财', '丁': '正财', '戊': '七杀', '己': '正官', '庚': '偏印', '辛': '正印', '壬': '比肩', '癸': '劫财',
  },
  // 日干为癸
  '癸': {
    '甲': '伤官', '乙': '食神', '丙': '正财', '丁': '偏财', '戊': '正官', '己': '七杀', '庚': '正印', '辛': '偏印', '壬': '劫财', '癸': '比肩',
  },
}

// 纳音五行表（60甲子纳音）
const NAYIN_MAP: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金',
  '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木',
  '庚午': '沙中金', '辛未': '沙中金',
  '壬申': '剑锋金', '癸酉': '剑锋金',
  '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水',
  '戊寅': '平地木', '己卯': '平地木',
  '庚辰': '白蜡金', '辛巳': '白蜡金',
  '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水',
  '丙戌': '屋上土', '丁亥': '屋中土',
  '戊子': '霹雳火', '己丑': '霹雳火',
  '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水',
  '甲午': '沙中金', '乙未': '沙中金',
  '丙申': '山下火', '丁酉': '山下火',
  '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土',
  '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火',
  '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土',
  '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木',
  '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土',
  '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木',
  '壬戌': '大海水', '癸亥': '大海水',
}

// 神煞计算 - 为每个柱单独计算（按问真排盘逻辑）
function calculateShenShaForPillar(
  pillarLabel: string,
  pillarGan: string,
  pillarZhi: string,
  yearGan: string,
  yearZhi: string,
  monthGan: string,
  monthZhi: string,
  dayGan: string,
  dayZhi: string,
  hourGan: string,
  hourZhi: string
): string[] {
  const shenSha: string[] = []

  // 天乙贵人（查日干，看各柱地支）
  const tianYiGuiRen: Record<string, string> = {
    '甲': '丑未', '戊': '丑未', '庚': '丑未',
    '乙': '子申', '己': '子申',
    '丙': '亥酉', '丁': '亥酉',
    '壬': '巳卯', '癸': '巳卯',
    '辛': '午寅',
  }
  const guiRenZhi = tianYiGuiRen[dayGan]
  if (guiRenZhi && guiRenZhi.includes(pillarZhi)) {
    shenSha.push('天乙贵人')
  }

  // 太极贵人（查日干，看各柱地支）
  const taiJiGuiRen: Record<string, string> = {
    '甲': '子午', '乙': '子午',
    '丙': '卯酉', '丁': '卯酉',
    '戊': '辰戌', '己': '辰戌',
    '庚': '丑未', '辛': '丑未',
    '壬': '寅申', '癸': '寅申',
  }
  const taiJiZhi = taiJiGuiRen[dayGan]
  if (taiJiZhi && taiJiZhi.includes(pillarZhi)) {
    shenSha.push('太极贵人')
  }

  // 天德贵人（查月支，看各柱天干）
  // 正月（寅）见丁，二月（卯）见申，三月（辰）见壬，四月（巳）见辛，五月（午）见亥，六月（未）见甲，
  // 七月（申）见癸，八月（酉）见寅，九月（戌）见丙，十月（亥）见乙，十一月（子）见巳，十二月（丑）见庚
  const tianDeGuiRen: Record<string, string> = {
    '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
    '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
  }
  const tianDeGan = tianDeGuiRen[monthZhi]
  if (tianDeGan && tianDeGan === pillarGan) {
    shenSha.push('天德贵人')
  }

  // 月德贵人（查月支，看各柱天干）
  // 寅月见丙，卯月见甲，辰月见壬，巳月见庚，午月见丙，未月见甲，申月见壬，酉月见庚，戌月见丙，亥月见甲，子月见壬，丑月见庚
  const yueDeGuiRen: Record<string, string> = {
    '寅': '丙', '卯': '甲', '辰': '壬', '巳': '庚', '午': '丙', '未': '甲',
    '申': '壬', '酉': '庚', '戌': '丙', '亥': '甲', '子': '壬', '丑': '庚',
  }
  const yueDeGan = yueDeGuiRen[monthZhi]
  if (yueDeGan && yueDeGan === pillarGan) {
    shenSha.push('月德贵人')
  }

  // 德秀贵人（查月支和日干，看各柱天干）
  // 德秀贵人的查法比较复杂，这里使用简化版本：
  // 寅午戌月，天干见丙丁为德，见戊己为秀
  // 申子辰月，天干见壬癸为德，见甲乙为秀
  // 巳酉丑月，天干见庚辛为德，见壬癸为秀
  // 亥卯未月，天干见甲乙为德，见丙丁为秀
  if (['寅', '午', '戌'].includes(monthZhi)) {
    if (['丙', '丁'].includes(pillarGan)) {
      shenSha.push('德秀贵人')
    }
  } else if (['申', '子', '辰'].includes(monthZhi)) {
    if (['壬', '癸'].includes(pillarGan)) {
      shenSha.push('德秀贵人')
    }
  } else if (['巳', '酉', '丑'].includes(monthZhi)) {
    if (['庚', '辛'].includes(pillarGan)) {
      shenSha.push('德秀贵人')
    }
  } else if (['亥', '卯', '未'].includes(monthZhi)) {
    if (['甲', '乙'].includes(pillarGan)) {
      shenSha.push('德秀贵人')
    }
  }

  // 驿马（查日支，看各柱地支）
  const yiMaMap: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳',
  }
  if (yiMaMap[dayZhi] === pillarZhi) {
    shenSha.push('驿马')
  }

  // 桃花（查日支，看各柱地支）
  const taoHuaMap: Record<string, string> = {
    '申': '酉', '子': '酉', '辰': '酉',
    '寅': '卯', '午': '卯', '戌': '卯',
    '巳': '午', '酉': '午', '丑': '午',
    '亥': '子', '卯': '子', '未': '子',
  }
  if (taoHuaMap[dayZhi] === pillarZhi) {
    shenSha.push('桃花')
  }

  // 红艳煞（查日干，看各柱地支）
  // 甲乙午申丙寅辛，丁己辰哥庚见戌
  // 甲见午，乙见申，丙见寅，丁见未，戊见辰，己见辰，庚见戌，辛见酉，壬见子，癸见申
  const hongYanSha: Record<string, string> = {
    '甲': '午', '乙': '申', '丙': '寅', '丁': '未', '戊': '辰',
    '己': '辰', '庚': '戌', '辛': '酉', '壬': '子', '癸': '申',
  }
  const hongYanZhi = hongYanSha[dayGan]
  if (hongYanZhi === pillarZhi) {
    shenSha.push('红艳煞')
  }

  // 华盖（查日支，看各柱地支）
  const huaGaiMap: Record<string, string> = {
    '申': '辰', '子': '辰', '辰': '辰',
    '寅': '戌', '午': '戌', '戌': '戌',
    '巳': '丑', '酉': '丑', '丑': '丑',
    '亥': '未', '卯': '未', '未': '未',
  }
  if (huaGaiMap[dayZhi] === pillarZhi) {
    shenSha.push('华盖')
  }

  // 金舆（查日干，看各柱地支）
  const jinYuMap: Record<string, string> = {
    '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未',
    '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅',
  }
  const jinYuZhi = jinYuMap[dayGan]
  if (jinYuZhi === pillarZhi) {
    shenSha.push('金舆')
  }

  // 飞刃（查日干，看各柱地支）
  // 飞刃是羊刃的对冲，甲见卯为羊刃，对冲为酉，所以甲见酉为飞刃
  const feiRenMap: Record<string, string> = {
    '甲': '酉', '乙': '申', '丙': '子', '丁': '亥', '戊': '子',
    '己': '亥', '庚': '卯', '辛': '寅', '壬': '午', '癸': '巳',
  }
  const feiRenZhi = feiRenMap[dayGan]
  if (feiRenZhi === pillarZhi) {
    shenSha.push('飞刃')
  }

  // 天罗地网（查日支，看各柱地支）
  // 辰为天罗，戌为地网
  // 但问真排盘在日柱显示"天罗"，可能是因为日支是戌（地网），但统一显示为天罗
  if (pillarLabel === '日柱') {
    if (dayZhi === '辰' || dayZhi === '戌') {
      shenSha.push('天罗')
    }
  }

  // 魁罡日（仅日柱）
  // 只有四天是魁罡日：庚辰、庚戌、壬辰、戊戌
  if (pillarLabel === '日柱') {
    const kuiGangRi = ['庚辰', '庚戌', '壬辰', '戊戌']
    if (kuiGangRi.includes(dayGan + dayZhi)) {
      shenSha.push('魁罡日')
    }
  }

  // 十灵日（仅日柱）
  // 甲辰、乙亥、丙辰、丁酉、戊午、庚戌、庚寅、辛亥、壬寅、癸未
  if (pillarLabel === '日柱') {
    const shiLingRi = ['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚戌', '庚寅', '辛亥', '壬寅', '癸未']
    if (shiLingRi.includes(dayGan + dayZhi)) {
      shenSha.push('十灵日')
    }
  }

  // 童子煞（查年支和日支，看各柱地支）
  // 春秋寅子贵，冬夏卯未辰；金木马卯合，水火鸡犬多；土命逢辰巳，童子定不错
  // 简化版本：根据年支判断各柱地支
  // 根据问真排盘的逻辑，童子煞主要看年支和日支的关系
  // 这里使用简化的查法：根据年支查各柱地支
  const tongZiShaByYear: Record<string, string[]> = {
    '子': ['寅'], '丑': ['卯'], '寅': ['子'], '卯': ['未'], '辰': ['未'],
    '巳': ['辰'], '午': ['卯'], '未': ['辰'], '申': ['酉'], '酉': ['戌'],
    '戌': ['酉'], '亥': ['子'],
  }
  // 同时也要看日支
  const tongZiShaByDay: Record<string, string[]> = {
    '子': ['寅'], '丑': ['卯'], '寅': ['子'], '卯': ['未'], '辰': ['未'],
    '巳': ['辰'], '午': ['卯'], '未': ['辰'], '申': ['酉'], '酉': ['戌'],
    '戌': ['酉'], '亥': ['子'],
  }
  const tongZiZhisByYear = tongZiShaByYear[yearZhi]
  const tongZiZhisByDay = tongZiShaByDay[dayZhi]
  if ((tongZiZhisByYear && tongZiZhisByYear.includes(pillarZhi)) ||
      (tongZiZhisByDay && tongZiZhisByDay.includes(pillarZhi))) {
    shenSha.push('童子煞')
  }

  // 丧门（查年支，看各柱地支）
  if (pillarLabel === '年柱' || pillarLabel === '月柱' || pillarLabel === '日柱' || pillarLabel === '时柱') {
    const sangMenMap: Record<string, string> = {
      '子': '寅', '丑': '卯', '寅': '辰', '卯': '巳', '辰': '午', '巳': '未',
      '午': '申', '未': '酉', '申': '戌', '酉': '亥', '戌': '子', '亥': '丑',
    }
    if (sangMenMap[yearZhi] === pillarZhi) {
      shenSha.push('丧门')
    }
  }

  // 八专日（仅日柱）
  if (pillarLabel === '日柱') {
    const baZhuanRi = ['甲寅', '乙卯', '丁未', '己未', '庚申', '辛酉', '戊戌', '癸丑']
    if (baZhuanRi.includes(dayGan + dayZhi)) {
      shenSha.push('八专日')
    }
  }

  // 空亡（如果该柱的地支在空亡中，需要在神煞中显示）
  // 空亡的计算：以日查年，以年查日
  // 以日查年：庚戌日（甲辰旬），空亡在寅、卯。如果年支是卯，年柱空亡
  // 以年查日：丁卯年（甲子旬），空亡在戌、亥。如果月、日、时支是戌，全盘带空亡
  const kongWangByDay = getKongWangPairForStemBranch(dayGan, dayZhi)
  const kongWangByYear = getKongWangPairForStemBranch(yearGan, yearZhi)
  
  // 以日查年：如果年支在日柱的空亡中
  if (pillarLabel === '年柱' && kongWangByDay && kongWangByDay !== '--') {
    // 空亡是一对地支，需要检查年支是否在其中
    if (kongWangByDay.includes(yearZhi)) {
      shenSha.push('空亡')
    }
  }
  
  // 以年查日：如果月、日、时支在年柱的空亡中
  if (pillarLabel !== '年柱' && kongWangByYear && kongWangByYear !== '--') {
    // 空亡是一对地支，需要检查该柱地支是否在其中
    if (kongWangByYear.includes(pillarZhi)) {
      shenSha.push('空亡')
    }
  }

  return shenSha
}

// 行运（十二长生）
const CHANGSHENG_TABLE: Record<string, Record<string, string>> = {
  '甲': { '亥': '长生', '子': '沐浴', '丑': '冠带', '寅': '临官', '卯': '帝旺', '辰': '衰', '巳': '病', '午': '死', '未': '墓', '申': '绝', '酉': '胎', '戌': '养' },
  '乙': { '午': '长生', '巳': '沐浴', '辰': '冠带', '卯': '临官', '寅': '帝旺', '丑': '衰', '子': '病', '亥': '死', '戌': '墓', '酉': '绝', '申': '胎', '未': '养' },
  '丙': { '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养' },
  '丁': { '酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养' },
  '戊': { '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养' },
  '己': { '酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养' },
  '庚': { '巳': '长生', '午': '沐浴', '未': '冠带', '申': '临官', '酉': '帝旺', '戌': '衰', '亥': '病', '子': '死', '丑': '墓', '寅': '绝', '卯': '胎', '辰': '养' },
  '辛': { '子': '长生', '亥': '沐浴', '戌': '冠带', '酉': '临官', '申': '帝旺', '未': '衰', '午': '病', '巳': '死', '辰': '墓', '卯': '绝', '寅': '胎', '丑': '养' },
  '壬': { '申': '长生', '酉': '沐浴', '戌': '冠带', '亥': '临官', '子': '帝旺', '丑': '衰', '寅': '病', '卯': '死', '辰': '墓', '巳': '绝', '午': '胎', '未': '养' },
  '癸': { '卯': '长生', '寅': '沐浴', '丑': '冠带', '子': '临官', '亥': '帝旺', '戌': '衰', '酉': '病', '申': '死', '未': '墓', '午': '绝', '巳': '胎', '辰': '养' },
}

// 自坐（天干在地支的状态）
function getZiZuo(gan: string, zhi: string): string {
  return CHANGSHENG_TABLE[gan]?.[zhi] || ''
}

export interface BaZiPillar {
  label: string
  gan: { char: string; wuxing: 'wood' | 'fire' | 'earth' | 'metal' | 'water' }
  zhi: { char: string; wuxing: 'wood' | 'fire' | 'earth' | 'metal' | 'water' }
  zhuXing: string // 主星（十神）
  fuXing: string[] // 副星（藏干对应的十神）
  cangGan: Array<{ char: string; wuxing: 'wood' | 'fire' | 'earth' | 'metal' | 'water' }>
  naYin: string
  shenSha: string[]
  xingYun: string // 行运（十二长生）
  ziZuo: string // 自坐
  kongWang: string // 空亡
}

export interface BaZiResult {
  basic: {
    name?: string
    gender: string
    lunarDate: string
    solarDate: string
    trueSolarDate: string
    place?: string
    solarTerm?: string
    zodiac?: string
    mingGong?: { ganZhi: string; naYin: string }
    shenGong?: { ganZhi: string; naYin: string }
    taiYuan?: { ganZhi: string; naYin: string }
    taiXi?: { ganZhi: string; naYin: string }
    mingGua?: { gua: string; direction: string }
  }
  pillars: BaZiPillar[]
}

/**
 * 计算胎元
 * 月干进一位，月支进三位
 */
export const getTaiYuan = (monthGan: string, monthZhi: string): { ganZhi: string; naYin: string } => {
  const ganIndex = HEAVENLY_STEMS.indexOf(monthGan as any)
  const zhiIndex = EARTHLY_BRANCHES.indexOf(monthZhi as any)
  
  const taiYuanGan = HEAVENLY_STEMS[(ganIndex + 1) % 10]
  const taiYuanZhi = EARTHLY_BRANCHES[(zhiIndex + 3) % 12]
  
  const ganZhi = taiYuanGan + taiYuanZhi
  return { ganZhi, naYin: NAYIN_MAP[ganZhi] || '' }
}

/**
 * 计算命宫
 * 公式：(14 - (月支+时支)) % 12，天干五虎遁
 */
export const getMingGong = (yearGan: string, monthZhi: string, hourZhi: string): { ganZhi: string; naYin: string } => {
  const monthIndex = EARTHLY_BRANCHES.indexOf(monthZhi as any)
  const hourIndex = EARTHLY_BRANCHES.indexOf(hourZhi as any)
  
  // 地支公式 (子=0)
  // 原公式 (14 - (m+1) - (h+1)) - 1 = 11 - m - h
  let zhiIndex = (11 - monthIndex - hourIndex) % 12
  if (zhiIndex < 0) zhiIndex += 12
  const zhi = EARTHLY_BRANCHES[zhiIndex]
  
  // 天干公式：五虎遁
  const yearGanIndex = HEAVENLY_STEMS.indexOf(yearGan as any)
  const ganIndex = ((yearGanIndex % 5) * 2 + zhiIndex) % 10
  const gan = HEAVENLY_STEMS[ganIndex]
  
  const ganZhi = gan + zhi
  return { ganZhi, naYin: NAYIN_MAP[ganZhi] || '' }
}

/**
 * 计算身宫
 * 公式：(月支+时支) % 12，天干五虎遁
 */
export const getShenGong = (yearGan: string, monthZhi: string, hourZhi: string): { ganZhi: string; naYin: string } => {
  const monthIndex = EARTHLY_BRANCHES.indexOf(monthZhi as any)
  const hourIndex = EARTHLY_BRANCHES.indexOf(hourZhi as any)
  
  // 地支公式 (子=0)
  // 原公式 (m+1 + h+1 - 2) - 1 (转index) -> m + h - 1?
  // 验证：1987年 戌月(10) 戌时(10) -> 申(8)
  // (10 + 10) % 12 = 8 (申)
  // 所以公式就是 (m + h) % 12
  const zhiIndex = (monthIndex + hourIndex) % 12
  const zhi = EARTHLY_BRANCHES[zhiIndex]
  
  // 天干公式：五虎遁
  const yearGanIndex = HEAVENLY_STEMS.indexOf(yearGan as any)
  const ganIndex = ((yearGanIndex % 5) * 2 + zhiIndex) % 10
  const gan = HEAVENLY_STEMS[ganIndex]
  
  const ganZhi = gan + zhi
  return { ganZhi, naYin: NAYIN_MAP[ganZhi] || '' }
}

/**
 * 计算胎息
 * 天干五合，地支六合
 */
export const getTaiXi = (dayGan: string, dayZhi: string): { ganZhi: string; naYin: string } => {
  const ganIndex = HEAVENLY_STEMS.indexOf(dayGan as any)
  const zhiIndex = EARTHLY_BRANCHES.indexOf(dayZhi as any)
  
  // 天干五合 (Index差5)
  const taiXiGan = HEAVENLY_STEMS[(ganIndex + 5) % 10]
  
  // 地支六合 (Index和为1, 或13)
  // 0(子)+1(丑)=1, 2(寅)+11(亥)=13, 3(卯)+10(戌)=13...
  let taiXiZhiIndex: number
  if (zhiIndex === 0) taiXiZhiIndex = 1
  else if (zhiIndex === 1) taiXiZhiIndex = 0
  else taiXiZhiIndex = 13 - zhiIndex
  const taiXiZhi = EARTHLY_BRANCHES[taiXiZhiIndex]
  
  const ganZhi = taiXiGan + taiXiZhi
  return { ganZhi, naYin: NAYIN_MAP[ganZhi] || '' }
}

/**
 * 计算命卦
 * 1987女 -> 坤卦
 */
export const getMingGua = (year: number, gender: 'male' | 'female'): { gua: string; direction: string } => {
  const yearSum = Array.from(String(year)).reduce((a, b) => a + Number(b), 0)
  let code = 0
  
  if (gender === 'male') {
    // 男命：(11 - sum) % 9
    code = (11 - (yearSum % 9)) % 9
    if (code === 0) code = 9
    if (code === 5) code = 2 // 寄坤
  } else {
    // 女命：(sum + 4) % 9
    code = (yearSum + 4) % 9
    if (code === 0) code = 9
    if (code === 5) code = 8 // 寄艮
  }
  
  const guaMap: Record<number, { gua: string; direction: string }> = {
    1: { gua: '坎卦', direction: '东四命' },
    2: { gua: '坤卦', direction: '西四命' },
    3: { gua: '震卦', direction: '东四命' },
    4: { gua: '巽卦', direction: '东四命' },
    6: { gua: '乾卦', direction: '西四命' },
    7: { gua: '兑卦', direction: '西四命' },
    8: { gua: '艮卦', direction: '西四命' },
    9: { gua: '离卦', direction: '东四命' },
  }
  
  return guaMap[code] || { gua: '未知', direction: '未知' }
}

/**
 * 计算八字排盘
 * @param date 日期对象（用于计算）
 * @param gender 性别
 * @param name 姓名（可选）
 * @param place 出生地（可选）
 * @param earlyZiHour 是否使用早晚子时
 * @param selectedHour 用户选择的时辰代码（农历模式，如 'xu' 表示戌时），如果提供则用于显示农历日期
 */
export function calculateBaZi(
  date: Date,
  gender: 'male' | 'female',
  name?: string,
  place?: string,
  earlyZiHour: boolean = false,
  selectedHour?: string
): BaZiResult {
  // 传递 selectedHour 给 getGanZhiInfo，用于正确计算时柱地支
  const ganZhiData = getGanZhiInfo(date, earlyZiHour, selectedHour)
  const lunarDate = getLunarDateString(date, selectedHour)

  const yearGan = ganZhiData.stems[0].char
  const monthGan = ganZhiData.stems[1].char
  const dayGan = ganZhiData.stems[2].char
  const hourGan = ganZhiData.stems[3].char

  const yearZhi = ganZhiData.branches[0].char
  const monthZhi = ganZhiData.branches[1].char
  const dayZhi = ganZhiData.branches[2].char
  const hourZhi = ganZhiData.branches[3].char

  const shiShenMap = SHI_SHEN_MAP[dayGan] || {}

  // 计算四柱
  const pillars: BaZiPillar[] = [
    {
      label: '年柱',
      gan: { char: yearGan, wuxing: STEM_WUXING[yearGan] || 'wood' },
      zhi: { char: yearZhi, wuxing: BRANCH_WUXING[yearZhi] || 'wood' },
      zhuXing: shiShenMap[yearGan] || '',
      fuXing: BRANCH_CANGGAN[yearZhi]?.map(cg => shiShenMap[cg.char] || '') || [],
      cangGan: BRANCH_CANGGAN[yearZhi] || [],
      naYin: NAYIN_MAP[yearGan + yearZhi] || '',
      shenSha: calculateShenShaForPillar('年柱', yearGan, yearZhi, yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi),
      xingYun: CHANGSHENG_TABLE[yearGan]?.[yearZhi] || '',
      ziZuo: getZiZuo(yearGan, yearZhi),
      kongWang: getKongWangPairForStemBranch(yearGan, yearZhi),
    },
    {
      label: '月柱',
      gan: { char: monthGan, wuxing: STEM_WUXING[monthGan] || 'wood' },
      zhi: { char: monthZhi, wuxing: BRANCH_WUXING[monthZhi] || 'wood' },
      zhuXing: shiShenMap[monthGan] || '',
      fuXing: BRANCH_CANGGAN[monthZhi]?.map(cg => shiShenMap[cg.char] || '') || [],
      cangGan: BRANCH_CANGGAN[monthZhi] || [],
      naYin: NAYIN_MAP[monthGan + monthZhi] || '',
      shenSha: calculateShenShaForPillar('月柱', monthGan, monthZhi, yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi),
      xingYun: CHANGSHENG_TABLE[monthGan]?.[monthZhi] || '',
      ziZuo: getZiZuo(monthGan, monthZhi),
      kongWang: getKongWangPairForStemBranch(monthGan, monthZhi),
    },
    {
      label: '日柱',
      gan: { char: dayGan, wuxing: STEM_WUXING[dayGan] || 'wood' },
      zhi: { char: dayZhi, wuxing: BRANCH_WUXING[dayZhi] || 'wood' },
      zhuXing: gender === 'male' ? '元男' : '元女', // 日干为日元
      fuXing: BRANCH_CANGGAN[dayZhi]?.map(cg => shiShenMap[cg.char] || '') || [],
      cangGan: BRANCH_CANGGAN[dayZhi] || [],
      naYin: NAYIN_MAP[dayGan + dayZhi] || '',
      shenSha: calculateShenShaForPillar('日柱', dayGan, dayZhi, yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi),
      xingYun: CHANGSHENG_TABLE[dayGan]?.[dayZhi] || '',
      ziZuo: getZiZuo(dayGan, dayZhi),
      kongWang: getKongWangPairForStemBranch(dayGan, dayZhi),
    },
    {
      label: '时柱',
      gan: { char: hourGan, wuxing: STEM_WUXING[hourGan] || 'wood' },
      zhi: { char: hourZhi, wuxing: BRANCH_WUXING[hourZhi] || 'wood' },
      zhuXing: shiShenMap[hourGan] || '',
      fuXing: BRANCH_CANGGAN[hourZhi]?.map(cg => shiShenMap[cg.char] || '') || [],
      cangGan: BRANCH_CANGGAN[hourZhi] || [],
      naYin: NAYIN_MAP[hourGan + hourZhi] || '',
      shenSha: calculateShenShaForPillar('时柱', hourGan, hourZhi, yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi),
      xingYun: CHANGSHENG_TABLE[hourGan]?.[hourZhi] || '',
      ziZuo: getZiZuo(hourGan, hourZhi),
      kongWang: getKongWangPairForStemBranch(hourGan, hourZhi),
    },
  ]

  // 格式化日期
  const formatDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
  }

  // 生肖计算（简化）
  const zodiacMap: Record<string, string> = {
    '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔', '辰': '龙', '巳': '蛇',
    '午': '马', '未': '羊', '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪',
  }

  // 计算命宫、身宫、胎息、命卦
  const mingGong = getMingGong(yearGan, monthZhi, hourZhi)
  const shenGong = getShenGong(yearGan, monthZhi, hourZhi)
  const taiYuan = getTaiYuan(monthGan, monthZhi)
  const taiXi = getTaiXi(dayGan, dayZhi)
  const mingGua = getMingGua(date.getFullYear(), gender)

  return {
    basic: {
      name,
      gender: gender === 'male' ? '乾造' : '坤造',
      lunarDate,
      solarDate: formatDate(date),
      trueSolarDate: date.toISOString().slice(0, 19).replace('T', ' '),
      place,
      zodiac: zodiacMap[yearZhi] || '',
      mingGong,
      shenGong,
      taiYuan,
      taiXi,
      mingGua,
    },
    pillars,
  }
}

// 刑冲会合法则计算
export interface Relationship {
  type: 'ganHe' | 'zhiHe' | 'zhiChong' | 'zhiHai' | 'zhiPo' | 'zhiXing' | 'zhiAnHe' | 'sanHe' | 'sanHui' | 'banHe' | 'gongHe' | 'gongJu' | 'tuJu'
  label: string
  from: { type: 'gan' | 'zhi'; pillar: number; char: string }
  to: { type: 'gan' | 'zhi'; pillar: number; char: string }
  description: string
}

/**
 * 计算刑冲会合法则
 */
export function calculateRelationships(pillars: BaZiPillar[]): Relationship[] {
  const relationships: Relationship[] = []
  
  // 天干合（五合）
  const GAN_HE_MAP: Record<string, string> = {
    '甲': '己', '己': '甲',
    '乙': '庚', '庚': '乙',
    '丙': '辛', '辛': '丙',
    '丁': '壬', '壬': '丁',
    '戊': '癸', '癸': '戊',
  }
  
  // 地支六合
  const ZHI_HE_MAP: Record<string, string> = {
    '子': '丑', '丑': '子',
    '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳',
    '午': '未', '未': '午',
  }
  
  // 地支六冲
  const ZHI_CHONG_MAP: Record<string, string> = {
    '子': '午', '午': '子',
    '丑': '未', '未': '丑',
    '寅': '申', '申': '寅',
    '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰',
    '巳': '亥', '亥': '巳',
  }
  
  // 地支六害
  const ZHI_HAI_MAP: Record<string, string> = {
    '子': '未', '未': '子',
    '丑': '午', '午': '丑',
    '寅': '巳', '巳': '寅',
    '卯': '辰', '辰': '卯',
    '申': '亥', '亥': '申',
    '酉': '戌', '戌': '酉',
  }
  
  // 地支相破
  const ZHI_PO_MAP: Record<string, string> = {
    '子': '酉', '酉': '子',
    '寅': '亥', '亥': '寅',
    '卯': '午', '午': '卯',
    '巳': '申', '申': '巳',
    '未': '丑', '丑': '未',
    '戌': '辰', '辰': '戌',
  }
  
  // 地支相刑
  const ZHI_XING_MAP: Record<string, string[]> = {
    '子': ['卯'],
    '卯': ['子'],
    '寅': ['巳', '申'],
    '巳': ['寅', '申'],
    '申': ['寅', '巳'],
    '丑': ['戌', '未'],
    '戌': ['丑', '未'],
    '未': ['丑', '戌'],
    '辰': ['辰'],
    '午': ['午'],
    '酉': ['酉'],
    '亥': ['亥'],
  }
  
  // 地支暗合（暗合关系）
  const ZHI_AN_HE_MAP: Record<string, string> = {
    '子': '巳', '巳': '子',
    '寅': '午', '午': '寅',
    '卯': '申', '申': '卯',
    '辰': '酉', '酉': '辰',
    '戌': '亥', '亥': '戌',
    '未': '丑', '丑': '未',
  }
  
  // 三合局
  const SAN_HE_JU: string[][] = [
    ['申', '子', '辰'], // 水局
    ['亥', '卯', '未'], // 木局
    ['寅', '午', '戌'], // 火局
    ['巳', '酉', '丑'], // 金局
  ]
  
  // 三会局
  const SAN_HUI_JU: string[][] = [
    ['寅', '卯', '辰'], // 东方木
    ['巳', '午', '未'], // 南方火
    ['申', '酉', '戌'], // 西方金
    ['亥', '子', '丑'], // 北方水
  ]
  
  
  // 检查天干合
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const gan1 = pillars[i].gan.char
      const gan2 = pillars[j].gan.char
      if (GAN_HE_MAP[gan1] === gan2) {
        relationships.push({
          type: 'ganHe',
          label: `${gan1}${gan2}合`,
          from: { type: 'gan', pillar: i, char: gan1 },
          to: { type: 'gan', pillar: j, char: gan2 },
          description: '天干合',
        })
      }
    }
  }
  
  // 检查地支六合
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const zhi1 = pillars[i].zhi.char
      const zhi2 = pillars[j].zhi.char
      if (ZHI_HE_MAP[zhi1] === zhi2) {
        relationships.push({
          type: 'zhiHe',
          label: `${zhi1}${zhi2}合`,
          from: { type: 'zhi', pillar: i, char: zhi1 },
          to: { type: 'zhi', pillar: j, char: zhi2 },
          description: '地支六合',
        })
      }
    }
  }
  
  // 检查地支六冲
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const zhi1 = pillars[i].zhi.char
      const zhi2 = pillars[j].zhi.char
      if (ZHI_CHONG_MAP[zhi1] === zhi2) {
        relationships.push({
          type: 'zhiChong',
          label: `${zhi1}${zhi2}沖`,
          from: { type: 'zhi', pillar: i, char: zhi1 },
          to: { type: 'zhi', pillar: j, char: zhi2 },
          description: '地支六冲',
        })
      }
    }
  }
  
  // 检查地支六害
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const zhi1 = pillars[i].zhi.char
      const zhi2 = pillars[j].zhi.char
      if (ZHI_HAI_MAP[zhi1] === zhi2) {
        relationships.push({
          type: 'zhiHai',
          label: `${zhi1}${zhi2}害`,
          from: { type: 'zhi', pillar: i, char: zhi1 },
          to: { type: 'zhi', pillar: j, char: zhi2 },
          description: '地支六害',
        })
      }
    }
  }
  
  // 检查地支相破
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const zhi1 = pillars[i].zhi.char
      const zhi2 = pillars[j].zhi.char
      if (ZHI_PO_MAP[zhi1] === zhi2) {
        relationships.push({
          type: 'zhiPo',
          label: `${zhi1}${zhi2}破`,
          from: { type: 'zhi', pillar: i, char: zhi1 },
          to: { type: 'zhi', pillar: j, char: zhi2 },
          description: '地支相破',
        })
      }
    }
  }
  
  // 检查地支相刑
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const zhi1 = pillars[i].zhi.char
      const zhi2 = pillars[j].zhi.char
      if (ZHI_XING_MAP[zhi1]?.includes(zhi2)) {
        relationships.push({
          type: 'zhiXing',
          label: `${zhi1}${zhi2}刑`,
          from: { type: 'zhi', pillar: i, char: zhi1 },
          to: { type: 'zhi', pillar: j, char: zhi2 },
          description: '地支相刑',
        })
      }
    }
  }
  
  // 检查地支暗合
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const zhi1 = pillars[i].zhi.char
      const zhi2 = pillars[j].zhi.char
      if (ZHI_AN_HE_MAP[zhi1] === zhi2) {
        relationships.push({
          type: 'zhiAnHe',
          label: `${zhi1}${zhi2}暗合`,
          from: { type: 'zhi', pillar: i, char: zhi1 },
          to: { type: 'zhi', pillar: j, char: zhi2 },
          description: '地支暗合',
        })
      }
    }
  }
  
  // 检查三合局
  for (const ju of SAN_HE_JU) {
    const foundPillars: number[] = []
    for (let i = 0; i < pillars.length; i++) {
      if (ju.includes(pillars[i].zhi.char)) {
        foundPillars.push(i)
      }
    }
    if (foundPillars.length >= 2) {
      // 至少两个地支形成三合
      for (let i = 0; i < foundPillars.length; i++) {
        for (let j = i + 1; j < foundPillars.length; j++) {
          const zhi1 = pillars[foundPillars[i]].zhi.char
          const zhi2 = pillars[foundPillars[j]].zhi.char
          relationships.push({
            type: foundPillars.length === 3 ? 'sanHe' : 'banHe',
            label: foundPillars.length === 3 ? `${ju.join('')}三合` : `${zhi1}${zhi2}半合`,
            from: { type: 'zhi', pillar: foundPillars[i], char: zhi1 },
            to: { type: 'zhi', pillar: foundPillars[j], char: zhi2 },
            description: foundPillars.length === 3 ? '三合局' : '半合',
          })
        }
      }
    }
  }
  
  // 检查三会局
  for (const ju of SAN_HUI_JU) {
    const foundPillars: number[] = []
    for (let i = 0; i < pillars.length; i++) {
      if (ju.includes(pillars[i].zhi.char)) {
        foundPillars.push(i)
      }
    }
    if (foundPillars.length >= 2) {
      for (let i = 0; i < foundPillars.length; i++) {
        for (let j = i + 1; j < foundPillars.length; j++) {
          const zhi1 = pillars[foundPillars[i]].zhi.char
          const zhi2 = pillars[foundPillars[j]].zhi.char
          relationships.push({
            type: 'sanHui',
            label: foundPillars.length === 3 ? `${ju.join('')}三会` : `${zhi1}${zhi2}会`,
            from: { type: 'zhi', pillar: foundPillars[i], char: zhi1 },
            to: { type: 'zhi', pillar: foundPillars[j], char: zhi2 },
            description: '三会局',
          })
        }
      }
    }
  }
  
  return relationships
}
