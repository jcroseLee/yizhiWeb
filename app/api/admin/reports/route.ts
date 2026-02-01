import { getAdminContext, requirePermission } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: GET /api/admin/reports
 *     description: Auto-generated description for GET /api/admin/reports
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

    requirePermission(ctx, '/reports')

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const status = searchParams.get('status') || 'pending'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // 1. Fetch Reports
    let query = ctx.supabase
      .from('reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: reports, count, error } = await query

    if (error) {
      throw error
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json({ reports: [], total: 0 }, { headers: { ...corsHeaders } })
    }

    // 2. Collect IDs for batch fetching
    const reporterIds = new Set<string>()
    const postIds = new Set<string>()
    const commentIds = new Set<string>()
    const userIds = new Set<string>() // for target_type = 'user'

    reports.forEach((r) => {
      if (r.reporter_id) reporterIds.add(r.reporter_id)
      if (r.target_type === 'post') postIds.add(r.target_id)
      if (r.target_type === 'comment') commentIds.add(r.target_id)
      if (r.target_type === 'user') userIds.add(r.target_id)
    })

    // 3. Batch Fetch Details
    const promises = []

    // Fetch Reporters
    if (reporterIds.size > 0) {
      promises.push(
        ctx.supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .in('id', Array.from(reporterIds))
          .then((res) => ({ type: 'reporters', data: res.data }))
      )
    }

    // Fetch Posts
    if (postIds.size > 0) {
      promises.push(
        ctx.supabase
          .from('posts')
          .select('id, title, content, status')
          .in('id', Array.from(postIds))
          .then((res) => ({ type: 'posts', data: res.data }))
      )
    }

    // Fetch Comments
    if (commentIds.size > 0) {
      promises.push(
        ctx.supabase
          .from('comments')
          .select('id, content, status, post_id')
          .in('id', Array.from(commentIds))
          .then(async (res) => {
            // Also fetch related posts for comments to show context
            const relatedPostIds = new Set(res.data?.map((c) => c.post_id).filter(Boolean))
            let relatedPosts: any[] = []
            if (relatedPostIds.size > 0) {
              const { data } = await ctx.supabase
                .from('posts')
                .select('id, title')
                .in('id', Array.from(relatedPostIds as any))
              relatedPosts = data || []
            }
            return { type: 'comments', data: res.data, relatedPosts }
          })
      )
    }

    // Fetch Users (Targets)
    if (userIds.size > 0) {
      promises.push(
        ctx.supabase
          .from('profiles')
          .select('id, nickname, is_banned, banned_until')
          .in('id', Array.from(userIds))
          .then((res) => ({ type: 'users', data: res.data }))
      )
    }

    const results = await Promise.all(promises)

    // 4. Map results to lookups
    const lookup: any = {
      reporters: {},
      posts: {},
      comments: {},
      users: {},
      commentRelatedPosts: {},
    }

    results.forEach((res: any) => {
      if (res.type === 'reporters') {
        res.data?.forEach((item: any) => (lookup.reporters[item.id] = item))
      } else if (res.type === 'posts') {
        res.data?.forEach((item: any) => (lookup.posts[item.id] = item))
      } else if (res.type === 'comments') {
        res.data?.forEach((item: any) => (lookup.comments[item.id] = item))
        res.relatedPosts?.forEach((item: any) => (lookup.commentRelatedPosts[item.id] = item))
      } else if (res.type === 'users') {
        res.data?.forEach((item: any) => (lookup.users[item.id] = item))
      }
    })

    // 5. Assemble Response
    const enrichedReports = reports.map((r) => {
      const reporter = lookup.reporters[r.reporter_id] || { nickname: '[用户已删除]', avatar_url: null }
      
      let target_content = ''
      let post_title = ''
      let target_status = ''

      // Use snapshot if available (legacy or frozen state), otherwise use live data
      const snapshot = r.target_snapshot
      
      if (r.target_type === 'post') {
        const post = lookup.posts[r.target_id]
        if (post) {
          target_content = `${post.title}\n${post.content}`
          post_title = post.title
          target_status = post.status
        } else if (snapshot?.title) {
           target_content = `${snapshot.title}\n${snapshot.content_html || snapshot.content || ''}`
           post_title = snapshot.title
           target_status = snapshot.status || 'unknown'
        } else {
           post_title = '[帖子已删除]'
           target_content = '内容已无法查看'
        }
      } else if (r.target_type === 'comment') {
        const comment = lookup.comments[r.target_id]
        if (comment) {
          target_content = comment.content
          target_status = comment.status
          if (comment.post_id) {
             const p = lookup.commentRelatedPosts[comment.post_id]
             if (p) post_title = `(评论所属帖子) ${p.title}`
          }
        } else if (snapshot?.content) {
           target_content = snapshot.content
           target_status = snapshot.status || 'unknown'
           if (snapshot.post_id) post_title = `(评论所属帖子) ${snapshot.post_id}`
        } else {
           target_content = '[评论已删除]'
        }
      } else if (r.target_type === 'user') {
        const user = lookup.users[r.target_id]
        if (user) {
          const isBanned = Boolean(user.is_banned) || (user.banned_until ? new Date(user.banned_until).getTime() > Date.now() : false)
          target_content = `用户昵称: ${user.nickname}\n简介: 无`
          target_status = isBanned ? 'banned' : 'active'
        } else if (snapshot?.nickname) {
           target_content = `用户昵称: ${snapshot.nickname}\n简介: ${snapshot.bio || '无'}`
           target_status = snapshot.is_banned ? 'banned' : 'active'
        } else {
           target_content = '[用户已删除]'
        }
      }

      return {
        ...r,
        reporter,
        target_content,
        post_title,
        target_status,
      }
    })

    return NextResponse.json({ reports: enrichedReports, total: count || 0 }, { headers: { ...corsHeaders } })

  } catch (e: any) {
    const status = e.status || 500
    return NextResponse.json({ error: e.message }, { headers: { ...corsHeaders }, status })
  }
}
