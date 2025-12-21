import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// 延迟初始化 Supabase 客户端，避免在环境变量缺失时立即抛出错误
let supabaseClientInstance: SupabaseClient | null = null

/**
 * 获取 Supabase 客户端实例
 * @returns SupabaseClient 实例，如果环境变量未配置则返回 null
 * 
 * @example
 * ```ts
 * const client = getSupabaseClient()
 * if (client) {
 *   // 使用 Supabase 功能
 * } else {
 *   // Supabase 未配置，使用备用方案（如 localStorage）
 * }
 * ```
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseClientInstance) {
    return supabaseClientInstance
  }

  // 在客户端和服务端环境中都使用 process.env
  // Next.js 会自动处理环境变量的注入
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // 在开发环境中，返回 null 而不是抛出错误
    // 这样应用仍然可以运行，只是 Supabase 功能不可用
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Supabase environment variables are not set. Supabase features will be disabled.')
      console.warn('💡 To enable Supabase, create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return null
    }
    // 在生产环境中，也返回 null 而不是抛出错误
    // 这样应用仍然可以运行，只是 Supabase 功能不可用
    console.error('❌ Missing Supabase environment variables')
    return null
  }

  try {
    supabaseClientInstance = createClient(url, key, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
        detectSessionInUrl: typeof window !== 'undefined',
      },
    })
    return supabaseClientInstance
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

// 为了向后兼容，提供一个默认导出
// 注意：这个导出是一个函数调用，但只在真正需要时才执行
// 如果环境变量缺失，会返回 null 而不是抛出错误
export default getSupabaseClient
