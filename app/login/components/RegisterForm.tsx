'use client'

import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/lib/components/ui/tabs'
import { getCurrentUser } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface RegisterFormProps {
  onSwitchToLogin?: () => void
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [registerMethod, setRegisterMethod] = useState<'phone' | 'email'>('phone')
  
  // Inputs
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('') // 邮箱注册通常也建议验证，或注册后发验证链接
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verifying, setVerifying] = useState(false) // 手机注册需验证码
  const [countdown, setCountdown] = useState(0) // 验证码倒计时

  const isInvalidCredentialsError = (err: unknown) => {
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
    return message.includes('Invalid login credentials')
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  useEffect(() => {
    const checkAuth = async () => {
      if (await getCurrentUser()) {
        router.push(searchParams.get('redirect') || '/')
      }
    }
    checkAuth()
  }, [router, searchParams])

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

  const signInWithPasswordForPhone = async (
    supabase: NonNullable<ReturnType<typeof createClient>>,
    phoneE164: string,
    passwordToUse: string
  ) => {
    let lastError: Error | null = null
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: phoneE164,
        password: passwordToUse,
      })
      if (!error) {
        return { data, error: null as Error | null }
      }
      lastError = error as Error
      if (!isInvalidCredentialsError(lastError)) break
      await sleep(250 * (attempt + 1))
    }
    return { data: null, error: lastError }
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // 基础校验
    if (password.length < 6) {
      setError('密码长度至少6位')
      return
    }
    if (registerMethod === 'phone') {
      const fullPhone = formatE164(phone)
      if (!/^\+\d{6,15}$/.test(fullPhone)) {
        setError('请输入有效手机号')
        return
      }
      if (!code) {
        setError('请输入验证码')
        return
      }
    }
    if (registerMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效邮箱')
      return
    }

    setLoading(true)
    const supabase = createClient()
    if (!supabase) {
      setError('认证服务未配置，请联系管理员')
      setLoading(false)
      return
    }
    
    try {
      if (registerMethod === 'phone') {
        const fullPhone = formatE164(phone)
        // 手机号注册：使用自定义 API，避免触发 Supabase 的 SMS 确认
        const registerResponse = await fetch('/api/sms/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: fullPhone, code, password }),
        })

        const registerData = await registerResponse.json()

        if (!registerResponse.ok) {
          setError(registerData.error || '注册失败，请稍后重试')
          setLoading(false)
          return
        }

        // 注册成功，使用返回的用户信息登录
        if (registerData.user) {
          // 使用密码登录
          const { data: signInData, error: signInError } = await signInWithPasswordForPhone(supabase, fullPhone, password)

          if (signInError) {
            setError('注册成功，但登录失败，请尝试手动登录')
            setLoading(false)
            return
          }

          if (signInData?.session) {
            window.location.href = '/'
          } else {
            setSuccess(true)
          }
        } else {
          setError('注册失败，请重试')
          setLoading(false)
        }
      } else {
        // 邮箱注册：直接注册
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: {
              nickname: `用户${email.trim().toLowerCase().split('@')[0]}`,
            },
          },
        })

        if (signUpError) {
          let errorMessage = '注册失败，请稍后重试'
          if (signUpError.message.includes('User already registered')) {
            errorMessage = '该邮箱已被注册，请直接登录'
          } else if (signUpError.message.includes('Password should be at least')) {
            errorMessage = '密码长度不符合要求，请使用至少6位字符'
          } else {
            errorMessage = signUpError.message || errorMessage
          }
          setError(errorMessage)
          setLoading(false)
          return
        }

        if (data?.user && !data.session) {
          setSuccess(true) // 邮箱通常是发送验证链接，显示成功去查收邮件
        } else if (data?.session) {
          window.location.href = '/'
        }
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '注册失败'
      if (isInvalidCredentialsError(err)) {
        setError('注册已完成，但登录状态未就绪，请稍后在登录页重试')
      } else {
        setError(rawMessage)
      }
      setLoading(false)
    }
  }

  // 手机号验证码验证逻辑
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const fullPhone = formatE164(phone)
      const verifyResponse = await fetch('/api/sms/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: fullPhone, code }),
      })

      const verifyData = await verifyResponse.json()
      
      if (!verifyResponse.ok) {
        setError(verifyData.error || '验证码错误或已过期')
        setLoading(false)
      } else {
        setSuccess(true)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
            <span className="text-2xl">🎉</span>
        </div>
        <h3 className="text-xl font-medium text-white">注册成功</h3>
        <p className="text-white/60 text-sm">
            {registerMethod === 'email' ? '验证邮件已发送，请查收' : '账号创建成功'}
        </p>
        <Button onClick={onSwitchToLogin} className="w-full bg-white/10 hover:bg-white/20 mt-4">
            去登录
        </Button>
      </div>
    )
  }

  if (verifying) {
    return (
        <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <button onClick={() => setVerifying(false)} className="text-white/50 hover:text-white flex items-center gap-1 text-sm mb-4"><ArrowLeft className="w-4 h-4"/> 返回修改</button>
            <h3 className="text-white text-lg font-medium text-center">输入验证码</h3>
            <p className="text-white/40 text-center text-xs mb-4">已发送至 {formatE164(phone)}</p>
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="验证码" className="bg-white/5 border-white/10 text-white h-11 text-center tracking-widest text-lg"/>
            {error && <div className="text-red-400 text-xs text-center">{error}</div>}
            <Button onClick={handleVerifyPhone} disabled={loading} className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300">{loading ? '验证中...' : '完成注册'}</Button>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={registerMethod} onValueChange={(v) => setRegisterMethod(v as 'phone' | 'email')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-white/10 mb-6 p-0 h-auto rounded-none">
          <TabsTrigger value="phone" className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-white/50 pb-3 transition-all cursor-pointer">
            手机号注册
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-white/50 pb-3 transition-all cursor-pointer">
            邮箱注册
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in duration-300">
          <div className="space-y-4">
             {registerMethod === 'phone' ? (
                <>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-white/40 text-sm border-r border-white/10 pr-2">+86</span>
                    <Input 
                        type="tel" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        placeholder="请输入手机号" 
                        className="bg-white/5 border-white/10 text-white h-11 focus:bg-white/10 focus:border-white/30 focus:ring-0 pl-14"
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
                <Input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="name@example.com" 
                    className="bg-white/5 border-white/10 text-white h-11 focus:bg-white/10 focus:border-white/30 focus:ring-0"
                />
             )}
             
             <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="设置密码 (至少6位)" 
                className="bg-white/5 border-white/10 text-white h-11 focus:border-indigo-500/50 focus:ring-indigo-500/20"
             />
          </div>

          {error && <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] mt-2">
            {loading ? '注册中...' : '立即注册'}
          </Button>
          
          <div className="flex justify-end mt-2">
            <button onClick={onSwitchToLogin} className="text-xs text-white/80 hover:text-white transition-colors cursor-pointer">已有账号登录</button>
          </div>
          
          <p className="text-[0.625rem] text-white/30 text-center leading-normal mt-4">
            注册即代表同意易知的<Link href="#" className="hover:text-white underline">服务协议</Link>和<Link href="#" className="hover:text-white underline">隐私政策</Link>
          </p>
        </form>
      </Tabs>
    </div>
  )
}
