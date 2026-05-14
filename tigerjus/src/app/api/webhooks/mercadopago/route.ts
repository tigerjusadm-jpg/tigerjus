import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN!

const PLAN_BY_AMOUNT: Record<number, string> = {
  199: 'start',
  599: 'plus',
  999: 'pro',
  1999: 'elite',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (type !== 'payment') {
      return NextResponse.json({ received: true })
    }

    const paymentId = data?.id
    if (!paymentId) return NextResponse.json({ received: true })

    // Fetch payment details from MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    })
    const mpPayment = await mpRes.json()

    if (mpPayment.status !== 'approved') {
      return NextResponse.json({ received: true })
    }

    const userId = mpPayment.metadata?.user_id
    const plan = mpPayment.metadata?.plan
    const amountCents = Math.round(mpPayment.transaction_amount * 100)

    if (!userId || !plan) {
      console.error('Missing metadata:', mpPayment.metadata)
      return NextResponse.json({ received: true })
    }

    const supabase = supabaseAdmin()

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'approved',
        paid_at: new Date().toISOString(),
      })
      .eq('provider_payment_id', String(paymentId))

    // Create or update subscription
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: plan,
        status: 'active',
        payment_provider: 'mercadopago',
        provider_subscription_id: String(paymentId),
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        amount_cents: amountCents,
      }, { onConflict: 'user_id' })

    // Update user plan
    await supabase
      .from('profiles')
      .update({ plan: plan })
      .eq('id', userId)

    // Award XP for subscribing
    await supabase.from('xp_history').insert({
      user_id: userId,
      amount: 500,
      reason: `Assinatura ${plan} ativada`,
    })
    await supabase.rpc('increment_xp', { user_id: userId, amount: 500 })

    console.log(`✅ Payment approved: user=${userId} plan=${plan}`)
    return NextResponse.json({ received: true, processed: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
