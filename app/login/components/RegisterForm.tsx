'use client'

import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { getCurrentUser } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/client'
import { Github } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface RegisterFormProps {
  onSwitchToLogin?: () => void
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // 检查是否已登录，如果已登录则重定向
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (user) {
        const redirect = searchParams.get('redirect') || '/'
        router.push(redirect)
      }
    }
    checkAuth()
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // 验证密码匹配
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    // 验证密码长度
    if (password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      if (!supabase) {
        setError('认证服务未配置，请联系管理员')
        setLoading(false)
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            nickname: email.split('@')[0], // 使用邮箱前缀作为默认昵称
          },
        },
      })

      if (signUpError) {
        // 提供更友好的错误提示
        let errorMessage = '注册失败，请稍后重试'
        if (signUpError.message.includes('User already registered')) {
          errorMessage = '该邮箱已被注册，请直接登录'
        } else if (signUpError.message.includes('Password should be at least')) {
          errorMessage = '密码长度不符合要求，请使用至少6位字符'
        } else if (signUpError.message.includes('Invalid email')) {
          errorMessage = '邮箱格式不正确，请检查后重试'
        } else if (signUpError.message.includes('Email rate limit exceeded')) {
          errorMessage = '发送邮件过于频繁，请稍后再试'
        } else {
          errorMessage = signUpError.message || errorMessage
        }
        setError(errorMessage)
        setLoading(false)
        return
      }

      if (data?.user) {
        // 确保 profiles 记录已创建（触发器会自动创建，但这里做双重保险）
        if (data.session) {
          // 如果有 session，说明邮箱验证已禁用，直接创建 profile
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                nickname: email.split('@')[0],
                role: 'user',
              }, {
                onConflict: 'id',
              })

            if (profileError) {
              console.warn('Failed to create profile:', profileError)
              // 不阻止注册流程，因为触发器应该已经创建了
            }
          } catch (err) {
            console.warn('Error creating profile:', err)
            // 不阻止注册流程
          }

          // 自动登录成功，跳转到指定页面或首页
          const redirect = searchParams.get('redirect') || '/'
          setTimeout(() => {
            router.push(redirect)
            router.refresh()
          }, 1000)
        } else {
          // 需要邮箱验证，显示成功消息
          setSuccess(true)
        }
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient()
      if (!supabase) {
        setError('认证服务未配置，请联系管理员')
        return
      }

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        setError(signInError.message || 'Google登录失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google登录失败，请稍后重试')
    }
  }

  const handleGitHubLogin = async () => {
    try {
      const supabase = createClient()
      if (!supabase) {
        setError('认证服务未配置，请联系管理员')
        return
      }

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        setError(signInError.message || 'GitHub登录失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub登录失败，请稍后重试')
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-2">注册成功！</h3>
            <p className="text-sm text-white/60 mb-2">
              我们已向 <span className="text-white/80 font-medium">{email}</span> 发送了验证链接
            </p>
            <p className="text-xs text-white/50">
              请查收邮件并点击验证链接完成注册。验证后即可登录。
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <Button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300"
          >
            返回登录
          </Button>
          <button
            type="button"
            onClick={async () => {
              const supabase = createClient()
              if (supabase) {
                try {
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: email,
                    options: {
                      emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                  })
                  if (error) {
                    setError('重新发送失败：' + error.message)
                  } else {
                    setError('')
                    // 使用更友好的提示方式
                    const messageEl = document.createElement('div')
                    messageEl.className = 'fixed top-4 right-4 bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-300 px-4 py-2 rounded z-50'
                    messageEl.textContent = '验证邮件已重新发送，请查收'
                    document.body.appendChild(messageEl)
                    setTimeout(() => {
                      document.body.removeChild(messageEl)
                    }, 3000)
                  }
                } catch (err) {
                  setError('重新发送失败：' + (err instanceof Error ? err.message : '未知错误'))
                }
              }
            }}
            className="w-full text-sm text-white/60 hover:text-white/80 transition-colors underline"
          >
            未收到邮件？点击重新发送
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 邮箱输入 */}
        <div className="space-y-2">
          <Label htmlFor="register-email" className="text-xs text-white/60 uppercase tracking-widest pl-1">
            邮箱地址
          </Label>
          <Input
            id="register-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/30 focus:ring-0 transition-all duration-300 h-11"
          />
        </div>

        {/* 密码输入 */}
        <div className="space-y-2">
          <Label htmlFor="register-password" className="text-xs text-white/60 uppercase tracking-widest pl-1">
            密码
          </Label>
          <Input
            id="register-password"
            type="password"
            placeholder="至少6位字符"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/30 focus:ring-0 transition-all duration-300 h-11"
          />
        </div>

        {/* 确认密码输入 */}
        <div className="space-y-2">
          <Label htmlFor="register-confirm-password" className="text-xs text-white/60 uppercase tracking-widest pl-1">
            确认密码
          </Label>
          <Input
            id="register-confirm-password"
            type="password"
            placeholder="请再次输入密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/30 focus:ring-0 transition-all duration-300 h-11"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="text-sm text-red-300 bg-red-500/20 backdrop-blur-sm border border-red-500/30 p-3 rounded">
            {error}
          </div>
        )}

        {/* 注册按钮 */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
        >
          {loading ? '注册中...' : '注 册'}
        </Button>
      </form>

      {/* 分割线 */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-2 text-white/40">
            或使用以下方式
          </span>
        </div>
      </div>

      {/* 第三方登录 - 幽灵按钮风格 */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full bg-transparent border-white/10 text-white/80 hover:bg-white/5 hover:text-white hover:border-white/30 h-11 transition-all"
        >
          <svg className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          使用Google账号注册
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleGitHubLogin}
          className="w-full bg-transparent border-white/10 text-white/80 hover:bg-white/5 hover:text-white hover:border-white/30 h-11 transition-all"
        >
          <Github className="mr-2 h-4 w-4" />
          使用 GitHub 注册
        </Button>
      </div>

      {/* 登录链接 */}
      <div className="mt-6 text-center text-sm text-white/40 font-light">
        已有账号？
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-white hover:underline underline-offset-4 ml-1 font-normal"
        >
          立即登录
        </button>
      </div>
    </>
  )
}

