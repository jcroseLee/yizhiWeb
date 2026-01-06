import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wiki_categories')
    .select('*')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build tree logic
  const map = new Map()
  const roots: any[] = []
  
  // Create nodes
  data.forEach(cat => {
    map.set(cat.id, { ...cat, children: [] })
  })

  // Build hierarchy
  data.forEach(cat => {
    const node = map.get(cat.id)
    if (cat.parent_id) {
      const parent = map.get(cat.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  })

  // Sort children
  const sortFn = (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
  
  map.forEach(node => {
    if (node.children && node.children.length > 0) {
      node.children.sort(sortFn)
    }
  })
  
  roots.sort(sortFn)

  return NextResponse.json(roots)
}
