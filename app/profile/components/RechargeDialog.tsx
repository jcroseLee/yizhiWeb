'use client'

import { AlipayIcon, WeChatIcon } from '@/lib/components/icons/SocialIcons'
import { Button } from '@/lib/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/lib/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { getSession } from '@/lib/services/auth'
import { getRechargeOptions, type RechargeOption } from '@/lib/services/wallet'
import { CheckCircle2, Coins, Loader2 } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

interface RechargeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const DEFAULT_RECHARGE_OPTIONS: Partial<RechargeOption>[] = [
  { amount_cny: 6, coins_amount: 60, label: '60易币' },
  { amount_cny: 30, coins_amount: 300, label: '300易币', is_recommend: true },
  { amount_cny: 68, coins_amount: 680, label: '680易币' },
  { amount_cny: 128, coins_amount: 1280, label: '1280易币' },
  { amount_cny: 328, coins_amount: 3280, label: '3280易币' },
  { amount_cny: 648, coins_amount: 6480, label: '6480易币' },
]

export function RechargeDialog({ open, onOpenChange, onSuccess }: RechargeDialogProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(30)
  const [paymentMethod, setPaymentMethod] = useState<'WECHAT' | 'ALIPAY'>('WECHAT')
  const [loading, setLoading] = useState(false)
  const [rechargeOptions, setRechargeOptions] = useState<Partial<RechargeOption>[]>(DEFAULT_RECHARGE_OPTIONS)
  const [wechatQrDataUrl, setWechatQrDataUrl] = useState<string | null>(null)
  const [wechatOutTradeNo, setWechatOutTradeNo] = useState<string | null>(null)
  const { toast } = useToast()

  type RechargeSyncResult = {
    success?: boolean
    status?: string
    remote_status?: string | null
    trade_status?: string | null
  }

  type WeixinJsapiPayParams = {
    appId: string
    timeStamp: string
    nonceStr: string
    package: string
    signType?: string
    paySign: string
  }

  useEffect(() => {
    if (open) {
      getRechargeOptions().then(options => {
        if (options && options.length > 0) {
          setRechargeOptions(options)
          // 如果有推荐的选项，默认选中推荐的
          const recommend = options.find(o => o.is_recommend)
          if (recommend) {
            setSelectedAmount(recommend.amount_cny)
          } else if (options.length > 0) {
             setSelectedAmount(options[0].amount_cny)
          }
        }
      })
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setWechatQrDataUrl(null)
      setWechatOutTradeNo(null)
    }
  }, [open])

  const buildAuthHeaders = async () => {
    const session = await getSession()
    const accessToken = session?.access_token
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`
    return headers
  }

  const syncRecharge = async (outTradeNo: string, headers: Record<string, string>) => {
    const res = await fetch('/api/v1/wallet/recharge/sync', {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify({ out_trade_no: outTradeNo })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || '同步失败')
    return (data || {}) as RechargeSyncResult
  }

  const pollRechargePaid = async (outTradeNo: string, headers: Record<string, string>) => {
    const startedAt = Date.now()
    for (let i = 0; i < 12; i++) {
      const result = await syncRecharge(outTradeNo, headers).catch(() => null)
      if (result?.status === 'PAID' || result?.success === true) return true
      if (Date.now() - startedAt > 24000) break
      await new Promise((r) => setTimeout(r, 2000))
    }
    return false
  }

  const invokeWeixinJsapiPay = async (payParams: WeixinJsapiPayParams, outTradeNo: string) => {
    const win = window as unknown as { WeixinJSBridge?: { invoke: (api: string, params: unknown, cb: (res: Record<string, unknown>) => void) => void } }
    const bridge = win.WeixinJSBridge
    if (!bridge || typeof bridge.invoke !== 'function') {
      throw new Error('当前环境不支持微信 JSAPI 支付，请使用微信扫码或 H5 支付')
    }

    const invokeOnce = () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        bridge.invoke(
          'getBrandWCPayRequest',
          {
            appId: payParams.appId,
            timeStamp: payParams.timeStamp,
            nonceStr: payParams.nonceStr,
            package: payParams.package,
            signType: payParams.signType || 'RSA',
            paySign: payParams.paySign
          },
          (res) => {
            const errMsg = String(res?.err_msg || res?.errMsg || '')
            if (errMsg.includes('ok')) return resolve(res)
            return reject(new Error(errMsg || '支付失败'))
          }
        )
      })

    await invokeOnce()
    const sp = new URLSearchParams(window.location.search)
    sp.set('recharge', 'success')
    sp.set('out_trade_no', outTradeNo)
    window.location.href = `/profile?${sp.toString()}`
  }

  const handleRecharge = async () => {
    setLoading(true)
    try {
      const headers = await buildAuthHeaders()

      const response = await fetch('/api/v1/wallet/recharge', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount_cny: selectedAmount,
          payment_method: paymentMethod,
          ...(paymentMethod === 'ALIPAY'
            ? {
                alipay_scene:
                  window.matchMedia?.('(max-width: 40rem)')?.matches ||
                  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent || '')
                    ? 'WAP'
                    : 'PC'
              }
            : null),
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const debugText =
          process.env.NODE_ENV !== 'production' && data?.debug
            ? `\n${JSON.stringify(data.debug)}`
            : ''
        throw new Error(`${data?.error || '充值请求失败'}${debugText}`)
      }

      // 支付宝支付
      if (paymentMethod === 'ALIPAY' && data.paymentUrl) {
        toast({
          title: '正在跳转支付宝...',
          description: '请在支付宝页面完成支付',
        })
        window.location.href = data.paymentUrl
        return
      }

      if (paymentMethod === 'WECHAT') {
        const wp = data?.wechatPay
        const outTradeNo = String(data?.out_trade_no || '').trim()

        if (!outTradeNo) throw new Error('缺少订单号')

        if (wp?.type === 'MOCK') {
          const mockResponse = await fetch('/api/v1/wallet/recharge/mock', {
            method: 'POST',
            headers,
            body: JSON.stringify({ out_trade_no: outTradeNo }),
          })
          const mockData = await mockResponse.json().catch(() => null)
          if (!mockResponse.ok) throw new Error(mockData?.error || '支付确认失败，请稍后重试')

          toast({
            title: '充值成功',
            description: `成功充值 ${selectedAmount} 元，获得 ${selectedAmount * 10} 易币`,
          })

          setTimeout(() => {
            setLoading(false)
            onOpenChange(false)
            onSuccess?.()
          }, 300)
          return
        }

        if (wp?.type === 'H5' && wp?.h5_url) {
          toast({
            title: '正在跳转微信支付...',
            description: '请在微信页面完成支付',
          })
          window.location.href = wp.h5_url
          return
        }

        if (wp?.type === 'JSAPI' && wp?.pay_params) {
          await invokeWeixinJsapiPay(wp.pay_params, outTradeNo)
          return
        }

        if (wp?.type === 'NATIVE' && wp?.code_url) {
          const dataUrl = await QRCode.toDataURL(String(wp.code_url), { margin: 1, width: 240 })
          setWechatQrDataUrl(dataUrl)
          setWechatOutTradeNo(outTradeNo)
          toast({
            title: '请使用微信扫码支付',
            description: '支付完成后将自动尝试同步余额',
          })

          const paid = await pollRechargePaid(outTradeNo, headers).catch(() => false)
          if (paid) {
            toast({
              title: '充值成功',
              description: `成功充值 ${selectedAmount} 元，获得 ${selectedAmount * 10} 易币`,
            })
            setTimeout(() => {
              setLoading(false)
              onOpenChange(false)
              onSuccess?.()
            }, 300)
            return
          }

          setLoading(false)
          return
        }

        throw new Error('微信支付下单失败，请稍后重试')
      }

      toast({
        title: '充值成功',
        description: `成功充值 ${selectedAmount} 元，获得 ${selectedAmount * 10} 易币`,
      })

      setTimeout(() => {
        setLoading(false)
        onOpenChange(false)
        onSuccess?.()
      }, 300)

    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : '充值失败，请稍后重试'
      toast({
        title: '充值失败',
        description: message,
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#FDFBF7] sm:max-w-[26.5625rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Coins className="w-6 h-6 text-amber-500" />
            充值易币
          </DialogTitle>
          <DialogDescription>
            充值易币用于解锁高级功能和参与社区活动
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {wechatQrDataUrl && wechatOutTradeNo && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-stone-700">微信扫码支付</h4>
              <div className="rounded-xl border border-stone-100 bg-white p-4 flex flex-col items-center gap-3">
                <img src={wechatQrDataUrl} alt="WeChat Pay QR" className="w-[15rem] h-[15rem]" />
                <div className="text-xs text-stone-500">订单号：{wechatOutTradeNo}</div>
                <Button
                  onClick={async () => {
                    setLoading(true)
                    try {
                      const headers = await buildAuthHeaders()
                      const paid = await pollRechargePaid(wechatOutTradeNo, headers)
                      if (paid) {
                        toast({ title: '已同步', description: '充值已到账' })
                        setTimeout(() => {
                          setLoading(false)
                          onOpenChange(false)
                          onSuccess?.()
                        }, 300)
                      } else {
                        toast({ title: '未确认到账', description: '如已支付请稍后再试', variant: 'destructive' })
                        setLoading(false)
                      }
                    } catch (e: unknown) {
                      const message = e instanceof Error ? e.message : '同步失败'
                      toast({ title: '同步失败', description: message, variant: 'destructive' })
                      setLoading(false)
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      正在同步...
                    </>
                  ) : (
                    '我已完成支付，立即同步'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* 金额选择 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-stone-700">选择充值金额</h4>
            <div className="grid grid-cols-3 gap-3">
              {rechargeOptions.map((option) => (
                <div
                  key={option.amount_cny}
                  onClick={() => option.amount_cny && setSelectedAmount(option.amount_cny)}
                  className={`relative cursor-pointer rounded-xl border-2 p-3 text-center transition-all ${
                    selectedAmount === option.amount_cny
                      ? 'border-[#C82E31] bg-red-50'
                      : 'border-stone-100 bg-white hover:border-red-100'
                  }`}
                >
                  {option.is_recommend && (
                    <div className="absolute -top-2.5 -right-2.5 bg-[#C82E31] text-white text-[0.625rem] px-2 py-0.5 rounded-full shadow-sm">
                      推荐
                    </div>
                  )}
                  <div className={`font-bold text-lg ${
                    selectedAmount === option.amount_cny ? 'text-[#C82E31]' : 'text-stone-800'
                  }`}>
                    ¥{option.amount_cny}
                  </div>
                  <div className="text-xs text-stone-500">
                    {option.coins_amount} 易币
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 支付方式 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-stone-700">支付方式</h4>
            <div className="space-y-2">
              <div
                onClick={() => setPaymentMethod('WECHAT')}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  paymentMethod === 'WECHAT'
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-stone-100 bg-white hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <WeChatIcon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-stone-700">微信支付</span>
                </div>
                {paymentMethod === 'WECHAT' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
              </div>

              <div
                onClick={() => setPaymentMethod('ALIPAY')}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  paymentMethod === 'ALIPAY'
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-stone-100 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                     <AlipayIcon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-stone-700">支付宝</span>
                </div>
                {paymentMethod === 'ALIPAY' && (
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
            <Button 
                onClick={handleRecharge} 
                className="w-full bg-[#C82E31] hover:bg-[#B02629] h-11 text-white shadow-md"
                disabled={loading || (paymentMethod === 'WECHAT' && Boolean(wechatQrDataUrl))}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        正在处理...
                    </>
                ) : (
                    `立即支付 ¥${selectedAmount}`
                )}
            </Button>
            <p className="text-xs text-center text-stone-400">
                点击支付即代表您已同意《易知充值服务协议》
            </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
