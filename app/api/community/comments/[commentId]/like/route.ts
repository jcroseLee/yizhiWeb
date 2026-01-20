import { corsHeaders } from '@/lib/api/cors'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '请先登录后再操作' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({} as any))
    const mode = body?.mode === 'set' ? 'set' : 'toggle'
    const value = typeof body?.value === 'boolean' ? body.value : undefined

    const { data: existingLike, error: queryError } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (queryError) {
      return NextResponse.json({ error: queryError.message || '操作失败' }, { status: 500, headers: corsHeaders })
    }

    if (mode === 'set') {
      if (value === true && !existingLike) {
        const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })
        if (error && error.code !== '23505') {
          return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
        }
        return NextResponse.json({ liked: true }, { status: 200, headers: corsHeaders })
      }
      if (value === false && existingLike) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
        if (error) {
          return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
        }
        return NextResponse.json({ liked: false }, { status: 200, headers: corsHeaders })
      }
      return NextResponse.json({ liked: !!existingLike }, { status: 200, headers: corsHeaders })
    }

    if (existingLike) {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
      }

      return NextResponse.json({ liked: false }, { status: 200, headers: corsHeaders })
    }

    const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ liked: true }, { status: 200, headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '系统错误，请稍后重试' }, { status: 500, headers: corsHeaders })
  }
}

