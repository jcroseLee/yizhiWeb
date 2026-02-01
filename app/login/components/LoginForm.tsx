'use client'

import { AlipayIcon, FacebookIcon, GoogleIcon, InstagramIcon, WeChatIcon, XIcon } from '@/lib/components/icons/SocialIcons'
import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/lib/components/ui/tabs'
import { getCurrentUser } from '@/lib/services/auth'
import { syncProfileFromAuthUser } from '@/lib/services/profile'
import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface LoginFormProps {
  onSwitchToRegister?: () => void
}

type AuthProvider = 'google' | 'github' | 'twitter' | 'facebook' | 'notion' | 'linkedin' | 'wechat' | 'instagram'

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Tab states
  const [loginMethod, setLoginMethod] = useState<'code' | 'password'>('code')
  // Inputs
  const [phone, setPhone] = useState('')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  
  // UI states
  const [countdown, setCountdown] = useState(0)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetRequired, setResetRequired] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('')
  const [pendingAuthData, setPendingAuthData] = useState<{ user: User | null; session: Session | null } | null>(null)
  const [pendingSupabase, setPendingSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  const isInvalidCredentialsError = (err: unknown) => {
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
    return message.includes('Invalid login credentials')
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (user) {
        const redirect = searchParams.get('redirect') || '/'
        window.location.href = redirect
      }
    }
    checkAuth()
  }, [router, searchParams])

  useEffect(() => {
    const err = searchParams.get('error')
    if (!err) return
    const map: Record<string, string> = {
      supabase_not_configured: '认证服务未配置',
      too_many_attempts: '登录异常次数过多，请稍后再试',
    }
    setError(map[err] || '登录失败，请稍后重试')
  }, [searchParams])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const formatE164 = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    const digits = trimmed.replace(/\D/g, '')
    if (digits.length === 13 && digits.startsWith('86')) {
      return `+${digits}`
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+86${digits}`
    }
    return ''
  }

  const getPhoneCandidates = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const local = digits.length === 11 ? digits : digits.length === 13 && digits.startsWith('86') ? digits.slice(2) : ''
    const candidates = new Set<string>()
    if (value) candidates.add(value)
    if (local) candidates.add(local)
    if (digits) candidates.add(digits)
    if (local) candidates.add(`86${local}`)
    return Array.from(candidates)
  }

  const signInWithPasswordForPhone = async (
    supabase: NonNullable<ReturnType<typeof createClient>>,
    phoneE164: string,
    passwordToUse: string
  ) => {
    const candidates = getPhoneCandidates(phoneE164)
    let lastError: Error | null = null

    for (let attempt = 0; attempt < 4; attempt++) {
      for (const candidate of candidates) {
        const response = await supabase.auth.signInWithPassword({
          phone: candidate,
          password: passwordToUse,
        })
        const signInData = response.data as { user: User | null; session: Session | null }
        const signInError = response.error as Error | null
        if (!signInError) {
          return { data: signInData, error: null as Error | null }
        }
        lastError = signInError
        if (!isInvalidCredentialsError(signInError)) {
          return { data: null as { user: User | null; session: Session | null } | null, error: signInError }
        }
      }

      if (lastError && isInvalidCredentialsError(lastError) && attempt < 3) {
        await sleep(250 * (attempt + 1))
        continue
      }
      break
    }

    return { data: null as { user: User | null; session: Session | null } | null, error: lastError }
  }

  const handleSendCode = async () => {
    setError('')
    if (!phone) {
      setError('请输入手机号')
      return
    }

    const fullPhone = formatE164(phone)
    if (!/^\+\d{6,15}$/.test(fullPhone)) {
      setError('请输入有效的手机号')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/sms/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: fullPhone }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '发送验证码失败，请稍后重试')
      } else {
        setCountdown(60)
      }
    } catch (err) {
      console.error('Send code error:', err)
      setError('发送验证码失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    if (!supabase) {
      setError('认证服务未配置')
      setLoading(false)
      return
    }

    let authData
    let authError

    try {
      if (loginMethod === 'code') {
        if (!phone || !code) {
          throw new Error('请填写完整信息')
        }

        const fullPhone = formatE164(phone)
        if (!/^\+\d{6,15}$/.test(fullPhone)) {
          throw new Error('请输入有效的手机号')
        }

        const loginResponse = await fetch('/api/sms/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: fullPhone, code }),
        })

        const loginData = await loginResponse.json()

        if (!loginResponse.ok) {
          throw new Error(loginData.error || '登录失败')
        }

        if (loginData.tempPassword) {
          const { data: signInData, error: signInError } = await signInWithPasswordForPhone(
            supabase,
            fullPhone,
            loginData.tempPassword
          )

          if (signInError) throw signInError
          if (!signInData) throw new Error('登录失败，请重试')

          if (loginData.requiresPasswordReset) {
            setPendingAuthData(signInData)
            setPendingSupabase(supabase)
            setResetRequired(true)
            setLoading(false)
            return
          }

          authData = signInData
          authError = null
        } else {
          throw new Error('登录失败，未返回会话信息')
        }

      } else {
        // 密码登录 (账号+密码)
        // 自动判断是手机号还是邮箱 (简单判断：含@为邮箱，数字为手机)
        const normalizedAccount = account.trim()
        const isEmailInput = normalizedAccount.includes('@')
        const normalizedEmail = normalizedAccount.toLowerCase()
        const normalizedPhone = formatE164(normalizedAccount)
        
        if (!normalizedAccount || !password) {
          throw new Error('请填写完整信息')
        }
        if (!isEmailInput && !/^\+\d{6,15}$/.test(normalizedPhone)) {
          throw new Error('请输入有效的手机号')
        }

        let data: { user: User | null; session: Session | null } | null = null
        let error: Error | null = null
        if (isEmailInput) {
          const response = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })
          data = response.data as { user: User | null; session: Session | null }
          error = response.error as Error | null
        } else {
          const result = await signInWithPasswordForPhone(supabase, normalizedPhone, password)
          data = result.data
          error = result.error
        }
        authData = data
        authError = error
      }

      if (authError) throw authError
      await handleLoginSuccess(authData, supabase)

    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '登录失败，请检查输入'
      if (!isInvalidCredentialsError(err)) {
        console.error('Login error:', err)
      }
      if (loginMethod === 'code' && isInvalidCredentialsError(err)) {
        setError('登录失败，请稍后重试')
      } else if (isInvalidCredentialsError(err)) {
        setError('账号或密码错误')
      } else {
        setError(rawMessage)
      }
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setError('')

    if (!resetPassword || resetPassword.length < 6) {
      setError('密码长度至少6位')
      return
    }

    if (resetPassword !== resetPasswordConfirm) {
      setError('两次输入的密码不一致')
      return
    }

    if (!pendingSupabase || !pendingAuthData) {
      setError('登录状态异常，请重新登录')
      return
    }

    setLoading(true)
    const { error: updateError } = await pendingSupabase.auth.updateUser({
      password: resetPassword,
    })

    if (updateError) {
      setError(updateError.message || '设置密码失败，请稍后重试')
      setLoading(false)
      return
    }

    const authData = pendingAuthData
    const supabase = pendingSupabase
    setResetRequired(false)
    setResetPassword('')
    setResetPasswordConfirm('')
    setPendingAuthData(null)
    setPendingSupabase(null)
    await handleLoginSuccess(authData, supabase)
  }

  const handleLoginSuccess = async (data: { user: User | null; session: Session | null } | null, supabase: ReturnType<typeof createClient>) => {
    if (!data?.user || !supabase) {
      setError('登录失败，请重试')
      setLoading(false)
      return
    }

    try {
      await syncProfileFromAuthUser(
        { 
          user: data.user, 
          defaultNickname: data.user.phone ? `用户${data.user.phone.slice(-4)}` : (data.user.email?.split('@')[0] || '用户'), 
          role: 'user' 
        },
        supabase
      )
    } catch (err) {
      console.warn('Error ensuring profile:', err)
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    const { data: { session: finalSession } } = await supabase.auth.getSession()
    if (!finalSession) {
      setError('登录状态未正确建立，请重试')
      setLoading(false)
      return
    }

    const redirect = searchParams.get('redirect') || '/'
    window.location.href = redirect
  }

  const handleSocialLogin = async (provider: AuthProvider | string) => {
    try {
      const supabase = createClient()
      if (!supabase) {
        setError('认证服务未配置，请联系管理员')
        return
      }

      // 映射一些自定义 provider string 到 Supabase 支持的
      const providerMap: Record<string, string> = {
        'twitter': 'twitter',
        'wechat': 'wechat',
        'instagram': 'instagram',
      }

      const mappedProvider = providerMap[provider] || provider

      await supabase.auth.signInWithOAuth({
        provider: mappedProvider as 'google' | 'github' | 'twitter' | 'facebook' | 'notion' | 'linkedin',
        options: { 
          redirectTo: `${window.location.origin}/auth/callback` 
        },
      })
    } catch (err) {
      console.error(`${provider} 登录异常:`, err)
      setError(err instanceof Error ? err.message : `${provider}登录失败，请稍后重试`)
    }
  }

  const socialButtons = [
    { name: 'Google', icon: <GoogleIcon className="w-5 h-5" />, provider: 'google', bg: 'hover:bg-white/10' },
    { name: 'X', icon: <XIcon className="w-5 h-5" />, provider: 'twitter', bg: 'hover:bg-white/10' },
    { name: 'Facebook', icon: <FacebookIcon className="w-5 h-5" />, provider: 'facebook', bg: 'hover:bg-blue-600/20' },
    { name: 'Instagram', icon: <InstagramIcon className="w-5 h-5" />, provider: 'instagram', bg: 'hover:bg-pink-600/20' },
    { name: '支付宝', icon: <AlipayIcon className="w-5 h-5" />, provider: 'alipay', bg: 'hover:bg-yellow-500/10' },
    { name: '微信', icon: <WeChatIcon className="w-5 h-5 text-[#07C160]" />, provider: 'wechat', bg: 'hover:bg-green-500/10' },
  ]

  return (
    <div className="space-y-6">
      <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'code' | 'password')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-white/10 mb-6 p-0 h-auto rounded-none">
          <TabsTrigger value="password" className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-white/50 pb-3 transition-all cursor-pointer">
            账号登录
          </TabsTrigger>
          <TabsTrigger value="code" className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-white/50 pb-3 transition-all cursor-pointer">
            手机号登录
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* 输入区域 */}
          <div className="space-y-4">
            {resetRequired ? (
              <>
                <Input
                  type="password"
                  placeholder="设置新密码（至少6位）"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-0 h-11"
                />
                <Input
                  type="password"
                  placeholder="确认新密码"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-0 h-11"
                />
              </>
            ) : loginMethod === 'code' ? (
              <>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-white/40 text-sm border-r border-white/10 pr-2">+86</span>
                  <Input
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-0 h-11 pl-14"
                  />
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-0 h-11"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || loading}
                    className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white min-w-[6.25rem] h-11 border-dashed"
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Input
                  placeholder="手机号 / 邮箱"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-0 h-11"
                />
                <Input
                  type="password"
                  placeholder="登录密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-0 h-11"
                />
              </>
            )}
          </div>

          <div className="flex justify-end text-xs text-white/50">
            <Link href="/forgot-password" className="hover:text-white transition-colors">忘记密码？</Link>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded text-center">
              {error}
            </div>
          )}

          {resetRequired ? (
            <Button
              type="button"
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:bg-white/30 hover:border-white/40 h-11 tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '设置密码并继续'}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:bg-white/30 hover:border-white/40 h-11 tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '登 录'}
            </Button>
          )}
        </form>
      </Tabs>

      {/* 第三方登录分割线 */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
        <div className="relative flex justify-center"><span className="bg-transparent px-2 text-[0.625rem] text-white/20 uppercase tracking-widest">其他方式登录</span></div>
      </div>

      {/* 第三方登录 Grid */}
      <div className="grid grid-cols-6 gap-2">
        {socialButtons.map((btn) => (
          <Button
            key={btn.name}
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin(btn.provider)}
            title={`使用 ${btn.name} 登录`}
            className={`h-10 px-0 bg-white/5 border-white/5 text-white/70 ${btn.bg} transition-all duration-300 rounded-lg`}
          >
            {btn.icon}
          </Button>
        ))}
      </div>
      
      <div className="text-center mt-6">
        <p className="text-white/30 text-xs">
          还没有账号？ 
          <button onClick={onSwitchToRegister} className="text-white hover:text-white/80 ml-1 hover:underline underline-offset-4 cursor-pointer">
            立即注册
          </button>
        </p>
      </div>
    </div>
  )
}
