import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    const tipo = body?.type || body?.action || ''
    const isPagamento = String(tipo).includes('payment')
    const paymentId = body?.data?.id || body?.resource

    if (!isPagamento || !paymentId) {
      return NextResponse.json({ ok: true })
    }

    // 1) Confirmar status real do pagamento no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    })
    const payment = await mpResponse.json()
    console.log('Pagamento MP:', paymentId, 'status:', payment?.status)

    if (payment?.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    // 2) Identificar o usuário e plano
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

    // 3) Marcar assinatura como ativa
    await supabase
      .from('assinaturas')
      .update({ status: 'ativo', mp_payment_id: String(paymentId) })
      .eq('user_id', userId)
      .eq('status', 'pendente')

    // 4) Liberar plano no perfil
    await supabase
      .from('profiles')
      .update({ plano })
      .eq('id', userId)

    console.log(`✅ Plano "${plano}" ativado para ${userId} (pagamento ${paymentId})`)

    // ── 5) PROGRAMA TIGRE EMBAIXADOR ──────────────────────────────────────
    // Bloco isolado: se falhar, não afeta a ativação do plano.
    try {
      // Buscar perfil do usuário que acabou de pagar
      const { data: perfilPagador } = await supabase
        .from('profiles')
        .select('id, referred_by, plano')
        .eq('id', userId)
        .maybeSingle()

      if (!perfilPagador?.referred_by) {
        // Usuário não foi indicado por ninguém — nada a fazer
        console.log('Referral: usuário sem indicação.')
      } else {
        // Verifica se essa indicação já foi recompensada (evita duplicatas)
        const { data: recompensaExistente } = await supabase
          .from('referral_rewards')
          .select('id')
          .eq('referred_id', userId)
          .maybeSingle()

        if (recompensaExistente) {
          console.log('Referral: indicação já recompensada anteriormente.')
        } else {
          // Buscar o perfil de quem indicou pelo referral_code
          const { data: indicador } = await supabase
            .from('profiles')
            .select('id, plano, referral_count, ambassador_badge, referral_days_bonus, referral_discount_pct')
            .eq('referral_code', perfilPagador.referred_by)
            .maybeSingle()

          if (!indicador) {
            console.log('Referral: código de indicação não encontrado:', perfilPagador.referred_by)
          } else {
            const novoCount = (indicador.referral_count || 0) + 1
            const novoBadge = calcularBadge(novoCount)

            let updateIndicador: Record<string, any> = {
              referral_count: novoCount,
              ambassador_badge: novoBadge,
            }

            let rewardType  = 'days'
            let rewardValue = 15

            if (indicador.plano === 'elite') {
              // Elite: acumula 5% de desconto por indicação (teto 50%)
              const pctAtual  = indicador.referral_discount_pct || 0
              const novoPct   = Math.min(50, pctAtual + 5)
              updateIndicador.referral_discount_pct = novoPct
              rewardType  = 'discount'
              rewardValue = 5
              console.log(`Referral Elite: ${indicador.id} → +5% desconto (total ${novoPct}%)`)
            } else {
              // Não-Elite: +15 dias no plano atual
              const diasAtuais = indicador.referral_days_bonus || 0
              updateIndicador.referral_days_bonus = diasAtuais + 15
              rewardType  = 'days'
              rewardValue = 15
              console.log(`Referral: ${indicador.id} → +15 dias (total ${diasAtuais + 15} dias)`)
            }

            // Atualiza o indicador
            await supabase
              .from('profiles')
              .update(updateIndicador)
              .eq('id', indicador.id)

            // Registra a recompensa
            await supabase
              .from('referral_rewards')
              .insert({
                referrer_id:  indicador.id,
                referred_id:  userId,
                payment_id:   String(paymentId),
                reward_type:  rewardType,
                reward_value: rewardValue,
              })

            console.log(`🎁 Recompensa concedida: ${rewardType} +${rewardValue} para ${indicador.id} | badge: ${novoBadge}`)
          }
        }
      }
    } catch (refErr) {
      // Erro no sistema de referral — apenas loga, não quebra o fluxo principal
      console.error('Referral reward error (non-critical):', refErr)
    }
    // ── FIM DO PROGRAMA TIGRE EMBAIXADOR ─────────────────────────────────

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook TigerJus ativo' })
}
