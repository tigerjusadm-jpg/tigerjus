'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * AdminAnalytics — Inteligência de Marketing do TigerJus.
 * Abas: Visão Geral · Ações (leads/churn) · Usuários · Demografia · Retenção
 * Todas as fontes são funções SECURITY DEFINER que só respondem a admin.
 */

const PERIODOS = [{ d: 7, l: '7d' }, { d: 30, l: '30d' }, { d: 90, l: '90d' }]

// nomes amigáveis das abas (as chaves internas do app)
const ABA_LABEL: Record<string, string> = {
  dashboard: 'Início', quiz: 'Quiz', simulados: 'Simulados', flashcards: 'Flashcards',
  disciplines: 'Disciplinas', leis: 'Lei Seca', ia: 'IA', trilhas: 'Trilhas',
  ranking: 'Ranking', referral: 'Indicar', comunidade: 'Comunidade', perfil: 'Meu Perfil',
  resumos: 'Resumos', radar: 'Radar OAB', planos: 'Planos',
}
const labelAba = (k: string) => ABA_LABEL[String(k).toLowerCase()] || (k ? k[0].toUpperCase() + k.slice(1) : '—')
const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n ?? 0))

const C = {
  card: { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 18 } as React.CSSProperties,
  gold: '#D4A843', blue: '#60a5fa', green: '#34d399', red: '#f87171', purple: '#a78bfa', pink: '#f472b6',
  muted: '#666',
}

const btnAcao: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', fontSize: 12, padding: '4px 7px', lineHeight: 1 }

type Tab = 'geral' | 'acoes' | 'usuarios' | 'demografia' | 'retencao'

// ── Templates de abordagem (tom humano, não corporativo — converte mais) ──
const primeiroNome = (n: string) => String(n || '').trim().split(/\s+/)[0] || 'tudo bem'

const TEMPLATES: Record<string, (i: any) => { assunto: string; corpo: string }> = {
  churn_risco: (i) => ({
    assunto: `${primeiroNome(i.nome)}, tá tudo bem?`,
    corpo: `Oi ${primeiroNome(i.nome)}, tudo bem?\n\nAqui é o pessoal do TigerJus. Vi que você não entra há uns dias e queria saber: está tudo certo? Travou em alguma matéria, ou faltou tempo?\n\nSe tiver qualquer dificuldade com a plataforma, me responde aqui que eu te ajudo pessoalmente.\n\nSua aprovação continua sendo nosso objetivo. 🐯\n\nAbraço!`,
  }),
  lead_quente: (i) => ({
    assunto: `${primeiroNome(i.nome)}, ficou alguma dúvida sobre o plano?`,
    corpo: `Oi ${primeiroNome(i.nome)}, tudo bem?\n\nVi que você deu uma olhada nos planos do TigerJus. Ficou alguma dúvida? Posso te explicar o que muda na prática.\n\nCom o plano pago você destrava as questões ilimitadas, os simulados completos e a IA sem limite — que é o que mais ajuda na reta final.\n\nQualquer dúvida, é só responder aqui.\n\nAbraço! 🐯`,
  }),
  power_free: (i) => ({
    assunto: `${primeiroNome(i.nome)}, você está estudando muito! 🔥`,
    corpo: `Oi ${primeiroNome(i.nome)}, tudo bem?\n\nReparei que você tem usado bastante o TigerJus — parabéns pela constância, é isso que aprova!\n\nComo você já está usando bastante, acho que vale te contar: no plano pago as questões e a IA ficam ilimitadas, e você libera os simulados completos. Dá pra estudar sem esbarrar em limite nenhum.\n\nSe quiser, posso te explicar o que muda.\n\nBons estudos! 🐯`,
  }),
}

function soDigitos(t?: string) { return String(t || '').replace(/\D/g, '') }

