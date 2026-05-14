'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState('metrics')
  const [metrics, setMetrics] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check admin auth
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      // Load data
      const [metricsRes, usersRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        supabase.from('profiles').select('*').order('xp', { ascending: false }).limit(50),
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(20),
      ])
      const metricsData = await metricsRes.json()
      setMetrics(metricsData)
      setUsers(usersRes.data || [])
      setPayments(paymentsRes.data || [])
      setLoading(false)
    })
  }, [])

  const save = () => { setSaved('✅ Salvo com sucesso!'); setTimeout(() => setSaved(''), 2500) }

  const TABS = [
    {k:'metrics',icon:'📊',l:'Métricas'},{k:'users',icon:'👥',l:'Usuários'},
    {k:'payments',icon:'💳',l:'Pagamentos'},{k:'content',icon:'📝',l:'Conteúdos'},
    {k:'quizzes',icon:'📋',l:'Quizzes'},{k:'simulados',icon:'📄',l:'Simulados'},{k:'retention',icon:'🔄',l:'Retenção'},
  ]

  const planColor: Record<string,string> = {free:'rgba(255,255,255,0.06)',start:'rgba(76,175,125,0.1)',plus:'rgba(58,143,232,0.1)',pro:'rgba(212,168,67,0.1)',elite:'rgba(232,98,26,0.1)'}
  const planText: Record<string,string> = {free:'var(--text-muted)',start:'var(--success)',plus:'var(--blue)',pro:'var(--gold)',elite:'var(--orange)'}

  if (loading) return <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--white)'}}>Carregando admin...</div>

  return (
    <div style={{background:'var(--deep-black)',minHeight:'100vh'}}>
      {/* Header */}
      <div style={{background:'var(--black)',borderBottom:'1px solid rgba(212,168,67,0.1)',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:16,fontWeight:900,color:'var(--deep-black)'}}>T</div>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:16,letterSpacing:1}}>TIGERJUS</div>
            <div style={{fontSize:10,color:'var(--text-muted)',letterSpacing:2,textTransform:'uppercase'}}>Painel Admin</div>
          </div>
        </div>
        <Link href="/dashboard" className="btn-secondary" style={{fontSize:12,padding:'8px 18px',textDecoration:'none'}}>← Voltar ao App</Link>
      </div>

      <div style={{display:'flex',minHeight:'calc(100vh - 65px)'}}>
        {/* Sidebar */}
        <div style={{width:230,background:'var(--black)',borderRight:'1px solid rgba(255,255,255,0.05)',padding:'20px 12px',display:'flex',flexDirection:'column',gap:4}}>
          {TABS.map(i=>(
            <button key={i.k} className={`sidebar-item${tab===i.k?' active':''}`} onClick={()=>setTab(i.k)}>
              <span style={{fontSize:17,width:24,textAlign:'center'}}>{i.icon}</span>{i.l}
            </button>
          ))}
        </div>

        {/* Main */}
        <div style={{flex:1,padding:36,overflowY:'auto'}}>

          {/* METRICS */}
          {tab==='metrics' && (
            <div>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Métricas Gerais</h2>
              <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>Visão geral da plataforma em tempo real.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:14,marginBottom:28}}>
                {[
                  {icon:'👥',l:'Usuários Ativos',v:metrics?.users?.total?.toLocaleString()||'—',d:`${metrics?.users?.active_today||0} hoje`},
                  {icon:'💰',l:'MRR',v:`R$${((metrics?.mrr_cents||0)/100).toFixed(2)}`,d:'receita mensal recorrente'},
                  {icon:'📈',l:'Taxa Conversão',v:'14,2%',d:'+2.1% este mês'},
                  {icon:'🔄',l:'Churn Mensal',v:'3,8%',d:'-0.6% este mês'},
                  {icon:'⏱️',l:'Sessão Média',v:'42min',d:'+8min vs semana'},
                  {icon:'🔥',l:'Streak Médio',v:'11 dias',d:'+2 dias vs mês'},
                  {icon:'📋',l:'Questões/dia',v:'8.942',d:'+12% esta semana'},
                  {icon:'⭐',l:'NPS',v:'78',d:'Excelente'},
                ].map(m=>(
                  <div key={m.l} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:22}}>
                    <div style={{fontSize:24,marginBottom:10}}>{m.icon}</div>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:6}}>{m.l}</div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:900}}>{m.v}</div>
                    <div style={{fontSize:12,color:'var(--success)',marginTop:4}}>{m.d}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:16,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}><div style={{fontSize:14,fontWeight:700}}>Distribuição de Planos</div></div>
                <div style={{padding:20}}>
                  {[['Degustação',45,'var(--text-muted)'],['Tiger Start',22,'var(--success)'],['Tiger Plus',18,'var(--blue)'],['Tiger Pro',10,'var(--gold)'],['Tiger Elite',5,'var(--orange)']].map(([p,pct,c])=>(
                    <div key={p} style={{marginBottom:14}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontWeight:700}}>{p}</span><span style={{color:'var(--text-muted)'}}>{pct}%</span></div>
                      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:100,height:6}}><div style={{width:`${pct}%`,height:'100%',background:c,borderRadius:100}} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab==='users' && (
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:24}}>
                <div><h2 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:4}}>Usuários</h2><p style={{fontSize:15,color:'var(--text-muted)'}}>Gerenciar base de usuários.</p></div>
                <button className="btn-gold-sm">Exportar CSV</button>
              </div>
              <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:16,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontSize:14,fontWeight:700}}>Total: {metrics?.users?.total?.toLocaleString() || users.length} usuários</div>
                  <input className="form-input" placeholder="Buscar..." style={{width:200,padding:'6px 12px',fontSize:12}} />
                </div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr style={{background:'rgba(255,255,255,0.02)'}}>
                      {['Nome','E-mail','Plano','XP','Cadastro',''].map(h=><th key={h} style={{textAlign:'left',padding:'11px 16px',fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)'}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {users.map(u=>(
                        <tr key={u.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <td style={{padding:'12px 16px',fontWeight:700}}>{u.name||'—'}</td>
                          <td style={{padding:'12px 16px',color:'var(--text-muted)',fontSize:13}}>{u.email}</td>
                          <td style={{padding:'12px 16px'}}><span style={{fontSize:10,fontWeight:800,letterSpacing:1,padding:'3px 9px',borderRadius:100,textTransform:'uppercase',background:planColor[u.plan]||planColor.free,color:planText[u.plan]||planText.free}}>{u.plan}</span></td>
                          <td style={{padding:'12px 16px',fontFamily:'var(--font-mono)',color:'var(--gold)'}}>{(u.xp||0).toLocaleString()}</td>
                          <td style={{padding:'12px 16px',color:'var(--text-muted)',fontSize:12}}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                          <td style={{padding:'12px 16px'}}><button style={{background:'none',border:'none',color:'var(--gold)',cursor:'pointer',fontSize:12,fontFamily:'var(--font-body)'}}>Ver →</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENTS */}
          {tab==='payments' && (
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:24}}>
                <div><h2 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:4}}>Pagamentos</h2><p style={{fontSize:15,color:'var(--text-muted)'}}>Histórico de transações.</p></div>
                <button className="btn-gold-sm">Exportar</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:14,marginBottom:22}}>
                {[['Receita Hoje','R$892','var(--gold)'],['Semana','R$6.240','var(--success)'],['Mês',`R$${((metrics?.mrr_cents||189000)/100).toFixed(0)}`,'var(--gold)'],['Churn','3 cancelados','var(--orange)']].map(([l,v,c])=>(
                  <div key={l} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:20}}>
                    <div style={{fontSize:11,fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:10}}>{l}</div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:16,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}><div style={{fontSize:14,fontWeight:700}}>Transações Recentes</div></div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr style={{background:'rgba(255,255,255,0.02)'}}>
                      {['ID','Valor','Método','Status','Data'].map(h=><th key={h} style={{textAlign:'left',padding:'11px 16px',fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)'}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {payments.map((p,i)=>(
                        <tr key={p.id||i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <td style={{padding:'12px 16px',fontFamily:'var(--font-mono)',color:'var(--text-muted)',fontSize:11}}>#{p.provider_payment_id?.slice(-6)||i}</td>
                          <td style={{padding:'12px 16px',color:'var(--success)',fontWeight:700}}>R${((p.amount_cents||0)/100).toFixed(2)}</td>
                          <td style={{padding:'12px 16px',fontSize:12,color:'var(--text-muted)'}}>{p.payment_method||'—'}</td>
                          <td style={{padding:'12px 16px'}}><span style={{fontSize:10,fontWeight:800,padding:'3px 9px',borderRadius:100,background:p.status==='approved'?'rgba(76,175,125,0.1)':p.status==='pending'?'rgba(212,168,67,0.1)':'rgba(232,66,26,0.1)',color:p.status==='approved'?'var(--success)':p.status==='pending'?'var(--gold)':'var(--danger)'}}>{p.status}</span></td>
                          <td style={{padding:'12px 16px',color:'var(--text-muted)',fontSize:12}}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CONTENT */}
          {tab==='content' && (
            <div>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Cadastrar Conteúdo</h2>
              <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>Adicionar resumos, PDFs e material de estudo.</p>
              {saved&&<div style={{background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13}}>{saved}</div>}
              <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:16,padding:28}}>
                <div style={{fontSize:16,fontWeight:700,marginBottom:22}}>Novo Conteúdo</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Disciplina</label><select className="form-select"><option>Constitucional</option><option>Penal</option><option>Civil</option><option>Ética OAB</option></select></div>
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Tipo</label><select className="form-select"><option>Resumo</option><option>PDF</option><option>Flashcard</option><option>Mapa Mental</option></select></div>
                </div>
                <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Título</label><input className="form-input" placeholder="Ex: Direitos Fundamentais — Mandado de Segurança" /></div>
                <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Conteúdo</label><textarea className="form-input" rows={6} placeholder="Conteúdo do material..." /></div>
                <div style={{marginBottom:24}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Plano mínimo</label><select className="form-select"><option>Gratuito</option><option>Tiger Start</option><option>Tiger Plus</option><option>Tiger Pro</option><option>Tiger Elite</option></select></div>
                <button className="btn-primary" onClick={save}>SALVAR CONTEÚDO</button>
              </div>
            </div>
          )}

          {/* QUIZZES */}
          {tab==='quizzes' && (
            <div>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Criar Quiz</h2>
              <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>Adicionar questões ao banco de dados.</p>
              {saved&&<div style={{background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13}}>{saved}</div>}
              <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:16,padding:28}}>
                <div style={{fontSize:16,fontWeight:700,marginBottom:22}}>Nova Questão</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Disciplina</label><select className="form-select"><option>Constitucional</option><option>Penal</option><option>Civil</option></select></div>
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Dificuldade</label><select className="form-select"><option>Fácil</option><option>Médio</option><option>Difícil</option></select></div>
                </div>
                <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Enunciado</label><textarea className="form-input" rows={4} placeholder="Digite a questão..." /></div>
                {['A','B','C','D'].map(l=><div key={l} style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Alternativa {l}</label><input className="form-input" placeholder={`Opção ${l}`} /></div>)}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Resposta Correta</label><select className="form-select"><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>XP</label><input className="form-input" placeholder="100" type="number" /></div>
                </div>
                <div style={{marginBottom:24}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Comentário / Gabarito</label><textarea className="form-input" rows={3} placeholder="Explicação da resposta correta..." /></div>
                <button className="btn-primary" onClick={save}>SALVAR QUESTÃO</button>
              </div>
            </div>
          )}

          {/* SIMULADOS */}
          {tab==='simulados' && (
            <div>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Criar Simulado</h2>
              <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>Configurar simulados estilo OAB.</p>
              {saved&&<div style={{background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13}}>{saved}</div>}
              <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:16,padding:28}}>
                <div style={{fontSize:16,fontWeight:700,marginBottom:22}}>Novo Simulado</div>
                <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Título</label><input className="form-input" placeholder="Ex: Simulado OAB 1ª Fase — Maio 2025" /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Tipo</label><select className="form-select"><option>OAB 1ª Fase</option><option>OAB 2ª Fase</option><option>Mini Simulado</option><option>Intensivo</option></select></div>
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Nº de Questões</label><input className="form-input" placeholder="80" type="number" /></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Tempo (min)</label><input className="form-input" placeholder="300" type="number" /></div>
                  <div style={{marginBottom:24}}><label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Plano mínimo</label><select className="form-select"><option>Gratuito</option><option>Tiger Start</option><option>Tiger Pro</option></select></div>
                </div>
                <button className="btn-primary" onClick={save}>CRIAR SIMULADO</button>
              </div>
            </div>
          )}

          {/* RETENTION */}
          {tab==='retention' && (
            <div>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Retenção & Engajamento</h2>
              <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>Saúde do produto e comportamento dos usuários.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:14,marginBottom:28}}>
                {[{icon:'🔥',l:'Streak médio',v:'11 dias',d:'+2 dias'},{icon:'👤',l:'DAU',v:'4.821',d:'+8% esta semana'},{icon:'📅',l:'WAU',v:'9.344',d:'+12%'},{icon:'📆',l:'MAU',v:'12.438',d:'+18%'},{icon:'📋',l:'Questão do Dia',v:'68%',d:'acima da meta'},{icon:'⏱️',l:'Tempo/sessão',v:'42min',d:'meta: 30min ✓'},{icon:'🔄',l:'Retenção D7',v:'61%',d:'benchmark: 55%'},{icon:'📈',l:'Retenção D30',v:'38%',d:'benchmark: 25%'}].map(m=>(
                  <div key={m.l} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:22}}>
                    <div style={{fontSize:24,marginBottom:10}}>{m.icon}</div>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:6}}>{m.l}</div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:900}}>{m.v}</div>
                    <div style={{fontSize:12,color:'var(--success)',marginTop:4}}>{m.d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grain-overlay" />
    </div>
  )
}
