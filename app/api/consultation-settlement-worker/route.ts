import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

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

    const supabase = createSupabaseAdmin()

    const nowIso = new Date().toISOString()

    // Find consultations ready for settlement (T+7, status is pending_settlement, review submitted)
    const { data: readyForSettlement, error: settlementError } = await supabase
      .from('consultations')
      .select(
        'id, master_id, user_id, price, master_payout_amount, settlement_status, settlement_scheduled_at, masters(user_id, name)'
      )
      .eq('status', 'pending_settlement')
      .eq('settlement_status', 'pending')
      .eq('review_submitted', true)
      .lte('settlement_scheduled_at', nowIso)
      .limit(50)

    if (settlementError) {
      throw settlementError
    }

    const processed: any[] = []
    const failures: { id: string; error: string }[] = []

    for (const consultation of readyForSettlement ?? []) {
      try {
        const price = Number(consultation.price ?? 0)
        const payoutAmount = Number(consultation.master_payout_amount ?? 0)

        if (price <= 0) {
          throw new Error('订单金额无效')
        }

        // Update escrow status to released
        await supabase
          .from('platform_escrow')
          .update({
            status: 'released',
            released_at: nowIso,
          })
          .eq('consultation_id', consultation.id)

        // Update settlement record status
        const { data: settlement, error: settlementUpdateError } = await supabase
          .from('master_settlements')
          .update({
            settlement_status: 'completed',
            completed_at: nowIso,
          })
          .eq('consultation_id', consultation.id)
          .select('id')
          .maybeSingle()

        if (settlementUpdateError) {
          throw settlementUpdateError
        }

        // Update consultation settlement status
        const { data: updatedConsultation, error: consultationUpdateError } = await supabase
          .from('consultations')
          .update({
            settlement_status: 'settled',
            settlement_completed_at: nowIso,
            status: 'completed',
          })
          .eq('id', consultation.id)
          .select('id, master_id, masters(user_id)')
          .maybeSingle()

        if (consultationUpdateError || !updatedConsultation) {
          throw consultationUpdateError || new Error('更新订单结算状态失败')
        }

        // Credit master's wallet (or prepare for external payout)
        const masterUserId = consultation.masters?.user_id
        if (masterUserId && payoutAmount > 0) {
          const { error: walletError } = await supabase.rpc('adjust_user_wallet', {
            p_user_id: masterUserId,
            p_amount: payoutAmount,
            p_direction: 'credit',
            p_consultation_id: consultation.id,
            p_description: `咨询订单结算：${consultation.masters?.name || '卦师'}，订单金额¥${price.toFixed(2)}，实际结算¥${payoutAmount.toFixed(2)}`,
          })

          if (walletError) {
            console.error('Failed to credit master wallet', walletError)
          }
        }

        // Send notification messages
        if (masterUserId) {
          await supabase.from('messages').insert({
            sender_id: masterUserId,
            receiver_id: masterUserId,
            consultation_id: consultation.id,
            content: `订单结算完成：订单金额¥${price.toFixed(2)}，已结算¥${payoutAmount.toFixed(2)}至您的账户。`,
            message_type: 'system',
            metadata: {
              event: 'settlement_completed',
              consultation_id: consultation.id,
              payout_amount: payoutAmount,
            },
          })
        }

        await supabase.from('messages').insert({
          sender_id: consultation.user_id,
          receiver_id: consultation.user_id,
          consultation_id: consultation.id,
          content: '订单结算已完成，感谢您的使用。',
          message_type: 'system',
          metadata: {
            event: 'settlement_completed',
            consultation_id: consultation.id,
          },
        })

        processed.push({
          id: consultation.id,
          payout_amount: payoutAmount,
        })
      } catch (error: any) {
        console.error('Failed to process settlement', consultation.id, error)
        failures.push({ id: consultation.id, error: error.message || '未知错误' })
      }
    }

    return NextResponse.json(
      {
        processed,
        failures,
        summary: {
          total: readyForSettlement?.length || 0,
          processed: processed.length,
          failed: failures.length,
        },
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error('Unexpected error in consultation-settlement-worker', error)
    return NextResponse.json({ error: (error as Error).message ?? '未知错误' }, {
      status: INTERNAL_ERROR,
      headers: corsHeaders,
    })
  }
}

