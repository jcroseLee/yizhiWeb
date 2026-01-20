'use client'

import { Button } from '@/lib/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { updateUserPhone, verifyPhoneChange } from '@/lib/services/auth'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2, Smartphone } from 'lucide-react'
import { useState, useEffect } from 'react'

interface BindPhoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BindPhoneDialog({ open, onOpenChange, onSuccess }: BindPhoneDialogProps) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { toast } = useToast()

  // Cleanup countdown on unmount
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [countdown])

  const handleSendCode = async () => {
    if (!phone) {
      toast({ title: '请输入手机号', variant: 'destructive' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast({ title: '手机号格式不正确', variant: 'destructive' })
      return
    }

    setSending(true)
    try {
      const { error } = await updateUserPhone(phone)
      if (error) {
        toast({ title: '发送验证码失败', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: '验证码已发送' })
        setCountdown(60)
      }
    } catch (error) {
      toast({ title: '发送验证码失败', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleBind = async () => {
    if (!phone || !code) {
      toast({ title: '请填写完整信息', variant: 'destructive' })
      return
    }

    setVerifying(true)
    try {
      const { error } = await verifyPhoneChange(phone, code)
      if (error) {
        toast({ title: '绑定失败', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: '绑定成功' })
        onSuccess()
        onOpenChange(false)
      }
    } catch (error) {
      toast({ title: '绑定失败', variant: 'destructive' })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26.5625rem] bg-[#FDFBF7]">
        <DialogHeader>
          <DialogTitle>绑定手机号</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入手机号"
                    className="pl-9"
                    />
                </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">验证码</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入验证码"
              />
              <Button 
                variant="outline" 
                onClick={handleSendCode} 
                disabled={sending || countdown > 0 || !phone}
                className="w-32"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={verifying}>
            取消
          </Button>
          <Button variant="default" onClick={handleBind} disabled={verifying} className="bg-[#C82E31] hover:bg-[#B02629]">
            {verifying ? '绑定中...' : '立即绑定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
