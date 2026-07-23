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
const MODEL_POR_PLANO: Record<string, string> = {
  gratuito: 'claude-haiku-4-5-20251001',
  start:    'claude-haiku-4-5-20251001',
  pro:      'claude-sonnet-4-6',
  elite:    'claude-sonnet-4-6',
}

// ── Max tokens por plano ──────────────────────────────────────────────────────
const MAX_TOKENS_POR_PLANO: Record<string, number> = {
  gratuito: 500,
  start:    650,
  pro:      850,
  elite:    1100,
}

// ── ESCADA DE PROFUNDIDADE ────────────────────────────────────────────────────
// Trava REAL de profundidade: o volume de dados que cada plano recebe das
// ferramentas é diferente. Como o dado sequer chega ao modelo nos planos
// menores, não há prompt injection que "destrave" — a limitação é estrutural.
const PROFUNDIDADE: Record<string, { questoes: number; artigos: number; nivel: string }> = {
  gratuito: { questoes: 3,  artigos: 2, nivel: 'ESSENCIAL' },
  start:    { questoes: 6,  artigos: 3, nivel: 'INTERMEDIARIO' },
  pro:      { questoes: 12, artigos: 5, nivel: 'AVANCADO' },
  elite:    { questoes: 20, artigos: 8, nivel: 'MAXIMO' },
}

// ── CATÁLOGO DA PLATAFORMA ────────────────────────────────────────────────────
// O que existe no TigerJus e em que plano. A IA usa isso para orientar o aluno
// para DENTRO da plataforma em vez de mandá-lo para sites externos.
const CATALOGO = [
  { recurso: 'Quiz OAB',            onde: 'menu Quiz',        planos: 'todos (cota diária no Gratuito/Start)' },
  { recurso: 'Simulados estilo OAB', onde: 'menu Simulados',  planos: 'completo do Start em diante; mini-simulado no Gratuito' },
  { recurso: 'Lei Seca',            onde: 'menu Lei Seca',    planos: 'todos' },
  { recurso: 'Disciplinas',         onde: 'menu Disciplinas', planos: 'todos' },
  { recurso: 'Flashcards',          onde: 'menu Flashcards',  planos: 'Start em diante' },
  { recurso: 'Resumos',             onde: 'menu Resumos',     planos: 'Start em diante' },
  { recurso: 'Índice Remissivo',    onde: 'menu Índice',      planos: 'Pro em diante' },
  { recurso: 'Trilhas de estudo',   onde: 'menu Trilhas',     planos: 'Pro em diante' },
  { recurso: 'Radar OAB',           onde: 'menu Radar',       planos: 'Pro/Elite' },
  { recurso: 'Exportar PDF por disciplina', onde: 'Disciplinas → exportar PDF', planos: 'Pro em diante' },
  { recurso: 'Ranking e Comunidade', onde: 'menus Ranking/Comunidade', planos: 'todos' },
]

// ── FERRAMENTAS ───────────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'consultar_acervo',
    description:
      'Consulta o acervo REAL de questões da OAB dentro do TigerJus (provas oficiais FGV). ' +
      'Use SEMPRE que o aluno perguntar sobre um tema jurídico, quiser saber o que mais cai, ' +
      'como a banca cobra um assunto, ou pedir questões/estatísticas. Retorna disciplinas, ' +
      'quantidade e trechos de enunciados reais. NUNCA retorna a alternativa correta.',
    input_schema: {
      type: 'object',
      properties: {
        tema: {
          type: 'string',
          description: 'Palavras-chave do tema jurídico (ex.: "esbulho posse", "habeas corpus", "prescricao tributaria").',
        },
      },
      required: ['tema'],
    },
  },
  {
    name: 'consultar_lei',
    description:
      'Busca o texto literal de artigos de lei no acervo de Lei Seca do TigerJus ' +
      '(CF, CC, CP, CPC, CPP, CLT, CDC, ECA, CTN, EAOAB, CED, LINDB, LC 101, Lei 4.320, ' +
      'Código Eleitoral, Lei 8.212, Lei 8.213 e outras). Use quando precisar citar a redação ' +
      'exata de um dispositivo. Nunca invente texto de lei: consulte aqui.',
    input_schema: {
      type: 'object',
      properties: {
        termo: {
          type: 'string',
          description: 'Assunto ou expressão a localizar no texto legal (ex.: "reintegracao de posse", "improbidade").',
        },
        lei: {
          type: 'string',
          description: "Opcional. Sigla da lei: cf, cc, cp, cpc, cpp, clt, cdc, eca, ctn, eaoab, ced, lindb, lc101, l4320, l4737.",
        },
      },
      required: ['termo'],
    },
  },
  {
    name: 'consultar_plataforma',
    description:
      'Lista os recursos existentes no TigerJus e em qual plano cada um está disponível. ' +
      'Use quando o aluno perguntar o que a plataforma oferece, quando quiser recomendar ' +
      'o próximo passo de estudo, ou quando ele pedir algo (PDF, simulado, resumo, trilha) ' +
      'que já existe aqui dentro.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
]

