import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin, findUserByPhone } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

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

    // 检查用户是否存在
    const existingUser = await findUserByPhone(supabaseAdmin, normalizedPhone)

    let user: any
    let userPassword: string | null = null
    let requiresPasswordReset = false

    if (existingUser) {
      // 用户已存在，但我们需要密码来登录
      // 由于 Supabase 不支持无密码登录，我们需要一个临时密码
      // 这里我们生成一个临时密码并更新用户密码
      userPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: userPassword,
          phone: normalizedPhone,
          phone_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            phone: normalizedPhone,
          },
        }
      )

      if (updateError) {
        console.error('Error updating user password:', updateError)
        return NextResponse.json(
          { error: '更新用户密码失败，请稍后重试' },
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }

      user = existingUser
      requiresPasswordReset = true
    } else {
      // 用户不存在，创建新用户（自动注册）
      userPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          phone: normalizedPhone,
          password: userPassword,
          phone_confirm: true,
          user_metadata: {
            nickname: `用户${normalizedPhone.slice(-4)}`,
          },
        })

      if (createError || !newUser.user) {
        const fallbackUser = await findUserByPhone(
          supabaseAdmin,
          normalizedPhone
        )
        if (fallbackUser) {
          const { error: updateError } =
            await supabaseAdmin.auth.admin.updateUserById(fallbackUser.id, {
              password: userPassword,
              phone: normalizedPhone,
              phone_confirm: true,
              user_metadata: {
                ...fallbackUser.user_metadata,
                phone: normalizedPhone,
              },
            })

          if (updateError) {
            console.error('Error updating user password:', updateError)
            return NextResponse.json(
              { error: '更新用户密码失败，请稍后重试' },
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              }
            )
          }

          user = fallbackUser
          requiresPasswordReset = true
        } else {
          console.error('Error creating user:', createError)
          return NextResponse.json(
            { error: createError?.message || '创建用户失败，请稍后重试' },
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }
      } else {
        user = newUser.user
      }
    }

    // 返回用户信息和临时密码，让前端使用 signInWithPassword 登录
    // 注意：这个密码是临时的，仅用于本次登录
    return NextResponse.json(
      {
        success: true,
        user: user,
        tempPassword: userPassword, // 临时密码，仅用于本次登录
        requiresPasswordReset,
      },
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in SMS login:', error)
    return NextResponse.json(
      { error: error.message || '登录失败，请稍后重试' },
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}
