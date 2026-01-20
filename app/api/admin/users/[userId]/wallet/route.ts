import { corsHeaders } from '@/lib/api/cors'
import { getAdminContext } from '@/lib/api/admin-auth'
import { getWalletBalance } from '@/lib/services/wallet'
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

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') as 'PAID' | 'FREE' | null) || null
    const limitRaw = Number(searchParams.get('limit') || 20)
    const offsetRaw = Number(searchParams.get('offset') || 0)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 100) : 20
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0

    const [balance, transactionsRes] = await Promise.all([
      getWalletBalance(userId, ctx.supabase),
      (async () => {
        let query = ctx.supabase
          .from('coin_transactions')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (type) {
          query = query.eq('balance_type', type)
        }

        const { data, error, count } = await query
        if (error) {
          return { ok: false as const, error: error.message, status: 500 as const }
        }
        return { ok: true as const, data: data || [], count: count || 0 }
      })(),
    ])

    if (!transactionsRes.ok) {
      return NextResponse.json({ error: transactionsRes.error }, { headers: { ...corsHeaders }, status: transactionsRes.status })
    }

    return NextResponse.json(
      {
        user_id: userId,
        balance,
        transactions: transactionsRes.data,
        total: transactionsRes.count,
        limit,
        offset,
      },
      { headers: { ...corsHeaders }, status: 200 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}

