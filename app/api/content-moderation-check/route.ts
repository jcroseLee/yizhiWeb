import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

interface ModerationPayload {
  text: string
  context?: 'post' | 'comment'
  userId?: string
  postId?: string
}

const BAD_REQUEST = 400
const METHOD_NOT_ALLOWED = 405
const INTERNAL_ERROR = 500

type Decision = 'pass' | 'warn' | 'block'

function buildDefaultKeywords() {
  return [
    { word: '改运', severity: 'block', category: '迷信' },
    { word: '神仙', severity: 'block', category: '迷信' },
    { word: '风水宝地', severity: 'block', category: '迷信' },
    { word: '加微信', severity: 'block', category: '外联' },
    { word: '微信号', severity: 'block', category: '外联' },
    { word: '手机号', severity: 'block', category: '外联' },
    { word: '二维码', severity: 'block', category: '外联' },
    { word: '私下交易', severity: 'block', category: '外联' },
    { word: '平台外支付', severity: 'block', category: '外联' },
    { word: '带单', severity: 'warn', category: '广告' },
    { word: '外部群', severity: 'warn', category: '外联' },
  ]
}

function evaluate(text: string, keywords: Array<{ word: string; severity: 'block' | 'warn' }>) {
  const lower = text.toLowerCase()
  const matched: Array<{ word: string; severity: 'block' | 'warn' }> = []
  for (const k of keywords) {
    if (lower.includes(k.word.toLowerCase())) matched.push(k)
  }
  const hasBlock = matched.some(m => m.severity === 'block')
  const hasWarn = matched.some(m => m.severity === 'warn')
  const decision: Decision = hasBlock ? 'block' : hasWarn ? 'warn' : 'pass'
  return { decision, matched }
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/content-moderation-check:
 *   post:
 *     summary: POST /api/content-moderation-check
 *     description: Auto-generated description for POST /api/content-moderation-check
 *     tags:
 *       - Content-moderation-check
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
      throw new Error('Server configuration error')
    }

    const supabase = createSupabaseAdmin()

    const payload = (await request.json().catch(() => ({}))) as ModerationPayload
    const { text, context = 'post', userId, postId } = payload

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '缺少文本内容' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    // Load keywords from DB (fallback to defaults)
    const { data: dbKeywords } = await supabase
      .from('sensitive_keywords')
      .select('word,severity')
      .eq('enabled', true)

    const keywords = (dbKeywords && dbKeywords.length > 0) ? dbKeywords : buildDefaultKeywords()
    const { decision, matched } = evaluate(text, keywords as any)

    // Record violation for block (and optionally warn for external contact)
    if ((decision === 'block' || decision === 'warn') && userId) {
      let violationType: 'private_transaction' | 'inappropriate_content' | 'spam' = 'inappropriate_content'
      const hasExternal = matched.some(m => ['加微信', '微信号', '手机号', '二维码', '私下交易', '平台外支付'].includes(m.word))
      if (hasExternal) violationType = 'private_transaction'

      await supabase.from('risk_control_violations').insert({
        post_id: postId || null,
        user_id: userId,
        violation_type: violationType,
        detected_content: text,
        action_taken: decision === 'block' ? 'blocked' : 'warning',
        is_resolved: false,
      })
    }

    return NextResponse.json(
      {
        decision,
        matched_keywords: matched.map(m => m.word),
        severity: decision,
        context,
      },
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('content-moderation-check error', error)
    return NextResponse.json({ error: (error as Error).message || '未知错误' }, {
      status: INTERNAL_ERROR,
      headers: corsHeaders,
    })
  }
}

