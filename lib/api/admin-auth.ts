import { createSupabaseAdmin } from './supabase-admin'

export type AdminLevel = 'super_admin' | 'operator'

export async function getAdminContext(token: string) {
  const supabase = createSupabaseAdmin()
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    return { ok: false as const, status: 401 as const, error: 'Unauthorized' }
  }

  const operatorId = authData.user.id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, admin_level')
    .eq('id', operatorId)
    .maybeSingle()

  if (profileError) {
    return { ok: false as const, status: 500 as const, error: profileError.message }
  }

  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, status: 403 as const, error: 'Forbidden' }
  }

  const adminLevel: AdminLevel = profile.admin_level === 'super_admin' ? 'super_admin' : 'operator'
  return { ok: true as const, supabase, operatorId, adminLevel }
}

