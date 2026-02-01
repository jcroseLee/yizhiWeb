import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionManager } from '../../lib/services/transactionManager';

describe('TransactionManager', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      rpc: vi.fn(),
    };
  });

  it('should execute transaction successfully', async () => {
    // Mock RPC success response
    mockSupabase.rpc.mockResolvedValue({
      data: { success: true, message: 'Success', deducted: 100, distributed: 90 },
      error: null,
    });

    const result = await TransactionManager.executeTransaction(mockSupabase as unknown as SupabaseClient, {
      payerId: 'payer-123',
      amount: 100,
      beneficiaries: [{ userId: 'ben-1', percent: 50 }],
    });

    expect(result.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('execute_split_transaction', {
      p_payer_id: 'payer-123',
      p_amount: 100,
      p_beneficiaries: [{ userId: 'ben-1', percent: 50 }],
      p_description: 'Split Transaction',
    });
  });

  it('should throw error if RPC fails', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC Error' },
    });

    await expect(TransactionManager.executeTransaction(mockSupabase as unknown as SupabaseClient, {
      payerId: 'payer-123',
      amount: 100,
      beneficiaries: [],
    })).rejects.toThrow('RPC Error');
  });

  it('should throw error if transaction logic returns success: false', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { success: false, message: 'Insufficient funds' },
      error: null,
    });

    await expect(TransactionManager.executeTransaction(mockSupabase as unknown as SupabaseClient, {
      payerId: 'payer-123',
      amount: 100,
      beneficiaries: [],
    })).rejects.toThrow('Insufficient funds');
  });

  it('should validate total percentage', async () => {
    await expect(TransactionManager.executeTransaction(mockSupabase as unknown as SupabaseClient, {
      payerId: 'payer-123',
      amount: 100,
      beneficiaries: [{ userId: 'u1', percent: 60 }, { userId: 'u2', percent: 50 }], // 110%
    })).rejects.toThrow('Total percentage cannot exceed 100');
  });

  it('should validate negative percentage', async () => {
    await expect(TransactionManager.executeTransaction(mockSupabase as unknown as SupabaseClient, {
      payerId: 'payer-123',
      amount: 100,
      beneficiaries: [{ userId: 'u1', percent: -10 }],
    })).rejects.toThrow('Beneficiary percentage cannot be negative');
  });

  it('should validate positive amount', async () => {
    await expect(TransactionManager.executeTransaction(mockSupabase as unknown as SupabaseClient, {
      payerId: 'payer-123',
      amount: -10,
      beneficiaries: [],
    })).rejects.toThrow('Amount must be positive');
  });
});
