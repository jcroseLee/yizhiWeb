import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type LoginIntent =
  | { type: 'post_like'; postId: string; returnTo: string; createdAt: number }
  | { type: 'post_favorite'; postId: string; returnTo: string; createdAt: number }
  | { type: 'comment_like'; commentId: string; returnTo: string; createdAt: number }
  | { type: 'comment_focus'; postId: string; returnTo: string; createdAt: number }
  | { type: 'follow_user'; userId: string; returnTo: string; createdAt: number }
  | { type: 'create_post'; returnTo: string; createdAt: number }

type LoginIntentSetInput = LoginIntent extends infer T
  ? (T extends any ? Omit<T, 'createdAt' | 'returnTo'> & { returnTo?: string } : never)
  : never

const LOGIN_INTENT_STORAGE_KEY = 'yi_login_intent_v1'

/**
 * 获取当前用户会话
 * @returns Promise<Session | null>
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient()
  if (!supabase) return null

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * 获取当前用户
 * @returns Promise<User | null>
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * 检查用户是否已登录
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}

/**
 * 登出用户
 * @returns Promise<void>
 */
export async function signOut(): Promise<void> {
  const supabase = createClient()
  if (!supabase) return

  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

/**
 * 监听认证状态变化
 * @param callback 状态变化时的回调函数
 * @returns 取消监听的函数
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const supabase = createClient()
  if (!supabase) {
    return () => {}
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })

  return () => {
    subscription.unsubscribe()
  }
}

/**
 * 更新用户手机号（发送验证码）
 * @param phone 新手机号
 * @returns Promise<{ error?: { message: string } }>
 */
export async function updateUserPhone(phone: string) {
  try {
    const res = await fetch('/api/sms/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { error: { message: data.error || '发送验证码失败' } }
    }
    return { data }
  } catch (error: any) {
    return { error: { message: error.message || '发送请求失败' } }
  }
}

/**
 * 验证更换手机号的验证码
 * @param phone 新手机号
 * @param token 验证码
 * @returns Promise<{ error?: { message: string } }>
 */
export async function verifyPhoneChange(phone: string, token: string) {
  try {
    const res = await fetch('/api/user/update-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code: token }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { error: { message: data.error || '绑定失败' } }
    }
    return { data }
  } catch (error: any) {
    return { error: { message: error.message || '发送请求失败' } }
  }
}

export function getCurrentPathWithSearchAndHash() {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function setLoginIntent(intent: LoginIntentSetInput) {
  if (typeof window === 'undefined') return
  const fullIntent = {
    ...intent,
    returnTo: intent.returnTo ?? getCurrentPathWithSearchAndHash(),
    createdAt: Date.now(),
  } as LoginIntent
  window.localStorage.setItem(LOGIN_INTENT_STORAGE_KEY, JSON.stringify(fullIntent))
}

export function getLoginIntent(): LoginIntent | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(LOGIN_INTENT_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LoginIntent
  } catch {
    return null
  }
}

export function clearLoginIntent() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOGIN_INTENT_STORAGE_KEY)
}

export function redirectToLogin(options?: { redirect?: string }) {
  if (typeof window === 'undefined') return
  const redirect = options?.redirect ?? getCurrentPathWithSearchAndHash()
  const url = new URL('/login', window.location.origin)
  url.searchParams.set('redirect', redirect)
  window.location.href = url.toString()
}

export async function requireLogin(intent?: LoginIntentSetInput) {
  const user = await getCurrentUser()
  if (user) return user
  if (intent) {
    setLoginIntent(intent)
  }
  redirectToLogin()
  return null
}
