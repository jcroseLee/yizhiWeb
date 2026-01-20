import { getAlipaySdk } from '@/lib/services/alipay'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

const STATE_COOKIE = 'yi_alipay_oauth_state_v1'
const FAIL_COOKIE = 'yi_alipay_oauth_fail_v1'
const STATE_TTL_MS = 10 * 60 * 1000
const FAIL_WINDOW_MS = 10 * 60 * 1000
const FAIL_MAX_COUNT = 5

function sha256Base64Url(input: string) {
  return crypto.createHash('sha256').update(input).digest('base64url')
}

function sanitizeRedirectPath(raw: unknown) {
  if (typeof raw !== 'string') return '/'
  const value = raw.trim()
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//')) return '/'
  if (value.includes('\\')) return '/'
  return value
}

function parseJson<T>(raw: string | undefined | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function normalizeSdkResult(input: any) {
  let obj = input
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj)
    } catch {
      return null
    }
  }
  if (!obj || typeof obj !== 'object') return null
  const key = Object.keys(obj).find((k) => k.endsWith('_response'))
  return key ? (obj as any)[key] : obj
}

function buildSupabaseForRoute(request: NextRequest, initialResponse: NextResponse) {
  const supabaseResponse = initialResponse
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return { supabase: null, getResponse: () => supabaseResponse }
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  return { supabase, getResponse: () => supabaseResponse }
}

function bumpFailureCookie(request: NextRequest, response: NextResponse) {
  const raw = request.cookies.get(FAIL_COOKIE)?.value
  const existing = parseJson<{ count: number; firstAt: number }>(raw)
  const now = Date.now()
  const withinWindow = existing && typeof existing.firstAt === 'number' && now - existing.firstAt < FAIL_WINDOW_MS
  const next = {
    count: withinWindow && typeof existing?.count === 'number' ? existing.count + 1 : 1,
    firstAt: withinWindow && typeof existing?.firstAt === 'number' ? existing.firstAt : now,
  }

  response.cookies.set({
    name: FAIL_COOKIE,
    value: JSON.stringify(next),
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.ceil(FAIL_WINDOW_MS / 1000),
  })
}

