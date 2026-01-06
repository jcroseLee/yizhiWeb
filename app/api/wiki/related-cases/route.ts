import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tagsParam = searchParams.get('tags')
  // Split by comma and filter empty strings
  const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : []
  const limit = parseInt(searchParams.get('limit') || '5')

  if (tags.length === 0) return NextResponse.json([])

  const supabase = await createClient()

  // Find posts with these tags
  // We assume tags passed are tag_ids. If they are names, we would need another step.
  // Assuming tag_ids as per internal usage logic.
  
  const { data: postTags } = await supabase
      .from('post_tags')
      .select('post_id')
      .in('tag_id', tags)

  const postIds = [...new Set(postTags?.map(p => p.post_id) || [])]
  
  if (postIds.length === 0) return NextResponse.json([])

  const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, content, likes, user_id, created_at, profiles(nickname, avatar_url)')
      .in('id', postIds)
      .gt('likes', 10)
      .order('likes', { ascending: false })
      .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(posts)
}
