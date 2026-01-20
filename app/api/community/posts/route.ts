import { corsHeaders } from '@/lib/api/cors'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '请先登录后再操作' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({} as any))
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const content = typeof body?.content === 'string' ? body.content : ''
    const contentHtml = typeof body?.content_html === 'string' ? body.content_html : undefined
    const type = typeof body?.type === 'string' ? body.type : undefined
    const bounty = typeof body?.bounty === 'number' ? body.bounty : undefined
    const divinationRecordId = typeof body?.divination_record_id === 'string' ? body.divination_record_id : undefined
    const coverImageUrl = typeof body?.cover_image_url === 'string' ? body.cover_image_url : undefined
    const method = typeof body?.method === 'string' ? body.method : undefined
    const status = typeof body?.status === 'string' ? body.status : undefined

    if (!title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400, headers: corsHeaders })
    }

    if (!content.trim()) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400, headers: corsHeaders })
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title,
        content,
        content_html: contentHtml ?? content,
        type: type ?? 'theory',
        bounty: bounty ?? 0,
        divination_record_id: divinationRecordId ?? null,
        cover_image_url: coverImageUrl ?? null,
        method: method ?? null,
        status: status ?? undefined,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message || '发布失败' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ post: data }, { status: 200, headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '系统错误，请稍后重试' }, { status: 500, headers: corsHeaders })
  }
}

