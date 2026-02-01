import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { decryptText, encryptText, getClientIp, hashToken } from '@/lib/api/recharge-records'
import { NextResponse, type NextRequest } from 'next/server'

type AdminContext = Extract<Awaited<ReturnType<typeof getAdminContext>>, { ok: true }>

async function verifySecondFactor(ctx: AdminContext, token?: string | null) {
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
 * /api/admin/recharge-records/{id}:
 *   patch:
 *     summary: PATCH /api/admin/recharge-records/{id}
 *     description: Auto-generated description for PATCH /api/admin/recharge-records/{id}
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
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: recordId } = await params
    if (!recordId) {
      return NextResponse.json({ error: 'Missing record id' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const body = await req.json().catch(() => null)
    const verificationToken = req.headers.get('x-admin-verify-token') || body?.verify_token
    const verified = await verifySecondFactor(ctx, verificationToken)
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { headers: { ...corsHeaders }, status: verified.status })
    }

    const { data: existing, error: existingError } = await ctx.supabase
      .from('recharge_records')
      .select('*')
      .eq('id', recordId)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: existingError?.message || 'Record not found' }, { headers: { ...corsHeaders }, status: 404 })
    }

    const status = body?.status ? String(body.status).toUpperCase() : null
    const paymentMethod = body?.payment_method ? String(body.payment_method).toUpperCase() : null
    const rechargeTime = body?.recharge_time ? new Date(body.recharge_time).toISOString() : null

    if (status && !['SUCCESS', 'FAILED', 'PROCESSING'].includes(status)) {
      return NextResponse.json({ error: 'status is invalid' }, { headers: { ...corsHeaders }, status: 400 })
    }

    if (paymentMethod && !['ALIPAY', 'WECHAT', 'BANK', 'CARD', 'OTHER'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'payment_method is invalid' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) updatePayload.status = status
    if (paymentMethod) updatePayload.payment_method = paymentMethod
    if (rechargeTime) updatePayload.recharge_time = rechargeTime
    if (body?.remark !== undefined) updatePayload.remark_encrypted = encryptText(body.remark)
    if (body?.transaction_no !== undefined) {
      updatePayload.transaction_no_encrypted = encryptText(body.transaction_no)
      updatePayload.transaction_no_hash = body.transaction_no ? hashToken(String(body.transaction_no)) : null
    }
    if (body?.user_account !== undefined) {
      updatePayload.user_account_encrypted = encryptText(body.user_account)
      updatePayload.user_account_hash = body.user_account ? hashToken(String(body.user_account)) : null
    }

    const { data, error } = await ctx.supabase
      .from('recharge_records')
      .update(updatePayload)
      .eq('id', recordId)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to update record' }, { headers: { ...corsHeaders }, status: 500 })
    }

    const ipAddress = getClientIp(req)
    await ctx.supabase.from('recharge_audit_logs').insert({
      record_id: data.id,
      operator_id: ctx.operatorId,
      action: 'recharge_records.update',
      ip_address: ipAddress,
      details: {
        before: {
          status: existing.status,
          payment_method: existing.payment_method,
          recharge_time: existing.recharge_time,
        },
        after: {
          status: data.status,
          payment_method: data.payment_method,
          recharge_time: data.recharge_time,
        },
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}
