import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Webhook MP recebido:', JSON.stringify(body))

    // O Mercado Pago manda o tipo de duas formas possíveis: body.type ou body.action
    const tipo = body?.type || body?.action || ''
    const isPagamento = String(tipo).includes('payment')

    // O ID do pagamento pode vir em body.data.id (formato novo) ou body.resource (antigo)
    const paymentId = body?.data?.id || body?.resource

    if (!isPagamento || !paymentId) {
      // Não é uma notificação de pagamento que nos interessa — respondemos OK pra MP não reenviar.
      return NextResponse.json({ ok: true })
    }

    // 1) Confirmar com o Mercado Pago o status REAL do pagamento
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    })
    const payment = await mpResponse.json()
    console.log('Pagamento MP:', paymentId, 'status:', payment?.status)

    if (payment?.status !== 'approved') {
      // Ainda não aprovado (pendente, recusado, etc.) — nada a liberar agora.
      return NextResponse.json({ ok: true })
    }

    // 2) Descobrir DE QUEM é esse pagamento — direto da nossa tabela, sem depender do metadata.
    //    A API gravou o pagamento em `assinaturas` com mp_payment_id = id do pagamento MP.
    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('id, user_id, plano')
      .eq('mp_payment_id', String(paymentId))
      .maybeSingle()

    // Fallback: se por algum motivo não achou pelo mp_payment_id, tenta pelo metadata do MP.
    const userId = assinatura?.user_id || payment?.metadata?.user_id
    const plano = assinatura?.plano || payment?.metadata?.plan

    if (!userId || !plano) {
      console.error('Webhook: pagamento aprovado mas não foi possível identificar user/plano.', { paymentId, userId, plano })
      return NextResponse.json({ ok: true })
    }

    // 3) Marcar a assinatura como ativa
    await supabase
      .from('assinaturas')
      .update({ status: 'ativo', mp_payment_id: String(paymentId) })
      .eq('user_id', userId)
      .eq('status', 'pendente')

    // 4) Liberar o acesso: atualizar o plano no perfil do usuário
    await supabase
      .from('profiles')
      .update({ plano })
      .eq('id', userId)

    console.log(`✅ Plano "${plano}" ativado para o usuário ${userId} (pagamento ${paymentId})`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook Error:', error)
    // Retornamos 200 mesmo em erro para o MP não ficar reenviando infinitamente;
    // o erro fica logado para investigação.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook TigerJus ativo' })
}
