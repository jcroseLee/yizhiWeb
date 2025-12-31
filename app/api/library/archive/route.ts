import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { getHexagramResult } from '@/lib/constants/hexagrams'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY
const baseURL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '') + '/v1'

const deepseek = createOpenAI({
  apiKey: apiKey || 'dummy-key',
  baseURL,
  fetch: async (url, options) => {
    let finalUrl = url.toString()
    if (finalUrl.includes('/responses')) finalUrl = finalUrl.replace('/responses', '/chat/completions')
    return fetch(finalUrl, options)
  },
})

function normalizeKey(key: unknown) {
  const raw = String(key || '').replace(/[^01]/g, '')
  if (!raw) return null
  return raw.padStart(6, '0').slice(0, 6)
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
  } catch {}

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1)
    try {
      const parsed = JSON.parse(slice)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {}
  }
  return null
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const supabase = createSupabaseAdmin()

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = authData.user.id

    const body = await req.json().catch(() => null)
    const postId = body?.post_id as string | undefined
    const feedback = body?.feedback as string | undefined
    const accuracy = body?.accuracy as 'accurate' | 'inaccurate' | 'partial' | undefined
    const occurredAt = body?.occurred_at as string | undefined

    if (!postId) return NextResponse.json({ error: 'post_id is required' }, { status: 400 })
    if (!feedback || !feedback.trim()) return NextResponse.json({ error: 'feedback is required' }, { status: 400 })
    if (accuracy && !['accurate', 'inaccurate', 'partial'].includes(accuracy)) {
      return NextResponse.json({ error: 'accuracy is invalid' }, { status: 400 })
    }

    const [{ data: post, error: postError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from('posts').select('id, user_id, status, divination_record_id, title, content, content_html').eq('id', postId).single(),
      supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    ])

    if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

    const isAdmin = profile?.role === 'admin'
    const isAuthor = post.user_id === userId
    if (!isAuthor && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let divinationMethod: number | null = null
    let originalKey: string | null = null
    let changedKey: string | null = null
    let recordPayload: Record<string, unknown> | null = null
    if (post.divination_record_id) {
      const { data: record } = await supabase
        .from('divination_records')
        .select('original_key, changed_key, method, original_json, changed_json, lines, changing_flags, divination_time')
        .eq('id', post.divination_record_id)
        .maybeSingle()

      originalKey = normalizeKey(record?.original_key)
      changedKey = normalizeKey(record?.changed_key)
      divinationMethod = typeof record?.method === 'number' ? record.method : null
      recordPayload = record && typeof record === 'object' ? (record as Record<string, unknown>) : null
    }

    const originalName = originalKey ? getHexagramResult(originalKey)?.name || null : null
    const changedName = changedKey ? getHexagramResult(changedKey)?.name || null : null

    // -------------------------------------------------------------------------
    // SNAPSHOT CREATION (快照创建)
    // -------------------------------------------------------------------------
    // The case_metadata table acts as a SNAPSHOT of the divination record at the
    // time of archiving (closing the case).
    //
    // We intentionally duplicate fields like gua_original_code, gua_name, etc.,
    // from the divination_records table. This redundancy is by design to ensure
    // data consistency for the case library. Even if the user later modifies
    // the original divination record (e.g., in their personal history), this
    // case metadata will REMAIN UNCHANGED, preserving the state of the deduction
    // as it was when the case was concluded.
    // -------------------------------------------------------------------------
    const { error: upsertError } = await supabase.from('case_metadata').upsert(
      {
        post_id: postId,
        feedback_content: feedback.trim(),
        accuracy_rating: accuracy || null,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
        gua_original_code: originalKey,
        gua_changed_code: changedKey,
        gua_original_name: originalName,
        gua_changed_name: changedName,
        divination_method: divinationMethod,
      },
      { onConflict: 'post_id' }
    )

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

    const { error: updatePostError } = await supabase.from('posts').update({ status: 'archived' }).eq('id', postId)
    if (updatePostError) return NextResponse.json({ error: updatePostError.message }, { status: 500 })

    if (apiKey) {
      try {
        const postRow = post as {
          id: string
          title: string
          content: string
          content_html: string | null
        }

        const { data: techniqueCandidates, error: techniqueError } = await supabase
          .from('tags')
          .select('id, name')
          .eq('category', 'technique')
          .eq('scope', 'liuyao')
          .order('usage_count', { ascending: false })
          .limit(200)

        if (!techniqueError) {
          const techniqueNames = (techniqueCandidates || []).map((x: { name: string }) => x.name).filter(Boolean)
          const system = `你是一位六爻实证数据库的结构化标注专家。你只输出严格 JSON 对象，不要输出多余文字。`
          const user = [
            `标题：${String(postRow.title || '')}`,
            `内容：${String(postRow.content_html || postRow.content || '')}`,
            `结案反馈：${feedback.trim()}`,
            ``,
            `排盘数据（可能为空）：${JSON.stringify(recordPayload || {})}`,
            ``,
            `候选技法标签（只能从这里选，选 2-6 个）：${JSON.stringify(techniqueNames)}`,
            ``,
            `输出 JSON 对象字段：`,
            `1) technique_tags: string[]`,
            `2) is_liu_chong: boolean`,
            `3) is_liu_he: boolean`,
            `4) yong_shen: string | null`,
          ].join('\n')

          const result = await generateText({
            model: deepseek.chat('deepseek-chat'),
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0.2,
          })

          const obj = parseJsonObject(result.text)
          const tags = Array.isArray(obj?.technique_tags) ? (obj?.technique_tags as unknown[]).filter((x): x is string => typeof x === 'string') : []
          const isLiuChong = typeof obj?.is_liu_chong === 'boolean' ? (obj.is_liu_chong as boolean) : null
          const isLiuHe = typeof obj?.is_liu_he === 'boolean' ? (obj.is_liu_he as boolean) : null
          const yongShen = typeof obj?.yong_shen === 'string' && String(obj.yong_shen).trim() ? String(obj.yong_shen).trim() : null

          if (tags.length) {
            const { data: existingPostTags } = await supabase.from('post_tags').select('tag_id').eq('post_id', postId)
            const existingIds = new Set((existingPostTags || []).map((x: { tag_id: string }) => x.tag_id).filter(Boolean))

            const { data: matched } = await supabase.from('tags').select('id, name').in('name', tags)
            const newIds = (matched || []).map((x: { id: string }) => x.id).filter(Boolean).filter((id) => !existingIds.has(id))
            if (newIds.length) {
              await supabase.from('post_tags').insert(newIds.map((tagId) => ({ post_id: postId, tag_id: tagId })))
            }
          }

          if (isLiuChong !== null || isLiuHe !== null || yongShen !== null) {
            await supabase
              .from('case_metadata')
              .update({
                ...(isLiuChong !== null ? { is_liu_chong: isLiuChong } : {}),
                ...(isLiuHe !== null ? { is_liu_he: isLiuHe } : {}),
                ...(yongShen !== null ? { yong_shen: yongShen } : {}),
                updated_at: new Date().toISOString(),
              })
              .eq('post_id', postId)
          }
        }
      } catch {}
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
