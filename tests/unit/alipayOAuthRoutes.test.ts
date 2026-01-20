import { describe, expect, it, vi } from 'vitest'

import { GET as startGET } from '@/app/api/auth/alipay/start/route'
import { GET as callbackGET } from '@/app/api/auth/alipay/callback/route'

describe('Alipay OAuth routes', () => {
  it('start route redirects to Alipay and sets state cookie', async () => {
    vi.stubEnv('ALIPAY_APP_ID', '2025010100000000')
    vi.stubEnv('NODE_ENV', 'development')

    const request = {
      url: 'https://example.com/api/auth/alipay/start?redirect=%2Fprofile',
      nextUrl: new URL('https://example.com/api/auth/alipay/start?redirect=%2Fprofile'),
      cookies: {
        get: () => undefined,
      },
      headers: new Headers({ 'user-agent': 'ua-test' }),
    } as any

    const res = await startGET(request)
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)

    const location = res.headers.get('location')
    expect(location).toContain('https://openauth.alipay.com/oauth2/publicAppAuthorize.htm')
    expect(location).toContain('app_id=2025010100000000')
    expect(location).toContain('scope=auth_user')
    expect(location).toContain('state=')

    const cookie = res.cookies.get('yi_alipay_oauth_state_v1')
    expect(cookie?.value).toBeTruthy()
  })

  it('callback route rejects when state is missing or mismatched', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const requestMissing = {
      url: 'https://example.com/api/auth/alipay/callback',
      nextUrl: new URL('https://example.com/api/auth/alipay/callback'),
      cookies: {
        get: () => undefined,
      },
      headers: new Headers({ 'user-agent': 'ua-test' }),
    } as any

    const resMissing = await callbackGET(requestMissing)
    expect(resMissing.status).toBeGreaterThanOrEqual(300)
    expect(resMissing.status).toBeLessThan(400)
    expect(resMissing.headers.get('location')).toContain('/login?error=alipay_invalid_callback')

    const requestMismatch = {
      url: 'https://example.com/api/auth/alipay/callback?auth_code=x&state=abc',
      nextUrl: new URL('https://example.com/api/auth/alipay/callback?auth_code=x&state=abc'),
      cookies: {
        get: (name: string) => {
          if (name !== 'yi_alipay_oauth_state_v1') return undefined
          return { value: JSON.stringify({ state: 'zzz', redirectPath: '/', createdAt: Date.now() }) }
        },
      },
      headers: new Headers({ 'user-agent': 'ua-test' }),
    } as any

    const resMismatch = await callbackGET(requestMismatch)
    expect(resMismatch.status).toBeGreaterThanOrEqual(300)
    expect(resMismatch.status).toBeLessThan(400)
    expect(resMismatch.headers.get('location')).toContain('/login?error=alipay_csrf')
  })
})

