import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseWithToken } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

const wechatApiBase = 'https://api.weixin.qq.com'

// Exchange the code for a session key and openid
async function getWechatSession(code: string) {
  console.log('Getting WeChat session for code:', code)
  const WECHAT_APPID = process.env.WECHAT_APPID
  const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET

  if (!WECHAT_APPID || !WECHAT_APPSECRET) {
    console.error('Missing WeChat environment variables.', {
      hasAppId: !!WECHAT_APPID,
      hasAppSecret: !!WECHAT_APPSECRET,
    })
    throw new Error('Missing WeChat environment variables. Please check WECHAT_APPID and WECHAT_APPSECRET are set.')
  }

  console.log('WeChat AppID configured:', {
    appIdLength: WECHAT_APPID.length,
    appSecretLength: WECHAT_APPSECRET.length,
  })

  const url = `${wechatApiBase}/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_APPSECRET}&js_code=${code}&grant_type=authorization_code`
  console.log('Fetching WeChat session from WeChat API')
  const res = await fetch(url)
  const data = await res.json()
  console.log('WeChat API response:', {
    hasErrcode: !!data.errcode,
    errcode: data.errcode,
    errmsg: data.errmsg,
    hasOpenid: !!data.openid,
  })

  if (data.errcode) {
    console.error('WeChat API error:', {
      errcode: data.errcode,
      errmsg: data.errmsg,
      rid: data.rid,
    })

    let errorMessage = data.errmsg || 'Failed to get WeChat session.'
    if (data.errcode === 40013) {
      errorMessage = 'Invalid WeChat AppID. Please verify WECHAT_APPID is correct.'
    } else if (data.errcode === 40125) {
      errorMessage = 'Invalid WeChat AppSecret. Please verify WECHAT_APPSECRET is correct.'
    } else if (data.errcode === 40029) {
      errorMessage = 'Invalid WeChat code. The code may have expired or been used already.'
    }

    throw new Error(errorMessage)
  }

  if (!data.openid) {
    console.error('WeChat API response missing openid:', data)
    throw new Error('WeChat API response is missing openid.')
  }

  return data // { openid, session_key, unionid }
}

