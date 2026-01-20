import { getTransactions } from '@/lib/services/wallet'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as 'PAID' | 'FREE' | undefined
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  const transactions = await getTransactions(user.id, type, limit, offset, supabase)

  return NextResponse.json(transactions)
}
