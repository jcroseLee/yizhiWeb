import { getAdminContext, requirePermission } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { createVerificationToken, decryptText, encryptText, getClientIp, hashToken } from '@/lib/api/recharge-records'
import { NextResponse, type NextRequest } from 'next/server'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function normalizeLimit(value: string | null) {
  const parsed = value ? Number(value) : DEFAULT_LIMIT
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(Math.max(1, Math.floor(parsed)), MAX_LIMIT)
}

function normalizeOffset(value: string | null) {
  const parsed = value ? Number(value) : 0
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.floor(parsed)
}

type AdminContext = Extract<Awaited<ReturnType<typeof getAdminContext>>, { ok: true }>

async function verifySecondFactor(ctx: AdminContext, request: NextRequest, token?: string | null) {
  if (!token) {
    return { ok: false as const, status: 401 as const, error: 'Missing verification token' }
  }
  const tokenHash = hashToken(token)
  const { data, error } = await ctx.supabase
    .from('admin_recharge_verifications')
    .select('id, expires_at, used_at')
    .eq('operator_id', ctx.operatorId)
    .eq('token_hash', tokenHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return { ok: false as const, status: 403 as const, error: 'Invalid verification token' }
  }
  if (data.used_at) {
    return { ok: false as const, status: 403 as const, error: 'Verification token already used' }
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false as const, status: 403 as const, error: 'Verification token expired' }
  }

  const { error: updateError } = await ctx.supabase
    .from('admin_recharge_verifications')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id)

  if (updateError) {
    return { ok: false as const, status: 500 as const, error: updateError.message }
  }

  return { ok: true as const }
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/recharge-records:
 *   get:
 *     summary: GET /api/admin/recharge-records
 *     description: Auto-generated description for GET /api/admin/recharge-records
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
    requirePermission(ctx, '/recharge-records')

    const params = req.nextUrl.searchParams
    const limit = normalizeLimit(params.get('limit'))
    const offset = normalizeOffset(params.get('offset'))
    const userId = params.get('user_id') || null
    const status = params.get('status') || null
    const paymentMethod = params.get('payment_method') || null
    const startAt = params.get('start_at') || null
    const endAt = params.get('end_at') || null
    const searchType = params.get('search_type') || null
    const searchValue = params.get('search_value')?.trim() || null

    let query = ctx.supabase
      .from('recharge_records')
      .select('*', { count: 'exact' })
      .order('recharge_time', { ascending: false })
      .range(offset, offset + limit - 1)

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

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status: 500 })
    }

    const records = (data || []).map((item) => ({
      ...item,
      user_account: decryptText(item.user_account_encrypted),
      transaction_no: decryptText(item.transaction_no_encrypted),
      remark: decryptText(item.remark_encrypted),
    }))

    const hashUpdates = records
      .filter((item) => (item.user_account && !item.user_account_hash) || (item.transaction_no && !item.transaction_no_hash))
      .map((item) => ({
        id: item.id,
        user_account_hash: item.user_account ? hashToken(String(item.user_account)) : null,
        transaction_no_hash: item.transaction_no ? hashToken(String(item.transaction_no)) : null,
      }))

    if (hashUpdates.length > 0) {
      await ctx.supabase.from('recharge_records').upsert(hashUpdates, { onConflict: 'id' })
    }

    const ipAddress = getClientIp(req)
    await ctx.supabase.from('recharge_audit_logs').insert({
      operator_id: ctx.operatorId,
      action: 'recharge_records.list',
      ip_address: ipAddress,
      details: {
        user_id: userId,
        status,
        payment_method: paymentMethod,
        start_at: startAt,
        end_at: endAt,
        search_type: searchType,
        search_value: searchValue,
        count: records.length,
      },
    })

    return NextResponse.json({ records, count: count || 0 }, { headers: { ...corsHeaders }, status: 200 })
  } catch (e) {
    const status = typeof (e as { status?: unknown } | null)?.status === 'number' ? ((e as { status: number }).status as number) : null
    if (status) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Unknown error' },
        { headers: { ...corsHeaders }, status }
      )
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/admin/recharge-records:
 *   post:
 *     summary: POST /api/admin/recharge-records
 *     description: Auto-generated description for POST /api/admin/recharge-records
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
export async function POST(req: NextRequest) {
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
    requirePermission(ctx, '/recharge-records')

    const body = await req.json().catch(() => null)
    const action = String(body?.action || 'create')

    if (action === 'request_verification') {
      const { token: verificationToken, hash, expiresAt } = createVerificationToken()
      const { error: insertError } = await ctx.supabase
        .from('admin_recharge_verifications')
        .insert({
          operator_id: ctx.operatorId,
          token_hash: hash,
          expires_at: expiresAt.toISOString(),
        })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { headers: { ...corsHeaders }, status: 500 })
      }

      const ipAddress = getClientIp(req)
      await ctx.supabase.from('recharge_audit_logs').insert({
        operator_id: ctx.operatorId,
        action: 'recharge_records.request_verification',
        ip_address: ipAddress,
        details: { expires_at: expiresAt.toISOString() },
      })

      return NextResponse.json({ token: verificationToken, expires_at: expiresAt.toISOString() }, { headers: { ...corsHeaders }, status: 200 })
    }

    if (action !== 'create') {
      return NextResponse.json({ error: 'Invalid action' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const verificationToken = req.headers.get('x-admin-verify-token') || body?.verify_token
    const verified = await verifySecondFactor(ctx, req, verificationToken)
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { headers: { ...corsHeaders }, status: verified.status })
    }

    const userId = body?.user_id as string | undefined
    const amountCentsRaw = body?.amount_cents
    const amountYuanRaw = body?.amount_yuan
    const paymentMethod = String(body?.payment_method || '').toUpperCase()
    const rechargeTimeRaw = body?.recharge_time as string | undefined
    const status = String(body?.status || 'PROCESSING').toUpperCase()

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const amountCents = Number.isFinite(Number(amountCentsRaw))
      ? Math.floor(Number(amountCentsRaw))
      : Number.isFinite(Number(amountYuanRaw))
        ? Math.round(Number(amountYuanRaw) * 100)
        : NaN

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'amount is invalid' }, { headers: { ...corsHeaders }, status: 400 })
    }

    if (!['ALIPAY', 'WECHAT', 'BANK', 'CARD', 'OTHER'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'payment_method is invalid' }, { headers: { ...corsHeaders }, status: 400 })
    }

    if (!['SUCCESS', 'FAILED', 'PROCESSING'].includes(status)) {
      return NextResponse.json({ error: 'status is invalid' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const recordPayload = {
      user_id: userId,
      user_account_encrypted: encryptText(body?.user_account),
      user_account_hash: body?.user_account ? hashToken(String(body.user_account)) : null,
      amount_cents: amountCents,
      recharge_time: rechargeTimeRaw ? new Date(rechargeTimeRaw).toISOString() : new Date().toISOString(),
      payment_method: paymentMethod,
      transaction_no_encrypted: encryptText(body?.transaction_no),
      transaction_no_hash: body?.transaction_no ? hashToken(String(body.transaction_no)) : null,
      operator_id: ctx.operatorId,
      status,
      remark_encrypted: encryptText(body?.remark),
    }

    const { data, error } = await ctx.supabase
      .from('recharge_records')
      .insert(recordPayload)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to create record' }, { headers: { ...corsHeaders }, status: 500 })
    }

    const ipAddress = getClientIp(req)
    await ctx.supabase.from('recharge_audit_logs').insert({
      record_id: data.id,
      operator_id: ctx.operatorId,
      action: 'recharge_records.create',
      ip_address: ipAddress,
      details: {
        amount_cents: amountCents,
        status,
        payment_method: paymentMethod,
      },
    })

    return NextResponse.json(
      {
        ...data,
        user_account: decryptText(data.user_account_encrypted),
        transaction_no: decryptText(data.transaction_no_encrypted),
        remark: decryptText(data.remark_encrypted),
      },
      { headers: { ...corsHeaders }, status: 200 }
    )
  } catch (e) {
    const status = typeof (e as { status?: unknown } | null)?.status === 'number' ? ((e as { status: number }).status as number) : null
    if (status) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Unknown error' },
        { headers: { ...corsHeaders }, status }
      )
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}