// 生成随机昵称
function generateRandomNickname(): string {
  const adjectives = ['神秘', '智慧', '优雅', '灵动', '沉稳', '飘逸', '清雅', '深邃', '温润', '刚毅', '柔美', '豪迈', '淡泊', '超然', '宁静', '悠然', '洒脱', '内敛', '豁达', '睿智']
  const nouns = ['行者', '隐士', '学者', '墨客', '雅士', '游侠', '居士', '道人', '书生', '剑客', '琴师', '画师', '诗人', '旅人', '观者', '思者', '悟者', '修者', '行者', '智者']
  const numbers = Math.floor(Math.random() * 9999) + 1
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj}${noun}${numbers}`
}

// 检查昵称是否已存在
async function checkNicknameExists(supabaseAdmin: any, nickname: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('nickname', nickname)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.warn('Error checking nickname existence:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.warn('Exception checking nickname existence:', error)
    return false
  }
}

// 生成唯一的随机昵称
async function generateUniqueNickname(supabaseAdmin: any, maxAttempts: number = 10): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const nickname = generateRandomNickname()
    const exists = await checkNicknameExists(supabaseAdmin, nickname)
    if (!exists) {
      return nickname
    }
    console.log(`Nickname "${nickname}" already exists, trying again...`)
  }
  const fallbackNickname = generateRandomNickname() + '-' + Date.now()
  console.log(`Using fallback nickname with timestamp: ${fallbackNickname}`)
  return fallbackNickname
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/wechat-login:
 *   post:
 *     summary: POST /api/wechat-login
 *     description: Auto-generated description for POST /api/wechat-login
 *     tags:
 *       - Wechat-login
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  console.log('wechat-login function invoked.')

  try {
    console.log('Parsing request body.')
    const { code, userInfo } = await request.json()
    if (!code) {
      console.error('Missing code in request body.')
      throw new Error('Missing code in request body.')
    }
    console.log('Received code:', code)
    console.log('Received userInfo:', userInfo)

    const wechatSession = await getWechatSession(code)
    const { openid, session_key, unionid } = wechatSession
    console.log('WeChat session details:', { openid, session_key, unionid })

    if (!openid) {
      console.error('Failed to get openid from WeChat.')
      throw new Error('Failed to get openid from WeChat.')
    }

    console.log('Creating Supabase clients (admin + anon).')
    const supabaseAdmin = createSupabaseAdmin()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

    const supabaseAnon = anonKey && supabaseUrl
      ? createSupabaseAdmin() // We'll use admin client for now, but with anon key if needed
      : null

    // Use .app TLD which is a valid TLD and should pass email validation
    const email = `${openid}@wechat.app`
    const emailOld = `${openid}@wechat.user` // For backward compatibility with existing users
    const password = `${openid}-wechat-password`
    console.log('Generated user credentials:', { email })

    // Helper function to sync profile to profiles table
    const syncProfileToTable = async (
      userId: string,
      nickname: string | null,
      avatarUrl: string | null,
      wechatOpenId?: string,
      wechatUnionId?: string | null
    ) => {
      console.log('Syncing profile to profiles table:', { userId, nickname, avatarUrl, wechatOpenId, wechatUnionId })

      let unionIdToSync = wechatUnionId

      const profileDataBase: any = {
        nickname: nickname && nickname.trim() !== '' ? nickname : null,
        avatar_url: avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : null,
      }

      if (unionIdToSync !== undefined && unionIdToSync !== null) {
        profileDataBase.wechat_unionid = unionIdToSync
      }

      if (wechatOpenId) {
        let existingProfileByOpenId: any = null
        let existingProfileError: any = null
        try {
          const existingResult = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('wechat_openid', wechatOpenId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          existingProfileByOpenId = existingResult.data
          existingProfileError = existingResult.error
        } catch (lookupError) {
          console.warn('Lookup by wechat_openid threw:', lookupError)
        }

        if (existingProfileError && existingProfileError.code !== 'PGRST116') {
          console.warn('Failed to fetch existing profile by openid during sync:', existingProfileError)
        }

        const profileData: any = {
          ...profileDataBase,
          wechat_openid: wechatOpenId,
        }

        if (existingProfileByOpenId?.id) {
          console.log('Updating existing profile row by openid:', {
            openid: wechatOpenId,
            existingId: existingProfileByOpenId.id,
            incomingUserId: userId,
          })

          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              ...profileData,
              id: existingProfileByOpenId.id,
            })
            .eq('wechat_openid', wechatOpenId)

          if (updateError) {
            console.error('Failed to update existing profile by openid:', updateError)
          } else {
            console.log('Successfully updated profile using openid conflict.')
          }
          return
        }

        const insertData = {
          id: userId,
          ...profileData,
        }

        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .upsert(insertData, {
            onConflict: 'id',
          })

        if (insertError) {
          console.error('Failed to insert profile when no existing openid row was found:', insertError)
        } else {
          console.log('Successfully inserted profile with new openid.')
        }
        return
      }

      const fallbackData = {
        id: userId,
        ...profileDataBase,
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(fallbackData, {
          onConflict: 'id',
        })

      if (profileError) {
        console.error('Failed to sync profile to profiles table:', profileError)
      } else {
        console.log('Successfully synced profile to profiles table')
      }
    }

    // Check if user with this openId already exists in profiles table
    console.log('Checking if user with openId exists:', openid)
    const {
      data: existingProfile,
      error: existingProfileError,
    } = await supabaseAdmin
      .from('profiles')
      .select('id, wechat_openid')
      .eq('wechat_openid', openid)
      .maybeSingle()

    if (existingProfileError) {
      if (existingProfileError.code !== 'PGRST116') {
        console.warn('Failed to fetch existing profile by openid:', existingProfileError)
      }
    }

    console.log('Ensuring auth user exists and email is confirmed.')
    let ensuredUser: any = null
    let createdNewUser = false
    let preAuthData: any = null

    // Helper: scan users to find by email when direct lookup is unavailable
    const findUserByEmail = async (client: any, emailLookup: string) => {
      try {
        for (let page = 1; page <= 5; page++) {
          const { data: listData, error: listError } = await client.auth.admin.listUsers({ page, perPage: 200 })
          if (listError) {
            console.warn('listUsers error:', listError)
            break
          }
          const users = (listData as any)?.users || listData || []
          const found = users.find((u: any) => u?.email === emailLookup)
          if (found) return found
          if (Array.isArray(users) && users.length < 200) break
        }
      } catch (e) {
        console.warn('findUserByEmail threw:', e)
      }
      return null
    }

    // Resolve existing auth user: prefer profiles.id -> getUserById, else scan by email
    let userToProcess: any = null
    if (existingProfile?.id) {
      const { data: byIdData, error: byIdError } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id)
      if (byIdError) {
        console.warn('getUserById error for existing profile id:', byIdError)
      } else {
        const candidate = (byIdData as any)?.user ?? byIdData
        if (candidate?.id) {
          userToProcess = candidate
        }
      }
    }
    if (!userToProcess) {
      userToProcess = await findUserByEmail(supabaseAdmin, email)
    }
    if (!userToProcess && emailOld) {
      userToProcess = await findUserByEmail(supabaseAdmin, emailOld)
    }

    // If user exists, update them. If not, create them.
    if (userToProcess) {
      console.log('Found existing user:', { id: userToProcess.id, email: userToProcess.email })
      if (userToProcess.email !== email || !userToProcess.email_confirmed_at) {
        console.log('Updating user to new email format and confirming email.')
        const { data: updatedUser, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
          userToProcess.id,
          {
            email: email,
            email_confirm: true,
            password: password,
          }
        )
        if (updateUserError) {
          console.error('Failed to update user:', updateUserError)
          throw updateUserError
        }

        const { data: refetchedUserData, error: refetchError } = await supabaseAdmin.auth.admin.getUserById(
          userToProcess.id
        )
        if (refetchError) {
          console.error('Failed to refetch user after update:', refetchError)
          throw refetchError
        }

        console.log('Refetched user confirmed at:', refetchedUserData.user.email_confirmed_at)
        ensuredUser = refetchedUserData.user
      } else {
        console.log('User is already up-to-date and confirmed.')
        ensuredUser = userToProcess
      }
    } else {
      console.log('User not found, creating new user.')

      let finalNickname = userInfo?.nickname || null
      let finalAvatarUrl = userInfo?.avatarUrl || null

      if (!finalNickname || finalNickname.trim() === '') {
        console.log('No nickname provided, will use default nickname from database.')
        finalNickname = null
      }

      if (!finalAvatarUrl || finalAvatarUrl.trim() === '') {
        console.log('No avatar provided, will use default avatar from database.')
        finalAvatarUrl = null
      }

      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password,
        email_confirm: true,
        user_metadata: {
          wechat_openid: openid,
          wechat_unionid: unionid,
          avatar_url: finalAvatarUrl,
          nickname: finalNickname,
        },
      })

      if (signUpError) {
        console.error('Failed to create user:', signUpError)
        const fallbackUser = await findUserByEmail(supabaseAdmin, email) || await findUserByEmail(supabaseAdmin, emailOld)
        if (fallbackUser) {
          ensuredUser = fallbackUser
        } else if ((signUpError as any)?.code === 'email_exists' || (signUpError as any)?.status === 422) {
          console.log('Email already exists, initiating OTP fallback during ensure-user.')
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email,
          })
          if (linkError) {
            console.error('Failed to generate magiclink:', linkError)
            throw linkError
          }
          const emailOtpEnsure = (linkData as any)?.properties?.email_otp
          if (!emailOtpEnsure) {
            console.error('Magiclink generation did not include email_otp.')
            throw new Error('Failed to generate email OTP')
          }
          const signInClientEnsure = supabaseAnon || supabaseAdmin
          console.log('Verifying OTP to create session (ensure-user flow).')
          const { data: otpDataEnsure, error: otpErrorEnsure } = await signInClientEnsure.auth.verifyOtp({
            email,
            token: emailOtpEnsure,
            type: 'email',
          })
          if (otpErrorEnsure) {
            console.error('OTP verification failed (ensure-user):', otpErrorEnsure)
            throw otpErrorEnsure
          }
          preAuthData = otpDataEnsure
          ensuredUser = otpDataEnsure?.user
        } else {
          throw signUpError
        }
      } else {
        ensuredUser = (signUpData as any)?.user ?? signUpData
        createdNewUser = true
      }
    }

    if (!ensuredUser) {
      console.error('Could not ensure user exists.')
      throw new Error('Failed to create or update user.')
    }

    // Helper: attempt sign-in with retries when email_not_confirmed
    const attemptSignInWithRetries = async (
      client: any,
      emailToUse: string,
      pwd: string,
      adminClient: any,
      ensured: any
    ) => {
      let lastError: any = null
      for (let i = 0; i < 3; i++) {
        console.log(`Sign-in attempt ${i + 1} for email:`, emailToUse)
        const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
          email: emailToUse,
          password: pwd,
        })
        if (!signInError && signInData) {
          return { data: signInData }
        }
        lastError = signInError
        const code = (signInError as any)?.code
        const status = (signInError as any)?.status
        console.warn('Sign-in error:', { code, status, message: signInError?.message })
        if (code === 'email_not_confirmed') {
          console.log('Email not confirmed; forcing confirm and retry.')
          const { error: confirmErr } = await adminClient.auth.admin.updateUserById(ensured.id, {
            email_confirm: true,
          })
          if (confirmErr) {
            console.warn('Forced confirm failed:', confirmErr)
          }
          await new Promise((r) => setTimeout(r, 300 * (i + 1)))
          continue
        }
        break
      }
      throw lastError || new Error('Sign-in failed')
    }

    console.log('Attempting final sign-in with ensured user.', {
      ensured_email: ensuredUser.email,
      ensured_email_confirmed_at: ensuredUser.email_confirmed_at,
      ensured_is_anonymous: ensuredUser.is_anonymous,
    })
    const signInClient = supabaseAnon || supabaseAdmin
    let data: any = preAuthData || null
    if (!data) {
      try {
        const result = await attemptSignInWithRetries(signInClient, ensuredUser.email, password, supabaseAdmin, ensuredUser)
        data = result.data
      } catch (signErr: any) {
        const code = signErr?.code
        const status = signErr?.status
        console.warn('Password sign-in failed after retries:', { code, status, message: signErr?.message })
        if (code === 'email_not_confirmed' || status === 400) {
          console.log('Falling back to OTP login via admin.generateLink.')
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: ensuredUser.email,
          })
          if (linkError) {
            console.error('Failed to generate magiclink:', linkError)
            throw linkError
          }
          const emailOtp = (linkData as any)?.properties?.email_otp
          if (!emailOtp) {
            console.error('Magiclink generation did not include email_otp.')
            throw new Error('Failed to generate email OTP')
          }
          console.log('Verifying OTP to create session.')
          const { data: otpData, error: otpError } = await signInClient.auth.verifyOtp({
            email: ensuredUser.email,
            token: emailOtp,
            type: 'email',
          })
          if (otpError) {
            console.error('OTP verification failed:', otpError)
            throw otpError
          }
          data = otpData
        } else {
          throw signErr
        }
      }
    }

    if (!data || !data.user) {
      console.error('Sign-in succeeded but missing user data.')
      throw new Error('Failed to retrieve user data after sign-in.')
    }

    let finalNickname = userInfo?.nickname || data.user.user_metadata?.nickname || ensuredUser?.user_metadata?.nickname || null
    let finalAvatarUrl = userInfo?.avatarUrl || data.user.user_metadata?.avatar_url || ensuredUser?.user_metadata?.avatar_url || null

    if (!finalNickname || finalNickname.trim() === '') {
      console.log('No nickname found, will use default nickname from database.')
      finalNickname = null
    }

    if (!finalAvatarUrl || finalAvatarUrl.trim() === '') {
      console.log('No avatar found, will use default avatar from database.')
      finalAvatarUrl = null
    }

    const needsUpdate = createdNewUser ||
      (data.user.user_metadata?.nickname !== finalNickname) ||
      (data.user.user_metadata?.avatar_url !== finalAvatarUrl)

    if (needsUpdate) {
      console.log('Updating user metadata with generated or provided values.')
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user.id,
        {
          user_metadata: {
            ...data.user.user_metadata,
            avatar_url: finalAvatarUrl,
            nickname: finalNickname,
          },
        }
      )
      if (updateError) {
        console.error('Update user metadata error:', updateError)
      } else if (updatedUser) {
        data.user = updatedUser
      }
    }

    if (createdNewUser || !existingProfile || existingProfile.wechat_openid !== openid) {
      console.log('Syncing profile to ensure openid linkage.')
      await syncProfileToTable(
        data.user.id,
        finalNickname,
        finalAvatarUrl,
        openid,
        unionid || data.user.user_metadata?.wechat_unionid || ensuredUser?.user_metadata?.wechat_unionid || null
      )
    } else if (data && data.user && data.user.id) {
      const { data: existingProfileData } = await supabaseAdmin
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle()

      const needsProfileUpdate = !existingProfileData ||
        (!existingProfileData.nickname || existingProfileData.nickname.trim() === '') ||
        (!existingProfileData.avatar_url || existingProfileData.avatar_url.trim() === '')

      if (needsProfileUpdate) {
        console.log('Profile missing nickname or avatar, updating it.')
        await syncProfileToTable(
          data.user.id,
          finalNickname,
          finalAvatarUrl,
          undefined,
          unionid || data.user.user_metadata?.wechat_unionid || ensuredUser?.user_metadata?.wechat_unionid || null
        )
      }
    }

    if (!data || !data.session) {
      console.error('No session available after login.')
      throw new Error('Failed to create session.')
    }

    if (!data.user) {
      console.error('No user data available after login.')
      throw new Error('Failed to get user data.')
    }

    try {
      const { error: loginError } = await supabaseAdmin.rpc('on_user_login', {
        user_id: data.user.id
      })
      if (loginError) {
        console.warn('Failed to update login info:', loginError)
      } else {
        console.log('Successfully updated login info and ensured default profile fields')
      }
    } catch (loginErr) {
      console.warn('Exception updating login info:', loginErr)
    }

    console.log('Login successful, returning data.')
    const responseData = {
      ...data.session,
      access_token: data.session.access_token,
      user: data.user,
    }

    return NextResponse.json(responseData, {
      headers: corsHeaders,
      status: 200,
    })
  } catch (error: any) {
    console.error('Unhandled error in wechat-login function:', error)
    const status = typeof error?.status === 'number' ? error.status : 500
    const message = error?.message || 'Internal server error'
    return NextResponse.json({ error: message }, {
      headers: corsHeaders,
      status,
    })
  }
}

