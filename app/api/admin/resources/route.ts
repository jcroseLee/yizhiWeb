import { getAdminContext } from '@/lib/api/admin-auth'
import { corsHeaders } from '@/lib/api/cors'
import { NextResponse, type NextRequest } from 'next/server'

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { headers: { ...corsHeaders }, status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const ctx = await getAdminContext(token)
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { headers: { ...corsHeaders }, status: ctx.status })
    }

    const { searchParams } = new URL(req.url)
    const pageVal = parseInt(searchParams.get('page') || '1')
    const pageSizeVal = parseInt(searchParams.get('pageSize') || '20')
    const page = isNaN(pageVal) || pageVal < 1 ? 1 : pageVal
    const pageSize = isNaN(pageSizeVal) || pageSizeVal < 1 ? 20 : pageSizeVal
    
    // Filters
    const ownerId = searchParams.get('owner')

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = ctx.supabase
      .schema('storage')
      .from('objects')
      .select('id, bucket_id, name, owner, created_at, metadata', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (ownerId) {
      query = query.eq('owner', ownerId)
    }

    const { data: objects, count, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    return NextResponse.json({ 
      data: objects || [], 
      total: count || 0 
    }, { headers: { ...corsHeaders } })

  } catch (error: any) {
    console.error('Error fetching resources:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.details || error.hint || JSON.stringify(error)
    }, { headers: { ...corsHeaders }, status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { headers: { ...corsHeaders }, status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const ctx = await getAdminContext(token)
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { headers: { ...corsHeaders }, status: ctx.status })
    }

    const body = await req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid ids' }, { headers: { ...corsHeaders }, status: 400 })
    }

    // 1. Fetch objects to get bucket and name
    const { data: objects, error: fetchError } = await ctx.supabase
      .schema('storage')
      .from('objects')
      .select('id, bucket_id, name')
      .in('id', ids)

    if (fetchError) throw fetchError
    if (!objects || objects.length === 0) {
      return NextResponse.json({ message: 'No objects found' }, { headers: { ...corsHeaders } })
    }

    // 2. Group by bucket
    const bucketsMap: Record<string, string[]> = {}
    objects.forEach((obj: any) => {
      if (!bucketsMap[obj.bucket_id]) {
        bucketsMap[obj.bucket_id] = []
      }
      bucketsMap[obj.bucket_id].push(obj.name)
    })

    // 3. Delete from storage
    const results = []
    for (const bucketId of Object.keys(bucketsMap)) {
      const paths = bucketsMap[bucketId]
      const { data, error } = await ctx.supabase.storage
        .from(bucketId)
        .remove(paths)
      
      if (error) {
        console.error(`Error deleting from bucket ${bucketId}:`, error)
        results.push({ bucket: bucketId, error })
      } else {
        results.push({ bucket: bucketId, count: data?.length })
      }
    }

    return NextResponse.json({ results }, { headers: { ...corsHeaders } })

  } catch (error: any) {
    console.error('Error deleting resources:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.details || error.hint || JSON.stringify(error)
    }, { headers: { ...corsHeaders }, status: 500 })
  }
}
