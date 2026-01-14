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
  
  const safeStringify = (value: unknown, maxLength: number = 800): string | null => {
    try {
      const seen = new WeakSet<object>()
      const str = JSON.stringify(
        value,
        (_key, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) return '[Circular]'
            seen.add(val)
          }
          if (typeof val === 'bigint') return val.toString()
          return val
        },
        2
      )
      if (!str) return null
      if (str.length > maxLength) return str.slice(0, maxLength) + '...'
      return str
    } catch {
      return null
    }
  }

  const simplifyValue = (value: any): any => {
    if (value === null || value === undefined) return value
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      }
    }
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value
    if (typeof value === 'boolean') return value
    if (typeof value === 'bigint') return value.toString()
    if (typeof value === 'symbol') return value.toString()
    if (typeof value === 'function') return `[Function${value.name ? `: ${value.name}` : ''}]`
    if (Array.isArray(value)) {
      if (value.length === 0) return value
      if (value.length > 20) return `[Array(${value.length})]`
      return value.map((v) => simplifyValue(v))
    }
    if (typeof value === 'object') {
      const str = safeStringify(value)
      if (str && str !== '{}' && str !== '[]' && str !== 'null') return str
      const ctor = value?.constructor?.name
      return ctor ? `[Object: ${ctor}]` : '[Object]'
    }
    return String(value)
  }

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
    // 首先尝试 stringify 来快速检测空对象
    let stringifiedEarly: string | null = null
    try {
      stringifiedEarly = JSON.stringify(error)
    } catch (e) {
      // 如果无法 stringify（可能是循环引用），继续下面的检查
    }
    
    // 快速检查：如果是空对象，直接进入警告流程
    const enumerableKeys = Object.keys(error)
    const ownPropertyNames = Object.getOwnPropertyNames(error)
    const errorKeys = Array.from(new Set([...enumerableKeys, ...ownPropertyNames]))
    
    // 检查是否所有属性都是 undefined/null/空值
    let hasValidProperties = false
    if (errorKeys.length > 0) {
      for (const key of errorKeys) {
        try {
          const value = (error as any)[key]
          if (value !== undefined && value !== null && value !== '' &&
              !(typeof value === 'object' && value !== null && Object.keys(value).length === 0) &&
              !(Array.isArray(value) && value.length === 0)) {
            hasValidProperties = true
            break
          }
        } catch {
          hasValidProperties = true
          break
        }
      }
    }
    
    // 如果没有有效属性，当作空对象处理
    if (errorKeys.length === 0 || !hasValidProperties) {
      console.warn(message + ' (收到空错误对象)', {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        hasKeys: errorKeys.length > 0,
        keys: errorKeys.length > 0 ? errorKeys : undefined,
        stringified: stringifiedEarly || 'N/A',
        suggestion: '这可能是数据库连接问题或查询返回了空错误对象。请检查：1) 数据库连接是否正常 2) 查询参数是否正确 3) 数据库表结构是否正确',
      })
      return
    }
    
    const errorInfo: Record<string, any> = {}
    
    // 收集所有可能的错误字段（包括 Supabase 错误字段）
    try {
      if ((error as any).code) errorInfo.code = simplifyValue((error as any).code)
    } catch {}
    try {
      if ((error as any).message) errorInfo.message = simplifyValue((error as any).message)
    } catch {}
    try {
      if ((error as any).details) errorInfo.details = simplifyValue((error as any).details)
    } catch {}
    try {
      if ((error as any).hint) errorInfo.hint = simplifyValue((error as any).hint)
    } catch {}
    
    // Supabase 特定错误字段
    try {
      if ((error as any).status) errorInfo.status = simplifyValue((error as any).status)
    } catch {}
    try {
      if ((error as any).statusText) errorInfo.statusText = simplifyValue((error as any).statusText)
    } catch {}
    
    // 如果对象有自定义属性（如 fullError），也记录
    try {
      if ((error as any).fullError) errorInfo.fullError = simplifyValue((error as any).fullError)
    } catch {}
    
    // 如果有键但没有标准字段，尝试记录所有可枚举属性
    if (Object.keys(errorInfo).length === 0) {
      // 尝试记录所有可枚举属性
      for (const key of errorKeys) {
        try {
          const value = (error as any)[key]
          const simplified = simplifyValue(value)
          if (simplified !== undefined && simplified !== null && simplified !== '' &&
              !(typeof simplified === 'object' && !Array.isArray(simplified) && Object.keys(simplified).length === 0) &&
              !(Array.isArray(simplified) && simplified.length === 0)) {
            errorInfo[key] = simplified
          }
        } catch (e) {
          // ignore
        }
      }
    }
    
    // 过滤掉 undefined、null 和空字符串值，只保留有意义的错误信息
    const filteredErrorInfo: Record<string, any> = {}
    for (const [key, value] of Object.entries(errorInfo)) {
      if (value !== undefined && value !== null && value !== '' && 
          !(typeof value === 'object' && !Array.isArray(value) && value !== null && Object.keys(value).length === 0) &&
          !(Array.isArray(value) && value.length === 0)) {
        filteredErrorInfo[key] = value
      }
    }
    
    // 只有当有实际内容时才记录
    // 双重检查：不仅要有键，还要确保 stringify 后不是空对象
    const hasKeys = Object.keys(filteredErrorInfo).length > 0
    let stringifiedFiltered: string | null = null
    let isEffectivelyEmpty = false
    
    if (hasKeys) {
      try {
        stringifiedFiltered = JSON.stringify(filteredErrorInfo, null, 2)
        // 检查 stringify 后的结果是否为空对象
        if (!stringifiedFiltered || stringifiedFiltered === '{}' || stringifiedFiltered.trim() === '{}') {
          isEffectivelyEmpty = true
        }
      } catch (e) {
        // 如果无法 stringify，检查是否所有值都是不可序列化的
        const allValuesEmpty = Object.values(filteredErrorInfo).every(val => 
          val === undefined || val === null || 
          (typeof val === 'function') ||
          (typeof val === 'symbol')
        )
        if (allValuesEmpty) {
          isEffectivelyEmpty = true
        }
      }
    }
    
    if (hasKeys && !isEffectivelyEmpty) {
      if (stringifiedFiltered && stringifiedFiltered !== '{}' && stringifiedFiltered.trim() !== '{}') {
        console.error(message, stringifiedFiltered)
      } else {
        console.error(message, filteredErrorInfo)
      }
    } else {
      // 如果过滤后仍然没有内容，记录警告
      let stringified: string | null = null
      try {
        stringified = JSON.stringify(error, null, 2)
      } catch (e) {
        // ignore circular reference etc
      }

      console.warn(message + ' (收到空错误对象 - 所有属性都被过滤)', {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        originalKeys: errorKeys,
        filteredKeys: Object.keys(filteredErrorInfo),
        stringified: stringified || 'N/A',
        filteredStringified: stringifiedFiltered || 'N/A',
        suggestion: '这可能是数据库连接问题或查询返回了空错误对象。请检查：1) 数据库连接是否正常 2) 查询参数是否正确 3) 数据库表结构是否正确',
      })
    }
  }
}
