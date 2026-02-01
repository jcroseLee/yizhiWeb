import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createAdminClient();

  // User Balance Distribution
  // We define ranges: 0, 1-99, 100-999, 1000-9999, 10000+
  const ranges = [
    { label: '0', min: 0, max: 0 },
    { label: '1-99', min: 1, max: 99 },
    { label: '100-999', min: 100, max: 999 },
    { label: '1000-9999', min: 1000, max: 9999 },
    { label: '10000+', min: 10000, max: null },
  ];

  const distribution: Record<string, number> = {};

  for (const range of ranges) {
    let query = supabase.from('profiles').select('*', { count: 'exact', head: true });
    
    if (range.max === null) {
      query = query.gte('yi_coins', range.min);
    } else if (range.min === range.max) {
      // 0 or specific value (using lte/gte to be safe with floats if any, but eq is fine for 0)
      query = query.eq('yi_coins', range.min);
    } else {
      query = query.gte('yi_coins', range.min).lte('yi_coins', range.max);
    }

    const { count, error } = await query;
    if (!error) {
      distribution[range.label] = count || 0;
    } else {
      console.error('Error fetching metrics for range', range, error);
    }
  }

  return NextResponse.json({
    distribution,
    timestamp: new Date().toISOString()
  });
}
