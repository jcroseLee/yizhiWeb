/**
 * 爻线工具函数 - 统一管理所有爻线相关的转换和判断逻辑
 * 
 * 标准定义：
 * - '-----' = 少阳（阳爻，静）
 * - '-- --' = 少阴（阴爻，静）
 * - '---X---' = 老阴（阴爻，动）→ 变卦后变成少阳 '-----'
 * - '---O---' = 老阳（阳爻，动）→ 变卦后变成少阴 '-- --'
 */

/**
 * 爻线类型
 */
export type LineString = '-----' | '-- --' | '---X---' | '---O---'

/**
 * 爻线状态类型
 */
export type LineStatus = '少阳' | '少阴' | '老阳' | '老阴'

/**
 * 爻线属性
 */
export interface LineInfo {
  /** 爻线字符串 */
  value: LineString
  /** 状态：少阳/少阴/老阳/老阴 */
  status: LineStatus
  /** 是否为阳爻 */
  isYang: boolean
  /** 是否为动爻 */
  isChanging: boolean
  /** 数字表示：7=少阳, 8=少阴, 6=老阴, 9=老阳 */
  number: 6 | 7 | 8 | 9
  /** 二进制表示：'1'=阳, '0'=阴 */
  binary: '0' | '1'
}

/**
 * 获取爻线信息
 */
export function getLineInfo(line: string | null | undefined): LineInfo | null {
  if (!line) return null

  // 标准化输入：去除空格，统一格式
  const normalized = line.trim()

  // 老阴（阴爻，动）
  if (normalized.includes('X') || normalized === '---X---') {
    return {
      value: '---X---',
      status: '老阴',
      isYang: false,
      isChanging: true,
      number: 6,
      binary: '0'
    }
  }

  // 老阳（阳爻，动）
  if (normalized.includes('O') || normalized === '---O---') {
    return {
      value: '---O---',
      status: '老阳',
      isYang: true,
      isChanging: true,
      number: 9,
      binary: '1'
    }
  }

  // 少阳（阳爻，静）- 实线
  if (normalized === '-----' || normalized.includes('-----')) {
    return {
      value: '-----',
      status: '少阳',
      isYang: true,
      isChanging: false,
      number: 7,
      binary: '1'
    }
  }

  // 少阴（阴爻，静）- 虚线
  if (normalized === '-- --' || normalized.includes('-- --')) {
    return {
      value: '-- --',
      status: '少阴',
      isYang: false,
      isChanging: false,
      number: 8,
      binary: '0'
    }
  }

  // 默认返回少阳
  return {
    value: '-----',
    status: '少阳',
    isYang: true,
    isChanging: false,
    number: 7,
    binary: '1'
  }
}

/**
 * 将爻线字符串转换为二进制（用于计算卦的key）
 * @param line 爻线字符串
 * @returns '0' 表示阴爻，'1' 表示阳爻
 */
export function lineToBinary(line: string | null | undefined): '0' | '1' {
  const info = getLineInfo(line)
  return info?.binary || '1'
}

/**
 * 将爻线数组转换为二进制字符串（用于计算卦的key）
 * @param lines 爻线字符串数组
 * @returns 二进制字符串，如 '101010'
 */
export function linesToBinaryString(lines: string[]): string {
  return lines.map(line => lineToBinary(line)).join('')
}

/**
 * 将爻线字符串解析为数字
 * @param line 爻线字符串
 * @returns 6=老阴, 7=少阳, 8=少阴, 9=老阳
 */
export function lineToNumber(line: string | null | undefined): 6 | 7 | 8 | 9 {
  const info = getLineInfo(line)
  return info?.number || 7
}

/**
 * 判断爻线是否为阳爻
 * @param line 爻线字符串
 * @returns true 表示阳爻，false 表示阴爻
 */
export function isYangLine(line: string | null | undefined): boolean {
  const info = getLineInfo(line)
  return info?.isYang ?? true
}

/**
 * 判断爻线是否为动爻
 * @param line 爻线字符串
 * @returns true 表示动爻，false 表示静爻
 */
export function isChangingLine(line: string | null | undefined): boolean {
  const info = getLineInfo(line)
  return info?.isChanging ?? false
}

/**
 * 构建变卦后的爻线
 * 规则：
 * - 老阴(---X---)变少阳('-----') - 阴变阳
 * - 老阳(---O---)变少阴('-- --') - 阳变阴
 * - 静爻保持不变
 * 
 * @param lines 原始爻线数组
 * @param changingFlags 动爻标志数组
 * @returns 变卦后的爻线数组
 */
export function buildChangedLines(
  lines: string[],
  changingFlags: boolean[]
): string[] {
  return lines.map((line, index) => {
    // 如果不是动爻，保持不变
    if (!changingFlags[index]) {
      return line
    }

    const info = getLineInfo(line)
    if (!info) return line

    // 老阴变少阳（阴变阳）- '-----' = 少阳
    if (info.status === '老阴') {
      return '-----'
    }

    // 老阳变少阴（阳变阴）- '-- --' = 少阴
    if (info.status === '老阳') {
      return '-- --'
    }

    // 其他情况（理论上不应该发生，但为了安全保留）
    return line
  })
}

/**
 * 将数字转换为爻线字符串
 * @param num 6=老阴, 7=少阳, 8=少阴, 9=老阳
 * @returns 对应的爻线字符串
 */
export function numberToLine(num: 6 | 7 | 8 | 9): LineString {
  switch (num) {
    case 6:
      return '---X---' // 老阴（阴爻，动）
    case 7:
      return '-----' // 少阳（阳爻，静）
    case 8:
      return '-- --' // 少阴（阴爻，静）
    case 9:
      return '---O---' // 老阳（阳爻，动）
    default:
      return '-----' // 默认少阳
  }
}

/**
 * 将二进制字符转换为爻线字符串（静爻）
 * @param binary '0' 表示阴爻，'1' 表示阳爻
 * @returns 对应的静爻字符串：'1' -> '-----' (少阳), '0' -> '-- --' (少阴)
 */
export function binaryToLine(binary: '0' | '1'): LineString {
  return binary === '1' ? '-----' : '-- --'
}

