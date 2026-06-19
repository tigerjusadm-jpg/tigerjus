// ═══════════════════════════════════════════════════════════════════
// CAMADA OFICIAL DE PLANOS — TigerJus
// Planos oficiais: gratuito | start | plus | pro | elite
// ═══════════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'

export type Plano = 'gratuito' | 'start' | 'plus' | 'pro' | 'elite'
export type PlanName = Plano

export type PlanFeature =
  | 'pdf'
  | 'simulado_completo'
  | 'filtros_avancados'
  | 'rankings'
  | 'radar'

export interface PlanSettings {
  plano: PlanName
  ativo: boolean
  mini_simulado_qtd: number | null
  flashcards_por_disciplina: number | null
  ia_perguntas_limite: number | null
  quiz_questoes_limite: number | null
  permite_pdf: boolean
  permite_simulado_completo: boolean
  permite_filtros_avancados: boolean
  permite_rankings: boolean
  permite_radar: boolean
  ordem_exibicao: number
  cor_plano: string | null
  cta_texto: string | null
  cta_botao: string | null
}

export type PlanSettingsMap = Record<PlanName, PlanSettings>

export interface ProfileLike {
  plano?: string | null
  role?: string | null
}

export interface Limites {
  questoes: number
  ia: number
  flashcards: number
  mini_simulado: number
  permite_pdf: boolean
  permite_simulado_completo: boolean
  permite_radar: boolean
}

export interface Nivel {
  nivel: number
  nome: string
  xp_min: number
  xp_max: number | null
  icon: string
}

// ───────────────────────────────────────────────────────────────────
// HIERARQUIA DOS 5 PLANOS OFICIAIS
// ───────────────────────────────────────────────────────────────────

const PLANO_LEVEL: Record<Plano, number> = {
  gratuito: 0,
  start:    1,
  plus:     3, // legado — tratado como Pro (migrado no banco; mantido só como apelido seguro)
  pro:      3,
  elite:    4,
}

const FEATURE_TO_COLUMN: Record<PlanFeature, keyof PlanSettings> = {
  pdf:                'permite_pdf',
  simulado_completo:  'permite_simulado_completo',
  filtros_avancados:  'permite_filtros_avancados',
  rankings:           'permite_rankings',
  radar:              'permite_radar',
}

export function normalizePlano(plano: string | null | undefined): Plano {
  if (!plano) return 'gratuito'
  const p = plano.toLowerCase().trim()
  if (p in PLANO_LEVEL) return p as Plano
  return 'gratuito'
}

export function getPlanoLevel(plano: string | null | undefined): number {
  return PLANO_LEVEL[normalizePlano(plano)]
}

export function isAtLeast(
  planoOrProfile: string | null | undefined | ProfileLike,
  tier: Plano
): boolean {
  if (!planoOrProfile) return false
  if (typeof planoOrProfile === 'object') {
    if (planoOrProfile.role === 'admin') return true
    return getPlanoLevel(planoOrProfile.plano) >= PLANO_LEVEL[tier]
  }
  return getPlanoLevel(planoOrProfile) >= PLANO_LEVEL[tier]
}

export function isAdmin(role?: string | null): boolean {
  return role === 'admin'
}

export function isPago(plano?: string | null): boolean {
  return getPlanoLevel(plano) >= 1
}

export function canAccess(
  planoOrProfile: string | null | undefined | ProfileLike,
  tierOrFeature: Plano | PlanFeature,
  settings?: PlanSettingsMap | null
): boolean {
  if (settings !== undefined) {
    const profile = planoOrProfile as ProfileLike | null | undefined
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (!settings) return false
    const userSettings = settings[normalizePlano(profile.plano)]
    if (!userSettings) return false
    return Boolean(userSettings[FEATURE_TO_COLUMN[tierOrFeature as PlanFeature]])
  }
  if (typeof planoOrProfile === 'object' && planoOrProfile !== null) {
    const profile = planoOrProfile as ProfileLike
    if (profile.role === 'admin') return true
    return getPlanoLevel(profile.plano) >= PLANO_LEVEL[tierOrFeature as Plano]
  }
  return getPlanoLevel(planoOrProfile as string) >= PLANO_LEVEL[tierOrFeature as Plano]
}

// ───────────────────────────────────────────────────────────────────
// LIMITES POR PLANO (fallback local)
// Fonte definitiva: tabela plan_settings no banco
// Elite: IA limitada a 500/dia no backend (plan_settings) — não Infinity
// ───────────────────────────────────────────────────────────────────

const LIMITES_FALLBACK: Record<Plano, Limites> = {
  gratuito: {
    questoes: 15,        ia: 5,   flashcards: 0,        mini_simulado: 10,
    permite_pdf: false,  permite_simulado_completo: false, permite_radar: false,
  },
  start: {
    questoes: 50,        ia: 20,  flashcards: 20,       mini_simulado: 20,
    permite_pdf: false,  permite_simulado_completo: true,  permite_radar: false,
  },
  plus: {
    // Legado: espelha o Pro (nenhum usuário ativo neste plano após migração)
    questoes: Infinity,  ia: 40,  flashcards: 40,       mini_simulado: 50,
    permite_pdf: true,   permite_simulado_completo: true,  permite_radar: false,
  },
  pro: {
    questoes: Infinity,  ia: 40,  flashcards: 40,       mini_simulado: 50,
    permite_pdf: true,   permite_simulado_completo: true,  permite_radar: false,
  },
  elite: {
    questoes: Infinity,  ia: 80,  flashcards: Infinity, mini_simulado: 100,
    permite_pdf: true,   permite_simulado_completo: true,  permite_radar: true,
  },
}

