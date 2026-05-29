'use client'
import { useEffect, useRef, useState } from 'react'

interface HeroMediaProps {
  enabled:   boolean
  type:      string   // 'image' | 'video' | 'none'
  url:       string
  position:  string   // 'right' | 'left' | 'center' | 'background'
  opacity:   number   // 0–100
  animation: string   // 'none' | 'float' | 'pulse'
  maxWidth:  number   // px — largura máxima da mídia
  blur:      number   // px — blur aplicado à mídia (0 = sem blur)
}

export default function HeroMedia({
  enabled, type, url, position, opacity, animation, maxWidth, blur,
}: HeroMediaProps) {

  const [loaded, setLoaded] = useState(false)
  const [error,  setError]  = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setLoaded(false)
    setError(false)
  }, [url])

  if (!enabled || !url || type === 'none') return null
  if (error) return null

  const opacityValue = Math.min(100, Math.max(0, opacity)) / 100
  const blurValue    = Math.max(0, blur)
  const maxW         = Math.max(100, maxWidth)

  const animClass =
    animation === 'float' ? 'hero-media-float' :
    animation === 'pulse' ? 'hero-media-pulse' : ''

  // Filtro CSS combinando blur e drop-shadow
  const filterStyle = [
    blurValue > 0 ? `blur(${blurValue}px)` : '',
    'drop-shadow(0 0 50px rgba(99,130,200,0.35))',
    'drop-shadow(0 0 20px rgba(212,168,67,0.15))',
  ].filter(Boolean).join(' ')

  // ── Posição background ────────────────────────────────────────
  if (position === 'background') {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          background: 'linear-gradient(to right, rgba(6,10,18,0.92) 0%, rgba(6,10,18,0.7) 50%, rgba(6,10,18,0.5) 100%)',
        }}/>
        {type === 'video' ? (
          <video
            ref={videoRef}
            src={url}
            autoPlay muted loop playsInline
            onError={() => setError(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: opacityValue,
              filter: blurValue > 0 ? `blur(${blurValue}px)` : undefined,
              zIndex: 1,
            }}
          />
        ) : (
          <img
            src={url}
            alt=""
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: loaded ? opacityValue : 0,
              filter: blurValue > 0 ? `blur(${blurValue}px)` : undefined,
              transition: 'opacity 0.6s ease',
              zIndex: 1,
            }}
          />
        )}
      </div>
    )
  }

  // ── Posição right / left / center ─────────────────────────────
  const isCenter = position === 'center'

  return (
    <div
      className={`hero-media-container hero-media-${position}`}
      style={{
        position: isCenter ? 'absolute' : 'relative',
        ...(isCenter ? {
          inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', pointerEvents: 'none', zIndex: 1,
        } : {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          width: maxW,
          maxWidth: '100%',
        }),
      }}
    >
      {/* Glow atrás da imagem */}
      <div style={{
        position: 'absolute',
        width: '80%', height: '80%',
        background: 'radial-gradient(ellipse at center, rgba(99,130,200,0.22) 0%, rgba(212,168,67,0.08) 50%, transparent 75%)',
        filter: 'blur(40px)',
        zIndex: 0,
        pointerEvents: 'none',
      }}/>

      {type === 'video' ? (
        <video
          ref={videoRef}
          src={url}
          autoPlay muted loop playsInline
          onError={() => setError(true)}
          className={animClass}
          style={{
            maxWidth: '100%',
            maxHeight: isCenter ? '70vh' : maxW,
            objectFit: 'contain',
            opacity: opacityValue,
            filter: filterStyle,
            position: 'relative', zIndex: 1,
          }}
        />
      ) : (
        <img
          src={url}
          alt="TigerJus — Cyber Tiger"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={animClass}
          loading="eager"
          style={{
            maxWidth: '100%',
            maxHeight: isCenter ? '70vh' : maxW,
            width: '100%',
            objectFit: 'contain',
            opacity: loaded ? opacityValue : 0,
            filter: filterStyle,
            transition: 'opacity 0.6s ease',
            position: 'relative', zIndex: 1,
          }}
        />
      )}
    </div>
  )
}
