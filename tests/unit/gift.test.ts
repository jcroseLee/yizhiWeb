import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GiftType } from '../../lib/constants/gift';
import { GiftService } from '../../lib/services/gift';

describe('GiftService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      rpc: vi.fn(),
    };
  });

  it('should send gift successfully', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { 
        success: true, 
        message: 'ok'
      },
      error: null,
    });

    const result = await GiftService.sendGift(mockSupabase as unknown as SupabaseClient, {
      senderId: 'sender-123',
      receiverId: 'receiver-456',
      giftType: GiftType.TEA,
      amount: 10,
    });

    expect(result.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('send_gift_v2', {
      p_sender_id: 'sender-123',
      p_receiver_id: 'receiver-456',
      p_gift_id: GiftType.TEA,
      p_amount: 10,
    });
  });

  it('should handle RPC error', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC Error' },
    });

    const result = await GiftService.sendGift(mockSupabase as unknown as SupabaseClient, {
      senderId: 'sender-123',
      receiverId: 'receiver-456',
      giftType: GiftType.TEA,
      amount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('RPC Error');
    expect(result.code).toBe(500);
  });
});
