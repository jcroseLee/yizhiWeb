import { getAlipaySdk } from '@/lib/services/alipay'
import { creditRechargeFallback, loadOrderForRecharge, resolveCoinsAmount, syncYiCoins } from '@/lib/services/paymentWebhook'
import { confirmRecharge } from '@/lib/services/wallet'
import { createAdminClient } from '@/lib/supabase/admin'
import { log, LogLevel } from '@/lib/utils/logger'

/**
 * @swagger
 * /api/v1/webhooks/payment/alipay:
 *   post:
 *     summary: POST /api/v1/webhooks/payment/alipay
 *     description: Auto-generated description for POST /api/v1/webhooks/payment/alipay
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
    const form = await request.formData()
    const payload: Record<string, string> = {}
    for (const [key, value] of form.entries()) {
      payload[key] = String(value)
    }

    log(LogLevel.INFO, 'Alipay webhook received', { outTradeNo: payload.out_trade_no, tradeStatus: payload.trade_status })

    const sdk = getAlipaySdk()
    if (sdk && typeof (sdk as any).checkNotifySign === 'function') {
      const verified = await Promise.resolve((sdk as any).checkNotifySign(payload))
      if (!verified) {
        log(LogLevel.WARN, 'Alipay webhook invalid signature', { payload })
        return new Response('failure', { status: 400 })
      }
    }

    const tradeStatus = payload.trade_status
    if (!['TRADE_SUCCESS', 'TRADE_FINISHED'].includes(String(tradeStatus))) {
      log(LogLevel.INFO, 'Alipay webhook ignored status', { tradeStatus })
      return new Response('success')
    }

    const outTradeNo = payload.out_trade_no
    if (!outTradeNo) return new Response('failure', { status: 400 })

    const admin = createAdminClient()
    const order = await loadOrderForRecharge(admin, outTradeNo)
    if (!order) {
      log(LogLevel.WARN, 'Alipay webhook order not found', { outTradeNo })
      return new Response('failure', { status: 404 })
    }
    if (order.status === 'PAID') {
      log(LogLevel.INFO, 'Alipay webhook order already paid', { outTradeNo })
      return new Response('success')
    }

    const coinsAmount = resolveCoinsAmount(order)
    if (!coinsAmount || coinsAmount <= 0) {
      log(LogLevel.ERROR, 'Alipay webhook invalid coins amount', { outTradeNo, coinsAmount })
      return new Response('failure', { status: 500 })
    }

    try {
      await confirmRecharge(order.user_id, coinsAmount, outTradeNo, admin)
      log(LogLevel.INFO, 'Alipay webhook recharge confirmed', { userId: order.user_id, outTradeNo, coinsAmount })
    } catch (e) {
      log(LogLevel.ERROR, 'Alipay webhook confirmRecharge failed, trying fallback', { userId: order.user_id, outTradeNo, error: e })
      await creditRechargeFallback(admin, order.user_id, coinsAmount, outTradeNo)
    }

    await syncYiCoins(admin, order.user_id)

    return new Response('success')
  } catch (error) {
    console.error('Alipay webhook error:', error)
    log(LogLevel.ERROR, 'Alipay webhook exception', { error })
    return new Response('failure', { status: 500 })
  }
}
