import { corsHeaders } from '@/lib/api/cors'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/community/users/{userId}/follow:
 *   post:
 *     summary: POST /api/community/users/{userId}/follow
 *     description: Auto-generated description for POST /api/community/users/{userId}/follow
 *     tags:
 *       - Community
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '请先登录后再操作' }, { status: 401, headers: corsHeaders })
    }

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId' }, { status: 400, headers: corsHeaders })
    }

    if (user.id === userId) {
      return NextResponse.json({ error: '不能关注自己' }, { status: 400, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({} as any))
    const mode = body?.mode === 'set' ? 'set' : 'toggle'
    const value = typeof body?.value === 'boolean' ? body.value : undefined

    const { data: existingFollow, error: queryError } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle()

    if (queryError) {
      return NextResponse.json({ error: queryError.message || '操作失败' }, { status: 500, headers: corsHeaders })
    }

    if (mode === 'set') {
      if (value === true && !existingFollow) {
        const { error } = await supabase.from('user_follows').insert({ follower_id: user.id, following_id: userId })
        if (error && error.code !== '23505') {
          return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
        }
        return NextResponse.json({ following: true }, { status: 200, headers: corsHeaders })
      }
      if (value === false && existingFollow) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId)
        if (error) {
          return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
        }
        return NextResponse.json({ following: false }, { status: 200, headers: corsHeaders })
      }
      return NextResponse.json({ following: !!existingFollow }, { status: 200, headers: corsHeaders })
    }

    if (existingFollow) {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId)

      if (error) {
        return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
      }

      return NextResponse.json({ following: false }, { status: 200, headers: corsHeaders })
    }

    const { error } = await supabase.from('user_follows').insert({ follower_id: user.id, following_id: userId })
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message || '操作失败' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ following: true }, { status: 200, headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '系统错误，请稍后重试' }, { status: 500, headers: corsHeaders })
  }
}

