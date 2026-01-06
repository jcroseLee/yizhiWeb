import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const { articleId, title, content, summary, authorName, changeDescription } = json
    
    if (!articleId) {
      return NextResponse.json({ error: 'Missing articleId' }, { status: 400 })
    }

    // 1. Get current user from session (using standard client)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Use Admin client for the insertion to bypass RLS issues
    let adminSupabase;
    try {
        adminSupabase = createSupabaseAdmin()
    } catch (e: any) {
        console.error('Failed to create admin client:', e.message)
        return NextResponse.json({ error: 'Server misconfiguration: ' + e.message }, { status: 500 })
    }

    let finalAuthorName = authorName || 'Anonymous'
    
    // If user is logged in but name is default/empty, try to get profile nickname
    if (user && (finalAuthorName === 'Anonymous' || finalAuthorName === '匿名用户')) {
        try {
            const { data: profile } = await adminSupabase
                .from('profiles')
                .select('nickname')
                .eq('id', user.id)
                .single()
            
            if (profile?.nickname) {
                finalAuthorName = profile.nickname
            }
        } catch (e) {
            console.warn('Failed to fetch user profile:', e)
        }
    }

    const { error } = await adminSupabase
      .from('wiki_revisions')
      .insert({
        article_id: articleId,
        title,
        content,
        summary,
        author_name: finalAuthorName,
        author_id: user?.id || null,
        change_description: changeDescription,
        status: 'pending'
      })

    if (error) {
      console.error('Error submitting revision:', error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error submitting revision:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
