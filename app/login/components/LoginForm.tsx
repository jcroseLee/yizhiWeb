'use client'

import { Button } from '@/lib/components/ui/button'
import { Checkbox } from '@/lib/components/ui/checkbox'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { getCurrentUser } from '@/lib/services/auth'
import { getSupabaseClient } from '@/lib/services/supabaseClient'
import { Github } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface LoginFormProps {
  onSwitchToRegister?: () => void
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 检查是否已登录，如果已登录则重定向
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (user) {
        const redirect = searchParams.get('redirect') || '/'
        // 使用 window.location 确保完全刷新，让所有状态正确初始化
        window.location.href = redirect
      }
    }
    checkAuth()
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 基本验证
    if (!email.trim()) {
      setError('请输入邮箱地址')
      setLoading(false)
      return
    }

    if (!password) {
      setError('请输入密码')
      setLoading(false)
      return
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('请输入有效的邮箱地址')
      setLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setError('认证服务未配置，请联系管理员')
        setLoading(false)
        return
      }

      // 规范化邮箱地址（去除空格并转为小写）
      const normalizedEmail = email.trim().toLowerCase()
      
      // 调试信息：记录使用的邮箱（不记录密码）
      console.log('🔵 Attempting login with email:', normalizedEmail)
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) {
        // 记录详细错误信息用于调试
        const errorDetails = {
          message: signInError.message,
          status: signInError.status,
          name: signInError.name,
          email: normalizedEmail,
        }
        console.error('🔴 Login error details:', errorDetails)

        // 提供更友好的错误提示
        let errorMessage = '登录失败，请检查邮箱和密码'
        const errorMsg = signInError.message.toLowerCase()
        
        // 根据错误状态码和消息提供更具体的错误提示
        if (signInError.status === 400) {
          if (errorMsg.includes('invalid login credentials') || 
              errorMsg.includes('invalid_credentials') ||
              errorMsg.includes('invalid_grant')) {
            // "Invalid login credentials" 可能表示：
            // 1. 用户不存在
            // 2. 密码错误
            // 3. 邮箱未验证（如果启用了邮箱验证）
            // 
            // 注意：Supabase 出于安全考虑，不会明确区分这些情况
            errorMessage = '邮箱或密码错误。请检查：\n\n• 邮箱地址是否正确（注意大小写和空格）\n• 密码是否正确（注意大小写）\n• 该邮箱是否已注册\n• 如果已注册，请检查邮箱是否已验证'
          } else if (errorMsg.includes('email not confirmed') ||
                     errorMsg.includes('email_not_confirmed')) {
            errorMessage = '请先验证您的邮箱。\n\n我们已向您的邮箱发送了验证链接，请：\n1. 查收您的邮箱（包括垃圾邮件文件夹）\n2. 点击验证链接完成邮箱验证\n3. 验证后再尝试登录'
          } else if (errorMsg.includes('user not found')) {
            errorMessage = '该邮箱未注册，请先注册账户'
          } else if (errorMsg.includes('invalid email')) {
            errorMessage = '邮箱格式不正确，请检查后重试。邮箱格式应为：username@domain.com'
          } else if (errorMsg.includes('password')) {
            errorMessage = '密码错误，请检查后重试。如果忘记密码，可以使用"忘记密码"功能重置。'
          } else {
            errorMessage = `登录失败：${signInError.message || '请检查邮箱和密码'}`
          }
        } else if (signInError.status === 429) {
          errorMessage = '登录尝试次数过多，为了保护您的账户安全，请等待几分钟后再试。'
        } else if (signInError.status === 500 || signInError.status === 502 || signInError.status === 503) {
          errorMessage = '服务器暂时不可用，请稍后重试。如果问题持续存在，请联系技术支持。'
        } else if (signInError.status === 0) {
          errorMessage = '网络连接错误，请检查您的网络连接后重试。'
        } else {
          errorMessage = signInError.message || errorMessage
        }
        
        setError(errorMessage)
        setLoading(false)
        return
      }

      if (data?.user) {
        // 确保 profiles 记录存在（双重保险）
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              nickname: data.user.email?.split('@')[0] || '用户',
              role: 'user',
            }, {
              onConflict: 'id',
            })

          if (profileError) {
            console.warn('Failed to ensure profile exists:', profileError)
            // 不阻止登录流程
          }
        } catch (err) {
          console.warn('Error ensuring profile:', err)
          // 不阻止登录流程
        }

        // 等待 session 完全建立（给 Supabase 时间保存 session 到 storage）
        await new Promise(resolve => setTimeout(resolve, 200))

        // 再次确认 session 存在
        const { data: { session: finalSession } } = await supabase.auth.getSession()
        if (!finalSession) {
          setError('登录状态未正确建立，请重试')
          setLoading(false)
          return
        }

        // 登录成功，跳转到指定页面或首页
        const redirect = searchParams.get('redirect') || '/'
        // 使用 window.location 确保完全刷新页面，让中间件能正确识别 session
        // 这样可以确保所有状态（包括 cookie）都正确设置
        window.location.href = redirect
      }
    } catch (err) {
      console.error('Unexpected login error:', err)
      const errorMessage = err instanceof Error 
        ? `登录失败：${err.message}` 
        : '登录失败，请稍后重试'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setError('认证服务未配置，请联系管理员')
        return
      }

      console.log('🔵 触发 Google 登录')
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        console.error('Google 登录错误:', signInError)
        setError(signInError.message || 'Google登录失败')
      } else {
        console.log('Google 登录成功，等待重定向:', data)
      }
    } catch (err) {
      console.error('Google 登录异常:', err)
      setError(err instanceof Error ? err.message : 'Google登录失败，请稍后重试')
    }
  }

  const handleGitHubLogin = async () => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setError('认证服务未配置，请联系管理员')
        return
      }

      console.log('⚫ 触发 GitHub 登录')
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        console.error('GitHub 登录错误:', signInError)
        setError(signInError.message || 'GitHub登录失败')
      } else {
        console.log('GitHub 登录成功，等待重定向:', data)
      }
    } catch (err) {
      console.error('GitHub 登录异常:', err)
      setError(err instanceof Error ? err.message : 'GitHub登录失败，请稍后重试')
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 邮箱输入 */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs text-white/60 uppercase tracking-widest pl-1">
            邮箱地址
          </Label>
          <Input
            id="email"
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs text-white/60 uppercase tracking-widest pl-1">
              密码
            </Label>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/30 focus:ring-0 transition-all duration-300 h-11"
          />
        </div>

        {/* 记住我和忘记密码 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
            />
            <Label
              htmlFor="remember"
              className="text-white/60 font-light leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              记住我
            </Label>
          </div>
          <Link
            href="/forgot-password"
            className="text-white/60 hover:text-white transition-colors font-light"
          >
            忘记密码？
          </Link>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="space-y-2">
            <div className="text-sm text-red-300 bg-red-500/20 backdrop-blur-sm border border-red-500/30 p-3 rounded whitespace-pre-line">
              {error}
            </div>
            {error.includes('未注册') || error.includes('尚未注册') ? (
              <div className="text-xs text-white/60 bg-white/5 backdrop-blur-sm border border-white/10 p-2 rounded">
                <p className="mb-1">💡 该邮箱尚未注册，请先完成注册：</p>
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-white/80 hover:text-white underline underline-offset-2 font-medium"
                >
                  点击这里立即注册 →
                </button>
              </div>
            ) : error.includes('验证您的邮箱') || error.includes('email_not_confirmed') ? (
              <div className="text-xs text-white/60 bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded">
                <p className="mb-2">💡 邮箱验证帮助：</p>
                <ul className="list-disc list-inside space-y-1 mb-2 text-white/80">
                  <li>检查您的邮箱收件箱和垃圾邮件文件夹</li>
                  <li>验证邮件可能在几分钟后到达</li>
                  <li>如果未收到邮件，可以尝试重新注册</li>
                </ul>
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-white/80 hover:text-white underline underline-offset-2 font-medium text-xs"
                >
                  需要重新注册？点击这里 →
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* 登录按钮 - 半透明白色，柔和不刺眼 */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
        >
          {loading ? '登录中...' : '登 录'}
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
          使用Google账号登录
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleGitHubLogin}
          className="w-full bg-transparent border-white/10 text-white/80 hover:bg-white/5 hover:text-white hover:border-white/30 h-11 transition-all"
        >
          <Github className="mr-2 h-4 w-4" />
          使用 GitHub 登录
        </Button>
      </div>

      {/* 注册链接 */}
      <div className="mt-6 text-center text-sm text-white/40 font-light">
        还没有账号？
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-white hover:underline underline-offset-4 ml-1 font-normal"
        >
          立即注册
        </button>
      </div>
    </>
  )
}

