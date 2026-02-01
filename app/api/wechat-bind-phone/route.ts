import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/wechat-bind-phone:
 *   post:
 *     summary: POST /api/wechat-bind-phone
 *     description: Auto-generated description for POST /api/wechat-bind-phone
 *     tags:
 *       - Wechat-bind-phone
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  console.log('wechat-bind-phone function invoked.')

  try {
    console.log('Parsing request body.')
    const { openid, unionid, phoneNumber, encryptedData, iv, code, userInfo } = await request.json()

    if (!openid) {
      throw new Error('Missing openid in request body.')
    }

    const finalPhoneNumber = phoneNumber

    // If encryptedData and iv are provided, decrypt phone number
    if (encryptedData && iv && code) {
      console.log('Decrypting phone number from encrypted data.')
      const WECHAT_APPID = process.env.WECHAT_APPID
      const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET

      if (!WECHAT_APPID || !WECHAT_APPSECRET) {
        throw new Error('Missing WeChat environment variables.')
      }

      // Get session_key from code
      const wechatApiBase = 'https://api.weixin.qq.com'
      const sessionUrl = `${wechatApiBase}/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_APPSECRET}&js_code=${code}&grant_type=authorization_code`
      const sessionRes = await fetch(sessionUrl)
      const sessionData = await sessionRes.json()

      if (sessionData.errcode) {
        throw new Error(sessionData.errmsg || 'Failed to get WeChat session.')
      }

      const { session_key } = sessionData

      // Decrypt phone number using crypto (simplified - in production, use proper crypto library)
      console.log('Phone number decryption would happen here with session_key and iv')
      // In production, implement proper decryption here
    }

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

    const normalizedPhone = normalizeCNPhone(finalPhoneNumber)

    if (!normalizedPhone) {
      throw new Error('手机号格式不正确')
    }

    console.log('Received data:', { openid, unionid, phoneNumber: finalPhoneNumber })

    const supabase = createSupabaseAdmin()

    const email = `${openid}@wechat.user`
    const password = `${openid}-wechat-password`

    // Try to sign in first to check if user exists
    console.log('Checking if user exists.')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    let user: any
    let session: any

    if (signInError && signInError.message.includes('Invalid login credentials')) {
      // User doesn't exist, create new user with phone number using Admin API
      // This avoids triggering Supabase's SMS confirmation
      console.log('User not found, creating new user with phone number.')
      const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        phone: normalizedPhone,
        email_confirm: true,
        phone_confirm: true, // 直接确认手机号，避免触发 Supabase 的 SMS 确认
        user_metadata: {
          wechat_openid: openid,
          wechat_unionid: unionid,
          avatar_url: userInfo?.avatarUrl || null,
          nickname: userInfo?.nickname || null,
          phone: normalizedPhone,
        },
      })

      if (createError) {
        console.error('Create user error:', createError)
        throw createError
      }

      if (!newUserData || !newUserData.user) {
        throw new Error('Failed to create user.')
      }

      user = newUserData.user
      
      // Create a session for the new user
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (sessionError || !sessionData) {
        console.error('Failed to create session:', sessionError)
        throw new Error('Failed to create session after user creation.')
      }

      session = sessionData.session
    } else if (signInError) {
      console.error('Sign-in error:', signInError)
      throw signInError
    } else if (signInData && signInData.user) {
      // User exists, update phone number
      console.log('User exists, updating phone number.')
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        signInData.user.id,
        {
          phone: normalizedPhone,
          user_metadata: {
            ...signInData.user.user_metadata,
            phone: normalizedPhone,
            avatar_url: userInfo?.avatarUrl || signInData.user.user_metadata?.avatar_url,
            nickname: userInfo?.nickname || signInData.user.user_metadata?.nickname,
          },
        }
      )

      if (updateError) {
        console.error('Update user phone error:', updateError)
        throw updateError
      }

      if (!updatedUser) {
        throw new Error('Failed to update user phone.')
      }

      user = updatedUser
      // Create a new session for the updated user
      const { data: newSessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (sessionError || !newSessionData) {
        console.error('Failed to create new session:', sessionError)
        throw new Error('Failed to create session after phone update.')
      }

      session = newSessionData.session
    } else {
      throw new Error('Unexpected state: no user data.')
    }

    // Sync profile to profiles table
    console.log('Syncing profile to profiles table.')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        nickname: userInfo?.nickname || user.user_metadata?.nickname || null,
        avatar_url: userInfo?.avatarUrl || user.user_metadata?.avatar_url || null,
        wechat_openid: openid,
        wechat_unionid: unionid || user.user_metadata?.wechat_unionid || null,
        phone: normalizedPhone,
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Failed to sync profile to profiles table:', profileError)
    } else {
      console.log('Successfully synced phone number to profiles table')
    }

    console.log('Phone binding successful, returning session.')
    const responseData = {
      ...session,
      access_token: session?.access_token,
      user: user,
    }

    return NextResponse.json(responseData, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Unhandled error in wechat-bind-phone function:', error)
    return NextResponse.json({ error: error.message }, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}
