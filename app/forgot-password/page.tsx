'use client'

import Galaxy from '@/lib/components/Galaxy'
import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { getSupabaseClient } from '@/lib/services/supabaseClient'
import { ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setError('认证服务未配置，请联系管理员')
        setLoading(false)
        return
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message || '发送重置邮件失败，请稍后重试')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送重置邮件失败，请稍后重试')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      {/* Galaxy 背景 */}
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

      {/* 氛围光晕 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* 卡片容器 */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4">
        {/* 返回按钮 */}
        <Link
          href="/login"
          className="inline-flex items-center text-white/60 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回登录
        </Link>

        {/* 玻璃拟态卡片 */}
        <div className="backdrop-blur-2xl bg-black/20 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {success ? (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-500/30">
                  <Mail className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-medium text-white mb-2">邮件已发送</h2>
                  <p className="text-sm text-white/60 mb-2">
                    我们已向 <span className="text-white/80 font-medium">{email}</span> 发送了密码重置链接
                  </p>
                  <p className="text-xs text-white/50">
                    请查收邮件并点击链接重置密码。如果未收到邮件，请检查垃圾邮件文件夹。
                  </p>
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
                <h2 className="text-2xl font-medium text-white mb-2">忘记密码？</h2>
                <p className="text-sm text-white/60">
                  请输入您的邮箱地址，我们将发送密码重置链接
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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

                {error && (
                  <div className="text-sm text-red-300 bg-red-500/20 backdrop-blur-sm border border-red-500/30 p-3 rounded">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/40 h-11 font-medium tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
                >
                  {loading ? '发送中...' : '发送重置链接'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

