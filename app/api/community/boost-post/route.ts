import { corsHeaders } from '@/lib/api/cors'
import { boostPost } from '@/lib/services/boost'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/community/boost-post:
 *   post:
 *     summary: POST /api/community/boost-post
 *     description: Auto-generated description for POST /api/community/boost-post
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
    const postId = body?.postId
    const durationType = body?.duration_type ?? body?.durationType

    const adminClient = createAdminClient()
    const result = await boostPost(supabase, adminClient, user.id, postId, durationType)

    return NextResponse.json({ 
      success: true, 
      message: '置顶成功',
      data: result
    }, { status: 200, headers: corsHeaders })

  } catch (error: any) {
    // Determine status code based on error message
    let status = 500
    if (error.message === '缺少参数 postId' || error.message === '无效的置顶时长类型') status = 400
    if (error.message === '帖子不存在') status = 404
    if (error.message === '只能置顶自己的帖子') status = 403
    if (error.message.includes('支付失败') || error.message.includes('余额不足')) status = 402

    return NextResponse.json({ error: error?.message || '系统错误' }, { status, headers: corsHeaders })
  }
}
