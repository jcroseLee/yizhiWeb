import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

function pickDeviceType(raw: unknown): string | null {
  const v = typeof raw === 'string' ? raw : ''
  if (v === 'mobile' || v === 'tablet' || v === 'desktop' || v === 'unknown') return v
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const properties = typeof body?.properties === 'object' && body?.properties ? body.properties : {}

    if (!name) {
      return NextResponse.json({ error: 'Invalid event name' }, { status: 422, headers: corsHeaders })
    }

    const supabase = createSupabaseAdmin()

    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

    let userId: string | null = null
    if (token) {
      const { data } = await supabase.auth.getUser(token)
      userId = data.user?.id ?? null
    }

    const userIdHash = typeof properties?.user_id === 'string' ? properties.user_id : null
    const userLevel = typeof properties?.user_level === 'number' ? properties.user_level : null
    const deviceType = pickDeviceType(properties?.device_type)

    const userAgent = request.headers.get('user-agent')
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')

    const { error } = await supabase.from('analytics_events').insert({
      event_name: name,
      user_id: userId,
      user_id_hash: userIdHash,
      user_level: userLevel,
      device_type: deviceType,
      properties,
      source: 'web',
      user_agent: userAgent,
      ip,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}

