'use client'
import { useId } from 'react'

// 16 tigres: [pelagem, sombra, orelha_interna, vibe(M/F)]
const PALETAS: [string, string, string, 'M' | 'F'][] = [
  ['#F49A34', '#C56A12', '#FBDca8', 'M'],
  ['#EE7E3A', '#C85A16', '#F8C89A', 'F'],
  ['#9AA0AA', '#666C75', '#D2D6DC', 'M'],
  ['#F2A9BC', '#DC7392', '#FCE0E8', 'F'],
  ['#5FB4CC', '#358299', '#BCE4EF', 'M'],
  ['#B49CE6', '#8A6FCB', '#E4DAF7', 'F'],
  ['#F3C64B', '#D2A11F', '#FBE8AE', 'M'],
  ['#6FC29A', '#469C71', '#C4EBD6', 'F'],
  ['#F07E68', '#D2543C', '#F9C6BA', 'M'],
  ['#A6D95F', '#7FB53C', '#E0F2C4', 'F'],
  ['#5A97ED', '#3577D6', '#BDD6F8', 'M'],
  ['#EE84C2', '#D257A4', '#F9D0E8', 'F'],
  ['#C6996E', '#9E7146', '#E7D2BA', 'M'],
  ['#49C0EB', '#26A3D2', '#B4E6F6', 'F'],
  ['#F5B133', '#DE911A', '#FBDF9E', 'M'],
  ['#B08BE8', '#8A63D6', '#E1D3F7', 'F'],
]

export const TIGER_IDS = PALETAS.map((_, i) => 'tiger_' + String(i).padStart(2, '0'))
export function isTigerId(v?: string | null): boolean { return !!v && /^tiger_\d{2}$/.test(v) }

function svgTigre(idx: number, u: string): string {
  const [fur, shade, ear, vibe] = PALETAS[idx] || PALETAS[0]
  const cilios = vibe === 'F'
    ? `<path d="M30.5 45.5 l-4.5 -3.2 M69.5 45.5 l4.5 -3.2 M31.5 55 l-4.5 1.5 M68.5 55 l4.5 1.5" stroke="#2a2118" stroke-width="1.8" stroke-linecap="round"/>` : ''
  const acessorio = vibe === 'F'
    ? `<g transform="translate(72,20)"><path d="M0 0 q-9 -7 -14 0 q7 1 8 7 q3 -5 6 -7z" fill="${shade}"/><path d="M0 0 q9 -7 14 0 q-7 1 -8 7 q-3 -5 -6 -7z" fill="${shade}"/><circle cx="0" cy="1" r="3" fill="${ear}"/></g>` : ''
  return `<svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar de tigre">
  <defs><clipPath id="c${u}"><circle cx="50" cy="50" r="50"/></clipPath>
  <radialGradient id="g${u}" cx="50%" cy="42%" r="65%"><stop offset="0%" stop-color="${fur}"/><stop offset="100%" stop-color="${shade}"/></radialGradient></defs>
  <g clip-path="url(#c${u})">
    <rect width="100" height="100" fill="${shade}"/>
    <path d="M15 40 L26 10 L42 33 Z" fill="${fur}" stroke="${shade}" stroke-width="2"/>
    <path d="M85 40 L74 10 L58 33 Z" fill="${fur}" stroke="${shade}" stroke-width="2"/>
    <path d="M23 31 L28 17 L36 30 Z" fill="${ear}"/>
    <path d="M77 31 L72 17 L64 30 Z" fill="${ear}"/>
    <path d="M50 20 C24 20 20 44 22 58 C24 82 38 92 50 92 C62 92 76 82 78 58 C80 44 76 20 50 20 Z" fill="url(#g${u})"/>
    <path d="M50 24 v16" stroke="#241a12" stroke-width="3.2" stroke-linecap="round" opacity="0.85"/>
    <path d="M42 26 q-2 8 -1 14 M58 26 q2 8 1 14" stroke="#241a12" stroke-width="2.8" stroke-linecap="round" fill="none" opacity="0.8"/>
    <path d="M33 34 q-3 6 -2 12 M67 34 q3 6 2 12" stroke="#241a12" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.72"/>
    <path d="M24 56 q8 2 13 1 M76 56 q-8 2 -13 1 M26 64 q8 3 12 1 M74 64 q-8 3 -12 1" stroke="#241a12" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.6"/>
    <ellipse cx="37" cy="50" rx="7" ry="8" fill="#fff"/>
    <ellipse cx="63" cy="50" rx="7" ry="8" fill="#fff"/>
    <circle cx="38.5" cy="51" r="3.8" fill="#241a12"/>
    <circle cx="61.5" cy="51" r="3.8" fill="#241a12"/>
    <circle cx="40" cy="49.5" r="1.3" fill="#fff"/>
    <circle cx="63" cy="49.5" r="1.3" fill="#fff"/>
    <path d="M30 44 q7 -4 13 -1 M57 43 q6 -3 13 1" stroke="${shade}" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${cilios}
    <ellipse cx="50" cy="68" rx="15" ry="11" fill="${ear}"/>
    <path d="M50 63 l-6.5 5 h13 z" fill="#b84a63"/>
    <path d="M50 68 v6 M50 74 q-6 3.5 -11 1.5 M50 74 q6 3.5 11 1.5" stroke="#7a2e40" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M40 70 l-16 -3 M40 73 l-15 1 M60 70 l16 -3 M60 73 l15 1" stroke="#f7ecd8" stroke-width="1.2" stroke-linecap="round" opacity="0.9"/>
    ${acessorio}
  </g>
</svg>`
}

export function TigerAvatar({ id, size = 40 }: { id?: string | null; size?: number }) {
  const raw = useId()
  const u = raw.replace(/[^a-zA-Z0-9]/g, '')
  const idx = isTigerId(id) ? parseInt((id as string).slice(6), 10) : 0
  return <span style={{ width: size, height: size, display: 'inline-block', lineHeight: 0, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: svgTigre(idx, u) }} />
}
