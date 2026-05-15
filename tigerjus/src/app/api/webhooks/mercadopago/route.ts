import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Webhook MP:', JSON.stringify(body))

    const { type, data } = body

    if (type === 'payment') {
      const paymentId = data?.id
      if (!paymentId) return NextResponse.json({ ok: true })

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      })

      const payment = await mpResponse.json()
      console.log('Payment status:', payment.status, 'metadata:', payment.metadata)

      if (payment.status === 'approved') {
        const userId = payment.metadata?.user_id
        const plan = payment.metadata?.plan

        if (userId && plan) {
          await supabase
            .from('assinaturas')
            .update({ status: 'ativo', mp_payment_id: String(paymentId) })
            .eq('user_id', userId)
            .eq('status', 'pendente')

          await supabase
            .from('profiles')
            .update({ plano: plan })
            .eq('id', userId)

          console.log(`✅ Plano ${plan} ativado para usuário ${userId}`)
        }
      }
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook TigerJus ativo' })
}
