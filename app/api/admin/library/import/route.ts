import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { NextResponse, type NextRequest } from 'next/server'
export const runtime = 'nodejs'

type SourceType = 'github' | 'wikisource' | 'legacy'

type ImportRequestBody = {
  source_type: SourceType
  github_raw_url?: string
  wikisource_title?: string
  legacy_url?: string
  default_category?: string
  default_status?: string
  limit?: number
}

const ALLOWED_LIBRARY_BOOK_STATUSES = new Set(['draft', 'reviewed', 'published'])

function limitString(input: string, maxLen: number) {
  if (input.length <= maxLen) return input
  return input.slice(0, maxLen)
}

function stripHtml(html: string) {
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  const text = noScript.replace(/<[^>]+>/g, '\n')
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripWikitext(wikitext: string) {
  let t = wikitext
  t = t.replace(/<!--[\s\S]*?-->/g, '')
  t = t.replace(/<ref[\s\S]*?<\/ref>/gi, '')
  t = t.replace(/<ref[^\/>]*\/>/gi, '')

  for (let i = 0; i < 20 && /\{\{/.test(t); i++) {
    const next = t.replace(/\{\{[^{}]*\}\}/g, '')
    if (next === t) break
    t = next
  }

  const lines = t.split('\n')
  const transformed: string[] = []
  let inTable = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('{|')) {
      inTable = true
      continue
    }
    if (inTable && trimmed.startsWith('|}')) {
      inTable = false
      continue
    }
    if (inTable && trimmed.startsWith('|-')) {
      continue
    }
    if (inTable && (trimmed.startsWith('|') || trimmed.startsWith('!'))) {
      const cellText = trimmed
        .replace(/^[\|\!]\s*/, '')
        .replace(/\|\|/g, '  ')
        .replace(/\|/g, '  ')
      transformed.push(cellText)
      continue
    }
    transformed.push(line)
  }
  t = transformed.join('\n')

  t = t.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
  t = t.replace(/\[\[([^\]]+)\]\]/g, '$1')
  t = t.replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g, '$1')
  t = t.replace(/\[https?:\/\/[^\]]+\]/g, '')

  t = t.replace(/^={1,6}\s*(.*?)\s*={1,6}$/gm, '\n$1\n')
  t = t.replace(/'''/g, '').replace(/''/g, '')

  t = t.replace(/<[^>]+>/g, '')
  t = t.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return t
}

function parseChineseNumber(input: string) {
  const s = input.trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Number.parseInt(s, 10)

  const digitMap: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }
  const unitMap: Record<string, number> = {
    十: 10,
    百: 100,
    千: 1000,
  }

  let total = 0
  let current = 0
  for (const ch of s) {
    if (ch in digitMap) {
      current = digitMap[ch]
      continue
    }
    if (ch in unitMap) {
      const unit = unitMap[ch]
      const n = current === 0 ? 1 : current
      total += n * unit
      current = 0
      continue
    }
    return null
  }
  total += current
  return total || null
}

function splitBookTextToChapters(text: string) {
  const raw = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!raw) return []

  const lines = raw.split('\n')
  const chapters: Array<{
    volume_no: number | null
    volume_title: string | null
    chapter_title: string
    content: string
  }> = []

  let currentVolumeNo: number | null = null
  let currentVolumeTitle: string | null = null

  let currentChapterTitle = '正文'
  let buf: string[] = []

  const flush = () => {
    const content = buf.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    buf = []
    if (!content) return
    chapters.push({
      volume_no: currentVolumeNo,
      volume_title: currentVolumeTitle,
      chapter_title: currentChapterTitle || '正文',
      content,
    })
  }

  const tryParseHeading = (line: string) => {
    const s = line.trim()
    if (!s) return null
    if (s.length > 40) return null

    const volMatch = s.match(/^卷([一二三四五六七八九十百千两\d]+)(?:\s*[·.、\-—]+\s*(.+))?$/)
    if (volMatch) {
      const volNo = parseChineseNumber(volMatch[1])
      const volTitle = `卷${volMatch[1]}`
      const chapterTitle = (volMatch[2] || '').trim() || '正文'
      return { kind: 'volume' as const, volume_no: volNo, volume_title: volTitle, chapter_title: chapterTitle }
    }

    const vol2Match = s.match(/^第([一二三四五六七八九十百千两\d]+)卷(?:\s*[·.、\-—]+\s*(.+))?$/)
    if (vol2Match) {
      const volNo = parseChineseNumber(vol2Match[1])
      const volTitle = `卷${vol2Match[1]}`
      const chapterTitle = (vol2Match[2] || '').trim() || '正文'
      return { kind: 'volume' as const, volume_no: volNo, volume_title: volTitle, chapter_title: chapterTitle }
    }

    const chapMatch = s.match(/^第([一二三四五六七八九十百千两\d]+)([章节篇回])(?:\s*[·.、\-—]+\s*(.+))?$/)
    if (chapMatch) {
      const suffix = chapMatch[2]
      const tail = (chapMatch[3] || '').trim()
      const title = tail ? `第${chapMatch[1]}${suffix} · ${tail}` : `第${chapMatch[1]}${suffix}`
      return { kind: 'chapter' as const, chapter_title: title }
    }

    const simpleMatch = s.match(/^([一二三四五六七八九十百千两\d]+)[、.]\s*(.{1,40})$/)
    if (simpleMatch) {
      return { kind: 'chapter' as const, chapter_title: simpleMatch[2].trim() }
    }

    return null
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const heading = tryParseHeading(trimmed)
    if (heading) {
      flush()
      if (heading.kind === 'volume') {
        currentVolumeNo = heading.volume_no
        currentVolumeTitle = heading.volume_title
        currentChapterTitle = heading.chapter_title
      } else {
        currentChapterTitle = heading.chapter_title
      }
      continue
    }
    buf.push(line)
  }
  flush()

  if (!chapters.length) {
    return [
      {
        volume_no: null,
        volume_title: null,
        chapter_title: '正文',
        content: raw,
      },
    ]
  }
  return chapters
}

async function rebuildLibraryBookContents(supabase: any, bookId: string, description: string) {
  const chapters = splitBookTextToChapters(description)
  if (!chapters.length) return { inserted: 0 }

  const { error: delError } = await supabase.from('library_book_contents').delete().eq('book_id', bookId)
  if (delError) throw delError

  let sort = 0
  let lastVolKey = ''
  let chapterNo = 0
  const rows = chapters.map((c) => {
    sort += 1
    const key = `${c.volume_no ?? ''}|${c.volume_title ?? ''}`
    if (key !== lastVolKey) {
      lastVolKey = key
      chapterNo = 0
    }
    chapterNo += 1
    return {
      book_id: bookId,
      volume_no: c.volume_no,
      volume_title: c.volume_title,
      chapter_no: chapterNo,
      chapter_title: c.chapter_title,
      content: limitString(c.content, 200_000),
      sort_order: sort,
      updated_at: new Date().toISOString(),
    }
  })

  const chunkSize = 200
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error: insError } = await supabase.from('library_book_contents').insert(chunk)
    if (insError) throw insError
  }

  return { inserted: rows.length }
}

async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const controller = new AbortController()
  const timeoutMs = init.timeoutMs ?? 15_000
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

function formatFetchError(e: unknown) {
  const err = e as any
  const msg = typeof err?.message === 'string' ? err.message : ''
  const causeCode = typeof err?.cause?.code === 'string' ? err.cause.code : ''
  if (causeCode === 'UND_ERR_CONNECT_TIMEOUT') return '网络请求连接超时，请检查网络/代理设置或稍后重试'
  if (causeCode === 'UND_ERR_HEADERS_TIMEOUT') return '网络请求响应超时，请稍后重试'
  if (causeCode === 'UND_ERR_SOCKET') return '网络连接异常，请检查网络/代理设置或稍后重试'
  if (msg.toLowerCase().includes('aborted')) return '网络请求超时，请稍后重试'
  return msg || '网络请求失败'
}

function parseCharsetFromHtml(html: string) {
  const m1 = html.match(/<meta[^>]*charset=["']?([a-zA-Z0-9\-_]+)["']?/i)
  if (m1?.[1]) return m1[1].toLowerCase()
  const m2 = html.match(/<meta[^>]*http-equiv=["']content-type["'][^>]*content=["'][^"']*charset=([a-zA-Z0-9\-_]+)[^"']*["']/i)
  if (m2?.[1]) return m2[1].toLowerCase()
  return null
}

function normalizeCharset(input: string | null) {
  const raw = (input || '').trim().toLowerCase()
  if (!raw) return null
  if (raw === 'utf8') return 'utf-8'
  if (raw === 'gb2312' || raw === 'gbk' || raw === 'gb18030') return 'gb18030'
  return raw
}

function parseCharsetFromContentType(contentType: string) {
  const lower = (contentType || '').toLowerCase()
  const idx = lower.indexOf('charset=')
  if (idx < 0) return null
  const raw = lower.slice(idx + 'charset='.length).split(';')[0]?.trim() || null
  return normalizeCharset(raw)
}

function decodeArrayBuffer(buf: ArrayBuffer, charset: string) {
  try {
    return new TextDecoder(charset, { fatal: false }).decode(buf)
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(buf)
  }
}

async function loadTextFromUrl(url: string) {
  const res = await fetchWithTimeout(url, { method: 'GET' })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

  const buf = await res.arrayBuffer()
  const charsetFromHeader = parseCharsetFromContentType(res.headers.get('content-type') || '')
  if (charsetFromHeader) return decodeArrayBuffer(buf, charsetFromHeader)

  const probe = decodeArrayBuffer(buf.slice(0, Math.min(buf.byteLength, 4096)), 'latin1')
  const htmlCharset = normalizeCharset(parseCharsetFromHtml(probe))
  const charset = htmlCharset || 'utf-8'
  const decoded = decodeArrayBuffer(buf, charset)
  if (charset === 'utf-8') {
    const bad = (decoded.match(/\uFFFD/g) || []).length
    if (bad >= 60) {
      const gbDecoded = decodeArrayBuffer(buf, 'gb18030')
      const gbBad = (gbDecoded.match(/\uFFFD/g) || []).length
      if (gbBad < bad) return gbDecoded
    }
  }
  return decoded
}

function decodeHtmlEntitiesInline(input: string) {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripTagsInline(html: string) {
  return decodeHtmlEntitiesInline(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function isHomeInMistsNewUploaded(url: string) {
  try {
    const u = new URL(url)
    return /(^|\.)homeinmists\.com$/i.test(u.hostname) && /\/new_uploaded\.htm$/i.test(u.pathname)
  } catch {
    return false
  }
}

type ExtractedLink = { href: string; text: string; context: string }

function extractAnchorsWithContext(html: string) {
  const results: ExtractedLink[] = []
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const href = (m[1] || '').trim()
    const rawText = stripTagsInline(m[2] || '')
    const idx = typeof m.index === 'number' ? m.index : 0
    const start = Math.max(0, idx - 140)
    const end = Math.min(html.length, idx + (m[0]?.length || 0) + 140)
    const context = html.slice(start, end)
    results.push({ href, text: rawText, context })
  }
  return results
}

function sliceHomeInMistsNewUploadedLatestSection(html: string) {
  const markerIdx = html.indexOf('最近更新')
  if (markerIdx < 0) return html
  const afterMarker = html.slice(markerIdx)
  const olIdx = afterMarker.search(/<ol\b/i)
  if (olIdx < 0) return afterMarker
  const absOlStart = markerIdx + olIdx
  const afterOl = html.slice(absOlStart)
  const endMatch = afterOl.match(/<\/ol>/i)
  const absEnd = endMatch?.index != null ? absOlStart + endMatch.index + endMatch[0].length : Math.min(html.length, absOlStart + 200_000)
  return html.slice(absOlStart, absEnd)
}

function canonicalizeUrl(input: string, baseUrl: string) {
  const u = new URL(input, baseUrl)
  u.hash = ''
  return u.toString()
}

function getUrlExt(url: string) {
  try {
    const u = new URL(url)
    const p = u.pathname.toLowerCase()
    const m = p.match(/\.([a-z0-9]+)$/)
    return m?.[1] ? `.${m[1]}` : ''
  } catch {
    const m = url.toLowerCase().match(/\.([a-z0-9]+)(?:$|\?)/)
    return m?.[1] ? `.${m[1]}` : ''
  }
}

function guessTitleFromUrl(url: string) {
  try {
    const u = new URL(url)
    const seg = u.pathname.split('/').filter(Boolean).pop() || ''
    return decodeURIComponent(seg).replace(/\.[a-z0-9]+$/i, '').trim() || '未命名古籍'
  } catch {
    return '未命名古籍'
  }
}

function normalizeHomeInMistsTitle(input: string) {
  let t = (input || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  t = t.replace(/^[↓\s,，、.。·•\-—]+/g, '').trim()
  t = t.replace(/^(⬇️|⬇|👇|↓↓↓|↓↓|↓)+/g, '').trim()
  t = t.replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '').trim()
  t = t.replace(/^[,，、.。·•\-—]+/g, '').trim()
  return t
}

function normalizeLibraryBookStatus(input: string | undefined | null) {
  const raw = (input || '').trim()
  if (!raw) return null
  const s = raw.toLowerCase()

  if (ALLOWED_LIBRARY_BOOK_STATUSES.has(s)) return s

  const zh = raw.replace(/\s+/g, '')
  if (zh === '草稿' || zh === '待审核' || zh === '采集导入' || zh === '导入' || zh === '未发布') return 'draft'
  if (zh === '已审核' || zh === '待发布') return 'reviewed'
  if (zh === '已发布' || zh === '发布' || zh === '公开') return 'published'

  return null
}

function formatUnknownError(e: unknown) {
  if (e instanceof Error) return e.message || 'Unknown error'
  if (typeof e === 'string') return e || 'Unknown error'
  if (e && typeof e === 'object') {
    const anyErr = e as any
    if (typeof anyErr.message === 'string' && anyErr.message.trim()) return anyErr.message
    if (typeof anyErr.error === 'string' && anyErr.error.trim()) return anyErr.error
    if (typeof anyErr.details === 'string' && anyErr.details.trim()) return anyErr.details
    if (typeof anyErr.hint === 'string' && anyErr.hint.trim()) return anyErr.hint
    if (typeof anyErr.code === 'string' && anyErr.code.trim()) {
      return `Error code: ${anyErr.code}`
    }
    try {
      return JSON.stringify(anyErr)
    } catch {
      return 'Unknown error'
    }
  }
  return 'Unknown error'
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/admin/library/import:
 *   post:
 *     summary: POST /api/admin/library/import
 *     description: Auto-generated description for POST /api/admin/library/import
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
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Missing authorization header' }, { headers: { ...corsHeaders }, status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const ctx = await getAdminContext(token)
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { headers: { ...corsHeaders }, status: ctx.status })

    const warnings: string[] = []
    const warningSet = new Set<string>()
    const addWarning = (msg: string) => {
      const m = msg.trim()
      if (!m || warningSet.has(m)) return
      warningSet.add(m)
      warnings.push(m)
    }

    const body = (await req.json().catch(() => null)) as ImportRequestBody | null
    const sourceType = body?.source_type
    if (!sourceType || !['github', 'wikisource', 'legacy'].includes(sourceType)) {
      return NextResponse.json({ error: 'source_type is invalid' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const defaultCategory = (body?.default_category || '古籍').trim()
    const providedDefaultStatus = body?.default_status
    const normalizedDefaultStatus = normalizeLibraryBookStatus(providedDefaultStatus)
    if (providedDefaultStatus && !normalizedDefaultStatus) {
      addWarning(`default_status="${providedDefaultStatus}" 不合法，已回退为 draft`)
    }
    const defaultStatus = normalizedDefaultStatus || 'draft'
    const limit = typeof body?.limit === 'number' && Number.isFinite(body.limit) ? Math.min(200, Math.max(1, Math.floor(body.limit))) : 50

    const nowIso = new Date().toISOString()
    const upsertOne = async (payload: {
      title: string
      author?: string | null
      dynasty?: string | null
      category?: string | null
      status?: string | null
      cover_url?: string | null
      pdf_url?: string | null
      description?: string | null
      source_type: SourceType
      source_url: string
      source_payload?: any
    }) => {
      const title = payload.title.trim()
      if (!title) return { action: 'skipped' as const }

      const rawDescription = payload.description ? String(payload.description) : null
      const description = rawDescription ? limitString(rawDescription, 200_000) : null
      const rowMinimal = {
        title,
        author: payload.author || null,
        dynasty: payload.dynasty || null,
        category: payload.category || defaultCategory,
        status: normalizeLibraryBookStatus(payload.status || undefined) || defaultStatus,
        cover_url: payload.cover_url || null,
        description,
        updated_at: nowIso,
      }
      const rowWithPdf = {
        ...rowMinimal,
        pdf_url: payload.pdf_url || null,
      }
      const rowWithSource = {
        ...rowWithPdf,
        source_type: payload.source_type,
        source_url: payload.source_url,
        source_payload: payload.source_payload ?? null,
      }

      const isMissingOptionalColumns = (err: unknown) => {
        const e = err as any
        const msg = typeof e?.message === 'string' ? e.message : ''
        const code = typeof e?.code === 'string' ? e.code : ''
        if (code === '42703') return true
        return /column\s+["']?(source_(type|url|payload)|pdf_url)["']?\s+of\s+relation/i.test(msg)
      }

      const { data: existing, error: findError } = await ctx.supabase
        .from('library_books')
        .select('id')
        .eq('title', title)
        .maybeSingle()

      if (findError) throw findError

      if (existing?.id) {
        const { error: updateError } = await ctx.supabase.from('library_books').update(rowWithSource).eq('id', existing.id)
        if (updateError) {
          if (!isMissingOptionalColumns(updateError)) throw updateError
          const { error: fallbackUpdateError1 } = await ctx.supabase.from('library_books').update(rowWithPdf).eq('id', existing.id)
          if (fallbackUpdateError1) {
            if (!isMissingOptionalColumns(fallbackUpdateError1)) throw fallbackUpdateError1
            const { error: fallbackUpdateError2 } = await ctx.supabase.from('library_books').update(rowMinimal).eq('id', existing.id)
            if (fallbackUpdateError2) throw fallbackUpdateError2
          }
        }
        if (rawDescription && rawDescription.trim()) {
          try {
            await rebuildLibraryBookContents(ctx.supabase, existing.id, rawDescription)
          } catch (e: any) {
            const msg = typeof e?.message === 'string' ? e.message : ''
            if (/(relation|table).+library_book_contents.+does not exist/i.test(msg)) {
              addWarning('缺少表 library_book_contents，章节目录未生成；请执行迁移：supabase/migrations/20260106_create_library_book_contents.sql')
              return { action: 'updated' as const, id: existing.id, title }
            }
            throw e
          }
        }
        return { action: 'updated' as const, id: existing.id, title }
      }

      const { data: inserted, error: insertError } = await ctx.supabase
        .from('library_books')
        .insert(rowWithSource)
        .select('id')
        .single()
      if (insertError) {
        if (!isMissingOptionalColumns(insertError)) throw insertError
        const { data: fallbackInserted1, error: fallbackInsertError1 } = await ctx.supabase
          .from('library_books')
          .insert(rowWithPdf)
          .select('id')
          .single()
        if (fallbackInsertError1) {
          if (!isMissingOptionalColumns(fallbackInsertError1)) throw fallbackInsertError1
          const { data: fallbackInserted2, error: fallbackInsertError2 } = await ctx.supabase
            .from('library_books')
            .insert(rowMinimal)
            .select('id')
            .single()
          if (fallbackInsertError2) throw fallbackInsertError2
          const fallbackId2 = fallbackInserted2.id as string
          if (rawDescription && rawDescription.trim()) {
            try {
              await rebuildLibraryBookContents(ctx.supabase, fallbackId2, rawDescription)
            } catch (e: any) {
              const msg = typeof e?.message === 'string' ? e.message : ''
              if (/(relation|table).+library_book_contents.+does not exist/i.test(msg)) {
                addWarning('缺少表 library_book_contents，章节目录未生成；请执行迁移：supabase/migrations/20260106_create_library_book_contents.sql')
                return { action: 'inserted' as const, id: fallbackId2, title }
              }
              throw e
            }
          }
          return { action: 'inserted' as const, id: fallbackId2, title }
        }
        const fallbackId1 = fallbackInserted1.id as string
        if (rawDescription && rawDescription.trim()) {
          try {
            await rebuildLibraryBookContents(ctx.supabase, fallbackId1, rawDescription)
          } catch (e: any) {
            const msg = typeof e?.message === 'string' ? e.message : ''
            if (/(relation|table).+library_book_contents.+does not exist/i.test(msg)) {
              addWarning('缺少表 library_book_contents，章节目录未生成；请执行迁移：supabase/migrations/20260106_create_library_book_contents.sql')
              return { action: 'inserted' as const, id: fallbackId1, title }
            }
            throw e
          }
        }
        return { action: 'inserted' as const, id: fallbackId1, title }
      }
      if (rawDescription && rawDescription.trim()) {
        try {
          await rebuildLibraryBookContents(ctx.supabase, inserted.id as string, rawDescription)
        } catch (e: any) {
          const msg = typeof e?.message === 'string' ? e.message : ''
          if (/(relation|table).+library_book_contents.+does not exist/i.test(msg)) {
            addWarning('缺少表 library_book_contents，章节目录未生成；请执行迁移：supabase/migrations/20260106_create_library_book_contents.sql')
            return { action: 'inserted' as const, id: inserted.id as string, title }
          }
          throw e
        }
      }
      return { action: 'inserted' as const, id: inserted.id as string, title }
    }

    if (sourceType === 'wikisource') {
      const title = (body?.wikisource_title || '').trim()
      if (!title) return NextResponse.json({ error: 'wikisource_title is required' }, { headers: { ...corsHeaders }, status: 400 })

      const endpoint = 'https://zh.wikisource.org/w/api.php'
      const params = new URLSearchParams({
        action: 'parse',
        page: title,
        prop: 'text',
        format: 'json',
        formatversion: '2',
        redirects: '1',
      })
      const url = `${endpoint}?${params.toString()}`
      let res: Response
      try {
        res = await fetchWithTimeout(url, { method: 'GET' })
      } catch (e) {
        return NextResponse.json({ error: formatFetchError(e) }, { headers: { ...corsHeaders }, status: 502 })
      }
      if (!res.ok) return NextResponse.json({ error: `Wikisource API failed: ${res.status}` }, { headers: { ...corsHeaders }, status: 502 })

      const json = (await res.json().catch(() => null)) as any
      const html = json?.parse?.text
      if (!html) return NextResponse.json({ error: 'Wikisource page not found' }, { headers: { ...corsHeaders }, status: 404 })

      const clean = stripHtml(String(html))
      const item = await upsertOne({
        title,
        author: null,
        dynasty: null,
        category: defaultCategory,
        status: defaultStatus,
        pdf_url: null,
        description: clean,
        source_type: 'wikisource',
        source_url: `https://zh.wikisource.org/wiki/${encodeURIComponent(title)}`,
        source_payload: { api_url: url, mode: 'parse' },
      })

      return NextResponse.json(
        { inserted: item.action === 'inserted' ? 1 : 0, updated: item.action === 'updated' ? 1 : 0, items: [item], warnings },
        { headers: { ...corsHeaders } }
      )
    }

    if (sourceType === 'legacy') {
      const legacyUrl = (body?.legacy_url || '').trim()
      if (!legacyUrl) return NextResponse.json({ error: 'legacy_url is required' }, { headers: { ...corsHeaders }, status: 400 })

      if (isHomeInMistsNewUploaded(legacyUrl)) {
        let html: string
        try {
          html = await loadTextFromUrl(legacyUrl)
        } catch (e) {
          return NextResponse.json({ error: formatFetchError(e) }, { headers: { ...corsHeaders }, status: 502 })
        }

        const latestSectionHtml = sliceHomeInMistsNewUploadedLatestSection(html)
        const anchors = extractAnchorsWithContext(latestSectionHtml)
        const candidateExts = new Set(['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar', '.7z', '.htm', '.html'])
        const seen = new Set<string>()
        const candidates: Array<{ url: string; text: string; ext: string }> = []

        for (const a of anchors) {
          const href = (a.href || '').trim()
          if (!href) continue
          const hrefLower = href.toLowerCase()
          if (hrefLower.startsWith('#') || hrefLower.startsWith('mailto:') || hrefLower.startsWith('javascript:')) continue

          let full: string
          try {
            full = canonicalizeUrl(href, legacyUrl)
          } catch {
            continue
          }

          const ext = getUrlExt(full)
          if (!candidateExts.has(ext)) continue
          if (seen.has(full)) continue
          seen.add(full)

          candidates.push({ url: full, text: (a.text || '').trim(), ext })
        }

        const selected = candidates.slice(0, limit)
        const results: Array<{ action: 'inserted' | 'updated' | 'skipped'; id?: string; title?: string }> = []
        let inserted = 0
        let updated = 0

        for (const x of selected) {
          const url = x.url
          const ext = x.ext
          const linkText = x.text
          const cleanedText = linkText ? normalizeHomeInMistsTitle(linkText) : ''
          const baseTitle = cleanedText && cleanedText.length >= 2 ? cleanedText : guessTitleFromUrl(url)

          if (ext === '.htm' || ext === '.html') {
            let description: string | null = null
            let title = baseTitle
            let fetchError: string | null = null
            try {
              const pageHtml = await loadTextFromUrl(url)
              const pageTitleMatch = pageHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
              const pageTitle = (pageTitleMatch?.[1] || '').replace(/\s+/g, ' ').trim()
              if (pageTitle) title = pageTitle
              description = stripHtml(pageHtml)
            } catch (e: any) {
              fetchError = typeof e?.message === 'string' ? e.message : '加载失败'
            }

            const item = await upsertOne({
              title,
              category: defaultCategory,
              status: defaultStatus,
              pdf_url: null,
              description,
              source_type: 'legacy',
              source_url: url,
              source_payload: { site: 'homeinmists', from_page: legacyUrl, kind: 'html', link_text: linkText || null, fetch_error: fetchError },
            })
            results.push(item)
            if (item.action === 'inserted') inserted += 1
            if (item.action === 'updated') updated += 1
            continue
          }

          const item = await upsertOne({
            title: baseTitle,
            category: defaultCategory,
            status: defaultStatus,
            pdf_url: ext === '.pdf' ? url : null,
            description: null,
            source_type: 'legacy',
            source_url: url,
            source_payload: { site: 'homeinmists', from_page: legacyUrl, kind: 'file', file_ext: ext, link_text: linkText || null, download_url: url },
          })
          results.push(item)
          if (item.action === 'inserted') inserted += 1
          if (item.action === 'updated') updated += 1
        }

        return NextResponse.json({ inserted, updated, items: results, warnings }, { headers: { ...corsHeaders } })
      }

      let html: string
      try {
        html = await loadTextFromUrl(legacyUrl)
      } catch (e) {
        return NextResponse.json({ error: formatFetchError(e) }, { headers: { ...corsHeaders }, status: 502 })
      }
      const text = stripHtml(html)

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      const title = (titleMatch?.[1] || '未命名古籍').replace(/\s+/g, ' ').trim()

      const item = await upsertOne({
        title,
        description: text,
        pdf_url: null,
        source_type: 'legacy',
        source_url: legacyUrl,
        source_payload: { extracted_title: title },
      })

      return NextResponse.json(
        { inserted: item.action === 'inserted' ? 1 : 0, updated: item.action === 'updated' ? 1 : 0, items: [item], warnings },
        { headers: { ...corsHeaders } }
      )
    }

    const githubUrl = (body?.github_raw_url || '').trim()
    if (!githubUrl) return NextResponse.json({ error: 'github_raw_url is required' }, { headers: { ...corsHeaders }, status: 400 })

    let res: Response
    try {
      res = await fetchWithTimeout(githubUrl, { method: 'GET', headers: { Accept: 'application/json' } })
    } catch (e) {
      return NextResponse.json({ error: formatFetchError(e) }, { headers: { ...corsHeaders }, status: 502 })
    }
    if (!res.ok) return NextResponse.json({ error: `GitHub fetch failed: ${res.status}` }, { headers: { ...corsHeaders }, status: 502 })

    const json = (await res.json().catch(() => null)) as any
    const arr: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Array.isArray(json?.items) ? json.items : []
    if (!Array.isArray(arr) || arr.length === 0) {
      return NextResponse.json({ error: 'GitHub JSON must be an array (or contain data/items array)' }, { headers: { ...corsHeaders }, status: 400 })
    }

    const selected = arr.slice(0, limit)
    const results: Array<{ action: 'inserted' | 'updated' | 'skipped'; id?: string; title?: string }> = []
    let inserted = 0
    let updated = 0

    for (const x of selected) {
      const title = typeof x?.title === 'string' ? x.title : typeof x?.name === 'string' ? x.name : ''
      const author = typeof x?.author === 'string' ? x.author : null
      const dynasty = typeof x?.dynasty === 'string' ? x.dynasty : typeof x?.era === 'string' ? x.era : null
      const category = typeof x?.category === 'string' ? x.category : defaultCategory
      const status = typeof x?.status === 'string' ? x.status : defaultStatus
      const coverUrl = typeof x?.cover_url === 'string' ? x.cover_url : typeof x?.coverUrl === 'string' ? x.coverUrl : null
      const pdfUrl = typeof x?.pdf_url === 'string' ? x.pdf_url : typeof x?.pdfUrl === 'string' ? x.pdfUrl : null

      let description: string | null = null
      if (typeof x?.description === 'string') description = x.description
      else if (typeof x?.desc === 'string') description = x.desc
      else if (Array.isArray(x?.paragraphs)) description = x.paragraphs.filter((p: any) => typeof p === 'string').join('\n')
      else if (typeof x?.content === 'string') description = x.content

      const item = await upsertOne({
        title: String(title || '').trim(),
        author,
        dynasty,
        category,
        status,
        cover_url: coverUrl,
        pdf_url: pdfUrl,
        description: description ? String(description) : null,
        source_type: 'github',
        source_url: githubUrl,
        source_payload: x,
      })

      if (item.action === 'inserted') inserted += 1
      if (item.action === 'updated') updated += 1
      results.push(item)
    }

    return NextResponse.json({ inserted, updated, items: results, warnings }, { headers: { ...corsHeaders } })
  } catch (e) {
    console.error('admin library import error:', e)
    return NextResponse.json(
      { error: formatUnknownError(e) },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}
