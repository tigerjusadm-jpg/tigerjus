import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const PLANOS_VALIDOS = ['gratuito', 'start', 'pro', 'elite']

// Confere que quem chama é admin de verdade (token → role no banco).
async function checarAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return { erro: 'Não autenticado', status: 401 as const }
  const authClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user) return { erro: 'Sessão inválida', status: 401 as const }
  const admin = createClient(URL, SERVICE)
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { erro: 'Acesso negado.', status: 403 as const }
  return { admin, user }
}

// ── PATCH: edita dados do usuário (contato, plano e e-mail/login) ──
export async function PATCH(req: NextRequest) {
  try {
    const ck = await checarAdmin(req)
    if ('erro' in ck) return NextResponse.json({ error: ck.erro }, { status: ck.status })
    const { admin, user: caller } = ck

    const body = await req.json()
    const { id, nome, telefone, email, plano, cidade, uf, faculdade, periodo, bio } = body || {}
    if (!id) return NextResponse.json({ error: 'Informe o usuário.' }, { status: 400 })

    // Alvo precisa existir; e nunca mexemos em outro admin.
    const { data: alvo } = await admin.from('profiles').select('id, role, email').eq('id', id).single()
    if (!alvo) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    if (alvo.role === 'admin' && alvo.id !== caller.id) {
      return NextResponse.json({ error: 'Não é permitido editar outro admin.' }, { status: 403 })
    }

    const updates: Record<string, any> = {}

    if (nome !== undefined) {
      const n = String(nome).trim()
      if (!n) return NextResponse.json({ error: 'Nome não pode ficar vazio.' }, { status: 400 })
      updates.nome = n.slice(0, 80)
    }
    if (telefone !== undefined) {
      const tel = String(telefone || '').replace(/\D/g, '')
      if (tel && (tel.length < 10 || tel.length > 11)) {
        return NextResponse.json({ error: 'WhatsApp inválido. Use DDD + número (10 ou 11 dígitos).' }, { status: 400 })
      }
      updates.telefone = tel || null
    }
    if (plano !== undefined) {
      const p = String(plano).toLowerCase()
      if (!PLANOS_VALIDOS.includes(p)) {
        return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
      }
      updates.plano = p
    }
    if (cidade !== undefined) updates.cidade = String(cidade || '').trim().slice(0, 60) || null
    if (uf !== undefined) updates.uf = String(uf || '').trim().toUpperCase().slice(0, 2) || null
    if (faculdade !== undefined) updates.faculdade = String(faculdade || '').trim().slice(0, 80) || null
    if (periodo !== undefined) updates.periodo = String(periodo || '').trim().slice(0, 20) || null
    if (bio !== undefined) updates.bio = String(bio || '').trim().slice(0, 300) || null

    // E-mail: precisa mudar no Auth (login) E no profiles (exibição).
    let emailNovo: string | null = null
    if (email !== undefined) {
      const e = String(email).trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
      }
      if (e !== String(alvo.email || '').toLowerCase()) emailNovo = e
    }

    if (emailNovo) {
      const { error: authErr } = await admin.auth.admin.updateUserById(id, {
        email: emailNovo,
        email_confirm: true, // já confirma; o admin está corrigindo um cadastro
      })
      if (authErr) {
        return NextResponse.json({ error: `Não foi possível alterar o login: ${authErr.message}` }, { status: 400 })
      }
      updates.email = emailNovo
    }

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await admin.from('profiles').update(updates).eq('id', id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, atualizado: updates, login_alterado: !!emailNovo })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro interno.' }, { status: 500 })
  }
}

// ── DELETE: remove o usuário (perfil + conta de login) ──
export async function DELETE(req: NextRequest) {
  try {
    const ck = await checarAdmin(req)
    if ('erro' in ck) return NextResponse.json({ error: ck.erro }, { status: ck.status })
    const { admin, user: caller } = ck

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Informe o usuário.' }, { status: 400 })
    if (id === caller.id) return NextResponse.json({ error: 'Você não pode excluir a própria conta.' }, { status: 400 })

    const { data: alvo } = await admin.from('profiles').select('id, role').eq('id', id).single()
    if (!alvo) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    if (alvo.role === 'admin') return NextResponse.json({ error: 'Não é permitido excluir um admin.' }, { status: 403 })

    // Apaga a conta de login. O perfil cai junto se houver FK on delete cascade;
    // por garantia, removemos o profile explicitamente depois.
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(id)
    if (delAuthErr && !/not found/i.test(delAuthErr.message)) {
      return NextResponse.json({ error: `Falha ao excluir o login: ${delAuthErr.message}` }, { status: 500 })
    }
    await admin.from('profiles').delete().eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro interno.' }, { status: 500 })
  }
}
