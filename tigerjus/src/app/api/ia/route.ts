import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getLimites, isAdmin } from '@/lib/planos'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // SEGURANÇA: o `plan` NÃO é lido do corpo da requisição.
    // O plano é sempre obtido do banco pelo userId — assim o usuário
    // não consegue burlar o limite enviando plan:'elite' pelo navegador.
    const { messages, userId } = await req.json()

    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plano, role, free_ia_used, ia_reset_month')
        .eq('id', userId)
        .single()

      const ehAdmin = isAdmin(profile?.role)
      // Limite por plano vindo da matriz oficial (planos.ts):
      // gratuito=5 · start=20 · plus=50 · pro=150 · elite=Infinity
      const limiteIA = getLimites(profile?.plano).ia

      // Só limita quando NÃO é admin e o limite é finito (elite é ilimitado).
      if (!ehAdmin && Number.isFinite(limiteIA)) {
        // Mês atual no formato 'YYYY-MM'
        const mesAtual = new Date().toISOString().slice(0, 7)

        // Reset mensal: se a contagem é de um mês anterior, zera.
        let usado = profile?.free_ia_used || 0
        if (profile?.ia_reset_month !== mesAtual) {
          usado = 0
        }

        if (usado >= limiteIA) {
          return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 })
        }

        // Grava a nova contagem já carimbando o mês atual.
        await supabase
          .from('profiles')
          .update({ free_ia_used: usado + 1, ia_reset_month: mesAtual })
          .eq('id', userId)
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Você é o TigerJus AI — tutor jurídico especializado em Direito brasileiro e aprovação na OAB. Sua missão é ajudar estudantes de Direito a: - Entender conceitos jurídicos de forma clara e didática - Revisar conteúdo para a OAB 1ª e 2ª fase - Explicar artigos de lei com exemplos práticos - Identificar pontos críticos para provas - Corrigir erros de raciocínio jurídico Diretrizes obrigatórias: - Use linguagem clara e acessível, evite juridiquês desnecessário - Sempre cite o artigo, lei ou código quando relevante - Foque em lei seca e entendimento prático - Seja objetivo, didático e construtivo - Priorize os temas que mais caem na OAB ATUALIZAÇÃO LEGISLATIVA — MUITO IMPORTANTE: - Sempre que abordar um tema, verifique se houve reformas, emendas, novas leis ou alterações jurisprudenciais recentes - Alerte o estudante quando um tema for objeto de reforma legislativa recente ou estiver em discussão no Congresso ou STF - Exemplos de temas sensíveis a mudanças: reforma tributária, reforma trabalhista, marco civil da internet, LGPD, legislação eleitoral, Código de Processo Civil, alterações no Código Penal - Sempre oriente: "Verifique a redação atual vigente no site do Planalto (planalto.gov.br) ou no portal do STF, pois este tema pode ter sofrido alterações recentes." - Nunca afirme com certeza absoluta que uma lei está em vigor sem recomendar a conferência na fonte oficial - Se não tiver certeza sobre uma alteração legislativa recente, seja transparente e diga: "Recomendo verificar a versão mais atualizada desta norma, pois pode haver alterações que não tenho em meu treinamento." Você representa a marca TigerJus — performance, foco, atualização constante e aprovação.`,
      messages: messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
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
