import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { TransactionManager } from '@/lib/services/transactionManager';

/**
 * @swagger
 * /api/v1/transaction/split:
 *   post:
 *     summary: POST /api/v1/transaction/split
 *     description: Auto-generated description for POST /api/v1/transaction/split
 *     tags:
 *       - V1
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Parse body
    const body = await req.json();
    const { payerId, amount, beneficiaries } = body;

    if (!payerId || !amount || !beneficiaries) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Security Check: Ensure user is spending their own funds
    // Unless we implement an Admin override later
    if (payerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Can only spend your own funds' }, { status: 403 });
    }

    const result = await TransactionManager.executeTransaction(supabase, {
      payerId,
      amount,
      beneficiaries,
      description: 'API Transaction'
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Transaction API Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 }); // Or 400 depending on error
  }
}
