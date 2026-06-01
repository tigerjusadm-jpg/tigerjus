'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppSettings } from '@/contexts/AppSettingsContext'

/**
 * Banner do topo do Dashboard (área logada) — carrossel de até 3 slides.
 * Independente do banner da landing. Controlável pelo Admin via app_settings:
 *
 *  Slide 1: dashboard_banner_url   / _link   / _alt
 *  Slide 2: dashboard_banner_url_2 / _link_2 / _alt_2
 *  Slide 3: dashboard_banner_url_3 / _link_3 / _alt_3
 *  Intervalo: dashboard_banner_interval (segundos)
 *  Estilo: _height, _position, _opacity, _fit, _radius, _max_width
 *
 *  - 0 slides preenchidos → não renderiza nada
 *  - 1 slide  → banner único
 *  - 2+ slides → carrossel com fade + bolinhas + setas
 *  Mantém o rótulo "PUBLICIDADE" acima, como no banner antigo.
 */
export default function DashboardTopBanner() {
  const { settings, loaded } = useAppSettings()
  const [current, setCurrent] = useState(0)

  const slides = ([
    { url: settings.dashboard_banner_url,   link: settings.dashboard_banner_link,   alt: settings.dashboard_banner_alt },
    { url: settings.dashboard_banner_url_2, link: settings.dashboard_banner_link_2, alt: settings.dashboard_banner_alt_2 },
    { url: settings.dashboard_banner_url_3, link: settings.dashboard_banner_link_3, alt: settings.dashboard_banner_alt_3 },
  ] as { url: string; link: string; alt: string }[])
    .map(s => ({
      url:  String(s.url  || '').trim(),
      link: String(s.link || '').trim(),
      alt:  String(s.alt  || 'Publicidade TigerJus').trim(),
    }))
    .filter(s => s.url.length > 0)

  const total = slides.length

  const height      = Number(settings.dashboard_banner_height)        || 120
  const positionRaw = String(settings.dashboard_banner_position || 'center').toLowerCase()
  const position    = ['top', 'center', 'bottom'].includes(positionRaw) ? positionRaw : 'center'
  const opacityNum  = Number(settings.dashboard_banner_opacity)
  const opacity     = Number.isFinite(opacityNum) ? Math.min(100, Math.max(0, opacityNum)) / 100 : 1
  const fitRaw      = String(settings.dashboard_banner_fit || 'cover').toLowerCase()
  const fit         = fitRaw === 'contain' ? 'contain' : 'cover'
  const radius      = Number(settings.dashboard_banner_radius)    || 0
  const maxWidth    = Number(settings.dashboard_banner_max_width)  || 0
  const intervalSec = Number(settings.dashboard_banner_interval)   || 5

  const next = useCallback(() => { setCurrent(c => (c + 1) % total) }, [total])

  useEffect(() => {
    if (total < 2) return
    const ms = Math.max(2, intervalSec) * 1000
    const timer = setInterval(next, ms)
    return () => clearInterval(timer)
  }, [total, intervalSec, next, current])

  useEffect(() => {
    if (current >= total && total > 0) setCurrent(0)
  }, [current, total])

  if (!loaded) return null
  if (total === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6, textAlign: 'right' }}>
        PUBLICIDADE
      </div>

      <div
        className="tj-dash-banner-frame"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: maxWidth > 0 ? maxWidth : '100%',
          margin: '0 auto',
          overflow: 'hidden',
          borderRadius: radius,
          lineHeight: 0,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          ['--tj-dash-h' as any]: `${height}px`,
          ['--tj-dash-fit' as any]: fit,
          ['--tj-dash-pos' as any]: `center ${position}`,
        }}
      >
        {slides.map((slide, i) => {
          const isActive = i === current
          const img = (
            <img
              className="tj-dash-banner-img"
              src={slide.url}
              alt={slide.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              style={{ opacity }}
            />
          )
          return (
            <div
              key={i}
              className="tj-dash-banner-slide"
              style={{
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 2 : 1,
              }}
            >
              {slide.link ? (
                <a href={slide.link} target="_blank" rel="noopener noreferrer"
                   style={{ display: 'block', width: '100%', height: '100%', lineHeight: 0 }}>
                  {img}
                </a>
              ) : img}
            </div>
          )
        })}

        {/* espaçador — dá altura no mobile (auto) */}
        <img
          className="tj-dash-banner-spacer"
          src={slides[Math.min(current, total - 1)].url}
          alt=""
          aria-hidden="true"
          style={{ display: 'none', width: '100%', height: 'auto', visibility: 'hidden', position: 'relative', zIndex: 0 }}
        />

        {total > 1 && (
          <>
            <button aria-label="Anterior"
              onClick={(e) => { e.preventDefault(); setCurrent(c => (c - 1 + total) % total) }}
              className="tj-dash-arrow tj-dash-arrow-left">‹</button>
            <button aria-label="Próximo"
              onClick={(e) => { e.preventDefault(); setCurrent(c => (c + 1) % total) }}
              className="tj-dash-arrow tj-dash-arrow-right">›</button>
            <div className="tj-dash-dots">
              {slides.map((_, i) => (
                <button key={i} aria-label={`Slide ${i + 1}`}
                  onClick={(e) => { e.preventDefault(); setCurrent(i) }}
                  className={`tj-dash-dot ${i === current ? 'tj-dash-dot-active' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        .tj-dash-banner-frame { height: var(--tj-dash-h, 120px); }
        .tj-dash-banner-slide {
          position: absolute; inset: 0; width: 100%; height: 100%;
          transition: opacity 0.8s ease-in-out;
        }
        .tj-dash-banner-img {
          display: block; width: 100%; height: 100%;
          object-fit: var(--tj-dash-fit, cover);
          object-position: var(--tj-dash-pos, center center);
        }
        .tj-dash-arrow {
          position: absolute; top: 50%; transform: translateY(-50%); z-index: 5;
          width: 32px; height: 32px; border: none; border-radius: 50%;
          background: rgba(0,0,0,0.4); color: #fff; font-size: 20px; line-height: 1;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px); transition: background 0.2s;
        }
        .tj-dash-arrow:hover { background: rgba(0,0,0,0.65); }
        .tj-dash-arrow-left  { left: 10px; }
        .tj-dash-arrow-right { right: 10px; }
        .tj-dash-dots {
          position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
          z-index: 5; display: flex; gap: 7px;
        }
        .tj-dash-dot {
          width: 9px; height: 9px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.5); cursor: pointer; padding: 0;
          transition: background 0.2s, transform 0.2s;
        }
        .tj-dash-dot-active { background: #fff; transform: scale(1.25); }

        @media (max-width: 768px) {
          .tj-dash-banner-frame { height: auto !important; }
          .tj-dash-banner-img {
            width: 100% !important; height: auto !important;
            object-fit: contain !important; object-position: center center !important;
          }
          .tj-dash-banner-spacer { display: block !important; }
          .tj-dash-arrow { width: 28px; height: 28px; font-size: 18px; }
        }
      `}</style>
    </div>
  )
}
