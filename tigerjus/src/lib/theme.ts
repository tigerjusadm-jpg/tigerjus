// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface ThemeTokens {
  // Backgrounds
  '--tj-bg':              string
  '--tj-bg-secondary':    string
  '--tj-bg-tertiary':     string
  // Cards
  '--tj-card-bg':         string
  '--tj-card-border':     string
  '--tj-card-hover-border': string
  '--tj-card-glow':       string
  // Borders
  '--tj-border':          string
  // Sidebar
  '--tj-sidebar-bg':      string
  '--tj-sidebar-border':  string
  // Glow
  '--tj-glow-color':      string
  '--tj-glow-strength':   string
  // Grid
  '--tj-grid-opacity':    string
  '--tj-grid-color':      string
  // Radial glow (hero)
  '--tj-radial-glow':     string
  // Blur
  '--tj-blur':            string
}

export type ThemeName = 'classic' | 'tech' | 'neon' | 'gold' | 'cyber' | 'minimal'

// ─── TEMAS ────────────────────────────────────────────────────────────────────

export const THEMES: Record<ThemeName, ThemeTokens> = {

  // ── TECH — tema principal ─────────────────────────────────────────────────
  // Inspiração: Linear, Cursor, Vercel
  // Atmosfera: inteligência artificial, precisão, velocidade
  tech: {
    '--tj-bg':                '#070b14',
    '--tj-bg-secondary':      '#0b1120',
    '--tj-bg-tertiary':       '#0f1626',
    '--tj-card-bg':           'rgba(15,22,38,0.8)',
    '--tj-card-border':       'rgba(99,130,200,0.12)',
    '--tj-card-hover-border': 'rgba(99,130,200,0.35)',
    '--tj-card-glow':         'rgba(99,130,200,0.08)',
    '--tj-border':            'rgba(99,130,200,0.1)',
    '--tj-sidebar-bg':        '#060a12',
    '--tj-sidebar-border':    'rgba(99,130,200,0.1)',
    '--tj-glow-color':        'rgba(99,130,200,0.15)',
    '--tj-glow-strength':     '20px',
    '--tj-grid-opacity':      '0.6',
    '--tj-grid-color':        'rgba(99,130,200,0.04)',
    '--tj-radial-glow':       'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,130,200,0.08) 0%, transparent 70%)',
    '--tj-blur':              'blur(1px)',
  },

  // ── CLASSIC — jurídico premium ────────────────────────────────────────────
  // Atmosfera: autoridade, seriedade, premium
  classic: {
    '--tj-bg':                '#050505',
    '--tj-bg-secondary':      '#0a0a0a',
    '--tj-bg-tertiary':       '#141414',
    '--tj-card-bg':           'rgba(20,20,20,0.9)',
    '--tj-card-border':       'rgba(255,255,255,0.06)',
    '--tj-card-hover-border': 'rgba(212,168,67,0.2)',
    '--tj-card-glow':         'rgba(212,168,67,0.04)',
    '--tj-border':            'rgba(255,255,255,0.06)',
    '--tj-sidebar-bg':        '#0a0a0a',
    '--tj-sidebar-border':    'rgba(212,168,67,0.08)',
    '--tj-glow-color':        'rgba(212,168,67,0.06)',
    '--tj-glow-strength':     '12px',
    '--tj-grid-opacity':      '0',
    '--tj-grid-color':        'rgba(212,168,67,0.02)',
    '--tj-radial-glow':       'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,168,67,0.05) 0%, transparent 70%)',
    '--tj-blur':              'none',
  },

  // ── GOLD — executivo premium ──────────────────────────────────────────────
  // Atmosfera: luxo, conquista, excelência
  gold: {
    '--tj-bg':                '#080600',
    '--tj-bg-secondary':      '#0d0a00',
    '--tj-bg-tertiary':       '#150e00',
    '--tj-card-bg':           'rgba(20,15,0,0.85)',
    '--tj-card-border':       'rgba(212,168,67,0.15)',
    '--tj-card-hover-border': 'rgba(212,168,67,0.4)',
    '--tj-card-glow':         'rgba(212,168,67,0.06)',
    '--tj-border':            'rgba(212,168,67,0.12)',
    '--tj-sidebar-bg':        '#070500',
    '--tj-sidebar-border':    'rgba(212,168,67,0.15)',
    '--tj-glow-color':        'rgba(212,168,67,0.2)',
    '--tj-glow-strength':     '24px',
    '--tj-grid-opacity':      '0.4',
    '--tj-grid-color':        'rgba(212,168,67,0.03)',
    '--tj-radial-glow':       'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,168,67,0.1) 0%, transparent 70%)',
    '--tj-blur':              'none',
  },

  // ── NEON — jovem e gamer controlado ──────────────────────────────────────
  // Atmosfera: energia, competição, gamificação
  neon: {
    '--tj-bg':                '#060612',
    '--tj-bg-secondary':      '#0a0a1c',
    '--tj-bg-tertiary':       '#0e0e24',
    '--tj-card-bg':           'rgba(10,10,28,0.85)',
    '--tj-card-border':       'rgba(139,92,246,0.15)',
    '--tj-card-hover-border': 'rgba(139,92,246,0.45)',
    '--tj-card-glow':         'rgba(139,92,246,0.06)',
    '--tj-border':            'rgba(139,92,246,0.12)',
    '--tj-sidebar-bg':        '#050510',
    '--tj-sidebar-border':    'rgba(139,92,246,0.15)',
    '--tj-glow-color':        'rgba(139,92,246,0.2)',
    '--tj-glow-strength':     '28px',
    '--tj-grid-opacity':      '0.7',
    '--tj-grid-color':        'rgba(139,92,246,0.04)',
    '--tj-radial-glow':       'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,92,246,0.1) 0%, transparent 70%)',
    '--tj-blur':              'none',
  },

  // ── CYBER — IA + tecnologia ───────────────────────────────────────────────
  // Atmosfera: inteligência artificial, matrix, futuro
  cyber: {
    '--tj-bg':                '#040d08',
    '--tj-bg-secondary':      '#071208',
    '--tj-bg-tertiary':       '#0a180c',
    '--tj-card-bg':           'rgba(7,18,8,0.85)',
    '--tj-card-border':       'rgba(52,211,153,0.12)',
    '--tj-card-hover-border': 'rgba(52,211,153,0.35)',
    '--tj-card-glow':         'rgba(52,211,153,0.05)',
    '--tj-border':            'rgba(52,211,153,0.1)',
    '--tj-sidebar-bg':        '#030a06',
    '--tj-sidebar-border':    'rgba(52,211,153,0.1)',
    '--tj-glow-color':        'rgba(52,211,153,0.15)',
    '--tj-glow-strength':     '20px',
    '--tj-grid-opacity':      '0.8',
    '--tj-grid-color':        'rgba(52,211,153,0.035)',
    '--tj-radial-glow':       'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(52,211,153,0.07) 0%, transparent 70%)',
    '--tj-blur':              'none',
  },

  // ── MINIMAL — máxima legibilidade ─────────────────────────────────────────
  // Atmosfera: foco, clareza, sem distração
  minimal: {
    '--tj-bg':                '#0a0a0a',
    '--tj-bg-secondary':      '#111111',
    '--tj-bg-tertiary':       '#181818',
    '--tj-card-bg':           'rgba(17,17,17,0.95)',
    '--tj-card-border':       'rgba(255,255,255,0.07)',
    '--tj-card-hover-border': 'rgba(255,255,255,0.15)',
    '--tj-card-glow':         'rgba(255,255,255,0)',
    '--tj-border':            'rgba(255,255,255,0.07)',
    '--tj-sidebar-bg':        '#0a0a0a',
    '--tj-sidebar-border':    'rgba(255,255,255,0.07)',
    '--tj-glow-color':        'rgba(255,255,255,0)',
    '--tj-glow-strength':     '0px',
    '--tj-grid-opacity':      '0',
    '--tj-grid-color':        'transparent',
    '--tj-radial-glow':       'none',
    '--tj-blur':              'none',
  },
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function getTheme(name: string): ThemeTokens {
  return THEMES[name as ThemeName] ?? THEMES.tech
}

export const THEME_OPTIONS: { value: ThemeName; label: string; desc: string }[] = [
  { value: 'tech',     label: '⚡ Tech',     desc: 'Linear + Cursor — tema principal' },
  { value: 'classic',  label: '⚖️ Classic',  desc: 'Jurídico premium' },
  { value: 'gold',     label: '✨ Gold',     desc: 'Executivo premium' },
  { value: 'neon',     label: '🎮 Neon',     desc: 'Jovem e gamificado' },
  { value: 'cyber',    label: '🤖 Cyber',    desc: 'IA e tecnologia' },
  { value: 'minimal',  label: '🔲 Minimal',  desc: 'Máxima legibilidade' },
]
