import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
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

const updateUserMock = vi.fn()
const getSessionMock = vi.fn()
const signOutMock = vi.fn()

vi.mock('@/lib/services/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      exchangeCodeForSession: vi.fn(),
      setSession: vi.fn(),
      getSession: getSessionMock,
      updateUser: updateUserMock,
      signOut: signOutMock,
    },
  }),
}))

import ResetPasswordPage from '@/app/reset-password/page'

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    pushMock.mockReset()
    updateUserMock.mockReset()
    getSessionMock.mockReset()
    signOutMock.mockReset()

    getSessionMock.mockResolvedValue({
      data: { session: { user: { email: 'test@example.com' } } },
    })
    updateUserMock.mockResolvedValue({ error: null })
    signOutMock.mockResolvedValue({})
  })

  it('validates password complexity and confirmation', async () => {
    const user = userEvent.setup()
    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByText('设置新密码')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('至少8位，包含大小写字母和数字'), 'abcdef12')
    await user.type(screen.getByPlaceholderText('再次输入新密码'), 'abcdef12')
    await user.click(screen.getByRole('button', { name: '保存新密码' }))

    expect(await screen.findByText('密码需包含大写字母')).toBeInTheDocument()
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('updates password when inputs are valid', async () => {
    const user = userEvent.setup()
    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByText('设置新密码')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('至少8位，包含大小写字母和数字'), 'Abcdef12')
    await user.type(screen.getByPlaceholderText('再次输入新密码'), 'Abcdef12')
    await user.click(screen.getByRole('button', { name: '保存新密码' }))

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: 'Abcdef12' })
    })

    await waitFor(() => {
      expect(screen.getByText('密码已重置')).toBeInTheDocument()
    })
  })
})

