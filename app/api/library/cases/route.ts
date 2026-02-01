import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

function parseNumber(value: string | null, fallback: number) {
  if (!value) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return n
}

function parseUuidArray(value: string | null) {
  if (!value) return null
  const raw = value.trim()
  if (!raw) return null
  const items = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  return items.length ? items : null
}

function parseBoolean(value: string | null) {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (!v) return null
  if (['1', 'true', 'yes', 'y'].includes(v)) return true
  if (['0', 'false', 'no', 'n'].includes(v)) return false
  return null
}

/**
 * @swagger
 * /api/library/cases:
 *   get:
 *     summary: GET /api/library/cases
 *     description: Auto-generated description for GET /api/library/cases
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
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams

    const q = searchParams.get('q')
    const guaName = searchParams.get('gua_name')
    const accuracy = searchParams.get('accuracy')
    const tagIds = parseUuidArray(searchParams.get('tags'))
    const divinationMethod = searchParams.get('divination_method')
      ? parseNumber(searchParams.get('divination_method'), 0)
      : null
    const isLiuChong = parseBoolean(searchParams.get('is_liu_chong'))
    const isLiuHe = parseBoolean(searchParams.get('is_liu_he'))
    const limit = Math.min(50, Math.max(1, parseNumber(searchParams.get('limit'), 20)))
    const offset = Math.max(0, parseNumber(searchParams.get('offset'), 0))
    const order = searchParams.get('order') || 'featured'

    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase.rpc('search_cases', {
      p_q: q,
      p_gua_name: guaName,
      p_accuracy: accuracy,
      p_tag_ids: tagIds,
      p_divination_method: divinationMethod,
      p_is_liu_chong: isLiuChong,
      p_is_liu_he: isLiuHe,
      p_limit: limit,
      p_offset: offset,
      p_order: order,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = Array.isArray(data) ? data : []
    const total = rows.length ? Number(rows[0]?.total_count || 0) : 0

    const baziPostIds = rows
      .filter((row: any) => Number(row?.divination_method) === 1)
      .map((row: any) => row?.post_id)
      .filter(Boolean)

    if (!baziPostIds.length) {
      return NextResponse.json({ items: rows, total })
    }

    const { data: posts } = await supabase
      .from('posts')
      .select('id, divination_record_id')
      .in('id', baziPostIds)

    const postIdToRecordId = new Map<string, string>()
    for (const p of posts || []) {
      if (p?.id && p?.divination_record_id) postIdToRecordId.set(p.id, p.divination_record_id)
    }

    const recordIds = Array.from(postIdToRecordId.values())
    if (!recordIds.length) {
      return NextResponse.json({ items: rows, total })
    }

    const { data: records } = await supabase
      .from('divination_records')
      .select('id, original_json')
      .in('id', recordIds)

    const recordIdToOriginalJson = new Map<string, unknown>()
    for (const r of records || []) {
      if (r?.id) recordIdToOriginalJson.set(r.id, (r as any).original_json)
    }

    const enriched = rows.map((row: any) => {
      if (Number(row?.divination_method) !== 1) return row
      const recordId = postIdToRecordId.get(row?.post_id)
      if (!recordId) return row
      const originalJson = recordIdToOriginalJson.get(recordId)
      if (!originalJson) return row
      return { ...row, original_json: originalJson }
    })

    return NextResponse.json({ items: enriched, total })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
