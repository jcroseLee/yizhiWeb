import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/supabase-admin', () => {
  return {
    createSupabaseAdmin: vi.fn(),
    findUserByPhone: vi.fn(),
  }
})

import { createSupabaseAdmin, findUserByPhone } from '@/lib/api/supabase-admin'
import { POST } from '@/app/api/sms/reset-password/route'

const buildSupabaseAdminMock = (opts: {
  codeInDb: string
  expiresAtIso: string
  userExists: boolean
  updateUserError?: any
}) => {
  const singleMock = vi.fn().mockResolvedValue({
    data: { code: opts.codeInDb, expires_at: opts.expiresAtIso },
    error: null,
  })
  const eqMock = vi.fn().mockReturnValue({ single: singleMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const deleteEqMock = vi.fn().mockResolvedValue({ error: null })
  const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock, delete: deleteMock })
  const updateUserByIdMock = vi.fn().mockResolvedValue({ error: opts.updateUserError ?? null })

  const admin = {
    from: fromMock,
    auth: {
      admin: {
        updateUserById: updateUserByIdMock,
      },
    },
  }

  ;(createSupabaseAdmin as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin)
  ;(findUserByPhone as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    opts.userExists ? { id: 'uid', user_metadata: { nickname: 'n' } } : null
  )

  return { admin, updateUserByIdMock }
}

describe('/api/sms/reset-password', () => {
  it('returns temp password on valid code', async () => {
    const { updateUserByIdMock } = buildSupabaseAdminMock({
      codeInDb: '123456',
      expiresAtIso: new Date(Date.now() + 60_000).toISOString(),
      userExists: true,
    })

    const request = {
      json: async () => ({ phone: '13800138000', code: '123456' }),
    } as any

    const res = await POST(request)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(typeof body.tempPassword).toBe('string')
    expect(body.tempPassword.length).toBeGreaterThan(10)
    expect(updateUserByIdMock).toHaveBeenCalledTimes(1)
  })

  it('rejects wrong code', async () => {
    buildSupabaseAdminMock({
      codeInDb: '654321',
      expiresAtIso: new Date(Date.now() + 60_000).toISOString(),
      userExists: true,
    })

    const request = {
      json: async () => ({ phone: '13800138000', code: '123456' }),
    } as any

    const res = await POST(request)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('验证码错误')
  })

  it('rejects expired code', async () => {
    buildSupabaseAdminMock({
      codeInDb: '123456',
      expiresAtIso: new Date(Date.now() - 60_000).toISOString(),
      userExists: true,
    })

    const request = {
      json: async () => ({ phone: '13800138000', code: '123456' }),
    } as any

    const res = await POST(request)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('验证码已过期，请重新获取')
  })

  it('rejects when user does not exist', async () => {
    buildSupabaseAdminMock({
      codeInDb: '123456',
      expiresAtIso: new Date(Date.now() + 60_000).toISOString(),
      userExists: false,
    })

    const request = {
      json: async () => ({ phone: '13800138000', code: '123456' }),
    } as any

    const res = await POST(request)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('账号不存在，请检查手机号或使用邮箱找回')
  })
})

