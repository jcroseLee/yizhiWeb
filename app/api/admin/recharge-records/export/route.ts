import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { decryptText, getClientIp, hashToken } from '@/lib/api/recharge-records'
import dayjs from 'dayjs'
import { NextResponse, type NextRequest } from 'next/server'

const MAX_EXPORT = 5000

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/recharge-records/export:
 *   get:
 *     summary: GET /api/admin/recharge-records/export
 *     description: Auto-generated description for GET /api/admin/recharge-records/export
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
    const userId = params.get('user_id') || null
    const status = params.get('status') || null
    const paymentMethod = params.get('payment_method') || null
    const startAt = params.get('start_at') || null
    const endAt = params.get('end_at') || null
    const searchType = params.get('search_type') || null
    const searchValue = params.get('search_value')?.trim() || null

    let query = ctx.supabase
      .from('recharge_records')
      .select('*')
      .order('recharge_time', { ascending: false })
      .limit(MAX_EXPORT)

    if (userId) query = query.eq('user_id', userId)
    if (status) query = query.eq('status', status)
    if (paymentMethod) query = query.eq('payment_method', paymentMethod)
    if (startAt) query = query.gte('recharge_time', new Date(startAt).toISOString())
    if (endAt) query = query.lte('recharge_time', new Date(endAt).toISOString())
    if (searchType && searchValue) {
      if (searchType === 'user_account') {
        query = query.eq('user_account_hash', hashToken(searchValue))
      } else if (searchType === 'transaction_no') {
        query = query.eq('transaction_no_hash', hashToken(searchValue))
      }
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status: 500 })
    }

    const rows = (data || []).map((item) => ({
      id: item.id,
      user_id: item.user_id,
      amount_cents: item.amount_cents,
      recharge_time: item.recharge_time,
      payment_method: item.payment_method,
      transaction_no: decryptText(item.transaction_no_encrypted) || '',
      operator_id: item.operator_id,
      status: item.status,
      remark: decryptText(item.remark_encrypted) || '',
      user_account: decryptText(item.user_account_encrypted) || '',
    }))

    const header = ['充值ID', '用户ID', '账号', '充值金额(分)', '充值时间', '充值方式', '交易流水号', '操作员ID', '状态', '备注']
    const body = rows
      .map((row) =>
        [
          row.id,
          row.user_id,
          row.user_account,
          String(row.amount_cents),
          dayjs(row.recharge_time).format('YYYY-MM-DD HH:mm:ss'),
          row.payment_method,
          row.transaction_no,
          row.operator_id,
          row.status,
          row.remark,
        ].map((cell) => `<td>${escapeHtml(cell || '')}</td>`).join('')
      )
      .map((cells) => `<tr>${cells}</tr>`)
      .join('')

    const table = `<table><thead><tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`
    const filename = `recharge-records-${dayjs().format('YYYYMMDD-HHmmss')}.xls`

    const ipAddress = getClientIp(req)
    await ctx.supabase.from('recharge_audit_logs').insert({
      operator_id: ctx.operatorId,
      action: 'recharge_records.export',
      ip_address: ipAddress,
      details: {
        user_id: userId,
        status,
        payment_method: paymentMethod,
        start_at: startAt,
        end_at: endAt,
        search_type: searchType,
        search_value: searchValue,
        count: rows.length,
      },
    })

    return new NextResponse(table, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}
