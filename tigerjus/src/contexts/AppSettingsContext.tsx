'use client'
import {
  createContext, useContext, useEffect, useState,
  useCallback, type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  // Landing Page
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
  // Dashboard
  welcome_message:      string
  dashboard_subtitle:   string
  ia_welcome_message:   string
  upgrade_footer_text:  string
  cta_downgrade_button: string
  // CTAs e Upgrade
  cta_upgrade_title:    string
  cta_upgrade_subtitle: string
  cta_upgrade_button:   string
  // Social e Suporte
  whatsapp_url:         string
  instagram_url:        string
  telegram_url:         string
  email_suporte:        string
  youtube_url:          string
  // Ícones sociais customizados
  instagram_icon_url:   string
  whatsapp_icon_url:    string
  telegram_icon_url:    string
  youtube_icon_url:     string
  // Branding
  site_name:            string
  site_tagline:         string
  logo_url:             string
  // Visual
  primary_color:        string
  secondary_color:      string
  background_color:     string
  // Tema
  background_style:     string
  card_glow_enabled:    boolean
  // Manutenção
  maintenance_mode:     boolean
  maintenance_message:  string
}

// ─── FALLBACKS SEGUROS ────────────────────────────────────────────────────────

const FALLBACKS: AppSettings = {
  // Landing Page
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
  // Dashboard
  welcome_message:      '🔥 Bem-vindo de volta! Continue sua jornada jurídica.',
  dashboard_subtitle:   'Comece seus estudos hoje.',
  ia_welcome_message:   'Olá! Sou o TigerJus AI — seu tutor jurídico de alta performance. 🐯⚖️\n\nPosso te ajudar com dúvidas de Direito, explicar artigos, resumir temas e te preparar para a OAB.\n\nO que você quer aprender hoje?',
  upgrade_footer_text:  'A partir de R$1,99/mês · Cancele quando quiser',
  cta_downgrade_button: 'Continuar no plano gratuito',
  // CTAs e Upgrade
  cta_upgrade_title:    'Desbloqueie o TigerJus Premium',
  cta_upgrade_subtitle: 'Acesse conteúdo ilimitado.',
  cta_upgrade_button:   'DESBLOQUEAR AGORA',
  // Social e Suporte
  whatsapp_url:         '',
  instagram_url:        '',
  telegram_url:         '',
  email_suporte:        '',
  youtube_url:          '',
  // Ícones sociais customizados
  instagram_icon_url:   '',
  whatsapp_icon_url:    '',
  telegram_icon_url:    '',
  youtube_icon_url:     '',
  // Branding
  site_name:            'TigerJus',
  site_tagline:         'Estude como um Tigre.',
  logo_url:             '',
  // Visual
  primary_color:        '#D4A843',
  secondary_color:      '#E8621A',
  background_color:     '#0a0a0a',
  // Tema
  background_style:     'tech',
  card_glow_enabled:    true,
  // Manutenção
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
