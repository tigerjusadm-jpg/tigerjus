import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/planos'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Modelo por plano ───────────────────────────────────────────────────────────
// Haiku: barato, rápido — ideal para perguntas simples e planos de entrada
// Sonnet: melhor qualidade — reservado para Pro e Elite que pagam mais
const MODEL_POR_PLANO: Record<string, string> = {
  gratuito: 'claude-haiku-4-5-20251001',
  start:    'claude-haiku-4-5-20251001',
  plus:     'claude-haiku-4-5-20251001',
  pro:      'claude-sonnet-4-6',
  elite:    'claude-sonnet-4-6',
}

// ── Max tokens por plano ──────────────────────────────────────────────────────
// Respostas menores = custo menor. Planos superiores têm respostas mais completas.
const MAX_TOKENS_POR_PLANO: Record<string, number> = {
  gratuito: 512,
  start:    768,
  plus:     1024,
  pro:      1500,
  elite:    2048,
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é o TigerJus AI — tutor jurídico especializado em Direito brasileiro e aprovação na OAB. Sua missão é ajudar estudantes de Direito a: - Entender conceitos jurídicos de forma clara e didática - Revisar conteúdo para a OAB 1ª e 2ª fase - Explicar artigos de lei com exemplos práticos - Identificar pontos críticos para provas - Corrigir erros de raciocínio jurídico Diretrizes obrigatórias: - Use linguagem clara e acessível, evite juridiquês desnecessário - Sempre cite o artigo, lei ou código quando relevante - Foque em lei seca e entendimento prático - Seja objetivo, didático e construtivo - Priorize os temas que mais caem na OAB ATUALIZAÇÃO LEGISLATIVA — MUITO IMPORTANTE: - Sempre que abordar um tema, verifique se houve reformas, emendas, novas leis ou alterações jurisprudenciais recentes - Alerte o estudante quando um tema for objeto de reforma legislativa recente ou estiver em discussão no Congresso ou STF - Exemplos de temas sensíveis a mudanças: reforma tributária, reforma trabalhista, marco civil da internet, LGPD, legislação eleitoral, Código de Processo Civil, alterações no Código Penal - Sempre oriente: "Verifique a redação atual vigente no site do Planalto (planalto.gov.br) ou no portal do STF, pois este tema pode ter sofrido alterações recentes." - Nunca afirme com certeza absoluta que uma lei está em vigor sem recomendar a conferência na fonte oficial - Se não tiver certeza sobre uma alteração legislativa recente, seja transparente e diga: "Recomendo verificar a versão mais atualizada desta norma, pois pode haver alterações que não tenho em meu treinamento." Você representa a marca TigerJus — performance, foco, atualização constante e aprovação.`

export async function POST(req: NextRequest) {
  try {
    // SEGURANÇA: plano obtido sempre do banco — nunca do corpo da requisição.
    const { messages, userId } = await req.json()

    if (userId) {
      // 1. Buscar perfil e configuração do plano simultaneamente
      const { data: profile } = await supabase
        .from('profiles')
        .select('plano, role, free_ia_used, last_ia_reset')
        .eq('id', userId)
        .single()

      const plano = profile?.plano || 'gratuito'
      const ehAdmin = isAdmin(profile?.role)

      if (!ehAdmin) {
        // 2. Buscar limite do dia no plan_settings (admin pode alterar sem deploy)
        const { data: planConfig } = await supabase
          .from('plan_settings')
          .select('ia_perguntas_limite')
          .eq('plano', plano)
          .single()

        // Fallback: se plan_settings não tiver o plano, usar limites conservadores
        const limiteIA = planConfig?.ia_perguntas_limite ?? 5

        // 3. Reset DIÁRIO — compara com a data de hoje (YYYY-MM-DD)
        const hoje = new Date().toISOString().split('T')[0]
        let usado = profile?.free_ia_used || 0

        if (profile?.last_ia_reset !== hoje) {
          // Novo dia: zera o contador
          usado = 0
        }

        if (usado >= limiteIA) {
          return NextResponse.json(
            { error: 'LIMIT_REACHED' },
            { status: 403 }
          )
        }

        // 4. Incrementar uso do dia
        await supabase
          .from('profiles')
          .update({
            free_ia_used:   usado + 1,
            last_ia_reset:  hoje,
          })
          .eq('id', userId)
      }

      // 5. Selecionar modelo e max_tokens com base no plano
      const model     = MODEL_POR_PLANO[plano]     || 'claude-haiku-4-5-20251001'
      const maxTokens = MAX_TOKENS_POR_PLANO[plano] || 768

      // 6. Limitar histórico a últimas 6 mensagens (reduz tokens enviados)
      const mensagensLimitadas = messages.slice(-6)

      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: mensagensLimitadas.map((m: any) => ({
          role:    m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || m.text || '',
        })),
      })

      const text = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')

      return NextResponse.json({ text })
    }

    // Usuário não autenticado: usa Haiku com limite mínimo
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:     SYSTEM_PROMPT,
      messages:   messages.slice(-4).map((m: any) => ({
        role:    m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || m.text || '',
      })),
    })

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')

    return NextResponse.json({ text })

  } catch (error: any) {
    console.error('IA Error:', error)
    return NextResponse.json({
      text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em alguns segundos.'
    }, { status: 200 })
  }
}
