import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_PRICES: Record<string, number> = { start: 4.99, pro: 9.99, elite: 24.99 }

export async function POST(req: Request) {
  try {
    // ── Autenticação: token → usuário logado (o COMPRADOR / dono da carteira) ──
    const token = req.headers.get('authorization')?.replace('Bearer ', '') || ''
    const { data: { user }, error: uErr } = await supabase.auth.getUser(token)
    if (uErr || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { plano, ciclo, alvo_email } = await req.json()

    const precoMensal = PLAN_PRICES[plano]
    if (!precoMensal) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
    }

    // ── Preço (mesma regra do checkout: anual = 12x, desconto só no anual) ──
    const ehAnual = ciclo === 'anual'
    let descontoPercent = 0
    if (ehAnual) {
      const { data: cfg } = await supabase
        .from('app_settings').select('key, value')
        .in('key', ['desconto_anual_ativo', 'desconto_anual_percent'])
      const map: Record<string, string> = {}
      for (const c of (cfg || []) as { key: string; value: string }[]) map[c.key] = c.value
      const ativo = map['desconto_anual_ativo'] === 'true' || map['desconto_anual_ativo'] === '1'
      if (ativo) {
        const bruto = Number(map['desconto_anual_percent'] || '0')
        descontoPercent = Number.isFinite(bruto) ? Math.min(50, Math.max(0, bruto)) : 0
      }
    }
    const precoAnual = Math.round(precoMensal * 12 * (1 - descontoPercent / 100) * 100) / 100
    const valor = ehAnual ? precoAnual : precoMensal
    const diasAcesso = ehAnual ? 365 : 30

    // ── Alvo: própria assinatura ou PRESENTE para outro e-mail ──
    let alvoId = user.id
    let alvoTexto = 'própria assinatura'
    const ehPresente = !!(alvo_email && String(alvo_email).trim())
    if (ehPresente) {
      const emailNorm = String(alvo_email).trim().toLowerCase()
      const { data: alvo } = await supabase
        .from('profiles').select('id').ilike('email', emailNorm).maybeSingle()
      if (!alvo) {
        return NextResponse.json({
          error: 'Esse e-mail não tem conta no TigerJus. Peça para a pessoa criar uma conta gratuita primeiro.'
        }, { status: 404 })
      }
      alvoId = alvo.id
      alvoTexto = `presente para ${emailNorm}`
    }

    // ── DÉBITO ATÔMICO (confere saldo + debita numa transação travada) ──
    const tipo = ehPresente ? 'uso_presente' : 'uso_assinatura'
    const desc = `Assinatura ${plano} (${ehAnual ? 'anual' : 'mensal'}) — ${alvoTexto}`
    const { data: ok, error: dErr } = await supabase.rpc('debitar_carteira', {
      p_user: user.id, p_valor: valor, p_tipo: tipo, p_desc: desc,
    })
    if (dErr) {
      return NextResponse.json({ error: 'Erro ao debitar crédito: ' + dErr.message }, { status: 500 })
    }
    if (!ok) {
      return NextResponse.json({ error: 'Saldo insuficiente na carteira.' }, { status: 400 })
    }

    // ── Ativa/estende o plano no ALVO. Se falhar, ESTORNA o crédito. ──
    try {
      const agora = Date.now()
      const { data: ass } = await supabase
        .from('assinaturas').select('fim')
        .eq('user_id', alvoId).eq('status', 'ativo')
        .order('fim', { ascending: false }).limit(1).maybeSingle()
      const baseFim = ass?.fim ? Math.max(agora, new Date(ass.fim).getTime()) : agora
      const novoFim = new Date(baseFim + diasAcesso * 24 * 60 * 60 * 1000).toISOString()

      const { error: insErr } = await supabase.from('assinaturas').insert({
        user_id: alvoId, plano, status: 'ativo', valor,
        inicio: new Date(agora).toISOString(), fim: novoFim,
        mp_payment_id: `credito-${user.id}-${agora}`,
      })
      if (insErr) throw insErr

      const { error: updErr } = await supabase.from('profiles').update({ plano }).eq('id', alvoId)
      if (updErr) throw updErr

      return NextResponse.json({ ok: true, alvo: ehPresente ? 'presente' : 'proprio', valor, fim: novoFim })
    } catch (actErr: any) {
      // Estorno: devolve o crédito debitado, já que o plano não foi ativado.
      await supabase.from('carteira_transacoes').insert({
        user_id: user.id, tipo: 'ajuste', valor: valor,
        descricao: 'Estorno — falha ao ativar o plano',
      })
      return NextResponse.json({
        error: 'Não foi possível ativar o plano; seu crédito foi estornado. Tente novamente.'
      }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro inesperado.' }, { status: 500 })
  }
}
