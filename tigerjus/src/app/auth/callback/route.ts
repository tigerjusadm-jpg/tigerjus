import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Erro ao trocar código:', error)
      return NextResponse.redirect(new URL('/login?erro=auth', requestUrl.origin))
    }

    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          nome: data.user.user_metadata?.full_name
            || data.user.user_metadata?.name
            || data.user.email?.split('@')[0],
          plano: 'free',
          xp: 0,
          level_name: 'Filhote',
          streak: 0,
          free_questions_used: 0,
          free_ia_used: 0,
          questoes_respondidas: 0,
          questoes_corretas: 0,
        })
      }
    }
  }

  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}
