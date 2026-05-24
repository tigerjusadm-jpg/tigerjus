import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/plataforma'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options as never)
              })
            } catch {
              // Ignora erro quando cookies não puderem ser setados neste contexto.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Safety net defensivo.
      // Fonte primária do profile = trigger handle_new_user em auth.users (SECURITY DEFINER).
      // Este check só roda INSERT no cenário raro do trigger ter caído na EXCEPTION handler
      // (que loga e segue silenciosamente pra não quebrar o signup).
      // Insert mínimo — defaults do schema cobrem o resto:
      //   plano='gratuito', xp=0, nivel=1, streak=0, role='user',
      //   free_questions_used=0, free_ia_used=0
      if (data?.user) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!existing) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email,
            nome: data.user.user_metadata?.full_name
              || data.user.user_metadata?.name
              || data.user.user_metadata?.nome
              || data.user.email?.split('@')[0],
          })
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
