import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY
const baseURL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '') + '/v1'

const deepseek = createOpenAI({
  apiKey: apiKey || 'dummy-key',
  baseURL,
  fetch: async (url, options) => {
    let finalUrl = url.toString()
    if (finalUrl.includes('/responses')) {
      finalUrl = finalUrl.replace('/responses', '/chat/completions')
    }
    return fetch(finalUrl, options)
  },
})

export const runtime = 'nodejs'
export const maxDuration = 30

type MethodType = 'liuyao' | 'bazi' | 'qimen' | 'meihua' | 'ziwei' | 'general'

function parseJsonArray(text: string): string[] {
  const trimmed = text.trim()
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string')
  } catch {}

  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1)
    try {
      const parsed = JSON.parse(slice)
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string')
    } catch {}
  }
  return []
}

/**
 * @swagger
 * /api/ai/tag-suggest:
 *   post:
 *     summary: POST /api/ai/tag-suggest
 *     description: Auto-generated description for POST /api/ai/tag-suggest
 *     tags:
 *       - Ai
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API Key' }), { status: 500 })
  }

  const authHeader = req.headers.get('Authorization')
  let userId: string | null = null
  let skipAuth = false

  if (!authHeader && process.env.NODE_ENV === 'development') {
    skipAuth = true
  } else if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '')
      const supabase = createSupabaseAdmin()
      const { data, error } = await supabase.auth.getUser(token)
      if (!error && data.user) userId = data.user.id
      else if (process.env.NODE_ENV === 'development') skipAuth = true
    } catch {
      if (process.env.NODE_ENV === 'development') skipAuth = true
    }
  }

  if (!userId && !skipAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const title = String(body?.title || '')
  const content = String(body?.content || '')
  const method = (String(body?.method || 'liuyao') as MethodType) || 'liuyao'

  const supabase = createSupabaseAdmin()

  const [{ data: subjects, error: subjectError }, { data: techniques, error: techniqueError }] = await Promise.all([
    supabase.from('tags').select('name').eq('category', 'subject').is('scope', null).order('usage_count', { ascending: false }).limit(200),
    method === 'general'
      ? Promise.resolve({ data: [], error: null } as any)
      : supabase.from('tags').select('name').eq('category', 'technique').eq('scope', method).order('usage_count', { ascending: false }).limit(200),
  ])

  if (subjectError || techniqueError) {
    return new Response(
      JSON.stringify({ error: 'Failed to load tag candidates', details: subjectError?.message || techniqueError?.message }),
      { status: 500 }
    )
  }

  const subjectNames = (subjects || []).map((x: any) => x.name).filter(Boolean)
  const techniqueNames = (techniques || []).map((x: any) => x.name).filter(Boolean)

  const system = `你是一位精通中国传统术数的专家。你只输出严格的 JSON 数组，不要输出多余文字。`
  const user = [
    `标题：${title}`,
    `内容：${content}`,
    `门派：${method}`,
    ``,
    `候选事类标签（必须从这里选 1 个）：${JSON.stringify(subjectNames)}`,
    method === 'general'
      ? `候选技法标签：[]`
      : `候选技法标签（从这里选 2-4 个）：${JSON.stringify(techniqueNames)}`,
    ``,
    `要求：`,
    `1) 输出 JSON 数组，元素为字符串标签名，例如 ["婚姻","伤官见官","身弱"]。`,
    `2) 第一个元素必须是事类标签。`,
    method === 'general' ? `3) 门派为 general 时只输出事类标签。` : `3) 技法标签必须来自候选技法标签，严禁跨门派用词。`,
  ].join('\n')

  const result = await generateText({
    model: deepseek.chat('deepseek-chat'),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  })

  const tags = parseJsonArray(result.text)
  return new Response(JSON.stringify({ tags }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

