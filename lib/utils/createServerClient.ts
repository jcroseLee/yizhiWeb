import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/**
 * 在服务端创建 Supabase 客户端
 * 用于中间件和服务器组件
 */
export function createServerSupabaseClient(request?: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  // 在中间件中，我们需要从 request 中读取 cookie
  // 在服务器组件中，我们可以使用 next/headers 的 cookies()
  let cookieStore: any = null

  if (request) {
    // 中间件环境：从 request 创建 cookie store
    cookieStore = {
      get: (name: string) => {
        const cookie = request.cookies.get(name)
        return cookie ? { name: cookie.name, value: cookie.value } : undefined
      },
      getAll: () => {
        return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
      },
    }
  } else {
    // 服务器组件环境：使用 next/headers
    try {
      cookieStore = cookies()
    } catch (e) {
      // 如果不在服务器组件环境中，返回 null
      return null
    }
  }

  // 创建 Supabase 客户端，配置为从 cookie 读取 session
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => {
          // Supabase 使用特定的 key 格式存储 session
          // 尝试从 cookie 中读取
          const cookie = cookieStore.get(key)
          return cookie?.value || null
        },
        setItem: () => {
          // 在服务端不设置
        },
        removeItem: () => {
          // 在服务端不删除
        },
      },
    },
  })

  return supabase
}

/**
 * 在中间件中获取用户 session
 */
export async function getServerSession(request: NextRequest) {
  const supabase = createServerSupabaseClient(request)
  if (!supabase) {
    return null
  }

  try {
    // 尝试从所有可能的 cookie 中读取 session
    // Supabase 使用 sb-<project-ref>-auth-token 格式的 cookie
    const allCookies = request.cookies.getAll()
    
    // 查找 Supabase auth token cookie
    for (const cookie of allCookies) {
      if (cookie.name.includes('auth-token') || 
          (cookie.name.startsWith('sb-') && cookie.name.includes('auth'))) {
        try {
          // 尝试解析 cookie 值
          let token: string | undefined
          try {
            const parsed = JSON.parse(cookie.value)
            token = parsed.access_token || parsed
          } catch {
            token = cookie.value
          }

          if (token) {
            const { data, error } = await supabase.auth.getUser(token)
            if (!error && data?.user) {
              return { user: data.user }
            }
          }
        } catch (e) {
          // 继续尝试下一个 cookie
        }
      }
    }

    // 如果找不到 cookie，尝试使用 getSession（需要正确的 cookie 配置）
    // 但这个方法在中间件中可能不工作，因为 Supabase 的 cookie 格式特殊
    return null
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}

