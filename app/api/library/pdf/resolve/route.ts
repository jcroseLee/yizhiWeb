import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { isAllowedPdfUrl, parseSupabaseStorageObjectUrl } from '@/lib/pdf/urls'
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

/**
 * @swagger
 * /api/library/pdf/resolve:
 *   get:
 *     summary: GET /api/library/pdf/resolve
 *     description: Auto-generated description for GET /api/library/pdf/resolve
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
export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const rawUrl = requestUrl.searchParams.get('url')

  if (!rawUrl) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!supabaseUrl) return NextResponse.json({ error: 'missing supabase url' }, { status: 500 })

  const allowedHosts = getAllowedHosts()
  if (!isAllowedPdfUrl(rawUrl, allowedHosts)) {
    return NextResponse.json({ error: 'url not allowed' }, { status: 400 })
  }

  const parsed = parseSupabaseStorageObjectUrl(rawUrl, supabaseUrl)
  if (!parsed) return NextResponse.json({ url: rawUrl, mode: 'direct' })

  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60)
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'failed to sign url' }, { status: 502 })

  return NextResponse.json({ url: data.signedUrl, mode: 'signed' })
}

