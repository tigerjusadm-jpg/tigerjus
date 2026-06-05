import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_PRICES: Record<string, number> = {
  start: 1.99,
  plus: 5.99,
  pro: 9.99,
  elite: 19.99,
}

export async function POST(req: NextRequest) {
  try {
    const { plan, method, userId, email, name, card, ciclo } = await req.json()

    const precoMensal = PLAN_PRICES[plan]
    if (!precoMensal) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

    // Ciclo: 'mensal' (padrão) ou 'anual' (12x o mensal, pagamento único via PIX).
    // Validação estrita — qualquer outro valor cai para mensal.
    const ehAnual = ciclo === 'anual'

    // Desconto promocional — SÓ no anual. Lido do banco (app_settings), nunca do cliente.
    // Trava de segurança: o percentual é forçado a ficar entre 0 e 50 no servidor.
    let descontoPercent = 0
    if (ehAnual) {
      const { data: cfg } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['desconto_anual_ativo', 'desconto_anual_percent'])
      const map: Record<string, string> = {}
      for (const c of (cfg || []) as { key: string; value: string }[]) map[c.key] = c.value
      const ativo = map['desconto_anual_ativo'] === 'true' || map['desconto_anual_ativo'] === '1'
      if (ativo) {
        const bruto = Number(map['desconto_anual_percent'] || '0')
        // Trava: ignora valores inválidos; limita a faixa 0–50.
        descontoPercent = Number.isFinite(bruto) ? Math.min(50, Math.max(0, bruto)) : 0
      }
    }

    const precoAnualCheio = Math.round(precoMensal * 12 * 100) / 100
    const precoAnualComDesconto = Math.round(precoAnualCheio * (1 - descontoPercent / 100) * 100) / 100
    const amount = ehAnual ? precoAnualComDesconto : precoMensal
    const rotuloCiclo = ehAnual
      ? (descontoPercent > 0 ? `Plano anual (12 meses) - ${descontoPercent}% OFF` : 'Plano anual (12 meses)')
      : 'Assinatura mensal'
    const diasAcesso = ehAnual ? 365 : 30

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })

    if (method === 'pix') {
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Idempotency-Key': `${userId}-${plan}-${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: `TigerJus ${plan} - ${rotuloCiclo}`,
          payment_method_id: 'pix',
          payer: {
            email: email || 'usuario@tigerjus.com.br',
            first_name: name?.split(' ')[0] || 'Usuario',
            last_name: name?.split(' ').slice(1).join(' ') || 'TigerJus',
          },
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
          metadata: { user_id: userId, plan, ciclo: ehAnual ? 'anual' : 'mensal' },
        }),
      })

      const mpData = await mpResponse.json()

      if (!mpResponse.ok) {
        console.error('MP Error:', mpData)
        return NextResponse.json({ error: 'Erro ao gerar PIX', details: mpData }, { status: 500 })
      }

      await supabase.from('assinaturas').insert({
        user_id: userId,
        plano: plan,
        status: 'pendente',
        mp_payment_id: String(mpData.id),
        valor: amount,
        inicio: new Date().toISOString(),
        fim: new Date(Date.now() + diasAcesso * 24 * 60 * 60 * 1000).toISOString(),
      })

      return NextResponse.json({
        payment_id: mpData.id,
        status: mpData.status,
        pix: {
          qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
          copy_paste: mpData.point_of_interaction?.transaction_data?.qr_code,
        },
      })

    } else if (method === 'credit_card') {
      const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          items: [{
            title: `TigerJus ${plan} - ${rotuloCiclo}`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL',
          }],
          payer: { email },
          back_urls: {
            success: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
            failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?plan=${plan}&payment=error`,
            pending: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?plan=${plan}&payment=pending`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
          metadata: { user_id: userId, plan },
        }),
      })

      const prefData = await prefResponse.json()

      return NextResponse.json({
        checkout_url: prefData.init_point,
        payment_id: prefData.id,
        status: 'redirect',
      })
    }

    return NextResponse.json({ error: 'Método inválido' }, { status: 400 })

  } catch (error) {
    console.error('Payment Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
