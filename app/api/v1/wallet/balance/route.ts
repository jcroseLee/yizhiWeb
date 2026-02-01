import { getWalletBalance } from '@/lib/services/wallet'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * @swagger
 * /api/v1/wallet/balance:
 *   get:
 *     summary: GET /api/v1/wallet/balance
 *     description: Auto-generated description for GET /api/v1/wallet/balance
 *     tags:
 *       - V1
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  let {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (token) {
      const { data: headerAuthData, error: headerAuthError } = await supabase.auth.getUser(token)
      if (!headerAuthError && headerAuthData.user) {
        user = headerAuthData.user
        authError = null
      } else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const adminForAuth = createAdminClient()
          const { data: adminAuthData, error: adminAuthError } = await adminForAuth.auth.getUser(token)
          if (!adminAuthError && adminAuthData.user) {
            user = adminAuthData.user
            authError = null
          }
        } catch {}
      }
    }
  }

  if (authError || !user) {
    const debug =
      process.env.NODE_ENV !== 'production'
        ? {
            hasAuthHeader: Boolean(request.headers.get('authorization') || request.headers.get('Authorization')),
            hasCookieHeader: Boolean(request.headers.get('cookie')),
            authError: authError?.message || null,
          }
        : null

    return NextResponse.json({ error: 'Unauthorized', ...(debug ? { debug } : {}) }, { status: 401 })
  }

  const balance = await getWalletBalance(user.id, supabase)
  
  if (!balance) {
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
  }

  return NextResponse.json(balance)
}
