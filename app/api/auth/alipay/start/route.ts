import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

const STATE_COOKIE = 'yi_alipay_oauth_state_v1'
const FAIL_COOKIE = 'yi_alipay_oauth_fail_v1'
const STATE_TTL_MS = 10 * 60 * 1000
const FAIL_WINDOW_MS = 10 * 60 * 1000
const FAIL_MAX_COUNT = 5

function getBaseUrl(request: NextRequest) {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  const fallback = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const raw = (env || fallback).trim()
  return raw.replace(/\/+$/, '')
}

function sanitizeRedirectPath(raw: string | null) {
  if (!raw) return '/'
  const value = raw.trim()
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//')) return '/'
  if (value.includes('\\')) return '/'
  return value
}

function readJsonCookie<T>(request: NextRequest, name: string): T | null {
  const raw = request.cookies.get(name)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function randomState() {
  return crypto.randomBytes(24).toString('base64url')
}

function sha256Base64Url(input: string) {
  return crypto.createHash('sha256').update(input).digest('base64url')
}

function getAuthorizeBaseUrl() {
  const raw = process.env.ALIPAY_AUTHORIZE_BASE_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  const env = (process.env.ALIPAY_ENV || '').trim().toLowerCase()
  if (env === 'sandbox') return 'https://openauth.alipaydev.com'
  return 'https://openauth.alipay.com'
}

export async function GET(request: NextRequest) {
  const appId = process.env.ALIPAY_APP_ID?.trim()
  if (!appId) {
    return NextResponse.redirect(new URL('/login?error=alipay_not_configured', request.url))
  }

  const baseUrl = getBaseUrl(request)
  if (process.env.NODE_ENV === 'production' && !baseUrl.startsWith('https://')) {
    return NextResponse.redirect(new URL('/login?error=insecure_base_url', request.url))
  }

  const fail = readJsonCookie<{ count: number; firstAt: number }>(request, FAIL_COOKIE)
  if (fail && typeof fail.count === 'number' && typeof fail.firstAt === 'number') {
    const withinWindow = Date.now() - fail.firstAt < FAIL_WINDOW_MS
    if (withinWindow && fail.count >= FAIL_MAX_COUNT) {
      return NextResponse.redirect(new URL('/login?error=too_many_attempts', request.url))
    }
  }

  const redirectPath = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirect'))
  const state = randomState()
  const createdAt = Date.now()
  const userAgent = request.headers.get('user-agent') || ''
  const uaHash = sha256Base64Url(userAgent)
  const payload = JSON.stringify({ state, redirectPath, createdAt, uaHash })

  const callbackUrl = `${baseUrl}/api/auth/alipay/callback`
  const authorizeUrl = new URL(`${getAuthorizeBaseUrl()}/oauth2/publicAppAuthorize.htm`)
  authorizeUrl.searchParams.set('app_id', appId)
  authorizeUrl.searchParams.set('scope', 'auth_user')
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl)
  authorizeUrl.searchParams.set('state', state)

  const res = NextResponse.redirect(authorizeUrl)
  res.headers.set('Cache-Control', 'no-store')
  res.cookies.set({
    name: STATE_COOKIE,
    value: payload,
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.ceil(STATE_TTL_MS / 1000),
  })
  return res
}
