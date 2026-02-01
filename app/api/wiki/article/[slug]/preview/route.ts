import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * @swagger
 * /api/wiki/article/{slug}/preview:
 *   get:
 *     summary: GET /api/wiki/article/{slug}/preview
 *     description: Auto-generated description for GET /api/wiki/article/{slug}/preview
 *     tags:
 *       - Wiki
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const supabase = await createClient()
  const { slug: id } = params
  
  const { data, error } = await supabase
    .from('wiki_articles')
    .select('id, title, summary, slug')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  return NextResponse.json(data)
}
