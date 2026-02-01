import { corsHeaders } from '@/lib/api/cors'
import { getAdminContext } from '@/lib/api/admin-auth'
import { getHexagramResult } from '@/lib/constants/hexagrams'
import { NextResponse, type NextRequest } from 'next/server'

function normalizeKey(key: unknown) {
  const raw = String(key || '').replace(/[^01]/g, '')
  if (!raw) return null
  return raw.padStart(6, '0').slice(0, 6)
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/archive-post:
 *   post:
 *     summary: POST /api/admin/archive-post
 *     description: Auto-generated description for POST /api/admin/archive-post
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
    const postId = body?.post_id as string | undefined
    const feedback = body?.feedback as string | undefined
    const accuracy = body?.accuracy as 'accurate' | 'inaccurate' | 'partial' | undefined
    const occurredAt = body?.occurred_at as string | undefined
    const adminNote = body?.admin_note as string | undefined

    if (!postId) return NextResponse.json({ error: 'post_id is required' }, { headers: { ...corsHeaders }, status: 400 })
    if (!feedback || !feedback.trim()) return NextResponse.json({ error: 'feedback is required' }, { headers: { ...corsHeaders }, status: 400 })
    if (accuracy && !['accurate', 'inaccurate', 'partial'].includes(accuracy)) {
      return NextResponse.json({ error: 'accuracy is invalid' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const { data: post, error: postError } = await ctx.supabase
      .from('posts')
      .select('id, user_id, divination_record_id, title, status')
      .eq('id', postId)
      .single()

    if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { headers: { ...corsHeaders }, status: 404 })

    let divinationMethod: number | null = null
    let originalKey: string | null = null
    let changedKey: string | null = null

    if (post.divination_record_id) {
      const { data: record } = await ctx.supabase
        .from('divination_records')
        .select('original_key, changed_key, method')
        .eq('id', post.divination_record_id)
        .maybeSingle()

      originalKey = normalizeKey(record?.original_key)
      changedKey = normalizeKey(record?.changed_key)
      divinationMethod = typeof record?.method === 'number' ? record.method : null
    }

    const originalName = originalKey ? getHexagramResult(originalKey)?.name || null : null
    const changedName = changedKey ? getHexagramResult(changedKey)?.name || null : null

    const { error: upsertError } = await ctx.supabase.from('case_metadata').upsert(
      {
        post_id: postId,
        feedback_content: feedback.trim(),
        accuracy_rating: accuracy || null,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
        gua_original_code: originalKey,
        gua_changed_code: changedKey,
        gua_original_name: originalName,
        gua_changed_name: changedName,
        divination_method: divinationMethod,
        archived_by: ctx.operatorId,
        admin_note: adminNote ? String(adminNote).trim() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'post_id' }
    )

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { headers: { ...corsHeaders }, status: 500 })

    const { error: updatePostError } = await ctx.supabase.from('posts').update({ status: 'archived' }).eq('id', postId)
    if (updatePostError) return NextResponse.json({ error: updatePostError.message }, { headers: { ...corsHeaders }, status: 500 })

    await ctx.supabase.from('admin_audit_logs').insert({
      operator_id: ctx.operatorId,
      action: 'archive_case',
      target_id: postId,
      details: {
        post_id: postId,
        post_status: post.status,
        accuracy: accuracy || null,
        occurred_at: occurredAt || null,
        admin_note: adminNote || null,
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

