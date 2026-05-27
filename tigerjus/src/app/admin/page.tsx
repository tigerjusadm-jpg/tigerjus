'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminShell, { type AdminSection } from '@/components/AdminShell'
import ModuloResumos from '@/components/ModuloResumos'
import ModuloUsuarios from '@/components/ModuloUsuarios'
import ModuloFlags from '@/components/ModuloFlags'
import ModuloQuestoes from '@/components/ModuloQuestoes'
import ModuloSimulados from '@/components/ModuloSimulados'
import ModuloFlashcards from '@/components/ModuloFlashcards'
import ModuloPlanos from '@/components/ModuloPlanos'

// ─── Seção Overview ───────────────────────────────────────────────────────────

function SectionOverview() {
  const [stats, setStats] = useState({
    usuarios: 0,
    questoes: 0,
    flashcards: 0,
    simulados: 0,
    resumos: 0
  })

  useEffect(() => {
    const load = async () => {
      const [u, q, f, p, r] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('questoes_oab').select('id', { count: 'exact', head: true }),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }),
        supabase.from('provas_oab').select('id', { count: 'exact', head: true }),
        supabase.from('discipline_summaries').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        usuarios: u.count ?? 0,
        questoes: q.count ?? 0,
        flashcards: f.count ?? 0,
        simulados: p.count ?? 0,
        resumos: r.count ?? 0,
      })
    }

    load()
  }, [])

  const cards = [
    { label: 'Usuários', value: stats.usuarios, icon: '👥', color: '#60a5fa' },
    { label: 'Questões', value: stats.questoes, icon: '📝', color: '#D4A843' },
    { label: 'Flashcards', value: stats.flashcards, icon: '🃏', color: '#a78bfa' },
    { label: 'Simulados', value: stats.simulados, icon: '📋', color: '#34d399' },
    { label: 'Resumos', value: stats.resumos, icon: '📖', color: '#f472b6' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, color: '#fff' }}>
          Control Center 🐯
        </h1>
        <p style={{ fontSize: 13, color: '#555' }}>
          Bem-vindo ao TigerJus Admin. Use ⌘K para navegar rapidamente.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
        gap: 14,
        marginBottom: 32
      }}>
        {cards.map(c => (
          <div
            key={c.label}
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '20px 18px'
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.color, marginBottom: 4 }}>
              {c.value.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#555' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(212,168,67,0.12)',
        borderRadius: 14,
        padding: 20
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#555',
          marginBottom: 12
        }}>
          ATALHOS RÁPIDOS
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            '👥 Usuários',
            '📝 Questões',
            '🃏 Flashcards',
            '📋 Simulados',
            '💳 Planos',
            '📖 Resumos',
            '🚩 Feature Flags',
            '⚙️ Configurações'
          ].map(label => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8,
                padding: '7px 13px',
                fontSize: 12,
                color: '#888'
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: '#444' }}>
          💡 Use{' '}
          <kbd style={{
            background: 'rgba(255,255,255,0.08)',
            padding: '1px 5px',
            borderRadius: 3,
            fontSize: 10
          }}>
            ⌘K
          </kbd>{' '}
          para navegar entre seções rapidamente.
        </div>
      </div>
    </div>
  )
}

// ─── Placeholder ──────────────────────────────────────────────────────────────

function SectionPlaceholder({ section }: { section: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          Módulo em construção
        </div>
        <div style={{ fontSize: 13, color: '#555' }}>
          A seção <strong style={{ color: '#D4A843' }}>{section}</strong> está sendo desenvolvida.
        </div>
      </div>
    </div>
  )
}

// ─── Render por seção ─────────────────────────────────────────────────────────

function renderSection(section: AdminSection, adminId?: string) {
  switch (section) {
    case 'overview':
      return <SectionOverview />

    case 'resumos':
      return <ModuloResumos adminId={adminId} />

    case 'usuarios':
      return <ModuloUsuarios adminId={adminId} />

    case 'flags':
      return <ModuloFlags adminId={adminId} />

    case 'questoes':
      return <ModuloQuestoes adminId={adminId} />

    case 'simulados':
      return <ModuloSimulados adminId={adminId} />

    case 'flashcards':
      return <ModuloFlashcards adminId={adminId} />

    case 'planos':
      return <ModuloPlanos adminId={adminId} />

    default:
      return <SectionPlaceholder section={section} />
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const [adminEmail, setAdminEmail] = useState('')
  const [adminId, setAdminId] = useState<string | undefined>()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        router.push('/plataforma')
        return
      }

      setAdminEmail(profile.email || session.user.email || 'admin')
      setAdminId(session.user.id)
      setChecking(false)
    }

    check()
  }, [router])

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🐯</div>
          <div style={{ fontSize: 14, color: '#555' }}>Verificando acesso...</div>
        </div>
      </div>
    )
  }

  return (
    <AdminShell adminEmail={adminEmail}>
      {(section) => renderSection(section, adminId)}
    </AdminShell>
  )
}
