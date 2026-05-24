// ═══════════════════════════════════════════════════════════════════
// CAMADA OFICIAL DE PLANOS — TigerJus
//
// Fonte única da verdade para:
//   - Nomes e hierarquia de planos
//   - Checagem de tier (isAtLeast, canAccess, isPago)
//   - Helpers de role (isAdmin)
//   - Limites por plano (getLimites) — fallback local até plan_settings carregar
//   - Conversão nivel → nome (getLevelName)
//   - Cálculo de cota diária (dailyQuotaRemaining)
//   - Fetch de plan_settings do banco (getPlanSettings)
//   - Display de planos para UI (PLANOS_DISPLAY)
//
// Toda regra de plano no app DEVE passar por aqui.
// ═══════════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'


// ───────────────────────────────────────────────────────────────────
// TIPOS PÚBLICOS
// ───────────────────────────────────────────────────────────────────

/** Planos oficiais. Nunca usar free/start/plus/pro no código. */
export type Plano = 'gratuito' | 'entrada' | 'premium' | 'elite'

/** Alias para compatibilidade com arquitetura futura */
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

/** Limites consumidos diretamente pelo TigerJusApp */
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
// CONSTANTES INTERNAS
// ───────────────────────────────────────────────────────────────────

const PLANO_ALIASES: Record<string, Plano> = {
  free:     'gratuito',
  gratuito: 'gratuito',
  start:    'entrada',
  entrada:  'entrada',
  plus:     'premium',
  pro:      'premium',
  premium:  'premium',
  elite:    'elite',
}

const PLANO_LEVEL: Record<Plano, number> = {
  gratuito: 0,
  entrada:  1,
  premium:  2,
  elite:    3,
}

const FEATURE_TO_COLUMN: Record<PlanFeature, keyof PlanSettings> = {
  pdf:                'permite_pdf',
  simulado_completo:  'permite_simulado_completo',
  filtros_avancados:  'permite_filtros_avancados',
  rankings:           'permite_rankings',
  radar:              'permite_radar',
}

/**
 * Limites estáticos de fallback.
 * Usados enquanto plan_settings do banco não foi carregado.
 * Infinity representa ilimitado no código TypeScript.
 */
const LIMITES_FALLBACK: Record<Plano, Limites> = {
  gratuito: {
    questoes: 15, ia: 5, flashcards: 5, mini_simulado: 10,
    permite_pdf: false, permite_simulado_completo: false, permite_radar: false,
  },
  entrada: {
    questoes: Infinity, ia: 20, flashcards: 15, mini_simulado: 20,
    permite_pdf: false, permite_simulado_completo: true, permite_radar: false,
  },
  premium: {
    questoes: Infinity, ia: 100, flashcards: 30, mini_simulado: 30,
    permite_pdf: true, permite_simulado_completo: true, permite_radar: true,
  },
  elite: {
    questoes: Infinity, ia: Infinity, flashcards: Infinity, mini_simulado: Infinity,
    permite_pdf: true, permite_simulado_completo: true, permite_radar: true,
  },
}

export const NIVEIS: readonly Nivel[] = [
  { nivel: 1, nome: 'Filhote',     xp_min: 0,     xp_max: 999,   icon: '🐯' },
  { nivel: 2, nome: 'Aprendiz',    xp_min: 1000,  xp_max: 4999,  icon: '🎯' },
  { nivel: 3, nome: 'Guerreiro',   xp_min: 5000,  xp_max: 14999, icon: '⚔️' },
  { nivel: 4, nome: 'Mestre',      xp_min: 15000, xp_max: 39999, icon: '🏆' },
  { nivel: 5, nome: 'Tigre Elite', xp_min: 40000, xp_max: null,  icon: '👑' },
] as const


// ═══════════════════════════════════════════════════════════════════
// NORMALIZAÇÃO E HIERARQUIA
// ═══════════════════════════════════════════════════════════════════

/**
 * Converte valor legacy (free/start/plus/pro) para o plano oficial.
 * Fallback: 'gratuito' para qualquer input inválido ou nulo.
 */
export function normalizePlano(plano: string | null | undefined): Plano {
  if (!plano) return 'gratuito'
  return PLANO_ALIASES[plano.toLowerCase().trim()] ?? 'gratuito'
}

/**
 * Nível numérico do plano (gratuito=0 … elite=3).
 * Aceita string bruta — normaliza internamente.
 */
export function getPlanoLevel(plano: string | null | undefined): number {
  return PLANO_LEVEL[normalizePlano(plano)]
}

/**
 * Retorna true se o plano está no tier informado ou superior.
 * Aceita string bruta ou ProfileLike.
 * Quando recebe ProfileLike, admin sempre passa.
 */
export function isAtLeast(
  planoOrProfile: string | null | undefined | ProfileLike,
  tier: Plano
): boolean {
  if (!planoOrProfile) return false
  // ProfileLike
  if (typeof planoOrProfile === 'object') {
    if (planoOrProfile.role === 'admin') return true
    return getPlanoLevel(planoOrProfile.plano) >= PLANO_LEVEL[tier]
  }
  // string
  return getPlanoLevel(planoOrProfile) >= PLANO_LEVEL[tier]
}


// ═══════════════════════════════════════════════════════════════════
// HELPERS USADOS PELO TigerJusApp E ADMIN
// ═══════════════════════════════════════════════════════════════════

/**
 * isAdmin — verifica se o role é 'admin'.
 * Usado em TigerJusApp: `isAdmin(profile?.role)`
 */
export function isAdmin(role?: string | null): boolean {
  return role === 'admin'
}

/**
 * isPago — qualquer plano acima de gratuito.
 * Usado em TigerJusApp: `isPago(plano)`
 */
