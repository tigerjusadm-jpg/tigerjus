'use client'
import {
  useState, useEffect, useRef, useCallback,
  createContext, useContext, type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AppSetting {
  id: string; key: string; value: string | null
  type: string; description: string | null; ativo: boolean
}

export interface FeatureFlag {
  id: string; key: string; enabled: boolean
  scope: string; target: string | null; description: string | null
}

export type AdminSection =
  | 'overview'
  | 'usuarios'
  | 'questoes'
  | 'simulados'
  | 'flashcards'
  | 'resumos'
  | 'media'           // ← NOVO (C10.9-C)
  | 'planos'
  | 'flags'
  | 'settings'
  | 'audit'

// ─── PROVIDERS ────────────────────────────────────────────────────────────────

// AdminSettingsProvider
interface SettingsCtx {
  settings: AppSetting[]
  getSetting: (key: string) => string | null
  refresh: () => Promise<void>
}
const SettingsContext = createContext<SettingsCtx>({
  settings: [], getSetting: () => null, refresh: async () => {},
})
export function useAdminSettings() { return useContext(SettingsContext) }

function AdminSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSetting[]>([])

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('*').eq('ativo', true)
    if (data) setSettings(data as AppSetting[])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const getSetting = (key: string) =>
    settings.find(s => s.key === key)?.value ?? null

  return (
    <SettingsContext.Provider value={{ settings, getSetting, refresh }}>
      {children}
    </SettingsContext.Provider>
  )
}

// FeatureFlagsProvider
interface FlagsCtx {
  flags: FeatureFlag[]
  isEnabled: (key: string) => boolean
  refresh: () => Promise<void>
}
const FlagsContext = createContext<FlagsCtx>({
  flags: [], isEnabled: () => false, refresh: async () => {},
})
export function useFeatureFlags() { return useContext(FlagsContext) }

function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([])

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('feature_flags').select('*')
    if (data) setFlags(data as FeatureFlag[])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const isEnabled = (key: string) =>
    flags.find(f => f.key === key)?.enabled ?? false

  return (
    <FlagsContext.Provider value={{ flags, isEnabled, refresh }}>
      {children}
    </FlagsContext.Provider>
  )
}

// AdminUIProvider — controla sidebar e seção ativa
interface UICtx {
  section: AdminSection
  setSection: (s: AdminSection) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  cmdOpen: boolean
  setCmdOpen: (v: boolean) => void
}
const UIContext = createContext<UICtx>({
  section: 'overview', setSection: () => {},
  sidebarOpen: true, setSidebarOpen: () => {},
  cmdOpen: false, setCmdOpen: () => {},
})
export function useAdminUI() { return useContext(UIContext) }

function AdminUIProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<AdminSection>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [cmdOpen, setCmdOpen] = useState(false)

  // CMD+K global
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
      }
      if (e.key === 'Escape') setCmdOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <UIContext.Provider value={{ section, setSection, sidebarOpen, setSidebarOpen, cmdOpen, setCmdOpen }}>
      {children}
    </UIContext.Provider>
  )
}

// ─── COMMAND PALETTE ──────────────────────────────────────────────────────────

const CMD_ITEMS: { label: string; icon: string; section?: AdminSection; action?: string }[] = [
  { label: 'Dashboard',        icon: '🏠', section: 'overview'  },
  { label: 'Usuários',         icon: '👥', section: 'usuarios'  },
  { label: 'Questões',         icon: '📝', section: 'questoes'  },
  { label: 'Simulados',        icon: '📋', section: 'simulados' },
  { label: 'Flashcards',       icon: '🃏', section: 'flashcards'},
  { label: 'Resumos',          icon: '📖', section: 'resumos'   },
  { label: 'Media Library',    icon: '🖼️', section: 'media'     },  // ← NOVO (C10.9-C)
  { label: 'Planos',           icon: '💳', section: 'planos'    },
  { label: 'Feature Flags',    icon: '🚩', section: 'flags'     },
  { label: 'Configurações',    icon: '⚙️', section: 'settings'  },
  { label: 'Audit Log',        icon: '🔍', section: 'audit'     },
  { label: 'Ir para plataforma', icon: '🐯', action: 'platform' },
]