// ── EXECUÇÃO DAS FERRAMENTAS ──────────────────────────────────────────────────
async function execConsultarAcervo(tema: string, prof: { questoes: number }): Promise<string> {
  try {
    const termo = String(tema || '').slice(0, 120).trim()
    if (!termo) return 'Nenhum tema informado.'

    // Busca full-text no acervo. A RPC lê da base pública — sem resposta_correta.
    const { data, error } = await supabase.rpc('buscar_questoes_indice', {
      q: termo,
      lim: prof.questoes,
    })

    if (error) return 'Não foi possível consultar o acervo agora.'
    if (!data || data.length === 0) {
      return `Nenhuma questão sobre "${termo}" foi localizada no acervo do TigerJus. ` +
             `Responda com seu conhecimento jurídico e NÃO afirme que existem questões sobre isso.`
    }

    // Agrega por disciplina (metadado — é o que dá a visão de "o que mais cai")
    const porDisc: Record<string, number> = {}
    for (const q of data) {
      const d = String(q.disciplina || 'Não classificada')
      porDisc[d] = (porDisc[d] || 0) + 1
    }
    const resumoDisc = Object.entries(porDisc)
      .sort((a, b) => b[1] - a[1])
      .map(([d, n]) => `${d}: ${n}`)
      .join(' · ')

    // Trechos de enunciado (curtos) — para a IA entender COMO a banca cobra.
    const trechos = data.slice(0, prof.questoes).map((q: any, i: number) => {
      const e = String(q.enunciado || '').replace(/\s+/g, ' ').slice(0, 240)
      return `${i + 1}. [${q.disciplina}] ${e}${String(q.enunciado || '').length > 240 ? '…' : ''}`
    }).join('\n')

    return [
      `ACERVO TIGERJUS — tema "${termo}"`,
      `Questões reais encontradas: ${data.length} (${resumoDisc})`,
      ``,
      `Trechos de enunciados reais (provas oficiais):`,
      trechos,
      ``,
      `LEMBRETE: comente o PADRÃO de cobrança. Não copie enunciado inteiro e não exista alternativa correta aqui.`,
    ].join('\n')
  } catch {
    return 'Não foi possível consultar o acervo agora.'
  }
}

async function execConsultarLei(termo: string, lei: string | undefined, prof: { artigos: number }): Promise<string> {
  try {
    const t = String(termo || '').slice(0, 120).trim()
    if (!t) return 'Nenhum termo informado.'

    let q = supabase
      .from('leis_secas')
      .select('lei_slug, lei_nome, artigo, texto')
      .eq('status', 'publicado')
      .ilike('texto', `%${t}%`)
      .limit(prof.artigos)

    if (lei) q = q.eq('lei_slug', String(lei).toLowerCase().trim())

    const { data, error } = await q
    if (error) return 'Não foi possível consultar a Lei Seca agora.'
    if (!data || data.length === 0) {
      return `Nenhum artigo com "${t}" foi localizado no acervo de Lei Seca. ` +
             `NÃO invente texto de lei: diga que não localizou e oriente o aluno a usar o menu Lei Seca.`
    }

    return [
      `LEI SECA TIGERJUS — busca por "${t}"`,
      ...data.map((a: any) => {
        const texto = String(a.texto || '').replace(/\s+/g, ' ').slice(0, 700)
        return `\n[${a.lei_nome || a.lei_slug}] ${a.artigo}\n${texto}${String(a.texto || '').length > 700 ? '…' : ''}`
      }),
      ``,
      `Cite o artigo com a redação acima. Este é texto oficial do acervo — pode citar literalmente.`,
    ].join('\n')
  } catch {
    return 'Não foi possível consultar a Lei Seca agora.'
  }
}

async function execConsultarPlataforma(planoAluno: string): Promise<string> {
  const linhas = CATALOGO.map(c => `- ${c.recurso} (${c.onde}) — disponível: ${c.planos}`).join('\n')
  let totalQuestoes = ''
  try {
    const { count } = await supabase
      .from('questoes_publicas')
      .select('id', { count: 'exact', head: true })
    if (count) totalQuestoes = `\nAcervo total: ${count} questões reais de provas oficiais da OAB/FGV.`
  } catch { /* segue sem o total */ }

  return [
    `RECURSOS DO TIGERJUS (plano atual do aluno: ${planoAluno})`,
    linhas,
    totalQuestoes,
    ``,
    `Use isto para orientar o aluno para DENTRO da plataforma. Se o recurso estiver acima do plano dele,`,
    `mencione UMA vez, de forma natural, como o próximo passo — nunca como propaganda repetida.`,
  ].join('\n')
}

