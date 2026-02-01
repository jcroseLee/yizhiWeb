import { creditRechargeFallback, loadOrderForRecharge, resolveCoinsAmount, syncYiCoins } from '@/lib/services/paymentWebhook'
import { confirmRecharge } from '@/lib/services/wallet'
import { decryptWechatPayResource, getWechatPayConfigWithReason, getWechatPayPlatformCertificate, verifyWechatPayCallbackSignature } from '@/lib/services/wechatpay'
import { createAdminClient } from '@/lib/supabase/admin'
import { log, LogLevel } from '@/lib/utils/logger'

function ok() {
  return new Response(JSON.stringify({ code: 'SUCCESS', message: '成功' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ code: 'FAIL', message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * @swagger
 * /api/v1/webhooks/payment/wechat:
 *   post:
 *     summary: POST /api/v1/webhooks/payment/wechat
 *     description: Auto-generated description for POST /api/v1/webhooks/payment/wechat
 *     tags:
 *       - V1
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  try {
    const { config: cfg, reason } = getWechatPayConfigWithReason()
    if (!cfg) {
      log(LogLevel.ERROR, 'WeChat Pay webhook config error', { reason })
      if (reason === 'INVALID_PRIVATE_KEY') return fail('WeChat Pay private key is invalid', 503)
      if (reason === 'INVALID_API_V3_KEY') return fail('WeChat Pay api v3 key is invalid', 503)
      return fail('WeChat Pay is not configured', 503)
    }

    const bodyText = await request.text()

    const signature = request.headers.get('wechatpay-signature') || request.headers.get('Wechatpay-Signature') || ''
    const timestamp = request.headers.get('wechatpay-timestamp') || request.headers.get('Wechatpay-Timestamp') || ''
    const nonce = request.headers.get('wechatpay-nonce') || request.headers.get('Wechatpay-Nonce') || ''
    const serial = request.headers.get('wechatpay-serial') || request.headers.get('Wechatpay-Serial') || ''

    log(LogLevel.INFO, 'WeChat Pay webhook received', { signature, timestamp, nonce, serial })

    if (!signature || !timestamp || !nonce || !serial) return fail('Missing signature headers')

    const cert = await getWechatPayPlatformCertificate(serial)
    if (!cert?.public_key_pem) return fail('Platform certificate not found', 400)

    const verified = verifyWechatPayCallbackSignature({
      bodyText,
      timestamp,
      nonce,
      signature,
      publicKeyPem: cert.public_key_pem
    })
    if (!verified) return fail('Invalid signature', 400)

    let payload: any = null
    try {
      payload = bodyText ? JSON.parse(bodyText) : null
    } catch {
      return fail('Invalid JSON body')
    }

    const resource = payload?.resource
    if (!resource?.ciphertext || !resource?.nonce) return fail('Missing resource')

    let decrypted: any = null
    try {
      const plain = decryptWechatPayResource(cfg.apiV3Key, {
        nonce: String(resource.nonce),
        associated_data: String(resource.associated_data || ''),
        ciphertext: String(resource.ciphertext)
      })
      decrypted = plain ? JSON.parse(plain) : null
    } catch {
      return fail('Failed to decrypt resource', 400)
    }

    const outTradeNo = String(decrypted?.out_trade_no || '').trim()
    const tradeState = String(decrypted?.trade_state || '').trim()
    if (!outTradeNo) return fail('Missing out_trade_no', 400)

    if (tradeState !== 'SUCCESS') return ok()

    const admin = createAdminClient()
    const order = await loadOrderForRecharge(admin, outTradeNo)
    if (!order) return ok()
    if (order.status === 'PAID') return ok()

    const coinsAmount = resolveCoinsAmount(order)
    if (!coinsAmount || coinsAmount <= 0) return ok()

    try {
      await confirmRecharge(order.user_id, coinsAmount, outTradeNo, admin)
    } catch {
      await creditRechargeFallback(admin, order.user_id, coinsAmount, outTradeNo)
    }

    await syncYiCoins(admin, order.user_id)

    return ok()
  } catch (error) {
    console.error('WeChat Pay webhook error:', error)
    return fail('Internal Server Error', 500)
  }
}
