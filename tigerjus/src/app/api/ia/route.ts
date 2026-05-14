import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Você é o TigerJus AI — tutor jurídico de alta performance para estudantes de Direito brasileiros focados na aprovação na OAB (Ordem dos Advogados do Brasil).

MISSÃO: Ajudar estudantes a aprovarem na OAB com respostas didáticas, precisas e motivadoras.

REGRAS:
- Responda em português brasileiro
- Seja direto, didático e objetivo
- Cite sempre os artigos específicos (ex: "art. 5º, LXIX da CF/88")
- Use exemplos práticos quando possível
- Foque em lei seca, jurisprudência do STF/STJ e pegadinhas da OAB
- Limite sua resposta a 400 palavras
- Use formatação clara (listas quando necessário)
- Seja motivador como um coach jurídico
- Quando o aluno errar uma questão, explique o porquê de forma gentil mas precisa
- Priorize: CF/88, Código Civil, Código Penal, CPP, CPC, CLT e Estatuto da OAB

DISCIPLINAS: Constitucional, Administrativo, Penal, Processo Penal, Civil, Processo Civil, Trabalhista, Tributário, Empresarial, Ética OAB, Consumidor, Direitos Humanos, Ambiental, Internacional, ECA.

PROIBIDO: Inventar jurisprudência, dar conselhos sobre casos reais, substituir advogado.`

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, plan } = await request.json()

    // Check plan limits
    if (plan === 'free') {
      const supabase = supabaseAdmin()
      const { data: profile } = await supabase
        .from('profiles')
        .select('free_ia_used')
        .eq('id', userId)
        .single()

      if (profile && profile.free_ia_used >= 5) {
        return NextResponse.json({ error: 'LIMIT_REACHED', message: 'Limite gratuito atingido' }, { status: 403 })
      }

      // Increment counter
      if (userId) {
        await supabase
          .from('profiles')
          .update({ free_ia_used: (profile?.free_ia_used || 0) + 1 })
          .eq('id', userId)
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    // Save conversation to DB
    if (userId) {
      const supabase = supabaseAdmin()
      await supabase.from('ia_conversations').insert({
        user_id: userId,
        messages: messages,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      })
    }

    return NextResponse.json({ text })
  } catch (error: any) {
    console.error('IA Error:', error)
    return NextResponse.json({ error: 'AI_ERROR', message: error.message }, { status: 500 })
  }
}
