import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
// Ranking público para qualquer usuário logado.
// Usa service role para driblar o RLS, mas devolve APENAS campos seguros
// (nada de e-mail). O XP da semana é calculado no servidor (xp_historico).
export async function GET(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const authClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: { user }, error } = await authClient.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
    const admin = createClient(URL, SERVICE)
    const { data: profs, error: pErr } = await admin
      .from('profiles')
      .select('id,nome,plano,xp,nivel,streak,questoes_respondidas,questoes_corretas,ambassador_badge,role,avatar_url')
      .order('xp', { ascending: false })
      .limit(500)
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    const users = (profs || [])
      .filter(p => p.role !== 'admin')
      .map(({ role, ...safe }) => safe)
    // XP da semana (últimos 7 dias) por usuário
    const desde = new Date(); desde.setDate(desde.getDate() - 7)
    const { data: hist } = await admin
      .from('xp_historico')
      .select('user_id,xp')
      .gte('created_at', desde.toISOString())
    const semana: Record<string, number> = {}
    ;(hist || []).forEach((h: { user_id: string; xp: number }) => {
      semana[h.user_id] = (semana[h.user_id] || 0) + (h.xp || 0)
    })
    users.forEach((u: Record<string, unknown>) => { u.xp_semana = semana[u.id as string] || 0 })
    return NextResponse.json({ users })
  } catch (e) {
    console.error('api/ranking:', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
