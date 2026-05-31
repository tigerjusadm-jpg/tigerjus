'use client'

import { useAppSettings } from '@/contexts/AppSettingsContext'

/**
 * Banner do topo da landing page.
 * - Lê os dados de app_settings via useAppSettings()
 * - Aguarda loaded === true antes de decidir
 * - Renderiza a imagem somente quando há URL
 * - Funciona para desktop e mobile (responsivo via style inline)
 * - Sem hardcode, sem debug, sem dependência de CSS externo
 */
export default function LandingTopBanner() {
  const { settings, loaded } = useAppSettings()

  // Enquanto não carregou os settings, não renderiza nada (evita estado vazio piscando)
  if (!loaded) return null

  const url  = String(settings.landing_top_banner_url  || '').trim()
  const link = String(settings.landing_top_banner_link || '').trim()
  const alt  = String(settings.landing_top_banner_alt  || 'Banner TigerJus').trim()

  // Sem URL configurada no Admin → não mostra banner
  if (!url) return null

  const img = (
    <img
      src={url}
      alt={alt}
      loading="eager"
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        maxHeight: 300,
        objectFit: 'cover',
      }}
    />
  )

  return (
    <div
      style={{
        width: '100%',
        marginTop: 60,        // altura da navbar fixa
        overflow: 'hidden',
        lineHeight: 0,
        position: 'relative',
        zIndex: 20,
      }}
    >
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', lineHeight: 0, width: '100%' }}
        >
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  )
}
