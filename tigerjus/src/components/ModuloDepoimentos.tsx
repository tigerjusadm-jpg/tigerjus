'use client'
import { useEffect, useState, useCallback, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

type Depo = {
  id: string; nome: string; papel: string; texto: string
  status: string; created_at: string; user_id: string | null
}

const STATUS_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  pendente:  { label: 'Pendente',  cor: '#D4A843', bg: 'rgba(212,168,67,0.12)' },
  aprovado:  { label: 'Aprovado',  cor: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  rejeitado: { label: 'Rejeitado', cor: '#F87171', bg: 'rgba(248,113,113,0.12)' },
}

export default function ModuloDepoimentos({ adminId }: { adminId?: string }) {
  const [lista, setLista] = useState<Depo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'pendente' | 'aprovado' | 'rejeitado' | 'todos'>('pendente')
  const [busy, setBusy] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [papel, setPapel] = useState('')
  const [texto, setTexto] = useState('')

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const t = await getToken()
      const res = await fetch('/api/admin/depoimentos', { headers: { Authorization: `Bearer ${t}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar')
      setLista(json.depoimentos || [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { carregar() }, [carregar])

  const post = async (body: Record<string, unknown>, marca: string) => {
    setBusy(marca); setErro('')
    try {
      const t = await getToken()
      const res = await fetch('/api/admin/depoimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha na ação')
      return true
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro')
      return false
    } finally { setBusy(null) }
  }

  const aprovar = async (id: string) => { if (await post({ action: 'status', id, status: 'aprovado' }, id)) carregar() }
  const rejeitar = async (id: string) => { if (await post({ action: 'status', id, status: 'rejeitado' }, id)) carregar() }
  const excluir = async (id: string) => {
    if (!confirm('Excluir este depoimento? Não dá pra desfazer.')) return
    if (await post({ action: 'delete', id }, id)) carregar()
  }
  const adicionar = async () => {
    if (!nome.trim() || !texto.trim()) { setErro('Preencha nome e texto.'); return }
    if (await post({ action: 'add', nome, papel, texto, status: 'aprovado' }, '__add')) {
      setNome(''); setPapel(''); setTexto(''); setAddOpen(false); carregar()
    }
  }

  const conta = (s: string) => lista.filter(d => d.status === s).length
  const visiveis = filtro === 'todos' ? lista : lista.filter(d => d.status === filtro)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 'clamp(16px,3vw,26px)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>⭐ Depoimentos</div>
            <div style={{ fontSize: 12.5, color: '#777' }}>Aprove os depoimentos dos alunos pra eles aparecerem na landing.</div>
          </div>
          <button onClick={() => setAddOpen(o => !o)} style={btnGold}>{addOpen ? '✕ Fechar' : '+ Adicionar manual'}</button>
        </div>

        {addOpen && (
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome (ex.: Ana P.)" style={{ ...inp, flex: '1 1 200px' }} />
              <input value={papel} onChange={e => setPapel(e.target.value)} placeholder="Papel (ex.: Aprovada OAB)" style={{ ...inp, flex: '1 1 200px' }} />
            </div>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} placeholder="Texto do depoimento..." rows={3} style={{ ...inp, width: '100%', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={adicionar} disabled={busy === '__add'} style={btnGold}>{busy === '__add' ? '⏳ Salvando...' : 'Adicionar (já aprovado)'}</button>
            </div>
          </div>
        )}

        {erro && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {([['pendente', 'Pendentes'], ['aprovado', 'Aprovados'], ['rejeitado', 'Rejeitados'], ['todos', 'Todos']] as const).map(([k, lbl]) => {
            const ativo = filtro === k
            const n = k === 'todos' ? lista.length : conta(k)
            return (
              <button key={k} onClick={() => setFiltro(k)} style={{
                background: ativo ? 'rgba(212,168,67,0.14)' : '#141414',
                border: ativo ? '1px solid rgba(212,168,67,0.5)' : '1px solid rgba(255,255,255,0.07)',
                color: ativo ? '#D4A843' : '#999', borderRadius: 10, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              }}>{lbl} <span style={{ opacity: 0.7 }}>({n})</span></button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[...Array(3)].map((_, i) => <div key={i} style={{ height: 92, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />)}</div>
        ) : visiveis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#555', fontSize: 13 }}>Nenhum depoimento por aqui ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visiveis.map(d => {
              const si = STATUS_INFO[d.status] || STATUS_INFO.pendente
              return (
                <div key={d.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{d.nome}</span>
                      <span style={{ fontSize: 12, color: '#777', marginLeft: 8 }}>{d.papel}</span>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: si.cor, background: si.bg, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{si.label}</span>
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, color: '#ccc', margin: '0 0 12px' }}>&ldquo;{d.texto}&rdquo;</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {d.status !== 'aprovado' && <button onClick={() => aprovar(d.id)} disabled={busy === d.id} style={btnAcao('#34D399')}>{busy === d.id ? '⏳' : '✅ Aprovar'}</button>}
                    {d.status !== 'rejeitado' && <button onClick={() => rejeitar(d.id)} disabled={busy === d.id} style={btnAcao('#F87171')}>❌ Rejeitar</button>}
                    <button onClick={() => excluir(d.id)} disabled={busy === d.id} style={btnAcao('#888')}>🗑 Excluir</button>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#555' }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const card: CSSProperties = { background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }
const inp: CSSProperties = { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }
const btnGold: CSSProperties = { background: 'linear-gradient(135deg,#D4A843,#E8621A)', border: 'none', borderRadius: 10, padding: '9px 16px', color: '#000', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const btnAcao = (cor: string): CSSProperties => ({ background: 'transparent', border: `1px solid ${cor}55`, color: cor, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' })
