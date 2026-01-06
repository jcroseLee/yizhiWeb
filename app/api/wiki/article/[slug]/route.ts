import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const supabase = await createClient()
  const { slug } = params
  
  const { data, error } = await supabase
    .from('wiki_articles')
    .select('*, wiki_categories(name, slug)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  let relatedBooks = []
  if (data.related_book_ids && data.related_book_ids.length > 0) {
     const { data: books } = await supabase
       .from('library_books')
       .select('*')
       .in('id', data.related_book_ids)
     relatedBooks = books || []
  }

  return NextResponse.json({ ...data, related_books: relatedBooks })
}
