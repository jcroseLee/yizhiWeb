/**
 * 真太阳时计算工具
 * 真太阳时 = 平太阳时 + 经度时差 + 平太阳时差
 */

// 主要城市的经度（东经，度）
// 如果城市不在列表中，使用默认值（北京：116.4）
const CITY_LONGITUDE_MAP: Record<string, number> = {
  // 直辖市
  '北京': 116.4,
  '上海': 121.5,
  '天津': 117.2,
  '重庆': 106.5,
  
  // 主要省会城市
  '广州': 113.3,
  '深圳': 114.1,
  '杭州': 120.2,
  '南京': 118.8,
  '成都': 104.1,
  '武汉': 114.3,
  '西安': 108.9,
  '沈阳': 123.4,
  '哈尔滨': 126.6,
  '长春': 125.3,
  '石家庄': 114.5,
  '太原': 112.5,
  '济南': 117.0,
  '郑州': 113.7,
  '合肥': 117.3,
  '南昌': 115.9,
  '福州': 119.3,
  '长沙': 113.0,
  '昆明': 102.7,
  '贵阳': 106.7,
  '南宁': 108.3,
  '海口': 110.3,
  '拉萨': 91.1,
  '乌鲁木齐': 87.6,
  '银川': 106.3,
  '西宁': 101.8,
  '兰州': 103.8,
}

/**
 * 从城市名称中提取经度
 * 格式：区县（城市，省份）
 */
function getLongitudeFromCity(cityName: string): number {
  if (!cityName) {
    return 116.4 // 默认北京经度
  }
  
  // 尝试从城市名称中匹配
  for (const [key, longitude] of Object.entries(CITY_LONGITUDE_MAP)) {
    if (cityName.includes(key)) {
      return longitude
    }
  }
  
  // 如果找不到，尝试提取省份或城市名
  const match = cityName.match(/（([^，]+)，([^）]+)）/)
  if (match) {
    const city = match[1]
    const province = match[2]
    
    // 先尝试城市名
    for (const [key, longitude] of Object.entries(CITY_LONGITUDE_MAP)) {
      if (city.includes(key) || key.includes(city.replace('市', ''))) {
        return longitude
      }
    }
    
    // 再尝试省份名
    for (const [key, longitude] of Object.entries(CITY_LONGITUDE_MAP)) {
      if (province.includes(key)) {
        return longitude
      }
    }
  }
  
  // 默认返回北京经度
  return 116.4
}

/**
 * 计算平太阳时差（时差表）
 * 根据一年中的第几天计算时差（分钟）
 * 使用简化的公式：时差 = 4 * sin(2π * (dayOfYear - 81) / 365.25)
 * 这是一个近似值，实际时差表更复杂
 */
function getEquationOfTime(dayOfYear: number): number {
  // 使用简化的公式计算时差（分钟）
  // 实际应该使用更精确的时差表
  const n = dayOfYear - 1
  const B = (2 * Math.PI * n) / 365
  
  // 简化的时差公式（分钟）
  let EoT = 7.678 * Math.sin(B + 1.374) +
            9.238 * Math.sin(2 * B + 1.484) +
            0.215 * Math.sin(3 * B + 1.579) +
            0.159 * Math.sin(4 * B + 1.675)
  
  return EoT
}

/**
 * 计算真太阳时
 * @param date 平太阳时日期
 * @param cityName 城市名称（格式：区县（城市，省份））
 * @returns 校正后的日期对象
 */
export function calculateTrueSolarTime(date: Date, cityName?: string): Date {
  if (!cityName) {
    return date
  }
  
  // 1. 计算经度时差
  const longitude = getLongitudeFromCity(cityName)
  const standardLongitude = 120.0 // 北京时间标准经度（东经120度）
  const longitudeDiff = longitude - standardLongitude
  const longitudeTimeDiff = longitudeDiff * 4 // 每度4分钟
  
  // 2. 计算平太阳时差
  const year = date.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const equationOfTime = getEquationOfTime(dayOfYear)
  
  // 3. 总时差（分钟）
  const totalTimeDiff = longitudeTimeDiff + equationOfTime
  
  // 4. 创建新的日期对象并应用时差
  const correctedDate = new Date(date)
  correctedDate.setMinutes(correctedDate.getMinutes() + totalTimeDiff)
  
  return correctedDate
}

/**
 * 获取时差信息（用于显示）
 */
export function getTimeDifferenceInfo(date: Date, cityName?: string): {
  longitudeDiff: number
  equationOfTime: number
  totalDiff: number
  longitude: number
} {
  if (!cityName) {
    return {
      longitudeDiff: 0,
      equationOfTime: 0,
      totalDiff: 0,
      longitude: 116.4,
    }
  }
  
  const longitude = getLongitudeFromCity(cityName)
  const standardLongitude = 120.0
  const longitudeDiff = longitude - standardLongitude
  const longitudeTimeDiff = longitudeDiff * 4
  
  const year = date.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const equationOfTime = getEquationOfTime(dayOfYear)
  
  return {
    longitudeDiff: longitudeDiff,
    equationOfTime: equationOfTime,
    totalDiff: longitudeTimeDiff + equationOfTime,
    longitude: longitude,
  }
}
