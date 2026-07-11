'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * AdminAnalytics — dashboard de marketing (abas mais acessadas, funil, tempo).
 * Lê das funções admin_abas_top / admin_funil / admin_tempo_dia (só admin).
 * Monte dentro do seu painel /admin.
 */

const PERIODOS = [{ d: 7, l: '7 dias' }, { d: 30, l: '30 dias' }, { d: 90, l: '90 dias' }]
const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n)

export default function AdminAnalytics() {
  const [dias, setDias] = useState(30)
  const [abas, setAbas] = useState<any[]>([])
  const [funil, setFunil] = useState<any[]>([])
  const [tempo, setTempo] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    ;(async () => {
      try {
        const [a, f, t] = await Promise.all([
          supabase.rpc('admin_abas_top', { dias }),
          supabase.rpc('admin_funil', { dias }),
          supabase.rpc('admin_tempo_dia', { dias: Math.min(dias, 30) }),
        ])
        if (!vivo) return
        setAbas((a.data as any[]) || [])
        setFunil(((f.data as any[]) || []).sort((x, y) => x.ordem - y.ordem))
        setTempo((t.data as any[]) || [])
      } finally { if (vivo) setCarregando(false) }
    })()
    return () => { vivo = false }
  }, [dias])

  const totalAcessos = abas.reduce((s, x) => s + Number(x.acessos || 0), 0)
  const maxAba = Math.max(1, ...abas.map(x => Number(x.acessos || 0)))
  const cadastrados = Number(funil.find(f => f.ordem === 1)?.usuarios || 0)
  const ativos = Number(funil.find(f => f.ordem === 2)?.usuarios || 0)
  const pagantes = Number(funil.find(f => f.ordem === 5)?.usuarios || 0)
  const convPagante = cadastrados ? (pagantes / cadastrados * 100) : 0
  const minutosTotais = tempo.reduce((s, x) => s + Number(x.minutos || 0), 0)
  const maxMin = Math.max(1, ...tempo.map(x => Number(x.minutos || 0)))

  const card: React.CSSProperties = { background: 'var(--tj-card-bg,#0c1428)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 18 }
  const kpi = (titulo: string, valor: string, sub: string, cor: string) => (
    <div style={{ ...card, flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{titulo}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: cor, marginTop: 4, fontFamily: 'var(--font-display)' }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900 }}>📊 Inteligência de <span style={{ color: 'var(--gold)' }}>Marketing</span></h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uso do app, funil de conversão e engajamento.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODOS.map(p => (
            <button key={p.d} onClick={() => setDias(p.d)} style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid ' + (dias === p.d ? 'var(--gold)' : 'rgba(255,255,255,0.1)'), background: dias === p.d ? 'rgba(212,168,67,0.15)' : 'transparent', color: dias === p.d ? 'var(--gold)' : 'var(--text-muted)' }}>{p.l}</button>
          ))}
        </div>
      </div>

      {carregando ? <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados…</div> : (
        <>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {kpi('Acessos de tela', fmt(totalAcessos), `no período`, 'var(--gold)')}
            {kpi('Usuários ativos', fmt(ativos), `de ${fmt(cadastrados)} cadastrados`, '#5fb4cc')}
            {kpi('Conversão paga', convPagante.toFixed(1) + '%', `${fmt(pagantes)} pagantes`, 'var(--success)')}
            {kpi('Tempo total', Math.round(minutosTotais) + ' min', 'estimado no período', '#b49ce6')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }}>
            {/* Abas mais acessadas */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Abas mais acessadas</div>
              {abas.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sem dados ainda. Os eventos aparecem conforme o uso.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {abas.slice(0, 10).map((a, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{a.aba}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{fmt(Number(a.acessos))} · {fmt(Number(a.usuarios))} users</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 100, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (Number(a.acessos) / maxAba * 100) + '%', background: 'linear-gradient(90deg,var(--gold),var(--orange))', borderRadius: 100 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Funil de conversão */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Funil de conversão</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {funil.map((f, i) => {
                  const base = Number(funil[0]?.usuarios || 1)
                  const pct = base ? (Number(f.usuarios) / base * 100) : 0
                  const cores = ['#5fb4cc', '#6fc29a', '#f3c64b', '#ee7e3a', '#77c29a']
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600 }}>{f.etapa}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{fmt(Number(f.usuarios))} · {pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: Math.max(pct, 2) + '%', background: cores[i % cores.length], borderRadius: 6, transition: 'width .3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tempo por dia */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Engajamento por dia <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(minutos estimados)</span></div>
            {tempo.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sem dados ainda.</div> : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
                {tempo.map((t, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', maxWidth: 26, height: (Number(t.minutos) / maxMin * 110) + 'px', minHeight: 2, background: 'linear-gradient(180deg,var(--gold),var(--orange))', borderRadius: '4px 4px 0 0' }} title={`${t.minutos} min · ${t.sessoes} sessões`} />
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{String(t.dia).slice(8, 10)}/{String(t.dia).slice(5, 7)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
