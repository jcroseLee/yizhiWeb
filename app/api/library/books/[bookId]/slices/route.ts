import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function getSliceEndpoint() {
  const direct = (process.env.OCR_SLICE_URL || '').trim()
  if (direct) return direct

  const ocr = (process.env.OCR_SERVICE_URL || '').trim()
  if (ocr) {
    if (/\/ocr\/?$/i.test(ocr)) return ocr.replace(/\/ocr\/?$/i, '/slice_upload')
    return ocr.replace(/\/+$/, '') + '/slice_upload'
  }

  if (process.env.NODE_ENV !== 'production') return 'http://127.0.0.1:8008/slice_upload'
  return ''
}

function getPdfUrl(book: unknown) {
  if (!isRecord(book)) return ''
  const pdfUrlRaw =
    (book as any).pdf_url ||
    ((book as any).source_payload && (book as any).source_payload.download_url) ||
    (book as any).source_url
  return typeof pdfUrlRaw === 'string' ? pdfUrlRaw.trim() : ''
}

function getSupabaseUploadConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  return { supabaseUrl, serviceRoleKey }
}

export async function POST(req: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const params = await context.params
  const rawBookId = params.bookId

  const bookId = decodeURIComponent(String(rawBookId || '')).trim()
  if (!bookId) {
    return NextResponse.json({ error: 'missing book id' }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()

  const { data: book, error: bookError } = await supabase
    .from('library_books')
    .select('id, title, pdf_url, source_url, source_payload')
    .eq('id', bookId)
    .maybeSingle()

  if (bookError) return NextResponse.json({ error: '加载书籍失败' }, { status: 500 })
  if (!book) return NextResponse.json({ error: '未找到书籍' }, { status: 404 })

  const body = (await req.json().catch(() => null)) as any
  const force = !!body?.force

  const existingPayload = isRecord((book as any).source_payload) ? ((book as any).source_payload as Record<string, unknown>) : null
  const existingSlices = existingPayload && isRecord(existingPayload.slices) ? (existingPayload.slices as Record<string, unknown>) : null
  const existingManifestUrl =
    existingSlices && typeof existingSlices.manifest_url === 'string' && existingSlices.manifest_url.trim()
      ? existingSlices.manifest_url.trim()
      : null

  if (!force && existingManifestUrl) {
    return NextResponse.json(
      {
        slices: {
          manifest_url: existingManifestUrl,
          page_count: typeof existingSlices?.page_count === 'number' ? existingSlices.page_count : null,
          bucket: typeof existingSlices?.bucket === 'string' ? existingSlices.bucket : null,
          prefix: typeof existingSlices?.prefix === 'string' ? existingSlices.prefix : null,
        },
        cached: true,
      },
      { status: 200 }
    )
  }

  const pdfUrl = getPdfUrl(book)
  if (!pdfUrl) {
    return NextResponse.json({ error: '该书籍未绑定 PDF，无法切片' }, { status: 400 })
  }

  const sliceEndpoint = getSliceEndpoint()
  if (!sliceEndpoint) {
    return NextResponse.json({ error: '切片服务未配置 (缺少 OCR_SLICE_URL/OCR_SERVICE_URL)' }, { status: 500 })
  }

  const bucket = (process.env.LIBRARY_PAGES_BUCKET || 'library_pages').trim() || 'library_pages'
  const prefix = `books/${bookId}`
  const dpi = typeof body?.dpi === 'number' && Number.isFinite(body.dpi) ? body.dpi : 200
  const quality = typeof body?.quality === 'number' && Number.isFinite(body.quality) ? body.quality : 82
  const maxPages = typeof body?.max_pages === 'number' && Number.isFinite(body.max_pages) ? body.max_pages : null
  const { supabaseUrl, serviceRoleKey } = getSupabaseUploadConfig()
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: '服务端缺少 SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 600_000)
  let res: Response
  try {
    res = await fetch(sliceEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pdf_url: pdfUrl,
        book_id: bookId,
        title: (book as any).title || '',
        dpi,
        quality,
        max_pages: maxPages,
        bucket,
        prefix,
        supabase_url: supabaseUrl,
        supabase_service_role_key: serviceRoleKey,
      }),
      signal: controller.signal,
    })
  } catch (e: any) {
    clearTimeout(timeout)
    const msg = typeof e?.message === 'string' ? e.message : '切片请求失败'
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
            : `切片服务错误 (${res.status})`
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const manifestUrl = typeof payload?.manifest_url === 'string' ? payload.manifest_url.trim() : ''
  if (!manifestUrl) return NextResponse.json({ error: '切片服务未返回 manifest_url' }, { status: 502 })

  const nextSlices = {
    bucket: typeof payload?.bucket === 'string' ? payload.bucket : bucket,
    prefix: typeof payload?.prefix === 'string' ? payload.prefix : prefix,
    page_count: typeof payload?.page_count === 'number' ? payload.page_count : null,
    manifest_url: manifestUrl,
    updated_at: new Date().toISOString(),
  }

  const nextPayload: Record<string, unknown> = {
    ...(existingPayload || {}),
    slices: nextSlices,
  }

  const { error: updateError } = await supabase
    .from('library_books')
    .update({ source_payload: nextPayload, updated_at: new Date().toISOString() } as any)
    .eq('id', bookId)

  if (updateError) {
    return NextResponse.json({ error: '保存切片信息失败' }, { status: 500 })
  }

  return NextResponse.json({ slices: nextSlices, cached: false }, { status: 200 })
}