function clearCookie(response: NextResponse, name: string, request: NextRequest) {
  response.cookies.set({
    name,
    value: '',
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  let tokenMs = 0
  let userInfoMs = 0
  let sessionMs = 0

  const blocked = (() => {
    const raw = request.cookies.get(FAIL_COOKIE)?.value
    const existing = parseJson<{ count: number; firstAt: number }>(raw)
    if (!existing) return false
    if (typeof existing.count !== 'number' || typeof existing.firstAt !== 'number') return false
    if (Date.now() - existing.firstAt >= FAIL_WINDOW_MS) return false
    return existing.count >= FAIL_MAX_COUNT
  })()

  if (blocked) {
    const res = NextResponse.redirect(new URL('/login?error=too_many_attempts', request.url))
    res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  const authCode = request.nextUrl.searchParams.get('auth_code') || request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  if (!authCode || !state) {
    const res = NextResponse.redirect(new URL('/login?error=alipay_invalid_callback', request.url))
    res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
    res.headers.set('Cache-Control', 'no-store')
    clearCookie(res, STATE_COOKIE, request)
    bumpFailureCookie(request, res)
    return res
  }

  const stateRaw = request.cookies.get(STATE_COOKIE)?.value
  const stored = parseJson<{ state: string; redirectPath: string; createdAt: number; uaHash?: string }>(stateRaw)
  const validState =
    stored &&
    stored.state === state &&
    typeof stored.createdAt === 'number' &&
    Date.now() - stored.createdAt < STATE_TTL_MS

  const userAgent = request.headers.get('user-agent') || ''
  const uaHashNow = sha256Base64Url(userAgent)
  const validUa = stored?.uaHash ? stored.uaHash === uaHashNow : true

  if (!validState || !validUa) {
    const res = NextResponse.redirect(new URL('/login?error=alipay_csrf', request.url))
    res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
    res.headers.set('Cache-Control', 'no-store')
    clearCookie(res, STATE_COOKIE, request)
    bumpFailureCookie(request, res)
    return res
  }

  const redirectPath = sanitizeRedirectPath(stored.redirectPath)
  const redirectUrl = new URL(redirectPath, request.url)
  const res0 = NextResponse.redirect(redirectUrl)
  res0.headers.set('Cache-Control', 'no-store')
  clearCookie(res0, STATE_COOKIE, request)
  const { supabase, getResponse } = buildSupabaseForRoute(request, res0)
  if (!supabase) {
    const res = NextResponse.redirect(new URL('/login?error=supabase_not_configured', request.url))
    res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
    res.headers.set('Cache-Control', 'no-store')
    bumpFailureCookie(request, res)
    return res
  }

  const sdk = getAlipaySdk()
  if (!sdk) {
    const res = NextResponse.redirect(new URL('/login?error=alipay_not_configured', request.url))
    res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
    res.headers.set('Cache-Control', 'no-store')
    bumpFailureCookie(request, res)
    return res
  }

  let accessToken: string | null = null
  let alipayUserId: string | null = null

  try {
    const t0 = Date.now()
    const tokenResult = await (sdk as any).exec('alipay.system.oauth.token', {
      grantType: 'authorization_code',
      code: authCode,
    })
    const tokenResp = normalizeSdkResult(tokenResult)
    accessToken = tokenResp?.access_token || tokenResp?.accessToken || null
    alipayUserId = tokenResp?.user_id || tokenResp?.userId || tokenResp?.alipay_user_id || tokenResp?.alipayUserId || null
    tokenMs = Date.now() - t0
  } catch {
    const res = NextResponse.redirect(new URL('/login?error=alipay_token_exchange_failed', request.url))
    res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
    res.headers.set('Cache-Control', 'no-store')
    bumpFailureCookie(request, res)
    return res
  }

  if (!accessToken || !alipayUserId) {
    const res = NextResponse.redirect(new URL('/login?error=alipay_token_invalid', request.url))
    res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
    res.headers.set('Cache-Control', 'no-store')
    bumpFailureCookie(request, res)
    return res
  }

  let nickname: string | null = null
  let avatarUrl: string | null = null

  try {
    const t0 = Date.now()
    const userInfoResult =
      (await (sdk as any).exec('alipay.user.info.share', {}, { authToken: accessToken })) ||
      (await (sdk as any).exec('alipay.user.info.share', { authToken: accessToken }))
    const userResp = normalizeSdkResult(userInfoResult)
    const userId = userResp?.user_id || userResp?.userId || null
    if (userId) alipayUserId = userId
    nickname = userResp?.nick_name || userResp?.nickName || userResp?.nickname || null
    avatarUrl = userResp?.avatar || userResp?.avatar_url || userResp?.avatarUrl || null
    userInfoMs = Date.now() - t0
  } catch {
    nickname = null
    avatarUrl = null
  }

  const email = `${alipayUserId}@alipay.app`
  const admin = createAdminClient()

  try {
    const t0 = Date.now()
    const meta = {
      provider: 'alipay',
      alipay_user_id: alipayUserId,
      nickname,
      avatar_url: avatarUrl,
    }

    const ensureLink = async () => {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })
      if (!error) return data
      const msg = typeof (error as any)?.message === 'string' ? (error as any).message : ''
      if (msg.toLowerCase().includes('user not found')) {
        const password = crypto.randomBytes(32).toString('base64url')
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: meta,
        })
        if (createError || !created?.user) throw createError || new Error('Failed to create user')
        return (await admin.auth.admin.generateLink({ type: 'magiclink', email })).data
      }
      throw error
    }

    const linkData = await ensureLink()
    const emailOtp = (linkData as any)?.properties?.email_otp
    if (!emailOtp) {
      const res = NextResponse.redirect(new URL('/login?error=supabase_link_failed', request.url))
      res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
      res.headers.set('Cache-Control', 'no-store')
      bumpFailureCookie(request, res)
      return res
    }

    const { data: otpData, error: otpError } = await (supabase as any).auth.verifyOtp({
      email,
      token: emailOtp,
      type: 'email',
    })
    if (otpError || !otpData?.user) {
      const res = NextResponse.redirect(new URL('/login?error=supabase_session_failed', request.url))
      res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
      res.headers.set('Cache-Control', 'no-store')
      bumpFailureCookie(request, res)
      return res
    }

    await admin.auth.admin.updateUserById(otpData.user.id, {
      user_metadata: {
        ...(otpData.user.user_metadata || {}),
        provider: 'alipay',
        alipay_user_id: alipayUserId,
        nickname: nickname || (otpData.user.user_metadata as any)?.nickname || null,
        avatar_url: avatarUrl || (otpData.user.user_metadata as any)?.avatar_url || null,
      },
    })

    const nowIso = new Date().toISOString()
    try {
      await admin.from('profiles').upsert(
        {
          id: otpData.user.id,
          email,
          nickname: nickname || null,
          avatar_url: avatarUrl || null,
          last_login_at: nowIso,
          role: 'user',
        },
        { onConflict: 'id' }
      )
      await admin.from('profiles').update({ last_login_at: nowIso }).eq('id', otpData.user.id)
    } catch {}

    try {
      await admin.rpc('on_user_login', { user_id: otpData.user.id })
    } catch {}

    const finalRes = getResponse()
    finalRes.cookies.set({
      name: FAIL_COOKIE,
      value: '',
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    finalRes.headers.set('Cache-Control', 'no-store')
    sessionMs = Date.now() - t0
    finalRes.headers.set(
      'Server-Timing',
      `alipay_token;dur=${tokenMs}, alipay_user;dur=${userInfoMs}, session;dur=${sessionMs}, total;dur=${Date.now() - startedAt}`
    )
    return finalRes
  } catch {
    const res = NextResponse.redirect(new URL('/login?error=alipay_login_failed', request.url))
    res.headers.set('Server-Timing', `total;dur=${Date.now() - startedAt}`)
    res.headers.set('Cache-Control', 'no-store')
    bumpFailureCookie(request, res)
    return res
  }
}
