import { corsHeaders } from '@/lib/api/cors'
import { getAdminContext } from '@/lib/api/admin-auth'
import { NextResponse, type NextRequest } from 'next/server'

type NormalizePhoneResult = {
  checked: number
  updated: number
  skipped: number
  errors: Array<{ user_id: string; message: string }>
}

function normalizeCNPhone(value: string) {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  const digits = trimmed.replace(/\D/g, '')
  const local = digits.length === 11 ? digits : digits.length === 13 && digits.startsWith('86') ? digits.slice(2) : ''
  if (!local || !/^1[3-9]\d{9}$/.test(local)) return ''
  return `+86${local}`
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
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
    if (ctx.adminLevel !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { headers: { ...corsHeaders }, status: 403 })
    }

    const body = await req.json().catch(() => null)
    const limit = typeof body?.limit === 'number' && body.limit > 0 ? Math.floor(body.limit) : null
    const dryRun = Boolean(body?.dry_run)

    let page = 1
    const perPage = 1000
    const result: NormalizePhoneResult = { checked: 0, updated: 0, skipped: 0, errors: [] }

    while (true) {
      const { data, error } = await ctx.supabase.auth.admin.listUsers({ page, perPage })
      if (error) {
        return NextResponse.json({ error: error.message }, { headers: { ...corsHeaders }, status: 500 })
      }

      const users = data?.users || []
      for (const user of users) {
        if (limit && result.checked >= limit) {
          return NextResponse.json({ ...result, dry_run: dryRun }, { headers: { ...corsHeaders }, status: 200 })
        }

        result.checked += 1
        const currentPhone = user.phone || ''
        const normalized = normalizeCNPhone(currentPhone)
        if (!normalized || normalized === currentPhone) {
          result.skipped += 1
          continue
        }

        if (dryRun) {
          result.updated += 1
          continue
        }

        const { error: updateError } = await ctx.supabase.auth.admin.updateUserById(user.id, {
          phone: normalized,
          phone_confirm: true,
          user_metadata: {
            ...user.user_metadata,
            phone: normalized,
          },
        })

        if (updateError) {
          result.errors.push({ user_id: user.id, message: updateError.message })
          continue
        }

        const { error: profileError } = await ctx.supabase
          .from('profiles')
          .update({ phone: normalized })
          .eq('id', user.id)

        if (profileError) {
          result.errors.push({ user_id: user.id, message: profileError.message })
          continue
        }

        result.updated += 1
      }

      if (users.length < perPage) {
        break
      }
      page += 1
    }

    return NextResponse.json({ ...result, dry_run: dryRun }, { headers: { ...corsHeaders }, status: 200 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { headers: { ...corsHeaders }, status: 500 }
    )
  }
}
