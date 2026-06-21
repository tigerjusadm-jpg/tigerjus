import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TigerJus — Estude como um Tigre'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1206 100%)',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 900, color: '#D4A843', letterSpacing: -3 }}>
          TIGERJUS
        </div>
        <div style={{ display: 'flex', width: 140, height: 5, background: '#E8621A', margin: '28px 0' }} />
        <div style={{ display: 'flex', fontSize: 44, color: '#ffffff' }}>Estude como um Tigre.</div>
        <div style={{ display: 'flex', fontSize: 28, color: '#999999', marginTop: 34 }}>
          IA · Simulados OAB · Gamificação
        </div>
      </div>
    ),
    { ...size },
  )
}
