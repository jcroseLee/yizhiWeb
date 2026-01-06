import { corsHeaders } from '@/lib/api/cors'
import { getAdminContext } from '@/lib/api/admin-auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

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
    const sourceTagId = body?.source_tag_id as string | undefined
    const targetTagId = body?.target_tag_id as string | undefined

    if (!sourceTagId || !targetTagId) {
      return NextResponse.json({ error: 'source_tag_id and target_tag_id are required' }, { headers: { ...corsHeaders }, status: 400 })
    }
    if (sourceTagId === targetTagId) {
      return NextResponse.json({ error: 'source_tag_id must differ from target_tag_id' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const { data, error } = await ctx.supabase.rpc('admin_merge_tags', {
      p_source_tag_id: sourceTagId,
      p_target_tag_id: targetTagId,
      p_operator_id: ctx.operatorId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status: 500 })
    }

    return NextResponse.json({ success: Boolean(data) }, { headers: { ...corsHeaders }, status: 200 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}

