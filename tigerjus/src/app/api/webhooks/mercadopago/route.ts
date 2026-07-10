import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Validação de assinatura HMAC do Mercado Pago ────────────────────────────
// Estágios controlados por env:
//   MERCADOPAGO_WEBHOOK_SECRET  → habilita o cálculo da assinatura.
//   MERCADOPAGO_WEBHOOK_ENFORCE → "true" rejeita requisições inválidas.
// Sem o secret configurado, a validação é ignorada (comportamento idêntico
// ao atual). Roda em TODA notificação (order, payment, etc.).
function validarAssinaturaMP(
  req: NextRequest,
  dataIdFallback: string
): { ok: boolean; motivo: string } {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return { ok: true, motivo: 'secret-nao-configurado' }

  const xSignature = req.headers.get('x-signature') || ''
  const xRequestId = req.headers.get('x-request-id') || ''
  if (!xSignature) return { ok: false, motivo: 'sem-x-signature' }

  // x-signature vem como: "ts=1700000000,v1=abcdef..."
  let ts = ''
  let v1 = ''
  for (const parte of xSignature.split(',')) {
    const idx = parte.indexOf('=')
    if (idx === -1) continue
    const chave = parte.slice(0, idx).trim()
    const valor = parte.slice(idx + 1).trim()
    if (chave === 'ts') ts = valor
    else if (chave === 'v1') v1 = valor
  }
  if (!ts || !v1) return { ok: false, motivo: 'x-signature-malformado' }

  // data.id: preferir o da query string (?data.id=...); se alfanumérico, minúsculo.
  const bruto = req.nextUrl.searchParams.get('data.id') || dataIdFallback || ''
  const dataId = /[a-zA-Z]/.test(bruto) ? bruto.toLowerCase() : bruto

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const calculado = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  // Comparação timing-safe (exige mesmo tamanho pra não lançar exceção)
  const a = Buffer.from(calculado, 'utf8')
  const b = Buffer.from(v1, 'utf8')
  const match = a.length === b.length && crypto.timingSafeEqual(a, b)
  return { ok: match, motivo: match ? 'match' : 'mismatch' }
}

// ── Lógica de badges por número de indicações ──────────────────────────────
function calcularBadge(count: number): string | null {
  if (count >= 10) return 'Embaixador Ouro'
  if (count >= 5)  return 'Embaixador Prata'
  if (count >= 3)  return 'Embaixador Bronze'
  if (count >= 1)  return 'Recrutador'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Webhook MP recebido:', JSON.stringify(body))

    const dataId = body?.data?.id || body?.resource || ''

    // 0) Validação de assinatura HMAC — roda em TODA notificação, antes de tudo.
    const sig = validarAssinaturaMP(req, String(dataId))
    const enforce = process.env.MERCADOPAGO_WEBHOOK_ENFORCE === 'true'
    console.log(`Webhook HMAC: ${sig.motivo} | enforce: ${enforce}`)
    if (enforce && !sig.ok) {
      console.error(`❌ Webhook rejeitado por assinatura inválida: ${sig.motivo} (data.id ${dataId})`)
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }

    // 1) Filtrar apenas eventos de pagamento
    const tipo = body?.type || body?.action || ''
    const isPagamento = String(tipo).includes('payment')
    const paymentId = dataId

    if (!isPagamento || !paymentId) {
      return NextResponse.json({ ok: true })
    }

    // 2) Confirmar status real do pagamento no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    })
    const payment = await mpResponse.json()
    console.log('Pagamento MP:', paymentId, 'status:', payment?.status)

    if (payment?.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    // 3) Identificar o usuário e plano
    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('id, user_id, plano')
      .eq('mp_payment_id', String(paymentId))
      .maybeSingle()

    const userId = assinatura?.user_id || payment?.metadata?.user_id
    const plano  = assinatura?.plano    || payment?.metadata?.plan

    if (!userId || !plano) {
      console.error('Webhook: não foi possível identificar user/plano.', { paymentId, userId, plano })
      return NextResponse.json({ ok: true })
    }

    // 4) Marcar assinatura como ativa
    await supabase
      .from('assinaturas')
      .update({ status: 'ativo', mp_payment_id: String(paymentId) })
      .eq('user_id', userId)
      .eq('status', 'pendente')

    // 5) Liberar plano no perfil
    await supabase
      .from('profiles')
      .update({ plano })
      .eq('id', userId)

    console.log(`✅ Plano "${plano}" ativado para ${userId} (pagamento ${paymentId})`)

    // ── 6) COMISSÃO DE INDICAÇÃO — Programa Tigre Embaixador 2.0 ──────────
    // A cada pagamento aprovado do indicado, credita comissão em R$ na
    // carteira do indicador. % dinâmico pela qtd de indicados ATIVOS no mês
    // (1=3% · 2-4=5% · 5-9=7% · 10+=10%), sobre o líquido (valor − taxa MP).
    // Bloco isolado: se falhar, não afeta a ativação do plano.
    try {
      const { data: perfilPagador } = await supabase
        .from('profiles').select('id, referred_by').eq('id', userId).maybeSingle()

      if (perfilPagador?.referred_by) {
        const { data: indicador } = await supabase
          .from('profiles').select('id, referral_code')
          .eq('referral_code', perfilPagador.referred_by).maybeSingle()

        if (indicador?.id && indicador.id !== userId) {
          const valorPago = Number(payment?.transaction_amount) || 0
          if (valorPago > 0) {
            const { data: cfgTaxa } = await supabase
              .from('app_settings').select('value').eq('key', 'comissao_taxa_mp_percent').maybeSingle()
            const taxaMp = Number(cfgTaxa?.value) || 1.0
            const liquido = valorPago * (1 - taxaMp / 100)

            const { count: ativos } = await supabase
              .from('profiles').select('id', { count: 'exact', head: true })
              .eq('referred_by', indicador.referral_code).neq('plano', 'gratuito')
            const nAtivos = ativos || 0
            const pct = nAtivos >= 10 ? 10 : nAtivos >= 5 ? 7 : nAtivos >= 2 ? 5 : 3
            const comissao = Math.round(liquido * (pct / 100) * 10000) / 10000

            const { error: txErr } = await supabase.from('carteira_transacoes').insert({
              user_id: indicador.id,
              tipo: 'comissao',
              valor: comissao,
              descricao: `Comissao ${pct}% - indicado pagou R$ ${valorPago.toFixed(2)}`,
              referred_id: userId,
              payment_id: String(paymentId),
              valor_bruto: valorPago,
              valor_liquido: Math.round(liquido * 100) / 100,
              percentual_aplicado: pct,
              ativos_no_mes: nAtivos,
            })

            if (txErr && (txErr as any).code === '23505') {
              console.log('Comissao ja creditada para este pagamento (idempotencia).')
            } else if (txErr) {
              console.error('Erro ao creditar comissao:', txErr.message)
            } else {
              console.log(`Comissao R$ ${comissao.toFixed(4)} (${pct}%, ${nAtivos} ativos) para indicador ${indicador.id}`)
            }
          }
        }
      }
    } catch (refErr) {
      console.error('Comissao de indicacao (nao-critico):', refErr)
    }
    // ── FIM DA COMISSÃO DE INDICAÇÃO ─────────────────────────────────────

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook TigerJus ativo' })
}
