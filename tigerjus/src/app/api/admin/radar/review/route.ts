import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return { error: 'Não autenticado', status: 401 as const }
  const authClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user) return { error: 'Sessão inválida', status: 401 as const }
  const admin = createClient(URL, SERVICE)
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { error: 'Acesso negado.', status: 403 as const }
  return { admin, user }
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)
}

async function findOrCreateTema(admin: any, disciplinaId: string, nome: string, temaPaiId: string | null) {
  const nomeLimpo = nome.trim()
  let q = admin.from('radar_oab_temas').select('id').eq('disciplina_id', disciplinaId).ilike('nome', nomeLimpo)
  q = temaPaiId ? q.eq('tema_pai_id', temaPaiId) : q.is('tema_pai_id', null)
  const { data: achados } = await q.limit(1)
  if (achados && achados.length) return achados[0].id
  const { data: novo } = await admin.from('radar_oab_temas')
    .insert({ disciplina_id: disciplinaId, tema_pai_id: temaPaiId, nome: nomeLimpo, slug: slugify(nomeLimpo) })
    .select('id').single()
  return novo?.id || null
}

async function audit(admin: any, userId: string, action: string, targetId: string, meta: any) {
  try {
    await admin.from('admin_audit_logs').insert({
      user_id: userId, action_type: action, target_type: 'radar_oab_classificacoes', target_id: targetId, metadata: meta,
    })
  } catch {}
}

export async function GET(req: NextRequest) {
  const auth = await getAdmin(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'sugerido'
  const disciplinaId = searchParams.get('disciplina_id')
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)

  let qy = admin.from('radar_oab_classificacoes')
    .select('id, questao_id, disciplina_id, tema_id, subtema_id, tema_sugerido, subtema_sugerido, status, confianca')
    .eq('status', status).order('confianca', { ascending: true }).limit(limit)
  if (disciplinaId) qy = qy.eq('disciplina_id', disciplinaId)
  const { data: classifs } = await qy

  const questaoIds = [...new Set((classifs || []).map((c: any) => c.questao_id))]
  const discIds = [...new Set((classifs || []).map((c: any) => c.disciplina_id).filter(Boolean))]
  const { data: questoes } = questaoIds.length
    ? await admin.from('questoes_oab').select('id, enunciado').in('id', questaoIds) : { data: [] as any[] }
  const { data: discs } = discIds.length
    ? await admin.from('disciplinas').select('id, nome').in('id', discIds) : { data: [] as any[] }

  const mapaEnun = new Map((questoes || []).map((q: any) => [q.id, q.enunciado]))
  const mapaDisc = new Map((discs || []).map((d: any) => [d.id, d.nome]))
  const itens = (classifs || []).map((c: any) => ({
    ...c, enunciado: mapaEnun.get(c.questao_id) || '', disciplina_nome: mapaDisc.get(c.disciplina_id) || '',
  }))
  return NextResponse.json({ itens })
}

export async function POST(req: NextRequest) {
  const auth = await getAdmin(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin, user } = auth
  const body = await req.json().catch(() => ({} as any))
  const acao = body?.acao
  const agora = new Date().toISOString()

  try {
    if (acao === 'rejeitar') {
      if (!body?.classificacaoId) return NextResponse.json({ error: 'classificacaoId ausente' }, { status: 400 })
      await admin.from('radar_oab_classificacoes')
        .update({ status: 'rejeitado', revisado_por: user.id, revisado_em: agora, updated_at: agora })
        .eq('id', body.classificacaoId)
      await audit(admin, user.id, 'RADAR_REJEITAR', body.classificacaoId, {})
      return NextResponse.json({ ok: true })
    }

    if (acao === 'aprovar') {
      const { classificacaoId, tema, subtema } = body
      if (!classificacaoId) return NextResponse.json({ error: 'classificacaoId ausente' }, { status: 400 })
      const { data: c } = await admin.from('radar_oab_classificacoes')
        .select('id, disciplina_id, tema_sugerido, subtema_sugerido').eq('id', classificacaoId).single()
      if (!c) return NextResponse.json({ error: 'Classificação não encontrada' }, { status: 404 })
      if (!c.disciplina_id) return NextResponse.json({ error: 'Sem disciplina' }, { status: 400 })

      const nomeTema = (tema ?? c.tema_sugerido ?? '').trim()
      const nomeSub = (subtema ?? c.subtema_sugerido ?? '').trim()
      if (!nomeTema) return NextResponse.json({ error: 'Tema vazio' }, { status: 400 })

      const temaId = await findOrCreateTema(admin, c.disciplina_id, nomeTema, null)
      const subtemaId = nomeSub ? await findOrCreateTema(admin, c.disciplina_id, nomeSub, temaId) : null
      await admin.from('radar_oab_classificacoes').update({
        tema_id: temaId, subtema_id: subtemaId, tema_sugerido: nomeTema, subtema_sugerido: nomeSub || null,
        status: 'revisado', revisado_por: user.id, revisado_em: agora, updated_at: agora,
      }).eq('id', classificacaoId)
      await audit(admin, user.id, 'RADAR_APROVAR', classificacaoId, { tema: nomeTema, subtema: nomeSub || null })
      return NextResponse.json({ ok: true })
    }

    if (acao === 'aprovar_lote') {
      const minConfianca = typeof body?.minConfianca === 'number' ? body.minConfianca : 0.85
      const disciplinaId = body?.disciplinaId || null
      let qy = admin.from('radar_oab_classificacoes')
        .select('id, disciplina_id, tema_sugerido, subtema_sugerido')
        .eq('status', 'sugerido').gte('confianca', minConfianca).limit(500)
      if (disciplinaId) qy = qy.eq('disciplina_id', disciplinaId)
      const { data: lote } = await qy
      let aprovadas = 0
      for (const c of (lote || [])) {
        if (!c.disciplina_id || !c.tema_sugerido) continue
        const temaId = await findOrCreateTema(admin, c.disciplina_id, c.tema_sugerido, null)
        const subtemaId = c.subtema_sugerido ? await findOrCreateTema(admin, c.disciplina_id, c.subtema_sugerido, temaId) : null
        await admin.from('radar_oab_classificacoes').update({
          tema_id: temaId, subtema_id: subtemaId, status: 'revisado',
          revisado_por: user.id, revisado_em: agora, updated_at: agora,
        }).eq('id', c.id)
        aprovadas++
      }
      await audit(admin, user.id, 'RADAR_APROVAR_LOTE', user.id, { aprovadas, minConfianca, disciplinaId })
      return NextResponse.json({ ok: true, aprovadas })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (e: any) {
    console.error('radar/review error:', e)
    return NextResponse.json({ error: e?.message || 'Erro interno.' }, { status: 500 })
  }
}
