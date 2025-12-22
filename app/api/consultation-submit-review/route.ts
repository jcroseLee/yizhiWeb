import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseWithToken } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

interface SubmitReviewPayload {
  consultationId?: string
  rating?: number
  content?: string
  tags?: string[]
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

    const payload = (await request.json().catch(() => ({}))) as SubmitReviewPayload
    const { consultationId, rating, content, tags } = payload

    if (!consultationId) {
      return NextResponse.json({ error: '缺少订单信息' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '请选择1-5星评价' }, {
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

    // Load consultation
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select('*, masters(id, user_id)')
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

    // Only the user who placed the order can submit review
    if (consultation.user_id !== userId) {
      return NextResponse.json({ error: '无权操作该订单' }, {
        status: UNAUTHORIZED,
        headers: corsHeaders,
      })
    }

    // Check if consultation is in a state that allows review
    if (!['in_progress', 'pending_settlement', 'completed'].includes(consultation.status)) {
      return NextResponse.json({ error: '当前订单状态不允许评价' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    // Check if review already submitted
    if (consultation.review_submitted && consultation.review_id) {
      return NextResponse.json({ error: '您已提交过评价' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    if (!consultation.masters?.id) {
      return NextResponse.json({ error: '订单信息不完整' }, {
        status: BAD_REQUEST,
        headers: corsHeaders,
      })
    }

    const masterId = consultation.masters.id

    // Create or update review
    const reviewData: any = {
      master_id: masterId,
      user_id: userId,
      rating,
      content: content?.trim() || null,
      tags: tags && tags.length > 0 ? tags : [],
    }

    // Check if review already exists (upsert)
    const { data: existingReview } = await supabase
      .from('master_reviews')
      .select('id')
      .eq('master_id', masterId)
      .eq('user_id', userId)
      .maybeSingle()

    let reviewId: string

    if (existingReview) {
      // Update existing review
      const { data: updatedReview, error: updateError } = await supabase
        .from('master_reviews')
        .update(reviewData)
        .eq('id', existingReview.id)
        .select('id')
        .maybeSingle()

      if (updateError || !updatedReview) {
        console.error('Failed to update review', updateError)
        return NextResponse.json({ error: '更新评价失败' }, {
          status: INTERNAL_ERROR,
          headers: corsHeaders,
        })
      }
      reviewId = updatedReview.id
    } else {
      // Create new review
      const { data: newReview, error: insertError } = await supabase
        .from('master_reviews')
        .insert(reviewData)
        .select('id')
        .maybeSingle()

      if (insertError || !newReview) {
        console.error('Failed to create review', insertError)
        return NextResponse.json({ error: '提交评价失败' }, {
          status: INTERNAL_ERROR,
          headers: corsHeaders,
        })
      }
      reviewId = newReview.id
    }

    // Update consultation with review info
    const { data: updatedConsultation, error: consultationUpdateError } = await supabase
      .from('consultations')
      .update({
        review_submitted: true,
        review_id: reviewId,
      })
      .eq('id', consultationId)
      .select('*, masters(user_id)')
      .maybeSingle()

    if (consultationUpdateError || !updatedConsultation) {
      console.error('Failed to update consultation with review', consultationUpdateError)
      return NextResponse.json({ error: '更新订单评价状态失败' }, {
        status: INTERNAL_ERROR,
        headers: corsHeaders,
      })
    }

    // If consultation is pending_settlement and review is now submitted, schedule settlement
    if (updatedConsultation.status === 'pending_settlement') {
      // Schedule settlement (T+7)
      const { error: settlementError } = await supabase.rpc('schedule_settlement', {
        p_consultation_id: consultationId,
      })

      if (settlementError) {
        console.error('Failed to schedule settlement', settlementError)
      }

      await supabase.from('messages').insert({
        sender_id: userId,
        receiver_id: userId,
        consultation_id: consultationId,
        content: '评价已提交，订单结算流程已启动（T+7）。结算完成后，卦师将收到款项。',
        message_type: 'system',
        metadata: {
          event: 'review_submitted',
          consultation_id: consultationId,
          review_id: reviewId,
        },
      })
    } else if (updatedConsultation.status === 'in_progress') {
      // Review submitted before consultation completed
      await supabase.from('messages').insert({
        sender_id: userId,
        receiver_id: userId,
        consultation_id: consultationId,
        content: '评价已提交，您可以结束咨询。咨询结束后订单将进入结算流程（T+7）。',
        message_type: 'system',
        metadata: {
          event: 'review_submitted',
          consultation_id: consultationId,
          review_id: reviewId,
        },
      })
    }

    return NextResponse.json(
      {
        review: {
          id: reviewId,
          rating,
          content: content?.trim() || null,
          tags: tags || [],
        },
        consultation: updatedConsultation,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error('Unexpected error in consultation-submit-review', error)
    return NextResponse.json({ error: (error as Error).message ?? '未知错误' }, {
      status: INTERNAL_ERROR,
      headers: corsHeaders,
    })
  }
}

