import { isAllowedPdfUrl, parseSupabaseStorageObjectUrl } from '@/lib/pdf/urls'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const getAllowedHosts = () => {
  const out = new Set<string>()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (supabaseUrl) {
    try {
      out.add(new URL(supabaseUrl).hostname)
    } catch {}
  }
  out.add('www.homeinmists.com')
  out.add('homeinmists.com')
  out.add('raw.githubusercontent.com')
  return Array.from(out)
}

const resolveUrl = async (rawUrl: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!supabaseUrl) return rawUrl

  const parsed = parseSupabaseStorageObjectUrl(rawUrl, supabaseUrl)
  if (!parsed) return rawUrl

  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60)
  if (error || !data?.signedUrl) return rawUrl
  return data.signedUrl
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, HEAD, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    },
  })
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const rawUrl = requestUrl.searchParams.get('url')

  if (!rawUrl) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  const allowedHosts = getAllowedHosts()
  if (!isAllowedPdfUrl(rawUrl, allowedHosts)) {
    return NextResponse.json({ error: 'url not allowed' }, { status: 400 })
  }

  const resolvedUrl = await resolveUrl(rawUrl)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  let upstream: Response
  try {
    upstream = await fetch(resolvedUrl, { redirect: 'follow', signal: controller.signal })
  } catch {
    clearTimeout(timeout)
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }

  if (!upstream.ok) return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 })

  const contentType = upstream.headers.get('content-type') || 'application/pdf'
  const contentLength = upstream.headers.get('content-length')

  const headers = new Headers()
  headers.set('content-type', contentType)
  headers.set('content-disposition', 'inline')
  headers.set('cache-control', 'private, max-age=600')
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-methods', 'GET, HEAD, OPTIONS')
  headers.set('access-control-allow-headers', 'Content-Type')
  if (contentLength) headers.set('content-length', contentLength)

  return new NextResponse(upstream.body, { headers })
}

