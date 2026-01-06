import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

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

export async function POST(_req: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const params = await context.params
  const rawBookId = params.bookId

  const bookId = decodeURIComponent(String(rawBookId || '')).trim()
  if (!bookId) {
    return NextResponse.json({ error: 'missing book id' }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()

  const { data: existing, error: findError } = await supabase
    .from('library_book_contents')
    .select('id, volume_no, volume_title, chapter_no, chapter_title, content, sort_order')
    .eq('book_id', bookId)
    .order('sort_order', { ascending: true })

  if (!findError && existing && existing.length > 0) {
    return NextResponse.json({ chapters: existing as ChapterRow[], cached: true })
  }

  const { data: book, error: bookError } = await supabase
    .from('library_books')
    .select('id, title, pdf_url, source_type, source_url, source_payload')
    .eq('id', bookId)
    .maybeSingle()

  if (bookError) {
    return NextResponse.json({ error: '加载书籍失败' }, { status: 500 })
  }

  if (!book) {
    return NextResponse.json({ error: '未找到书籍' }, { status: 404 })
  }

  const body = await _req.json().catch(() => null)
  const manifestUrlFromBody =
    isRecord(body) && typeof (body as any).manifest_url === 'string' ? String((body as any).manifest_url).trim() : ''

  const pdfUrlRaw = (book as any).pdf_url || ((book as any).source_payload && (book as any).source_payload.download_url) || (book as any).source_url
  const pdfUrl = typeof pdfUrlRaw === 'string' ? pdfUrlRaw.trim() : ''

  const sourcePayload = (book as any).source_payload as unknown
  const manifestUrl = (() => {
    if (!isRecord(sourcePayload)) return ''
    const slices = sourcePayload.slices
    if (!isRecord(slices)) return ''
    const u = slices.manifest_url
    return typeof u === 'string' ? u.trim() : ''
  })()

  const finalManifestUrl = manifestUrlFromBody || manifestUrl
  if (!pdfUrl && !finalManifestUrl) {
    return NextResponse.json({ error: '该书籍未绑定 PDF/切片，无法 OCR' }, { status: 400 })
  }

  const endpoints = getOcrEndpoints()
  const preferSlices = !!finalManifestUrl
  const ocrEndpoint = preferSlices ? endpoints.slices : endpoints.pdf
  if (!ocrEndpoint) {
    return NextResponse.json({ error: 'OCR 服务未配置 (缺少 OCR_SERVICE_URL)' }, { status: 500 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 600_000)
  let res: Response
  try {
    res = await fetch(ocrEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(preferSlices ? { manifest_url: finalManifestUrl } : { pdf_url: pdfUrl }),
        book_id: bookId,
        title: (book as any).title || '',
        ...(preferSlices ? {} : { mode: 'ocr' }),
        ...(isRecord(body) && typeof (body as any).max_pages === 'number' ? { max_pages: (body as any).max_pages } : {}),
        ...(isRecord(body) && typeof (body as any).page_start === 'number' ? { page_start: (body as any).page_start } : {}),
        ...(isRecord(body) && typeof (body as any).page_end === 'number' ? { page_end: (body as any).page_end } : {}),
      }),
      signal: controller.signal,
    })
  } catch (e: any) {
    clearTimeout(timeout)
    const msg = typeof e?.message === 'string' ? e.message : 'OCR 请求失败'
    return NextResponse.json({ error: msg }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }

  const payload = (await res.json().catch(() => null)) as any

  if (!res.ok) {
    const msg =
      payload && typeof payload?.error === 'string'
        ? payload.error
        : payload && typeof payload?.detail === 'string'
          ? payload.detail
          : payload && payload?.detail
            ? JSON.stringify(payload.detail)
            : `OCR 服务错误 (${res.status})`
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const chapters = Array.isArray(payload?.chapters) ? payload.chapters : []
  if (!chapters.length) {
    return NextResponse.json({ error: 'OCR 服务未返回章节内容' }, { status: 502 })
  }

  const normalized: ChapterInsertRow[] = chapters.map((c: unknown, index: number) => {
    const row = c as any
    return {
    book_id: bookId,
    volume_no: typeof row?.volume_no === 'number' ? row.volume_no : null,
    volume_title: typeof row?.volume_title === 'string' ? row.volume_title.trim() || null : null,
    chapter_no: typeof row?.chapter_no === 'number' ? row.chapter_no : null,
    chapter_title: typeof row?.chapter_title === 'string' ? row.chapter_title.trim() || null : null,
    content: typeof row?.content === 'string' ? row.content : null,
    sort_order: typeof row?.sort_order === 'number' ? row.sort_order : index + 1,
    }
  })

  const withContent = normalized.filter((c) => typeof c.content === 'string' && c.content.trim())
  if (!withContent.length) {
    return NextResponse.json({ error: 'OCR 文本为空' }, { status: 502 })
  }

  const { error: delError } = await supabase.from('library_book_contents').delete().eq('book_id', bookId)
  if (delError) {
    return NextResponse.json({ error: '清理旧章节失败' }, { status: 500 })
  }

  const chunkSize = 200
  for (let i = 0; i < withContent.length; i += chunkSize) {
    const chunk = withContent.slice(i, i + chunkSize)
    const { error: insError } = await supabase.from('library_book_contents').insert(chunk)
    if (insError) {
      return NextResponse.json({ error: '保存 OCR 结果失败' }, { status: 500 })
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

  return NextResponse.json({ chapters: saved as ChapterRow[], cached: false })
}
