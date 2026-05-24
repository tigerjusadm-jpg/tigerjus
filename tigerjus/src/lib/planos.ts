import type { SupabaseClient } from '@supabase/supabase-js'

// ═══════════════════════════════════════════════════════════════════
// CAMADA OFICIAL DE PLANOS — TigerJus
// 
// Fonte única da verdade pra:
//   - Nomes e hierarquia de planos
//   - Checagem de features (canAccess) e tier (isAtLeast)
//   - Conversão nivel → nome (getLevelName)
//   - Cálculo de cota diária (dailyQuotaRemaining)
//   - Fetch de plan_settings do banco
//
// Toda regra de plano no app DEVE passar por aqui.
// Nada hardcoded fora deste arquivo.
// ═══════════════════════════════════════════════════════════════════


// ───────────────────────────────────────────────────────────────────
// TIPOS
// ───────────────────────────────────────────────────────────────────
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

export interface Nivel {
  nivel: number       // 1..5
  nome: string        // exibido na UI
  xp_min: number      // XP mínimo pra entrar nesse nível
  xp_max: number | null  // null no topo (sem limite superior)
  icon: string
}


// ───────────────────────────────────────────────────────────────────
// CONSTANTES INTERNAS
// ───────────────────────────────────────────────────────────────────

const PLANO_ALIASES: Record<string, PlanName> = {
  // Legacy → atual (fallback defensivo)
  'free':     'gratuito',
  'start':    'entrada',
  'plus':     'premium',
  'pro':      'premium',
  // Atuais (idempotência)
  'gratuito': 'gratuito',
  'entrada':  'entrada',
  'premium':  'premium',
  'elite':    'elite',
}

