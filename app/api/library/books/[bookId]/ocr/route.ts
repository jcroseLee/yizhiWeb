import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import http from 'node:http'
import https from 'node:https'

export const runtime = 'nodejs'
export const maxDuration = 600 // 10 minutes for OCR processing

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

type ChapterRow = {
  id: string
  volume_no: number | null
  volume_title: string | null
  chapter_no: number | null
  chapter_title: string | null
  content: string | null
  sort_order: number | null
}

type ChapterInsertRow = {
  book_id: string
  volume_no: number | null
  volume_title: string | null
  chapter_no: number | null
  chapter_title: string | null
  content: string | null
  sort_order: number
}

function getOcrEndpoints() {
  const direct = (process.env.OCR_SERVICE_URL || '').trim()
  if (direct) {
    if (/\/ocr\/?$/i.test(direct)) return { pdf: direct, slices: direct.replace(/\/ocr\/?$/i, '/ocr_slices') }
    const base = direct.replace(/\/+$/, '')
    return { pdf: `${base}/ocr`, slices: `${base}/ocr_slices` }
  }
  if (process.env.NODE_ENV !== 'production') return { pdf: 'http://127.0.0.1:8008/ocr', slices: 'http://127.0.0.1:8008/ocr_slices' }
  return { pdf: '', slices: '' }
}

async function postJsonWithTimeout(url: string, payload: unknown, timeoutMs: number) {
  const u = new URL(url)
  const body = Buffer.from(JSON.stringify(payload))
  const isHttps = u.protocol === 'https:'

  const options: http.RequestOptions = {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port ? Number(u.port) : isHttps ? 443 : 80,
    path: `${u.pathname}${u.search}`,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(body.length),
    },
  }

  return await new Promise<{ status: number; json: any }>((resolve, reject) => {
    const req = (isHttps ? https : http).request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8')
        let parsed: any = null
        try {
          parsed = raw ? JSON.parse(raw) : null
        } catch {
          parsed = null
        }
        resolve({ status: res.statusCode || 0, json: parsed })
      })
      res.on('error', (err) => {
        console.error('[OCR Route] Response error:', err)
        reject(err)
      })
    })

    req.setTimeout(timeoutMs, () => {
      const timeoutErr = new Error(`timeout after ${timeoutMs}ms`)
      ;(timeoutErr as any).code = 'ETIMEDOUT'
      if (!req.destroyed) {
        req.destroy(timeoutErr)
      }
      reject(timeoutErr)
    })
    req.on('error', (err) => {
      console.error('[OCR Route] Request error:', err, 'URL:', url)
      reject(err)
    })
    req.write(body)
    req.end()
  })
}

