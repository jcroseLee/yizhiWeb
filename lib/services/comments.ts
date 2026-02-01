import { SupabaseClient } from '@supabase/supabase-js'

export interface Comment {
  id: string
  user_id: string
  post_id: string
  content: string | null
  created_at: string
  updated_at: string
  parent_id: string | null
  like_count: number
  is_paywalled: boolean
  is_adopted?: boolean
  adopted_by?: string
  
  // Enhanced fields
  is_blurred: boolean
  preview?: string | null
  author: any // Profile
  is_liked: boolean
  unlock_count: number
  reply_to?: {
    id: string
    author: any
  }
}

export interface CreateCommentPayload {
  post_id: string
  content: string
  parent_id?: string | null
  is_paywalled?: boolean
}

/**
 * Fetch comments for a specific post, including author profiles, unlock status, likes, etc.
 */
export async function getPostComments(
  supabase: SupabaseClient,
  postId: string,
  currentUserId?: string
): Promise<Comment[]> {
  // 1. Fetch Post to check author (Questioner) and type
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('user_id, type, bounty')
    .eq('id', postId)
    .single()

  if (postError) {
    throw new Error('Post not found')
  }

  const isQuestioner = currentUserId === post.user_id
  const isPayToViewPost = (post.type === 'help' || (post.bounty || 0) > 0)

  // 2. Fetch Comments with Profiles
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('*, author:profiles!comments_user_id_profiles_fkey(id, nickname, avatar_url, title_level)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (commentsError) {
    throw new Error(commentsError.message)
  }

  if (!comments || comments.length === 0) {
    return []
  }

  const paywalledCommentIds = isPayToViewPost
    ? comments
        .filter((c: any) => {
          const titleLevel = Number(c.author?.title_level ?? 1)
          return c.is_paywalled === true || titleLevel >= 3
        })
        .map((c: any) => c.id)
    : []

  // Prepare parallel queries
  const promises: any[] = []

  // 4. Fetch Unlocks if needed
  if (paywalledCommentIds.length > 0 && currentUserId && !isQuestioner) {
    promises.push(
      supabase
        .from('content_unlocks')
        .select('target_id')
        .eq('user_id', currentUserId)
        .eq('target_type', 'COMMENT')
        .in('target_id', paywalledCommentIds)
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  // 5. Fetch Unlock Counts
  if (paywalledCommentIds.length > 0) {
    promises.push(
      supabase.rpc('get_comment_unlock_counts', {
        p_comment_ids: paywalledCommentIds,
      })
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  // 6. Fetch Likes
  if (currentUserId) {
    promises.push(
      supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', currentUserId)
        .in('comment_id', comments.map(c => c.id))
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  // Execute parallel queries
  const [unlocksResult, unlockCountsResult, likesResult] = await Promise.all(promises)

  // Process Unlocks
  let unlockedCommentIds: string[] = []
  if (unlocksResult.data) {
    unlockedCommentIds = unlocksResult.data.map((u: any) => u.target_id)
  }

  // Process Unlock Counts
  const unlockCountMap = new Map<string, number>()
  if (unlockCountsResult.data) {
    for (const row of unlockCountsResult.data as any[]) {
      const id = row.target_id as string
      const count = Number(row.unlock_count ?? 0)
      unlockCountMap.set(id, Number.isFinite(count) ? count : 0)
    }
  }

  // Process Likes
  let likedCommentIds: string[] = []
  if (likesResult.data) {
    likedCommentIds = likesResult.data.map((l: any) => l.comment_id)
  }

  // 7. Process Comments
  const processedComments = comments.map(comment => {
    const isAuthor = currentUserId === comment.user_id
    // Cast comment to any to access author property which comes from join
    const author = (comment as any).author
    const titleLevel = Number(author?.title_level ?? 1)
    const shouldPaywall = isPayToViewPost && (comment.is_paywalled === true || titleLevel >= 3)
    const isUnlocked = isAuthor || isQuestioner || unlockedCommentIds.includes(comment.id) || !shouldPaywall

    // Determine content
    let content = comment.content
    let isBlurred = false
    let preview: string | null = null

    if (!isUnlocked) {
      // Generate preview: strip HTML and take first 100 chars
      const plainText = content ? content.replace(/<[^>]+>/g, '') : ''
      preview = plainText.slice(0, 100)

      content = null // Or empty string, frontend should handle it
      isBlurred = true
    }

    return {
      ...comment,
      content,
      is_blurred: isBlurred,
      preview,
      author: author || null,
      is_liked: likedCommentIds.includes(comment.id),
      is_adopted: comment.is_adopted === true || !!comment.adopted_by,
      unlock_count: unlockCountMap.get(comment.id) || 0,
    }
  })

  // 8. Handle reply_to mapping
  const commentMap = new Map()
  processedComments.forEach(c => commentMap.set(c.id, c))
  
  processedComments.forEach(c => {
    if (c.parent_id) {
      const parent = commentMap.get(c.parent_id)
      if (parent) {
        c.reply_to = {
          id: parent.id,
          author: parent.author
        }
      }
    }
  })

  // 9. Sort
  processedComments.sort((a, b) => {
    if (a.is_adopted === true && b.is_adopted !== true) return -1
    if (a.is_adopted !== true && b.is_adopted === true) return 1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  return processedComments
}

/**
 * Create a new comment.
 */
export async function createPostComment(
  supabase: SupabaseClient,
  userId: string,
  payload: CreateCommentPayload
) {
  const insertPayload: Record<string, any> = {
    post_id: payload.post_id,
    user_id: userId,
    content: payload.content,
    parent_id: payload.parent_id,
    is_paywalled: payload.is_paywalled,
  }

  let insertResult = await supabase
    .from('comments')
    .insert(insertPayload)
    .select('*')
    .single()

  // Handle missing column gracefully (temporary patch)
  if (
    insertResult.error?.message?.includes("Column 'is_paywalled'") &&
    insertResult.error?.message?.includes("does not exist")
  ) {
    const { is_paywalled: _unused, ...fallbackPayload } = insertPayload
    insertResult = await supabase
      .from('comments')
      .insert(fallbackPayload)
      .select('*')
      .single()
  }

  const { data, error } = insertResult

  if (error) {
    throw new Error(error.message || '评论失败')
  }

  return data
}
