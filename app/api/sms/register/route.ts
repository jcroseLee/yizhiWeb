import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin, findUserByPhone } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS() {
  return NextResponse.json('ok', { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code, password } = body

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

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少6位' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 从数据库验证验证码
    const supabaseAdmin = createSupabaseAdmin()
    const { data: smsData, error: smsError } = await supabaseAdmin
      .from('sms_codes')
      .select('code, expires_at')
      .eq('phone', normalizedPhone)
      .single()

    if (smsError || !smsData) {
      return NextResponse.json(
        { error: '验证码不存在或已过期' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 检查是否过期
    const expiresAt = new Date(smsData.expires_at)
    if (expiresAt < new Date()) {
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
    if (smsData.code !== code) {
      return NextResponse.json(
        { error: '验证码错误' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 验证成功，删除验证码记录
    await supabaseAdmin.from('sms_codes').delete().eq('phone', normalizedPhone)

    // 检查用户是否已存在
    const existingUser = await findUserByPhone(supabaseAdmin, normalizedPhone)

    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已被注册，请直接登录' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 创建新用户（使用 Admin API，设置 phone_confirm: true 避免触发 Supabase SMS）
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        phone: normalizedPhone,
        password: password,
        phone_confirm: true,
        user_metadata: {
          nickname: `用户${normalizedPhone.slice(-4)}`,
        },
      })

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError)
      let errorMessage = createError?.message || '创建用户失败，请稍后重试'
      if (createError?.message?.includes('already registered')) {
        errorMessage = '该手机号已被注册，请直接登录'
      }
      return NextResponse.json(
        { error: errorMessage },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // 返回用户信息，前端可以使用 signInWithPassword 登录
    return NextResponse.json(
      {
        success: true,
        user: newUser.user,
        message: '注册成功',
      },
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in SMS register:', error)
    return NextResponse.json(
      { error: error.message || '注册失败，请稍后重试' },
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}
