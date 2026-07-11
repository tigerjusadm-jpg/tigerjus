import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Confere que quem chama é admin de verdade (token → role no banco).
async function checarAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return { erro: 'Não autenticado', status: 401 as const }
  const authClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user) return { erro: 'Sessão inválida', status: 401 as const }
  const admin = createClient(URL, SERVICE)
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { erro: 'Acesso negado.', status: 403 as const }
  return { admin, user }
}

// ── GET: visão geral + ranking de indicadores + extrato global ──
export async function GET(req: NextRequest) {
  try {
    const ck = await checarAdmin(req)
    if ('erro' in ck) return NextResponse.json({ error: ck.erro }, { status: ck.status })
    const admin = ck.admin

    // perfis (para nomes + contagem de ativos)
    const { data: perfis } = await admin.from('profiles').select('id, nome, email, referral_code, referred_by, plano')
    const porId: Record<string, any> = {}
    const porCodigo: Record<string, any> = {}
    for (const p of (perfis || [])) {
      porId[p.id] = p
      if (p.referral_code) porCodigo[p.referral_code] = p
    }
    // indicados ativos por código
    const ativosPorCodigo: Record<string, number> = {}
    for (const p of (perfis || [])) {
      if (p.referred_by && p.plano && p.plano !== 'gratuito') {
        ativosPorCodigo[p.referred_by] = (ativosPorCodigo[p.referred_by] || 0) + 1
      }
    }
    const pctPorAtivos = (n: number) => (n >= 10 ? 10 : n >= 5 ? 7 : n >= 2 ? 5 : 3)

    // carteiras
    const { data: carteiras } = await admin.from('carteira_creditos').select('*')
    const indicadores = (carteiras || []).map((c: any) => {
      const p = porId[c.user_id] || {}
      const ativos = p.referral_code ? (ativosPorCodigo[p.referral_code] || 0) : 0
      return {
        user_id: c.user_id,
        nome: p.nome || '—',
        email: p.email || '—',
        saldo: Number(c.saldo) || 0,
        total_ganho: Number(c.total_ganho) || 0,
        total_usado: Number(c.total_usado) || 0,
        ativos,
        pct: pctPorAtivos(ativos),
      }
    }).sort((a: any, b: any) => b.total_ganho - a.total_ganho)

    // extrato global (últimas 200)
    const { data: txs } = await admin.from('carteira_transacoes')
      .select('*').order('criado_em', { ascending: false }).limit(200)
    const transacoes = (txs || []).map((t: any) => ({
      ...t,
      dono_nome: porId[t.user_id]?.nome || porId[t.user_id]?.email || t.user_id,
      indicado_nome: t.referred_id ? (porId[t.referred_id]?.nome || porId[t.referred_id]?.email || t.referred_id) : null,
    }))

    // resumo
    let totalComissao = 0, totalUsado = 0, saldoCirculacao = 0
    for (const c of (carteiras || [])) {
      totalComissao += Number(c.total_ganho) || 0
      totalUsado += Number(c.total_usado) || 0
      saldoCirculacao += Number(c.saldo) || 0
    }
    // taxa MP configurada
    const { data: cfg } = await admin.from('app_settings').select('value').eq('key', 'comissao_taxa_mp_percent').maybeSingle()

    return NextResponse.json({
      resumo: {
        total_comissao: Math.round(totalComissao * 100) / 100,
        total_usado: Math.round(totalUsado * 100) / 100,
        saldo_circulacao: Math.round(saldoCirculacao * 100) / 100,
        indicadores: indicadores.filter((i: any) => i.total_ganho > 0 || i.saldo > 0).length,
        taxa_mp: Number(cfg?.value) || 1.0,
      },
      indicadores,
      transacoes,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erro' }, { status: 500 })
  }
}

// ── POST: ajuste manual de saldo (creditar/debitar com motivo) ──
export async function POST(req: NextRequest) {
  try {
    const ck = await checarAdmin(req)
    if ('erro' in ck) return NextResponse.json({ error: ck.erro }, { status: ck.status })
    const admin = ck.admin

    const body = await req.json()

    // Ajustar taxa MP
    if (body.acao === 'taxa_mp') {
      const nova = Number(body.valor)
      if (!Number.isFinite(nova) || nova < 0 || nova > 20) {
        return NextResponse.json({ error: 'Taxa inválida (0 a 20).' }, { status: 400 })
      }
      const { data: existe } = await admin.from('app_settings').select('id').eq('key', 'comissao_taxa_mp_percent').maybeSingle()
      if (existe) await admin.from('app_settings').update({ value: String(nova) }).eq('key', 'comissao_taxa_mp_percent')
      else await admin.from('app_settings').insert({ key: 'comissao_taxa_mp_percent', value: String(nova), type: 'number', ativo: true })
      return NextResponse.json({ ok: true })
    }

    // Ajuste manual de saldo
    const { user_id, valor, motivo } = body
    const v = Number(valor)
    if (!user_id || !Number.isFinite(v) || v === 0) {
      return NextResponse.json({ error: 'Informe usuário e valor (≠ 0).' }, { status: 400 })
    }
    if (!motivo || !String(motivo).trim()) {
      return NextResponse.json({ error: 'O motivo é obrigatório.' }, { status: 400 })
    }
    const { error: insErr } = await admin.from('carteira_transacoes').insert({
      user_id,
      tipo: 'ajuste',
      valor: Math.round(v * 10000) / 10000,
      descricao: `Ajuste admin (${ck.user.email || ck.user.id}): ${String(motivo).trim()}`,
    })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erro' }, { status: 500 })
  }
}
