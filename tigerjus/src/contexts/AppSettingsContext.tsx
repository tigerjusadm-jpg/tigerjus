'use client'
import {
  createContext, useContext, useEffect, useState,
  useCallback, type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  // Branding
  site_name:            string
  site_tagline:         string
  logo_url:             string
  // Visual
  primary_color:        string
  secondary_color:      string
  background_color:     string
  // Suporte e Social
  whatsapp_url:         string
  instagram_url:        string
  telegram_url:         string
  email_suporte:        string
  youtube_url:          string
  // Textos e CTAs
  welcome_message:      string
  cta_upgrade_title:    string
  cta_upgrade_subtitle: string
  cta_upgrade_button:   string
  // Manutenção
  maintenance_mode:     boolean
  maintenance_message:  string
}

// ─── FALLBACKS SEGUROS ────────────────────────────────────────────────────────

const FALLBACKS: AppSettings = {
  site_name:            'TigerJus',
  site_tagline:         'Estude como um Tigre.',
  logo_url:             '',
  primary_color:        '#D4A843',
  secondary_color:      '#E8621A',
  background_color:     '#0a0a0a',
  whatsapp_url:         '',
  instagram_url:        '',
  telegram_url:         '',
  email_suporte:        '',
  youtube_url:          '',
  welcome_message:      '🔥 Bem-vindo de volta! Continue sua jornada jurídica.',
  cta_upgrade_title:    'Desbloqueie o TigerJus Premium',
  cta_upgrade_subtitle: 'Acesse conteúdo ilimitado.',
  cta_upgrade_button:   'DESBLOQUEAR AGORA',
  maintenance_mode:     false,
  maintenance_message:  'Voltamos em breve.',
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

interface SettingsCtx {
  settings:  AppSettings
  loaded:    boolean
  refresh:   () => Promise<void>
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
    const { data } = await supabase
      .from('app_settings')
      .select('key, value, type')
      .eq('ativo', true)

    if (!data) return

    const merged = { ...FALLBACKS }
    for (const row of data) {
      const key = row.key as keyof AppSettings
      if (!(key in FALLBACKS)) continue

      const raw = row.value ?? ''
      if (row.type === 'boolean') {
        (merged as any)[key] = raw === 'true'
      } else {
        (merged as any)[key] = raw || (FALLBACKS as any)[key]
      }
    }

    setSettings(merged)
    setLoaded(true)

    // Aplica CSS variables na raiz — efeito imediato na plataforma
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      if (merged.primary_color)    root.style.setProperty('--gold',        merged.primary_color)
      if (merged.secondary_color)  root.style.setProperty('--orange',      merged.secondary_color)
      if (merged.background_color) root.style.setProperty('--deep-black',  merged.background_color)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <AppSettingsContext.Provider value={{ settings, loaded, refresh }}>
      {children}
    </AppSettingsContext.Provider>
  )
}
