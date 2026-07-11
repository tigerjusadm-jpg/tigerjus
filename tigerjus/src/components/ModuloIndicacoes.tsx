'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (v: number) => `R$ ${(Math.round((Number(v) || 0) * 100) / 100).toFixed(2).replace('.', ',')}`

export default function ModuloIndicacoes({ adminId }: { adminId?: string }) {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState<'ranking' | 'extrato'>('ranking')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca] = useState('')

  // ajuste manual
  const [ajUser, setAjUser] = useState<any>(null)
  const [ajValor, setAjValor] = useState('')
  const [ajMotivo, setAjMotivo] = useState('')
  const [ajMsg, setAjMsg] = useState('')
  const [salvando, setSalvando] = useState(false)

  // taxa mp
  const [taxaMp, setTaxaMp] = useState('')

  const carregar = async () => {
    setLoading(true); setErro('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/indicacoes', { headers: { Authorization: `Bearer ${session?.access_token || ''}` } })
      const d = await res.json()
      if (!res.ok) { setErro(d.error || 'Erro ao carregar.'); return }
      setDados(d); setTaxaMp(String(d.resumo?.taxa_mp ?? '1'))
    } catch { setErro('Erro de conexão.') }
    finally { setLoading(false) }
  }
  useEffect(() => { carregar() }, [])

  const salvarAjuste = async () => {
    if (!ajUser) return
    setSalvando(true); setAjMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/indicacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ user_id: ajUser.user_id, valor: Number(ajValor.replace(',', '.')), motivo: ajMotivo }),
      })
      const d = await res.json()
      if (!res.ok) { setAjMsg('❌ ' + (d.error || 'Erro')); return }
      setAjUser(null); setAjValor(''); setAjMotivo(''); await carregar()
    } catch { setAjMsg('❌ Erro de conexão.') }
    finally { setSalvando(false) }
  }

  const salvarTaxa = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/indicacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ acao: 'taxa_mp', valor: Number(taxaMp.replace(',', '.')) }),
      })
      if (res.ok) alert('Taxa atualizada.'); else alert('Erro ao salvar taxa.')
    } catch { alert('Erro de conexão.') }
  }

  const card: any = { background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }
  const th: any = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', padding: '8px 10px', fontWeight: 700 }
  const td: any = { padding: '10px', fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.05)' }
  const inp: any = { background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }

  if (loading) return <div style={{ color: '#888', padding: 40 }}>Carregando indicações…</div>
  if (erro) return <div style={{ color: '#e8621a', padding: 20 }}>{erro}</div>

  const r = dados?.resumo || {}
  const indicadores = (dados?.indicadores || []).filter((i: any) =>
    !busca || (i.nome || '').toLowerCase().includes(busca.toLowerCase()) || (i.email || '').toLowerCase().includes(busca.toLowerCase()))
  const transacoes = (dados?.transacoes || []).filter((t: any) =>
    (!filtroTipo || t.tipo === filtroTipo) &&
    (!busca || (t.dono_nome || '').toLowerCase().includes(busca.toLowerCase())))

  const tipoLabel: Record<string, string> = { comissao: '💰 Comissão', uso_assinatura: '🛒 Uso (própria)', uso_presente: '🎁 Presente', ajuste: '⚙️ Ajuste' }

  return (
    <div style={{ color: '#fff' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🤝 Indicações & Carteira</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Controle total do Programa Tigre Embaixador: comissões, saldos, uso e ajustes.</p>

      {/* RESUMO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <div style={card}><div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Comissões pagas</div><div style={{ fontSize: 26, fontWeight: 900, color: '#4caf7d' }}>{fmt(r.total_comissao)}</div></div>
        <div style={card}><div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Créditos usados</div><div style={{ fontSize: 26, fontWeight: 900, color: '#D4A843' }}>{fmt(r.total_usado)}</div></div>
        <div style={card}><div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo em circulação</div><div style={{ fontSize: 26, fontWeight: 900 }}>{fmt(r.saldo_circulacao)}</div></div>
        <div style={card}><div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Indicadores</div><div style={{ fontSize: 26, fontWeight: 900 }}>{r.indicadores || 0}</div></div>
      </div>

      {/* TAXA MP */}
      <div style={{ ...card, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13 }}><b>Taxa Mercado Pago</b> (para o líquido da comissão): </div>
        <input value={taxaMp} onChange={e => setTaxaMp(e.target.value)} style={{ ...inp, width: 80 }} /> <span style={{ color: '#888' }}>%</span>
        <button onClick={salvarTaxa} style={{ ...inp, background: '#D4A843', color: '#000', fontWeight: 700, cursor: 'pointer', border: 'none' }}>Salvar</button>
        <span style={{ fontSize: 11, color: '#888' }}>Faixas: 1 ativo=3% · 2-4=5% · 5-9=7% · 10+=10%</span>
      </div>

      {/* ABAS + BUSCA */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setAba('ranking')} style={{ ...inp, background: aba === 'ranking' ? '#D4A843' : 'transparent', color: aba === 'ranking' ? '#000' : '#fff', fontWeight: 700, cursor: 'pointer' }}>Ranking de indicadores</button>
        <button onClick={() => setAba('extrato')} style={{ ...inp, background: aba === 'extrato' ? '#D4A843' : 'transparent', color: aba === 'extrato' ? '#000' : '#fff', fontWeight: 700, cursor: 'pointer' }}>Extrato global</button>
        <input placeholder="🔎 buscar nome/e-mail" value={busca} onChange={e => setBusca(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
        {aba === 'extrato' && (
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={inp}>
            <option value="">Todos os tipos</option>
            <option value="comissao">Comissão</option>
            <option value="uso_assinatura">Uso próprio</option>
            <option value="uso_presente">Presente</option>
            <option value="ajuste">Ajuste</option>
          </select>
        )}
      </div>

      {/* RANKING */}
      {aba === 'ranking' && (
        <div style={{ ...card, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead><tr><th style={th}>Indicador</th><th style={th}>Ativos</th><th style={th}>%</th><th style={th}>Saldo</th><th style={th}>Ganho</th><th style={th}>Usado</th><th style={th}></th></tr></thead>
            <tbody>
              {indicadores.length === 0 && <tr><td style={td} colSpan={7}><span style={{ color: '#888' }}>Nenhum indicador ainda.</span></td></tr>}
              {indicadores.map((i: any) => (
                <tr key={i.user_id}>
                  <td style={td}><div style={{ fontWeight: 700 }}>{i.nome}</div><div style={{ fontSize: 11, color: '#888' }}>{i.email}</div></td>
                  <td style={td}>{i.ativos}</td>
                  <td style={{ ...td, color: '#D4A843', fontWeight: 700 }}>{i.pct}%</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(i.saldo)}</td>
                  <td style={{ ...td, color: '#4caf7d' }}>{fmt(i.total_ganho)}</td>
                  <td style={{ ...td, color: '#888' }}>{fmt(i.total_usado)}</td>
                  <td style={td}><button onClick={() => { setAjUser(i); setAjValor(''); setAjMotivo(''); setAjMsg('') }} style={{ ...inp, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>Ajustar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EXTRATO */}
      {aba === 'extrato' && (
        <div style={{ ...card, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead><tr><th style={th}>Data</th><th style={th}>Dono</th><th style={th}>Tipo</th><th style={th}>Detalhe</th><th style={th}>Valor</th></tr></thead>
            <tbody>
              {transacoes.length === 0 && <tr><td style={td} colSpan={5}><span style={{ color: '#888' }}>Sem transações.</span></td></tr>}
              {transacoes.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(t.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td style={td}>{t.dono_nome}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{tipoLabel[t.tipo] || t.tipo}</td>
                  <td style={{ ...td, fontSize: 12, color: '#aaa' }}>{t.tipo === 'comissao' && t.indicado_nome ? `de ${t.indicado_nome} (${t.percentual_aplicado}% de ${fmt(t.valor_liquido)})` : (t.descricao || '')}</td>
                  <td style={{ ...td, fontWeight: 800, whiteSpace: 'nowrap', color: Number(t.valor) >= 0 ? '#4caf7d' : '#e8621a' }}>{Number(t.valor) >= 0 ? '+' : ''}{fmt(Number(t.valor))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL AJUSTE */}
      {ajUser && (
        <div onClick={() => setAjUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, maxWidth: 420, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Ajuste manual de saldo</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{ajUser.nome} · {ajUser.email}</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Saldo atual: <b style={{ color: '#fff' }}>{fmt(ajUser.saldo)}</b></div>
            <label style={{ fontSize: 12, color: '#888' }}>Valor (use negativo para debitar, ex.: -5,00)</label>
            <input value={ajValor} onChange={e => setAjValor(e.target.value)} placeholder="ex.: 10,00 ou -5,00" style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '4px 0 12px' }} />
            <label style={{ fontSize: 12, color: '#888' }}>Motivo (obrigatório)</label>
            <input value={ajMotivo} onChange={e => setAjMotivo(e.target.value)} placeholder="ex.: cortesia / correção de comissão" style={{ ...inp, width: '100%', boxSizing: 'border-box', margin: '4px 0 12px' }} />
            {ajMsg && <div style={{ fontSize: 12, color: '#e8621a', marginBottom: 10 }}>{ajMsg}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setAjUser(null)} style={{ ...inp, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarAjuste} disabled={salvando || !ajValor || !ajMotivo.trim()} style={{ ...inp, background: '#D4A843', color: '#000', fontWeight: 700, cursor: 'pointer', border: 'none', opacity: (salvando || !ajValor || !ajMotivo.trim()) ? 0.5 : 1 }}>{salvando ? 'Salvando…' : 'Confirmar ajuste'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
