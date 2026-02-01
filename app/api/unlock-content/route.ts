import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const UNLOCK_PRICE = 2

/**
 * @swagger
 * /api/unlock-content:
 *   post:
 *     summary: POST /api/unlock-content
 *     description: Auto-generated description for POST /api/unlock-content
 *     tags:
 *       - Unlock-content
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { commentId } = body

    if (!commentId) {
      return NextResponse.json({ error: '缺少 commentId' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('unlock_comment', {
      p_user_id: user.id,
      p_comment_id: commentId,
      p_amount: UNLOCK_PRICE,
    })

    if (error) {
      const msg = error.message || '支付失败，请检查余额'
      const isInsufficient = msg.includes('Insufficient Balance')
      const status = isInsufficient ? 402 : 500
      return NextResponse.json({ error: isInsufficient ? '余额不足' : msg }, { status })
    }

    if (!data?.success) {
      const code = typeof data?.code === 'number' ? data.code : 400
      return NextResponse.json({ error: data?.message || '支付失败' }, { status: code })
    }

    return NextResponse.json({ content: data.content })

  } catch (error: any) {
    console.error('Unlock API error:', error)
    return NextResponse.json({ error: '系统错误' }, { status: 500 })
  }
}
