'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppSettings } from '@/contexts/AppSettingsContext'

/**
 * Banner do topo da landing page — agora com carrossel (até 3 slides).
 *
 * Controlável pelo Admin (app_settings):
 *  Slide 1: landing_top_banner_url   / _link   / _alt
 *  Slide 2: landing_top_banner_url_2 / _link_2 / _alt_2
 *  Slide 3: landing_top_banner_url_3 / _link_3 / _alt_3
 *  Intervalo: landing_top_banner_interval (segundos entre trocas)
 *
 *  Estilo (aplicado a todos os slides):
 *  _height, _position, _opacity, _fit, _margin_top, _margin_bottom, _radius, _max_width
 *
 * Comportamento:
 *  - 1 slide preenchido  → banner único (sem troca, sem bolinhas)
 *  - 2+ slides           → carrossel com fade automático + bolinhas + setas
 *  - cada slide pode ter seu próprio link de anunciante
 * DESKTOP: respeita altura/fit/posição. MOBILE (≤768px): imagem inteira, altura automática.
 */
export default function LandingTopBanner() {
  const { settings, loaded } = useAppSettings()
  const [current, setCurrent] = useState(0)

  // ── Monta a lista de slides com URL preenchida ──
  const slides = ([
    { url: settings.landing_top_banner_url,   link: settings.landing_top_banner_link,   alt: settings.landing_top_banner_alt },
    { url: settings.landing_top_banner_url_2, link: settings.landing_top_banner_link_2, alt: settings.landing_top_banner_alt_2 },
    { url: settings.landing_top_banner_url_3, link: settings.landing_top_banner_link_3, alt: settings.landing_top_banner_alt_3 },
  ] as { url: string; link: string; alt: string }[])
    .map(s => ({
      url:  String(s.url  || '').trim(),
      link: String(s.link || '').trim(),
      alt:  String(s.alt  || 'Banner TigerJus').trim(),
    }))
    .filter(s => s.url.length > 0)

  const total = slides.length

  // ── Controles de estilo (defaults seguros) ──
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
  const intervalSec  = Number(settings.landing_top_banner_interval)   || 5

  // ── Troca automática (só quando há 2+ slides) ──
  const next = useCallback(() => {
    setCurrent(c => (c + 1) % total)
  }, [total])

  useEffect(() => {
    if (total < 2) return
    const ms = Math.max(2, intervalSec) * 1000
    const timer = setInterval(next, ms)
    return () => clearInterval(timer)
  }, [total, intervalSec, next, current])

  // Garante que o índice atual nunca passe do total (ex: se um slide for removido)
  useEffect(() => {
    if (current >= total && total > 0) setCurrent(0)
  }, [current, total])

  if (!loaded) return null
  if (total === 0) return null

  return (
    <div
      className="tj-top-banner-wrap"
      style={{
        width: '100%',
        marginTop,
        marginBottom,
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div
        className="tj-top-banner-frame"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: maxWidth > 0 ? maxWidth : '100%',
          overflow: 'hidden',
          borderRadius: radius,
          lineHeight: 0,
          ['--tj-banner-height' as any]: `${height}px`,
          ['--tj-banner-fit' as any]: fit,
          ['--tj-banner-position' as any]: `center ${position}`,
        }}
      >
        {/* Slides empilhados — o ativo fica visível (fade) */}
        {slides.map((slide, i) => {
          const isActive = i === current
          const img = (
            <img
              className="tj-top-banner-img"
              src={slide.url}
              alt={slide.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              style={{ opacity }}
            />
          )
          return (
            <div
              key={i}
              className="tj-top-banner-slide"
              style={{
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 2 : 1,
              }}
            >
              {slide.link ? (
                <a href={slide.link} target="_blank" rel="noopener noreferrer"
                   className="tj-top-banner-link" style={{ display: 'block', width: '100%', height: '100%', lineHeight: 0 }}>
                  {img}
                </a>
              ) : img}
            </div>
          )
        })}

        {/* Espaçador (só mobile via CSS) — dá altura ao frame com base no slide ativo */}
        <img
          className="tj-banner-spacer"
          src={slides[Math.min(current, total - 1)].url}
          alt=""
          aria-hidden="true"
          style={{ display: 'block', width: '100%', height: 'auto', visibility: 'hidden', position: 'relative', zIndex: 0 }}
        />

        {/* Setas + bolinhas — só quando há 2+ slides */}
        {total > 1 && (
          <>
            <button
              aria-label="Anterior"
              onClick={(e) => { e.preventDefault(); setCurrent(c => (c - 1 + total) % total) }}
              className="tj-top-banner-arrow tj-arrow-left"
            >‹</button>
            <button
              aria-label="Próximo"
              onClick={(e) => { e.preventDefault(); setCurrent(c => (c + 1) % total) }}
              className="tj-top-banner-arrow tj-arrow-right"
            >›</button>

            <div className="tj-top-banner-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Ir para slide ${i + 1}`}
                  onClick={(e) => { e.preventDefault(); setCurrent(i) }}
                  className={`tj-dot ${i === current ? 'tj-dot-active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        /* Frame e slides — altura automática (imagem inteira, sem corte), igual em desktop e mobile */
        .tj-top-banner-frame { height: auto; }
        .tj-top-banner-slide {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transition: opacity 0.8s ease-in-out;
        }
        .tj-top-banner-link { height: 100%; }
        .tj-top-banner-img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: contain;
          object-position: var(--tj-banner-position, center center);
        }

        /* Setas */
        .tj-top-banner-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 5;
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: rgba(0,0,0,0.4);
          color: #fff;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          transition: background 0.2s;
        }
        .tj-top-banner-arrow:hover { background: rgba(0,0,0,0.65); }
        .tj-arrow-left  { left: 12px; }
        .tj-arrow-right { right: 12px; }

        /* Bolinhas */
        .tj-top-banner-dots {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 5;
          display: flex;
          gap: 8px;
        }
        .tj-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.5);
          cursor: pointer;
          padding: 0;
          transition: background 0.2s, transform 0.2s;
        }
        .tj-dot-active {
          background: #fff;
          transform: scale(1.25);
        }

        /* MOBILE — apenas setas menores (a imagem inteira já é o padrão acima) */
        @media (max-width: 768px) {
          .tj-top-banner-arrow { width: 30px; height: 30px; font-size: 20px; }
        }
      `}</style>
    </div>
  )
}
