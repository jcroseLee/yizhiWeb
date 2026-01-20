'use client'

import { Button } from '@/lib/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/lib/components/ui/dialog'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'
import { updateUserPhone, verifyPhoneChange } from '@/lib/services/auth'
import { useAlert } from '@/lib/utils/alert'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

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
  const { alert } = useAlert()

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setPhone('')
      setCode('')
      setCountdown(0)
    }
  }, [open])

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      alert('请输入正确的手机号')
      return
    }

    setSending(true)
    try {
      const { error } = await updateUserPhone(phone)
      if (error) {
        alert(error.message)
      } else {
        alert('验证码已发送')
        setCountdown(60)
      }
    } catch (err: any) {
      alert(err.message || '发送失败')
    } finally {
      setSending(false)
    }
  }

  const handleBind = async () => {
    if (!phone) {
      alert('请输入手机号')
      return
    }
    if (!code) {
      alert('请输入验证码')
      return
    }

    setVerifying(true)
    try {
      const { error } = await verifyPhoneChange(phone, code)
      if (error) {
        alert(error.message)
      } else {
        alert('绑定成功')
        onOpenChange(false)
        onSuccess()
      }
    } catch (err: any) {
      alert(err.message || '绑定失败')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>绑定手机号</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">手机号</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入11位手机号"
                maxLength={11}
              />
              <Button 
                variant="outline" 
                onClick={handleSendCode}
                disabled={sending || countdown > 0 || phone.length !== 11}
                className="w-[120px]"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : (
                  '获取验证码'
                )}
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">验证码</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入验证码"
              maxLength={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleBind} disabled={verifying} className="bg-[#C82E31] text-white hover:bg-[#B02629] font-semibold shadow-sm">
            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认绑定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
