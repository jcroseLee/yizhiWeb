import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/send-system-message:
 *   post:
 *     summary: POST /api/send-system-message
 *     description: Auto-generated description for POST /api/send-system-message
 *     tags:
 *       - Send-system-message
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  console.log('send-system-message function invoked.')

  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // Parse request body
    const body = await request.json()
    const { content, user_ids } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    let targetUserIds: string[] = []

    // If user_ids is provided, use those; otherwise send to all users
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      targetUserIds = user_ids
    } else {
      // Get all user IDs from profiles
      const { data: allProfiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id')

      if (profilesError) {
        throw profilesError
      }

      targetUserIds = (allProfiles || []).map((p: any) => p.id)
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: 'No target users found' }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Generate a system message ID for related_id
    const systemMessageId = crypto.randomUUID()

    // Prepare notifications to insert
    const notifications = targetUserIds.map((userId: string) => ({
      user_id: userId,
      type: 'system',
      related_id: systemMessageId,
      related_type: 'system',
      actor_id: user.id, // Admin who sent the message
      content: content.trim(),
      metadata: {
        sent_by_admin: true,
        admin_id: user.id,
      },
      is_read: false,
    }))

    // Insert notifications in batches to avoid overwhelming the database
    const batchSize = 100
    let insertedCount = 0
    let errors: any[] = []

    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert(batch)
        .select('id')

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
        errors.push(error)
      } else {
        insertedCount += (data?.length || 0)
      }
    }

    if (errors.length > 0 && insertedCount === 0) {
      return NextResponse.json({
        error: 'Failed to send messages',
        details: errors
      }, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${insertedCount} system message(s)`,
      sent_count: insertedCount,
      total_targets: targetUserIds.length,
      errors: errors.length > 0 ? errors : undefined
    }, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Unhandled error in send-system-message function:', error)
    return NextResponse.json({ error: error.message }, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}

