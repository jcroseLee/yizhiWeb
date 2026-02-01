import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { corsHeaders } from '@/lib/api/cors'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

/**
 * @swagger
 * /api/update-note:
 *   post:
 *     summary: POST /api/update-note
 *     description: Auto-generated description for POST /api/update-note
 *     tags:
 *       - Update-note
 *     responses:
 *       200:
 *         description: Successful operation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, {
        status: 401,
        headers: corsHeaders,
      })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Verify the user's token
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, {
        status: 401,
        headers: corsHeaders,
      })
    }

    // Parse request body
    const { userId, recordId, note } = await request.json()

    // Validate input
    if (!userId || !recordId) {
      return NextResponse.json({ error: 'Missing required fields: userId and recordId' }, {
        status: 422,
        headers: corsHeaders,
      })
    }

    // Verify that the userId matches the authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: userId does not match authenticated user' }, {
        status: 403,
        headers: corsHeaders,
      })
    }

    // Update the note in the database
    const { data, error } = await supabaseAdmin
      .from('divination_records')
      .update({ note: note || null })
      .eq('id', recordId)
      .eq('user_id', userId) // Ensure the record belongs to the user
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message || 'Failed to update note' }, {
        status: 500,
        headers: corsHeaders,
      })
    }

    if (!data) {
      return NextResponse.json({ error: 'Record not found or access denied' }, {
        status: 404,
        headers: corsHeaders,
      })
    }

    // Return success response
    return NextResponse.json({ data }, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error in update-note function:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, {
      status: 500,
      headers: corsHeaders,
    })
  }
}

