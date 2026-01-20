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

export async function findUserByPhone(
  supabaseAdmin: SupabaseClient,
  phone: string
) {
  const perPage = 1000
  let page = 1
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  const e164 = trimmed.startsWith('+') ? `+${digits}` : (digits.length === 11 ? `+86${digits}` : `+${digits}`)
  const normalizedLocal = e164.startsWith('+86') ? e164.slice(3) : ''
  const candidates = new Set([phone, e164, digits])
  if (normalizedLocal) {
    candidates.add(normalizedLocal)
    candidates.add(`+86${normalizedLocal}`)
  }

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    const matchedUser = data?.users?.find((u) => {
      const uphone = u.phone || ''
      if (candidates.has(uphone)) return true
      if (normalizedLocal) {
        return uphone.endsWith(normalizedLocal)
      }
      return false
    })
    if (matchedUser) {
      return matchedUser
    }

    if (!data?.users || data.users.length < perPage) {
      return null
    }

    page += 1
  }
}