const LEVELS: Record<PlanName, number> = {
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
 * Tabela de níveis do TigerJus.
 * Mantida em código (não em banco) por decisão arquitetural: dados puros,
 * raramente mudam, não precisam edição por admin no MVP.
 * Se em algum momento precisar virar tabela `niveis`, este array vira o seed.
 */
export const NIVEIS: readonly Nivel[] = [
  { nivel: 1, nome: 'Filhote',     xp_min: 0,     xp_max: 999,    icon: '🐯' },
  { nivel: 2, nome: 'Aprendiz',    xp_min: 1000,  xp_max: 4999,   icon: '🎯' },
  { nivel: 3, nome: 'Guerreiro',   xp_min: 5000,  xp_max: 14999,  icon: '⚔️' },
  { nivel: 4, nome: 'Mestre',      xp_min: 15000, xp_max: 39999,  icon: '🏆' },
  { nivel: 5, nome: 'Tigre Elite', xp_min: 40000, xp_max: null,   icon: '👑' },
] as const


// ═══════════════════════════════════════════════════════════════════
// PLANOS — NORMALIZAÇÃO E HIERARQUIA
// ═══════════════════════════════════════════════════════════════════

/**
 * Converte valor legacy de plano (free/start/plus/pro) pro nome atual.
 *
 * - Domínio: Planos
 * - Tabela: profiles.plano (apenas lê via parâmetro)
 * - Risco: Zero — função pura, sem side effect
 * - Fallback: 'gratuito' para input null/undefined/inválido
 * - Teste: `normalizePlano('free')` → `'gratuito'` · `normalizePlano(null)` → `'gratuito'`
 */
export function normalizePlano(plano: string | null | undefined): PlanName {
  if (!plano) return 'gratuito'
  return PLANO_ALIASES[plano.toLowerCase().trim()] ?? 'gratuito'
}

/**
 * Nível numérico do plano (gratuito=0, entrada=1, premium=2, elite=3).
 * Útil pra comparações de tier.
 *
 * - Domínio: Planos
 * - Tabela: profiles.plano (apenas via parâmetro)
 * - Risco: Zero — função pura
 * - Fallback: 0 (gratuito) para qualquer input que normalize pra gratuito
 * - Teste: `getPlanoLevel('premium')` → `2`
 */
export function getPlanoLevel(plano: string | null | undefined): number {
  return LEVELS[normalizePlano(plano)]
}

/**
 * Retorna true se o profile está no tier informado ou superior.
 * Admin (role === 'admin') passa em qualquer tier.
 *
 * - Domínio: Planos + Roles
 * - Tabela: profiles (plano, role) — somente leitura
 * - Risco: Zero — função pura
 * - Fallback: false se profile null/undefined
 * - Teste: `isAtLeast({plano:'premium'}, 'entrada')` → `true` · `isAtLeast({role:'admin'}, 'elite')` → `true`
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
// PLANOS — ACESSO A FEATURES
// ═══════════════════════════════════════════════════════════════════

/**
 * Verifica se o profile pode acessar uma feature.
 * Lê de plan_settings, com override de admin.
 *
 * - Domínio: Planos + Features
 * - Tabela: plan_settings (lê via parâmetro)
 * - Risco: Zero — função pura. Fail-closed se settings não carregou.
 * - Fallback: false (deny por padrão). Admin sempre passa.
 * - Teste: `canAccess({plano:'gratuito'}, 'radar', settings)` → `false` quando permite_radar=false no gratuito
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
 * Retorna o objeto PlanSettings do plano do usuário (já normalizado).
 * Útil pra UI acessar limites diretamente sem repetir normalizePlano.
 *
 * - Domínio: Planos
 * - Tabela: plan_settings (lê via parâmetro)
 * - Risco: Zero — função pura
 * - Fallback: null se profile ou settings estiverem ausentes
 * - Teste: `getUserPlanSettings({plano:'gratuito'}, settings)?.mini_simulado_qtd` → `10`
 */
export function getUserPlanSettings(
  profile: ProfileLike | null | undefined,
  settings: PlanSettingsMap | null | undefined
): PlanSettings | null {
  if (!profile || !settings) return null
  return settings[normalizePlano(profile.plano)] ?? null
}


// ═══════════════════════════════════════════════════════════════════
// COTAS — DATAS E LIMITES DIÁRIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Verifica se uma data armazenada é hoje (timezone local).
 *
 * - Domínio: Cotas
 * - Tabela: Nenhuma (recebe via parâmetro)
 * - Risco: Zero — função pura
 * - Fallback: false para input null/undefined/inválido
 * - Teste: `isToday(new Date())` → `true` · `isToday('2020-01-01')` → `false`
 */
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
 * Data de hoje em formato YYYY-MM-DD.
 * Use ao gravar em profiles.last_quiz_reset / last_ia_reset.
 *
 * - Domínio: Cotas
 * - Tabela: profiles.last_quiz_reset, profiles.last_ia_reset (formato de escrita)
 * - Risco: Zero — função pura
 * - Fallback: N/A
 * - Teste: `todayISO()` → `'2026-05-24'` (formato)
 */
export function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Cota diária remanescente pro usuário.
 * - limit === null  → Infinity (plano ilimitado)
 * - lastReset != hoje → cota cheia (reset vai acontecer no próximo write)
 * - lastReset == hoje → limit - used (mínimo zero)
 *
 * - Domínio: Cotas
 * - Tabela: plan_settings.*_limite + profiles.free_*_used + profiles.last_*_reset
 * - Risco: Zero — função pura. Não escreve nada — só lê e calcula.
 * - Fallback: Infinity quando limit é null (intencional: significa ilimitado)
 * - Teste: `dailyQuotaRemaining(15, 5, today)` → `10` · `dailyQuotaRemaining(null, 999, ...)` → `Infinity`
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
// NÍVEIS — Conversão e progressão
// ═══════════════════════════════════════════════════════════════════

/**
 * Converte nivel numérico em nome exibido (Filhote, Aprendiz, ...).
 *
 * - Domínio: Níveis
 * - Tabela: profiles.nivel (apenas via parâmetro)
 * - Risco: Zero — função pura
 * - Fallback: 'Filhote' (nivel 1) para input null/undefined/inválido. 'Tigre Elite' para nivel > 5.
 * - Teste: `getLevelName(1)` → `'Filhote'` · `getLevelName(null)` → `'Filhote'`
 */
export function getLevelName(nivel: number | null | undefined): string {
  if (!nivel || nivel < 1) return NIVEIS[0].nome
  const found = NIVEIS.find(n => n.nivel === nivel)
  return found ? found.nome : NIVEIS[NIVEIS.length - 1].nome
}

/**
 * Retorna o objeto Nivel completo baseado no XP atual do usuário.
 * Útil pra UI de progressão (barra de XP, badge, etc.).
 *
 * - Domínio: Níveis
 * - Tabela: profiles.xp (via parâmetro)
 * - Risco: Zero — função pura
 * - Fallback: Filhote (NIVEIS[0]) se xp inválido ou negativo
 * - Teste: `getNivelByXp(5500).nome` → `'Guerreiro'`
 */
export function getNivelByXp(xp: number): Nivel {
  if (!Number.isFinite(xp) || xp < 0) return NIVEIS[0]
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (xp >= NIVEIS[i].xp_min) return NIVEIS[i]
  }
  return NIVEIS[0]
}

/**
 * Próximo nível na hierarquia. Retorna null se já está no topo.
 *
 * - Domínio: Níveis
 * - Tabela: profiles.xp (via parâmetro)
 * - Risco: Zero — função pura
 * - Fallback: null no nível máximo (esperado, não é erro)
 * - Teste: `getNextNivel(0)?.nome` → `'Aprendiz'` · `getNextNivel(50000)` → `null`
 */
export function getNextNivel(xp: number): Nivel | null {
  const current = getNivelByXp(xp)
  if (current.xp_max === null) return null
  return NIVEIS.find(n => n.nivel === current.nivel + 1) ?? null
}


// ═══════════════════════════════════════════════════════════════════
// FETCHER — Carrega plan_settings do Supabase
// ═══════════════════════════════════════════════════════════════════

/**
 * Busca todos os planos ativos e retorna como mapa indexado por nome.
 *
 * - Domínio: Planos (DB I/O)
 * - Tabela: plan_settings (SELECT)
 * - Risco: Baixo — retorna null em erro. Caller decide fallback.
 *          Sem efeito colateral. Ler de RLS: policy de SELECT TO authenticated existe.
 * - Fallback: null se erro de rede / RLS / banco vazio
 * - Teste: Smoke manual em dev — `console.log(await getPlanSettings(supabase))` deve mostrar os 4 planos
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
