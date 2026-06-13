import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODELO = 'claude-sonnet-4-6'

const SYSTEM = `Você é um classificador de questões da 1ª fase do Exame da OAB.
Dada a DISCIPLINA e o ENUNCIADO de uma questão, identifique:
- "tema": o assunto central da questão (ex.: "Licitações e Contratos", "Poder de Polícia", "Controle de Constitucionalidade").
- "subtema": o recorte específico dentro do tema (ex.: "Modalidades de licitação", "Atributos do ato administrativo"). Se não houver recorte claro, repita o tema.
- "confianca": número de 0 a 1 indicando sua certeza.
Use a taxonomia jurídica padrão da OAB. Seja consistente: o mesmo assunto deve receber sempre o mesmo nome de tema.
Responda APENAS com um JSON válido, sem markdown, sem texto extra, no formato exato:
{"tema":"...","subtema":"...","confianca":0.0}`

function parseJSON(text: string): { tema?: string; subtema?: string; confianca?: number } | null {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  try { return JSON.parse(clean) } catch {
    const m = clean.match(/\{[\s\S]*\}/)
    if (m) { try { return JSON.parse(m[0]) } catch { return null } }
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const authClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: { user }, error: authErr } = await authClient.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const admin = createClient(URL, SERVICE)
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const body = await req.json().catch(() => ({} as any))
    const limit = Math.min(Math.max(Number(body?.limit) || 8, 1), 40)
    const reprocessar = body?.reprocessar === true

    const { data: mapa } = await admin.from('radar_oab_disciplina_map').select('rotulo, disciplina_id')
    const { data: discs } = await admin.from('disciplinas').select('id, nome')
    const mapaRotulo = new Map((mapa || []).map((m: any) => [m.rotulo, m.disciplina_id]))
    const nomeDisc = new Map((discs || []).map((d: any) => [d.id, d.nome]))

    const { data: jaClass } = await admin.from('radar_oab_classificacoes').select('questao_id, status')
    const protegidas = new Set(
      (jaClass || [])
        .filter((c: any) => (reprocessar ? c.status === 'revisado' : true))
        .map((c: any) => c.questao_id)
    )

    const { data: questoes } = await admin
      .from('questoes_oab')
      .select('id, enunciado, disciplina')
      .order('created_at', { ascending: true })
      .limit(500)

    const candidatas = (questoes || []).filter((q: any) => !protegidas.has(q.id)).slice(0, limit)

    let classificadas = 0
    const erros: string[] = []

    for (const q of candidatas) {
      const disciplinaId = mapaRotulo.get(q.disciplina) || null
      const disciplinaNome = disciplinaId ? (nomeDisc.get(disciplinaId) || q.disciplina) : q.disciplina
      try {
        const resp = await anthropic.messages.create({
          model: MODELO,
          max_tokens: 300,
          system: SYSTEM,
          messages: [{ role: 'user', content: `Disciplina: ${disciplinaNome}\n\nEnunciado: ${q.enunciado}` }],
        })
        const txt = resp.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
        const parsed = parseJSON(txt)
        if (!parsed?.tema) { erros.push(`Q ${q.id}: resposta sem tema`); continue }

        const registro = {
          questao_id: q.id,
          disciplina_id: disciplinaId,
          tema_sugerido: String(parsed.tema).slice(0, 200),
          subtema_sugerido: parsed.subtema ? String(parsed.subtema).slice(0, 200) : null,
          status: 'sugerido',
          confianca: typeof parsed.confianca === 'number' ? parsed.confianca : null,
          modelo: MODELO,
          updated_at: new Date().toISOString(),
        }

        const { data: existente } = await admin
          .from('radar_oab_classificacoes')
          .select('id, status')
          .eq('questao_id', q.id)
          .maybeSingle()

        if (existente) {
          if (existente.status === 'revisado') continue
          await admin.from('radar_oab_classificacoes').update(registro).eq('id', existente.id)
        } else {
          await admin.from('radar_oab_classificacoes').insert(registro)
        }
        classificadas++
      } catch (e: any) {
        erros.push(`Q ${q.id}: ${e?.message || 'erro'}`)
      }
    }

    const { count: totalClass } = await admin
      .from('radar_oab_classificacoes').select('*', { count: 'exact', head: true })
    const { count: totalQuestoes } = await admin
      .from('questoes_oab').select('*', { count: 'exact', head: true })

    try {
      await admin.from('admin_audit_logs').insert({
        user_id: user.id,
        action_type: 'RADAR_CLASSIFY',
        target_type: 'radar_oab_classificacoes',
        target_id: user.id,
        metadata: { classificadas, erros: erros.length, limit, reprocessar },
      })
    } catch {}

    return NextResponse.json({
      classificadas,
      erros,
      total_classificadas: totalClass ?? 0,
      total_questoes: totalQuestoes ?? 0,
      restantes: Math.max((totalQuestoes ?? 0) - (totalClass ?? 0), 0),
    })
  } catch (e: any) {
    console.error('radar/classify error:', e)
    return NextResponse.json({ error: e?.message || 'Erro interno.' }, { status: 500 })
  }
}
