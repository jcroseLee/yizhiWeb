'use client'

import { PaymentModal } from '@/lib/components/PaymentModal'
import { Button } from '@/lib/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/lib/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { getCurrentUser } from '@/lib/services/auth'
import { BOOST_OPTIONS } from '@/lib/services/boost'
import { getWalletBalance } from '@/lib/services/wallet'
import { cn } from '@/lib/utils/cn'
import { Loader2, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface BoostPostDialogProps {
  post: { id: string; title: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function BoostPostDialog({ post, open, onOpenChange, onSuccess }: BoostPostDialogProps) {
  const [selectedDuration, setSelectedDuration] = useState<string>('1_day')
  const [showPayment, setShowPayment] = useState(false)
  const [balance, setBalance] = useState(0)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleNext = async () => {
    setLoadingBalance(true)
    try {
      const user = await getCurrentUser()
      if (!user) return
      const b = await getWalletBalance(user.id)
      if (b) {
        setBalance(b.total)
        // Close current dialog first
        onOpenChange(false)
        // Small delay to ensure smooth transition
        setTimeout(() => {
          setShowPayment(true)
        }, 150)
      } else {
        toast({ title: '无法获取余额', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: '获取余额失败', variant: 'destructive' })
    } finally {
      setLoadingBalance(false)
    }
  }

  const handlePaymentConfirm = async () => {
    const res = await fetch('/api/community/boost-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: post.id,
        duration_type: selectedDuration
      })
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (res.status === 402) {
        return { success: false, error: 'insufficient_balance' as const }
      }
      return { success: false, error: json.error || '支付失败' }
    }

    // Success
    onSuccess?.()
    onOpenChange(false) // Close main dialog
    return { success: true }
  }

  const selectedOption = BOOST_OPTIONS[selectedDuration as keyof typeof BOOST_OPTIONS]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>置顶帖子</DialogTitle>
            <DialogDescription>
              将帖子置顶，让更多人看到
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(BOOST_OPTIONS).map(([key, option]) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                    selectedDuration === key 
                      ? "border-[#C82E31] bg-[#C82E31]/5 ring-1 ring-[#C82E31]" 
                      : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                  )}
                  onClick={() => setSelectedDuration(key)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      selectedDuration === key ? "border-[#C82E31]" : "border-stone-300"
                    )}>
                      {selectedDuration === key && (
                        <div className="w-2 h-2 rounded-full bg-[#C82E31]" />
                      )}
                    </div>
                    <span className="font-medium text-stone-900">{option.label}</span>
                  </div>
                  <div className="text-stone-900 font-bold">
                    {option.amount} <span className="text-xs font-normal text-stone-500">易币</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleNext} 
            disabled={loadingBalance}
            className="w-full bg-[#C82E31] hover:bg-[#A61B1E] text-white"
          >
            {loadingBalance ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                下一步
                <TrendingUp className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>

      <PaymentModal 
          open={showPayment}
          onOpenChange={setShowPayment}
          balance={balance}
          amount={selectedOption.amount}
          itemName={`置顶 - ${selectedOption.label}`}
          onConfirm={handlePaymentConfirm}
        />
    </>
  )
}
