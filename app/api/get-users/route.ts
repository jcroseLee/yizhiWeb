import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

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
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // Get all profiles
    // Try to select with wechat_openid first, fallback if column doesn't exist
    let profiles: any[] = []
    let profilesError: any = null

    const { data: profilesWithOpenid, error: errorWithOpenid } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, avatar_url, role, wechat_openid, created_at')
      .order('created_at', { ascending: false })

    if (errorWithOpenid && (errorWithOpenid.message?.includes('wechat_openid') || errorWithOpenid.message?.includes('does not exist'))) {
      // Column doesn't exist, select without it
      console.log('wechat_openid column not found, selecting without it:', errorWithOpenid.message)
      const { data: profilesWithoutOpenid, error: errorWithoutOpenid } = await supabaseAdmin
        .from('profiles')
        .select('id, nickname, avatar_url, role, created_at')
        .order('created_at', { ascending: false })

      if (errorWithoutOpenid) {
        profilesError = errorWithoutOpenid
      } else {
        profiles = (profilesWithoutOpenid || []).map((p: any) => ({ ...p, wechat_openid: null }))
      }
    } else if (errorWithOpenid) {
      profilesError = errorWithOpenid
    } else {
      profiles = profilesWithOpenid || []
    }

    if (profilesError) {
      throw profilesError
    }

    // Get user details from auth.users for each profile
    const usersWithDetails = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)

          if (userError || !authUser) {
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

