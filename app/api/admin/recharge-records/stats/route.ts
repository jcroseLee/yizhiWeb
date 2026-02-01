import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { getClientIp } from '@/lib/api/recharge-records'
import dayjs from 'dayjs'
import { NextResponse, type NextRequest } from 'next/server'

const DEFAULT_DAYS = 30

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/recharge-records/stats:
 *   get:
 *     summary: GET /api/admin/recharge-records/stats
 *     description: Auto-generated description for GET /api/admin/recharge-records/stats
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
    if (!ctx.canViewFinance) {
      return NextResponse.json({ error: 'Forbidden' }, { headers: { ...corsHeaders }, status: 403 })
    }

    const params = req.nextUrl.searchParams
    const startAt = params.get('start_at')
    const endAt = params.get('end_at')
    const status = params.get('status')

    const end = endAt ? dayjs(endAt) : dayjs()
    const start = startAt ? dayjs(startAt) : end.subtract(DEFAULT_DAYS, 'day')

    let query = ctx.supabase
      .from('recharge_records')
      .select('amount_cents,status,recharge_time,payment_method')
      .gte('recharge_time', start.toISOString())
      .lte('recharge_time', end.toISOString())

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status: 500 })
    }

    const records = data || []

    const totalAmount = records.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0)
    const totalCount = records.length
    const statusSummary = records.reduce<Record<string, number>>((acc, item) => {
      const key = String(item.status || 'UNKNOWN')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const byDay = new Map<string, { amount: number; count: number }>()
    const byWeek = new Map<string, { amount: number; count: number }>()
    const byMonth = new Map<string, { amount: number; count: number }>()

    for (const item of records) {
      const ts = dayjs(item.recharge_time)
      const dayKey = ts.format('YYYY-MM-DD')
      const weekKey = ts.startOf('week').format('YYYY-MM-DD')
      const monthKey = ts.format('YYYY-MM')

      const amount = Number(item.amount_cents || 0)
      const dayBucket = byDay.get(dayKey) || { amount: 0, count: 0 }
      dayBucket.amount += amount
      dayBucket.count += 1
      byDay.set(dayKey, dayBucket)

      const weekBucket = byWeek.get(weekKey) || { amount: 0, count: 0 }
      weekBucket.amount += amount
      weekBucket.count += 1
      byWeek.set(weekKey, weekBucket)

      const monthBucket = byMonth.get(monthKey) || { amount: 0, count: 0 }
      monthBucket.amount += amount
      monthBucket.count += 1
      byMonth.set(monthKey, monthBucket)
    }

    const formatSeries = (map: Map<string, { amount: number; count: number }>) =>
      Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, value]) => ({
          period,
          amount_cents: value.amount,
          count: value.count,
        }))

    const response = {
      summary: {
        total_amount_cents: totalAmount,
        total_count: totalCount,
        status: statusSummary,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
      },
      daily: formatSeries(byDay),
      weekly: formatSeries(byWeek),
      monthly: formatSeries(byMonth),
    }

    const ipAddress = getClientIp(req)
    await ctx.supabase.from('recharge_audit_logs').insert({
      operator_id: ctx.operatorId,
      action: 'recharge_records.stats',
      ip_address: ipAddress,
      details: { start_at: start.toISOString(), end_at: end.toISOString(), status },
    })

    return NextResponse.json(response, { headers: { ...corsHeaders }, status: 200 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}
