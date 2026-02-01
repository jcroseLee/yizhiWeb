import { corsHeaders } from '@/lib/api/cors'
import { getAdminContext } from '@/lib/api/admin-auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/update-divination-record:
 *   post:
 *     summary: POST /api/admin/update-divination-record
 *     description: Auto-generated description for POST /api/admin/update-divination-record
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

    const body = await req.json().catch(() => null)
    const recordId = body?.record_id as string | undefined
    const divinationTime = body?.divination_time as string | undefined
    const method = body?.method as number | undefined
    const note = body?.admin_note as string | undefined

    if (!recordId) return NextResponse.json({ error: 'record_id is required' }, { headers: { ...corsHeaders }, status: 400 })

    const updatePayload: Record<string, unknown> = {}
    if (divinationTime) {
      const d = new Date(divinationTime)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'divination_time is invalid' }, { headers: { ...corsHeaders }, status: 400 })
      }
      updatePayload.divination_time = d.toISOString()
    }
    if (typeof method === 'number' && Number.isFinite(method)) {
      updatePayload.method = Math.floor(method)
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const { data: before, error: beforeError } = await ctx.supabase
      .from('divination_records')
      .select('id, divination_time, method')
      .eq('id', recordId)
      .maybeSingle()

    if (beforeError) return NextResponse.json({ error: beforeError.message }, { headers: { ...corsHeaders }, status: 500 })
    if (!before) return NextResponse.json({ error: 'Record not found' }, { headers: { ...corsHeaders }, status: 404 })

    const { error: updateError } = await ctx.supabase.from('divination_records').update(updatePayload).eq('id', recordId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { headers: { ...corsHeaders }, status: 500 })

    const { data: after } = await ctx.supabase
      .from('divination_records')
      .select('id, divination_time, method')
      .eq('id', recordId)
      .maybeSingle()

    await ctx.supabase.from('admin_audit_logs').insert({
      operator_id: ctx.operatorId,
      action: 'update_divination_record',
      target_id: recordId,
      details: {
        before,
        after,
        admin_note: note || null,
      },
    })

    return NextResponse.json({ success: true }, { headers: { ...corsHeaders }, status: 200 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}

