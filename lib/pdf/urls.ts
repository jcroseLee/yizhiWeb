export type SupabaseStorageObject = {
  bucket: string
  path: string
}

export function parseSupabaseStorageObjectUrl(inputUrl: string, supabaseUrl: string): SupabaseStorageObject | null {
  let u: URL
  let base: URL
  try {
    u = new URL(inputUrl)
    base = new URL(supabaseUrl)
  } catch {
    return null
  }

  if (u.origin !== base.origin) return null

  const prefix = '/storage/v1/object/'
  if (!u.pathname.startsWith(prefix)) return null

  const rest = u.pathname.slice(prefix.length)
  const parts = rest.split('/').filter(Boolean)
  if (parts.length < 2) return null

  // Handle two URL formats:
  // 1. /storage/v1/object/public/{bucket}/{path} or /storage/v1/object/sign/{bucket}/{path}
  // 2. /storage/v1/object/{bucket}/{path} (direct bucket access, e.g., from getPublicUrl)
  let bucket: string
  let pathSegments: string[]
  
  if (parts[0] === 'public' || parts[0] === 'sign') {
    // Format 1: has 'public' or 'sign' prefix
    if (parts.length < 3) return null
    bucket = parts[1]
    pathSegments = parts.slice(2)
  } else {
    // Format 2: direct bucket access (e.g., user_resources bucket)
    bucket = parts[0]
    pathSegments = parts.slice(1)
  }

  if (!bucket || pathSegments.length === 0) return null

  const decodedSegments = pathSegments.map((seg) => {
    try {
      return decodeURIComponent(seg)
    } catch {
      return seg
    }
  })
  const path = decodedSegments.join('/')

  return { bucket, path }
}

export function isAllowedPdfUrl(inputUrl: string, allowedHosts: string[]): boolean {
  let u: URL
  try {
    u = new URL(inputUrl)
  } catch {
    return false
  }

  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false

  const host = u.hostname.toLowerCase()
  if (!host) return false
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false
  if (host.endsWith('.local')) return false

  return allowedHosts.map((h) => h.toLowerCase()).includes(host)
}

