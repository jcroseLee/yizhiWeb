import { getAdminContext, requirePermission } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
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

    requirePermission(ctx, '/users')

    const { userId } = await params
    const searchParams = req.nextUrl.searchParams
    const page = Number(searchParams.get('page')) || 1
    const pageSize = Number(searchParams.get('pageSize')) || 10
    const sortField = searchParams.get('sortField') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const content = searchParams.get('content')

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = ctx.supabase
      .from('comments')
      .select('*, posts(title, id)', { count: 'exact' })
      .eq('user_id', userId)

    if (content) {
      query = query.ilike('content', `%${content}%`)
    }

    // Sorting
    if (['like_count', 'created_at'].includes(sortField)) {
       query = query.order(sortField, { ascending: sortOrder === 'asc' })
    } else {
       query = query.order('created_at', { ascending: false })
    }

    const { data, count, error } = await query.range(from, to)

    if (error) {
      return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status: 500 })
    }

    return NextResponse.json({ data, total: count }, { headers: { ...corsHeaders } })
  } catch (e: any) {
    const status = e.status || 500
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { headers: { ...corsHeaders }, status })
  }
}
