import { GiftType } from '@/lib/constants/gift';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SendGiftParams {
  senderId: string;
  receiverId: string;
  giftType: GiftType;
  amount: number;
}

export interface SendGiftResult {
  success: boolean;
  message: string;
  code?: number;
}

export class GiftService {
  /**
   * Sends a gift from one user to another.
   * Calls the `send_gift` RPC to ensure atomicity.
   */
  static async sendGift(
    supabase: SupabaseClient,
    params: SendGiftParams
  ): Promise<SendGiftResult> {
    const { senderId, receiverId, giftType, amount } = params;

    const { data, error } = await supabase.rpc('send_gift_v2', {
      p_sender_id: senderId,
      p_receiver_id: receiverId,
      p_gift_id: giftType,
      p_amount: amount,
    });

    if (error) {
      console.error('Send Gift RPC Error:', error);
      return {
        success: false,
        message: error.message,
        code: 500,
      };
    }

    return data as SendGiftResult;
  }
}
