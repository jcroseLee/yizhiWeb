import { AlipaySdk } from 'alipay-sdk'

const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY
const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'http://localhost:3000'

if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY || !ALIPAY_PUBLIC_KEY) {
  console.warn('Alipay configuration is missing')
}

let sdkInstance: AlipaySdk | null = null

export function getAlipaySdk() {
  if (sdkInstance) return sdkInstance

  if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY || !ALIPAY_PUBLIC_KEY) {
    return null
  }

  const env = (process.env.ALIPAY_ENV || '').trim().toLowerCase()
  const isSandbox = env === 'sandbox'

  sdkInstance = new AlipaySdk({
    appId: ALIPAY_APP_ID,
    privateKey: ALIPAY_PRIVATE_KEY,
    alipayPublicKey: ALIPAY_PUBLIC_KEY,
    ...(isSandbox ? ({ endpoint: 'https://openapi.alipaydev.com' } as any) : {}),
  })
  return sdkInstance
}

export interface AlipayOrderParams {
  outTradeNo: string
  totalAmount: number
  subject: string
  body?: string
  baseUrl?: string
  scene?: 'PC' | 'WAP'
}

export async function createAlipayOrder(params: AlipayOrderParams) {
  const alipaySdk = getAlipaySdk()
  if (!alipaySdk) {
    throw new Error('Alipay is not configured')
  }

  const baseUrlRaw = (params.baseUrl || DEFAULT_APP_URL || '').trim()
  const baseUrl = baseUrlRaw.replace(/\/+$/, '')
  const returnUrl = `${baseUrl}/profile?recharge=success&out_trade_no=${encodeURIComponent(params.outTradeNo)}`

  const scene = params.scene || 'PC'

  const result =
    scene === 'WAP'
      ? alipaySdk.pageExec('alipay.trade.wap.pay', {
          method: 'GET',
          notifyUrl: `${baseUrl}/api/v1/webhooks/payment/alipay`,
          returnUrl,
          bizContent: {
            outTradeNo: params.outTradeNo,
            productCode: 'QUICK_WAP_WAY',
            totalAmount: params.totalAmount.toFixed(2),
            subject: params.subject,
            body: params.body,
          },
        })
      : alipaySdk.pageExec('alipay.trade.page.pay', {
          method: 'GET',
          notifyUrl: `${baseUrl}/api/v1/webhooks/payment/alipay`,
          returnUrl,
          bizContent: {
            outTradeNo: params.outTradeNo,
            productCode: 'FAST_INSTANT_TRADE_PAY',
            totalAmount: params.totalAmount.toFixed(2),
            subject: params.subject,
            body: params.body,
          },
        })

  // result is the payment URL
  return result
}
