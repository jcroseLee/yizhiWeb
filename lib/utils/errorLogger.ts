/**
 * 错误日志工具函数
 * 统一处理错误日志，避免记录空对象错误
 */

/**
 * 安全地记录错误，只记录有实际内容的错误
 * 避免记录空对象错误
 * 
 * @param message - 错误消息前缀
 * @param error - 错误对象
 */
export function logError(message: string, error: any): void {
  // 如果错误为空，直接返回
  if (!error) return
  
  // 处理 Error 实例
  if (error instanceof Error) {
    console.error(message, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    return
  }
  
  // 处理字符串
  if (typeof error === 'string' && error.length > 0) {
    console.error(message, error)
    return
  }
  
  // 处理对象 - 只记录非空属性
  if (typeof error === 'object') {
    const errorInfo: Record<string, any> = {}
    
    // 收集所有可能的错误字段
    if (error.code) errorInfo.code = error.code
    if (error.message) errorInfo.message = error.message
    if (error.details) errorInfo.details = error.details
    if (error.hint) errorInfo.hint = error.hint
    
    // 如果对象有自定义属性（如 fullError），也记录
    if (error.fullError) {
      errorInfo.fullError = error.fullError
    }
    
    // 检查对象的所有键
    const allKeys = Object.keys(error)
    if (allKeys.length > 0) {
      // 如果有键但没有标准字段，记录所有键
      if (Object.keys(errorInfo).length === 0) {
        errorInfo._raw = error
        errorInfo._keys = allKeys
      }
    }
    
    // 只有当有实际内容时才记录
    if (Object.keys(errorInfo).length > 0) {
      console.error(message, errorInfo)
    } else {
      // 如果是完全空的对象，至少记录一个警告
      console.warn(message + ' (空错误对象，可能是数据库连接或字段问题)', {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        suggestion: '请检查数据库迁移是否已运行，特别是 status 字段是否存在',
      })
    }
  }
}

