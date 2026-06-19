import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Lista TODOS os perfis para o painel admin.
// A RLS bloqueia o SELECT no cliente (admin só enxerga a própria linha),
// então a leitura precisa acontecer aqui no servidor com a service role.
export async function GET(req: NextRequest) {
  try {
    // 1. Identifica quem está chamando pelo token enviado no header.
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const authClient = createClient(URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: authErr } = await authClient.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    // 2. Cliente com service role (ignora RLS).
    const admin = createClient(URL, SERVICE)

    // 3. Confere NO BANCO se quem chamou é admin de verdade.
    const { data: caller } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (caller?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado: você não é admin.' }, { status: 403 })
    }

    // 4. Retorna todos os perfis.
    const { data, error } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, users: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro interno' }, { status: 500 })
  }
}
