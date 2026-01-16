export type EventName =
  | 'tool_divination_start'
  | 'tool_param_toggle'
  | 'tool_divination_complete'
  | 'tool_result_view'
  | 'tool_result_share'
  | 'tool_view_relationship'
  | 'ai_analysis_click'
  | 'ai_pay_confirm'
  | 'ai_pay_cancel'
  | 'ai_response_complete'
  | 'ai_analysis_error'
  | 'ai_feedback'
  | 'post_publish'
  | 'case_feedback_update'
  | 'post_interaction'
  | 'coin_bounty_set'
  | 'library_entry_click'
  | 'library_search'
  | 'library_book_read'
  | 'library_text_copy'
  | 'user_checkin'
  | 'user_level_up'

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type AnalyticsProperties = Record<string, JsonValue | undefined>

type AnalyticsContext = {
  user_id_hash?: string
  user_level?: number
  device_type?: 'mobile' | 'tablet' | 'desktop' | 'unknown'
  session_token?: string
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

let context: AnalyticsContext = {}
let cachedDeviceType: AnalyticsContext['device_type'] | null = null

function getDeviceType(): AnalyticsContext['device_type'] {
  if (cachedDeviceType) return cachedDeviceType
  if (typeof window === 'undefined') return 'unknown'

  const w = window.innerWidth || 0
  if (w > 0) {
    if (w < 640) return (cachedDeviceType = 'mobile')
    if (w < 1024) return (cachedDeviceType = 'tablet')
    return (cachedDeviceType = 'desktop')
  }
  return (cachedDeviceType = 'unknown')
}

function safeJsonValue(input: unknown): JsonValue {
  if (input === null) return null
  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return input
  if (Array.isArray(input)) return input.map(safeJsonValue)
  if (typeof input === 'object') {
    const out: Record<string, JsonValue> = {}
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (typeof v === 'undefined') continue
      out[k] = safeJsonValue(v)
    }
    return out
  }
  return String(input)
}

function buildPayload(name: string, properties: AnalyticsProperties) {
  const deviceType = context.device_type || getDeviceType()
  const cleanedValue = safeJsonValue(properties)
  const cleanedProps =
    cleanedValue && typeof cleanedValue === 'object' && !Array.isArray(cleanedValue)
      ? (cleanedValue as Record<string, JsonValue>)
      : {}

  const merged: Record<string, JsonValue> = {
    ...cleanedProps,
    user_id: context.user_id_hash ?? null,
    user_level: typeof context.user_level === 'number' ? context.user_level : null,
    device_type: deviceType ?? 'unknown',
    timestamp: new Date().toISOString(),
  }
  return { name, properties: merged }
}

export function setAnalyticsContext(next: Partial<AnalyticsContext>) {
  context = { ...context, ...next }
  if (next.device_type) cachedDeviceType = next.device_type
}

export async function hashUserId(input: string): Promise<string> {
  if (typeof window === 'undefined') return input
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function trackEvent(name: EventName | (string & {}), properties: AnalyticsProperties = {}) {
  if (typeof window === 'undefined') return

  const payload = buildPayload(name, properties)

  if (process.env.NODE_ENV === 'development') {
    try {
      console.group(`[Analytics] ${payload.name}`)
      console.log(payload.properties)
      console.groupEnd()
    } catch {}
  }

  const gtag = window.gtag
  if (typeof gtag === 'function') {
    try {
      gtag('event', payload.name, payload.properties)
    } catch {}
  }

  const body = JSON.stringify({ name: payload.name, properties: payload.properties })

  const token = context.session_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    fetch('/api/analytics', {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
