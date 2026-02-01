import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * @swagger
 * /api/library/cases/{id}:
 *   get:
 *     summary: GET /api/library/cases/{id}
 *     description: Auto-generated description for GET /api/library/cases/{id}
 *     tags:
 *       - Library
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = createSupabaseAdmin()

    const [{ data: base, error: baseError }, { data: post, error: postError }] = await Promise.all([
      supabase.from('case_metadata').select('*').eq('post_id', id).maybeSingle(),
      supabase
        .from('posts')
        .select(
          `
          id,
          user_id,
          title,
          content,
          content_html,
          view_count,
          like_count,
          comment_count,
          created_at,
          divination_record_id
        `
        )
        .eq('id', id)
        .maybeSingle(),
    ])

    if (baseError) {
      console.error('Error fetching case metadata:', baseError)
      if (baseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ error: baseError.message }, { status: 500 })
    }
    if (postError) return NextResponse.json({ error: postError.message }, { status: 500 })
    if (!base) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    // 手动查询作者信息，避免关联查询错误
    let postProfile = null
    if (post.user_id) {
      const { data: author } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .eq('id', post.user_id)
        .maybeSingle()
      postProfile = author
    }

    const postPayload = { ...(post as any), profiles: postProfile }
    const divinationRecordId = (post as any).divination_record_id as string | null

    const [{ data: record }, { data: adopted }, { data: tagsRows }] = await Promise.all([
      divinationRecordId
        ? supabase
            .from('divination_records')
            .select('id, original_key, changed_key, lines, changing_flags, divination_time, method, original_json, changed_json')
            .eq('id', divinationRecordId)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase
        .from('comments')
        .select('id, content, like_count, created_at, user_id')
        .eq('post_id', id)
        .eq('is_adopted', true)
        .maybeSingle(),
      supabase
        .from('post_tags')
        .select('tag_id, tags ( id, name, category, scope )')
        .eq('post_id', id),
    ])

    // 如果有采纳的评论，手动查询评论者信息
    let adoptedPayload = null
    if (adopted) {
      let adoptedAuthor = null
      if (adopted.user_id) {
        const { data: author } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .eq('id', adopted.user_id)
          .maybeSingle()
        adoptedAuthor = author
      }
      adoptedPayload = { ...adopted, profiles: adoptedAuthor }
    }

    const tags = (tagsRows || [])
      .map((row: any) => (Array.isArray(row.tags) ? row.tags[0] : row.tags))
      .filter(Boolean)

    const guaCode = (base as any).gua_original_code as string | null
    const guaName = (base as any).gua_original_name as string | null
    const relatedQuery = guaCode
      ? supabase
          .from('case_metadata')
          .select('post_id, gua_original_name, accuracy_rating, posts ( title, view_count, like_count, comment_count )')
          .eq('gua_original_code', guaCode)
          .neq('post_id', id)
          .order('archived_at', { ascending: false })
          .limit(3)
      : guaName
        ? supabase
            .from('case_metadata')
            .select('post_id, gua_original_name, accuracy_rating, posts ( title, view_count, like_count, comment_count )')
            .ilike('gua_original_name', `%${guaName}%`)
            .neq('post_id', id)
            .order('archived_at', { ascending: false })
            .limit(3)
        : Promise.resolve({ data: [] } as any)

    const { data: related } = await relatedQuery

    return NextResponse.json({
      post: postPayload,
      case_metadata: {
        post_id: (base as any).post_id,
        feedback_content: (base as any).feedback_content,
        accuracy_rating: (base as any).accuracy_rating,
        occurred_at: (base as any).occurred_at,
        gua_original_code: (base as any).gua_original_code,
        gua_changed_code: (base as any).gua_changed_code,
        gua_original_name: (base as any).gua_original_name,
        gua_changed_name: (base as any).gua_changed_name,
        divination_method: (base as any).divination_method,
        is_liu_chong: (base as any).is_liu_chong,
        is_liu_he: (base as any).is_liu_he,
        yong_shen: (base as any).yong_shen,
        archived_at: (base as any).archived_at,
      },
      divination_record: record,
      adopted_comment: adoptedPayload,
      tags,
      related: related || [],
    })
  } catch (e) {
    console.error('Unexpected error in cases/[id] route:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
