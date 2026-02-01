import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/sms/verify-code:
 *   post:
 *     summary: POST /api/sms/verify-code
 *     description: Auto-generated description for POST /api/sms/verify-code
 *     tags:
 *       - Sms
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code } = body

    const normalizeCNPhone = (value: string) => {
      const trimmed = value?.trim()
      if (!trimmed) return ''
      const digits = trimmed.replace(/\D/g, '')
      if (digits.length === 11 && /^1[3-9]\d{9}$/.test(digits)) {
        return `+86${digits}`
      }
      if (digits.length === 13 && digits.startsWith('86')) {
        const local = digits.slice(2)
        if (/^1[3-9]\d{9}$/.test(local)) {
          return `+86${local}`
        }
      }
      return ''
    }

    const normalizedPhone = normalizeCNPhone(phone)

    // 验证输入
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: '请输入有效的手机号' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: '请输入6位验证码' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 从数据库验证验证码
    const supabaseAdmin = createSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('sms_codes')
      .select('code, expires_at')
      .eq('phone', normalizedPhone)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: '验证码不存在或已过期' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 检查是否过期
    const expiresAt = new Date(data.expires_at)
    if (expiresAt < new Date()) {
      // 删除过期记录
      await supabaseAdmin.from('sms_codes').delete().eq('phone', normalizedPhone)
      return NextResponse.json(
        { error: '验证码已过期，请重新获取' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 验证码匹配
    if (data.code !== code) {
      return NextResponse.json(
        { error: '验证码错误' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 验证成功，删除验证码记录（防止重复使用）
    await supabaseAdmin.from('sms_codes').delete().eq('phone', normalizedPhone)

    return NextResponse.json(
      { success: true, message: '验证码验证成功' },
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error verifying SMS code:', error)
    return NextResponse.json(
      { error: error.message || '验证失败，请稍后重试' },
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}
