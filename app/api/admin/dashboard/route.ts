import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
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

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: GET /api/admin/dashboard
 *     description: Auto-generated description for GET /api/admin/dashboard
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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

    // requirePermission(ctx, '/dashboard') // Dashboard is accessible to all admins

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
      pendingWikiRevisions,
      newCasesToday,
      trendPosts,
      trendComments,
      analytics,
    ] = await Promise.all([
      ctx.supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ctx.supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      ctx.supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
      ctx.supabase.from('posts').select('*', { count: 'exact', head: true }),
      ctx.supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      ctx.supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
      ctx.supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ctx.supabase.from('wiki_revisions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ctx.supabase.from('case_metadata').select('*', { count: 'exact', head: true }).gte('archived_at', todayStart),
      ctx.supabase.from('posts').select('created_at, user_id').gte('created_at', trendStart).limit(50000),
      ctx.supabase.from('comments').select('created_at, user_id').gte('created_at', trendStart).limit(50000),
      ctx.supabase.rpc('cms_analytics_dashboard', { days: 7 }),
    ])

    const responses = [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      totalPosts,
      newPostsToday,
      newPostsWeek,
      pendingReports,
      pendingWikiRevisions,
      newCasesToday,
      trendPosts,
      trendComments,
      analytics,
    ]
    for (const r of responses) {
      if ((r as any).error) {
        const error = (r as any).error
        if (r === analytics) break
        return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status: 500 })
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

    const postRows = (trendPosts.data || []) as Array<{ created_at: string; user_id: string | null }>
    const commentRows = (trendComments.data || []) as Array<{ created_at: string; user_id: string | null }>
    
    // Process posts for trend and activity
    const userActivity = new Map<string, { posts: number; comments: number }>();

    for (const row of postRows) {
      if (row.user_id) {
          const current = userActivity.get(row.user_id) || { posts: 0, comments: 0 };
          current.posts++;
          userActivity.set(row.user_id, current);
      }

      if (!row.created_at) continue
      const key = toDateKey(row.created_at)
      if (!postCountByDay.has(key)) continue
      postCountByDay.set(key, (postCountByDay.get(key) || 0) + 1)
      if (row.user_id) activeUsersByDay.get(key)?.add(row.user_id)
    }

    // Process comments for activity
    for (const row of commentRows) {
        if (row.user_id) {
            const current = userActivity.get(row.user_id) || { posts: 0, comments: 0 };
            current.comments++;
            userActivity.set(row.user_id, current);
        }
    }

    const trend = dayKeys.map((date) => ({
      date,
      posts: postCountByDay.get(date) || 0,
      active_users: activeUsersByDay.get(date)?.size || 0,
    }))

    // Calculate Top 50 Active Users
    const sortedUsers = Array.from(userActivity.entries())
        .map(([id, counts]) => ({ id, ...counts, total: counts.posts + counts.comments }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 50);

    let active_users: any[] = [];
    if (sortedUsers.length > 0) {
        const { data: profiles } = await ctx.supabase
            .from('profiles')
            .select('id, nickname, avatar_url')
            .in('id', sortedUsers.map(u => u.id));
        
        if (profiles) {
            const profileMap = new Map(profiles.map(p => [p.id, p]));
            active_users = sortedUsers.map(u => {
                const p = profileMap.get(u.id);
                return {
                    id: u.id,
                    nickname: p?.nickname || 'Unknown',
                    avatar_url: p?.avatar_url,
                    post_count: u.posts,
                    comment_count: u.comments,
                };
            });
        }
    }

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
          pending_wiki_revisions: pendingWikiRevisions.count || 0,
        },
        analytics: (analytics as any).error ? null : (analytics as any).data,
        trend,
        active_users,
      },
      { headers: { ...corsHeaders }, status: 200 }
    )
  } catch (e: any) {
    const status = e.status || 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status }
    )
  }
}
