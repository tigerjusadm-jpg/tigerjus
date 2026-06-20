import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const STATUS_VALIDOS = ['pendente', 'aprovado', 'rejeitado']

// Confere o token e devolve um client service-role se quem chamou for admin.
async function autorizar(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return { erro: 'Não autenticado', status: 401 as const }

  const authClient = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user) return { erro: 'Sessão inválida', status: 401 as const }

  const admin = createClient(URL, SERVICE)
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { erro: 'Acesso negado: você não é admin.', status: 403 as const }

  return { admin }
}

export async function GET(req: NextRequest) {
  try {
    const a = await autorizar(req)
    if ('erro' in a) return NextResponse.json({ error: a.erro }, { status: a.status })
    const { data, error } = await a.admin
      .from('depoimentos').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ depoimentos: data || [] })
  } catch (e) {
    console.error('admin/depoimentos GET:', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const a = await autorizar(req)
    if ('erro' in a) return NextResponse.json({ error: a.erro }, { status: a.status })
    const body = await req.json()
    const { action } = body

    // Aprovar / rejeitar / voltar a pendente
    if (action === 'status') {
      const { id, status } = body
      if (!id || !STATUS_VALIDOS.includes(status)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
      const { error } = await a.admin.from('depoimentos')
        .update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // Adicionar manualmente (já entra aprovado por padrão)
    if (action === 'add') {
      const { nome, papel, texto, status } = body
      if (!nome?.trim() || !texto?.trim()) return NextResponse.json({ error: 'Nome e texto são obrigatórios.' }, { status: 400 })
      const { error } = await a.admin.from('depoimentos').insert({
        nome: String(nome).trim(),
        papel: String(papel || 'Estudante TigerJus').trim(),
        texto: String(texto).trim(),
        status: STATUS_VALIDOS.includes(status) ? status : 'aprovado',
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // Excluir
    if (action === 'delete') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'ID ausente.' }, { status: 400 })
      const { error } = await a.admin.from('depoimentos').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (e) {
    console.error('admin/depoimentos POST:', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
