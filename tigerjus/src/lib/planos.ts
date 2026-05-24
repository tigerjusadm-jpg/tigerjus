export type Plano = 'gratuito' | 'entrada' | 'premium' | 'elite'

const PLANO_LEVEL: Record<Plano, number> = {
  gratuito: 0,
  entrada: 1,
  premium: 2,
  elite: 3,
}

export function getPlanoLevel(plano?: string | null): number {
  return PLANO_LEVEL[(plano as Plano)] ?? 0
}

export function canAccess(plano: string | undefined | null, required: Plano): boolean {
  return getPlanoLevel(plano) >= getPlanoLevel(required)
}

export function isAdmin(role?: string | null): boolean {
  return role === 'admin'
}

export function isPago(plano?: string | null): boolean {
  return getPlanoLevel(plano) >= 1
}

export function isPremiumOuSuperior(plano?: string | null): boolean {
  return getPlanoLevel(plano) >= 2
}

export function isElite(plano?: string | null): boolean {
  return getPlanoLevel(plano) >= 3
}

// Limites por plano
export const LIMITES = {
  gratuito: {
    questoes: 15,
    ia: 5,
    simulados: false,
    radar: false,
    pdf: false,
    flashcards: true,
    resumos: true,
  },
  entrada: {
    questoes: 999999,
    ia: 20,
    simulados: true,
    radar: false,
    pdf: true,
    flashcards: true,
    resumos: true,
  },
  premium: {
    questoes: 999999,
    ia: 999999,
    simulados: true,
    radar: true,
    pdf: true,
    flashcards: true,
    resumos: true,
  },
  elite: {
    questoes: 999999,
    ia: 999999,
    simulados: true,
    radar: true,
    pdf: true,
    flashcards: true,
    resumos: true,
  },
}

export function getLimites(plano?: string | null) {
  return LIMITES[(plano as Plano)] ?? LIMITES.gratuito
}

export const PLANOS_DISPLAY = [
  { value: 'gratuito', label: 'Gratuito' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'premium', label: 'Premium' },
  { value: 'elite', label: 'Elite' },
]
