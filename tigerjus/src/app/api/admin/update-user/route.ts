import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const PLANOS = ['gratuito', 'start', 'plus', 'pro', 'elite']
const ROLES = ['user', 'admin']
const RESET_FIELDS = ['free_questions_used', 'free_ia_used', 'streak']

export async function POST(req: NextRequest) {
  try {
    // 1. Identifica quem está chamando, pelo token enviado no header Authorization.
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const authClient = createClient(URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: authErr } = await authClient.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    // 2. Cliente com service role (ignora RLS) — usado pra checar admin e pra gravar.
    const admin = createClient(URL, SERVICE)

    // 3. Confere NO BANCO se quem chamou é admin de verdade (não confia no frontend).
    const { data: caller } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (caller?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado: você não é admin.' }, { status: 403 })
    }

    const body = await req.json()
    const { action, targetId } = body
    if (!targetId) return NextResponse.json({ error: 'Usuário alvo ausente.' }, { status: 400 })

    // ── Alterar plano e/ou role ──
    if (action === 'update') {
      const { plano, role } = body
      if (!PLANOS.includes(plano)) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
      if (!ROLES.includes(role)) return NextResponse.json({ error: 'Role inválido.' }, { status: 400 })

      const { data: before } = await admin
        .from('profiles')
        .select('plano, role')
        .eq('id', targetId)
        .single()

      const { error } = await admin
        .from('profiles')
        .update({ plano, role })
        .eq('id', targetId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Auditoria (também no servidor, pra não esbarrar em RLS). Não bloqueia se falhar.
      await admin.from('admin_audit_logs').insert({
        user_id: user.id,
        action_type: 'UPDATE',
        target_type: 'user',
        target_id: targetId,
        metadata: { campos: { plano: { de: before?.plano, para: plano }, role: { de: before?.role, para: role } } },
      })

      return NextResponse.json({ ok: true })
    }

    // ── Zerar um contador ──
    if (action === 'reset') {
      const { field } = body
      if (!RESET_FIELDS.includes(field)) return NextResponse.json({ error: 'Campo inválido.' }, { status: 400 })

      const { data: before } = await admin
        .from('profiles')
        .select(field)
        .eq('id', targetId)
        .single()

      const { error } = await admin
        .from('profiles')
        .update({ [field]: 0 })
        .eq('id', targetId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await admin.from('admin_audit_logs').insert({
        user_id: user.id,
        action_type: 'RESET',
        target_type: 'user',
        target_id: targetId,
        metadata: { campo: field, valor_anterior: (before as Record<string, unknown> | null)?.[field] },
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (e) {
    console.error('admin/update-user error:', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
