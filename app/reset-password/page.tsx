'use client'

import { hashUserId, trackEvent } from '@/lib/analytics'
import Galaxy from '@/lib/components/Galaxy'
import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { getSupabaseClient } from '@/lib/services/supabaseClient'
import { getPasswordComplexityError } from '@/lib/utils/passwordPolicy'
import { Check, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [initializing, setInitializing] = useState(true)
  const [authError, setAuthError] = useState('')

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userLabel, setUserLabel] = useState<string | null>(null)

  const passwordHint = useMemo(() => {
    if (!password) return '至少8位，包含大小写字母和数字'
    return getPasswordComplexityError(password) || '密码强度符合要求'
  }, [password])

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = getSupabaseClient()
        if (!supabase) {
          setAuthError('认证服务未配置，请联系管理员')
          setInitializing(false)
          return
        }

        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
        const code = hashParams.get('code') || queryParams.get('code')

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setAuthError(error.message || '会话初始化失败，请重新发起找回密码')
            setInitializing(false)
            return
          }
          if (data?.user?.email) {
            setUserLabel(data.user.email)
          } else if (data?.user?.phone) {
            setUserLabel(data.user.phone)
          }
        } else if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            setAuthError(error.message || '会话初始化失败，请重新发起找回密码')
            setInitializing(false)
            return
          }
          if (data?.user?.email) {
            setUserLabel(data.user.email)
          } else if (data?.user?.phone) {
            setUserLabel(data.user.phone)
          }
        }

        if (window.location.hash) {
          try {
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
          } catch {}
        }

        const { data } = await supabase.auth.getSession()
        if (!data?.session) {
          setAuthError('未找到有效的重置会话，请重新发起找回密码')
          setInitializing(false)
          return
        }

        const user = data.session.user
        const label = user.email || user.phone || null
        if (label) {
          setUserLabel(label)
          const targetHash = await hashUserId(label)
          trackEvent('auth_password_reset_session_ready', { target_hash: targetHash })
        } else {
          trackEvent('auth_password_reset_session_ready', {})
        }

        setInitializing(false)
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : '初始化失败，请重新发起找回密码')
        setInitializing(false)
      }
    }

    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')

    const complexityError = getPasswordComplexityError(password)
    if (complexityError) {
      setAuthError(complexityError)
      return
    }
    if (password !== passwordConfirm) {
      setAuthError('两次输入的密码不一致')
      return
    }

    setSubmitting(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setAuthError('认证服务未配置，请联系管理员')
        setSubmitting(false)
        return
      }

      const targetHash = userLabel ? await hashUserId(userLabel) : null
      trackEvent('auth_password_reset_update_start', targetHash ? { target_hash: targetHash } : {})

      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        trackEvent(
          'auth_password_reset_update_failed',
          targetHash ? { target_hash: targetHash, reason: error.message } : { reason: error.message }
        )
        setAuthError(error.message || '设置新密码失败，请稍后重试')
        setSubmitting(false)
        return
      }

      trackEvent('auth_password_reset_update_success', targetHash ? { target_hash: targetHash } : {})

      try {
        await supabase.auth.signOut()
      } catch {}

      setSuccess(true)
      setSubmitting(false)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '设置新密码失败，请稍后重试')
      setSubmitting(false)
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
        <Link href="/login" className="inline-flex items-center text-white/60 hover:text-white transition-colors mb-6">
          返回登录
        </Link>

        <div className="backdrop-blur-2xl bg-black/20 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {initializing ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-12 h-12 mx-auto border-4 border-white/20 border-t-white/60 rounded-full animate-spin" />
              <p className="text-white/70 text-sm">正在初始化重置流程...</p>
            </div>
          ) : authError && !success ? (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-red-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-red-500/30">
                  <Lock className="w-8 h-8 text-red-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-medium text-white mb-2">无法重置密码</h2>
                  <p className="text-sm text-white/60">{authError}</p>
                </div>
              </div>
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300"
                >
                  重新发起找回
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/80 hover:bg-white/10 hover:text-white h-11 font-medium tracking-wide transition-all duration-300"
                >
                  返回登录
                </Button>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-500/30">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-medium text-white mb-2">密码已重置</h2>
                  <p className="text-sm text-white/60">请使用新密码重新登录</p>
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
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-medium text-white mb-2">设置新密码</h2>
                <p className="text-sm text-white/60">{userLabel ? `账号：${userLabel}` : '请输入符合复杂度要求的新密码'}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs text-white/60 uppercase tracking-widest pl-1">
                    新密码
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="至少8位，包含大小写字母和数字"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/30 focus:ring-0 transition-all duration-300 h-11"
                  />
                  <p className={`text-xs pl-1 ${getPasswordComplexityError(password) ? 'text-white/40' : 'text-green-300/80'}`}>
                    {passwordHint}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm" className="text-xs text-white/60 uppercase tracking-widest pl-1">
                    确认密码
                  </Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    placeholder="再次输入新密码"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/30 focus:ring-0 transition-all duration-300 h-11"
                  />
                </div>

                {authError && (
                  <div className="text-sm text-red-300 bg-red-500/20 backdrop-blur-sm border border-red-500/30 p-3 rounded">
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
                >
                  {submitting ? '保存中...' : '保存新密码'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