export function isPago(plano?: string | null): boolean {
  return getPlanoLevel(plano) >= 1
}

/**
 * canAccess — verifica acesso a um recurso.
 *
 * COMPATIBILIDADE DUPLA:
 *
 * Assinatura legada (TigerJusApp atual):
 *   canAccess(plano: string, tier: Plano) → boolean
 *   Exemplo: canAccess(profile.plano, 'premium')
 *
 * Assinatura nova (arquitetura futura com plan_settings):
 *   canAccess(profile: ProfileLike, feature: PlanFeature, settings: PlanSettingsMap) → boolean
 *   Exemplo: canAccess({plano, role}, 'radar', settingsMap)
 *
 * A distinção é feita pelo tipo do segundo argumento:
 *   - Se string curta conhecida como Plano → assinatura legada (tier check)
 *   - Se string de feature (pdf/radar/…) com 3 args → assinatura nova
 */
export function canAccess(
  planoOrProfile: string | null | undefined | ProfileLike,
  tierOrFeature: Plano | PlanFeature,
  settings?: PlanSettingsMap | null
): boolean {
  // Assinatura nova: 3 argumentos com settings
  if (settings !== undefined) {
    const profile = planoOrProfile as ProfileLike | null | undefined
    const feature = tierOrFeature as PlanFeature
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (!settings) return false
    const userSettings = settings[normalizePlano(profile.plano)]
    if (!userSettings) return false
    return Boolean(userSettings[FEATURE_TO_COLUMN[feature]])
  }

  // Assinatura legada: 2 argumentos (plano string, tier Plano)
  if (typeof planoOrProfile === 'object' && planoOrProfile !== null) {
    // ProfileLike passado com tier
    const profile = planoOrProfile as ProfileLike
    if (profile.role === 'admin') return true
    return getPlanoLevel(profile.plano) >= PLANO_LEVEL[tierOrFeature as Plano]
  }
  // string plano passado com tier
  return getPlanoLevel(planoOrProfile as string) >= PLANO_LEVEL[tierOrFeature as Plano]
}

/**
 * getLimites — retorna limites do plano para uso no TigerJusApp.
 * Usa fallback local (LIMITES_FALLBACK).
 * Futuramente pode receber PlanSettingsMap para usar valores do banco.
 *
 * Usado em TigerJusApp:
 *   const l = getLimites(data.plano)
 *   setFreeQ(Math.max(0, l.questoes - used))
 *   setFreeIA(Math.max(0, l.ia - used))
 */
export function getLimites(
  plano?: string | null,
  _settings?: PlanSettingsMap | null  // reservado para futura integração com banco
): Limites {
  return LIMITES_FALLBACK[normalizePlano(plano)]
}

/**
 * getUserPlanSettings — retorna o PlanSettings do usuário a partir do mapa.
 * Retorna null se profile ou settings estiverem ausentes.
 */
export function getUserPlanSettings(
  profile: ProfileLike | null | undefined,
  settings: PlanSettingsMap | null | undefined
): PlanSettings | null {
  if (!profile || !settings) return null
  return settings[normalizePlano(profile.plano)] ?? null
}


// ═══════════════════════════════════════════════════════════════════
// DISPLAY — UI e selects
// ═══════════════════════════════════════════════════════════════════

/**
 * Usado em admin/page.tsx e TigerJusApp para selects e labels.
 * Mantém a ordem correta: gratuito → entrada → premium → elite
 */
export const PLANOS_DISPLAY: { value: Plano; label: string }[] = [
  { value: 'gratuito', label: 'Gratuito' },
  { value: 'entrada',  label: 'Entrada'  },
  { value: 'premium',  label: 'Premium'  },
  { value: 'elite',    label: 'Elite'    },
]


// ═══════════════════════════════════════════════════════════════════
// NÍVEIS — Conversão e progressão
// ═══════════════════════════════════════════════════════════════════

/**
 * Converte nivel numérico em nome exibido.
 * Usado no frontend: getLevelName(profile.nivel)
 * Fallback: 'Filhote' para null/undefined/inválido.
 */
export function getLevelName(nivel: number | null | undefined): string {
  if (!nivel || nivel < 1) return NIVEIS[0].nome
  const found = NIVEIS.find(n => n.nivel === nivel)
  return found ? found.nome : NIVEIS[NIVEIS.length - 1].nome
}

/**
 * Retorna o objeto Nivel completo baseado no XP atual.
 * Útil para barra de progressão e badge.
 */
export function getNivelByXp(xp: number): Nivel {
  if (!Number.isFinite(xp) || xp < 0) return NIVEIS[0]
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (xp >= NIVEIS[i].xp_min) return NIVEIS[i]
  }
  return NIVEIS[0]
}

/**
 * Próximo nível na hierarquia. null se já está no topo.
 */
export function getNextNivel(xp: number): Nivel | null {
  const current = getNivelByXp(xp)
  if (current.xp_max === null) return null
  return NIVEIS.find(n => n.nivel === current.nivel + 1) ?? null
}


// ═══════════════════════════════════════════════════════════════════
// COTAS DIÁRIAS
// ═══════════════════════════════════════════════════════════════════

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
 * - limit === null → Infinity (plano ilimitado)
 * - lastReset != hoje → cota cheia
 * - lastReset == hoje → limit - used (mínimo zero)
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


// ═══════════════════════════════════════════════════════════════════
// FETCHER — Carrega plan_settings do Supabase
// ═══════════════════════════════════════════════════════════════════

/**
 * Busca plan_settings ativos e retorna como mapa indexado por plano.
 * Retorna null em caso de erro — caller decide fallback.
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
