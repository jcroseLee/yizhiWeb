'use client'

import { getSupabaseClient } from '@/lib/services/supabaseClient'
import { useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function AuthCallbackContent() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('正在验证...')

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setStatus('error')
        setMessage('认证服务未配置')
        return
      }

      // 获取 URL 中的参数（Supabase 可能使用 hash 或 query 参数）
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const queryParams = new URLSearchParams(window.location.search)
      
      // 优先使用 hash 参数，如果没有则使用 query 参数
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
      const error = hashParams.get('error') || queryParams.get('error')
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description')
      const code = hashParams.get('code') || queryParams.get('code')

      // 检查是否有错误
      if (error) {
        setStatus('error')
        setMessage(errorDescription || error || '验证失败')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
        return
      }

      // 如果有 code，使用 code 交换 session（PKCE flow）
      if (code) {
        try {
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (sessionError) {
            setStatus('error')
            setMessage(sessionError.message || '设置会话失败')
            setTimeout(() => {
              router.push('/login')
            }, 3000)
            return
          }

          if (data?.user) {
            // 确保 profiles 记录存在
            try {
              await supabase
                .from('profiles')
                .upsert({
                  id: data.user.id,
                  nickname: data.user.email?.split('@')[0] || '用户',
                  role: 'user',
                }, {
                  onConflict: 'id',
                })
            } catch (err) {
              console.warn('Error ensuring profile:', err)
              // 不阻止验证流程
            }

            setStatus('success')
            setMessage('验证成功！正在跳转...')
            setTimeout(() => {
              router.push('/')
              router.refresh()
            }, 1500)
          }
        } catch (err) {
          setStatus('error')
          setMessage(err instanceof Error ? err.message : '验证过程中发生错误')
          setTimeout(() => {
            router.push('/login')
          }, 3000)
        }
        return
      }

      // 如果有 token，设置 session（传统 flow）
      if (accessToken && refreshToken) {
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            setStatus('error')
            setMessage(sessionError.message || '设置会话失败')
            setTimeout(() => {
              router.push('/login')
            }, 3000)
            return
          }

          if (data?.user) {
            // 确保 profiles 记录存在
            try {
              await supabase
                .from('profiles')
                .upsert({
                  id: data.user.id,
                  nickname: data.user.email?.split('@')[0] || '用户',
                  role: 'user',
                }, {
                  onConflict: 'id',
                })
            } catch (err) {
              console.warn('Error ensuring profile:', err)
              // 不阻止验证流程
            }

            setStatus('success')
            setMessage('邮箱验证成功！正在跳转...')
            setTimeout(() => {
              router.push('/')
              router.refresh()
            }, 1500)
          }
        } catch (err) {
          setStatus('error')
          setMessage(err instanceof Error ? err.message : '验证过程中发生错误')
          setTimeout(() => {
            router.push('/login')
          }, 3000)
        }
      } else {
        // 检查是否已经登录
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setStatus('success')
          setMessage('您已登录，正在跳转...')
          setTimeout(() => {
            router.push('/')
            router.refresh()
          }, 1500)
        } else {
          setStatus('error')
          setMessage('未找到验证信息，请重新注册')
          setTimeout(() => {
            router.push('/login')
          }, 3000)
        }
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto border-4 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/80">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-500/30">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-white/80">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto bg-red-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-red-500/30">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-red-400">{message}</p>
            <p className="text-white/60 text-sm mt-2">3秒后自动跳转到登录页面</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <p className="text-white/80">正在验证...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
