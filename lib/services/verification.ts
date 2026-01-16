import { trackEvent } from '@/lib/analytics'
import { getCurrentUser } from './auth'
import { addReputation } from './growth'
import { getSupabaseClient } from './supabaseClient'

/**
 * 验证反馈服务
 * 实现PRD中的"验证反馈"功能：题主可以标记断语（评论）为"准"或"不准"
 */

export interface VerificationResult {
  success: boolean
  message: string
  reputationGained?: number
}

/**
 * 验证评论（标记为"准"或"不准"）
 * 只有题主（帖子作者）可以验证自己帖子下的评论
 * 
 * @param commentId 评论ID
 * @param postId 帖子ID
 * @param result 'accurate'（准）或 'inaccurate'（不准）
 */
export async function verifyComment(
  commentId: string,
  postId: string,
  result: 'accurate' | 'inaccurate'
): Promise<VerificationResult> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 1. 验证用户是否为帖子作者（题主）
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id, created_at')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return { success: false, message: '帖子不存在' }
    }

    if (post.user_id !== user.id) {
      return { success: false, message: '只有题主可以验证评论' }
    }

    // 2. 获取评论信息
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, user_id, verification_result')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return { success: false, message: '评论不存在' }
    }

    // 3. 检查是否已经验证过
    if (comment.verification_result === result) {
      return { success: false, message: '该评论已被标记为相同结果' }
    }

    // 4. 更新评论的验证结果
    const { error: updateError } = await supabase
      .from('comments')
      .update({
        verification_result: result,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq('id', commentId)

    if (updateError) {
      console.error('Error updating comment verification:', updateError)
      return { success: false, message: '验证失败，请重试' }
    }

    // 5. 如果验证结果为"准"，增加评论者的声望值
    // 注意：数据库触发器会自动处理，但为了确保一致性，我们也在这里调用
    let reputationGained = 0
    if (result === 'accurate') {
      // 检查之前是否已经被验证为"准"（避免重复加声望）
      if (comment.verification_result !== 'accurate') {
        const success = await addReputation(20, '断语被验证为"准"', commentId)
        if (success) {
          reputationGained = 20
        }
      }
    }

    // 6. 记录验证日志（数据库触发器会自动处理，但为了确保，我们也手动记录）
    const { error: logError } = await supabase
      .from('verification_logs')
      .insert({
        comment_id: commentId,
        post_id: postId,
        verifier_id: user.id,
        commenter_id: comment.user_id,
        verification_result: result,
      })
    
    if (logError) {
      // 如果插入失败（可能触发器已经插入），忽略错误
      console.log('Verification log insert error (may be duplicate):', logError)
    }

    const message = result === 'accurate'
      ? '已标记为"准"，评论者获得20声望值'
      : '已标记为"不准"'

    trackEvent('case_feedback_update', {
      accuracy: result === 'accurate' ? '准' : '错',
      post_id: postId,
      comment_id: commentId,
      days_after_post: post?.created_at ? Math.floor((Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24)) : null,
    })

    return {
      success: true,
      message,
      reputationGained: result === 'accurate' ? reputationGained : undefined,
    }
  } catch (error) {
    console.error('Error verifying comment:', error)
    return { success: false, message: '验证失败，请重试' }
  }
}

/**
 * 取消验证（将验证结果设为null）
 * 只有题主可以取消验证
 */
export async function cancelVerification(
  commentId: string,
  postId: string
): Promise<VerificationResult> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: '请先登录' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, message: '系统错误' }
  }

  try {
    // 验证用户是否为帖子作者
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single()

    if (!post || post.user_id !== user.id) {
      return { success: false, message: '只有题主可以取消验证' }
    }

    // 获取评论的当前验证结果
    const { data: comment } = await supabase
      .from('comments')
      .select('verification_result, user_id')
      .eq('id', commentId)
      .single()

    if (!comment) {
      return { success: false, message: '评论不存在' }
    }

    // 如果之前是"准"，需要扣除声望值（但根据PRD，不扣声望值，只取消验证）
    // 这里我们只取消验证，不扣除声望值

    // 更新评论，清除验证结果
    const { error } = await supabase
      .from('comments')
      .update({
        verification_result: null,
        verified_at: null,
        verified_by: null,
      })
      .eq('id', commentId)

    if (error) {
      console.error('Error canceling verification:', error)
      return { success: false, message: '取消验证失败，请重试' }
    }

    return { success: true, message: '已取消验证' }
  } catch (error) {
    console.error('Error canceling verification:', error)
    return { success: false, message: '取消验证失败，请重试' }
  }
}

/**
 * 获取评论的验证状态
 */
export async function getCommentVerification(commentId: string): Promise<{
  verification_result: 'accurate' | 'inaccurate' | null
  verified_at: string | null
  verified_by: string | null
} | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('verification_result, verified_at, verified_by')
      .eq('id', commentId)
      .single()

    if (error || !data) return null

    return {
      verification_result: data.verification_result as 'accurate' | 'inaccurate' | null,
      verified_at: data.verified_at,
      verified_by: data.verified_by,
    }
  } catch (error) {
    console.error('Error fetching comment verification:', error)
    return null
  }
}

/**
 * 检查用户是否可以验证某个评论
 * 只有题主（帖子作者）可以验证
 */
export async function canVerifyComment(postId: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const supabase = getSupabaseClient()
  if (!supabase) return false

  try {
    const { data } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single()

    return data?.user_id === user.id
  } catch (error) {
    console.error('Error checking verification permission:', error)
    return false
  }
}

/**
 * 获取用户的准确率统计
 */
export async function getUserAccuracyStats(): Promise<{
  totalVerified: number
  accurateCount: number
  accuracyRate: number
}> {
  const user = await getCurrentUser()
  if (!user) {
    return { totalVerified: 0, accurateCount: 0, accuracyRate: 0 }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { totalVerified: 0, accurateCount: 0, accuracyRate: 0 }
  }

  try {
    // 使用数据库函数计算准确率
    const { data, error } = await supabase.rpc('calculate_user_accuracy', {
      user_id_param: user.id,
    })

    if (error) {
      // 如果RPC函数不存在，手动计算
      const { data: verifiedComments } = await supabase
        .from('comments')
        .select('verification_result')
        .eq('user_id', user.id)
        .not('verification_result', 'is', null)

      const totalVerified = verifiedComments?.length || 0
      const accurateCount = verifiedComments?.filter(
        c => c.verification_result === 'accurate'
      ).length || 0
      const accuracyRate = totalVerified > 0
        ? Math.round((accurateCount / totalVerified) * 100)
        : 0

      return { totalVerified, accurateCount, accuracyRate }
    }

    // 获取总数和准确数
    const { data: verifiedComments } = await supabase
      .from('comments')
      .select('verification_result')
      .eq('user_id', user.id)
      .not('verification_result', 'is', null)

    const totalVerified = verifiedComments?.length || 0
    const accurateCount = verifiedComments?.filter(
      c => c.verification_result === 'accurate'
    ).length || 0
    const accuracyRate = data ? parseFloat(data) : 0

    return { totalVerified, accurateCount, accuracyRate }
  } catch (error) {
    console.error('Error fetching accuracy stats:', error)
    return { totalVerified: 0, accurateCount: 0, accuracyRate: 0 }
  }
}
