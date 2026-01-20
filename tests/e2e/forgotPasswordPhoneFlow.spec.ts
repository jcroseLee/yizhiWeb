import { expect, test } from '@playwright/test'

test('phone reset password flow', async ({ page }) => {
  await page.route('**/api/sms/send-code', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: '验证码已发送' }),
    })
  })

  await page.route('**/api/sms/reset-password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, tempPassword: 'TempPass_1234567890' }),
    })
  })

  await page.route('**/auth/v1/**', async (route) => {
    const req = route.request()
    const url = req.url()
    const method = req.method()

    if (url.includes('/token') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'access_token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'refresh_token',
          user: {
            id: 'user-id',
            email: null,
            phone: '+8613800138000',
            user_metadata: {},
            app_metadata: {},
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      })
      return
    }

    if (url.endsWith('/user') && method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-id',
            email: null,
            phone: '+8613800138000',
            user_metadata: {},
            app_metadata: {},
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  await page.goto('/forgot-password')
  await page.getByRole('tab', { name: '手机号找回' }).click()

  await page.getByPlaceholder('请输入手机号').fill('13800138000')
  await page.getByRole('button', { name: '获取验证码' }).click()
  await expect(page.getByRole('button', { name: /s$/ })).toBeDisabled()

  await page.getByPlaceholder('6位验证码').fill('123456')
  await page.getByRole('button', { name: /验证并继续/ }).click()

  await page.waitForURL('**/reset-password')

  await page.getByPlaceholder('至少8位，包含大小写字母和数字').fill('Abcdef12')
  await page.getByPlaceholder('再次输入新密码').fill('Abcdef12')
  await page.getByRole('button', { name: '保存新密码' }).click()

  await expect(page.getByText('密码已重置')).toBeVisible()
})

test('phone reset shows error when code is expired', async ({ page }) => {
  await page.route('**/api/sms/send-code', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: '验证码已发送' }),
    })
  })

  await page.route('**/api/sms/reset-password', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: '验证码已过期，请重新获取' }),
    })
  })

  await page.goto('/forgot-password')
  await page.getByRole('tab', { name: '手机号找回' }).click()

  await page.getByPlaceholder('请输入手机号').fill('13800138000')
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.getByPlaceholder('6位验证码').fill('123456')
  await page.getByRole('button', { name: /验证并继续/ }).click()

  await expect(page.getByText('验证码已过期，请重新获取')).toBeVisible()
})

