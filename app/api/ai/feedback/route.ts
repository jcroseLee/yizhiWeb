import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const recordId = typeof body?.record_id === 'string' ? body.record_id.trim() : ''
    const rating = body?.rating === 'good' || body?.rating === 'bad' ? body.rating : null
    const divinationType = typeof body?.divination_type === 'string' ? body.divination_type.trim() : null

    if (!recordId || !rating) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 422, headers: corsHeaders })
    }

    const supabase = createSupabaseAdmin()

    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const { data, error: userErr } = await supabase.auth.getUser(token)
    const userId = data.user?.id
    if (userErr || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const { error } = await supabase.from('ai_feedback').upsert(
      {
        user_id: userId,
        record_id: recordId,
        rating,
        divination_type: divinationType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,record_id' }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}
