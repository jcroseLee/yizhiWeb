import { corsHeaders } from '@/lib/api/cors'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const orderDirection = searchParams.get('orderDirection') || 'desc'
    const followed = searchParams.get('followed') === 'true'

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Handle followed logic
    let followedUserIds: string[] = []
    if (followed) {
      if (!user) {
        return NextResponse.json([], { status: 200, headers: corsHeaders })
      }
      
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        
      if (!follows || follows.length === 0) {
        return NextResponse.json([], { status: 200, headers: corsHeaders })
      }
      
      followedUserIds = follows.map(f => f.following_id)
    }

    // 2. Build query
    let query = supabase
      .from('posts')
      .select(`
        *,
        divination_records (
          id,
          original_key,
          changed_key,
          lines,
          changing_flags,
          method,
          original_json
        )
      `)
      .in('status', ['published', 'hidden', 'archived'])
      .order('sticky_until', { ascending: false, nullsFirst: false })
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('type', type)
    }

    if (followed) {
      query = query.in('user_id', followedUserIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
    }

    if (!data || data.length === 0) {
      return NextResponse.json([], { status: 200, headers: corsHeaders })
    }

    // 3. Fetch profiles
    const userIds = [...new Set(data.map((post) => post.user_id).filter(Boolean))]
    const profilesMap = new Map<string, any>()
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds)

      if (profiles) {
        profiles.forEach((profile) => {
          profilesMap.set(profile.id, profile)
        })
      }
    }

    // 4. Fetch likes and favorites
    let likedPostIds: string[] = []
    let favoritedPostIds: string[] = []
    
    if (user) {
      const postIds = data.map(p => p.id)
      
      const [likesResult, favoritesResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds),
        supabase
          .from('post_favorites')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds)
      ])

      likedPostIds = likesResult.data?.map(l => l.post_id) || []
      favoritedPostIds = favoritesResult.data?.map(f => f.post_id) || []
    }

    // 5. Format response
    const formatted = data.map((post) => {
      let divinationRecord = null
      if (post.divination_records) {
        if (Array.isArray(post.divination_records)) {
          divinationRecord = post.divination_records.length > 0 ? post.divination_records[0] : null
        } else {
          divinationRecord = post.divination_records
        }
      }

      return {
        ...post,
        author: profilesMap.get(post.user_id) || null,
        is_liked: likedPostIds.includes(post.id),
        is_favorited: favoritedPostIds.includes(post.id),
        divination_record: divinationRecord,
      }
    })
    
    const now = Date.now()
    const getOrderValue = (p: any) => {
      if (orderBy === 'created_at') return new Date(p.created_at).getTime()
      return Number(p[orderBy] ?? 0)
    }

    const dir = orderDirection === 'asc' ? 1 : -1
    formatted.sort((a: any, b: any) => {
      const aSticky = a.sticky_until ? new Date(a.sticky_until).getTime() > now : false
      const bSticky = b.sticky_until ? new Date(b.sticky_until).getTime() > now : false
      if (aSticky !== bSticky) return aSticky ? -1 : 1

      const av = getOrderValue(a)
      const bv = getOrderValue(b)
      if (av !== bv) return av > bv ? dir : -dir

      const at = new Date(a.created_at).getTime()
      const bt = new Date(b.created_at).getTime()
      if (at !== bt) return at > bt ? -1 : 1
      return String(a.id).localeCompare(String(b.id))
    })

    return NextResponse.json(formatted, { status: 200, headers: corsHeaders })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}

/**
 * @swagger
 * /api/community/posts:
 *   post:
 *     summary: POST /api/community/posts
 *     description: Auto-generated description for POST /api/community/posts
 *     tags:
 *       - Community
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '请先登录后再操作' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({} as any))
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const content = typeof body?.content === 'string' ? body.content : ''
    const contentHtml = typeof body?.content_html === 'string' ? body.content_html : undefined
    const type = typeof body?.type === 'string' ? body.type : undefined
    const bounty = typeof body?.bounty === 'number' ? body.bounty : undefined
    const divinationRecordId = typeof body?.divination_record_id === 'string' ? body.divination_record_id : undefined
    const coverImageUrl = typeof body?.cover_image_url === 'string' ? body.cover_image_url : undefined
    const method = typeof body?.method === 'string' ? body.method : undefined
    const status = typeof body?.status === 'string' ? body.status : undefined
    const isUrgent = typeof body?.is_urgent === 'boolean' ? body.is_urgent : false

    if (!title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400, headers: corsHeaders })
    }

    if (!content.trim()) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400, headers: corsHeaders })
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title,
        content,
        content_html: contentHtml ?? content,
        type: type ?? 'theory',
        bounty: bounty ?? 0,
        divination_record_id: divinationRecordId ?? null,
        cover_image_url: coverImageUrl ?? null,
        method: method ?? null,
        status: status ?? undefined,
        is_urgent: isUrgent,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message || '发布失败' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ post: data }, { status: 200, headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '系统错误，请稍后重试' }, { status: 500, headers: corsHeaders })
  }
}
