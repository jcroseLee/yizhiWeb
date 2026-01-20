import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// 需要认证的路由
const protectedRoutes = [
  '/profile',
  '/messages',
  '/community/publish',
  '/community/drafts',
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

  // 对所有匹配的路由都运行 updateSession，以刷新 session
  const { supabaseResponse, user } = await updateSession(request)

  // 如果既不是受保护路由也不是公开路由，直接返回更新后的 response
  if (!isProtectedRoute && !isPublicRoute) {
    return supabaseResponse
  }

  // 如果是受保护的路由
  if (isProtectedRoute) {
    // 如果检测到 user，允许访问
    if (user) {
      return supabaseResponse
    }
    
    // 如果没有检测到 user，重定向到登录页并带上 redirect 参数
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  // 如果是公开路由（登录/注册页）且有 user，重定向
  if (isPublicRoute && user) {
    const redirect = request.nextUrl.searchParams.get('redirect')
    if (redirect) {
      return NextResponse.redirect(new URL(redirect, request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
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
