import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'

function normalizeHttpUrl(raw: string) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed}`
}

function getSliceUploadFileEndpoint() {
  const direct = normalizeHttpUrl((process.env.OCR_SLICE_UPLOAD_FILE_URL || '').trim())
  if (direct) return direct.replace(/\/+$/, '')

  const ocrService = normalizeHttpUrl((process.env.OCR_SERVICE_URL || '').trim())
  if (ocrService) {
    let base = ocrService.replace(/\/+$/, '')
    base = base.replace(/\/(ocr_slices|ocr|slice_upload_file|slice_upload)\/?$/i, '')
    base = base.replace(/\/+$/, '')
    return `${base}/slice_upload_file`
  }

  if (process.env.NODE_ENV !== 'production') return 'http://127.0.0.1:8008/slice_upload_file'
  return ''
}

function toErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

function safeUrlForLog(rawUrl: string) {
  try {
    const u = new URL(rawUrl)
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    return rawUrl
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validation: User Permission (Admin)
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { message: 'Missing Authorization header' },
        { status: 401, headers: corsHeaders }
      )
    }

    const authResult = await getAdminContext(token)
    if (!authResult.ok) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status, headers: corsHeaders }
      )
    }

    // 2. Parse FormData
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { message: 'File is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 3. Validation: File Type (PDF Only)
    const fileName = file.name || ''
    const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return NextResponse.json(
        { message: 'Only PDF files are allowed' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 4. Validation: File Size (Max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { message: 'File size exceeds 100MB limit' },
        { status: 413, headers: corsHeaders }
      )
    }

    // 5. Proxy Logic: Forward to OCR Service
    const targetUrl = getSliceUploadFileEndpoint()
    if (!targetUrl) {
      console.error('Slice upload endpoint is not configured')
      return NextResponse.json(
        { message: 'OCR configuration error', error: 'Missing OCR_SERVICE_URL/OCR_SLICE_UPLOAD_FILE_URL' },
        { status: 500, headers: corsHeaders }
      )
    }
    
    const url = new URL(targetUrl)
    const bookId = String(formData.get('book_id') || '').trim()
    const title = String(formData.get('title') || '').trim()
    const autoOcrRaw = String(formData.get('auto_ocr') || '').trim()
    const ocrEngine = String(formData.get('ocr_engine') || '').trim()
    if (bookId) url.searchParams.set('book_id', bookId)
    if (title) url.searchParams.set('title', title)
    if (autoOcrRaw) url.searchParams.set('auto_ocr', autoOcrRaw)
    if (ocrEngine) url.searchParams.set('ocr_engine', ocrEngine)

    const pdfBytes = Buffer.from(await file.arrayBuffer())

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 600_000)
    let proxyResponse: Response
    try {
      proxyResponse = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/pdf' },
        body: pdfBytes,
        signal: controller.signal,
      })
    } catch (e) {
      clearTimeout(timeout)
      const detail = toErrorMessage(e)
      console.error('Upload Proxy fetch failed:', detail, 'target:', safeUrlForLog(url.toString()))
      return NextResponse.json(
        { message: 'Upstream fetch failed', error: detail, target: safeUrlForLog(url.toString()) },
        { status: 502, headers: corsHeaders }
      )
    } finally {
      clearTimeout(timeout)
    }

    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text()
      console.error('OCR Service Error:', errorText)
      return NextResponse.json(
        { message: 'OCR Service failed', error: errorText },
        { status: proxyResponse.status, headers: corsHeaders }
      )
    }

    const data = await proxyResponse.json()
    return NextResponse.json(data, { headers: corsHeaders })

  } catch (error) {
    console.error('Upload Proxy Error:', error)
    return NextResponse.json(
      { message: 'Internal Server Error', error: toErrorMessage(error) },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
