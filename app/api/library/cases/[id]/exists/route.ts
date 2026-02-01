import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * @swagger
 * /api/library/cases/{id}/exists:
 *   get:
 *     summary: GET /api/library/cases/{id}/exists
 *     description: Auto-generated description for GET /api/library/cases/{id}/exists
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
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) return NextResponse.json({ exists: false })

    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase.from('case_metadata').select('post_id').eq('post_id', id).maybeSingle()
    if (error) return NextResponse.json({ exists: false })

    return NextResponse.json({ exists: !!data })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
