'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Stats {
  total_usuarios: number
  usuarios_premium: number
  usuarios_free: number
  total_questoes: number
  total_simulados: number
  questoes_respondidas: number
}

interface Usuario {
  id: string
  nome: string
  email: string
  plano: string
  xp: number
  level_name: string
  streak: number
  questoes_respondidas: number
  questoes_corretas: number
  role: string
  created_at: string
}

const SELECT_DARK = {
  background: '#1c1c1c',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '12px 16px',
  color: '#ffffff',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  colorScheme: 'dark' as const,
  width: '100%',
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview'|'usuarios'|'questoes'|'simulados'>('overview')
  const [stats, setStats] = useState<Stats>({ total_usuarios:0, usuarios_premium:0, usuarios_free:0, total_questoes:0, total_simulados:0, questoes_respondidas:0 })
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [questoes, setQuestoes] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgTipo, setMsgTipo] = useState<'ok'|'erro'>('ok')

  const [novaQ, setNovaQ] = useState({
    disciplina:'', enunciado:'',
    opcao_a:'', opcao_b:'', opcao_c:'', opcao_d:'',
    resposta_correta:'A', comentario:''
  })

  useEffect(() => { verificarAdmin() }, [])

  const verificarAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'admin') { router.push('/plataforma'); return }
    await carregarDados()
    setLoading(false)
  }

  const carregarDados = async () => {
    const [{ data: users }, { data: qs }, { data: sims }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('questoes_oab').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('provas_oab').select('*'),
    ])
    if (users) {
      setUsuarios(users)
      setStats({
        total_usuarios: users.length,
        usuarios_premium: users.filter(u => u.plano !== 'free').length,
        usuarios_free: users.filter(u => u.plano === 'free').length,
        total_questoes: 0,
        total_simulados: sims?.length || 0,
        questoes_respondidas: users.reduce((acc, u) => acc + (u.questoes_respondidas || 0), 0),
      })
    }
    if (qs) setQuestoes(qs)
    const { count } = await supabase.from('questoes_oab').select('*', { count: 'exact', head: true })
    setStats(s => ({ ...s, total_questoes: count || 0 }))
  }

  const mostrarMsg = (texto: string, tipo: 'ok'|'erro' = 'ok') => {
    setMsg(texto); setMsgTipo(tipo)
    setTimeout(() => setMsg(''), 3000)
  }

  const atualizarPlano = async (userId: string, plano: string) => {
    await supabase.from('profiles').update({ plano }).eq('id', userId)
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, plano } : u))
    mostrarMsg('✅ Plano atualizado!')
  }

  const atualizarRole = async (userId: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    mostrarMsg('✅ Role atualizado!')
  }

  const salvarQuestao = async () => {
    if (!novaQ.disciplina || !novaQ.enunciado || !novaQ.opcao_a || !novaQ.opcao_b || !novaQ.opcao_c || !novaQ.opcao_d) {
      mostrarMsg('❌ Preencha todos os campos obrigatórios.', 'erro'); return
    }
    setSalvando(true)
    const { error } = await supabase.from('questoes_oab').insert({
      disciplina: novaQ.disciplina,
      enunciado: novaQ.enunciado,
      opcao_a: novaQ.opcao_a,
      opcao_b: novaQ.opcao_b,
      opcao_c: novaQ.opcao_c,
      opcao_d: novaQ.opcao_d,
      resposta_correta: novaQ.resposta_correta,
      comentario: novaQ.comentario,
    })
    setSalvando(false)
    if (error) { mostrarMsg(`❌ Erro: ${error.message}`, 'erro'); return }
    mostrarMsg('✅ Questão salva com sucesso!')
    setNovaQ({ disciplina:'', enunciado:'', opcao_a:'', opcao_b:'', opcao_c:'', opcao_d:'', resposta_correta:'A', comentario:'' })
    await carregarDados()
  }

  const deletarQuestao = async (id: string) => {
    if (!confirm('Deletar esta questão?')) return
    await supabase.from('questoes_oab').delete().eq('id', id)
    setQuestoes(prev => prev.filter(q => q.id !== id))
    mostrarMsg('Questão deletada.')
  }

  const usuariosFiltrados = usuarios.filter(u =>
    u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase())
  )

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--deep-black)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚙️</div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:900, color:'var(--gold)' }}>Carregando Admin...</div>
      </div>
    </div>
  )

  const TABS = [
    { key:'overview', label:'📊 Overview' },
    { key:'usuarios', label:'👥 Usuários' },
    { key:'questoes', label:'📝 Questões' },
    { key:'simulados', label:'📋 Simulados' },
  ] as const

  const DISCIPLINAS = [
    'Constitucional','Administrativo','Penal','Processo Penal','Civil',
    'Processo Civil','Trabalho','Processo do Trabalho','Tributário',
    'Empresarial','Ética','Consumidor','Direitos Humanos','Ambiental',
    'Filosofia','Internacional','ECA'
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--deep-black)', color:'var(--white)' }}>
      <style>{`
        .admin-select option { background:#1c1c1c; color:#ffffff; }
        .admin-select:focus { outline: 1px solid rgba(212,168,67,0.5); }
      `}</style>

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:60, background:'rgba(8,8,8,0.97)', borderBottom:'1px solid rgba(212,168,67,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, background:'linear-gradient(135deg,var(--gold),var(--orange))', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:16, fontWeight:900, color:'var(--deep-black)' }}>T</div>
          <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:900, color:'var(--gold)' }}>TIGERJUS ADMIN</span>
          <span style={{ fontSize:10, fontWeight:800, background:'rgba(232,98,26,0.15)', border:'1px solid rgba(232,98,26,0.3)', color:'var(--orange)', padding:'3px 10px', borderRadius:100 }}>PAINEL RESTRITO</span>
        </div>
        <button onClick={() => router.push('/plataforma')} style={{ color:'var(--text-muted)', fontSize:12, border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 14px', background:'none', cursor:'pointer', fontFamily:'var(--font-body)' }}>
          ← Voltar à plataforma
        </button>
      </nav>

      <div style={{ paddingTop:60 }}>
        <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 24px', display:'flex', gap:4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding:'16px 20px', background:'none', border:'none', borderBottom: tab===t.key ? '2px solid var(--gold)' : '2px solid transparent', color: tab===t.key ? 'var(--gold)' : 'var(--text-muted)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ margin:'16px 24px 0', background: msgTipo==='ok'?'rgba(76,175,125,0.1)':'rgba(232,66,26,0.1)', border: `1px solid ${msgTipo==='ok'?'rgba(76,175,125,0.25)':'rgba(232,66,26,0.25)'}`, borderRadius:10, padding:'12px 16px', fontSize:13, color: msgTipo==='ok'?'var(--success)':'#E8421A' }}>
            {msg}
          </div>
        )}

        <div style={{ padding:'24px' }}>

          {tab === 'overview' && (
            <div>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, marginBottom:24 }}>📊 Overview da Plataforma</h1>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:32 }}>
                {[
                  { label:'Total usuários', value:stats.total_usuarios, color:'var(--gold)', icon:'👥' },
                  { label:'Usuários premium', value:stats.usuarios_premium, color:'var(--success)', icon:'⭐' },
                  { label:'Plano free', value:stats.usuarios_free, color:'var(--text-muted)', icon:'🆓' },
                  { label:'Questões no banco', value:stats.total_questoes, color:'var(--gold)', icon:'📝' },
                  { label:'Provas OAB', value:stats.total_simulados, color:'var(--orange)', icon:'📋' },
                  { label:'Questões respondidas', value:stats.questoes_respondidas, color:'var(--success)', icon:'✅' },
                ].map(s => (
                  <div key={s.label} style={{ background:'var(--gray)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:20 }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, color:s.color, marginBottom:4 }}>{s.value.toLocaleString()}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:900, marginBottom:16 }}>🏆 Top 5 usuários por XP</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[...usuarios].sort((a,b) => (b.xp||0)-(a.xp||0)).slice(0,5).map((u,i) => (
                  <div key={u.id} style={{ background:'var(--gray)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontWeight:900, color:'var(--gold)', width:24 }}>#{i+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700 }}>{u.nome}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email} · {u.level_name}</div>
                    </div>
                    <div style={{ fontSize:12, color:'var(--orange)' }}>🔥{u.streak||0}d</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--gold)', fontFamily:'var(--font-mono)' }}>{(u.xp||0).toLocaleString()} XP</div>
                    <div style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:100, background: u.plano==='free'?'rgba(255,255,255,0.06)':'rgba(76,175,125,0.1)', color: u.plano==='free'?'var(--text-muted)':'var(--success)', border:`1px solid ${u.plano==='free'?'rgba(255,255,255,0.08)':'rgba(76,175,125,0.25)'}` }}>
                      {u.plano?.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'usuarios' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
                <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900 }}>👥 Usuários ({usuarios.length})</h1>
                <input placeholder="Buscar por nome ou email..." value={busca} onChange={e => setBusca(e.target.value)}
                  style={{ background:'#1c1c1c', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 16px', color:'#ffffff', fontSize:13, fontFamily:'var(--font-body)', width:280 }} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {usuariosFiltrados.map(u => (
                  <div key={u.id} style={{ background:'var(--gray)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{u.nome}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                        {u.level_name} · {(u.xp||0).toLocaleString()} XP · 🔥{u.streak||0}d · {u.questoes_respondidas||0}q
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <select className="admin-select" value={u.plano||'free'} onChange={e => atualizarPlano(u.id, e.target.value)}
                        style={{ ...SELECT_DARK, width:'auto', padding:'6px 10px', color:'#D4A843', border:'1px solid rgba(212,168,67,0.3)', background:'rgba(212,168,67,0.08)', fontSize:12 }}>
                        {['free','start','plus','pro','elite','premium'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                      </select>
                      <select className="admin-select" value={u.role||'user'} onChange={e => atualizarRole(u.id, e.target.value)}
                        style={{ ...SELECT_DARK, width:'auto', padding:'6px 10px', color:'#E8621A', border:'1px solid rgba(232,98,26,0.3)', background:'rgba(232,98,26,0.08)', fontSize:12 }}>
                        {['user','admin'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                      </select>
                      <div style={{ fontSize:10, color:'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'questoes' && (
            <div>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, marginBottom:24 }}>📝 Questões ({stats.total_questoes})</h1>
              <div style={{ background:'var(--gray)', border:'1px solid rgba(212,168,67,0.15)', borderRadius:20, padding:24, marginBottom:32 }}>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:900, marginBottom:20, color:'var(--gold)' }}>+ Adicionar nova questão</h2>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text-muted)', display:'block', marginBottom:8 }}>Disciplina *</label>
                    <select className="admin-select" value={novaQ.disciplina} onChange={e => setNovaQ(p=>({...p,disciplina:e.target.value}))} style={SELECT_DARK}>
                      <option value="">Selecionar disciplina</option>
                      {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text-muted)', display:'block', marginBottom:8 }}>Gabarito *</label>
                    <select className="admin-select" value={novaQ.resposta_correta} onChange={e => setNovaQ(p=>({...p,resposta_correta:e.target.value}))}
                      style={{ ...SELECT_DARK, color:'#4CAF7D', border:'1px solid rgba(76,175,125,0.3)', background:'rgba(76,175,125,0.08)', fontWeight:700 }}>
                      {['A','B','C','D'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text-muted)', display:'block', marginBottom:8 }}>Enunciado *</label>
                  <textarea value={novaQ.enunciado} onChange={e => setNovaQ(p=>({...p,enunciado:e.target.value}))} rows={4}
                    placeholder="Digite o enunciado da questão..."
                    style={{ width:'100%', background:'#1c1c1c', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', color:'#ffffff', fontSize:14, fontFamily:'var(--font-body)', resize:'vertical' }} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                  {(['a','b','c','d'] as const).map(l => (
                    <div key={l}>
                      <label style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color: novaQ.resposta_correta===l.toUpperCase()?'#4CAF7D':'var(--text-muted)', display:'block', marginBottom:8 }}>
                        Opção {l.toUpperCase()} {novaQ.resposta_correta===l.toUpperCase()&&'✅'}
                      </label>
                      <input value={(novaQ as any)[`opcao_${l}`]} onChange={e => setNovaQ(p=>({...p,[`opcao_${l}`]:e.target.value}))}
                        placeholder={`Texto da opção ${l.toUpperCase()}...`}
                        style={{ width:'100%', background: novaQ.resposta_correta===l.toUpperCase()?'rgba(76,175,125,0.08)':'#1c1c1c', border:`1px solid ${novaQ.resposta_correta===l.toUpperCase()?'rgba(76,175,125,0.3)':'rgba(255,255,255,0.08)'}`, borderRadius:10, padding:'12px 16px', color:'#ffffff', fontSize:13, fontFamily:'var(--font-body)' }} />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom:20 }}>
                  <label style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text-muted)', display:'block', marginBottom:8 }}>Comentário / Justificativa</label>
                  <textarea value={novaQ.comentario} onChange={e => setNovaQ(p=>({...p,comentario:e.target.value}))} rows={3}
                    placeholder="Explique o gabarito (opcional)..."
                    style={{ width:'100%', background:'#1c1c1c', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', color:'#ffffff', fontSize:14, fontFamily:'var(--font-body)', resize:'vertical' }} />
                </div>

                <button onClick={salvarQuestao} disabled={salvando}
                  style={{ background:'linear-gradient(135deg,var(--gold),var(--orange))', border:'none', borderRadius:12, padding:'14px 28px', fontSize:14, fontWeight:800, color:'var(--deep-black)', cursor:'pointer', fontFamily:'var(--font-body)', opacity:salvando?0.7:1 }}>
                  {salvando ? '⏳ Salvando...' : '✅ SALVAR QUESTÃO'}
                </button>
              </div>

              <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:900, marginBottom:16 }}>Últimas 50 questões</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {questoes.map(q => (
                  <div key={q.id} style={{ background:'var(--gray)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'flex-start', gap:14 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontWeight:700, background:'rgba(212,168,67,0.1)', color:'var(--gold)', padding:'2px 8px', borderRadius:100, border:'1px solid rgba(212,168,67,0.2)' }}>{q.disciplina}</span>
                        <span style={{ fontSize:10, fontWeight:700, background:'rgba(76,175,125,0.1)', color:'var(--success)', padding:'2px 8px', borderRadius:100 }}>✅ {q.resposta_correta}</span>
                      </div>
                      <div style={{ fontSize:13, color:'var(--white)', lineHeight:1.5 }}>{q.enunciado?.slice(0,120)}...</div>
                    </div>
                    <button onClick={() => deletarQuestao(q.id)}
                      style={{ background:'rgba(232,66,26,0.1)', border:'1px solid rgba(232,66,26,0.2)', borderRadius:8, padding:'6px 12px', fontSize:11, color:'#E8421A', cursor:'pointer', fontFamily:'var(--font-body)', flexShrink:0 }}>
                      🗑️ Deletar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'simulados' && (
            <div>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, marginBottom:8 }}>📋 Simulados & Provas OAB</h1>
              <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:24 }}>Gerencie as provas oficiais cadastradas no banco.</p>
              <ProvasAdmin />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function ProvasAdmin() {
  const [provas, setProvas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [novaProva, setNovaProva] = useState({ numero_exame:'', edicao:'', total_questoes:'80', taxa_aprovacao_oficial:'0', status:'ativo' })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    const { data } = await supabase.from('provas_oab').select('*').order('numero_exame', { ascending: false })
    if (data) setProvas(data)
    setLoading(false)
  }

  const salvar = async () => {
    if (!novaProva.numero_exame || !novaProva.edicao) { setMsg('❌ Preencha número e edição.'); return }
    setSalvando(true)
    const { error } = await supabase.from('provas_oab').insert({
      numero_exame: parseInt(novaProva.numero_exame),
      edicao: novaProva.edicao,
      total_questoes: parseInt(novaProva.total_questoes),
      taxa_aprovacao_oficial: parseFloat(novaProva.taxa_aprovacao_oficial),
      status: novaProva.status,
    })
    setSalvando(false)
    if (error) { setMsg(`❌ Erro: ${error.message}`); return }
    setMsg('✅ Prova cadastrada!')
    setNovaProva({ numero_exame:'', edicao:'', total_questoes:'80', taxa_aprovacao_oficial:'0', status:'ativo' })
    await carregar()
    setTimeout(() => setMsg(''), 3000)
  }

  const deletar = async (id: string) => {
    if (!confirm('Deletar esta prova?')) return
    await supabase.from('provas_oab').delete().eq('id', id)
    setProvas(prev => prev.filter(p => p.id !== id))
  }

  const INPUT_STYLE = { width:'100%', background:'#1c1c1c', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', color:'#ffffff', fontSize:13, fontFamily:'var(--font-body)' }

  return (
    <div>
      {msg && <div style={{ background: msg.startsWith('❌')?'rgba(232,66,26,0.1)':'rgba(76,175,125,0.1)', border:`1px solid ${msg.startsWith('❌')?'rgba(232,66,26,0.25)':'rgba(76,175,125,0.25)'}`, borderRadius:10, padding:'12px 16px', fontSize:13, color: msg.startsWith('❌')?'#E8421A':'var(--success)', marginBottom:20 }}>{msg}</div>}

      <div style={{ background:'var(--gray)', border:'1px solid rgba(212,168,67,0.15)', borderRadius:20, padding:24, marginBottom:28 }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:900, marginBottom:20, color:'var(--gold)' }}>+ Cadastrar nova prova OAB</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:20 }}>
          {[
            { label:'Nº do exame', key:'numero_exame', placeholder:'46' },
            { label:'Edição', key:'edicao', placeholder:'46º Exame OAB — 2026/1' },
            { label:'Total questões', key:'total_questoes', placeholder:'80' },
            { label:'% aprovação oficial', key:'taxa_aprovacao_oficial', placeholder:'0' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text-muted)', display:'block', marginBottom:8 }}>{f.label}</label>
              <input value={(novaProva as any)[f.key]} onChange={e => setNovaProva(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={INPUT_STYLE} />
            </div>
          ))}
        </div>
        <button onClick={salvar} disabled={salvando}
          style={{ background:'linear-gradient(135deg,var(--gold),var(--orange))', border:'none', borderRadius:12, padding:'14px 28px', fontSize:14, fontWeight:800, color:'var(--deep-black)', cursor:'pointer', fontFamily:'var(--font-body)' }}>
          {salvando ? '⏳ Salvando...' : '✅ CADASTRAR PROVA'}
        </button>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:40, color:'var(--gold)' }}>⏳ Carregando...</div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {provas.map(p => (
            <div key={p.id} style={{ background:'var(--gray)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
              <div style={{ width:44, height:44, borderRadius:10, background:'rgba(212,168,67,0.1)', border:'1px solid rgba(212,168,67,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:14, fontWeight:900, color:'var(--gold)', flexShrink:0 }}>
                {p.numero_exame}º
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{p.edicao}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.total_questoes}q · {p.taxa_aprovacao_oficial}% aprovação · {p.status}</div>
              </div>
              <button onClick={() => deletar(p.id)}
                style={{ background:'rgba(232,66,26,0.1)', border:'1px solid rgba(232,66,26,0.2)', borderRadius:8, padding:'6px 12px', fontSize:11, color:'#E8421A', cursor:'pointer', fontFamily:'var(--font-body)' }}>
                🗑️ Deletar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
