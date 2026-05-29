'use client'
import { useEffect } from 'react'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getTheme } from '@/lib/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, loaded } = useAppSettings()

  useEffect(() => {
    if (!loaded) return

    const root = document.documentElement
    const theme = getTheme(settings.background_style || 'tech')

    // Aplica tokens do tema
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Aplica cores dinâmicas do admin (sobrescrevem o padrão do tema)
    if (settings.primary_color)   root.style.setProperty('--gold',       settings.primary_color)
    if (settings.secondary_color) root.style.setProperty('--orange',     settings.secondary_color)

    // Aplica card glow — se desativado, força 0
    if (!settings.card_glow_enabled) {
      root.style.setProperty('--tj-glow-strength', '0px')
      root.style.setProperty('--tj-card-glow', 'rgba(0,0,0,0)')
    }

  }, [
    loaded,
    settings.background_style,
    settings.primary_color,
    settings.secondary_color,
    settings.card_glow_enabled,
  ])

  return <>{children}</>
}
