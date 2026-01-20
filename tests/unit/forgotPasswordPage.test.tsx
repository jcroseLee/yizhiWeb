import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/components/Galaxy', () => ({
  default: () => <div data-testid="galaxy" />,
}))

vi.mock('@/lib/analytics', () => ({
  hashUserId: async () => 'hash',
  trackEvent: vi.fn(),
}))

const signInWithPasswordMock = vi.fn()
vi.mock('@/lib/services/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      resetPasswordForEmail: vi.fn(),
    },
  }),
}))

import ForgotPasswordPage from '@/app/forgot-password/page'

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    pushMock.mockReset()
    signInWithPasswordMock.mockReset()
    ;(globalThis.fetch as any) = vi.fn()
  })

  it('switches to phone tab and completes verification flow', async () => {
    const user = userEvent.setup()
    ;(globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, tempPassword: 'temp-pass' }),
      })

    signInWithPasswordMock.mockResolvedValue({ data: { user: {}, session: {} }, error: null })

    render(<ForgotPasswordPage />)

    await user.click(screen.getByRole('tab', { name: '手机号找回' }))

    await user.type(screen.getByPlaceholderText('请输入手机号'), '13800138000')
    await user.click(screen.getByRole('button', { name: '获取验证码' }))

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/sms/send-code',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    expect(screen.getByRole('button', { name: '60s' })).toBeDisabled()

    await user.type(screen.getByPlaceholderText('6位验证码'), '123456')
    await user.click(screen.getByRole('button', { name: /验证并继续/ }))

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/sms/reset-password',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/reset-password')
    })
  })

  it('shows error for invalid code input', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.click(screen.getByRole('tab', { name: '手机号找回' }))
    await user.type(screen.getByPlaceholderText('请输入手机号'), '13800138000')
    await user.type(screen.getByPlaceholderText('6位验证码'), '123')
    await user.click(screen.getByRole('button', { name: /验证并继续/ }))

    expect(await screen.findByText('请输入6位验证码')).toBeInTheDocument()
  })
})
