import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * @swagger
 * /api/library/unarchive:
 *   post:
 *     summary: POST /api/library/unarchive
 *     description: Auto-generated description for POST /api/library/unarchive
 *     tags:
 *       - Library
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    // 1. 验证用户身份 (优先使用 Cookie)
    const supabase = await createClient()
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    // Fallback: 如果 Cookie 验证失败，尝试 Authorization Header
    if (authError || !user) {
      const authHeader = req.headers.get('authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const adminForAuth = createSupabaseAdmin()
        const { data: headerUser, error: headerError } = await adminForAuth.auth.getUser(token)
        if (!headerError && headerUser.user) {
          user = headerUser.user
          authError = null
        }
      }
    }

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const adminClient = createSupabaseAdmin()

    const body = await req.json().catch(() => null)
    const postId = body?.post_id as string | undefined

    if (!postId) return NextResponse.json({ error: 'post_id is required' }, { status: 400 })

    const [{ data: post, error: postError }, { data: profile, error: profileError }] = await Promise.all([
      adminClient.from('posts').select('id, user_id, status').eq('id', postId).single(),
      adminClient.from('profiles').select('role').eq('id', userId).maybeSingle(),
    ])

    if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

    const isAdmin = profile?.role === 'admin'
    const isAuthor = post.user_id === userId
    if (!isAuthor && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 1. 删除 case_metadata 记录
    const { error: deleteError } = await adminClient.from('case_metadata').delete().eq('post_id', postId)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    // 2. 更新帖子状态为 published
    const { error: updatePostError } = await adminClient.from('posts').update({ status: 'published' }).eq('id', postId)
    if (updatePostError) return NextResponse.json({ error: updatePostError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
