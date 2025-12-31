import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) return NextResponse.json({ exists: false })

    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase.from('case_metadata').select('post_id').eq('post_id', id).maybeSingle()
    if (error) return NextResponse.json({ exists: false })

    return NextResponse.json({ exists: !!data })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
