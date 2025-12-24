import { getSupabaseClient } from './supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

/**
 * 获取当前用户会话
 * @returns Promise<Session | null>
 */
export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()
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
  const supabase = getSupabaseClient()
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
  const supabase = getSupabaseClient()
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

