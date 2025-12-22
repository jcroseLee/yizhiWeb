import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  console.log('wechat-bind-phone function invoked.')

  try {
    console.log('Parsing request body.')
    const { openid, unionid, phoneNumber, encryptedData, iv, code, userInfo } = await request.json()

    if (!openid) {
      throw new Error('Missing openid in request body.')
    }

    let finalPhoneNumber = phoneNumber

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

    if (!finalPhoneNumber) {
      throw new Error('Missing phoneNumber in request body.')
    }

    console.log('Received data:', { openid, unionid, phoneNumber: finalPhoneNumber })

    const supabase = createSupabaseAdmin()

    const email = `${openid}@wechat.user`
    const password = `${openid}-wechat-password`

    // Try to sign in first to check if user exists
    console.log('Checking if user exists.')
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    let user: any
    let session: any

    if (signInError && signInError.message.includes('Invalid login credentials')) {
      // User doesn't exist, create new user with phone number
      console.log('User not found, creating new user with phone number.')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        phone: finalPhoneNumber,
        options: {
          data: {
            wechat_openid: openid,
            wechat_unionid: unionid,
            avatar_url: userInfo?.avatarUrl || null,
            nickname: userInfo?.nickname || null,
            phone: finalPhoneNumber,
          },
        },
      })

      if (signUpError) {
        console.error('Sign-up error:', signUpError)
        throw signUpError
      }

      if (!signUpData || !signUpData.user) {
        throw new Error('Failed to create user.')
      }

      user = signUpData.user
      session = signUpData.session
    } else if (signInError) {
      console.error('Sign-in error:', signInError)
      throw signInError
    } else if (signInData && signInData.user) {
      // User exists, update phone number
      console.log('User exists, updating phone number.')
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        signInData.user.id,
        {
          phone: finalPhoneNumber,
          user_metadata: {
            ...signInData.user.user_metadata,
            phone: finalPhoneNumber,
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
        phone: finalPhoneNumber,
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