function abrirEmail(i: any) {
  const t = (TEMPLATES[i.tipo] || TEMPLATES.churn_risco)(i)
  window.open(`mailto:${encodeURIComponent(i.email || '')}?subject=${encodeURIComponent(t.assunto)}&body=${encodeURIComponent(t.corpo)}`, '_blank')
}
function abrirWhats(i: any) {
  const t = (TEMPLATES[i.tipo] || TEMPLATES.churn_risco)(i)
  const tel = soDigitos(i.telefone)
  if (!tel) {
    copiar(t.corpo)
    alert(`${i.nome || 'Este usuário'} ainda não informou o WhatsApp.\n\nA mensagem foi COPIADA — cole no WhatsApp se você tiver o contato por outro meio.\n\n(O campo WhatsApp agora existe no perfil e no checkout: novos usuários vão preencher.)`)
    return
  }
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(t.corpo)}`, '_blank')
}
async function copiar(txt: string) {
  try { await navigator.clipboard.writeText(txt) } catch { /* ignora */ }
}

export default function AdminAnalytics() {
  const [tab, setTab] = useState<Tab>('geral')
  const [dias, setDias] = useState(30)
  const [abas, setAbas] = useState<any[]>([])
  const [funil, setFunil] = useState<any[]>([])
  const [tempo, setTempo] = useState<any[]>([])
  const [acoes, setAcoes] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [demo, setDemo] = useState<any[]>([])
  const [receita, setReceita] = useState<any[]>([])
  const [retencao, setRetencao] = useState<any[]>([])
  const [indicadores, setIndicadores] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<any | null>(null)
  const [form, setForm] = useState<any>({})
  const [salvando, setSalvando] = useState(false)
  const [erroEdit, setErroEdit] = useState('')
  const [confirmaNome, setConfirmaNome] = useState('')
  const [modoExcluir, setModoExcluir] = useState(false)
  const [recarregar, setRecarregar] = useState(0)
  const [load, setLoad] = useState(true)

  useEffect(() => {
    let vivo = true
    setLoad(true)
    ;(async () => {
      try {
        const [a, f, t, ac, us, dm, rc, rt, ind] = await Promise.all([
          supabase.rpc('admin_abas_top', { dias }),
          supabase.rpc('admin_funil', { dias }),
          supabase.rpc('admin_tempo_dia', { dias: Math.min(dias, 30) }),
          supabase.rpc('admin_listas_acao'),
          supabase.rpc('admin_usuarios'),
          supabase.rpc('admin_demografia'),
          supabase.rpc('admin_receita'),
          supabase.rpc('admin_retencao'),
          supabase.rpc('admin_indicadores_top'),
        ])
        if (!vivo) return
        setAbas((a.data as any[]) || [])
        setFunil((((f.data as any[]) || []) as any[]).sort((x, y) => x.ordem - y.ordem))
        setTempo((t.data as any[]) || [])
        setAcoes((ac.data as any[]) || [])
        setUsers((us.data as any[]) || [])
        setDemo((dm.data as any[]) || [])
        setReceita((rc.data as any[]) || [])
        setRetencao((rt.data as any[]) || [])
        setIndicadores((ind.data as any[]) || [])
      } finally { if (vivo) setLoad(false) }
    })()
    return () => { vivo = false }
  }, [dias, recarregar])

  const leads = acoes.filter(a => a.tipo === 'lead_quente')
  const churn = acoes.filter(a => a.tipo === 'churn_risco')
  const power = acoes.filter(a => a.tipo === 'power_free')

  const totalAcessos = abas.reduce((s, x) => s + Number(x.acessos || 0), 0)
  const maxAba = Math.max(1, ...abas.map(x => Number(x.acessos || 0)))
  const cadastrados = Number(funil.find(f => f.ordem === 1)?.usuarios || 0)
  const ativos = Number(funil.find(f => f.ordem === 2)?.usuarios || 0)
  const pagantes = Number(funil.find(f => f.ordem === 5)?.usuarios || 0)
  const conv = cadastrados ? (pagantes / cadastrados * 100) : 0
  const minutos = tempo.reduce((s, x) => s + Number(x.minutos || 0), 0)
  const maxMin = Math.max(1, ...tempo.map(x => Number(x.minutos || 0)))

  const usersFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => [u.nome, u.email, u.cidade, u.uf, u.faculdade, u.plano].some((v: any) => String(v || '').toLowerCase().includes(q)))
  }, [users, busca])

  function abrirEdicao(u: any) {
    setEditando(u)
    setForm({ nome: u.nome || '', email: u.email || '', telefone: u.telefone || '', plano: String(u.plano || 'gratuito').toLowerCase(), cidade: u.cidade || '', uf: u.uf || '', faculdade: u.faculdade || '', periodo: u.periodo || '' })
    setErroEdit(''); setModoExcluir(false); setConfirmaNome('')
  }

  async function salvarUsuario() {
    if (!editando || salvando) return
    setSalvando(true); setErroEdit('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/usuario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ id: editando.id, ...form }),
      })
      const j = await res.json()
      if (!res.ok) { setErroEdit(j.error || 'Não foi possível salvar.'); return }
      setEditando(null); setRecarregar(n => n + 1)
    } catch { setErroEdit('Falha de conexão.') }
    finally { setSalvando(false) }
  }

  async function excluirUsuario() {
    if (!editando || salvando) return
    if (confirmaNome.trim() !== String(editando.nome || '').trim()) { setErroEdit('Digite o nome exatamente como aparece para confirmar.'); return }
    setSalvando(true); setErroEdit('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/usuario', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ id: editando.id }),
      })
      const j = await res.json()
      if (!res.ok) { setErroEdit(j.error || 'Não foi possível excluir.'); return }
      setEditando(null); setRecarregar(n => n + 1)
    } catch { setErroEdit('Falha de conexão.') }
    finally { setSalvando(false) }
  }

  function exportarCSV() {
    const cols = ['nome', 'email', 'telefone', 'plano', 'cidade', 'uf', 'faculdade', 'periodo', 'xp', 'ultimo_acesso', 'dias_inativo', 'acessos']
    const linhas = [cols.join(','), ...usersFiltrados.map(u => cols.map(c => `"${String(u[c] ?? '').replace(/"/g, '""')}"`).join(','))]
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `tigerjus_usuarios_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const kpi = (t: string, v: string, s: string, cor: string) => (
    <div style={{ ...C.card, flex: 1, minWidth: 145 }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700 }}>{t}</div>
      <div style={{ fontSize: 27, fontWeight: 900, color: cor, marginTop: 5 }}>{v}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s}</div>
    </div>
  )

  const TABS: { k: Tab; l: string; n?: number }[] = [
    { k: 'geral', l: '📈 Visão Geral' },
    { k: 'acoes', l: '🔥 Ações', n: leads.length + churn.length },
    { k: 'usuarios', l: '👥 Usuários', n: users.length },
    { k: 'demografia', l: '🗺️ Demografia' },
    { k: 'retencao', l: '💰 Receita & Retenção' },
  ]

  const listaAcao = (titulo: string, sub: string, itens: any[], cor: string, rotulo: (i: any) => string) => (
    <div style={C.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{titulo}</div>
        <span style={{ fontSize: 11, fontWeight: 800, background: cor, color: '#111', padding: '2px 9px', borderRadius: 100 }}>{itens.length}</span>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{sub}</div>
      {itens.length > 0 && (
        <button onClick={() => copiar(itens.map(x => x.email).filter(Boolean).join(', '))}
          style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#999' }}>
          📋 Copiar todos os e-mails ({itens.length})
        </button>
      )}
      {itens.length === 0 && <div style={{ fontSize: 12, color: '#444' }}>Ninguém nesta lista agora.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
        {itens.map((i, k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: `3px solid ${cor}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.nome || '—'}</div>
              <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {i.email || '—'}{i.telefone ? ` · 📱 ${i.telefone}` : ''}{i.uf ? ` · ${i.cidade || ''}/${i.uf}` : ''} · <span style={{ textTransform: 'uppercase' }}>{i.plano}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: cor, fontWeight: 800, whiteSpace: 'nowrap' }}>{rotulo(i)}</span>
              <button onClick={() => abrirEmail(i)} title="Enviar e-mail com texto pronto" style={btnAcao}>📧</button>
              <button onClick={() => abrirWhats(i)} title={i.telefone ? `WhatsApp: ${i.telefone}` : 'Sem WhatsApp cadastrado — copia a mensagem'} style={{ ...btnAcao, opacity: i.telefone ? 1 : 0.4 }}>💬</button>
              <button onClick={() => copiar(i.email || '')} title="Copiar e-mail" style={btnAcao}>📋</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const barras = (titulo: string, dados: { nome: string; a: number; b?: number }[], cor: string, sufixo = '') => (
    <div style={C.card}>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1, color: '#ddd' }}>{titulo}</div>
      {dados.length === 0 ? <div style={{ fontSize: 12, color: '#444' }}>Sem dados ainda.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dados.slice(0, 10).map((d, i) => {
            const max = Math.max(1, ...dados.map(x => x.a))
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, color: '#ddd' }}>{d.nome}</span>
                  <span style={{ color: C.muted }}>{fmt(d.a)}{sufixo}{d.b !== undefined ? ` · ${d.b} pagantes` : ''}</span>
                </div>
                <div style={{ height: 8, borderRadius: 100, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ height: '100%', width: (d.a / max * 100) + '%', background: cor, borderRadius: 100 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const dimensao = (d: string) => demo.filter(x => x.dimensao === d && x.valor !== '(não informado)')
    .map(x => ({ nome: x.valor, a: Number(x.usuarios), b: Number(x.pagantes) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 900, color: '#fff' }}>📊 Inteligência de <span style={{ color: C.gold }}>Marketing</span></h1>
          <p style={{ fontSize: 12, color: C.muted }}>Quem são, o que fazem, quem está pronto pra comprar e quem você está prestes a perder.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODOS.map(p => (
            <button key={p.d} onClick={() => setDias(p.d)} style={{ fontSize: 12, fontWeight: 700, padding: '6px 13px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (dias === p.d ? C.gold : 'rgba(255,255,255,0.1)'), background: dias === p.d ? 'rgba(212,168,67,0.13)' : 'transparent', color: dias === p.d ? C.gold : C.muted }}>{p.l}</button>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 10 }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ fontSize: 13, fontWeight: tab === t.k ? 800 : 500, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', border: 'none', background: tab === t.k ? 'rgba(212,168,67,0.12)' : 'transparent', color: tab === t.k ? C.gold : '#888', display: 'flex', alignItems: 'center', gap: 7 }}>
            {t.l}{t.n ? <span style={{ fontSize: 10, fontWeight: 800, background: tab === t.k ? C.gold : '#333', color: tab === t.k ? '#111' : '#999', borderRadius: 100, padding: '1px 7px' }}>{t.n}</span> : null}
          </button>
        ))}
      </div>

      {load ? <div style={{ ...C.card, textAlign: 'center', color: C.muted }}>Carregando inteligência…</div> : (
        <>
          {tab === 'geral' && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {kpi('Acessos', fmt(totalAcessos), 'telas abertas', C.gold)}
                {kpi('Ativos', fmt(ativos), `de ${fmt(cadastrados)} cadastrados`, C.blue)}
                {kpi('Conversão', conv.toFixed(1) + '%', `${fmt(pagantes)} pagantes`, C.green)}
                {kpi('Engajamento', Math.round(minutos) + ' min', 'tempo no app', C.purple)}
                {kpi('Leads quentes', String(leads.length), 'clicaram upgrade', C.pink)}
                {kpi('Risco de churn', String(churn.length), 'pagantes sumidos', C.red)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
                {barras('Abas mais acessadas', abas.map(a => ({ nome: labelAba(a.aba), a: Number(a.acessos) })), `linear-gradient(90deg,${C.gold},#E8621A)`)}
                <div style={C.card}>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1, color: '#ddd' }}>Funil de conversão</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {funil.map((f, i) => {
                      const base = Number(funil[0]?.usuarios || 1)
                      const pct = base ? Number(f.usuarios) / base * 100 : 0
                      const cores = [C.blue, '#5eead4', C.gold, '#fb923c', C.green]
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600, color: '#ddd' }}>{f.etapa}</span>
                            <span style={{ color: C.muted }}>{fmt(Number(f.usuarios))} · {pct.toFixed(0)}%</span>
                          </div>
                          <div style={{ height: 20, borderRadius: 5, background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ height: '100%', width: Math.max(pct, 2) + '%', background: cores[i % cores.length], borderRadius: 5 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div style={C.card}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1, color: '#ddd' }}>Engajamento por dia <span style={{ color: C.muted, fontWeight: 400 }}>(minutos)</span></div>
                {tempo.length === 0 ? <div style={{ fontSize: 12, color: '#444' }}>Sem dados ainda.</div> : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 130 }}>
                    {tempo.map((t, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div title={`${t.minutos} min · ${t.sessoes} sessões`} style={{ width: '100%', maxWidth: 24, height: (Number(t.minutos) / maxMin * 100) + 'px', minHeight: 2, background: `linear-gradient(180deg,${C.gold},#E8621A)`, borderRadius: '3px 3px 0 0' }} />
                        <span style={{ fontSize: 9, color: C.muted }}>{String(t.dia).slice(8, 10)}/{String(t.dia).slice(5, 7)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'acoes' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 16 }}>
              {listaAcao('🔥 Leads quentes', 'Clicaram em upgrade e ainda NÃO pagaram. Fale com eles hoje.', leads, C.pink, i => `${i.valor}x`)}
              {listaAcao('⚠️ Risco de churn', 'Pagantes que sumiram há 7+ dias. Traga de volta.', churn, C.red, i => `${i.valor}d sem entrar`)}
              {listaAcao('⭐ Power users grátis', 'Usam muito, não pagam. Candidatos naturais a Pro.', power, C.blue, i => `${i.valor} acessos`)}
            </div>
          )}

          {tab === 'usuarios' && (
            <div style={C.card}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail, cidade, faculdade…"
                  style={{ flex: 1, minWidth: 220, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
                <button onClick={exportarCSV} style={{ background: C.gold, color: '#111', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>⬇ Exportar CSV</button>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 560, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: '#1a1a1a' }}>
                      {['Nome', 'E-mail', 'WhatsApp', 'Plano', 'Cidade/UF', 'Faculdade', 'Per.', 'XP', 'Inativo', 'Acessos', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '9px 8px', color: C.muted, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usersFiltrados.map((u, i) => {
                      const inat = Number(u.dias_inativo)
                      const pago = ['pro', 'elite'].includes(String(u.plano).toLowerCase())
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '9px 8px', color: '#eee', fontWeight: 600, whiteSpace: 'nowrap' }}>{u.nome || '—'}</td>
                          <td style={{ padding: '9px 8px', color: '#999' }}>{u.email || '—'}</td>
                          <td style={{ padding: '9px 8px', color: u.telefone ? '#34d399' : '#555' }}>{u.telefone || '—'}</td>
                          <td style={{ padding: '9px 8px' }}><span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100, background: pago ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)', color: pago ? C.green : '#888', textTransform: 'uppercase' }}>{u.plano}</span></td>
                          <td style={{ padding: '9px 8px', color: '#999', whiteSpace: 'nowrap' }}>{u.cidade ? `${u.cidade}/${u.uf || ''}` : '—'}</td>
                          <td style={{ padding: '9px 8px', color: '#999', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.faculdade || '—'}</td>
                          <td style={{ padding: '9px 8px', color: '#999' }}>{u.periodo || '—'}</td>
                          <td style={{ padding: '9px 8px', color: C.gold, fontWeight: 700 }}>{fmt(Number(u.xp))}</td>
                          <td style={{ padding: '9px 8px', color: inat >= 7 ? C.red : '#999', fontWeight: inat >= 7 ? 700 : 400, whiteSpace: 'nowrap' }}>{inat >= 999 ? 'nunca' : `${inat}d`}</td>
                          <td style={{ padding: '9px 8px', color: '#999' }}>{fmt(Number(u.acessos))}</td>
                          <td style={{ padding: '9px 8px' }}>
                            <button onClick={() => abrirEdicao(u)} title="Editar / excluir" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', fontSize: 12, padding: '4px 9px' }}>✏️</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {usersFiltrados.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#444', fontSize: 13 }}>Nenhum usuário encontrado.</div>}
              </div>
            </div>
          )}

          {tab === 'demografia' && (
            <>
              <div style={{ fontSize: 12, color: C.muted, background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                💡 Dados vindos do <b>Meu Perfil</b>. Quanto mais gente preencher, mais preciso fica — considere dar XP por completar o perfil.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
                {barras('Top Estados (UF)', dimensao('uf'), C.blue)}
                {barras('Top Cidades', dimensao('cidade'), C.purple)}
                {barras('Top Faculdades', dimensao('faculdade'), C.pink)}
                {barras('Período do curso', dimensao('periodo'), C.green)}
              </div>
            </>
          )}

          {tab === 'retencao' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
                {barras('Mix de planos', receita.map(r => ({ nome: String(r.plano).toUpperCase(), a: Number(r.usuarios) })), C.green, ' users')}
                <div style={C.card}>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, color: '#ddd' }}>Retenção</div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>Dos que se cadastraram, quantos voltaram depois de 1, 7 e 30 dias.</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {retencao.map((r, i) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 8px' }}>
                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{r.janela}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: Number(r.taxa) >= 40 ? C.green : Number(r.taxa) >= 20 ? C.gold : C.red, marginTop: 4 }}>{r.taxa ?? 0}%</div>
                        <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{r.voltaram}/{r.coorte}</div>
                      </div>
                    ))}
                    {retencao.length === 0 && <div style={{ fontSize: 12, color: '#444' }}>Precisa de mais tempo de coleta.</div>}
                  </div>
                </div>
              </div>
              <div style={C.card}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, color: '#ddd' }}>🤝 Quem traz clientes (indicações)</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Seus embaixadores. Quem converte indicação em pagante merece atenção especial.</div>
                {indicadores.length === 0 ? <div style={{ fontSize: 12, color: '#444' }}>Ninguém indicou ainda.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {indicadores.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#eee' }}>{r.nome || '—'}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{r.email} · código {r.codigo}</div>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{r.indicados} indicados</div>
                          <div style={{ fontSize: 11, color: C.green }}>{r.pagantes} viraram pagantes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Modal editar / excluir usuário ── */}
      {editando && (
        <div onClick={() => !salvando && setEditando(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', background: '#1a1a1a', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>Editar usuário</div>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Alterações valem imediatamente. Mudar o e-mail troca também o login da pessoa.</div>

            {!modoExcluir ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { k: 'nome', l: 'Nome', span: 2 },
                    { k: 'email', l: 'E-mail (login)', span: 2 },
                    { k: 'telefone', l: 'WhatsApp (DDD + número)', span: 1 },
                    { k: 'cidade', l: 'Cidade', span: 1 },
                    { k: 'uf', l: 'UF', span: 1 },
                    { k: 'periodo', l: 'Período', span: 1 },
                    { k: 'faculdade', l: 'Faculdade', span: 2 },
                  ].map(f => (
                    <div key={f.k} style={{ gridColumn: f.span === 2 ? '1 / -1' : undefined }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>{f.l}</label>
                      <input value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                        style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 11px', color: '#fff', fontSize: 13, outline: 'none' }} />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>Plano</label>
                    <select value={form.plano ?? 'gratuito'} onChange={e => setForm({ ...form, plano: e.target.value })}
                      style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 11px', color: '#fff', fontSize: 13, outline: 'none' }}>
                      {['gratuito', 'start', 'pro', 'elite'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                {erroEdit && <div style={{ marginTop: 12, fontSize: 12, color: C.red, fontWeight: 600 }}>{erroEdit}</div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 10 }}>
                  <button onClick={() => { setModoExcluir(true); setErroEdit('') }}
                    style={{ background: 'none', border: '1px solid rgba(248,113,113,0.4)', color: C.red, borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑 Excluir usuário</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditando(null)} disabled={salvando}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#999', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={salvarUsuario} disabled={salvando}
                      style={{ background: C.gold, border: 'none', color: '#111', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? 'Salvando…' : '💾 Salvar'}</button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.red, marginBottom: 6 }}>⚠️ Isso é irreversível</div>
                  <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.6 }}>
                    A conta de <b style={{ color: '#fff' }}>{editando.nome}</b> ({editando.email}) será excluída, junto com o login. O histórico dessa pessoa se perde.
                  </div>
                </div>
                <label style={{ display: 'block', fontSize: 11, color: C.muted, marginBottom: 6 }}>
                  Para confirmar, digite o nome exatamente: <b style={{ color: '#fff' }}>{editando.nome}</b>
                </label>
                <input value={confirmaNome} onChange={e => setConfirmaNome(e.target.value)} placeholder={editando.nome}
                  style={{ width: '100%', background: '#111', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 8, padding: '9px 11px', color: '#fff', fontSize: 13, outline: 'none' }} />
                {erroEdit && <div style={{ marginTop: 10, fontSize: 12, color: C.red, fontWeight: 600 }}>{erroEdit}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                  <button onClick={() => { setModoExcluir(false); setErroEdit(''); setConfirmaNome('') }} disabled={salvando}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#999', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Voltar</button>
                  <button onClick={excluirUsuario} disabled={salvando || confirmaNome.trim() !== String(editando.nome || '').trim()}
                    style={{ background: confirmaNome.trim() === String(editando.nome || '').trim() ? C.red : '#333', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? 'Excluindo…' : 'Excluir definitivamente'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
