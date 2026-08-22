'use client'
import { useEffect, useState } from 'react'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getTheme } from '@/lib/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, loaded } = useAppSettings()

  // ── Tema claro por usuário (botão ☀️/🌙 no topo do app) ───────────────────
  // O botão grava 'tj-user-theme' no localStorage e dispara 'tj-theme-toggle'.
  // Este tick força o efeito a re-aplicar o tema na hora, sem recarregar a página.
  const [themeTick, setThemeTick] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onToggle = () => setThemeTick(t => t + 1)
    window.addEventListener('tj-theme-toggle', onToggle)
    return () => window.removeEventListener('tj-theme-toggle', onToggle)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const root = document.documentElement

    // ── 0) Escolha do usuário (opt-in) tem prioridade sobre o tema do admin ──
    const userOverride = (typeof window !== 'undefined')
      ? (window.localStorage.getItem('tj-user-theme') || '').trim()
      : ''
    const claroAtivo = userOverride === 'claro'

    // ── 1) Aplica tokens do tema preset (comportamento atual preservado) ──
    // Se o usuário ativou o Claro, usa 'claro'; senão, usa o tema do admin.
    const themeName = claroAtivo ? 'claro' : (settings.background_style || 'tech')
    const theme = getTheme(themeName)
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // ── 2) Cores-base sincronizadas com o tema (claro vs escuro) ─────────────
    // Deterministas: sempre setadas nos dois modos. No claro, os tokens que
    // eram "cinza-quase-preto" viram superfícies claras, e o dourado escurece
    // o suficiente para ler sobre fundo branco. Isso dá sinergia automática a
    // TODOS os elementos que usam esses tokens (cards, textos, barra de topo).
    const baseGold = settings.primary_color || '#D4A843'
    root.style.setProperty('--gold',       claroAtivo ? '#B8860B' : baseGold)
    root.style.setProperty('--gold-light', claroAtivo ? '#D9A93E' : '#F0C96A')
    if (settings.secondary_color) root.style.setProperty('--orange', settings.secondary_color)

    // Superfícies (usadas como fundo de cards e da barra de topo)
    root.style.setProperty('--gray',       claroAtivo ? '#FFFFFF'          : '#141414')
    root.style.setProperty('--gray-mid',   claroAtivo ? '#F4F3EF'          : '#1E1E1E')
    root.style.setProperty('--gray-light', claroAtivo ? '#EDEBE5'          : '#2A2A2A')
    root.style.setProperty('--black',      claroAtivo ? '#F4F3EF'          : '#0A0A0A')
    root.style.setProperty('--tj-nav-bg',  claroAtivo ? 'rgba(255,255,255,0.9)' : 'rgba(8,8,8,0.95)')
    // --white é a cor de texto creme herdada por vários componentes; no claro
    // vira escuro para não sumir no fundo branco (nunca é usado como fundo).
    root.style.setProperty('--white',      claroAtivo ? '#1C1C1A'          : '#F5F0E8')
    // Campos de formulário (select/input) — fundo escuro no dark, claro no claro
    root.style.setProperty('--field-bg',     claroAtivo ? '#FFFFFF'  : '#1c1c1c')
    root.style.setProperty('--field-fg',     claroAtivo ? '#1C1C1A'  : '#F5F0E8')
    root.style.setProperty('--field-scheme', claroAtivo ? 'light'    : 'dark')
    root.setAttribute('data-user-theme', claroAtivo ? 'claro' : 'escuro')

    // ── 3) Aplica card glow ──
    if (!settings.card_glow_enabled) {
      root.style.setProperty('--tj-glow-strength', '0px')
      root.style.setProperty('--tj-card-glow', 'rgba(0,0,0,0)')
    }

    // ── 4) NOVO: Background customizável ────────────────────────────────────
    // Tipo de fundo escolhido pelo admin: 'preset' | 'color' | 'image' | 'gradient'
    // Quando o usuário ativou o Claro, forçamos 'preset' para o fundo claro
    // realmente aparecer (ignora imagem/cor/gradiente do admin nesse modo).
    const bgType = claroAtivo
      ? 'preset'
      : (settings.background_type || 'preset').toLowerCase().trim()

    // Reset prévio das variáveis de background customizado (evita estado residual)
    root.style.removeProperty('--tj-bg-custom-image')
    root.style.removeProperty('--tj-bg-overlay-opacity')
    root.style.removeProperty('--tj-bg-blur')
    root.style.removeProperty('--tj-bg-position')

    if (bgType === 'color' && settings.background_color) {
      // Cor sólida — sobrescreve --tj-bg
      root.style.setProperty('--tj-bg', settings.background_color)
      root.setAttribute('data-bg-mode', 'color')
    } else if (bgType === 'gradient' && settings.background_gradient) {
      // Gradiente CSS — sobrescreve --tj-bg
      root.style.setProperty('--tj-bg', settings.background_gradient)
      root.setAttribute('data-bg-mode', 'gradient')
    } else if (bgType === 'image' && settings.background_image_url) {
      // Imagem de fundo — usa CSS var nova + overlay
      const safeUrl = String(settings.background_image_url).trim().replace(/"/g, '%22')
      root.style.setProperty('--tj-bg-custom-image', `url("${safeUrl}")`)

      // Overlay 0-100 → 0-1 (clamp + fallback 70)
      const rawOpacity = Number(settings.background_overlay_opacity)
      const opacityPct = Number.isFinite(rawOpacity) ? Math.max(0, Math.min(100, rawOpacity)) : 70
      root.style.setProperty('--tj-bg-overlay-opacity', String(opacityPct / 100))

      // Blur em px (clamp 0-20 para evitar performance ruim)
      const rawBlur = Number(settings.background_blur)
      const blurPx = Number.isFinite(rawBlur) ? Math.max(0, Math.min(20, rawBlur)) : 0
      root.style.setProperty('--tj-bg-blur', `${blurPx}px`)

      // Posição (grid 3×3) — mantém cover; só ancora QUAL parte da imagem aparece
      // Valores válidos: 'center', 'top left', 'bottom right', etc.
      const pos = String(settings.background_position || 'center').trim() || 'center'
      root.style.setProperty('--tj-bg-position', pos)

      // Fundo transparente no modo imagem: deixa a imagem (body::before) aparecer
      // atrás de TODA a plataforma — landing e app logado, em todas as telas.
      root.style.setProperty('--tj-bg', 'transparent')
      // --tj-bg-secondary é usado só nas seções "Plataforma" e "Planos" da landing;
      // transparente aqui faz a imagem cobrir a landing INTEIRA.
      // (getTheme reescreve este token a cada render, restaurando-o fora do modo imagem.)
      root.style.setProperty('--tj-bg-secondary', 'transparent')

      root.setAttribute('data-bg-mode', 'image')
    } else {
      // bgType === 'preset' (ou inválido) → comportamento atual: getTheme cuida do --tj-bg
      root.setAttribute('data-bg-mode', 'preset')
    }
    // ── FIM: Background customizável ────────────────────────────────────────
  }, [
    loaded,
    themeTick,
    settings.background_style,
    settings.primary_color,
    settings.secondary_color,
    settings.card_glow_enabled,
    // ── NOVO: dependências do background customizado ──
    settings.background_type,
    settings.background_color,
    settings.background_image_url,
    settings.background_gradient,
    settings.background_overlay_opacity,
    settings.background_blur,
    settings.background_position,
  ])

  return <>{children}</>
}
