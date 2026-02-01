import { corsHeaders } from '@/lib/api/cors'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

// 生成6位随机验证码
function generateCode(): string {
  const randomBytes = crypto.randomBytes(3)
  const code = (randomBytes.readUIntBE(0, 3) % 900000) + 100000
  return code.toString()
}

/**
 * @swagger
 * /api/sms/send-code:
 *   post:
 *     summary: POST /api/sms/send-code
 *     description: Auto-generated description for POST /api/sms/send-code
 *     tags:
 *       - Sms
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body

    const normalizeCNPhone = (value: string) => {
      const trimmed = value?.trim()
      if (!trimmed) return ''
      const digits = trimmed.replace(/\D/g, '')
      if (digits.length === 11 && /^1[3-9]\d{9}$/.test(digits)) {
        return `+86${digits}`
      }
      if (digits.length === 13 && digits.startsWith('86')) {
        const local = digits.slice(2)
        if (/^1[3-9]\d{9}$/.test(local)) {
          return `+86${local}`
        }
      }
      return ''
    }

    const normalizedPhone = normalizeCNPhone(phone)

    // 验证手机号格式
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: '请输入有效的手机号' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 检查环境变量
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET
    const signName = process.env.ALIYUN_SMS_SIGN_NAME || '易知'
    const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE

    if (!accessKeyId || !accessKeySecret) {
      console.error('Missing Aliyun credentials:', {
        hasAccessKeyId: !!accessKeyId,
        hasAccessKeySecret: !!accessKeySecret,
      })
      return NextResponse.json(
        { error: '短信服务配置错误：缺少阿里云访问凭证' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // 检查 Supabase 环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase credentials:', {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey,
      })
      return NextResponse.json(
        { error: '数据库配置错误：缺少 Supabase 配置' },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // 生成验证码
    const code = generateCode()

    // 配置阿里云客户端
    let sendSmsResponse
    try {
      // 使用 require 方式导入，更兼容 Next.js/Turbopack
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Dysmsapi20170525 = require('@alicloud/dysmsapi20170525')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const OpenApi = require('@alicloud/openapi-client')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Util = require('@alicloud/tea-util')

      const config = new OpenApi.Config({
        accessKeyId: accessKeyId,
        accessKeySecret: accessKeySecret,
      })
      config.endpoint = 'dysmsapi.aliyuncs.com'
      
      // 使用 require 时，default 是必需的
      const ClientClass = Dysmsapi20170525.default || Dysmsapi20170525
      const client = new ClientClass(config)

      // 发送短信
      const SendSmsRequest = Dysmsapi20170525.SendSmsRequest
      const sendSmsRequest = new SendSmsRequest({
        phoneNumbers: normalizedPhone.slice(3),
        signName: signName,
        templateCode: templateCode || 'SMS_123456789', // 如果没有配置，使用默认模板
        templateParam: JSON.stringify({ code }),
      })

      const runtime = new Util.RuntimeOptions({
        connectTimeout: 50000,
        readTimeout: 50000,
        autoretry: true,
        maxAttempts: 3,
      })
      sendSmsResponse = await client.sendSmsWithOptions(sendSmsRequest, runtime)

      if (sendSmsResponse.body.code !== 'OK') {
        console.error('Aliyun SMS error:', {
          code: sendSmsResponse.body.code,
          message: sendSmsResponse.body.message,
          requestId: sendSmsResponse.body.requestId,
        })
        
        // 提供更友好的错误信息
        let errorMessage = sendSmsResponse.body.message || '发送验证码失败，请稍后重试'
        if (sendSmsResponse.body.code === 'InvalidSignName') {
          errorMessage = '短信签名配置错误，请检查签名名称是否正确且已审核通过'
        } else if (sendSmsResponse.body.code === 'InvalidTemplateCode') {
          errorMessage = '短信模板配置错误，请检查模板代码是否正确且已审核通过'
        } else if (sendSmsResponse.body.code === 'NoPermission' || sendSmsResponse.body.code === '403') {
          errorMessage = '权限不足：请检查 AccessKey 是否已授权短信服务权限，签名和模板是否已审核通过'
        } else if (sendSmsResponse.body.code === 'isv.BUSINESS_LIMIT_CONTROL') {
          errorMessage = '发送频率过高，请稍后再试'
        } else if (sendSmsResponse.body.code === 'isv.INSUFFICIENT_BALANCE') {
          errorMessage = '账户余额不足，请充值后重试'
        }
        
        return NextResponse.json(
          { error: errorMessage },
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }
    } catch (smsError: any) {
      console.error('Aliyun SMS API error:', {
        message: smsError.message,
        code: smsError.code,
        stack: smsError.stack,
      })
      
      // 处理权限错误
      let errorMessage = smsError.message || '未知错误'
      if (smsError.message?.includes('NoPermission') || smsError.message?.includes('403')) {
        errorMessage = '权限不足：请检查 AccessKey 是否已授权短信服务权限，签名和模板是否已审核通过'
      }
      
      return NextResponse.json(
        { error: `短信发送失败: ${errorMessage}` },
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // 将验证码存储到 Supabase（5分钟过期）
    try {
      const supabaseAdmin = createSupabaseAdmin()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

      const { error: dbError } = await supabaseAdmin
        .from('sms_codes')
        .upsert(
          {
            phone: normalizedPhone,
            code: code,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'phone',
          }
        )

      if (dbError) {
        console.error('Error saving SMS code to database:', dbError)
        // 即使数据库保存失败，短信已发送，仍然返回成功
        // 但记录错误以便排查
      }
    } catch (dbError: any) {
      console.error('Error creating Supabase admin client or saving code:', dbError)
      // 即使数据库保存失败，短信已发送，仍然返回成功
      // 但记录错误以便排查
    }

    return NextResponse.json(
      { success: true, message: '验证码已发送' },
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Unexpected error in send-code route:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || '发送验证码失败，请稍后重试' },
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}