export function getLimites(
  plano?: string | null,
  _settings?: PlanSettingsMap | null
): Limites {
  return LIMITES_FALLBACK[normalizePlano(plano)]
}

// ───────────────────────────────────────────────────────────────────
// MODOS DO QUIZ POR PLANO
// Grátis: Fácil · Start: Fácil+Médio · Pro/Elite: todos
// ───────────────────────────────────────────────────────────────────
export type QuizModo = 'Fácil' | 'Médio' | 'Difícil'

export function getQuizModes(
  plano?: string | null,
  role?: string | null
): QuizModo[] {
  if (role === 'admin') return ['Fácil', 'Médio', 'Difícil']
  const p = normalizePlano(plano)
  if (p === 'gratuito') return ['Fácil']
  if (p === 'start') return ['Fácil', 'Médio']
  return ['Fácil', 'Médio', 'Difícil'] // plus/pro/elite
}

// ───────────────────────────────────────────────────────────────────
// PROFUNDIDADE DO RESUMO POR PLANO
// Grátis: nada · Start: curto (prévia) · Pro: completo · Elite: + memorização
// ───────────────────────────────────────────────────────────────────
export type ResumoTier = 'none' | 'curto' | 'completo' | 'memorizacao'

export function getResumoTier(
  plano?: string | null,
  role?: string | null
): ResumoTier {
  if (role === 'admin') return 'memorizacao'
  const p = normalizePlano(plano)
  if (p === 'gratuito') return 'none'
  if (p === 'start') return 'curto'
  if (p === 'elite') return 'memorizacao'
  return 'completo' // plus/pro
}

export function getUserPlanSettings(
  profile: ProfileLike | null | undefined,
  settings: PlanSettingsMap | null | undefined
): PlanSettings | null {
  if (!profile || !settings) return null
  return settings[normalizePlano(profile.plano)] ?? null
}

export const PLANOS_DISPLAY: { value: Plano; label: string }[] = [
  { value: 'gratuito', label: 'Gratuito'      },
  { value: 'start',    label: 'Tiger Start'   },
  { value: 'pro',      label: 'Tiger Pro'     },
  { value: 'elite',    label: 'Tiger Elite'   },
]

// ───────────────────────────────────────────────────────────────────
// NÍVEIS DE GAMIFICAÇÃO — alinhados com a identidade TigerJus
// ───────────────────────────────────────────────────────────────────

export const NIVEIS: readonly Nivel[] = [
  { nivel: 1, nome: 'Filhote',        xp_min: 0,     xp_max: 999,   icon: '🐯' },
  { nivel: 2, nome: 'Caçador',        xp_min: 1000,  xp_max: 4999,  icon: '🎯' },
  { nivel: 3, nome: 'Alpha',          xp_min: 5000,  xp_max: 14999, icon: '⚔️' },
  { nivel: 4, nome: 'Tigre Supremo',  xp_min: 15000, xp_max: 39999, icon: '🏆' },
  { nivel: 5, nome: 'Mestre TigerJus',xp_min: 40000, xp_max: null,  icon: '👑' },
] as const

export function getLevelName(nivel: number | null | undefined): string {
  if (!nivel || nivel < 1) return NIVEIS[0].nome
  const found = NIVEIS.find(n => n.nivel === nivel)
  return found ? found.nome : NIVEIS[NIVEIS.length - 1].nome
}

export function getNivelByXp(xp: number): Nivel {
  if (!Number.isFinite(xp) || xp < 0) return { ...NIVEIS[0] }
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (xp >= NIVEIS[i].xp_min) return { ...NIVEIS[i] }
  }
  return { ...NIVEIS[0] }
}

export function getNextNivel(xp: number): Nivel | null {
  const current = getNivelByXp(xp)
  if (current.xp_max === null) return null
  return NIVEIS.find(n => n.nivel === current.nivel + 1) ?? null
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function isToday(date: string | Date | null | undefined): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return false
  const now = new Date()
  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate()
}

export function dailyQuotaRemaining(
  limit: number | null,
  used: number,
  lastReset: string | Date | null | undefined
): number {
  if (limit === null) return Infinity
  if (!isToday(lastReset)) return limit
  return Math.max(0, limit - used)
}

export async function getPlanSettings(
  supabase: SupabaseClient
): Promise<PlanSettingsMap | null> {
  const { data, error } = await supabase
    .from('plan_settings')
    .select('*')
    .eq('ativo', true)
    .order('ordem_exibicao')
  if (error || !data || data.length === 0) {
    if (error) console.error('[planos] erro ao carregar plan_settings:', error)
    return null
  }
  const map: Partial<PlanSettingsMap> = {}
  for (const row of data as PlanSettings[]) {
    map[row.plano] = row
  }
  return map as PlanSettingsMap
}
