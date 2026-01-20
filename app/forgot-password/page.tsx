'use client'

import { hashUserId, trackEvent } from '@/lib/analytics'
import Galaxy from '@/lib/components/Galaxy'
import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/lib/components/ui/tabs'
import { getSupabaseClient } from '@/lib/services/supabaseClient'
import { ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'email' | 'phone'>('email')

  const [email, setEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState(false)

  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [smsCountdown, setSmsCountdown] = useState(0)
  const [smsSentAt, setSmsSentAt] = useState<number | null>(null)
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsError, setSmsError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const readApiJson = async (response: Response): Promise<unknown | null> => {
    try {
      const withClone = response as unknown as { clone?: () => Response; json?: () => Promise<unknown> }
      if (typeof withClone.clone === 'function') {
        return await withClone.clone().json()
      }
      if (typeof withClone.json === 'function') {
        return await withClone.json()
      }
      return null
    } catch {
      return null
    }
  }

  const readApiErrorMessage = async (response: Response) => {
    const data = await readApiJson(response)
    const message = data && typeof (data as { error?: unknown })?.error === 'string' ? ((data as { error: string }).error || '').trim() : ''
    return message || `请求失败（${response.status}）`
  }

  useEffect(() => {
    if (smsCountdown <= 0) return
    const timer = setTimeout(() => setSmsCountdown((v) => Math.max(0, v - 1)), 1000)
    return () => clearTimeout(timer)
  }, [smsCountdown])

  const formatE164CN = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    const digits = trimmed.replace(/\D/g, '')
    if (digits.length === 13 && digits.startsWith('86')) return `+${digits}`
    if (digits.length === 11 && digits.startsWith('1')) return `+86${digits}`
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

  const isInvalidCredentialsError = (err: unknown) => {
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
    return message.includes('Invalid login credentials')
  }

  const isNetworkError = (err: unknown) => {
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
    return (
      message.includes('Failed to fetch') ||
      message.includes('fetch failed') ||
      message.includes('NetworkError') ||
      message.includes('ERR_CONNECTION_REFUSED')
    )
  }

  const getSupabaseUrlLabel = () => {
    const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
    if (!raw) return 'Supabase URL 未配置'
    try {
      const u = new URL(raw)
      return u.origin
    } catch {
      return raw
    }
  }

  const signInWithPasswordForPhone = async (
    supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
    phoneE164: string,
    passwordToUse: string
  ) => {
    const candidates = getPhoneCandidates(phoneE164)
    let lastError: Error | null = null

    for (let attempt = 0; attempt < 4; attempt++) {
      for (const candidate of candidates) {
        try {
          const response = await supabase.auth.signInWithPassword({
            phone: candidate,
            password: passwordToUse,
          })
          const signInError = response.error as Error | null
          if (!signInError) return { data: response.data, error: null as Error | null }
          lastError = signInError

          if (isNetworkError(signInError)) {
            return { data: null, error: signInError }
          }

          if (!isInvalidCredentialsError(signInError)) {
            return { data: null, error: signInError }
          }
        } catch (err) {
          return { data: null, error: err instanceof Error ? err : new Error('登录失败，请稍后重试') }
        }
      }

      if (lastError && isInvalidCredentialsError(lastError) && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
        continue
      }
      break
    }

    return { data: null, error: lastError }
  }

  const maskedPhone = useMemo(() => {
    const digits = phone.replace(/\D/g, '')
    if (!digits) return ''
    if (digits.length >= 7) return digits.slice(0, 3) + '****' + digits.slice(-4)
    return digits
  }, [phone])

  const smsExpiresInText = useMemo(() => {
    if (!smsSentAt) return '验证码有效期 5 分钟'
    const expiresAt = smsSentAt + 5 * 60 * 1000
    const remainingMs = Math.max(0, expiresAt - Date.now())
    const remainingSec = Math.floor(remainingMs / 1000)
    const mm = String(Math.floor(remainingSec / 60)).padStart(1, '0')
    const ss = String(remainingSec % 60).padStart(2, '0')
    if (remainingSec <= 0) return '验证码已过期，请重新获取'
    return `验证码剩余 ${mm}:${ss}`
  }, [smsSentAt, smsCountdown])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setEmailSuccess(false)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setEmailError('请输入邮箱地址')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('请输入有效的邮箱地址')
      return
    }

    setEmailLoading(true)

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setEmailError('认证服务未配置，请联系管理员')
        setEmailLoading(false)
        return
      }

      const targetHash = await hashUserId(trimmedEmail.toLowerCase())
      trackEvent('auth_password_reset_email_request', { target_hash: targetHash })

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        trackEvent('auth_password_reset_email_request_failed', { target_hash: targetHash, reason: resetError.message })
        setEmailError(resetError.message || '发送重置邮件失败，请稍后重试')
        setEmailLoading(false)
        return
      }

      trackEvent('auth_password_reset_email_request_success', { target_hash: targetHash })
      setEmailSuccess(true)
      setEmailLoading(false)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : '发送重置邮件失败，请稍后重试')
      setEmailLoading(false)
    }
  }

  const handleSendSmsCode = async () => {
    setSmsError('')
    const fullPhone = formatE164CN(phone)
    if (!fullPhone) {
      setSmsError('请输入有效的手机号')
      return
    }
    if (smsCountdown > 0) return
    if (smsLoading) return

    setSmsLoading(true)
    try {
      const targetHash = await hashUserId(fullPhone)
      trackEvent('auth_password_reset_sms_request', { target_hash: targetHash })

      const response = await fetch('/api/sms/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })

      if (!response.ok) {
        const errorMessage = await readApiErrorMessage(response)
        trackEvent('auth_password_reset_sms_request_failed', {
          target_hash: targetHash,
          reason: errorMessage,
        })
        setSmsError(errorMessage.startsWith('请求失败') ? `发送验证码失败（${response.status}）` : errorMessage)
        return
      }

      trackEvent('auth_password_reset_sms_request_success', { target_hash: targetHash })
      setSmsSentAt(Date.now())
      setSmsCountdown(60)
    } catch (err) {
      setSmsError(err instanceof Error ? err.message : '发送验证码失败，请稍后重试')
    } finally {
      setSmsLoading(false)
    }
  }

  const handleVerifySms = async (e: React.FormEvent) => {
    e.preventDefault()
    setSmsError('')

    const fullPhone = formatE164CN(phone)
    if (!fullPhone) {
      setSmsError('请输入有效的手机号')
      return
    }
    const trimmedCode = smsCode.trim()
    if (!/^\d{6}$/.test(trimmedCode)) {
      setSmsError('请输入6位验证码')
      return
    }

    const sentAt = smsSentAt
    if (sentAt && Date.now() - sentAt > 5 * 60 * 1000) {
      setSmsError('验证码已过期，请重新获取')
      return
    }

    setVerifying(true)
    try {
      const targetHash = await hashUserId(fullPhone)
      trackEvent('auth_password_reset_sms_verify', { target_hash: targetHash })

      const response = await fetch('/api/sms/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code: trimmedCode }),
      })
      const data = await readApiJson(response)

      if (!response.ok) {
        const errorMessage = await readApiErrorMessage(response)
        trackEvent('auth_password_reset_sms_verify_failed', {
          target_hash: targetHash,
          reason: errorMessage,
        })
        setSmsError(errorMessage.startsWith('请求失败') ? `验证码验证失败（${response.status}）` : errorMessage)
        return
      }

      const tempPassword =
        data && typeof (data as { tempPassword?: unknown })?.tempPassword === 'string'
          ? (data as { tempPassword: string }).tempPassword
          : ''
      if (!tempPassword) {
        setSmsError('验证码验证失败，请稍后重试')
        return
      }

      const supabase = getSupabaseClient()
      if (!supabase) {
        setSmsError('认证服务未配置，请联系管理员')
        return
      }

      const { error: signInError } = await signInWithPasswordForPhone(supabase, fullPhone, tempPassword)
      if (signInError) {
        if (isNetworkError(signInError)) {
          const label = getSupabaseUrlLabel()
          setSmsError(`无法连接认证服务（${label}），请检查当前运行环境与配置是否一致`)
          return
        }
        setSmsError(signInError.message || '验证成功但登录失败，请重试')
        return
      }

      trackEvent('auth_password_reset_sms_verify_success', { target_hash: targetHash })
      router.push('/reset-password')
    } catch (err) {
      setSmsError(err instanceof Error ? err.message : '验证码验证失败，请稍后重试')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      <div className="fixed inset-0 w-full h-full z-0">
        <Galaxy
          mouseRepulsion={true}
          mouseInteraction={true}
          density={3}
          glowIntensity={0.3}
          saturation={0}
          hueShift={100}
          transparent={true}
          twinkleIntensity={0.6}
          rotationSpeed={0.15}
          repulsionStrength={2.5}
          autoCenterRepulsion={0}
          speed={1.2}
          rotation={[0.5, 0.3]}
          focal={[0.5, 0.5]}
          starSpeed={0.6}
        />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[37.5rem] h-[37.5rem] bg-indigo-900/20 rounded-full blur-[7.5rem] pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-md p-8 mx-4">
        <Link
          href="/login"
          className="inline-flex items-center text-white/60 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回登录
        </Link>

        <div className="backdrop-blur-2xl bg-black/20 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="text-center mb-6">
            <h2 className="text-2xl font-medium text-white mb-2">找回密码</h2>
            <p className="text-sm text-white/60">选择邮箱或手机号方式找回</p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'email' | 'phone')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-white/10 mb-6 p-0 h-auto rounded-none">
              <TabsTrigger
                value="email"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-white/50 pb-3 transition-all cursor-pointer"
              >
                邮箱找回
              </TabsTrigger>
              <TabsTrigger
                value="phone"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white text-white/50 pb-3 transition-all cursor-pointer"
              >
                手机号找回
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-0">
              {emailSuccess ? (
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-500/30">
                      <Mail className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white mb-2">邮件已发送</h3>
                      <p className="text-sm text-white/60 mb-2">
                        我们已向 <span className="text-white/80 font-medium">{email.trim()}</span> 发送了密码重置链接
                      </p>
                      <p className="text-xs text-white/50">请查收邮件并点击链接重置密码。如果未收到邮件，请检查垃圾邮件文件夹。</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300"
                  >
                    返回登录
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

                  {emailError && (
                    <div className="text-sm text-red-300 bg-red-500/20 backdrop-blur-sm border border-red-500/30 p-3 rounded">
                      {emailError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={emailLoading}
                    className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
                  >
                    {emailLoading ? '发送中...' : '发送重置链接'}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="phone" className="mt-0">
              <form onSubmit={handleVerifySms} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs text-white/60 uppercase tracking-widest pl-1">
                    手机号
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-white/40 text-sm border-r border-white/10 pr-2">+86</span>
                    <Input
                      id="phone"
                      inputMode="numeric"
                      placeholder="请输入手机号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/30 focus:ring-0 transition-all duration-300 h-11 pl-14"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smsCode" className="text-xs text-white/60 uppercase tracking-widest pl-1">
                    验证码
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="smsCode"
                      inputMode="numeric"
                      placeholder="6位验证码"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/30 focus:ring-0 transition-all duration-300 h-11"
                    />
                    <Button
                      type="button"
                      disabled={smsLoading || smsCountdown > 0}
                      onClick={handleSendSmsCode}
                      className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white min-w-[7rem] h-11 border-dashed"
                    >
                      {smsCountdown > 0 ? `${smsCountdown}s` : smsLoading ? '发送中...' : '获取验证码'}
                    </Button>
                  </div>
                  <p className="text-xs text-white/40 pl-1">{smsExpiresInText}</p>
                </div>

                {smsError && (
                  <div className="text-sm text-red-300 bg-red-500/20 backdrop-blur-sm border border-red-500/30 p-3 rounded">
                    {smsError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={verifying}
                  className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
                >
                  {verifying ? '验证中...' : maskedPhone ? `验证并继续（${maskedPhone}）` : '验证并继续'}
                </Button>

                <p className="text-xs text-white/50 text-center">
                  验证通过后将进入密码重置页面，请设置符合复杂度要求的新密码
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
