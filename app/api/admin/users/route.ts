import { getAdminContext, requirePermission } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: GET /api/admin/users
 *     description: Auto-generated description for GET /api/admin/users
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { headers: { ...corsHeaders }, status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const ctx = await getAdminContext(token)
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { headers: { ...corsHeaders }, status: ctx.status })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || 'all'
    const cmsRoleId = searchParams.get('cmsRoleId')
    const status = searchParams.get('status') || 'all' // all, banned, active

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = ctx.supabase
      .from('profiles')
      .select(
        'id,email,phone,nickname,avatar_url,role,cms_role_id,cms_roles(name),is_verified,is_banned,banned_until,ban_reason,wechat_openid,created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search)
      
      if (isUuid) {
        query = query.eq('id', search)
      } else {
         query = query.or(`nickname.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
      }
    }

    if (role !== 'all') {
      if (role === 'admin') {
        query = query.eq('role', 'admin')
        if (cmsRoleId) {
          query = query.eq('cms_role_id', cmsRoleId)
        }
      } else {
        query = query.eq('role', 'user')
      }
    } else if (cmsRoleId) {
      query = query.eq('cms_role_id', cmsRoleId)
    }

    if (status !== 'all') {
      const nowIso = new Date().toISOString()
      if (status === 'banned') {
        query = query.or(`is_banned.eq.true,banned_until.gt.${nowIso}`)
      } else if (status === 'active') {
        query = query.eq('is_banned', false).or(`banned_until.is.null,banned_until.lte.${nowIso}`)
      }
    }

    const { data: usersRaw, count, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      users:
        (usersRaw || []).map((u) => ({
          ...u,
          login_type: u.wechat_openid ? 'wechat' : 'email',
        })) || [],
      total: count || 0 
    }, { headers: { ...corsHeaders } })

  } catch (error: any) {
    console.error('Error fetching users:', error)
    const status = error.status || 500
    return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status })
  }
}

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: POST /api/admin/users
 *     description: Auto-generated description for POST /api/admin/users
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { headers: { ...corsHeaders }, status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const ctx = await getAdminContext(token)
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { headers: { ...corsHeaders }, status: ctx.status })
    }

    requirePermission(ctx, '/users')

    const isSuperAdmin = ctx.adminLevel === 'super_admin'
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { headers: { ...corsHeaders }, status: 403 })
    }

    const body = await req.json().catch(() => null)
    const userId = typeof body?.userId === 'string' ? body.userId : ''
    const nextRole = body?.role === 'admin' || body?.role === 'user' ? (body.role as 'admin' | 'user') : null
    const cmsRoleIdRaw = body?.cmsRoleId
    const cmsRoleId = cmsRoleIdRaw == null ? null : Number(cmsRoleIdRaw)

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { headers: { ...corsHeaders }, status: 400 })
    }

    if (!nextRole) {
      return NextResponse.json({ error: 'Invalid role' }, { headers: { ...corsHeaders }, status: 400 })
    }

    if (ctx.operatorId === userId) {
      return NextResponse.json({ error: 'Cannot modify yourself' }, { headers: { ...corsHeaders }, status: 400 })
    }

    if (nextRole === 'admin') {
      if (cmsRoleId == null || !Number.isFinite(cmsRoleId)) {
        return NextResponse.json({ error: 'Missing cmsRoleId' }, { headers: { ...corsHeaders }, status: 400 })
      }
      const { data: roleRow, error: roleError } = await ctx.supabase.from('cms_roles').select('id').eq('id', cmsRoleId).maybeSingle()
      if (roleError) throw roleError
      if (!roleRow) {
        return NextResponse.json({ error: 'Invalid cmsRoleId' }, { headers: { ...corsHeaders }, status: 400 })
      }
    }

    const update = {
      role: nextRole,
      cms_role_id: nextRole === 'admin' ? (cmsRoleId as number) : null,
    }

    const { data: updated, error: updateError } = await ctx.supabase
      .from('profiles')
      .update(update)
      .eq('id', userId)
      .select('id')
      .maybeSingle()

    if (updateError) throw updateError

    if (!updated) {
      const { error: upsertError } = await ctx.supabase.from('profiles').upsert({ id: userId, ...update }, { onConflict: 'id' })
      if (upsertError) throw upsertError
    }

    return NextResponse.json({ success: true }, { headers: { ...corsHeaders } })
  } catch (error: any) {
    console.error('Error updating user role:', error)
    const status = error.status || 500
    return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status })
  }
}