async function getJsonWithTimeout(url: string, timeoutMs: number) {
  const u = new URL(url)
  const isHttps = u.protocol === 'https:'
  const options: http.RequestOptions = {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port ? Number(u.port) : isHttps ? 443 : 80,
    path: `${u.pathname}${u.search}`,
    method: 'GET',
    headers: { accept: 'application/json' },
  }

  return await new Promise<{ status: number; json: any }>((resolve, reject) => {
    const req = (isHttps ? https : http).request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8')
        let parsed: any = null
        try {
          parsed = raw ? JSON.parse(raw) : null
        } catch {
          parsed = null
        }
        resolve({ status: res.statusCode || 0, json: parsed })
      })
    })
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timeout after ${timeoutMs}ms`)))
    req.on('error', (err) => reject(err))
    req.end()
  })
}

function buildContentTextFromChapters(chapters: Array<{ chapter_title?: string | null; content?: string | null }>) {
  const parts: string[] = []
  for (const c of chapters) {
    const t = typeof c?.content === 'string' ? c.content.trim() : ''
    if (!t) continue
    parts.push(t)
  }
  return parts.join('\n\n').trim()
}

/**
 * @swagger
 * /api/library/books/{bookId}/ocr:
 *   post:
 *     summary: POST /api/library/books/{bookId}/ocr
 *     description: Auto-generated description for POST /api/library/books/{bookId}/ocr
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
export async function POST(_req: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  try {
    console.log('[OCR Route] Request received')
    const params = await context.params
    const rawBookId = params.bookId

    const bookId = decodeURIComponent(String(rawBookId || '')).trim()
    console.log('[OCR Route] Book ID:', bookId)
    if (!bookId) {
      return NextResponse.json({ error: 'missing book id' }, { status: 400 })
    }

    let supabase
    try {
      supabase = createSupabaseAdmin()
    } catch (e: any) {
      console.error('[OCR Route] Failed to create Supabase admin client:', e)
      return NextResponse.json({ error: '服务器配置错误: ' + (e?.message || '无法初始化数据库连接') }, { status: 500 })
    }

    let body: any = null
    try {
      body = await _req.json()
    } catch (e: any) {
      console.warn('[OCR Route] Failed to parse request body:', e)
      // Continue with null body, which is handled below
    }
    const force = isRecord(body) && (body as any).force === true

    const { data: book, error: bookError } = await supabase
      .from('library_books')
      .select('id, title, pdf_url, source_type, source_url, source_payload')
      .eq('id', bookId)
      .maybeSingle()

    if (bookError) {
      console.error('[OCR Route] Failed to load book:', bookError)
      return NextResponse.json({ error: '加载书籍失败: ' + (bookError.message || '数据库查询错误') }, { status: 500 })
    }

    if (!book) {
      return NextResponse.json({ error: '未找到书籍' }, { status: 404 })
    }

    const manifestUrlFromBody =
      isRecord(body) && typeof (body as any).manifest_url === 'string' ? String((body as any).manifest_url).trim() : ''

    const pdfUrlRaw = (book as any).pdf_url || ((book as any).source_payload && (book as any).source_payload.download_url) || (book as any).source_url
    const pdfUrl = typeof pdfUrlRaw === 'string' ? pdfUrlRaw.trim() : ''

    const sourcePayload = (book as any).source_payload as unknown
    const slicesInfo = (() => {
      if (!isRecord(sourcePayload)) return null
      const slices = sourcePayload.slices
      if (!isRecord(slices)) return null
      return slices as Record<string, unknown>
    })()
    const manifestUrl = (() => {
      const u = slicesInfo?.manifest_url
      return typeof u === 'string' ? u.trim() : ''
    })()

    const finalManifestUrl = manifestUrlFromBody || manifestUrl
    if (!pdfUrl && !finalManifestUrl) {
      return NextResponse.json({ error: '该书籍未绑定 PDF/切片，无法 OCR' }, { status: 400 })
    }

    const endpoints = getOcrEndpoints()
    const preferSlices = !!finalManifestUrl
    const ocrEndpoint = preferSlices ? endpoints.slices : endpoints.pdf
    console.log('[OCR Route] OCR endpoints:', endpoints, 'preferSlices:', preferSlices, 'selected:', ocrEndpoint)
    if (!ocrEndpoint) {
      console.error('[OCR Route] OCR endpoint not configured. preferSlices:', preferSlices, 'endpoints:', endpoints)
      return NextResponse.json({ error: 'OCR 服务未配置 (缺少 OCR_SERVICE_URL)' }, { status: 500 })
    }
    
    // Validate OCR endpoint URL
    try {
      new URL(ocrEndpoint)
      console.log('[OCR Route] OCR endpoint URL validated:', ocrEndpoint)
    } catch (e: any) {
      console.error('[OCR Route] Invalid OCR endpoint URL:', ocrEndpoint, e)
      return NextResponse.json({ error: 'OCR 服务 URL 格式错误: ' + ocrEndpoint }, { status: 500 })
    }

    // Try to check OCR service health before making the request
    try {
      const baseUrl = ocrEndpoint.replace(/\/ocr.*$/i, '')
      const healthUrl = `${baseUrl}/healthz`
      console.log('[OCR Route] Checking OCR service health at:', healthUrl)
      await getJsonWithTimeout(healthUrl, 5000)
      console.log('[OCR Route] OCR service health check passed')
    } catch (healthError: any) {
      console.warn('[OCR Route] OCR service health check failed (continuing anyway):', healthError?.message || healthError)
      // Continue anyway - the health check might fail but the actual endpoint might work
    }

    const timeoutMs = 600_000

    const expectedPageCount = (() => {
      const n = slicesInfo?.page_count
      return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : null
    })()

    const { data: existing, error: findError } = await supabase
      .from('library_book_contents')
      .select('id, volume_no, volume_title, chapter_no, chapter_title, content, sort_order')
      .eq('book_id', bookId)
      .order('sort_order', { ascending: true })

    if (findError) {
      console.error('[OCR Route] Failed to query existing chapters:', findError)
      // Continue processing instead of returning error, as this might be a new book
    }

    const complete = expectedPageCount ? !!existing && existing.length >= expectedPageCount : false
    if (!force && !findError && existing && existing.length > 0 && (complete || !expectedPageCount)) {
      return NextResponse.json({ chapters: existing as ChapterRow[], cached: true })
    }

    const pageStartRaw = isRecord(body) && typeof (body as any).page_start === 'number' ? (body as any).page_start : null
    const pageEndRaw = isRecord(body) && typeof (body as any).page_end === 'number' ? (body as any).page_end : null
    const maxPagesRaw = isRecord(body) && typeof (body as any).max_pages === 'number' ? (body as any).max_pages : null
    const batchSizeRaw = isRecord(body) && typeof (body as any).batch_size === 'number' ? (body as any).batch_size : null
    const batchSize =
      typeof batchSizeRaw === 'number' && Number.isFinite(batchSizeRaw) && batchSizeRaw >= 1 && batchSizeRaw <= 50
        ? Math.floor(batchSizeRaw)
        : 10

    const baseStart = typeof pageStartRaw === 'number' && Number.isFinite(pageStartRaw) && pageStartRaw > 0 ? Math.floor(pageStartRaw) : 1
    let baseEnd =
      typeof pageEndRaw === 'number' && Number.isFinite(pageEndRaw) && pageEndRaw > 0 ? Math.floor(pageEndRaw) : null

    if (!baseEnd && typeof maxPagesRaw === 'number' && Number.isFinite(maxPagesRaw) && maxPagesRaw > 0) {
      baseEnd = baseStart + Math.floor(maxPagesRaw) - 1
    }

    if (preferSlices && !baseEnd) {
      baseEnd = expectedPageCount
      if (!baseEnd) {
        try {
          const m = await getJsonWithTimeout(finalManifestUrl, 60_000)
          const pc = typeof m.json?.page_count === 'number' ? m.json.page_count : null
          const pagesLen = Array.isArray(m.json?.pages) ? m.json.pages.length : null
          baseEnd =
            typeof pc === 'number' && Number.isFinite(pc) && pc > 0
              ? Math.floor(pc)
              : typeof pagesLen === 'number' && pagesLen > 0
                ? pagesLen
                : null
        } catch {
          baseEnd = null
        }
      }
    }

    let httpRes: { status: number; json: any } | null = null
    try {
      const ocrPayload = {
        ...(preferSlices ? { manifest_url: finalManifestUrl } : { pdf_url: pdfUrl }),
        book_id: bookId,
        title: (book as any).title || '',
        ...(preferSlices ? {} : { mode: 'ocr' }),
        ...(typeof maxPagesRaw === 'number' ? { max_pages: maxPagesRaw } : {}),
        ...(typeof pageStartRaw === 'number' ? { page_start: pageStartRaw } : {}),
        ...(typeof pageEndRaw === 'number' ? { page_end: pageEndRaw } : {}),
      }
      const ocrLogPayload = {
        ...ocrPayload,
        ...('pdf_url' in ocrPayload ? { pdf_url: ocrPayload.pdf_url ? '[REDACTED]' : undefined } : {}),
      }
      console.log('[OCR Route] Calling OCR endpoint:', ocrEndpoint, 'with payload:', ocrLogPayload)
      
      if (!preferSlices || !baseEnd || baseEnd <= baseStart) {
        httpRes = await postJsonWithTimeout(ocrEndpoint, ocrPayload, timeoutMs)
      } else {
        const { error: delError } = await supabase.from('library_book_contents').delete().eq('book_id', bookId)
        if (delError) {
          console.error('[OCR Route] Failed to delete old chapters before batch processing:', delError)
          return NextResponse.json({ error: '清理旧章节失败: ' + (delError.message || '数据库删除错误') }, { status: 500 })
        }

        for (let start = baseStart; start <= baseEnd; start += batchSize) {
          const end = Math.min(baseEnd, start + batchSize - 1)
          const batchRes = await postJsonWithTimeout(
            ocrEndpoint,
            {
              manifest_url: finalManifestUrl,
              book_id: bookId,
              title: (book as any).title || '',
              page_start: start,
              page_end: end,
            },
            timeoutMs
          )
          if (batchRes.status < 200 || batchRes.status >= 300) {
            const p = batchRes.json
            const msg =
              p && typeof p?.error === 'string'
                ? p.error
                : p && typeof p?.detail === 'string'
                  ? p.detail
                  : p && p?.detail
                    ? JSON.stringify(p.detail)
                    : `OCR 服务错误 (${batchRes.status || 502})`
            return NextResponse.json({ error: msg }, { status: 502 })
          }

          const chapters = Array.isArray(batchRes.json?.chapters) ? batchRes.json.chapters : []
          const normalized: ChapterInsertRow[] = chapters.map((c: unknown, index: number) => {
            const row = c as any
            const chapterNo = typeof row?.chapter_no === 'number' ? row.chapter_no : null
            return {
              book_id: bookId,
              volume_no: typeof row?.volume_no === 'number' ? row.volume_no : 1,
              volume_title: typeof row?.volume_title === 'string' ? row.volume_title.trim() || null : null,
              chapter_no: chapterNo,
              chapter_title: typeof row?.chapter_title === 'string' ? row.chapter_title.trim() || null : null,
              content: typeof row?.content === 'string' ? row.content : null,
              sort_order: chapterNo ? chapterNo : start + index,
            }
          })

          const batchChunkSize = 200
          for (let i = 0; i < normalized.length; i += batchChunkSize) {
            const chunk = normalized.slice(i, i + batchChunkSize)
            const { error: insError } = await supabase.from('library_book_contents').insert(chunk)
            if (insError) {
              console.error('[OCR Route] Failed to insert chapters batch:', insError, 'chunk size:', chunk.length)
              return NextResponse.json({ error: '保存 OCR 结果失败: ' + (insError.message || '数据库插入错误') }, { status: 500 })
            }
          }
        }

        const { data: saved, error: reloadError } = await supabase
          .from('library_book_contents')
          .select('id, volume_no, volume_title, chapter_no, chapter_title, content, sort_order')
          .eq('book_id', bookId)
          .order('sort_order', { ascending: true })

        if (reloadError || !saved) {
          return NextResponse.json({ error: '读取 OCR 结果失败' }, { status: 500 })
        }

        const hasAnyText = saved.some((c) => typeof (c as any)?.content === 'string' && String((c as any).content).trim())
        if (!hasAnyText) {
          return NextResponse.json({ error: 'OCR 文本为空' }, { status: 502 })
        }

        const contentText = buildContentTextFromChapters(saved as any)
        if (contentText) {
          await supabase
            .from('library_books')
            .update({ content_text: contentText, updated_at: new Date().toISOString() } as any)
            .eq('id', bookId)
        }

        return NextResponse.json({ chapters: saved as ChapterRow[], cached: false })
      }
    } catch (e: any) {
      console.error('[OCR Route] OCR request failed:', e)
      const msg = typeof e?.message === "string" ? e.message : 'OCR 请求失败'
      const code = typeof e?.code === 'string' ? e.code : null
      const stack = typeof e?.stack === 'string' ? e.stack : undefined
      if (stack) {
        console.error('[OCR Route] Error stack:', stack)
      }
      
      // Check for connection errors
      const isConnectionError = 
        code === 'ECONNREFUSED' || 
        code === 'ETIMEDOUT' ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('connection refused') ||
        msg.includes('connect ECONNREFUSED')
      
      if (isConnectionError) {
        const errorMsg = `无法连接到 OCR 服务 (${ocrEndpoint})。请确认 OCR 服务正在运行。\n\n启动命令: python3 ocr_service/server.py serve --host 127.0.0.1 --port 8008`
        console.error('[OCR Route] Connection error:', errorMsg)
        return NextResponse.json({ error: errorMsg }, { status: 502 })
      }
      
      return NextResponse.json({ error: code ? `${msg} (${code})` : msg }, { status: 502 })
    }

    if (!httpRes) {
      return NextResponse.json({ error: 'OCR 请求未完成' }, { status: 500 })
    }

    const payload = httpRes.json as any

    if (httpRes.status < 200 || httpRes.status >= 300) {
      const msg =
        payload && typeof payload?.error === 'string'
          ? payload.error
          : payload && typeof payload?.detail === 'string'
            ? payload.detail
            : payload && payload?.detail
              ? JSON.stringify(payload.detail)
              : `OCR 服务错误 (${httpRes.status || 502})`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const chapters = Array.isArray(payload?.chapters) ? payload.chapters : []
    if (!chapters.length) {
      return NextResponse.json({ error: 'OCR 服务未返回章节内容' }, { status: 502 })
    }

    const normalized: ChapterInsertRow[] = chapters.map((c: unknown, index: number) => {
      const row = c as any
      const chapterNo = typeof row?.chapter_no === 'number' ? row.chapter_no : null
      return {
        book_id: bookId,
        volume_no: typeof row?.volume_no === 'number' ? row.volume_no : 1,
        volume_title: typeof row?.volume_title === 'string' ? row.volume_title.trim() || null : null,
        chapter_no: chapterNo,
        chapter_title: typeof row?.chapter_title === 'string' ? row.chapter_title.trim() || null : null,
        content: typeof row?.content === 'string' ? row.content : null,
        sort_order: chapterNo ? chapterNo : index + 1,
      }
    })

    const hasAnyText = normalized.some((c) => typeof c.content === 'string' && c.content.trim())
    if (!hasAnyText) {
      return NextResponse.json({ error: 'OCR 文本为空' }, { status: 502 })
    }

    const { error: delError } = await supabase.from('library_book_contents').delete().eq('book_id', bookId)
    if (delError) {
      console.error('[OCR Route] Failed to delete old chapters:', delError)
      return NextResponse.json({ error: '清理旧章节失败: ' + (delError.message || '数据库删除错误') }, { status: 500 })
    }

    const chunkSize = 200
    for (let i = 0; i < normalized.length; i += chunkSize) {
      const chunk = normalized.slice(i, i + chunkSize)
      const { error: insError } = await supabase.from('library_book_contents').insert(chunk)
      if (insError) {
        console.error('[OCR Route] Failed to insert chapters chunk:', insError, 'chunk size:', chunk.length)
        return NextResponse.json({ error: '保存 OCR 结果失败: ' + (insError.message || '数据库插入错误') }, { status: 500 })
      }
    }

    const { data: saved, error: reloadError } = await supabase
      .from('library_book_contents')
      .select('id, volume_no, volume_title, chapter_no, chapter_title, content, sort_order')
      .eq('book_id', bookId)
      .order('sort_order', { ascending: true })

    if (reloadError || !saved) {
      return NextResponse.json({ error: '读取 OCR 结果失败' }, { status: 500 })
    }

    const contentText = buildContentTextFromChapters(saved as any)
    if (contentText) {
      await supabase
        .from('library_books')
        .update({ content_text: contentText, updated_at: new Date().toISOString() } as any)
        .eq('id', bookId)
    }

    return NextResponse.json({ chapters: saved as ChapterRow[], cached: false })
  } catch (e: any) {
    console.error('[OCR Route] Unhandled error:', e)
    console.error('[OCR Route] Error type:', typeof e)
    console.error('[OCR Route] Error constructor:', e?.constructor?.name)
    console.error('[OCR Route] Error keys:', Object.keys(e || {}))
    const stack = typeof e?.stack === 'string' ? e.stack : undefined
    if (stack) {
      console.error('[OCR Route] Error stack:', stack)
    }
    
    // Check for connection errors in outer catch
    const msg = typeof e?.message === 'string' ? e.message : String(e) || '服务器内部错误'
    const code = typeof e?.code === 'string' ? e.code : null
    const errno = typeof e?.errno === 'number' ? e.errno : null
    const syscall = typeof e?.syscall === 'string' ? e.syscall : null
    
    console.error('[OCR Route] Error details:', { msg, code, errno, syscall })
    
    const isConnectionError = 
      code === 'ECONNREFUSED' || 
      code === 'ETIMEDOUT' ||
      errno === -61 || // ECONNREFUSED on macOS
      errno === -111 || // ECONNREFUSED on Linux
      msg.includes('ECONNREFUSED') ||
      msg.includes('connection refused') ||
      msg.includes('connect ECONNREFUSED') ||
      msg.includes('ECONNREFUSED')
    
    if (isConnectionError) {
      const endpoints = getOcrEndpoints()
      const ocrEndpoint = endpoints.pdf || endpoints.slices || 'http://127.0.0.1:8008'
      const errorMsg = `无法连接到 OCR 服务 (${ocrEndpoint})。请确认 OCR 服务正在运行。\n\n启动命令: python3 ocr_service/server.py serve --host 127.0.0.1 --port 8008`
      console.error('[OCR Route] Connection error in outer catch:', errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 502 })
    }
    
    const errorDetails = process.env.NODE_ENV === 'development' ? { message: msg, code, errno, syscall, stack } : { message: msg }
    return NextResponse.json({ error: msg, ...(process.env.NODE_ENV === 'development' ? { details: errorDetails } : {}) }, { status: 500 })
  }
}
