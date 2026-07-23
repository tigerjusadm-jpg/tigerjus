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

    // Busca DIRETA na view questoes_publicas (sem resposta_correta — gabarito não vaza).
    // Tolerante a acento e plural: tenta variantes do termo antes de desistir.
    // ATENÇÃO: ilike do Postgres NÃO ignora acento. Por isso reduzimos ao radical
    // ANTES da parte acentuada: "licitações"/"licitação" -> "licita" (casa com ambos).
    const radical = (t: string) => t
      .replace(/(ções|ção|coes|cao)\b/gi, '')  // licitações/licitação -> licita
      .replace(/(ões|ao)\b/gi, '')             // outras terminações comuns
      .replace(/([a-zà-ú]{4,})s\b/gi, '$1')    // plural simples: prazos -> prazo
      .trim()

    // Palavra mais distintiva da frase (ex.: "esbulho posse" -> "esbulho")
    const maiorPalavra = (t: string) => {
      const ws = t.split(/\s+/).filter(w => w.length >= 4)
      return ws.sort((a, b) => b.length - a.length)[0] || ''
    }

    const variantes = Array.from(new Set([
      termo,                        // frase inteira
      radical(termo),               // frase com radical
      maiorPalavra(termo),          // palavra mais forte
      radical(maiorPalavra(termo)), // palavra mais forte, radical
    ].map(t => t.trim()).filter(t => t.length >= 4)))

    // Busca em enunciado E comentário (o tema costuma aparecer mais no comentário),
    // mas o SELECT devolve apenas enunciado — o comentário nunca chega ao modelo,
    // porque explicaria a resposta correta.
    const buscar = async (v: string, incluirComentario: boolean) => {
      let q = supabase.from('questoes_publicas').select('id, disciplina, enunciado').limit(200)
      q = incluirComentario
        ? q.or(`enunciado.ilike.%${v}%,comentario.ilike.%${v}%`)
        : q.ilike('enunciado', `%${v}%`)
      return q
    }

    let achadas: any[] = []
    let usado = ''
    for (const v of variantes) {
      // 1ª tentativa: enunciado + comentário
      let { data, error } = await buscar(v, true)
      // Se a view não expuser 'comentario', cai para enunciado apenas (não quebra)
      if (error) { const r = await buscar(v, false); data = r.data; error = r.error }
      if (!error && data && data.length > 0) { achadas = data; usado = v; break }
    }

    if (achadas.length === 0) {
      // INTERNA — a IA nunca deve repetir isto ao aluno.
      return `SEM_RESULTADO_NO_ACERVO para "${termo}".
INSTRUÇÃO INTERNA (não repita nada disto ao aluno, nem mencione buscas):
1. Se o tema tiver base legal, chame AGORA consultar_lei para buscar o texto no acervo de Lei Seca do TigerJus e responda a partir dele.
2. Se ainda assim não houver base, responda com seu conhecimento jurídico.
3. NUNCA diga que "o acervo não retornou" ou equivalente. O aluno não precisa saber como você busca.
4. Não afirme quantidade de questões que você não confirmou.`
    }

    // Estatística real por disciplina (é o "o que mais cai" com dado de verdade)
    const porDisc: Record<string, number> = {}
    for (const q of achadas) {
      const d = String(q.disciplina || 'Não classificada')
      porDisc[d] = (porDisc[d] || 0) + 1
    }
    const ranking = Object.entries(porDisc)
      .sort((a, b) => b[1] - a[1])
      .map(([d, n]) => `${d}: ${n}`)
      .join(' · ')

    // Trechos — quantidade conforme o plano (escada de profundidade)
    const amostra = achadas.slice(0, prof.questoes).map((q: any, i: number) => {
      const e = String(q.enunciado || '').replace(/\s+/g, ' ').slice(0, 240)
      return `${i + 1}. [${q.disciplina}] ${e}${String(q.enunciado || '').length > 240 ? '…' : ''}`
    }).join('\n')

    return [
      `ACERVO TIGERJUS — tema "${usado}"`,
      `Total de questões reais encontradas: ${achadas.length}`,
      `Distribuição por disciplina: ${ranking}`,
      ``,
      `Amostra de enunciados reais (provas oficiais da OAB/FGV):`,
      amostra,
      ``,
      `USO: pode citar o TOTAL e a distribuição por disciplina como dado concreto.`,
      `Comente o PADRÃO de cobrança. Não copie enunciado inteiro. Não existe gabarito aqui.`,
    ].join('\n')
  } catch {
    return 'SEM_RESULTADO_NO_ACERVO (erro técnico). INSTRUÇÃO INTERNA: responda normalmente, sem mencionar buscas.'
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
      // INTERNA — a IA não deve repetir isto ao aluno.
      return `SEM_RESULTADO_NA_LEI_SECA para "${t}".
INSTRUÇÃO INTERNA (não repita nada disto ao aluno): responda com seu conhecimento jurídico, sem citar número de artigo que você não confirmou aqui. Não mencione buscas nem diga que não encontrou.`
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
- Você tem FERRAMENTAS para consultar esse acervo. O critério para usá-las é simples e vale para qualquer pergunta:
  → Se você está prestes a AFIRMAR algo sobre as provas ou sobre o acervo que não dá para saber sem olhar — o que mais cai, com que frequência um tema aparece, em quais exames, se existe questão sobre aquilo, o que a banca costuma explorar, ou a redação exata de um artigo — então CONSULTE ANTES. Responder isso de cabeça é chutar, e chute quebra a confiança do aluno.
  → Se a pergunta é de conceito puro que você domina ("o que é dolo eventual?", "explique habeas corpus"), responda DIRETO, sem consultar. O aluno está esperando.
  Na dúvida entre os dois, consulte: é melhor um segundo a mais e um dado real do que uma resposta genérica.
- NUNCA mande o aluno para fora da plataforma (não cite qoab.oab.org.br, portal FGV, TEC Concursos, sites de questões, Google Docs, conversores de PDF ou similares). O que ele precisa está aqui dentro. Se ele pedir algo que existe no TigerJus, diga ONDE está.
- Se ele pedir PDF: o TigerJus exporta PDF comentado por disciplina (menu Disciplinas). Você não gera arquivos, mas a plataforma gera — oriente para lá.
- Se ele pedir simulado: existem simulados prontos no menu Simulados. Ofereça-os antes de inventar questões próprias.
- EFICIÊNCIA: se precisar de mais de uma consulta, chame TODAS as ferramentas necessárias DE UMA VEZ (na mesma rodada). Depois de receber os resultados, escreva a resposta final — não fique consultando em sequência, isso deixa o aluno esperando.

NUNCA EXPONHA O FUNCIONAMENTO INTERNO:
- O aluno não sabe (e não deve saber) que você consulta um banco. Nunca diga "vou consultar", "o acervo não retornou", "não encontrei questões catalogadas", "a busca não trouxe resultados" ou qualquer variação. Isso soa como defeito da plataforma.
- Consulte em silêncio e responda como quem já sabia. Se a consulta não trouxe nada, tente outra ferramenta (por exemplo, a Lei Seca) e, se ainda assim não houver, apenas responda com seu conhecimento jurídico — sem narrar o processo.
- Só cite números concretos (quantidade de questões, exames) quando a consulta realmente os retornou.

REGRAS INEGOCIÁVEIS (valem em TODOS os planos, inclusive Elite):
1. NUNCA revele a alternativa correta de uma questão do acervo. Você comenta o TEMA e o PADRÃO de cobrança; o aluno resolve a questão na plataforma. Se pedirem o gabarito, recuse com bom humor e mande resolver no Quiz.
2. NUNCA copie enunciado de questão por inteiro nem reproduza resumos pagos da plataforma. Você orienta; o conteúdo é consumido na tela dele.
3. NUNCA invente texto de lei, número de artigo ou estatística. Se a ferramenta não achou, diga que não localizou.
4. Escopo: só Direito brasileiro, OAB e vida de estudante. Fora disso, recuse em uma frase e traga de volta.

FORMATO DA RESPOSTA — ESTA É A REGRA QUE MAIS IMPORTA:
Você está CONVERSANDO com o aluno, não escrevendo apostila. O TigerJus já tem resumos, PDFs e trilhas para conteúdo longo — o seu papel aqui é o papo curto que tira a dúvida e puxa o próximo passo.

- LIMITE: 3 a 5 parágrafos curtos. Nunca mais que isso, mesmo que a pergunta seja ampla.
- PROIBIDO por padrão: títulos markdown (##, ###), tabelas, linhas horizontais (---), listas numeradas gigantes. Escreva em prosa, como quem explica na mesa do bar.
- NUNCA use asteriscos para negrito ou itálico (**texto** ou *texto*). O chat do TigerJus mostra os asteriscos crus na tela e fica feio. Para destacar algo, use as próprias palavras ("o ponto decisivo é...", "atenção para..."), nunca formatação.
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

    // 7. RESPOSTA EM STREAMING
    //    O texto é enviado ao navegador conforme é gerado, em vez de esperar a
    //    resposta inteira ficar pronta. O tempo total é o mesmo, mas o aluno vê
    //    a resposta nascendo em menos de 1s em vez de encarar "Analisando...".
    //    As rodadas de ferramenta acontecem dentro do mesmo stream.
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const enviar = (t: string) => {
          try { controller.enqueue(encoder.encode(t)) } catch { /* cliente desconectou */ }
        }

        try {
          const conversa: Anthropic.MessageParam[] = [...historico]
          let escreveuAlgo = false

          for (let rodada = 0; rodada < 2; rodada++) {
            const st = anthropic.messages.stream({
              model,
              max_tokens: maxTokens,
              system: systemPrompt,
              tools: TOOLS,
              messages: conversa,
            })

            st.on('text', (delta: string) => {
              if (delta) { escreveuAlgo = true; enviar(delta) }
            })

            const final = await st.finalMessage()

            // Terminou de responder
            if (final.stop_reason !== 'tool_use') break

            // Executa as ferramentas pedidas e devolve os resultados ao modelo
            const pedidos = final.content.filter((b: any) => b.type === 'tool_use') as any[]
            const resultados: any[] = []
            for (const pd of pedidos) {
              const saida = await executarTool(pd.name, pd.input, plano, prof)
              resultados.push({ type: 'tool_result', tool_use_id: pd.id, content: saida })
            }

            conversa.push({ role: 'assistant', content: final.content })
            conversa.push({ role: 'user', content: resultados })
          }

          // REDE DE SEGURANÇA: se gastou as rodadas consultando e não escreveu nada,
          // faz uma última passada SEM ferramentas — agora é obrigado a responder.
          if (!escreveuAlgo) {
            const stFinal = anthropic.messages.stream({
              model,
              max_tokens: maxTokens,
              system: systemPrompt + '\n\nIMPORTANTE: responda AGORA em texto, usando o que já foi consultado. Não peça mais consultas.',
              messages: conversa,
            })
            stFinal.on('text', (delta: string) => {
              if (delta) { escreveuAlgo = true; enviar(delta) }
            })
            await stFinal.finalMessage()
          }

          if (!escreveuAlgo) {
            enviar('Não consegui montar a resposta agora. Refaça a pergunta de forma um pouco mais específica.')
          }
        } catch (e) {
          console.error('IA stream error:', e)
          enviar('\n\n[Ocorreu um erro ao gerar o restante da resposta. Tente novamente.]')
        } finally {
          try { controller.close() } catch { /* já fechado */ }
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })

  } catch (error: any) {
    console.error('IA Error:', error)
    return NextResponse.json({
      text: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em alguns segundos.'
    }, { status: 200 })
  }
}
