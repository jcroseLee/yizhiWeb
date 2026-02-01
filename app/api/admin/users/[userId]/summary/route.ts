import { getAdminContext, requirePermission } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import dayjs from 'dayjs'
import { NextResponse, type NextRequest } from 'next/server'

const LEVEL_CONFIG = [
  { level: 0, expRequired: 0 },
  { level: 1, expRequired: 1 },
  { level: 2, expRequired: 100 },
  { level: 3, expRequired: 500 },
  { level: 4, expRequired: 2000 },
  { level: 5, expRequired: 5000 },
  { level: 6, expRequired: 10000 },
  { level: 7, expRequired: 20000 },
] as const

const TITLE_CONFIG = [
  { level: 1, name: '白身', reputationRequired: 0 },
  { level: 2, name: '学人', reputationRequired: 50 },
  { level: 3, name: '术士', reputationRequired: 200 },
  { level: 4, name: '方家', reputationRequired: 500 },
  { level: 5, name: '先生', reputationRequired: 1000 },
  { level: 6, name: '国手', reputationRequired: 5000 },
] as const

function calculateLevel(exp: number) {
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_CONFIG[i].expRequired) return LEVEL_CONFIG[i].level
  }
  return 0
}

function calculateTitleLevel(reputation: number) {
  for (let i = TITLE_CONFIG.length - 1; i >= 0; i--) {
    if (reputation >= TITLE_CONFIG[i].reputationRequired) return TITLE_CONFIG[i].level
  }
  return 1
}

function getTitleName(titleLevel: number) {
  const title = TITLE_CONFIG.find((t) => t.level === titleLevel)
  return title?.name || '白身'
}

function isMissingColumnError(error: any, column: string) {
  const msg = typeof error?.message === 'string' ? error.message : ''
  const details = typeof error?.details === 'string' ? error.details : ''
  const hay = `${msg} ${details}`.toLowerCase()
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    hay.includes(`'${column.toLowerCase()}'`) ||
    hay.includes(`"${column.toLowerCase()}"`) ||
    hay.includes(`profiles.${column.toLowerCase()}`)
  )
}

function isMissingTableError(error: any) {
  const msg = typeof error?.message === 'string' ? error.message : ''
  const details = typeof error?.details === 'string' ? error.details : ''
  const hay = `${msg} ${details}`.toLowerCase()
  return error?.code === '42p01' || hay.includes('does not exist') || (hay.includes('relation') && hay.includes('does not exist'))
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { headers: { ...corsHeaders }, status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const ctx = await getAdminContext(token)
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { headers: { ...corsHeaders }, status: ctx.status })
    }

    requirePermission(ctx, '/users')

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { headers: { ...corsHeaders }, status: 400 })
    }

    // 1. Basic Info
    const { data: profile, error: profileError } = await ctx.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { headers: { ...corsHeaders }, status: 500 })
    }

    const exp = Number(profile.exp || 0)
    const reputation = Number(profile.reputation || 0)
    const titleLevel = profile.title_level ?? calculateTitleLevel(reputation)
    const level = calculateLevel(exp)
    const titleName = getTitleName(titleLevel)

    // 2. Parallel Fetching for Stats and Lists
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString()

    const [
      followersRes,
      followingRes,
      postsCountRes,
      closedCasesRes,
      postLikesRes,
      commentLikesRes,
      coinBatchesRes,
      activityPostsRes,
      activityCommentsRes
    ] = await Promise.all([
      // Counts
      ctx.supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      ctx.supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      ctx.supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      
      // Closed Cases: count case_metadata entries for this user's posts
      // Using explicit foreign key or standard join logic
      ctx.supabase.from('case_metadata').select('post_id, posts!inner(user_id)', { count: 'exact', head: true }).eq('posts.user_id', userId),

      // Likes
      ctx.supabase.from('post_likes').select('post_id, posts!inner(user_id)', { count: 'exact', head: true }).eq('posts.user_id', userId),
      ctx.supabase.from('comment_likes').select('comment_id, comments!inner(user_id)', { count: 'exact', head: true }).eq('comments.user_id', userId),

      // Coin Expiry
      ctx.supabase.from('coin_free_batches').select('expire_at').eq('user_id', userId).eq('is_depleted', false).order('expire_at', { ascending: true }).limit(1),

      // Activity Data (Last 30 days) - minimal fetch
      ctx.supabase.from('posts').select('created_at').eq('user_id', userId).gt('created_at', thirtyDaysAgo),
      ctx.supabase.from('comments').select('created_at').eq('user_id', userId).gt('created_at', thirtyDaysAgo)
    ])

    // Process Stats
    const stats = {
      followersCount: followersRes.count || 0,
      followingCount: followingRes.count || 0,
      postsCount: postsCountRes.count || 0,
      closedCasesCount: closedCasesRes.count || 0,
      likedCount: (postLikesRes.count || 0) + (commentLikesRes.count || 0),
    }

    // Process Coin Expiry
    const giftCoinExpiry = coinBatchesRes.data?.[0]?.expire_at || null

    // Process Activity Data
    const activityMap: Record<string, number> = {}
    const today = dayjs()
    for (let i = 0; i < 30; i++) {
      activityMap[today.subtract(i, 'day').format('YYYY-MM-DD')] = 0
    }

    const processActivity = (items: any[] | null) => {
      items?.forEach(item => {
        const date = dayjs(item.created_at).format('YYYY-MM-DD')
        if (activityMap[date] !== undefined) {
          activityMap[date]++
        }
      })
    }
    processActivity(activityPostsRes.data)
    processActivity(activityCommentsRes.data)

    const activityData = Object.entries(activityMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())

    return NextResponse.json({
      user: {
        ...profile,
        level,
        title_level: titleLevel,
        title_name: titleName,
      },
      stats,
      giftCoinExpiry,
      // transactions: transactionsRes.data || [], // REMOVED
      // posts: postsRes.data || [], // REMOVED
      // comments: commentsRes.data || [], // REMOVED
      // gifts: giftsRes.data || [], // REMOVED
      activityData
    }, { headers: { ...corsHeaders }, status: 200 })

  } catch (e: any) {
    console.error('Error in user summary:', e)
    const status = e.status || 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status }
    )
  }
}
