import { corsHeaders } from '@/lib/api/cors'
import { getAdminContext, requirePermission } from '@/lib/api/admin-auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/resolve-report:
 *   post:
 *     summary: POST /api/admin/resolve-report
 *     description: Auto-generated description for POST /api/admin/resolve-report
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

    requirePermission(ctx, '/reports')

    const body = await req.json().catch(() => null)
    const reportId = body?.report_id as string | undefined
    const action = body?.action as 'hide_content' | 'ban_user' | 'ignore' | undefined
    const note = body?.note as string | undefined
    const banDays = body?.ban_days as number | undefined

    if (!reportId) return NextResponse.json({ error: 'report_id is required' }, { headers: { ...corsHeaders }, status: 400 })
    if (!action || !['hide_content', 'ban_user', 'ignore'].includes(action)) {
      return NextResponse.json({ error: 'action is invalid' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const normalizedBanDays =
      action === 'ban_user' ? (typeof banDays === 'number' && Number.isFinite(banDays) ? Math.max(1, Math.floor(banDays)) : 7) : null

    const { data, error } = await ctx.supabase.rpc('admin_resolve_report', {
      p_report_id: reportId,
      p_action: action,
      p_note: note || null,
      p_operator_id: ctx.operatorId,
      p_ban_days: normalizedBanDays,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status: 500 })
    }

    return NextResponse.json({ success: Boolean(data) }, { headers: { ...corsHeaders }, status: 200 })
  } catch (e: any) {
    const status = e.status || 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status }
    )
  }
}

