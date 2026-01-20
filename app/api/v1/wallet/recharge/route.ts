import { createAlipayOrder } from '@/lib/services/alipay'
import { createRechargeOrder } from '@/lib/services/wallet'
import { createWechatPayOrder, getWechatPayConfig, type WechatPayScene } from '@/lib/services/wechatpay'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type RechargeOrder = {
  out_trade_no: string
  amount_cny: number
  coins_amount: number
  payment_method?: string | null
} & Record<string, unknown>

function getRequestBaseUrl(request: Request) {
  try {
    const url = new URL(request.url)
    if (url.origin && url.origin !== 'null') return url.origin
  } catch {}

  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host) return `${proto}://${host}`

  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, '')
  return 'http://localhost:3000'
}

export async function POST(request: Request) {
  const supabase = await createClient()
  let {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (token) {
      const { data: headerAuthData, error: headerAuthError } = await supabase.auth.getUser(token)
      if (!headerAuthError && headerAuthData.user) {
        user = headerAuthData.user
        authError = null
      } else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const adminForAuth = createAdminClient()
          const { data: adminAuthData, error: adminAuthError } = await adminForAuth.auth.getUser(token)
          if (!adminAuthError && adminAuthData.user) {
            user = adminAuthData.user
            authError = null
          }
        } catch {}
      }
    }
  }

  if (authError || !user) {
    const debug =
      process.env.NODE_ENV !== 'production'
        ? {
            hasAuthHeader: Boolean(request.headers.get('authorization') || request.headers.get('Authorization')),
            hasCookieHeader: Boolean(request.headers.get('cookie')),
            authError: authError?.message || null,
          }
        : null

    return NextResponse.json({ error: 'Unauthorized', ...(debug ? { debug } : {}) }, { status: 401 })
  }

  try {
    let body: unknown = null
    try {
      body = (await request.json()) as unknown
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const payload = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
    const amountCny = Number(payload.amount_cny)
    const paymentMethodRaw = String(payload.payment_method || '').toUpperCase()
    const alipaySceneRaw = String(payload.alipay_scene ?? payload.alipayScene ?? payload.scene ?? '').toUpperCase()

    if (!Number.isFinite(amountCny) || amountCny <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!['WECHAT', 'ALIPAY'].includes(paymentMethodRaw)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    const paymentMethod = paymentMethodRaw as 'WECHAT' | 'ALIPAY'

    const formatOrdersSchemaError = (err: unknown) => {
      const e = err as { message?: unknown; code?: unknown }
      const msg = typeof e?.message === 'string' ? e.message : ''
      if (e?.code !== 'PGRST204') return null
      const match = msg.match(/Column '([^']+)' of relation 'orders' does not exist/)
      if (!match) return null
      const missingColumn = match[1]
      return `数据库表结构不匹配：orders.${missingColumn} 不存在，请执行 supabase/migrations/20260117_dual_track_currency.sql`
    }

    let order: RechargeOrder
    try {
      order = await createRechargeOrder(
        {
          userId: user.id,
          amountCny,
          paymentMethod
        },
        supabase
      ) as RechargeOrder
    } catch (err: unknown) {
      const e = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
      console.error('createRechargeOrder error:', e)

      const schemaError = formatOrdersSchemaError(e)
      if (schemaError) {
        return NextResponse.json(
          {
            error: schemaError,
            ...(process.env.NODE_ENV !== 'production'
              ? { debug: { details: e?.details, hint: e?.hint, code: e?.code, message: e?.message } }
              : {})
          },
          { status: 500 }
        )
      }

      const message = typeof e?.message === 'string' ? e.message : ''
      const details = typeof e?.details === 'string' ? e.details : ''
      const isPermissionError =
        message.includes('row-level security') ||
        message.includes('permission denied') ||
        message.includes('42501') ||
        details.includes('row-level security') ||
        details.includes('permission denied') ||
        e?.code === '42501'

      if (isPermissionError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient()
        try {
          order = await createRechargeOrder(
            {
              userId: user.id,
              amountCny,
              paymentMethod
            },
            admin
          ) as RechargeOrder
        } catch (err2: unknown) {
          const e2 = err2 as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
          console.error('createRechargeOrder error (service role):', e2)
          const schemaError2 = formatOrdersSchemaError(e2)
          if (schemaError2) {
            return NextResponse.json(
              {
                error: schemaError2,
                ...(process.env.NODE_ENV !== 'production'
                  ? {
                      debug: { details: e2?.details, hint: e2?.hint, code: e2?.code, message: e2?.message }
                    }
                  : {})
              },
              { status: 500 }
            )
          }

          const devDetails =
            process.env.NODE_ENV !== 'production'
              ? {
                  details: e2?.details,
                  hint: e2?.hint,
                  code: e2?.code,
                  message: e2?.message
                }
              : null

          const errorMessage =
            process.env.NODE_ENV !== 'production' && typeof e2?.message === 'string' && e2.message
              ? e2.message
              : 'Failed to create recharge order'

          return NextResponse.json(
            {
              error: errorMessage,
              ...(devDetails ? { debug: devDetails } : {})
            },
            { status: 500 }
          )
        }
      } else {
        const devDetails =
          process.env.NODE_ENV !== 'production'
            ? {
                details: e?.details,
                hint: e?.hint,
                code: e?.code,
                message: e?.message
              }
            : null

        const errorMessage =
          process.env.NODE_ENV !== 'production' && typeof e?.message === 'string' && e.message ? e.message : 'Failed to create recharge order'

        return NextResponse.json(
          {
            error: errorMessage,
            ...(devDetails ? { debug: devDetails } : {})
          },
          { status: 500 }
        )
      }
    }

    let paymentUrl = null
    let wechatPay: unknown = null
    if (paymentMethod === 'ALIPAY') {
      try {
        const ua = request.headers.get('user-agent') || ''
        const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
        const scene = alipaySceneRaw === 'WAP' || alipaySceneRaw === 'MOBILE' ? 'WAP' : isMobileUa ? 'WAP' : 'PC'
        const result = await createAlipayOrder({
          outTradeNo: order.out_trade_no,
          totalAmount: order.amount_cny,
          subject: `充值 ${order.coins_amount} 易币`,
          body: `用户 ${user.id} 充值`,
          baseUrl: getRequestBaseUrl(request),
          scene
        })
        paymentUrl = result
      } catch (err: unknown) {
        const e = err as { message?: unknown }
        console.error('Alipay creation error:', e)
        if (e.message === 'Alipay is not configured') {
           return NextResponse.json({ error: '支付宝支付暂未配置，请联系管理员' }, { status: 503 })
        }
        return NextResponse.json({ error: 'Failed to create Alipay order' }, { status: 500 })
      }
    }

    if (paymentMethod === 'WECHAT') {
      const config = getWechatPayConfig()
      if (!config) {
        if (process.env.ENABLE_MOCK_PAYMENT || process.env.NODE_ENV !== 'production') {
          wechatPay = { type: 'MOCK' as const }
        } else {
          return NextResponse.json({ error: '微信支付暂未配置，请联系管理员' }, { status: 503 })
        }
      } else {
        const ua = request.headers.get('user-agent') || ''
        const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
        const wechatSceneRaw = String(payload.wechat_scene ?? payload.wechatScene ?? '').toUpperCase()
        let scene: WechatPayScene = isMobileUa ? 'H5' : 'NATIVE'
        if (wechatSceneRaw === 'JSAPI' || wechatSceneRaw === 'H5' || wechatSceneRaw === 'NATIVE') {
          scene = wechatSceneRaw as WechatPayScene
        }

        const baseUrl = getRequestBaseUrl(request)
        const notifyUrl = `${baseUrl}/api/v1/webhooks/payment/wechat`
        const redirectUrl = `${baseUrl}/profile?recharge=success&out_trade_no=${encodeURIComponent(order.out_trade_no)}`

        const forwardedFor = request.headers.get('x-forwarded-for') || ''
        const firstIp = forwardedFor.split(',')[0]?.trim()
        const remoteIp =
          firstIp ||
          request.headers.get('x-real-ip') ||
          request.headers.get('cf-connecting-ip') ||
          request.headers.get('x-client-ip') ||
          ''

        let payerOpenid: string | undefined = undefined
        if (scene === 'JSAPI') {
          const fetchOpenid = async (client: any) => {
            const { data } = await client.from('profiles').select('wechat_openid').eq('id', user.id).maybeSingle()
            const openid = typeof (data as any)?.wechat_openid === 'string' ? (data as any).wechat_openid.trim() : ''
            return openid || null
          }

          let openid = await fetchOpenid(supabase)
          if (!openid && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
              const admin = createAdminClient()
              openid = await fetchOpenid(admin)
            } catch {}
          }
          if (!openid) {
            return NextResponse.json({ error: '缺少微信 openid，无法发起 JSAPI 支付' }, { status: 400 })
          }
          payerOpenid = openid
        }

        try {
          wechatPay = await createWechatPayOrder({
            outTradeNo: order.out_trade_no,
            amountCny: Number(order.amount_cny ?? order.amount ?? amountCny),
            description: `充值 ${order.coins_amount} 易币`,
            notifyUrl,
            payerClientIp: scene === 'H5' ? String(remoteIp || '').trim() : undefined,
            redirectUrl: scene === 'H5' ? redirectUrl : undefined,
            payerOpenid,
            scene
          })
        } catch (err: unknown) {
          const e = err as { message?: unknown; details?: unknown; status?: unknown }
          const msg = typeof e?.message === 'string' ? e.message : 'Failed to create WeChat order'
          if (msg === 'WeChat Pay is not configured') {
            return NextResponse.json({ error: '微信支付暂未配置，请联系管理员' }, { status: 503 })
          }
          if (msg === 'WeChat Pay private key is invalid') {
            return NextResponse.json(
              {
                error: '微信支付私钥格式不正确，请检查 WECHAT_PAY_PRIVATE_KEY',
                ...(process.env.NODE_ENV !== 'production' ? { debug: { message: msg } } : {})
              },
              { status: 503 }
            )
          }
          if (msg === 'WeChat Pay api v3 key is invalid') {
            return NextResponse.json(
              {
                error: '微信支付 API V3 Key 格式不正确，请检查 WECHAT_PAY_API_V3_KEY',
                ...(process.env.NODE_ENV !== 'production' ? { debug: { message: msg } } : {})
              },
              { status: 503 }
            )
          }
          if (msg === 'Missing payer client ip') {
            return NextResponse.json({ error: '无法获取用户 IP，微信 H5 支付创建失败' }, { status: 400 })
          }
          return NextResponse.json(
            {
              error: process.env.NODE_ENV !== 'production' ? msg : 'Failed to create WeChat order',
              ...(process.env.NODE_ENV !== 'production' ? { debug: { details: e?.details, status: e?.status } } : {})
            },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ ...order, paymentUrl, wechatPay })
  } catch (error) {
    console.error('Recharge error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
