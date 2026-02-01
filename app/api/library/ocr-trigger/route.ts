import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'

function normalizeHttpUrl(raw: string) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed}`
}

function getSliceUploadEndpoint() {
  const ocrService = normalizeHttpUrl((process.env.OCR_SERVICE_URL || '').trim())
  if (ocrService) {
    let base = ocrService.replace(/\/+$/, '')
    // Remove specific paths if present to get base
    base = base.replace(/\/(ocr_slices|ocr|slice_upload_file|slice_upload)\/?$/i, '')
    base = base.replace(/\/+$/, '')
    return `${base}/slice_upload`
  }

  if (process.env.NODE_ENV !== 'production') return 'http://127.0.0.1:8008/slice_upload'
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

    // 2. Parse Body
    const body = await req.json()
    const { file_path, book_id, config } = body

    if (!file_path || !book_id) {
      return NextResponse.json(
        { message: 'Missing file_path or book_id' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 3. Generate Signed URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { message: 'Server configuration error: Missing Supabase credentials' },
        { status: 500, headers: corsHeaders }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Extract bucket and path
    // Assuming file_path is like "bucket_name/path/to/file" or just "path/to/file" if we enforce a bucket
    // The user instruction says: "frontend uploads to 'raw_books'"
    // So file_path might be "path/to/file" inside "raw_books" or "raw_books/path/to/file"
    // Let's assume the frontend sends the full path including bucket if it's not the default? 
    // Or better, let frontend send `bucket` and `path`.
    // But the prompt says "接收 file_path, book_id, config".
    // I will assume file_path includes bucket name as the first segment, OR I default to 'raw_books'.
    // Let's try to detect if the first segment is a known bucket.
    // Actually, `supabase.storage.from('raw_books').upload()` returns a path like `folder/file.pdf`. It does NOT include the bucket name in the returned `path`.
    // So I should assume a default bucket 'raw_books', or allow config to specify it.
    
    let bucket = 'raw_books'
    let path = file_path

    if (config?.bucket) {
        bucket = config.bucket
    }

    // Generate Signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(path, 3600)

    if (signedUrlError || !signedUrlData?.signedUrl) {
       console.error('Failed to generate signed URL:', signedUrlError)
       return NextResponse.json(
         { message: 'Failed to access uploaded file', error: signedUrlError?.message },
         { status: 400, headers: corsHeaders }
       )
    }

    const pdfUrl = signedUrlData.signedUrl

    // 4. Call OCR Service
    const targetUrl = getSliceUploadEndpoint()
    if (!targetUrl) {
      return NextResponse.json(
        { message: 'OCR configuration error', error: 'Missing OCR_SERVICE_URL' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Prepare payload for OCR service (SliceUploadRequest)
    const payload = {
      pdf_url: pdfUrl,
      book_id: book_id,
      title: config?.title,
      auto_ocr: config?.auto_ocr ?? true,
      ocr_engine: config?.ocr_engine || 'paddle',
      bucket: 'library_pages', // Destination bucket for slices
      // We can pass other params if needed
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 600_000) // 10 min timeout for the request to initiate? 
    // Actually slice_upload might take a while to download and process.
    // But since it runs auto_ocr in background thread, the main request handles PDF download + Slicing + Uploading Slices.
    // This can still take time for large files.
    
    let proxyResponse: Response
    try {
      proxyResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } catch (e) {
      clearTimeout(timeout)
      const detail = toErrorMessage(e)
      console.error('OCR Trigger fetch failed:', detail)
      return NextResponse.json(
        { message: 'Upstream fetch failed', error: detail },
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
    console.error('OCR Trigger Error:', error)
    return NextResponse.json(
      { message: 'Internal Server Error', error: toErrorMessage(error) },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
