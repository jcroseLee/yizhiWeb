import { SupabaseClient } from '@supabase/supabase-js'
import { TransactionManager } from './transactionManager'

export const BOOST_OPTIONS = {
  '1_day': { duration: 1, amount: 50, label: '24小时' },
}

export interface BoostResult {
  success: boolean
  postId: string
  stickyUntil: string
  amount: number
}

export async function boostPost(
  supabase: SupabaseClient,
  adminClient: SupabaseClient,
  userId: string,
  postId: string,
  durationType: string
): Promise<BoostResult> {
  // 1. Validate inputs
  if (!postId) {
    throw new Error('缺少参数 postId')
  }

  if (!durationType || !BOOST_OPTIONS[durationType as keyof typeof BOOST_OPTIONS]) {
    throw new Error('无效的置顶时长类型')
  }

  const option = BOOST_OPTIONS[durationType as keyof typeof BOOST_OPTIONS]

  // 2. Check post existence and permissions
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, user_id, title')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    throw new Error('帖子不存在')
  }

  // Only author can boost (for now)
  if (post.user_id !== userId) {
    throw new Error('只能置顶自己的帖子')
  }

  // 3. Execute Transaction (Deduct fee)
  let transactionResult;
  try {
    transactionResult = await TransactionManager.executeTransaction(supabase, {
      payerId: userId,
      amount: option.amount,
      beneficiaries: [], // Platform fee
      description: `帖子置顶费用 - ${option.label} (Post: ${post.title})`
    })
  } catch (err: any) {
    throw new Error(err.message || '支付失败，余额不足')
  }

  // Helper to handle refund
  const refund = async () => {
    if (transactionResult) {
      try {
        console.log('Initiating refund for failed boost...', { 
          userId, 
          paid: transactionResult.deducted_paid, 
          free: transactionResult.deducted_free 
        });
        
        const { error: refundError } = await adminClient.rpc('refund_coins', {
          p_user_id: userId,
          p_amount_paid: transactionResult.deducted_paid || 0,
          p_amount_free: transactionResult.deducted_free || 0,
          p_reason: '置顶失败自动退款'
        });
        
        if (refundError) {
          console.error('Refund failed:', refundError);
        } else {
          console.log('Refund successful');
        }
      } catch (e) {
        console.error('Refund exception:', e);
      }
    }
  }

  // 4. Calculate end time
  const now = new Date()
  const endTime = new Date(now.getTime() + option.duration * 24 * 60 * 60 * 1000)

  // 5. Insert boost record
  const { data: boostRecord, error: boostError } = await supabase
    .from('post_boosts')
    .insert({
      post_id: postId,
      user_id: userId,
      amount: option.amount,
      start_at: now.toISOString(),
      end_at: endTime.toISOString(),
      status: 'ACTIVE'
    })
    .select()
    .single()

  if (boostError) {
    console.error('Error inserting post boost:', boostError)
    await refund();
    throw new Error('置顶记录创建失败，费用已退回')
  }

  // 6. Update post sticky_until
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      sticky_until: endTime.toISOString()
    })
    .eq('id', postId)

  if (updateError) {
    console.error('Error updating post sticky_until:', updateError)
    
    // Rollback: delete boost record and refund
    if (boostRecord) {
      await supabase.from('post_boosts').delete().eq('id', boostRecord.id);
    }
    await refund();
    
    throw new Error('更新帖子状态失败，费用已退回')
  }

  return {
    success: true,
    postId,
    stickyUntil: endTime.toISOString(),
    amount: option.amount
  }
}
