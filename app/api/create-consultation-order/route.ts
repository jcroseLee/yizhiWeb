import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseWithToken } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

interface CreateOrderPayload {
  serviceId?: string
  masterId?: string
  question?: string
  agreementAccepted?: boolean
  birthDate?: string | null
  birthTime?: string | null
  birthPlace?: string | null
  gender?: 'male' | 'female' | 'unknown'
  contactInfo?: string | null
}

const BAD_REQUEST = 400
const UNAUTHORIZED = 401
const METHOD_NOT_ALLOWED = 405
const INTERNAL_ERROR = 500

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase env variables')
      throw new Error('Server configuration error')
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, {
        status: UNAUTHORIZED,
        headers: corsHeaders,
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // Create client with service role key and user's token in headers for RLS operations
    const supabase = createSupabaseWithToken(token)

    // 第一重校验：验证用户ID有效性
    const { data: authUser, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser?.user) {
      console.error('Failed to get auth user:', authError)
      return NextResponse.json({ error: '用户未登录，请重新登录' }, {
        status: UNAUTHORIZED,
        headers: corsHeaders,
      })
    }

    const userId = authUser.user.id

    // 第二重校验：验证用户Profile是否存在
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, phone, wechat_openid')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError)
      return NextResponse.json({ error: '用户信息查询失败，请重新登录' }, {
        status: INTERNAL_ERROR,
        headers: corsHeaders,
      })
    }

    if (!profile) {
      return NextResponse.json({ error: '用户信息不存在，请重新登录' }, {
        status: UNAUTHORIZED,
        headers: corsHeaders,
      })
    }

    const payload = (await request.json().catch(() => ({}))) as CreateOrderPayload
    const {
      serviceId,
      masterId,
      question,
      agreementAccepted,
      birthDate,
      birthTime,
      birthPlace,
      gender = 'unknown',
      contactInfo,
    } = payload

    if (!serviceId || !masterId || !question) {
      return NextResponse.json({ error: '缺少必要参数' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    if (!agreementAccepted) {
      return NextResponse.json({ error: '请先阅读并同意《用户咨询服务协议》' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    // 加载服务信息（使用 * 以避免因可选列缺失而报错）
    const { data: service, error: serviceError } = await supabase
      .from('master_services')
      .select('*')
      .eq('id', serviceId)
      .maybeSingle()

    if (serviceError) {
      console.error('Failed to load service', serviceError)
      return NextResponse.json({ error: '服务加载失败' }, {
        status: INTERNAL_ERROR,
        headers: corsHeaders,
      })
    }

    if (!service || !service.is_active) {
      return NextResponse.json({ error: '服务已下架或不存在' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    if (service.master_id !== masterId) {
      return NextResponse.json({ error: '服务与卦师信息不匹配' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    const trimmedQuestion = question.trim()
    const minLen = (service as any)?.question_min_length ?? 30
    const maxLen = (service as any)?.question_max_length ?? 800
    const questionLength = [...trimmedQuestion].length

    if (questionLength < minLen || questionLength > maxLen) {
      return NextResponse.json(
        {
          error: `问题描述需在 ${minLen} - ${maxLen} 字之间，当前为 ${questionLength} 字`,
        },
        {
          status: BAD_REQUEST,
          headers: corsHeaders,
        }
      )
    }

    const requiresBirthInfo = (service as any)?.requires_birth_info ?? true
    if (requiresBirthInfo && (!birthDate || !birthTime || !birthPlace)) {
      return NextResponse.json({ error: '请完整填写出生信息' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    const questionSummary =
      trimmedQuestion.length > 60 ? `${trimmedQuestion.slice(0, 57)}...` : trimmedQuestion

    // Ensure wallet row exists
    await supabase
      .from('user_wallets')
      .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })

    const consultationChannel = service.service_type === '语音' ? 'voice' : 'text'
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: consultation, error: insertError } = await supabase
      .from('consultations')
      .insert({
        master_id: masterId,
        user_id: userId,
        // 不插入 service_id 以兼容旧表结构
        status: 'pending',
        question: trimmedQuestion,
        price: service.price,
      })
      .select('*')
      .maybeSingle()

    if (insertError || !consultation) {
      console.error('Failed to create consultation', insertError)
      return NextResponse.json({ error: '创建订单失败' }, {
        status: INTERNAL_ERROR,
        headers: corsHeaders,
      })
    }

    const responsePayload = {
      consultation,
      service: {
        id: service.id,
        price: service.price,
        consultation_duration_minutes: service.consultation_duration_minutes,
        consultation_session_count: service.consultation_session_count,
        service_type: service.service_type,
      },
    }

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    console.error('Unexpected error in create-consultation-order', error)
    return NextResponse.json({ error: (error as Error).message ?? '未知错误' }, {
      status: INTERNAL_ERROR,
      headers: corsHeaders,
    })
  }
}

