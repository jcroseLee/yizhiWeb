import { HEX_64_DATA, LIU_SHEN_ORDER, LIU_SHEN_START, NAJIA_RULES, ZHI_WX } from '@/lib/constants/liuyaoConstants'
import { lineToNumber } from './divinationLineUtils'

const ANIMAL_SHORT_NAMES: Record<string, string> = {
  '青龙': '龙', '朱雀': '雀', '勾陈': '勾', '螣蛇': '蛇', '白虎': '虎', '玄武': '玄'
}

const RELATION_SHORT_NAMES: Record<string, string> = {
  '父母': '父', '兄弟': '兄', '子孙': '孙', '妻财': '财', '官鬼': '官'
}

export interface LineDetail {
  animal: string
  animalShort: string
  relation: string
  relationShort: string
  branch: string
  element: string
  stem: string
  isYing: boolean
  isShi: boolean
}

// --- 类型定义 ---
export type ShenShaItem = { name: string; value: string }
export type HexagramNature = { nature: string; element: string }
export type HexagramFullInfo = { fullName: string | null; soulType: string }

// 解析工具 - 使用统一的工具函数，保留向后兼容
function parseLineToNumber(line: string | undefined | null): number {
  if (!line) return 7 // 默认少阳
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

// 核心修复：六亲算法
function getRelation(me: string, other: string): string {
  if (me === other) return '兄弟'
  const promotes: Record<string, string> = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' }
  const controls: Record<string, string> = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' }
  
  if (promotes[me] === other) return '子孙' // 我生者
  if (promotes[other] === me) return '父母' // 生我者
  if (controls[me] === other) return '妻财' // 我克者
  if (controls[other] === me) return '官鬼' // 克我者
  return '兄弟'
}

// 获取本卦数据Key (从初爻到上爻)
function getHexKey(lines: number[]) {
  return lines.map(v => (v === 7 || v === 9 ? '1' : '0')).join('')
}

/**
 * 计算本卦详情
 */
export function calculateLineDetails(
  hexagramKey: string | undefined | null,
  lines: string[],
  dayStem: string
): LineDetail[] {
  const rawLines = lines.map(l => parseLineToNumber(l))
  
  // 生成Key (Bottom -> Top)
  let benKey = getHexKey(rawLines)
  
  // 容错：如果传入了Key且存在，优先使用
  if (hexagramKey && HEX_64_DATA[hexagramKey]) {
    benKey = hexagramKey
  } else if (!HEX_64_DATA[benKey]) {
    // 尝试反转Key兜底
    const rev = benKey.split('').reverse().join('')
    if (HEX_64_DATA[rev]) benKey = rev
    else benKey = '111111' // Fallback
  }

  const benInfo = HEX_64_DATA[benKey]
  const gongWx = benInfo[1]
  const shiPos = benInfo[2]
  const yingPos = (shiPos + 3) > 6 ? (shiPos + 3) - 6 : (shiPos + 3)

  const lsStart = LIU_SHEN_START[dayStem] ?? 0
  const lowerBin = benKey.substring(0, 3)
  const upperBin = benKey.substring(3, 6)

  const details: LineDetail[] = []

  for (let i = 0; i < 6; i++) {
    const isUpper = i >= 3
    const localIdx = i % 3

    const trigramBin = isUpper ? upperBin : lowerBin
    const najiaObj = NAJIA_RULES[trigramBin] || NAJIA_RULES['111']
    const najiaData = isUpper ? najiaObj.outer : najiaObj.inner

    const gan = najiaData.g
    const zhi = najiaData.z[localIdx]
    const wuxing = ZHI_WX[zhi] || '水'
    const relation = getRelation(gongWx, wuxing)
    const animal = LIU_SHEN_ORDER[(lsStart + i) % 6]

    const isShi = (i + 1) === shiPos
    const isYing = (i + 1) === yingPos

    details.push({
      animal,
      animalShort: ANIMAL_SHORT_NAMES[animal] || animal,
      relation,
      relationShort: RELATION_SHORT_NAMES[relation] || relation,
      branch: zhi,
      element: wuxing,
      stem: gan,
      isShi,
      isYing
    })
  }

  return details
}

/**
 * 计算变卦详情 (修复版)
 */
export function calculateChangedLineDetails(
  changedHexagramKey: string | undefined | null,
  changedLines: string[],
  originalKey: string | null | undefined,
  originalLines: string[] | undefined,
  changingFlags: boolean[] | undefined
): LineDetail[] {
  // 1. 强制解析原始卦数值 (如果缺少 originalLines，则尝试用 changedLines 兜底，但通常必须有 originalLines)
  const sourceLines = originalLines || changedLines || []
  const originalNums = sourceLines.map(l => parseLineToNumber(l))

  // 2. 获取本卦 Key 和 本宫五行
  // 变卦的六亲（父母/妻财等）必须依据【本卦】的宫位五行来定，绝对不能用变卦的宫位
  let benKey = originalKey || getHexKey(originalNums)
  
  // 校验 benKey 有效性，无效则尝试反转或兜底
  if (!HEX_64_DATA[benKey]) {
     const rev = benKey.split('').reverse().join('')
     if (HEX_64_DATA[rev]) benKey = rev
     else benKey = '111111' 
  }
  const benInfo = HEX_64_DATA[benKey]
  const benGongWx = benInfo[1] // 获取本宫五行 (例如截图中的泽水困/雷山小过所属的宫五行)

  // 3. 计算变卦的数值数组 (核心修复：物理转换)
  // 6(老阴)->7(少阳), 9(老阳)->8(少阴), 7->7, 8->8
  const changedNums = originalNums.map((val, idx) => {
    // 判断是否发动：如果传入了 flag 以 flag 为准，否则根据 6/9 判断
    const isMoving = changingFlags ? changingFlags[idx] : (val === 6 || val === 9)
    
    if (!isMoving) {
      // 如果没动，还原为静爻
      if (val === 6) return 8 // 老阴当做阴
      if (val === 9) return 7 // 老阳当做阳
      return val
    } else {
      // 如果动了，进行阴阳转换
      if (val === 6 || val === 8) return 7 // 阴变阳
      if (val === 9 || val === 7) return 8 // 阳变阴
    }
    return val
  })

  // 4. 生成变卦 Key
  let bianKey = changedHexagramKey || ''
  if (!bianKey || !HEX_64_DATA[bianKey]) {
    // 使用转换后的数值生成 Key
    bianKey = getHexKey(changedNums)
  }

  // 5. 组装详情
  const lowerBin = bianKey.substring(0, 3)
  const upperBin = bianKey.substring(3, 6)
  const details: LineDetail[] = []

  for (let i = 0; i < 6; i++) {
    const isUpper = i >= 3
    const localIdx = i % 3

    // 获取变卦后的纳甲信息（动爻/静爻都展示）
    const trigramBin = isUpper ? upperBin : lowerBin
    const najiaObj = NAJIA_RULES[trigramBin] || NAJIA_RULES['111']
    const najiaData = isUpper ? najiaObj.outer : najiaObj.inner

    const gan = najiaData.g
    const zhi = najiaData.z[localIdx]
    const wuxing = ZHI_WX[zhi] || '水'
    
    // 六亲关系使用本宫五行对比变卦纳甲五行
    const relation = getRelation(benGongWx, wuxing)

    details.push({
      animal: '', // 变卦不排六兽
      animalShort: '',
      relation,
      relationShort: RELATION_SHORT_NAMES[relation] || relation,
      branch: zhi,
      element: wuxing,
      stem: gan,
      isShi: false,
      isYing: false
    })
  }

  console.log('calculateChangedLineDetails', details)

  return details
}

/** 计算神煞 */
export const getExtendedShenSha = (dayGan: string, dayZhi: string, monthZhi: string, yearZhi: string): ShenShaItem[] => {
  const list: ShenShaItem[] = []
  const push = (name: string, val: string | undefined) => {
    if (val) list.push({ name, value: val })
  }

  // 1. 驿马 (查日支)
  const yiMaMap: Record<string, string> = { '申': '寅', '子': '寅', '辰': '寅', '寅': '申', '午': '申', '戌': '申', '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳' }
  push('驿马', yiMaMap[dayZhi])

  // 2. 桃花
  const taoHuaMap: Record<string, string> = { '申': '酉', '子': '酉', '辰': '酉', '寅': '卯', '午': '卯', '戌': '卯', '巳': '午', '酉': '午', '丑': '午', '亥': '子', '卯': '子', '未': '子' }
  push('桃花', taoHuaMap[dayZhi])

  // 3. 日禄 (查日干)
  const luMap: Record<string, string> = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' }
  push('日禄', luMap[dayGan])

  // 4. 贵人
  const guiRenMap: Record<string, string> = { '甲': '丑未', '戊': '丑未', '庚': '丑未', '乙': '子申', '己': '子申', '丙': '亥酉', '丁': '亥酉', '壬': '巳卯', '癸': '巳卯', '辛': '午寅' }
  push('贵人', guiRenMap[dayGan])

  // 5. 文昌
  const wenChangMap: Record<string, string> = { '甲': '巳', '乙': '午', '丙': '申', '戊': '申', '丁': '酉', '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯' }
  push('文昌', wenChangMap[dayGan])

  // 6. 将星
  const jiangXingMap: Record<string, string> = { '申': '子', '子': '子', '辰': '子', '寅': '午', '午': '午', '戌': '午', '巳': '酉', '酉': '酉', '丑': '酉', '亥': '卯', '卯': '卯', '未': '卯' }
  push('将星', jiangXingMap[dayZhi])

  // 7. 华盖
  const huaGaiMap: Record<string, string> = { '申': '辰', '子': '辰', '辰': '辰', '寅': '戌', '午': '戌', '戌': '戌', '巳': '丑', '酉': '丑', '丑': '丑', '亥': '未', '卯': '未', '未': '未' }
  push('华盖', huaGaiMap[dayZhi])

  // 8. 羊刃
  const yangRenMap: Record<string, string> = { '甲': '卯', '乙': '辰', '丙': '午', '丁': '未', '戊': '午', '己': '未', '庚': '酉', '辛': '戌', '壬': '子', '癸': '丑' }
  push('羊刃', yangRenMap[dayGan])

  // 9. 劫煞
  const jieShaMap: Record<string, string> = { '申': '巳', '子': '巳', '辰': '巳', '寅': '亥', '午': '亥', '戌': '亥', '巳': '寅', '酉': '寅', '丑': '寅', '亥': '申', '卯': '申', '未': '申' }
  push('劫煞', jieShaMap[dayZhi])

  // 10. 灾煞
  const zaiShaMap: Record<string, string> = { '申': '午', '子': '午', '辰': '午', '寅': '子', '午': '子', '戌': '子', '巳': '卯', '酉': '卯', '丑': '卯', '亥': '酉', '卯': '酉', '未': '酉' }
  push('灾煞', zaiShaMap[dayZhi])

  // 11. 亡神
  const wangShenMap: Record<string, string> = { '申': '亥', '子': '亥', '辰': '亥', '寅': '巳', '午': '巳', '戌': '巳', '巳': '申', '酉': '申', '丑': '申', '亥': '寅', '卯': '寅', '未': '寅' }
  push('亡神', wangShenMap[dayZhi])

  // 12. 孤辰 (查年支)
  const guChenMap: Record<string, string> = { '亥': '寅', '子': '寅', '丑': '寅', '寅': '巳', '卯': '巳', '辰': '巳', '巳': '申', '午': '申', '未': '申', '申': '亥', '酉': '亥', '戌': '亥' }
  push('孤辰', guChenMap[yearZhi])

  // 13. 寡宿 (查年支)
  const guaSuMap: Record<string, string> = { '亥': '戌', '子': '戌', '丑': '戌', '寅': '丑', '卯': '丑', '辰': '丑', '巳': '辰', '午': '辰', '未': '辰', '申': '未', '酉': '未', '戌': '未' }
  push('寡宿', guaSuMap[yearZhi])
  
  // 14. 天医 (查月支)
  const tianYiMap: Record<string, string> = { '子': '亥', '丑': '子', '寅': '丑', '卯': '寅', '辰': '卯', '巳': '辰', '午': '巳', '未': '午', '申': '未', '酉': '申', '戌': '酉', '亥': '戌' }
  push('天医', tianYiMap[monthZhi])

  return list
}


export const GONG_MAPPING: Record<string, { nature: string }> = {
  // 乾宫
  '乾为天': { nature: '乾宫' }, '天风姤': { nature: '乾宫' }, '天山遁': { nature: '乾宫' }, '天地否': { nature: '乾宫' },
  '风地观': { nature: '乾宫' }, '山地剥': { nature: '乾宫' }, '火地晋': { nature: '乾宫' }, '火天大有': { nature: '乾宫' },
  // 兑宫
  '兑为泽': { nature: '兑宫' }, '泽水困': { nature: '兑宫' }, '泽地萃': { nature: '兑宫' }, '泽山咸': { nature: '兑宫' },
  '水山蹇': { nature: '兑宫' }, '地山谦': { nature: '兑宫' }, '雷山小过': { nature: '兑宫' }, '雷泽归妹': { nature: '兑宫' },
  // 离宫
  '离为火': { nature: '离宫' }, '火山旅': { nature: '离宫' }, '火风鼎': { nature: '离宫' }, '火水未济': { nature: '离宫' },
  '山水蒙': { nature: '离宫' }, '风水涣': { nature: '离宫' }, '天水讼': { nature: '离宫' }, '天火同人': { nature: '离宫' },
  // 震宫
  '震为雷': { nature: '震宫' }, '雷地豫': { nature: '震宫' }, '雷水解': { nature: '震宫' }, '雷风恒': { nature: '震宫' },
  '地风升': { nature: '震宫' }, '水风井': { nature: '震宫' }, '泽风大过': { nature: '震宫' }, '泽雷随': { nature: '震宫' },
  // 巽宫
  '巽为风': { nature: '巽宫' }, '风天小畜': { nature: '巽宫' }, '风火家人': { nature: '巽宫' }, '风雷益': { nature: '巽宫' },
  '天雷无妄': { nature: '巽宫' }, '火雷噬嗑': { nature: '巽宫' }, '山雷颐': { nature: '巽宫' }, '山风蛊': { nature: '巽宫' },
  // 坎宫
  '坎为水': { nature: '坎宫' }, '水泽节': { nature: '坎宫' }, '水雷屯': { nature: '坎宫' }, '水火既济': { nature: '坎宫' },
  '泽火革': { nature: '坎宫' }, '雷火丰': { nature: '坎宫' }, '地火明夷': { nature: '坎宫' }, '地水师': { nature: '坎宫' },
  // 艮宫
  '艮为山': { nature: '艮宫' }, '山火贲': { nature: '艮宫' }, '山天大畜': { nature: '艮宫' }, '山泽损': { nature: '艮宫' },
  '火泽睽': { nature: '艮宫' }, '天泽履': { nature: '艮宫' }, '风泽中孚': { nature: '艮宫' }, '风山渐': { nature: '艮宫' },
  // 坤宫
  '坤为地': { nature: '坤宫' }, '地雷复': { nature: '坤宫' }, '地泽临': { nature: '坤宫' }, '地天泰': { nature: '坤宫' },
  '雷天大壮': { nature: '坤宫' }, '泽天夬': { nature: '坤宫' }, '水天需': { nature: '坤宫' }, '水地比': { nature: '坤宫' },
}

/** 获取卦象五行与宫位 */
export const getHexagramNature = (binaryKey: string, hexagramName: string): HexagramNature => {
  const hexData = HEX_64_DATA[binaryKey]
  if (hexData) {
    const [fullName, element] = hexData
    
    // 优先查表
    if (GONG_MAPPING[fullName]) {
      return { nature: GONG_MAPPING[fullName].nature, element }
    }
    
    // 备选映射
    const elementToNature: Record<string, string> = { '金': '乾宫', '木': '震宫', '水': '坎宫', '火': '离宫', '土': '坤宫' }
    return { nature: elementToNature[element] || '震宫', element }
  }
  
  // 兜底逻辑
  const natureMap: Record<string, { nature: string, element: string }> = {
    '乾': { nature: '乾宫', element: '金' }, '坤': { nature: '坤宫', element: '土' },
    '震': { nature: '震宫', element: '木' }, '巽': { nature: '巽宫', element: '木' },
    '坎': { nature: '坎宫', element: '水' }, '离': { nature: '离宫', element: '火' },
    '艮': { nature: '艮宫', element: '土' }, '兑': { nature: '兑宫', element: '金' },
  }
  
  for (const [key, value] of Object.entries(natureMap)) {
    if (hexagramName.includes(key)) return value
  }
  
  return { nature: '震宫', element: '木' }
}

const YOU_HUN_KEYS = ["000101", "001100", "010111", "011110", "100001", "101000", "110011", "111010"]
const GUI_HUN_KEYS = ["111101", "110100", "101111", "100110", "011001", "010000", "001011", "000010"]

/** 获取游魂/归魂信息 */
export const getHexagramFullInfo = (binaryKey: string): HexagramFullInfo => {
  const hexData = HEX_64_DATA[binaryKey]
  if (!hexData) return { fullName: null, soulType: '' }
  
  const [fullName] = hexData
  let soulType = ''
  if (YOU_HUN_KEYS.includes(binaryKey)) soulType = '游魂'
  else if (GUI_HUN_KEYS.includes(binaryKey)) soulType = '归魂'
  
  return { fullName, soulType }
}

/** 计算伏神和卦身 */
export const getFuShenAndGuaShen = (
  hexagramKey: string, 
  lineDetails: LineDetail[], 
  gongNature: string, // 传入宫位名称，如"乾宫"
  gongElement: string // 传入宫位五行，如"金"
) => {
  const hexData = HEX_64_DATA[hexagramKey]
  // 必须确保 HEX_64_DATA 包含世爻(shi)的位置信息 (1-6)
  if (!hexData || !lineDetails || lineDetails.length !== 6) {
    return { fuShenMap: {}, guaShen: '', guaShenLineIndex: null }
  }
  
  // ==========================================
  // 1. 修正后的卦身计算 (Gua Shen)
  // ==========================================
  // 卦身排布口诀：阳世则从子月起，阴世则从午月生
  // 阳世序列：子、寅、辰、午、申、戌
  // 阴世序列：午、申、戌、子、寅、辰
  
  const yangShiSeq = ['子', '寅', '辰', '午', '申', '戌'] // 阳世序列
  const yinShiSeq = ['午', '申', '戌', '子', '寅', '辰'] // 阴世序列
  
  // 获取世爻的位置（注意：hexData[2] 是世爻位置，通常是 1-6，数组索引是 0-5）
  const shiPos = hexData[2] || 1
  const shiIndex = shiPos - 1 // 转换为数组索引（0-5）
  
  // 确定世爻位的阴阳属性
  // hexagramKey 字符串顺序为：索引0=初爻 ... 索引5=上爻
  // 1=阳，0=阴
  const shiYaoYinYang = hexagramKey[shiIndex] || '1'
  
  // 根据世爻的阴阳属性选择对应的序列
  const guaShenZhi = shiYaoYinYang === '1' 
    ? yangShiSeq[shiIndex] 
    : yinShiSeq[shiIndex]
  
  // 在本卦中查找卦身是否存在
  let guaShen = ''
  let guaShenLineIndex: number | null = null
  for (let i = 0; i < lineDetails.length; i++) {
    if (lineDetails[i].branch === guaShenZhi) {
      guaShen = `${lineDetails[i].relationShort}${lineDetails[i].branch}${lineDetails[i].element}`
      guaShenLineIndex = i
      break // 通常只取出现的第一个，或者根据具体流派取离世爻最近的
    }
  }
  
  // ==========================================
  // 2. 计算伏神 (Fu Shen)
  // ==========================================
  const existingRelations = new Set(lineDetails.map(d => d.relation))
  const allRelations = ['父母', '兄弟', '子孙', '妻财', '官鬼']
  // 找出本卦中缺失的六亲
  const missingRelations = allRelations.filter(r => !existingRelations.has(r))

  const fuShenMap: Record<number, string> = {}

  // 如果有缺失的六亲，才去查本宫卦
  if (missingRelations.length > 0) {
    // 确定本宫卦 Key (二进制 0为阴 1为阳)
    // 这里的 Key 必须对应八纯卦：乾坎艮震巽离坤兑
    const gongToPure: Record<string, string> = {
      '乾宫': '111111', // 乾为天
      '坤宫': '000000', // 坤为地
      '震宫': '100100', // 震为雷 (初爻阳)
      '巽宫': '011011', // 巽为风 (初爻阴)
      '坎宫': '010010', // 坎为水 (初爻阴，二爻阳)
      '离宫': '101101', // 离为火 (初爻阳，二爻阴)
      '艮宫': '001001', // 艮为山 (三爻阳)
      '兑宫': '110110', // 兑为泽 (三爻阴)
    }
  
    const pureKey = gongToPure[gongNature] || '111111'
    
    // 解析本宫卦的纳甲信息
    // 注意：binary 字符串索引 0-2 为下卦，3-5 为上卦 (假设字符串是 初爻->上爻)
    const pureLowerBin = pureKey.substring(0, 3)
    const pureUpperBin = pureKey.substring(3, 6)
    const pureDetails: Array<{ relation: string; branch: string; element: string }> = []
  
    const promotes: Record<string, string> = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' }
    const controls: Record<string, string> = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' }

    for (let i = 0; i < 6; i++) {
      const isUpper = i >= 3
      const localIdx = i % 3
      const trigramBin = isUpper ? pureUpperBin : pureLowerBin
      
      // 安全获取纳甲规则
      const najiaObj = NAJIA_RULES[trigramBin] || NAJIA_RULES['111']
      if (!najiaObj) continue

      const najiaData = isUpper ? najiaObj.outer : najiaObj.inner
      const zhi = najiaData.z[localIdx]
      const wuxing = ZHI_WX[zhi] || '水' // 使用外部 ZHI_WX，如果不存在则默认'水'
      
      // 根据本宫的五行属性重新定六亲
      let relation = '兄弟'
      if (gongElement === wuxing) relation = '兄弟'
      else if (promotes[gongElement] === wuxing) relation = '子孙'
      else if (promotes[wuxing] === gongElement) relation = '父母'
      else if (controls[gongElement] === wuxing) relation = '妻财'
      else if (controls[wuxing] === gongElement) relation = '官鬼'
      
      pureDetails.push({ relation, branch: zhi, element: wuxing })
    }
    
    // 映射伏神：将缺失的六亲映射到本卦对应的爻位上
    for (const missingRel of missingRelations) {
      // 在本宫卦中从初爻向上寻找
      for (let i = 0; i < pureDetails.length; i++) {
        if (pureDetails[i].relation === missingRel) {
          const relShort = missingRel === '父母' ? '父' : missingRel === '兄弟' ? '兄' : missingRel === '子孙' ? '孙' : missingRel === '妻财' ? '财' : '官'
          // i 是本宫卦的第几爻，伏神就伏在主卦的第 i 爻下
          fuShenMap[i] = `${relShort} ${pureDetails[i].branch}${pureDetails[i].element}`
          // 找到第一个即停止（通常伏神只取一个最旺或最靠下的）
          break
        }
      }
    }
  }
  
  // 如果本卦中找不到卦身，guaShen 为空字符串，表示卦身不上卦
  return { fuShenMap, guaShen: guaShen || '', guaShenLineIndex }
}