function CommandPalette() {
  const { cmdOpen, setCmdOpen, setSection } = useAdminUI()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cmdOpen) setTimeout(() => inputRef.current?.focus(), 50)
    else setQuery('')
  }, [cmdOpen])

  const filtered = CMD_ITEMS.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase())
  )

  const execute = (item: typeof CMD_ITEMS[0]) => {
    if (item.action === 'platform') { router.push('/plataforma'); return }
    if (item.section) setSection(item.section)
    setCmdOpen(false)
  }

  if (!cmdOpen) return null

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:100,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}
      onClick={() => setCmdOpen(false)}>
      <div style={{width:'100%',maxWidth:520,background:'#1a1a1a',border:'1px solid rgba(212,168,67,0.3)',borderRadius:16,overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,0.6)'}}
        onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <span style={{fontSize:16,opacity:0.5}}>🔍</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Navegar para..."
            style={{flex:1,background:'none',border:'none',outline:'none',fontSize:15,color:'#fff',fontFamily:'inherit'}} />
          <kbd style={{fontSize:10,padding:'2px 6px',background:'rgba(255,255,255,0.08)',borderRadius:4,color:'#888'}}>ESC</kbd>
        </div>
        <div style={{maxHeight:320,overflowY:'auto'}}>
          {filtered.map((item, i) => (
            <button key={i} onClick={() => execute(item)}
              style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'11px 18px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:14,color:'#ccc',transition:'background 0.15s'}}
              onMouseEnter={e => e.currentTarget.style.background='rgba(212,168,67,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              <span style={{fontSize:16,width:22,textAlign:'center'}}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{padding:'20px 18px',fontSize:13,color:'#555',textAlign:'center'}}>
              Nenhum resultado
            </div>
          )}
        </div>
        <div style={{padding:'8px 18px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:16,fontSize:11,color:'#555'}}>
          <span>↵ selecionar</span><span>ESC fechar</span><span>⌘K abrir/fechar</span>
        </div>
      </div>
    </div>
  )
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: { label: string; icon: string; section: AdminSection; group: string }[] = [
  { label: 'Dashboard',     icon: '🏠', section: 'overview',   group: 'principal' },
  { label: 'Usuários',      icon: '👥', section: 'usuarios',   group: 'conteudo'  },
  { label: 'Questões',      icon: '📝', section: 'questoes',   group: 'conteudo'  },
  { label: 'Simulados',     icon: '📋', section: 'simulados',  group: 'conteudo'  },
  { label: 'Flashcards',    icon: '🃏', section: 'flashcards', group: 'conteudo'  },
  { label: 'Resumos',       icon: '📖', section: 'resumos',    group: 'conteudo'  },
  { label: 'Media Library', icon: '🖼️', section: 'media',      group: 'conteudo'  },  // ← NOVO (C10.9-C)
  { label: 'Planos',        icon: '💳', section: 'planos',     group: 'sistema'   },
  { label: 'Feature Flags', icon: '🚩', section: 'flags',      group: 'sistema'   },
  { label: 'Configurações', icon: '⚙️', section: 'settings',   group: 'sistema'   },
  { label: 'Audit Log',     icon: '🔍', section: 'audit',      group: 'sistema'   },
]

function Sidebar() {
  const { section, setSection, sidebarOpen } = useAdminUI()
  const router = useRouter()

  const groups = [
    { key: 'principal', label: null },
    { key: 'conteudo',  label: 'CONTEÚDO' },
    { key: 'sistema',   label: 'SISTEMA' },
  ]

  return (
    <aside style={{
      width: sidebarOpen ? 220 : 60, flexShrink:0,
      background:'#0d0d0d', borderRight:'1px solid rgba(255,255,255,0.06)',
      display:'flex', flexDirection:'column',
      transition:'width 0.2s ease', overflow:'hidden',
      minHeight:'100vh', position:'sticky', top:0,
    }}>
      {/* Logo */}
      <div style={{padding:'20px 16px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{width:32,height:32,background:'linear-gradient(135deg,#D4A843,#E8621A)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:16,color:'#000',flexShrink:0}}>T</div>
        {sidebarOpen && (
          <div>
            <div style={{fontSize:13,fontWeight:900,letterSpacing:2,color:'#D4A843'}}>TIGERJUS</div>
            <div style={{fontSize:9,color:'#555',letterSpacing:1}}>CONTROL CENTER</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:'12px 8px',overflowY:'auto'}}>
        {groups.map(group => {
          const items = NAV_ITEMS.filter(i => i.group === group.key)
          return (
            <div key={group.key} style={{marginBottom:8}}>
              {group.label && sidebarOpen && (
                <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:'#444',padding:'8px 8px 4px',textTransform:'uppercase'}}>
                  {group.label}
                </div>
              )}
              {items.map(item => {
                const active = section === item.section
                return (
                  <button key={item.section} onClick={() => setSection(item.section)}
                    title={!sidebarOpen ? item.label : undefined}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      width:'100%', padding:'9px 10px', borderRadius:8,
                      border:'none', cursor:'pointer', textAlign:'left',
                      fontSize:13, fontWeight: active ? 700 : 400,
                      background: active ? 'rgba(212,168,67,0.1)' : 'transparent',
                      color: active ? '#D4A843' : '#888',
                      marginBottom:2, transition:'all 0.15s',
                      borderLeft: active ? '2px solid #D4A843' : '2px solid transparent',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background='transparent' }}>
                    <span style={{fontSize:15,width:20,textAlign:'center',flexShrink:0}}>{item.icon}</span>
                    {sidebarOpen && <span style={{whiteSpace:'nowrap'}}>{item.label}</span>}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <button onClick={() => router.push('/plataforma')}
            style={{display:'flex',alignItems:'center',gap:8,width:'100%',background:'none',border:'none',cursor:'pointer',fontSize:12,color:'#555',padding:'6px 0'}}>
            <span>🐯</span><span>Ir para plataforma</span>
          </button>
        </div>
      )}
    </aside>
  )
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────

function Topbar({ adminEmail }: { adminEmail: string }) {
  const { sidebarOpen, setSidebarOpen, setCmdOpen, section } = useAdminUI()
  const router = useRouter()

  const SECTION_LABELS: Record<AdminSection, string> = {
    overview:'Dashboard', usuarios:'Usuários', questoes:'Questões',
    simulados:'Simulados', flashcards:'Flashcards', resumos:'Resumos',
    media:'Media Library',  // ← NOVO (C10.9-C)
    planos:'Planos', flags:'Feature Flags', settings:'Configurações', audit:'Audit Log',
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header style={{
      height:54, display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 20px', borderBottom:'1px solid rgba(255,255,255,0.06)',
      background:'#0d0d0d', flexShrink:0, gap:16,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:18,padding:4,display:'flex',alignItems:'center'}}>
          ☰
        </button>
        <span style={{fontSize:14,fontWeight:600,color:'#ccc'}}>
          {SECTION_LABELS[section]}
        </span>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:12}}>
        {/* CMD+K hint */}
        <button onClick={() => setCmdOpen(true)}
          style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:12,color:'#666'}}>
          <span>🔍</span>
          <span>Buscar...</span>
          <kbd style={{fontSize:10,padding:'1px 5px',background:'rgba(255,255,255,0.08)',borderRadius:3,marginLeft:4}}>⌘K</kbd>
        </button>

        {/* Admin badge */}
        <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(212,168,67,0.08)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:8,padding:'6px 12px'}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#D4A843,#E8621A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#000'}}>A</div>
          <span style={{fontSize:11,color:'#D4A843',fontWeight:600,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {adminEmail}
          </span>
        </div>

        <button onClick={handleLogout}
          style={{background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:11,color:'#555'}}>
          Sair
        </button>
      </div>
    </header>
  )
}

// ─── ADMIN SHELL (export principal) ───────────────────────────────────────────

interface AdminShellProps {
  adminEmail: string
  children: (section: AdminSection) => ReactNode
}

export default function AdminShell({ adminEmail, children }: AdminShellProps) {
  return (
    <AdminSettingsProvider>
      <FeatureFlagsProvider>
        <AdminUIProvider>
          <AdminShellInner adminEmail={adminEmail} children={children} />
        </AdminUIProvider>
      </FeatureFlagsProvider>
    </AdminSettingsProvider>
  )
}

function AdminShellInner({ adminEmail, children }: AdminShellProps) {
  const { section } = useAdminUI()

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#111',color:'#fff',fontFamily:'var(--font-body, system-ui)'}}>
      <Sidebar />
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
        <Topbar adminEmail={adminEmail} />
        <main style={{flex:1,overflowY:'auto',padding:24}}>
          {children(section)}
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
