'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Item = {
  id: string
  questao_id: string
  disciplina_id: string | null
  disciplina_nome: string
  tema_sugerido: string | null
  subtema_sugerido: string | null
  status: string
  confianca: number | null
  enunciado: string
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }
}

export default function ModuloRadarClassificacao() {
  const [progress, setProgress] = useState<{ feitas: number; total: number; restantes: number } | null>(null)
  const [classificando, setClassificando] = useState(false)
  const [log, setLog] = useState('')
  const pararRef = useRef(false)

  const [itens, setItens] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('sugerido')
  const [filtroDisc, setFiltroDisc] = useState('')
  const [edits, setEdits] = useState<Record<string, { tema: string; subtema: string }>>({})
  const [msg, setMsg] = useState('')

  const carregarItens = useCallback(async (status = filtroStatus) => {
    setCarregando(true)
    try {
      const headers = await authHeaders()
      const r = await fetch(`/api/admin/radar/review?status=${status}&limit=200`, { headers })
      const d = await r.json()
      if (r.ok) setItens(d.itens || [])
      else setMsg(d?.error || 'Erro ao carregar')
    } catch (e: any) { setMsg(e?.message || 'Erro') }
    setCarregando(false)
  }, [filtroStatus])

  useEffect(() => { carregarItens() }, [carregarItens])

  async function classificarComIA() {
    setClassificando(true); pararRef.current = false; setLog('Iniciando classificação...')
    try {
      let rodando = true
      while (rodando) {
        if (pararRef.current) { setLog('Parado pelo usuário.'); break }
        const headers = await authHeaders()
        const r = await fetch('/api/admin/radar/classify', { method: 'POST', headers, body: JSON.stringify({ limit: 8 }) })
        const d = await r.json()
        if (!r.ok) { setLog('Erro: ' + (d?.error || '')); break }
        setProgress({ feitas: d.total_classificadas, total: d.total_questoes, restantes: d.restantes })
        setLog(`+${d.classificadas} agora · ${d.total_classificadas}/${d.total_questoes} feitas · ${d.restantes} restantes`)
        if (d.restantes <= 0 || d.classificadas === 0) rodando = false
      }
    } catch (e: any) { setLog('Erro: ' + (e?.message || '')) }
    setClassificando(false)
    await carregarItens()
  }

  async function acao(body: any, removerId?: string) {
    setMsg('')
    try {
      const headers = await authHeaders()
      const r = await fetch('/api/admin/radar/review', { method: 'POST', headers, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) { setMsg(d?.error || 'Erro'); return false }
      if (removerId) setItens(prev => prev.filter(i => i.id !== removerId))
      return true
    } catch (e: any) { setMsg(e?.message || 'Erro'); return false }
  }

  function aprovar(item: Item) {
    const e = edits[item.id]
    acao({ acao: 'aprovar', classificacaoId: item.id, tema: e?.tema ?? item.tema_sugerido ?? '', subtema: e?.subtema ?? item.subtema_sugerido ?? '' }, item.id)
  }
  function rejeitar(item: Item) { acao({ acao: 'rejeitar', classificacaoId: item.id }, item.id) }
  async function aprovarLote() {
    if (!confirm('Aprovar automaticamente todas as sugestões com confiança ≥ 85%?')) return
    const ok = await acao({ acao: 'aprovar_lote', minConfianca: 0.85 })
    if (ok) { setMsg('Lote aprovado.'); carregarItens() }
  }

  const disciplinas = Array.from(new Set(itens.map(i => i.disciplina_nome).filter(Boolean))).sort()
  const visiveis = filtroDisc ? itens.filter(i => i.disciplina_nome === filtroDisc) : itens

  const card: React.CSSProperties = { background: 'var(--tj-card-bg)', border: '1px solid var(--tj-card-border)', borderRadius: 14, padding: 16 }
  const btn: React.CSSProperties = { border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }
  const input: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--tj-card-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--white)', fontSize: 13, fontFamily: 'var(--font-body)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, margin: 0 }}>
          🎯 Radar — <span style={{ color: 'var(--gold)' }}>Classificação de Temas</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          A IA sugere tema e subtema de cada questão. Você revisa e aprova. Só o aprovado alimenta o Radar.
        </p>
      </div>

      {/* Ações de classificação */}
      <div style={{ ...card }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={classificarComIA} disabled={classificando}
            style={{ ...btn, background: 'linear-gradient(135deg,var(--gold),var(--orange))', color: 'var(--deep-black)', opacity: classificando ? 0.6 : 1 }}>
            {classificando ? '⏳ Classificando...' : '🤖 Classificar com IA'}
          </button>
          {classificando && (
            <button onClick={() => { pararRef.current = true }} style={{ ...btn, background: 'rgba(255,255,255,0.06)', color: 'var(--white)' }}>
              Parar
            </button>
          )}
          <button onClick={aprovarLote} style={{ ...btn, background: 'rgba(76,175,125,0.15)', color: 'var(--success)' }}>
            ✓ Aprovar alta confiança (≥85%)
          </button>
        </div>
        {progress && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              {progress.feitas} de {progress.total} classificadas · {progress.restantes} restantes
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress.total ? (progress.feitas / progress.total) * 100 : 0}%`, background: 'linear-gradient(90deg,var(--gold),var(--orange))', borderRadius: 100, transition: 'width .4s' }} />
            </div>
          </div>
        )}
        {log && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{log}</div>}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); carregarItens(e.target.value) }} style={{ ...input, width: 'auto' }}>
          <option value="sugerido">Sugeridas (a revisar)</option>
          <option value="revisado">Aprovadas</option>
          <option value="rejeitado">Rejeitadas</option>
        </select>
        <select value={filtroDisc} onChange={e => setFiltroDisc(e.target.value)} style={{ ...input, width: 'auto' }}>
          <option value="">Todas as disciplinas</option>
          {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{visiveis.length} questões</span>
        {msg && <span style={{ fontSize: 12, color: 'var(--orange)' }}>{msg}</span>}
      </div>

      {/* Lista */}
      {carregando ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>
      ) : visiveis.length === 0 ? (
        <div style={{ ...card, color: 'var(--text-muted)', fontSize: 13 }}>Nada por aqui.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visiveis.map(item => {
            const e = edits[item.id] || { tema: item.tema_sugerido || '', subtema: item.subtema_sugerido || '' }
            const conf = item.confianca != null ? `${Math.round(item.confianca * 100)}%` : '—'
            return (
              <div key={item.id} style={{ ...card }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 1 }}>{item.disciplina_nome}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>confiança IA: {conf}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.5, marginBottom: 12 }}>
                  {item.enunciado.length > 240 ? item.enunciado.slice(0, 240) + '…' : item.enunciado}
                </div>
                {item.status === 'sugerido' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tema</label>
                        <input style={input} value={e.tema} onChange={ev => setEdits(p => ({ ...p, [item.id]: { ...e, tema: ev.target.value } }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Subtema</label>
                        <input style={input} value={e.subtema} onChange={ev => setEdits(p => ({ ...p, [item.id]: { ...e, subtema: ev.target.value } }))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => aprovar(item)} style={{ ...btn, background: 'rgba(76,175,125,0.15)', color: 'var(--success)' }}>✓ Aprovar</button>
                      <button onClick={() => rejeitar(item)} style={{ ...btn, background: 'rgba(232,66,26,0.12)', color: 'var(--danger)' }}>✕ Rejeitar</button>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Tema: <strong style={{ color: 'var(--white)' }}>{item.tema_sugerido || '—'}</strong>
                    {item.subtema_sugerido ? <> · Subtema: <strong style={{ color: 'var(--white)' }}>{item.subtema_sugerido}</strong></> : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
