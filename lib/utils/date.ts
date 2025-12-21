import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import advancedFormat from 'dayjs/plugin/advancedFormat'

// 配置 dayjs
dayjs.extend(customParseFormat)
dayjs.extend(advancedFormat)
dayjs.locale('zh-cn')

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string, format = 'YYYY年MM月DD日 HH:mm'): string {
  return dayjs(date).format(format)
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, format = 'YYYY年MM月DD日'): string {
  return dayjs(date).format(format)
}

/**
 * 格式化时间
 */
export function formatTime(date: Date | string, format = 'HH:mm'): string {
  return dayjs(date).format(format)
}

export { dayjs }

