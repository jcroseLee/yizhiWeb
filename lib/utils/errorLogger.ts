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
  if (typeof error === 'object' && error !== null) {
    // 快速检查：如果是空对象，直接进入警告流程
    const errorKeys = Object.keys(error)
    if (errorKeys.length === 0) {
      console.warn(message + ' (收到空错误对象)', {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        suggestion: '这可能是数据库连接问题或 RPC 函数不存在。请检查：1) 数据库连接是否正常 2) 相关数据库函数是否存在',
      })
      return
    }
    
    const errorInfo: Record<string, any> = {}
    
    // 收集所有可能的错误字段（包括 Supabase 错误字段）
    if (error.code) errorInfo.code = error.code
    if (error.message) errorInfo.message = error.message
    if (error.details) errorInfo.details = error.details
    if (error.hint) errorInfo.hint = error.hint
    
    // Supabase 特定错误字段
    if (error.status) errorInfo.status = error.status
    if (error.statusText) errorInfo.statusText = error.statusText
    
    // 如果对象有自定义属性（如 fullError），也记录
    if (error.fullError) {
      errorInfo.fullError = error.fullError
    }
    
    // 检查对象的所有键（包括不可枚举的）
    const allKeys = Object.keys(error)
    const hasEnumerableKeys = allKeys.length > 0
    
    // 尝试获取所有属性（包括不可枚举的）
    let hasAnyProperties = hasEnumerableKeys
    if (!hasEnumerableKeys) {
      // 检查是否有任何属性（包括不可枚举的）
      try {
        const descriptor = Object.getOwnPropertyDescriptors(error)
        hasAnyProperties = Object.keys(descriptor).length > 0
      } catch (e) {
        // ignore
      }
    }
    
    if (hasEnumerableKeys) {
      // 如果有键但没有标准字段，尝试记录所有可枚举属性
      if (Object.keys(errorInfo).length === 0) {
        // 尝试记录所有可枚举属性
        for (const key of allKeys) {
          try {
            const value = error[key]
            // 只记录简单类型，避免循环引用
            if (value !== null && typeof value !== 'object') {
              errorInfo[key] = value
            } else if (typeof value === 'object' && value !== null) {
              // 对于对象，尝试 stringify
              try {
                const str = JSON.stringify(value)
                if (str && str !== '{}' && str !== '[]') {
                  errorInfo[key] = str.length > 200 ? str.substring(0, 200) + '...' : str
                }
              } catch (e) {
                errorInfo[key] = '[Object]'
              }
            }
          } catch (e) {
            // ignore
          }
        }
        
        // 如果还是没有内容，记录键名
        if (Object.keys(errorInfo).length === 0) {
          errorInfo._keys = allKeys
        }
      }
    }
    
    // 过滤掉 undefined、null 和空字符串值，只保留有意义的错误信息
    const filteredErrorInfo: Record<string, any> = {}
    for (const [key, value] of Object.entries(errorInfo)) {
      if (value !== undefined && value !== null && value !== '' && 
          !(typeof value === 'object' && Object.keys(value).length === 0)) {
        filteredErrorInfo[key] = value
      }
    }
    
    // 只有当有实际内容时才记录
    if (Object.keys(filteredErrorInfo).length > 0) {
      console.error(message, filteredErrorInfo)
    } else {
      // 如果是完全空的对象，尝试记录原始对象的 stringify 结果
      try {
        const stringified = JSON.stringify(error, null, 2)
        if (stringified && stringified !== '{}' && stringified !== 'null') {
           console.error(message + ' (JSON):', stringified)
           return
        }
      } catch (e) {
        // ignore circular reference etc
      }

      // 如果是完全空的对象，记录一个警告而不是错误
      // 这样可以避免在控制台显示无意义的空对象错误
      console.warn(message + ' (收到空错误对象)', {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        hasProperties: hasAnyProperties,
        suggestion: '这可能是数据库连接问题或 RPC 函数不存在。请检查：1) 数据库连接是否正常 2) get_dm_conversations 函数是否存在',
      })
    }
  }
}

