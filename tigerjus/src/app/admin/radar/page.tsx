'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ModuloRadarClassificacao from '@/components/ModuloRadarClassificacao'

export default function AdminRadarPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'negado'>('carregando')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setEstado(profile?.role === 'admin' ? 'ok' : 'negado')
    })()
  }, [router])

  if (estado === 'carregando') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
  }
  if (estado === 'negado') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Acesso restrito.</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--tj-bg)', padding: '24px 20px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <a href="/admin" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Voltar ao admin</a>
        <div style={{ marginTop: 16 }}>
          <ModuloRadarClassificacao />
        </div>
      </div>
    </div>
  )
}
