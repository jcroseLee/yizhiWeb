import { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { getPostComments } from '../../lib/services/comments'

describe('getPostComments', () => {
  it('maps unlock_count from RPC result', async () => {
    const postId = 'post-1'
    const commentId = 'comment-1'
    const currentUserId = 'user-1'

    const postsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { user_id: 'someone-else', type: 'help', bounty: 0 },
        error: null,
      }),
    }

    const commentsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: commentId,
            user_id: 'author-1',
            post_id: postId,
            content: '<p>hello</p>',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parent_id: null,
            like_count: 0,
            is_paywalled: true,
          },
        ],
        error: null,
      }),
    }

    const profilesQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: 'author-1', nickname: 'n', avatar_url: null, title_level: 1 }],
        error: null,
      }),
    }

    const unlocksQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    const likesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'posts') return postsQuery
        if (table === 'comments') return commentsQuery
        if (table === 'profiles') return profilesQuery
        if (table === 'content_unlocks') return unlocksQuery
        if (table === 'comment_likes') return likesQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [{ target_id: commentId, unlock_count: 3 }],
        error: null,
      }),
    }

    const result = await getPostComments(mockSupabase as unknown as SupabaseClient, postId, currentUserId)

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_comment_unlock_counts', {
      p_comment_ids: [commentId],
    })
    expect(result[0].unlock_count).toBe(3)
  })
})

