import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // 1. 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '未登录或会话已过期' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 2. 获取请求数据
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

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: '请输入有效的手机号' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: '请输入6位验证码' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 3. 验证短信验证码
    const supabaseAdmin = createSupabaseAdmin()
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('sms_codes')
      .select('code, expires_at')
      .eq('phone', normalizedPhone)
      .single()

    if (codeError || !codeData) {
      return NextResponse.json(
        { error: '验证码不存在或已过期' },
        { status: 400, headers: corsHeaders }
      )
    }

    const expiresAt = new Date(codeData.expires_at)
    if (expiresAt < new Date()) {
      await supabaseAdmin.from('sms_codes').delete().eq('phone', normalizedPhone)
      return NextResponse.json(
        { error: '验证码已过期，请重新获取' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (codeData.code !== code) {
      return NextResponse.json(
        { error: '验证码错误' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 4. 更新用户手机号
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { phone: normalizedPhone, phone_confirm: true }
    )

    if (updateError) {
      console.error('Error updating user phone:', updateError)
      return NextResponse.json(
        { error: updateError.message || '更新手机号失败' },
        { status: 500, headers: corsHeaders }
      )
    }

    // 5. 删除验证码（防止重复使用）
    await supabaseAdmin.from('sms_codes').delete().eq('phone', normalizedPhone)

    return NextResponse.json(
      { success: true, message: '手机号绑定成功' },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('Error in update-phone route:', error)
    return NextResponse.json(
      { error: error.message || '系统错误，请稍后重试' },
      { status: 500, headers: corsHeaders }
    )
  }
}
