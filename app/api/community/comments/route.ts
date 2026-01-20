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
    const postId = typeof body?.post_id === 'string' ? body.post_id : ''
    const content = typeof body?.content === 'string' ? body.content : ''
    const parentId = typeof body?.parent_id === 'string' ? body.parent_id : null

    if (!postId) {
      return NextResponse.json({ error: '缺少 post_id' }, { status: 400, headers: corsHeaders })
    }

    if (!content.trim()) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400, headers: corsHeaders })
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_id: parentId,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message || '评论失败' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ comment: data }, { status: 200, headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '系统错误，请稍后重试' }, { status: 500, headers: corsHeaders })
  }
}

