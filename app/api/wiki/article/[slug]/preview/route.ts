import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const supabase = await createClient()
  const { slug: id } = params
  
  const { data, error } = await supabase
    .from('wiki_articles')
    .select('id, title, summary, slug')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  return NextResponse.json(data)
}
