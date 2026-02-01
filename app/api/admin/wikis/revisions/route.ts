import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

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

    const { searchParams } = new URL(req.url)
    const pageVal = parseInt(searchParams.get('page') || '1')
    const pageSizeVal = parseInt(searchParams.get('pageSize') || '20')
    const page = isNaN(pageVal) || pageVal < 1 ? 1 : pageVal
    const pageSize = isNaN(pageSizeVal) || pageSizeVal < 1 ? 20 : pageSizeVal
    
    // Support filtering by status (single or multiple)
    const statuses = searchParams.getAll('status')
    
    // Support filtering by article_id if needed
    const articleId = searchParams.get('article_id')

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = ctx.supabase
      .from('wiki_revisions')
      .select('*, author:profiles(nickname, email), article:wiki_articles!wiki_revisions_article_id_fkey(title)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (statuses.length > 0) {
      // If "pending" is passed, filter by it. If array, use "in".
      // Note: If statuses contains just one item, .in() still works fine.
      query = query.in('status', statuses)
    }

    if (articleId) {
        query = query.eq('article_id', articleId)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    return NextResponse.json({ 
      data: data || [], 
      total: count || 0 
    }, { headers: { ...corsHeaders } })

  } catch (error: any) {
    console.error('Error fetching wiki revisions:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.details || error.hint || JSON.stringify(error)
    }, { headers: { ...corsHeaders }, status: 500 })
  }
}
