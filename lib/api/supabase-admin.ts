import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * 创建 Supabase 管理员客户端（使用 Service Role Key）
 * 用于需要绕过 RLS 的服务端操作
 */
export function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

/**
 * 创建带用户 token 的 Supabase 客户端（用于 RLS 操作）
 */
export function createSupabaseWithToken(token: string): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  })
}

