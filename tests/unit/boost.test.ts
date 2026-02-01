import { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { boostPost } from '../../lib/services/boost'
import { TransactionManager } from '../../lib/services/transactionManager'

// Mock TransactionManager
vi.mock('../../lib/services/transactionManager', () => ({
  TransactionManager: {
    executeTransaction: vi.fn()
  }
}))

describe('boostPost', () => {
  let mockSupabase: any
  let mockAdminClient: any
  const userId = 'user-123'
  const postId = 'post-123'

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create a chainable mock object
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(), // Will be mocked per test
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(), // Added for rollback
      then: vi.fn(), // Make it awaitable
    }

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnValue(mockChain),
    }

    // Mock Admin client
    mockAdminClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
  })

  it('should boost post successfully', async () => {
    const mockChain = mockSupabase.from()
    
    // Mock post found (for single())
    mockChain.single.mockResolvedValueOnce({
      data: { id: postId, user_id: userId, title: 'Test Post' },
      error: null
    })

    // Mock insert post_boosts success
    // The code now does .insert().select().single()
    // So the first .then (or await) after insert chain should return the inserted record
    // We can simulate this by mocking the chain behavior carefully or just mocking the resolved value of the chain if we assume it's awaited.
    // However, boost.ts uses `await ...insert()...single()`
    
    // Let's adjust how we mock the chain responses.
    // We can use mockImplementationOnce on single() if it's called at the end of the chain.
    // In boost.ts: .insert().select().single()
    // So single() is called.
    
    // First single() call is for finding the post.
    // Second single() call is for inserting the boost record.
    
    mockChain.single
      .mockResolvedValueOnce({ // For post check
        data: { id: postId, user_id: userId, title: 'Test Post' },
        error: null
      })
      .mockResolvedValueOnce({ // For boost insert
        data: { id: 'boost-123' },
        error: null
      })

    // For update post, it doesn't use single(), it just awaits update().
    // So we need to mock the promise resolution of update().
    // Since 'then' is mocked, we can control what 'await update()' returns.
    mockChain.then.mockImplementation((resolve: any) => {
        resolve({ error: null })
    })

    // Mock Transaction success
    const executeTransactionMock = TransactionManager.executeTransaction as any
    executeTransactionMock.mockResolvedValue({ 
      success: true,
      deducted_paid: 50,
      deducted_free: 0
    })

    const result = await boostPost(
      mockSupabase as unknown as SupabaseClient, 
      mockAdminClient as unknown as SupabaseClient,
      userId, 
      postId, 
      '1_day'
    )

    expect(result.success).toBe(true)
    expect(result.postId).toBe(postId)
    expect(result.amount).toBe(50)
    
    // Check Transaction called
    expect(executeTransactionMock).toHaveBeenCalledWith(mockSupabase, {
      payerId: userId,
      amount: 50,
      beneficiaries: [],
      description: expect.stringContaining('Test Post')
    })

    // Check DB operations
    // 1. Post check
    // 2. Insert boost
    expect(mockSupabase.from).toHaveBeenCalledWith('post_boosts')
    expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      post_id: postId,
      user_id: userId,
      amount: 50,
      status: 'ACTIVE'
    }))

    // 3. Update post
    expect(mockSupabase.from).toHaveBeenCalledWith('posts')
    expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
      sticky_until: expect.any(String)
    }))
  })

  it('should refund if update post fails', async () => {
    const mockChain = mockSupabase.from()
    
    // 1. Post check
    mockChain.single
      .mockResolvedValueOnce({ 
        data: { id: postId, user_id: userId, title: 'Test Post' },
        error: null
      })
      .mockResolvedValueOnce({ // For boost insert success
        data: { id: 'boost-123' },
        error: null
      })

    // 2. Transaction success
    const executeTransactionMock = TransactionManager.executeTransaction as any
    executeTransactionMock.mockResolvedValue({ 
      success: true,
      deducted_paid: 30,
      deducted_free: 20
    })

    // 3. Update post fails
    // We need to distinguish which 'then' or await is failing.
    // The insert succeeds (mocked via single().mockResolvedValueOnce above).
    // The update fails.
    
    // If we rely on `then` mock for `update`, we can make it return error.
    // But `insert` also awaits. Wait, `insert().select().single()` awaits `single()`, not `then()`.
    // `update()` awaits `then()`.
    
    mockChain.then.mockImplementation((resolve: any) => {
        resolve({ error: { message: 'Update failed' } })
    })

    await expect(boostPost(
      mockSupabase as unknown as SupabaseClient, 
      mockAdminClient as unknown as SupabaseClient,
      userId, 
      postId, 
      '1_day'
    )).rejects.toThrow('更新帖子状态失败，费用已退回')

    // Verify refund called
    expect(mockAdminClient.rpc).toHaveBeenCalledWith('refund_coins', {
      p_user_id: userId,
      p_amount_paid: 30,
      p_amount_free: 20,
      p_reason: '置顶失败自动退款'
    })

    // Verify boost record deletion
    expect(mockSupabase.from).toHaveBeenCalledWith('post_boosts')
    expect(mockChain.delete).toHaveBeenCalled()
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'boost-123')
  })

  it('should fail if post does not exist', async () => {
    const mockChain = mockSupabase.from()
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' }
    })

    await expect(boostPost(
      mockSupabase as unknown as SupabaseClient, 
      mockAdminClient as unknown as SupabaseClient,
      userId, 
      postId, 
      '1_day'
    )).rejects.toThrow('帖子不存在')
  })
})
