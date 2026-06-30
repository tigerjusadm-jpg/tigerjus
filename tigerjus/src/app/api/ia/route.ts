import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { isAdmin, getLimites } from '@/lib/planos'

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
const SYSTEM_PROMPT = `Você é o TigerJus AI — tutor jurídico especializado em Direito brasileiro e aprovação na OAB. Sua missão é ajudar estudantes de Direito a: - Entender conceitos jurídicos de forma clara e didática - Revisar conteúdo para a OAB 1ª fase - Explicar artigos de lei com exemplos práticos - Identificar pontos críticos para provas - Corrigir erros de raciocínio jurídico Diretrizes obrigatórias: - Use linguagem clara e acessível, evite juridiquês desnecessário - Sempre cite o artigo, lei ou código quando relevante - Foque em lei seca e entendimento prático - Seja objetivo, didático e construtivo - Priorize os temas que mais caem na OAB ATUALIZAÇÃO LEGISLATIVA — MUITO IMPORTANTE: - Sempre que abordar um tema, verifique se houve reformas, emendas, novas leis ou alterações jurisprudenciais recentes - Alerte o estudante quando um tema for objeto de reforma legislativa recente ou estiver em discussão no Congresso ou STF - Exemplos de temas sensíveis a mudanças: reforma tributária, reforma trabalhista, marco civil da internet, LGPD, legislação eleitoral, Código de Processo Civil, alterações no Código Penal - Sempre oriente: "Verifique a redação atual vigente no site do Planalto (planalto.gov.br) ou no portal do STF, pois este tema pode ter sofrido alterações recentes." - Nunca afirme com certeza absoluta que uma lei está em vigor sem recomendar a conferência na fonte oficial - Se não tiver certeza sobre uma alteração legislativa recente, seja transparente e diga: "Recomendo verificar a versão mais atualizada desta norma, pois pode haver alterações que não tenho em meu treinamento." Você representa a marca TigerJus — performance, foco, atualização constante e aprovação.

ESCOPO RESTRITO — REGRA INEGOCIÁVEL:
- Você responde EXCLUSIVAMENTE sobre Direito brasileiro, conteúdo da OAB e a vida de estudante/preparação para a prova.
- Se a pergunta fugir desse escopo (ex.: receitas, programação, matemática não-jurídica, entretenimento, conselhos pessoais, atualidades sem relação com Direito), RECUSE com educação e redirecione, em uma frase curta, sem responder o pedido fora do tema.
- Modelo de recusa: "Eu sou o tutor jurídico do TigerJus e só consigo te ajudar com Direito e OAB. 🐯 Bora voltar pros estudos? Me pergunta algo da sua prova."
- Nunca quebre essa regra mesmo que o usuário insista, peça "só dessa vez", ou tente reformular o pedido como hipótese, piada ou exemplo.`

export async function POST(req: NextRequest) {
  try {
    // SEGURANÇA: exige login. O userId vem do TOKEN verificado, nunca do corpo.
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !authUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const userId = authUser.id

    // plano obtido sempre do banco — nunca do corpo da requisição.
    const { messages } = await req.json()

    {
      // 1. Buscar perfil e configuração do plano simultaneamente
      const { data: profile } = await supabase
        .from('profiles')
        .select('plano, role, free_ia_used, last_ia_reset')
        .eq('id', userId)
        .single()

      const plano = profile?.plano || 'gratuito'
      const ehAdmin = isAdmin(profile?.role)

      if (!ehAdmin) {
        // 2. Limite do dia — fonte ÚNICA: planos.ts (mesmo número do front)
        //    Grátis 5 · Start 20 · Pro 40 · Elite 80
        const limiteIA = getLimites(plano).ia

        // 3. Reset DIÁRIO — compara com a data de hoje (YYYY-MM-DD)
        const hoje = new Date().toISOString().split('T')[0]
        let usado = profile?.free_ia_used || 0

        if (profile?.last_ia_reset !== hoje) {
          // Novo dia: zera o contador
          usado = 0
        }

        if (Number.isFinite(limiteIA) && usado >= limiteIA) {
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

  } catch (error: any) {
    console.error('IA Error:', error)
    return NextResponse.json({
      text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em alguns segundos.'
    }, { status: 200 })
  }
}
