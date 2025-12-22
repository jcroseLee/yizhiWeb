import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseWithToken } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

interface MasterRespondPayload {
  consultationId?: string
  action?: 'accept' | 'reject'
  reason?: string
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
    const supabase = createSupabaseWithToken(token)

    const payload = (await request.json().catch(() => ({}))) as MasterRespondPayload
    const { consultationId, action, reason } = payload

    if (!consultationId || !action) {
      return NextResponse.json({ error: '缺少必要参数' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: '无效的操作类型' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    const { data: authUser, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser?.user) {
      console.error('Failed to get auth user:', authError)
      return NextResponse.json({ error: '用户未登录' }, {
        status: UNAUTHORIZED,
        headers: corsHeaders,
      })
    }

    const userId = authUser.user.id

    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select(
        '*, masters(id, user_id, name), master_services(name)'
      )
      .eq('id', consultationId)
      .maybeSingle()

    if (consultationError) {
      console.error('Failed to fetch consultation', consultationError)
      return NextResponse.json({ error: '订单查询失败' }, {
        status: INTERNAL_ERROR,
        headers: corsHeaders,
      })
    }

    if (!consultation) {
      return NextResponse.json({ error: '订单不存在' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    if (!consultation.masters?.user_id || consultation.masters.user_id !== userId) {
      return NextResponse.json({ error: '无权操作该订单' }, {
        status: UNAUTHORIZED,
        headers: corsHeaders,
      })
    }

    if (action === 'accept') {
      if (consultation.status !== 'awaiting_master') {
        return NextResponse.json({ error: '当前状态不可接单' }, {
          status: BAD_REQUEST,
          headers: corsHeaders,
        })
      }

      const { data: updatedConsultation, error: updateError } = await supabase
        .from('consultations')
        .update({
          status: 'in_progress',
        })
        .eq('id', consultationId)
        .select('*, masters(user_id), master_services(name)')
        .maybeSingle()

      if (updateError || !updatedConsultation) {
        console.error('Failed to update consultation status to in_progress', updateError)
        return NextResponse.json({ error: '接单失败' }, {
          status: INTERNAL_ERROR,
          headers: corsHeaders,
        })
      }

      await supabase.from('messages').insert({
        sender_id: userId,
        receiver_id: updatedConsultation.user_id,
        consultation_id: consultationId,
        content: `卦师已接单，服务即将开始，项目：${consultation.master_services?.name ?? '咨询服务'}`,
        message_type: 'system',
        metadata: {
          event: 'order_accepted',
          consultation_id: consultationId,
        },
      })

      return NextResponse.json({ consultation: updatedConsultation }, {
        status: 200,
        headers: corsHeaders,
      })
    }

    // Reject flow
    if (consultation.status !== 'awaiting_master') {
      return NextResponse.json({ error: '当前状态不可拒单' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    const { data: cancelledConsultation, error: cancelError } = await supabase
      .from('consultations')
      .update({
        status: 'cancelled',
      })
      .eq('id', consultationId)
      .select('*')
      .maybeSingle()

    if (cancelError || !cancelledConsultation) {
      console.error('Failed to cancel consultation', cancelError)
      return NextResponse.json({ error: '拒单失败' }, {
        status: INTERNAL_ERROR,
        headers: corsHeaders,
      })
    }

    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: cancelledConsultation.user_id,
      consultation_id: consultationId,
      content: '卦师暂时无法接单，订单已取消。',
      message_type: 'system',
      metadata: {
        event: 'order_rejected',
        consultation_id: consultationId,
        reason: reason ?? null,
      },
    })

    return NextResponse.json({ consultation: cancelledConsultation }, {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    console.error('Unexpected error in consultation-master-respond', error)
    return NextResponse.json({ error: (error as Error).message ?? '未知错误' }, {
      status: INTERNAL_ERROR,
      headers: corsHeaders,
    })
  }
}

