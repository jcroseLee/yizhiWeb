import { GIFT_PRICES, GiftType } from '@/lib/constants/gift';
import { GiftService } from '@/lib/services/gift';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/gift/send:
 *   post:
 *     summary: POST /api/gift/send
 *     description: Auto-generated description for POST /api/gift/send
 *     tags:
 *       - Gift
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
    
    // 1. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 2. Parse Body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: '请求参数格式不正确' }, { status: 400 });
    }

    const { receiverId, giftType } = body;

    // 3. Validate Inputs
    if (!receiverId) {
      return NextResponse.json({ error: '缺少 receiverId' }, { status: 400 });
    }
    
    // Validate giftType
    if (!giftType || !Object.values(GiftType).includes(giftType as GiftType)) {
      return NextResponse.json({ error: 'giftType 不合法' }, { status: 400 });
    }

    const price = GIFT_PRICES[giftType as GiftType];
    if (price === undefined) {
      return NextResponse.json({ error: '礼物配置缺失' }, { status: 400 });
    }

    // Prevent self-gifting
    if (receiverId === user.id) {
       return NextResponse.json({ error: '不能给自己送礼' }, { status: 400 });
    }

    // 4. Execute Logic
    // Using the authenticated supabase client allows RLS if policies are set, 
    // but here we use RPC which is SECURITY DEFINER (runs as owner) so it bypasses RLS for the operations inside.
    // However, we pass the authenticated user ID from getUser() to ensure they are who they say they are.
    const result = await GiftService.sendGift(supabase, {
      senderId: user.id,
      receiverId,
      giftType: giftType as GiftType,
      amount: price,
    });

    if (!result.success) {
      // Map error codes
      const status = result.code || 500;
      return NextResponse.json({ error: result.message }, { status });
    }

    // 5. Success Response
    return NextResponse.json({
      success: true
    });

  } catch (e: any) {
    console.error('Send Gift API Error:', e);
    return NextResponse.json({ error: '系统错误' }, { status: 500 });
  }
}
