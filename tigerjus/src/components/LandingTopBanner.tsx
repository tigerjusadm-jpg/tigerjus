'use client'

import { useAppSettings } from '@/contexts/AppSettingsContext'

/**
 * Banner do topo da landing page.
 *
 * Lê de app_settings (controlável pelo Admin):
 *  - landing_top_banner_url            → imagem (obrigatória; sem ela o banner não aparece)
 *  - landing_top_banner_link           → link de clique (opcional)
 *  - landing_top_banner_alt            → texto alternativo
 *  - landing_top_banner_height         → altura do banner em px (DESKTOP)
 *  - landing_top_banner_position       → posição vertical da imagem: top | center | bottom
 *  - landing_top_banner_opacity        → opacidade 0–100
 *  - landing_top_banner_fit            → ajuste: cover | contain (DESKTOP)
 *  - landing_top_banner_margin_top     → margem acima em px
 *  - landing_top_banner_margin_bottom  → margem abaixo em px
 *  - landing_top_banner_radius         → cantos arredondados em px
 *  - landing_top_banner_max_width      → largura máxima em px (0 = largura total)
 *
 * DESKTOP: respeita altura/fit/posição definidos no Admin.
 * MOBILE (≤768px): mostra a imagem INTEIRA, altura automática (não corta).
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

  // ── Controles (com defaults seguros) ──
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

  const linkProps = {
    href: link || undefined,
    target: link ? '_blank' : undefined,
    rel: link ? 'noopener noreferrer' : undefined,
  }

  const Wrapper: React.ElementType = link ? 'a' : 'div'

  return (
    <div
      className="tj-top-banner-wrap"
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
        className="tj-top-banner-frame"
        style={{
          width: '100%',
          maxWidth: maxWidth > 0 ? maxWidth : '100%',
          overflow: 'hidden',
          borderRadius: radius,
          lineHeight: 0,
          // variáveis usadas pelo CSS (desktop usa altura/fit; mobile sobrescreve)
          ['--tj-banner-height' as any]: `${height}px`,
          ['--tj-banner-fit' as any]: fit,
          ['--tj-banner-position' as any]: `center ${position}`,
        }}
      >
        <Wrapper {...linkProps} className="tj-top-banner-link" style={{ display: 'block', width: '100%', lineHeight: 0 }}>
          <img
            className="tj-top-banner-img"
            src={url}
            alt={alt}
            loading="eager"
            style={{ opacity }}
          />
        </Wrapper>
      </div>

      <style>{`
        /* DESKTOP — respeita altura e ajuste definidos no Admin */
        .tj-top-banner-frame { height: var(--tj-banner-height, 300px); }
        .tj-top-banner-link  { height: 100%; }
        .tj-top-banner-img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: var(--tj-banner-fit, cover);
          object-position: var(--tj-banner-position, center center);
        }

        /* MOBILE — imagem inteira, altura automática (não corta) */
        @media (max-width: 768px) {
          .tj-top-banner-frame { height: auto !important; }
          .tj-top-banner-link  { height: auto !important; }
          .tj-top-banner-img {
            width: 100% !important;
            height: auto !important;
            object-fit: contain !important;
            object-position: center center !important;
          }
        }
      `}</style>
    </div>
  )
}
