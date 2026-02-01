import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseWithToken } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/save-record:
 *   post:
 *     summary: POST /api/save-record
 *     description: Auto-generated description for POST /api/save-record
 *     tags:
 *       - Save-record
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, {
        status: 401,
        headers: corsHeaders,
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createSupabaseWithToken(token)

    const body = await request.json()
    const { userId, record } = body ?? {}
    if (!userId || !record) {
      return NextResponse.json({ error: 'Invalid payload' }, {
        status: 422,
        headers: corsHeaders,
      })
    }

    // 检查是否已存在相同的推演记录（通过 original_key, changed_key, user_id 判断）
    const { data: existingRecord } = await supabase
      .from('divination_records')
      .select('id')
      .eq('user_id', userId)
      .eq('original_key', record.original_key)
      .eq('changed_key', record.changed_key)
      .maybeSingle()

    if (existingRecord) {
      // 记录已存在，返回错误提示
      return NextResponse.json({
        error: '该推演记录已保存过，不能重复保存',
        existingId: existingRecord.id,
        isDuplicate: true
      }, {
        status: 409, // Conflict
        headers: corsHeaders,
      })
    }

    const { data, error } = await supabase
      .from('divination_records')
      .insert({
        user_id: userId,
        question: record.question ?? null,
        divination_time: record.divination_time ?? new Date().toISOString(),
        method: record.method ?? 0,
        lines: record.lines,
        changing_flags: record.changing_flags,
        original_key: record.original_key,
        changed_key: record.changed_key,
        original_json: record.original_json,
        changed_json: record.changed_json,
      })
      .select()
      .single()

    if (error) {
      console.error('save-record error', error)
      return NextResponse.json({ error: error.message }, {
        status: 500,
        headers: corsHeaders,
      })
    }

    return NextResponse.json({ data }, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('save-record unexpected error', error)
    return NextResponse.json({ error: error.message }, {
      status: 500,
      headers: corsHeaders,
    })
  }
}

