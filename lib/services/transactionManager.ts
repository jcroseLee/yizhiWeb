import { logMetric } from '@/lib/utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Beneficiary {
  /** User ID of the beneficiary */
  userId: string;
  /** Percentage of the total amount (0-100) */
  percent: number;
}

export interface SplitTransactionParams {
  /** The user ID who pays */
  payerId: string;
  /** The total amount to be deducted */
  amount: number;
  /** List of beneficiaries for profit sharing */
  beneficiaries: Beneficiary[];
  /** Description of the transaction */
  description?: string;
}

export interface TransactionResult {
  /** Whether the transaction was successful */
  success: boolean;
  /** Result message or error description */
  message: string;
  /** Total amount deducted from payer */
  deducted?: number;
  /** Amount deducted from Paid Coins balance */
  deducted_paid?: number;
  /** Amount deducted from Free Coins balance */
  deducted_free?: number;
  /** Total amount distributed to beneficiaries */
  distributed?: number;
  /** Remaining amount after distribution (if any) */
  remainder?: number;
}

/**
 * Transaction Manager Service
 * Handles complex financial transactions including split payments and dual-track currency logic.
 */
export class TransactionManager {
  private static normalizeErrorMessage(message?: string): string {
    if (!message) return '交易失败';
    if (message.includes('Insufficient Balance')) return '余额不足';
    return message;
  }

  /**
   * Executes a split transaction atomically using the database RPC `execute_split_transaction`.
   * 
   * **Business Logic:**
   * 1. **Atomic Operation**: Deduction and distribution occur in a single database transaction.
   * 2. **Dual-Track Deduction**: 
   *    - Deducts from Free Coins first (FIFO).
   *    - If insufficient, deducts remaining from Paid Coins.
   * 3. **Profit Sharing**:
   *    - Credits beneficiaries with Paid Coins based on percentage.
   * 
   * @param supabase The Supabase client (should be authenticated as payer or service role)
   * @param params Transaction parameters including payer, amount, and beneficiaries
   * @returns Transaction result with breakdown of deducted coins
   * @throws Error if validation fails or RPC execution encounters an error
   */
  static async executeTransaction(
    supabase: SupabaseClient,
    params: SplitTransactionParams
  ): Promise<TransactionResult> {
    const { payerId, amount, beneficiaries, description } = params;

    // Validate inputs locally as well
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    
    // Validate beneficiaries percent sum (optional, but good practice)
    const totalPercent = beneficiaries.reduce((sum, b) => sum + b.percent, 0);
    if (totalPercent > 100) {
      throw new Error('Total percentage cannot exceed 100');
    }

    // Validate no negative percentages
    if (beneficiaries.some(b => b.percent < 0)) {
      throw new Error('Beneficiary percentage cannot be negative');
    }

    // Call the RPC function `execute_split_transaction`
    const { data, error } = await supabase.rpc('execute_split_transaction', {
      p_payer_id: payerId,
      p_amount: amount,
      p_beneficiaries: beneficiaries,
      p_description: description || 'Split Transaction',
    });

    if (error) {
      console.error('RPC Error:', error);
      throw new Error(TransactionManager.normalizeErrorMessage(error.message));
    }

    // The RPC returns a JSONB object which matches TransactionResult structure
    if (!data.success) {
      throw new Error(TransactionManager.normalizeErrorMessage(data.message));
    }

    logMetric('consumption_amount', amount, { payerId, description: description || '' });

    return data as TransactionResult;
  }
}
