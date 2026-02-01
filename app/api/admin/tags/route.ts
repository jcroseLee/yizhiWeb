import { getAdminContext, requirePermission } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/tags:
 *   get:
 *     summary: GET /api/admin/tags
 *     description: Auto-generated description for GET /api/admin/tags
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { headers: { ...corsHeaders }, status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const ctx = await getAdminContext(token)
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { headers: { ...corsHeaders }, status: ctx.status })
    }

    requirePermission(ctx, '/tags')

    const { searchParams } = new URL(req.url)
    const pageVal = parseInt(searchParams.get('page') || '1')
    const pageSizeVal = parseInt(searchParams.get('pageSize') || '20')
    const page = isNaN(pageVal) || pageVal < 1 ? 1 : pageVal
    const pageSize = isNaN(pageSizeVal) || pageSizeVal < 1 ? 20 : pageSizeVal
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || 'all'
    const scope = searchParams.get('scope') || 'all' // all, common, or specific scope

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = ctx.supabase
      .from('tags')
      .select('*', { count: 'exact' })
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true })
      .range(from, to)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (category !== 'all') {
      query = query.eq('category', category)
    }

    if (scope !== 'all') {
      if (scope === 'common') {
        query = query.is('scope', null)
      } else {
        query = query.eq('scope', scope)
      }
    }

    const { data: tags, count, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    return NextResponse.json({ 
      tags: tags || [], 
      total: count || 0 
    }, { headers: { ...corsHeaders } })

  } catch (error: any) {
    console.error('Error fetching tags:', error)
    const status = error.status || 500
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.details || error.hint || JSON.stringify(error)
    }, { headers: { ...corsHeaders }, status })
  }
}
