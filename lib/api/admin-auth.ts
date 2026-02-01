import type { User } from '@supabase/supabase-js'
import { createSupabaseAdmin } from './supabase-admin'

export type AdminLevel = 'super_admin' | 'operator'

export interface AdminPermission {
  code: string
  name?: string | null
  description?: string | null
}

export interface AdminContext {
  supabase: ReturnType<typeof createSupabaseAdmin>
  user: User
  operatorId: string
  role: { id: number; name: string; isSystem: boolean } | null
  permissions: string[]
  adminLevel: AdminLevel
  canViewFinance: boolean
}

type HttpError = Error & { status?: number }

export function requirePermission(ctx: AdminContext, code: string) {
  if (ctx.adminLevel === 'super_admin' || ctx.permissions.includes(code)) {
    return
  }
  const err = new Error('Forbidden')
  ;(err as HttpError).status = 403
  throw err
}

export async function getAdminContext(token: string) {
  const supabase = createSupabaseAdmin()
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    return { ok: false as const, status: 401 as const, error: 'Unauthorized' }
  }

  const operatorId = authData.user.id

  // Use RPC to get admin context (role, permissions, level)
  // This removes hardcoded ID checks and manual joins
  const { data: rpcData, error: rpcError } = await supabase.rpc('app_get_admin_context', {
    target_user_id: operatorId,
  })

  if (rpcError) {
    return { ok: false as const, status: 500 as const, error: rpcError.message }
  }

  const result = rpcData as {
    ok: boolean
    error?: string
    code?: number
    role?: { id: number; name: string; is_system: boolean }
    permissions?: string[]
    is_super_admin?: boolean
  }

  if (!result.ok) {
    return {
      ok: false as const,
      status: (result.code || 403) as 403 | 500, // Cast to expected union types
      error: result.error || 'Forbidden',
    }
  }

  const role = result.role
    ? {
        id: result.role.id,
        name: result.role.name,
        isSystem: result.role.is_system,
      }
    : null

  const permissions = result.permissions || []
  const adminLevel: AdminLevel = result.is_super_admin ? 'super_admin' : 'operator'
  const canViewFinance = adminLevel === 'super_admin' || permissions.includes('/recharge-records')

  return {
    ok: true as const,
    supabase,
    user: authData.user,
    operatorId,
    role,
    permissions,
    adminLevel,
    canViewFinance,
  }
}
