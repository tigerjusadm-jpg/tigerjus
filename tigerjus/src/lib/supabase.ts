import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client principal — com auth completo para área logada.
//
// No NAVEGADOR usamos createBrowserClient (@supabase/ssr), que grava a sessão
// e o code_verifier do PKCE em COOKIES. Isso é obrigatório: o /auth/callback e o
// middleware.ts rodam no servidor com createServerClient e só enxergam cookies.
// Com o createClient antigo (localStorage) o code_verifier ficava preso no
// navegador, o exchangeCodeForSession falhava e o middleware nunca via sessão.
//
// No SERVIDOR este módulo também é importado (supabaseAdmin, rotas de API).
// createBrowserClient depende de document.cookie, então a guarda
// typeof window === 'undefined' devolve um client sem persistência —
// suficiente para leitura e para não quebrar o import no build/SSR.
export const supabase: SupabaseClient =
  typeof window === 'undefined'
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : createBrowserClient(supabaseUrl, supabaseAnonKey)

// Client público — sem auth, para leitura de dados públicos (app_settings, landing)
// Evita delay/falha silenciosa no mobile causada pela inicialização do auth.
//
// storageKey próprio é obrigatório: sem ele este client herda a chave padrão
// sb-<ref>-auth-token, a mesma do client principal, e o Supabase emite o aviso
// "Multiple GoTrueClient instances detected ... under the same storage key".
// Com chave separada as duas instâncias deixam de disputar o mesmo espaço.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'tj-public-noauth',
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  }
})

export const supabaseAdmin = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
