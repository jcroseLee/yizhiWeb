import { corsHeaders } from '@/lib/api/cors'
import { createClient } from '@/lib/supabase/server'
import { getPostComments, createPostComment } from '@/lib/services/comments'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/community/comments:
 *   get:
 *     summary: GET /api/community/comments
 *     description: Auto-generated description for GET /api/community/comments
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
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('postId')

  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    const processedComments = await getPostComments(supabase, postId, userId)

    return NextResponse.json({ comments: processedComments })
  } catch (error: any) {
    if (error.message === 'Post not found') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message || 'System error' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/community/comments:
 *   post:
 *     summary: POST /api/community/comments
 *     description: Auto-generated description for POST /api/community/comments
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
    const isPaywalled = typeof body?.is_paywalled === 'boolean' ? body.is_paywalled : false

    if (!postId) {
      return NextResponse.json({ error: '缺少 post_id' }, { status: 400, headers: corsHeaders })
    }

    if (!content.trim()) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400, headers: corsHeaders })
    }

    const comment = await createPostComment(supabase, user.id, {
      post_id: postId,
      content,
      parent_id: parentId,
      is_paywalled: isPaywalled,
    })

    return NextResponse.json({ comment }, { status: 200, headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '系统错误，请稍后重试' }, { status: 500, headers: corsHeaders })
  }
}

