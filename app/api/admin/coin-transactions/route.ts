import { getAdminContext, requirePermission } from '@/lib/api/admin-auth'
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

    // Check permission
    requirePermission(ctx, '/recharge-records')

    const params = req.nextUrl.searchParams
    const page = Number(params.get('page')) || 1
    const pageSize = Number(params.get('pageSize')) || 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const search = params.get('search')

    // Helper to apply filters
    const applyFilters = (query: any) => {
      const transactionType = params.getAll('transaction_type')
      if (transactionType.length > 0) {
        query = query.in('type', transactionType)
      }
      
      const balanceType = params.get('balance_type')
      if (balanceType) {
          query = query.eq('balance_type', balanceType)
      }

      const startAt = params.get('start_at')
      if (startAt) query = query.gte('created_at', startAt)
      
      const endAt = params.get('end_at')
      if (endAt) query = query.lte('created_at', endAt)

      if (search) {
         query = query.ilike('user.nickname', `%${search}%`)
      }
      return query
    }

    // 1. Data Query
    let dataQuery = ctx.supabase
      .from('coin_transactions')
      .select(
          search 
            ? '*, transaction_type:type, user:profiles!inner(id, nickname, email, avatar_url)'
            : '*, transaction_type:type, user:profiles(id, nickname, email, avatar_url)', 
          { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    dataQuery = applyFilters(dataQuery)

    // 2. Stats Query
    let statsQuery = ctx.supabase
        .from('coin_transactions')
        .select(
            search 
                ? 'amount, user:profiles!inner(nickname)' 
                : 'amount'
        )
    
    statsQuery = applyFilters(statsQuery)

    const [dataResult, statsResult] = await Promise.all([
        dataQuery,
        statsQuery
    ])

    if (dataResult.error) {
      console.error('Error fetching coin transactions:', dataResult.error)
      return NextResponse.json({ error: dataResult.error.message }, { headers: { ...corsHeaders }, status: 500 })
    }

    if (statsResult.error) {
        console.error('Error fetching stats:', statsResult.error)
        return NextResponse.json({ error: statsResult.error.message }, { headers: { ...corsHeaders }, status: 500 })
    }

    const data = dataResult.data
    const total = dataResult.count

    // Calculate totals
    const allTransactions = statsResult.data as any[]
    const totalIncome = allTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpense = allTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)

    return NextResponse.json({ 
        data, 
        total,
        totalIncome,
        totalExpense
    }, { headers: { ...corsHeaders } })

  } catch (e: any) {
    console.error('Admin API Error:', e)
    const status = e.status || 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status }
    )
  }
}
