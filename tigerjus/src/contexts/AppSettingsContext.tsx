'use client'
import {
  createContext, useContext, useEffect, useState,
  useCallback, type ReactNode,
} from 'react'
import { supabasePublic } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  hero_badge:           string
  hero_headline:        string
  hero_subtitle:        string
  hero_quote:           string
  hero_cta_primary:     string
  final_cta_title:      string
  final_cta_subtitle:   string
  final_cta_button:     string
  final_cta_footer:     string
  footer_copyright:     string
  welcome_message:      string
  dashboard_subtitle:   string
  ia_welcome_message:   string
  upgrade_footer_text:  string
  cta_downgrade_button: string
  cta_upgrade_title:    string
  cta_upgrade_subtitle: string
  cta_upgrade_button:   string
  whatsapp_url:         string
  instagram_url:        string
  telegram_url:         string
  email_suporte:        string
  youtube_url:          string
  instagram_icon_url:   string
  whatsapp_icon_url:    string
  telegram_icon_url:    string
  youtube_icon_url:     string
  site_name:            string
  site_tagline:         string
  logo_url:             string
  primary_color:        string
  secondary_color:      string
  background_color:     string
  background_style:     string
  card_glow_enabled:    boolean
  hero_media_enabled:   boolean
  hero_media_type:      string
  hero_media_url:       string
  hero_media_position:  string
  hero_media_opacity:   number
  hero_media_animation: string
  hero_media_max_width: number
  hero_media_blur:      number
  landing_top_banner_enabled: boolean
  landing_top_banner_url:     string
  landing_top_banner_alt:     string
  landing_top_banner_link:    string
  maintenance_mode:     boolean
  maintenance_message:  string
}

// ─── FALLBACKS ────────────────────────────────────────────────────────────────

const FALLBACKS: AppSettings = {
  hero_badge:           'Plataforma jurídica de nova geração',
  hero_headline:        'O jeito mais inteligente de evoluir no Direito.',
  hero_subtitle:        'Estude com IA, gamificação e metodologia de alta performance. Aprovação na OAB com método e inteligência.',
  hero_quote:           'Não basta estudar Direito. É preciso pensar como um Tigre.',
  hero_cta_primary:     '🐯 COMEÇAR GRÁTIS',
  final_cta_title:      'Pronto para pensar como um Tigre?',
  final_cta_subtitle:   'Mais de 12.400 estudantes já estão evoluindo. Comece grátis e sinta a diferença.',
  final_cta_button:     'COMEÇAR AGORA',
  final_cta_footer:     'Sem cartão de crédito · Acesso imediato · 3 dias grátis',
  footer_copyright:     '© 2025 TigerJus',
  welcome_message:      '🔥 Bem-vindo de volta! Continue sua jornada jurídica.',
  dashboard_subtitle:   'Comece seus estudos hoje.',
  ia_welcome_message:   'Olá! Sou o TigerJus AI — seu tutor jurídico de alta performance. 🐯⚖️\n\nO que você quer aprender hoje?',
  upgrade_footer_text:  'A partir de R$1,99/mês · Cancele quando quiser',
  cta_downgrade_button: 'Continuar no plano gratuito',
  cta_upgrade_title:    'Desbloqueie o TigerJus Premium',
  cta_upgrade_subtitle: 'Acesse conteúdo ilimitado.',
  cta_upgrade_button:   'DESBLOQUEAR AGORA',
  whatsapp_url:         '',
  instagram_url:        '',
  telegram_url:         '',
  email_suporte:        '',
  youtube_url:          '',
  instagram_icon_url:   '',
  whatsapp_icon_url:    '',
  telegram_icon_url:    '',
  youtube_icon_url:     '',
  site_name:            'TigerJus',
  site_tagline:         'Estude como um Tigre.',
  logo_url:             '',
  primary_color:        '#D4A843',
  secondary_color:      '#E8621A',
  background_color:     '#0a0a0a',
  background_style:     'tech',
  card_glow_enabled:    true,
  hero_media_enabled:   false,
  hero_media_type:      'image',
  hero_media_url:       '',
  hero_media_position:  'right',
  hero_media_opacity:   90,
  hero_media_animation: 'float',
  hero_media_max_width: 650,
  hero_media_blur:      0,
  landing_top_banner_enabled: false,
  landing_top_banner_url:     '',
  landing_top_banner_alt:     '',
  landing_top_banner_link:    '',
  maintenance_mode:     false,
  maintenance_message:  'Voltamos em breve.',
}

// ─── NORMALIZAÇÃO ─────────────────────────────────────────────────────────────

function normalizeBoolean(value: unknown): boolean {
  if (value === true) return true
  if (value === 1) return true
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'yes' || v === 'on'
  }
  return false
}

function normalizeNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : fallback
}

function normalizeText(value: unknown, fallback: string): string {
  const text = String(value ?? '')
  return text || fallback
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

interface SettingsCtx {
  settings: AppSettings
  loaded:   boolean
  refresh:  () => Promise<void>
}

const AppSettingsContext = createContext<SettingsCtx>({
  settings: FALLBACKS,
  loaded:   false,
  refresh:  async () => {},
})

export function useAppSettings() {
  return useContext(AppSettingsContext)
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(FALLBACKS)
  const [loaded, setLoaded]     = useState(false)

  const refresh = useCallback(async () => {
    try {
      // Usa supabasePublic — sem auth, sem persistSession, sem detectSessionInUrl
      // Elimina delay/falha silenciosa no mobile causada pela inicialização do auth
      const { data, error } = await supabasePublic
        .from('app_settings')
        .select('key, value, type')
        .eq('ativo', true)

      if (error) {
        console.error('[AppSettings] erro:', error.message)
        setLoaded(true)
        return
      }

      if (!data || data.length === 0) {
        setLoaded(true)
        return
      }

      const merged = { ...FALLBACKS }

      for (const row of data) {
        const key = row.key as keyof AppSettings
        if (!(key in FALLBACKS)) continue
        const raw = row.value
        const fallbackValue = FALLBACKS[key]
        if (row.type === 'boolean') {
          ;(merged as any)[key] = normalizeBoolean(raw)
        } else if (row.type === 'number') {
          ;(merged as any)[key] = normalizeNumber(raw, Number(fallbackValue))
        } else {
          ;(merged as any)[key] = normalizeText(raw, String(fallbackValue))
        }
      }

      setSettings(merged)
      setLoaded(true)

      if (typeof document !== 'undefined') {
        const root = document.documentElement
        if (merged.primary_color)   root.style.setProperty('--gold',       merged.primary_color)
        if (merged.secondary_color) root.style.setProperty('--orange',     merged.secondary_color)
        if (merged.background_color) root.style.setProperty('--deep-black', merged.background_color)
      }
    } catch (err) {
      console.error('[AppSettings] erro inesperado:', err)
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AppSettingsContext.Provider value={{ settings, loaded, refresh }}>
      {children}
    </AppSettingsContext.Provider>
  )
}
