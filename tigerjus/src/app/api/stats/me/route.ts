import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Estatísticas do próprio usuário. Usa service role (dribla RLS do xp_historico),
// mas só lê as linhas do CALLER autenticado e devolve apenas agregados — nada sensível.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    // Auth: exige JWT válido; o resultado é sempre do próprio usuário.
    const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
      .replace(/^Bearer\s+/i, '')
      .trim()
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Aproveitamento recente (últimos 7 dias): conta acertos vs. total de questões
    // respondidas no período, a partir do log question_correct / question_wrong.
    const desde = new Date()
    desde.setDate(desde.getDate() - 7)
    const { data: hist } = await admin
      .from('xp_historico')
      .select('motivo')
      .eq('user_id', user.id)
      .in('motivo', ['question_correct', 'question_wrong'])
      .gte('created_at', desde.toISOString())

    const rows = hist || []
    const total = rows.length
    const corretas = rows.filter((r: { motivo: string }) => r.motivo === 'question_correct').length
    const taxa = total > 0 ? Math.round((corretas / total) * 100) : null

    return NextResponse.json({ recent7: { corretas, total, taxa } })
  } catch {
    return NextResponse.json({ error: 'erro interno' }, { status: 500 })
  }
}
