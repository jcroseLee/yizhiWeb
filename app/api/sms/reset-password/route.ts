import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin, findUserByPhone } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

function normalizeCNPhone(value: string) {
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

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 7) return digits
  return digits.slice(0, 3) + '****' + digits.slice(-4)
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  try {
    const body = await request.json()
    const { phone, code } = body

    const normalizedPhone = normalizeCNPhone(phone)
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: '请输入有效的手机号' },
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return NextResponse.json(
        { error: '请输入6位验证码' },
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()

    const { data: smsData, error: smsError } = await supabaseAdmin
      .from('sms_codes')
      .select('code, expires_at')
      .eq('phone', normalizedPhone)
      .single()

    if (smsError || !smsData) {
      console.info('[sms.reset-password] code missing', { phone: maskPhone(normalizedPhone) })
      return NextResponse.json(
        { error: '验证码不存在或已过期' },
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const expiresAt = new Date(smsData.expires_at)
    if (expiresAt < new Date()) {
      await supabaseAdmin.from('sms_codes').delete().eq('phone', normalizedPhone)
      console.info('[sms.reset-password] code expired', { phone: maskPhone(normalizedPhone) })
      return NextResponse.json(
        { error: '验证码已过期，请重新获取' },
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const trimmedCode = code.trim()
    if (smsData.code !== trimmedCode) {
      console.info('[sms.reset-password] code mismatch', { phone: maskPhone(normalizedPhone) })
      return NextResponse.json(
        { error: '验证码错误' },
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    await supabaseAdmin.from('sms_codes').delete().eq('phone', normalizedPhone)

    const existingUser = await findUserByPhone(supabaseAdmin, normalizedPhone)
    if (!existingUser) {
      console.info('[sms.reset-password] user not found', { phone: maskPhone(normalizedPhone) })
      return NextResponse.json(
        { error: '账号不存在，请检查手机号或使用邮箱找回' },
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: tempPassword,
      phone: normalizedPhone,
      phone_confirm: true,
      user_metadata: {
        ...existingUser.user_metadata,
        phone: normalizedPhone,
      },
    })

    if (updateError) {
      console.error('[sms.reset-password] update user password failed', {
        phone: maskPhone(normalizedPhone),
        error: updateError,
      })
      return NextResponse.json(
        { error: '更新用户状态失败，请稍后重试' },
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.info('[sms.reset-password] ok', {
      phone: maskPhone(normalizedPhone),
      ms: Date.now() - startedAt,
    })

    return NextResponse.json(
      { success: true, tempPassword },
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('[sms.reset-password] error', error)
    return NextResponse.json(
      { error: error?.message || '验证失败，请稍后重试' },
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

