import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tigerjus.com.br'

const PLAN_PRICES: Record<string, { title: string; amount: number }> = {
  start: { title: 'Tiger Start', amount: 1.99 },
  plus: { title: 'Tiger Plus', amount: 5.99 },
  pro: { title: 'Tiger Pro', amount: 9.99 },
  elite: { title: 'Tiger Elite', amount: 19.99 },
}

export async function POST(request: NextRequest) {
  try {
    const { plan, method, userId, email, name } = await request.json()

    const planInfo = PLAN_PRICES[plan]
    if (!planInfo) return NextResponse.json({ error: 'INVALID_PLAN' }, { status: 400 })

    // Create payment via Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': `tigerjus-${userId}-${plan}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: planInfo.amount,
        description: `TigerJus ${planInfo.title} — Assinatura Mensal`,
        payment_method_id: method === 'pix' ? 'pix' : undefined,
        payer: {
          email: email,
          first_name: name?.split(' ')[0] || 'Usuario',
          last_name: name?.split(' ').slice(1).join(' ') || 'TigerJus',
        },
        notification_url: `${APP_URL}/api/webhooks/mercadopago`,
        metadata: { user_id: userId, plan: plan },
        ...(method !== 'pix' ? {
          payment_method_id: 'visa',
          installments: 1,
        } : {}),
      }),
    })

    const mpData = await mpResponse.json()

    if (mpData.error) {
      throw new Error(mpData.message || 'Erro no Mercado Pago')
    }

    // Save payment record to Supabase
    const supabase = supabaseAdmin()
    const { data: payment } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        provider_payment_id: String(mpData.id),
        amount_cents: Math.round(planInfo.amount * 100),
        status: 'pending',
        payment_method: method,
        pix_qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        pix_qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        pix_copy_paste: mpData.point_of_interaction?.transaction_data?.qr_code,
        expires_at: mpData.date_of_expiration,
        metadata: { plan, mp_id: mpData.id },
      })
      .select()
      .single()

    return NextResponse.json({
      payment_id: mpData.id,
      status: mpData.status,
      pix: method === 'pix' ? {
        qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        copy_paste: mpData.point_of_interaction?.transaction_data?.qr_code,
        expires_at: mpData.date_of_expiration,
      } : null,
      internal_id: payment?.id,
    })
  } catch (error: any) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'PAYMENT_ERROR', message: error.message }, { status: 500 })
  }
}
