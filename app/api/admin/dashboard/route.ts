import { corsHeaders } from '@/lib/api/cors'
import { getAdminContext } from '@/lib/api/admin-auth'
import { NextResponse, type NextRequest } from 'next/server'

function startOfDayISO(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateKey(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function GET(req: NextRequest) {
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

    const now = new Date()
    const todayStart = startOfDayISO(now)
    const weekStart = startOfDayISO(addDays(now, -7))
    const trendStart = startOfDayISO(addDays(now, -29))

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      totalPosts,
      newPostsToday,
      newPostsWeek,
      pendingReports,
      newCasesToday,
      trendPosts,
    ] = await Promise.all([
      ctx.supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ctx.supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      ctx.supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
      ctx.supabase.from('posts').select('*', { count: 'exact', head: true }),
      ctx.supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      ctx.supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
      ctx.supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ctx.supabase.from('case_metadata').select('*', { count: 'exact', head: true }).gte('archived_at', todayStart),
      ctx.supabase.from('posts').select('created_at, user_id').gte('created_at', trendStart).limit(50000),
    ])

    const responses = [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      totalPosts,
      newPostsToday,
      newPostsWeek,
      pendingReports,
      newCasesToday,
      trendPosts,
    ]
    for (const r of responses) {
      if ((r as any).error) {
        return NextResponse.json({ error: (r as any).error.message }, { headers: { ...corsHeaders }, status: 500 })
      }
    }

    const dayKeys: string[] = []
    for (let i = 0; i < 30; i++) {
      dayKeys.push(toDateKey(addDays(new Date(trendStart), i).toISOString()))
    }

    const postCountByDay = new Map<string, number>()
    const activeUsersByDay = new Map<string, Set<string>>()

    for (const key of dayKeys) {
      postCountByDay.set(key, 0)
      activeUsersByDay.set(key, new Set())
    }

    const rows = (trendPosts.data || []) as Array<{ created_at: string; user_id: string | null }>
    for (const row of rows) {
      if (!row.created_at) continue
      const key = toDateKey(row.created_at)
      if (!postCountByDay.has(key)) continue
      postCountByDay.set(key, (postCountByDay.get(key) || 0) + 1)
      if (row.user_id) activeUsersByDay.get(key)?.add(row.user_id)
    }

    const trend = dayKeys.map((date) => ({
      date,
      posts: postCountByDay.get(date) || 0,
      active_users: activeUsersByDay.get(date)?.size || 0,
    }))

    return NextResponse.json(
      {
        metrics: {
          total_users: totalUsers.count || 0,
          new_users_today: newUsersToday.count || 0,
          new_users_week: newUsersWeek.count || 0,
          total_posts: totalPosts.count || 0,
          new_posts_today: newPostsToday.count || 0,
          new_posts_week: newPostsWeek.count || 0,
          new_cases_today: newCasesToday.count || 0,
          pending_reports: pendingReports.count || 0,
        },
        trend,
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

