import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl

  // Rotas públicas
  const publicRoutes = ['/', '/login', '/bem-vindo', '/reset-password', '/api/webhooks']
  const isPublic = publicRoutes.some(r => pathname.startsWith(r))

  // Se não tem sessão e rota é protegida — redireciona para login
  if (!isPublic && !session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Admin e dashboard — deixar a própria página verificar permissões
  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/checkout/:path*',
  ],
}
