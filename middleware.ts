import { getServerSession } from '@/lib/utils/createServerClient'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// 需要认证的路由
const protectedRoutes = [
  '/profile',
  '/messages',
  '/community',
  '/masters',
  // 可以根据需要添加更多需要保护的路由
]

// 公开路由（已登录用户访问这些路由时会被重定向）
const publicRoutes = [
  '/login',
  '/register',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 检查是否是受保护的路由
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // 如果既不是受保护路由也不是公开路由，直接放行
  if (!isProtectedRoute && !isPublicRoute) {
    return NextResponse.next()
  }

  // 尝试获取 session
  // 注意：Supabase 的 session 主要在客户端管理（localStorage）
  // 在中间件中可能无法准确读取，所以我们使用宽松的策略
  // 让客户端组件做最终的认证检查
  const session = await getServerSession(request)

  // 如果是受保护的路由
  if (isProtectedRoute) {
    // 如果检测到 session，允许访问
    if (session) {
      return NextResponse.next()
    }
    
    // 如果没有检测到 session，我们仍然允许访问
    // 让客户端组件做最终的认证检查
    // 这样可以避免因为中间件无法读取 localStorage 中的 session 而误判
    // 客户端组件会检查用户是否登录，如果未登录会重定向
    return NextResponse.next()
  }

  // 如果是公开路由（登录/注册页）且有 session，重定向
  if (isPublicRoute && session) {
    const redirect = request.nextUrl.searchParams.get('redirect')
    if (redirect) {
      return NextResponse.redirect(new URL(redirect, request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

