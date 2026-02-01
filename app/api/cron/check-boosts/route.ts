import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic' // Ensure this route is not cached

/**
 * @swagger
 * /api/cron/check-boosts:
 *   get:
 *     summary: GET /api/cron/check-boosts
 *     description: Auto-generated description for GET /api/cron/check-boosts
 *     tags:
 *       - Cron
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
  try {
    // Optional: Check for CRON_SECRET if you want to secure this endpoint
    // const authHeader = req.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 })
    // }

    const supabase = await createClient()

    // Call the database function to check and clear expired boosts
    const { error } = await supabase.rpc('check_expired_boosts')

    if (error) {
      console.error('Error executing check_expired_boosts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Expired boosts checked and cleared' })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
