import type { SupabaseClient } from '@supabase/supabase-js'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════
export type PlanName = 'gratuito' | 'entrada' | 'premium' | 'elite'

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

// ═══════════════════════════════════════════════════════════════════
// NORMALIZAÇÃO — defesa em runtime contra valores legacy
// ═══════════════════════════════════════════════════════════════════
const PLANO_ALIASES: Record<string, PlanName> = {
  // Legacy → atual
  'free':     'gratuito',
  'start':    'entrada',
  'plus':     'premium',
  'pro':      'premium',
  // Atuais
  'gratuito': 'gratuito',
  'entrada':  'entrada',
  'premium':  'premium',
  'elite':    'elite',
}

export function normalizePlano(plano: string | null | undefined): PlanName {
  if (!plano) return 'gratuito'
  return PLANO_ALIASES[plano.toLowerCase().trim()] ?? 'gratuito'
}

// ═══════════════════════════════════════════════════════════════════
// HIERARQUIA — comparações por tier (gratuito < entrada < premium < elite)
// ═══════════════════════════════════════════════════════════════════
const LEVELS: Record<PlanName, number> = {
  gratuito: 0,
  entrada:  1,
  premium:  2,
  elite:    3,
}

export function getPlanoLevel(plano: string | null | undefined): number {
  return LEVELS[normalizePlano(plano)]
}

/**
 * Retorna true se o profile está no tier informado ou superior.
 * Admin (role === 'admin') passa em qualquer tier.
 *
 * Ex.: isAtLeast(profile, 'premium') → true para premium, elite ou admin
 */
export function isAtLeast(
  profile: ProfileLike | null | undefined,
  tier: PlanName
): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  return getPlanoLevel(profile.plano) >= LEVELS[tier]
}

// ═══════════════════════════════════════════════════════════════════
// ACESSO A FEATURE — lê de plan_settings, com override de admin
// ═══════════════════════════════════════════════════════════════════
const FEATURE_TO_COLUMN: Record<PlanFeature, keyof PlanSettings> = {
  pdf:                'permite_pdf',
  simulado_completo:  'permite_simulado_completo',
  filtros_avancados:  'permite_filtros_avancados',
  rankings:           'permite_rankings',
  radar:              'permite_radar',
}

/**
 * Retorna true se o usuário pode acessar a feature.
 * - Admin sempre pode.
 * - Usuário comum precisa que plan_settings[plano].permite_X seja true.
 * - Se settings não carregou ainda, retorna false (fail-closed).
 */
export function canAccess(
  profile: ProfileLike | null | undefined,
  feature: PlanFeature,
  settings: PlanSettingsMap | null | undefined
): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  if (!settings) return false
  const userSettings = settings[normalizePlano(profile.plano)]
  if (!userSettings) return false
  return Boolean(userSettings[FEATURE_TO_COLUMN[feature]])
}

/**
 * Pega o objeto de configuração do plano do usuário (já normalizado).
 */
export function getUserPlanSettings(
  profile: ProfileLike | null | undefined,
  settings: PlanSettingsMap | null | undefined
): PlanSettings | null {
  if (!profile || !settings) return null
  return settings[normalizePlano(profile.plano)] ?? null
}

// ═══════════════════════════════════════════════════════════════════
// COTA DIÁRIA — helper sem dependência de cron, baseado em data
// ═══════════════════════════════════════════════════════════════════

/** Verifica se uma data armazenada é hoje (timezone local do servidor/browser). */
export function isToday(date: string | Date | null | undefined): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate()
}

/**
 * Cota diária remanescente.
 * - limit === null → Infinity (ilimitado)
 * - last_reset não é hoje → cota integral (vai resetar no próximo uso)
 * - last_reset é hoje → limite - já_usado (mínimo zero)
 */
export function dailyQuotaRemaining(
  limit: number | null,
  used: number,
  lastReset: string | Date | null | undefined
): number {
  if (limit === null) return Infinity
  if (!isToday(lastReset)) return limit
  return Math.max(0, limit - used)
}

/** Retorna a data atual em formato YYYY-MM-DD (pra gravar em last_quiz_reset/last_ia_reset). */
export function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ═══════════════════════════════════════════════════════════════════
// FETCHER — carrega plan_settings do Supabase
// ═══════════════════════════════════════════════════════════════════

/**
 * Busca todos os planos ativos e retorna como mapa indexado por nome.
 * Retorna null se erro ou se o banco está vazio (caller decide fallback).
 */
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
