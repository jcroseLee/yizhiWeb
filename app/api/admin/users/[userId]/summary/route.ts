import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
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
  return error?.code === '42p01' || hay.includes('does not exist') || hay.includes('relation') && hay.includes('does not exist')
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

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { headers: { ...corsHeaders }, status: 400 })
    }

    let exp = 0
    let reputation = 0
    let titleLevel: number | null = null

    const { data: growthRow, error: growthError } = await ctx.supabase
      .from('profiles')
      .select('exp, reputation, title_level')
      .eq('id', userId)
      .maybeSingle()

    if (growthError) {
      const allow =
        isMissingColumnError(growthError, 'exp') ||
        isMissingColumnError(growthError, 'reputation') ||
        isMissingColumnError(growthError, 'title_level')
      if (!allow) {
        return NextResponse.json({ error: growthError.message }, { headers: { ...corsHeaders }, status: 500 })
      }
    } else if (growthRow) {
      exp = Number(growthRow.exp || 0)
      reputation = Number(growthRow.reputation || 0)
      titleLevel = growthRow.title_level ?? null
    }

    const level = calculateLevel(exp)
    const resolvedTitleLevel = titleLevel ?? calculateTitleLevel(reputation)
    const titleName = getTitleName(resolvedTitleLevel)

    const [postsCountRes, divinationCountRes, followingCountRes, followersCountRes] = await Promise.all([
      ctx.supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ctx.supabase.from('divination_records').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ctx.supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      ctx.supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    ])

    const postsCount = postsCountRes.error
      ? isMissingTableError(postsCountRes.error)
        ? 0
        : null
      : postsCountRes.count || 0
    const divinationRecordsCount = divinationCountRes.error
      ? isMissingTableError(divinationCountRes.error)
        ? 0
        : null
      : divinationCountRes.count || 0
    const followingCount = followingCountRes.error
      ? isMissingTableError(followingCountRes.error)
        ? 0
        : null
      : followingCountRes.count || 0
    const followersCount = followersCountRes.error
      ? isMissingTableError(followersCountRes.error)
        ? 0
        : null
      : followersCountRes.count || 0

    const countErrors = [
      postsCountRes.error && !isMissingTableError(postsCountRes.error) ? postsCountRes.error.message : null,
      divinationCountRes.error && !isMissingTableError(divinationCountRes.error) ? divinationCountRes.error.message : null,
      followingCountRes.error && !isMissingTableError(followingCountRes.error) ? followingCountRes.error.message : null,
      followersCountRes.error && !isMissingTableError(followersCountRes.error) ? followersCountRes.error.message : null,
    ].filter(Boolean)

    if (countErrors.length > 0) {
      return NextResponse.json({ error: countErrors[0] }, { headers: { ...corsHeaders }, status: 500 })
    }

    return NextResponse.json(
      {
        user_id: userId,
        growth: {
          level,
          exp,
          reputation,
          title_level: resolvedTitleLevel,
          title_name: titleName,
        },
        counts: {
          posts: postsCount,
          divination_records: divinationRecordsCount,
          following: followingCount,
          followers: followersCount,
        },
      },
      { headers: { ...corsHeaders }, status: 200 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}

