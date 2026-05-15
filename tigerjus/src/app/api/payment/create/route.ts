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
    const { plan, method, userId, email, name, card } = await req.json()

    const amount = PLAN_PRICES[plan]
    if (!amount) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

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
          description: `TigerJus ${plan} - Assinatura mensal`,
          payment_method_id: 'pix',
          payer: {
            email: email || 'usuario@tigerjus.com.br',
            first_name: name?.split(' ')[0] || 'Usuario',
            last_name: name?.split(' ').slice(1).join(' ') || 'TigerJus',
          },
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
          metadata: { user_id: userId, plan },
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
        fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
            title: `TigerJus ${plan} - Assinatura mensal`,
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
