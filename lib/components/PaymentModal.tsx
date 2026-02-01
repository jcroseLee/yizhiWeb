'use client'

import { Button } from '@/lib/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import { AlertCircle, CheckCircle2, Loader2, Wallet } from 'lucide-react'
import * as React from 'react'

export interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: number
  amount: number
  itemName: string
  /**
   * Callback for payment confirmation.
   * Should return an object indicating success or specific error.
   */
  onConfirm: () => Promise<{ success: boolean; error?: 'insufficient_balance' | string }>
  className?: string
}

export function PaymentModal({
  open,
  onOpenChange,
  balance,
  amount,
  itemName,
  onConfirm,
  className,
}: PaymentModalProps) {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = React.useState<string>('')

  // Reset state when opening
  React.useEffect(() => {
    if (open) {
      setStatus('idle')
      setErrorMessage('')
    }
  }, [open])

  const handleConfirm = async () => {
    setStatus('loading')
    try {
      const result = await onConfirm()
      if (result.success) {
        setStatus('success')
        // Optional: Auto close after success?
        // For now, let's keep it open to show success state, user can close it.
      } else {
        setStatus('error')
        if (result.error === 'insufficient_balance') {
          setErrorMessage('余额不足，请充值')
        } else {
          setErrorMessage(result.error || '支付失败')
        }
      }
    } catch (e) {
      setStatus('error')
      setErrorMessage('发生未知错误')
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">正在处理支付...</p>
          </div>
        )
      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground">支付成功</h3>
              <p className="text-muted-foreground mt-1">
                已成功支付 {amount} 易币
              </p>
            </div>
            <Button 
              className="w-full mt-4" 
              onClick={() => onOpenChange(false)}
            >
              完成
            </Button>
          </div>
        )
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
              <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground">支付失败</h3>
              <p className="text-red-500 mt-1 text-sm">{errorMessage}</p>
            </div>
            <div className="flex w-full gap-3 mt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button 
                className="flex-1"
                onClick={() => setStatus('idle')}
              >
                重试
              </Button>
            </div>
          </div>
        )
      default: // idle
        return (
          <div className="space-y-6">
            {/* Amount Display */}
            <div className="flex flex-col items-center justify-center py-6">
              <span className="text-4xl font-bold tracking-tight text-primary">
                {amount}
                <span className="text-base font-normal text-muted-foreground ml-1">易币</span>
              </span>
              <span className="text-sm text-muted-foreground mt-2 bg-muted px-3 py-1 rounded-full">
                {itemName}
              </span>
            </div>

            {/* Info Rows */}
            <div className="space-y-4 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Wallet className="mr-2 h-4 w-4" />
                  当前余额
                </div>
                <div className={cn(
                  "font-medium",
                  balance < amount ? "text-red-500" : "text-foreground"
                )}>
                  {balance} 易币
                </div>
              </div>
              
              <div className="h-px bg-border" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">应付金额</span>
                <span className="font-medium text-foreground">
                  - {amount} 易币
                </span>
              </div>
            </div>

            {/* Actions */}
            <Button 
              className="w-full text-lg h-12" 
              onClick={handleConfirm}
            >
              确认支付
            </Button>
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md bg-white", className)}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {status === 'idle' ? '确认支付' : 
             status === 'loading' ? '支付中' :
             status === 'success' ? '支付结果' : '支付结果'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            支付确认窗口
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
