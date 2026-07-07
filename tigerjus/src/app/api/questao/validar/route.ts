import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLimites, isAdmin } from '@/lib/planos'

// Cliente com service role: lê resposta_correta sem expor ao navegador.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LETRAS = ['A', 'B', 'C', 'D']

export async function POST(req: NextRequest) {
  try {
    // 1) Exige usuário logado (bloqueia varredura anônima do gabarito)
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // 2) Lê o corpo
    const body = await req.json().catch(() => ({}))
    const questaoId = String(body?.questaoId || '').trim()
    if (!questaoId) {
      return NextResponse.json({ error: 'questaoId obrigatório' }, { status: 400 })
    }

    // Normaliza a escolha: aceita índice 0-3 OU letra 'A'-'D'. Ausente = só revelar.
    let escolha: string | null = null
    const raw = body?.escolha
    if (typeof raw === 'number' && raw >= 0 && raw <= 3) {
      escolha = LETRAS[raw]
    } else if (typeof raw === 'string' && raw.trim()) {
      const up = raw.trim().toUpperCase().slice(0, 1)
      if (LETRAS.includes(up)) escolha = up
    }

    // 2.1) COTA DIÁRIA DE QUESTÕES — só o QUIZ consome (contexto:'quiz').
    //      Simulado/trilha/disciplina não marcam → não são gateados aqui.
    //      Enforce server-side, espelhando o padrão do /api/ia:
    //      Grátis 15 · Start 50 · Pro/Elite ∞ · Admin ∞.
    if (String(body?.contexto || '') === 'quiz') {
      const { data: prof } = await admin
        .from('profiles')
        .select('plano, role, free_questions_used, last_questao_reset')
        .eq('id', user.id)
        .maybeSingle()

      if (!isAdmin(prof?.role)) {
        const limite = getLimites(prof?.plano).questoes
        if (Number.isFinite(limite)) {
          const hoje = new Date().toISOString().split('T')[0]
          // reset diário: se a última contagem não foi hoje, zera
          const usado =
            prof?.last_questao_reset === hoje ? (prof?.free_questions_used || 0) : 0

          if (usado >= limite) {
            // Limite do dia atingido: NÃO revela o gabarito.
            return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 })
          }

          // Conta apenas respostas reais (escolha != null); timeout não consome.
          if (escolha !== null) {
            await admin
              .from('profiles')
              .update({ free_questions_used: usado + 1, last_questao_reset: hoje })
              .eq('id', user.id)
          }
        }
      }
    }

    // 3) Busca a resposta correta no servidor (nunca vai pro navegador antes da hora)
    const { data: q, error } = await admin
      .from('questoes_oab')
      .select('resposta_correta, comentario')
      .eq('id', questaoId)
      .maybeSingle()

    if (error || !q) {
      return NextResponse.json({ error: 'questão não encontrada' }, { status: 404 })
    }

    const letra_correta = q.resposta_correta
    const correto = escolha !== null ? escolha === letra_correta : false

    return NextResponse.json({
      correto,
      letra_correta,
      comentario: q.comentario || '',
    })
  } catch {
    return NextResponse.json({ error: 'erro interno' }, { status: 500 })
  }
}
