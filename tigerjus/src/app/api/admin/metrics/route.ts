import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin()

    const [
      { count: totalUsers },
      { count: activeToday },
      { data: planDist },
      { data: recentPayments },
      { data: topRanking },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('last_study_date', new Date().toISOString().split('T')[0]),
      supabase.from('profiles').select('plan').then(({ data }) => {
        const counts: Record<string, number> = {}
        data?.forEach(p => { counts[p.plan] = (counts[p.plan] || 0) + 1 })
        return { data: counts }
      }),
      supabase.from('payments').select('*').eq('status', 'approved')
        .order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('id,name,xp,level_name,streak')
        .order('xp', { ascending: false }).limit(10),
    ])

    // Calculate MRR
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('plan, amount_cents')
      .eq('status', 'active')

    const mrr = activeSubs?.reduce((sum, s) => sum + (s.amount_cents || 0), 0) || 0

    return NextResponse.json({
      users: { total: totalUsers, active_today: activeToday },
      mrr_cents: mrr,
      plan_distribution: planDist,
      recent_payments: recentPayments,
      top_ranking: topRanking,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
