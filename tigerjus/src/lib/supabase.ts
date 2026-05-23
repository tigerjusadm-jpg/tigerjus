import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

export const supabaseAdmin = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

export function getLevelInfo(xp: number) {
  if (xp < 1000) return { level: 1, name: 'Filhote', next: 1000, emoji: '🐱' }
  if (xp < 5000) return { level: 2, name: 'Caçador', next: 5000, emoji: '🎯' }
  if (xp < 15000) return { level: 3, name: 'Alpha', next: 15000, emoji: '⚡' }
  if (xp < 40000) return { level: 4, name: 'Tigre Supremo', next: 40000, emoji: '🦁' }
  return { level: 5, name: 'Mestre TigerJus', next: 999999, emoji: '👑' }
}

export function getPlanLimits(plan: string) {
  const limits: Record<string, any> = {
    free: { questions: 15, ia: 5, simulados: 1, hasRanking: false, hasRadar: false },
    start: { questions: Infinity, ia: 50, simulados: 10, hasRanking: true, hasRadar: false },
    plus: { questions: Infinity, ia: 200, simulados: Infinity, hasRanking: true, hasRadar: false },
    pro: { questions: Infinity, ia: Infinity, simulados: Infinity, hasRanking: true, hasRadar: true },
    elite: { questions: Infinity, ia: Infinity, simulados: Infinity, hasRanking: true, hasRadar: true },
  }
  return limits[plan] || limits.free
}
