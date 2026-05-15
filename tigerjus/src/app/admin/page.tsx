'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [metrics, setMetrics] = useState({ totalUsers:0, premiumUsers:0, totalRevenue:0, questionsAnswered:0, avgAccuracy:0, activeToday:0 })
  const [users, setUsers] = useState<any[]>([])
  const [tab, setTab] = useState('dashboard')

  useEffect(() => { checkAdmin() }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') { router.push('/dashboard'); return }
    setAuthorized(true)
    loadMetrics()
    loadUsers()
    setLoading(false)
  }

  const loadMetrics = async () => {
    const { data: profiles } = await supabase.from('profiles').select('plano, xp, questoes_respondidas, questoes_corretas, ultimo_acesso')
    if (!profiles) return
    const today = new Date().toISOString().split('T')[0]
    const totalUsers = profiles.length
    const premiumUsers = profiles.filter(p => p.plano !== 'gratuito').length
    const questionsAnswered = profiles.reduce((sum, p) => sum + (p.questoes_respondidas || 0), 0)
    const totalCorrect = profiles.reduce((sum, p) => sum + (p.questoes_corretas || 0), 0)
    const avgAccuracy = questionsAnswered > 0 ? Math.round((totalCorrect / questionsAnswered) * 100) : 0
    const activeToday = profiles.filter(p => p.ultimo_acesso === today).length
    const { data: subs } = await supabase.from('assinaturas').select('valor').eq('status', 'ativo')
    const totalRevenue = subs?.reduce((sum, s) => sum + (s.valor || 0), 0) || 0
    setMetrics({ totalUsers, premiumUsers, totalRevenue, questionsAnswered, avgAccuracy, activeToday })
  }

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50)
    if (data) setUsers(data)
  }

  const updateUserPlan = async (userId: string, plan: string) => {
    await supabase.from('profiles').update({ plano: plan }).eq('id', userId)
    loadUsers()
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{fontSize:48,marginBottom:16}}>🐯</div>
        <div>Verificando acesso...</div>
      </div>
    </div>
  )

  if (!authorized) return null

  const TABS = ['dashboard','usuarios','assinaturas','conteudo']

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',color:'white',fontFamily:'system-ui'}}>
      <div style={{background:'#111',borderBottom:'1px solid #222',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,#D4A843,#E8621A)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#000'}}>T</div>
          <span style={{fontWeight:700,fontSize:18}}>TigerJus <span style={{color:'#D4A843'}}>Admin</span></span>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{background:tab===t?'rgba(212,168,67,0.1)':'transparent',border:tab===t?'1px solid rgba(212,168,67,0.3)':'1px solid transparent',borderRadius:8,padding:'6px 14px',color:tab===t?'#D4A843':'#888',fontSize:13,cursor:'pointer',textTransform:'capitalize'}}>
              {t}
            </button>
          ))}
          <button onClick={() => router.push('/dashboard')}
            style={{background:'transparent',border:'1px solid #333',borderRadius:8,padding:'6px 14px',color:'#888',fontSize:13,cursor:'pointer'}}>
            ← Plataforma
          </button>
        </div>
      </div>

      <div style={{padding:32}}>
        {tab === 'dashboard' && (
          <>
            <h1 style={{fontSize:28,fontWeight:900,marginBottom:8}}>Painel Administrativo</h1>
            <p style={{color:'#888',marginBottom:32}}>Visão geral da plataforma em tempo real.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
              {[
                {label:'Total Usuários',value:metrics.totalUsers,color:'#D4A843',icon:'👥'},
                {label:'Usuários Premium',value:metrics.premiumUsers,color:'#10B981',icon:'💎'},
                {label:'Receita Total',value:`R$${metrics.totalRevenue.toFixed(2)}`,color:'#10B981',icon:'💰'},
                {label:'Questões Respondidas',value:metrics.questionsAnswered.toLocaleString(),color:'#3B82F6',icon:'📝'},
                {label:'Taxa Média Acerto',value:`${metrics.avgAccuracy}%`,color:'#D4A843',icon:'🎯'},
                {label:'Ativos Hoje',value:metrics.activeToday,color:'#E8621A',icon:'🔥'},
              ].map(m => (
                <div key={m.label} style={{background:'#111',border:'1px solid #222',borderRadius:16,padding:24}}>
                  <div style={{fontSize:24,marginBottom:8}}>{m.icon}</div>
                  <div style={{fontSize:12,color:'#888',marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>{m.label}</div>
                  <div style={{fontSize:28,fontWeight:900,color:m.color}}>{m.value}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'usuarios' && (
          <>
            <h1 style={{fontSize:28,fontWeight:900,marginBottom:8}}>Usuários</h1>
            <p style={{color:'#888',marginBottom:24}}>Gerenciar usuários e planos.</p>
            <div style={{background:'#111',border:'1px solid #222',borderRadius:16,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#1a1a1a'}}>
                    {['Nome','Email','Plano','XP','Questões','Ações'].map(h => (
                      <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#888'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{borderTop:'1px solid #1a1a1a',background:i%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
                      <td style={{padding:'12px 16px',fontSize:13}}>{u.nome || '—'}</td>
                      <td style={{padding:'12px 16px',fontSize:13,color:'#888'}}>{u.email}</td>
                      <td style={{padding:'12px 16px'}}>
                        <span style={{fontSize:11,padding:'3px 10px',borderRadius:100,background:u.plano==='gratuito'?'rgba(255,255,255,0.06)':'rgba(212,168,67,0.1)',color:u.plano==='gratuito'?'#888':'#D4A843',fontWeight:700}}>
                          {u.plano?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{padding:'12px 16px',fontSize:13,color:'#D4A843'}}>{(u.xp||0).toLocaleString()}</td>
                      <td style={{padding:'12px 16px',fontSize:13}}>{u.questoes_respondidas||0}</td>
                      <td style={{padding:'12px 16px'}}>
                        <select onChange={e => updateUserPlan(u.id, e.target.value)} value={u.plano}
                          style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:6,padding:'4px 8px',color:'white',fontSize:12,cursor:'pointer'}}>
                          {['gratuito','entrada','premium','elite','admin'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'assinaturas' && (
          <>
            <h1 style={{fontSize:28,fontWeight:900,marginBottom:8}}>Assinaturas</h1>
            <p style={{color:'#888',marginBottom:24}}>Gerenciar assinaturas ativas.</p>
            <div style={{background:'#111',border:'1px solid #222',borderRadius:16,padding:32,textAlign:'center',color:'#888'}}>
              <div style={{fontSize:48,marginBottom:16}}>💳</div>
              <p>Integração com Mercado Pago em configuração.</p>
              <p style={{fontSize:13,marginTop:8}}>As assinaturas aparecerão aqui após ativar o webhook.</p>
            </div>
          </>
        )}

        {tab === 'conteudo' && (
          <>
            <h1 style={{fontSize:28,fontWeight:900,marginBottom:8}}>Conteúdo</h1>
            <p style={{color:'#888',marginBottom:24}}>Gerenciar questões, simulados e resumos.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
              {[
                {icon:'📝',label:'Questões',desc:'Adicionar e editar questões'},
                {icon:'📋',label:'Simulados',desc:'Criar e configurar simulados'},
                {icon:'📚',label:'Resumos',desc:'Gerenciar resumos por disciplina'},
                {icon:'🃏',label:'Flashcards',desc:'Criar flashcards interativos'},
              ].map(c => (
                <div key={c.label} style={{background:'#111',border:'1px solid #222',borderRadius:16,padding:24,cursor:'pointer',transition:'border-color 0.2s'}}
                  onMouseEnter={e => e.currentTarget.style.borderColor='rgba(212,168,67,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#222'}>
                  <div style={{fontSize:32,marginBottom:12}}>{c.icon}</div>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>{c.label}</div>
                  <div style={{fontSize:13,color:'#888'}}>{c.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
