import { createSupabaseAdmin } from '@/lib/api/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const adminClient = createSupabaseAdmin()
    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
         return NextResponse.json({ profile: null, growth: null })
      }
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const coinPaid = data.coin_paid || 0
    const coinFree = data.coin_free || 0
    const totalCoins = coinPaid + coinFree

    const profile = {
      id: data.id,
      nickname: data.nickname,
      avatar_url: data.avatar_url,
      motto: data.motto,
      role: data.role,
      created_at: data.created_at,
      exp: data.exp,
      reputation: data.reputation,
      yi_coins: totalCoins,
      coin_paid: coinPaid,
      coin_free: coinFree,
      cash_balance: data.cash_balance,
      title_level: data.title_level,
      level: data.level,
      last_checkin_date: data.last_checkin_date,
      consecutive_checkin_days: data.consecutive_checkin_days,
    }

    const growth = {
      exp: data.exp || 0,
      reputation: data.reputation || 0,
      yiCoins: totalCoins,
      cashBalance: parseFloat(data.cash_balance || '0'),
      titleLevel: data.title_level || 1,
      lastCheckinDate: data.last_checkin_date,
      consecutiveCheckinDays: data.consecutive_checkin_days || 0,
    }

    return NextResponse.json({ profile, growth })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
