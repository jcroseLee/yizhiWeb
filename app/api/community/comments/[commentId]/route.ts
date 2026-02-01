import { corsHeaders } from '@/lib/api/cors'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/community/comments/{commentId}:
 *   delete:
 *     summary: DELETE /api/community/comments/{commentId}
 *     description: Auto-generated description for DELETE /api/community/comments/{commentId}
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
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '请先登录后再操作' }, { status: 401, headers: corsHeaders })
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message || '删除失败' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '系统错误，请稍后重试' }, { status: 500, headers: corsHeaders })
  }
}

