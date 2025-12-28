import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseClientInstance: SupabaseClient | null = null

/**
 * 获取 Supabase 客户端实例
 * @returns SupabaseClient 实例，如果环境变量未配置则返回 null
 * @deprecated 建议直接使用 @/lib/supabase/client 中的 createClient
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseClientInstance) {
    return supabaseClientInstance
  }

  supabaseClientInstance = createClient()
  return supabaseClientInstance
}

export default getSupabaseClient
