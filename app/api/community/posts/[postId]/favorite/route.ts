import { corsHeaders } from '@/lib/api/cors'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '请先登录后再操作' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({} as any))
    const mode = body?.mode === 'set' ? 'set' : 'toggle'
    const value = typeof body?.value === 'boolean' ? body.value : undefined

    const { data: existingFavorite, error: queryError } = await supabase
      .from('post_favorites')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (queryError) {
      return NextResponse.json({ error: queryError.message || '操作失败' }, { status: 500, headers: corsHeaders })
    }

    if (mode === 'set') {
      if (value === true && !existingFavorite) {
        const { error } = await supabase.from('post_favorites').insert({ post_id: postId, user_id: user.id })
        if (error && error.code !== '23505') {
          return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
        }
        return NextResponse.json({ favorited: true }, { status: 200, headers: corsHeaders })
      }
      if (value === false && existingFavorite) {
        const { error } = await supabase
          .from('post_favorites')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        if (error) {
          return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
        }
        return NextResponse.json({ favorited: false }, { status: 200, headers: corsHeaders })
      }
      return NextResponse.json({ favorited: !!existingFavorite }, { status: 200, headers: corsHeaders })
    }

    if (existingFavorite) {
      const { error } = await supabase
        .from('post_favorites')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
      }

      return NextResponse.json({ favorited: false }, { status: 200, headers: corsHeaders })
    }

    const { error } = await supabase.from('post_favorites').insert({ post_id: postId, user_id: user.id })
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ favorited: true }, { status: 200, headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '系统错误，请稍后重试' }, { status: 500, headers: corsHeaders })
  }
}