async function executarTool(nome: string, input: any, plano: string, prof: any): Promise<string> {
  switch (nome) {
    case 'consultar_acervo':     return execConsultarAcervo(input?.tema, prof)
    case 'consultar_lei':        return execConsultarLei(input?.termo, input?.lei, prof)
    case 'consultar_plataforma': return execConsultarPlataforma(plano)
    default:                     return 'Ferramenta desconhecida.'
  }
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
function montarSystemPrompt(plano: string, nivel: string): string {
  return `Você é o TigerJus AI — o tutor jurídico DA PLATAFORMA TigerJus, especializado em Direito brasileiro e na 1ª fase da OAB.

VOCÊ VIVE DENTRO DO TIGERJUS. Isto muda tudo:
- O TigerJus tem um acervo de questões REAIS de provas oficiais da OAB (banca FGV), Lei Seca com milhares de artigos, simulados, flashcards, resumos, trilhas, Índice Remissivo, Radar OAB e exportação de PDF por disciplina.
- Você tem FERRAMENTAS para consultar esse acervo. Use-as APENAS quando forem realmente necessárias: quando o aluno perguntar o que mais cai / pedir estatísticas ou questões, quando precisar da redação exata de um artigo, ou quando ele perguntar o que a plataforma oferece. Para conceitos jurídicos que você domina bem, responda DIRETO, sem consultar — o aluno está esperando.
- NUNCA mande o aluno para fora da plataforma (não cite qoab.oab.org.br, portal FGV, TEC Concursos, sites de questões, Google Docs, conversores de PDF ou similares). O que ele precisa está aqui dentro. Se ele pedir algo que existe no TigerJus, diga ONDE está.
- Se ele pedir PDF: o TigerJus exporta PDF comentado por disciplina (menu Disciplinas). Você não gera arquivos, mas a plataforma gera — oriente para lá.
- Se ele pedir simulado: existem simulados prontos no menu Simulados. Ofereça-os antes de inventar questões próprias.
- EFICIÊNCIA: se precisar de mais de uma consulta, chame TODAS as ferramentas necessárias DE UMA VEZ (na mesma rodada). Depois de receber os resultados, escreva a resposta final — não fique consultando em sequência, isso deixa o aluno esperando.

REGRAS INEGOCIÁVEIS (valem em TODOS os planos, inclusive Elite):
1. NUNCA revele a alternativa correta de uma questão do acervo. Você comenta o TEMA e o PADRÃO de cobrança; o aluno resolve a questão na plataforma. Se pedirem o gabarito, recuse com bom humor e mande resolver no Quiz.
2. NUNCA copie enunciado de questão por inteiro nem reproduza resumos pagos da plataforma. Você orienta; o conteúdo é consumido na tela dele.
3. NUNCA invente texto de lei, número de artigo ou estatística. Se a ferramenta não achou, diga que não localizou.
4. Escopo: só Direito brasileiro, OAB e vida de estudante. Fora disso, recuse em uma frase e traga de volta.

FORMATO DA RESPOSTA — ESTA É A REGRA QUE MAIS IMPORTA:
Você está CONVERSANDO com o aluno, não escrevendo apostila. O TigerJus já tem resumos, PDFs e trilhas para conteúdo longo — o seu papel aqui é o papo curto que tira a dúvida e puxa o próximo passo.

- LIMITE: 3 a 5 parágrafos curtos. Nunca mais que isso, mesmo que a pergunta seja ampla.
- PROIBIDO por padrão: títulos markdown (##, ###), tabelas, linhas horizontais (---), listas numeradas gigantes. Escreva em prosa, como quem explica na mesa do bar.
- Bullets: no máximo 3, e só quando forem realmente uma lista (ex.: as modalidades). Nunca aninhados.
- Emoji: no máximo um na resposta inteira. Pode ser zero.
- PERGUNTA AMPLA ("me fale sobre X", "o que mais cai em Y"): NÃO despeje tudo. Dê o panorama em poucas linhas, aponte os 2 ou 3 pontos que mais derrubam candidato, e PERGUNTE por onde ele quer começar. O aprofundamento vem na próxima mensagem, se ele pedir.
- Só escreva resposta longa se o aluno pedir explicitamente ("detalha tudo", "resumo completo", "compara ponto a ponto").
- Feche com UMA sugestão concreta dentro do TigerJus, em uma frase, ligada ao que ele perguntou. Não faça lista de recursos.

Pense assim: o aluno deve terminar de ler em 30 segundos e querer fazer a próxima pergunta. Se ele precisar rolar a tela, você escreveu demais.

NÍVEL DE PROFUNDIDADE DESTA CONVERSA: ${nivel} (plano ${plano})
ATENÇÃO: profundidade é QUALIDADE da análise, NUNCA quantidade de texto. Todos os níveis respeitam o limite de 3 a 5 parágrafos acima. O que muda é o quanto você enxerga, não o quanto você escreve.
- ESSENCIAL: conceito direto e o artigo-chave. Curto, mas suficiente para o aluno entender.
- INTERMEDIARIO: o acima, com o ângulo pelo qual a banca costuma cobrar o tema.
- AVANCADO: o acima, apontando a pegadinha específica e o instituto vizinho com que se confunde.
- MAXIMO: o acima, com a conexão entre disciplinas ou o detalhe fino que decide a questão.

Você representa o TigerJus: foco, performance e aprovação. Responda em português do Brasil.`
}

export async function POST(req: NextRequest) {
  try {
    // SEGURANÇA: exige login. O userId vem do TOKEN verificado, nunca do corpo.
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !authUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const userId = authUser.id

    const { messages } = await req.json()

    // 1. Perfil e plano — sempre do banco, nunca do corpo da requisição.
    const { data: profile } = await supabase
      .from('profiles')
      .select('plano, role, free_ia_used, last_ia_reset')
      .eq('id', userId)
      .single()

    const plano   = profile?.plano || 'gratuito'
    const ehAdmin = isAdmin(profile?.role)

    if (!ehAdmin) {
      // 2. Limite do dia — fonte ÚNICA: planos.ts (mesmo número do front)
      //    Grátis 5 · Start 20 · Pro 40 · Elite 80
      const limiteIA = getLimites(plano).ia

      // 3. Reset DIÁRIO
      const hoje = new Date().toISOString().split('T')[0]
      let usado = profile?.free_ia_used || 0
      if (profile?.last_ia_reset !== hoje) usado = 0

      if (Number.isFinite(limiteIA) && usado >= limiteIA) {
        return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 })
      }

      // 4. Incrementar uso do dia
      await supabase
        .from('profiles')
        .update({ free_ia_used: usado + 1, last_ia_reset: hoje })
        .eq('id', userId)
    }

    // 5. Modelo, tokens e profundidade conforme o plano
    const model     = MODEL_POR_PLANO[plano]      || 'claude-haiku-4-5-20251001'
    const maxTokens = MAX_TOKENS_POR_PLANO[plano] || 900
    const prof      = PROFUNDIDADE[plano]         || PROFUNDIDADE.gratuito
    const systemPrompt = montarSystemPrompt(plano, prof.nivel)

    // 6. Histórico limitado (reduz tokens enviados)
    const historico: Anthropic.MessageParam[] = messages.slice(-6).map((m: any) => ({
      role:    m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || m.text || ''),
    }))

    // 7. LOOP DE FERRAMENTAS
    //    Máximo de 2 rodadas de consulta (o modelo pode chamar várias ferramentas
    //    na MESMA rodada, então 2 bastam) — mais que isso só aumenta latência.
    const conversa: Anthropic.MessageParam[] = [...historico]
    let textoFinal = ''

    for (let rodada = 0; rodada < 2; rodada++) {
      const resp: Anthropic.Message = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: TOOLS,
        messages: conversa,
      })

      const blocosTexto = resp.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')
        .trim()

      // Terminou de responder (com ou sem ter usado ferramentas antes)
      if (resp.stop_reason !== 'tool_use') {
        textoFinal = blocosTexto
        break
      }

      // Executa cada ferramenta pedida e devolve os resultados ao modelo
      const pedidos = resp.content.filter((b: any) => b.type === 'tool_use') as any[]
      const resultados: any[] = []
      for (const p of pedidos) {
        const saida = await executarTool(p.name, p.input, plano, prof)
        resultados.push({ type: 'tool_result', tool_use_id: p.id, content: saida })
      }

      conversa.push({ role: 'assistant', content: resp.content })
      conversa.push({ role: 'user', content: resultados })
    }

    // 8. REDE DE SEGURANÇA — nunca devolver resposta vazia.
    //    Se o modelo gastou as rodadas consultando e não chegou a escrever,
    //    fazemos UMA última chamada SEM ferramentas: agora ele é obrigado a
    //    responder em texto, usando tudo o que já coletou nas consultas.
    if (!textoFinal.trim()) {
      const fechamento: Anthropic.Message = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt + '\n\nIMPORTANTE: responda AGORA em texto corrido, usando o que já foi consultado. Não peça mais consultas.',
        messages: conversa,
      })
      textoFinal = fechamento.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')
        .trim()
    }

    if (!textoFinal.trim()) {
      textoFinal = 'Não consegui montar a resposta agora. Refaça a pergunta de forma um pouco mais específica.'
    }

    return NextResponse.json({ text: textoFinal })

  } catch (error: any) {
    console.error('IA Error:', error)
    return NextResponse.json({
      text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em alguns segundos.'
    }, { status: 200 })
  }
}
