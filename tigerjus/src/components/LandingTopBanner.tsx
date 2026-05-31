'use client'

import { useAppSettings } from '@/contexts/AppSettingsContext'

/**
 * Banner do topo da landing page.
 *
 * Lê de app_settings (controlável pelo Admin):
 *  - landing_top_banner_url            → imagem (obrigatória; sem ela o banner não aparece)
 *  - landing_top_banner_link           → link de clique (opcional)
 *  - landing_top_banner_alt            → texto alternativo
 *  - landing_top_banner_height         → altura do banner em px
 *  - landing_top_banner_position       → posição vertical da imagem: top | center | bottom
 *  - landing_top_banner_opacity        → opacidade 0–100
 *  - landing_top_banner_fit            → ajuste: cover | contain
 *  - landing_top_banner_margin_top     → margem acima em px
 *  - landing_top_banner_margin_bottom  → margem abaixo em px
 *  - landing_top_banner_radius         → cantos arredondados em px
 *  - landing_top_banner_max_width      → largura máxima em px (0 = largura total)
 *
 * Funciona para desktop e mobile. Sem hardcode, sem debug.
 */
export default function LandingTopBanner() {
  const { settings, loaded } = useAppSettings()

  // Aguarda os settings carregarem antes de decidir (evita estado vazio piscando)
  if (!loaded) return null

  const url  = String(settings.landing_top_banner_url  || '').trim()
  const link = String(settings.landing_top_banner_link || '').trim()
  const alt  = String(settings.landing_top_banner_alt  || 'Banner TigerJus').trim()

  // Sem URL configurada no Admin → não mostra banner
  if (!url) return null

  // ── Controles de posicionamento/estilo (com defaults seguros) ──
  const height       = Number(settings.landing_top_banner_height)        || 300
  const positionRaw  = String(settings.landing_top_banner_position || 'center').toLowerCase()
  const position     = ['top', 'center', 'bottom'].includes(positionRaw) ? positionRaw : 'center'
  const opacityNum   = Number(settings.landing_top_banner_opacity)
  const opacity      = Number.isFinite(opacityNum) ? Math.min(100, Math.max(0, opacityNum)) / 100 : 1
  const fitRaw       = String(settings.landing_top_banner_fit || 'cover').toLowerCase()
  const fit          = fitRaw === 'contain' ? 'contain' : 'cover'
  const marginTop    = Number.isFinite(Number(settings.landing_top_banner_margin_top))    ? Number(settings.landing_top_banner_margin_top)    : 60
  const marginBottom = Number.isFinite(Number(settings.landing_top_banner_margin_bottom)) ? Number(settings.landing_top_banner_margin_bottom) : 0
  const radius       = Number(settings.landing_top_banner_radius)    || 0
  const maxWidth     = Number(settings.landing_top_banner_max_width)  || 0

  const img = (
    <img
      src={url}
      alt={alt}
      loading="eager"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: fit as 'cover' | 'contain',
        objectPosition: `center ${position}`,
        opacity,
      }}
    />
  )

  return (
    <div
      style={{
        width: '100%',
        marginTop: marginTop,
        marginBottom: marginBottom,
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: maxWidth > 0 ? maxWidth : '100%',
          height: height,
          overflow: 'hidden',
          borderRadius: radius,
          lineHeight: 0,
        }}
      >
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', width: '100%', height: '100%', lineHeight: 0 }}
          >
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    </div>
  )
}
