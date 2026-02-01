import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/get-users:
 *   get:
 *     summary: GET /api/get-users
 *     description: Auto-generated description for GET /api/get-users
 *     tags:
 *       - Get-users
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  console.log('get-users function invoked.')

  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // Check if user is admin
    let profile: any = null
    const { data: profileWithLevel, error: profileWithLevelError } = await supabaseAdmin
      .from('profiles')
      .select('role, admin_level')
      .eq('id', user.id)
      .single()
    if (profileWithLevelError && (profileWithLevelError.message?.includes('admin_level') || profileWithLevelError.message?.includes('does not exist'))) {
      const { data: profileOnlyRole } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
      profile = profileOnlyRole
    } else {
      profile = profileWithLevel
    }

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // Get all profiles
    // Try to select with wechat_openid first, fallback if column doesn't exist
    let profiles: any[] = []
    let profilesError: any = null

    const { data: profilesWithDetails, error: errorWithDetails } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, avatar_url, role, admin_level, is_verified, is_banned, banned_until, ban_reason, wechat_openid, created_at')
      .order('created_at', { ascending: false })

    if (
      errorWithDetails &&
      (errorWithDetails.message?.includes('does not exist') ||
        errorWithDetails.message?.includes('wechat_openid') ||
        errorWithDetails.message?.includes('admin_level') ||
        errorWithDetails.message?.includes('is_verified') ||
        errorWithDetails.message?.includes('banned_until') ||
        errorWithDetails.message?.includes('ban_reason'))
    ) {
      const { data: profilesFallback, error: errorFallback } = await supabaseAdmin
        .from('profiles')
        .select('id, nickname, avatar_url, role, created_at')
        .order('created_at', { ascending: false })

      if (errorFallback) {
        profilesError = errorFallback
      } else {
        profiles = (profilesFallback || []).map((p: any) => ({
          ...p,
          wechat_openid: null,
          admin_level: null,
          is_verified: false,
          is_banned: false,
          banned_until: null,
          ban_reason: null,
        }))
      }
    } else if (errorWithDetails) {
      profilesError = errorWithDetails
    } else {
      profiles = profilesWithDetails || []
    }

    if (profilesError) {
      throw profilesError
    }

    // Get user details from auth.users for each profile
    const usersWithDetails = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          const { data: authUserData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)

          if (userError || !authUserData || !authUserData.user) {
            return {
              id: profile.id,
              email: null,
              phone: null,
              nickname: profile.nickname,
              avatar_url: profile.avatar_url,
              role: profile.role || 'user',
              wechat_openid: profile.wechat_openid,
              login_type: 'unknown',
              created_at: profile.created_at,
            }
          }

          const authUser = authUserData.user

          // Determine login type based on email format
          const email = authUser.email || ''
          const isWechatUser = email.endsWith('@wechat.user')
          const loginType = isWechatUser ? 'wechat' : 'email'

          return {
            id: profile.id,
            email: email || null,
            phone: authUser.phone || authUser.user_metadata?.phone || null,
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            role: profile.role || 'user',
            admin_level: profile.admin_level || null,
            is_verified: Boolean(profile.is_verified),
            is_banned: Boolean(profile.is_banned),
            banned_until: profile.banned_until || null,
            ban_reason: profile.ban_reason || null,
            wechat_openid: profile.wechat_openid,
            login_type: loginType,
            created_at: profile.created_at,
          }
        } catch (error) {
          console.error(`Error fetching user ${profile.id}:`, error)
          return {
            id: profile.id,
            email: null,
            phone: null,
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            role: profile.role || 'user',
            admin_level: profile.admin_level || null,
            is_verified: Boolean(profile.is_verified),
            is_banned: Boolean(profile.is_banned),
            banned_until: profile.banned_until || null,
            ban_reason: profile.ban_reason || null,
            wechat_openid: profile.wechat_openid,
            login_type: 'unknown',
            created_at: profile.created_at,
          }
        }
      })
    )

    return NextResponse.json({ users: usersWithDetails }, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Unhandled error in get-users function:', error)
    return NextResponse.json({ error: error.message }, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}
