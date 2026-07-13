'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
  id: string; email: string; nome: string | null; plano: string | null
  role: string | null; ultimo_acesso: string | null; created_at: string
  xp: number; nivel: number; questoes_respondidas: number
}
interface Assinatura {
  id: string; user_id: string | null; plano: string; status: string
  valor: number | null; inicio: string | null; fim: string | null
  mp_payment_id: string | null; created_at: string
}
interface Payment {
  id: string; user_id: string | null; provider_payment_id: string | null
  status: string; amount: number | null; plan: string | null; created_at: string
}
interface PlanSetting {
  id: string; plano: string; ativo: boolean; cor_plano: string
  cta_texto: string | null; cta_botao: string | null; ordem_exibicao: number
  ia_perguntas_limite: number | null; quiz_questoes_limite: number | null
  flashcards_por_disciplina: number | null; mini_simulado_qtd: number | null
  permite_pdf: boolean; permite_simulado_completo: boolean
  permite_rankings: boolean; permite_radar: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PLANOS = [
  { key:'gratuito', label:'Gratuito', cor:'#6B7280', preco:0      },
  { key:'start',    label:'Start',    cor:'#3B82F6', preco:4.99   },
  { key:'pro',      label:'Pro',      cor:'#EC4899', preco:9.99   },
  { key:'elite',    label:'Elite',    cor:'#D4A843', preco:24.99  },
]

const getPlanCor = (plano: string | null) =>
  PLANOS.find(p => p.key === plano)?.cor || '#6B7280'

// ── Sub-components ────────────────────────────────────────────────────────────
function PlanBadge({ plano }: { plano: string | null }) {
  const p = PLANOS.find(x => x.key === plano)
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:100,
      background:`${p?.cor||'#6B7280'}18`, border:`1px solid ${p?.cor||'#6B7280'}44`,
      color: p?.cor||'#6B7280', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>
      {p?.label || plano || 'Gratuito'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string,{cor:string;bg:string}> = {
    ativo:    { cor:'#34d399', bg:'rgba(52,211,153,0.1)'  },
    pendente: { cor:'#fbbf24', bg:'rgba(251,191,36,0.1)'  },
    cancelado:{ cor:'#f87171', bg:'rgba(248,113,113,0.1)' },
    inativo:  { cor:'#888',    bg:'rgba(255,255,255,0.05)'},
  }
  const c = cfg[status] || cfg.inativo
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100,
      background:c.bg, color:c.cor, border:`1px solid ${c.cor}44` }}>
      {status.charAt(0).toUpperCase()+status.slice(1)}
    </span>
  )
}

function Toggle({ on, onChange }: { on:boolean; onChange:(v:boolean)=>void }) {
  return (
    <div onClick={() => onChange(!on)}
      style={{ width:36, height:20, borderRadius:10, background: on?'#34d399':'#374151',
        position:'relative', cursor:'pointer', flexShrink:0, transition:'background 0.2s' }}>
      <div style={{ position:'absolute', top:2, left: on?18:2, width:16, height:16,
        borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
    </div>
  )
}

// ── Plan Change Drawer ────────────────────────────────────────────────────────
function PlanoDrawer({ user, adminId, onClose, onSaved }:{
  user: Profile; adminId?: string; onClose:()=>void; onSaved:()=>void
}) {
  const [novoPlano, setNovoPlano] = useState(user.plano || 'gratuito')
  const [motivo, setMotivo] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState(false)

  const salvar = async () => {
    if (!motivo.trim()) { setMsg('❌ Informe o motivo da alteração.'); return }
    if (!confirm) { setConfirm(true); return }
    setSaving(true); setMsg('')
    const planoAnterior = user.plano
    // SEGURANÇA: mudança de plano vai pelo servidor (valida admin no banco), nunca direto pelo cliente.
    const { data: { session } } = await supabase.auth.getSession()
    const resp = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ action: 'update', targetId: user.id, plano: novoPlano, role: (user as any).role }),
    })
    const out = await resp.json().catch(() => ({} as any))
    if (!resp.ok) { setMsg('❌ Erro: ' + (out?.error || 'falha ao alterar plano')); setSaving(false); return }
    await supabase.from('admin_audit_logs').insert({
      user_id: adminId, action_type: 'UPDATE', target_type: 'user_plan',
      target_id: user.id,
      metadata: { plano_anterior: planoAnterior, plano_novo: novoPlano,
        motivo, observacao: obs || null, usuario_email: user.email, admin_id: adminId },
    })
    setMsg('✅ Plano alterado com sucesso!'); setTimeout(() => { onSaved(); onClose() }, 900)
    setSaving(false)
  }

  return (
    <>
      <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(3px)' }} onClick={onClose}/>
      <div style={{ position:'fixed',top:0,right:0,bottom:0,zIndex:201,width:520,maxWidth:'100vw',
        background:'#111',borderLeft:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'18px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'#0d0d0d',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15,fontWeight:700,color:'#fff' }}>Alterar Plano</div>
            <div style={{ fontSize:11,color:'#555',marginTop:2 }}>{user.email}</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'#555',fontSize:22,cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:16 }}>
          <div style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:14 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:'#555',marginBottom:8 }}>USUÁRIO</div>
            <div style={{ fontSize:14,fontWeight:600,color:'#fff',marginBottom:4 }}>{user.nome || user.email}</div>
            <div style={{ display:'flex',gap:8,alignItems:'center' }}>
              <PlanBadge plano={user.plano}/>
              <span style={{ fontSize:12,color:'#555' }}>plano atual</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:8 }}>NOVO PLANO</label>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              {PLANOS.map(p => (
                <button key={p.key} onClick={() => setNovoPlano(p.key)}
                  style={{ padding:'8px 16px',borderRadius:8,border:`1px solid ${novoPlano===p.key?p.cor:'rgba(255,255,255,0.1)'}`,
                    background:novoPlano===p.key?`${p.cor}18`:'transparent',
                    color:novoPlano===p.key?p.cor:'#777',fontSize:12,fontWeight:novoPlano===p.key?700:400,cursor:'pointer' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6 }}>MOTIVO * (obrigatório)</label>
            <select value={motivo} onChange={e => { setMotivo(e.target.value); setConfirm(false) }}
              style={{ width:'100%',background:'#1a1a1a',border:`1px solid ${motivo?'rgba(212,168,67,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:8,padding:'9px 12px',color:motivo?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit' }}>
              <option value="">Selecione o motivo...</option>
              <option value="cortesia">Cortesia / Presente</option>
              <option value="suporte">Correção de suporte (pagamento não processado)</option>
              <option value="teste">Conta de teste / Desenvolvimento</option>
              <option value="reembolso">Reembolso (downgrade manual)</option>
              <option value="parceria">Parceria / Influenciador</option>
              <option value="erro_sistema">Correção de erro do sistema</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6 }}>OBSERVAÇÃO INTERNA (opcional)</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Detalhes adicionais para o audit log..."
              style={{ width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#ccc',fontSize:12,outline:'none',resize:'vertical',fontFamily:'inherit',lineHeight:1.6,boxSizing:'border-box' as const }}/>
          </div>
          {confirm && (
            <div style={{ background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:10,padding:'12px 14px',fontSize:13,color:'#fbbf24' }}>
              ⚠️ Confirme: alterar <strong>{user.nome || user.email}</strong> de <strong>{user.plano || 'gratuito'}</strong> → <strong>{novoPlano}</strong>. Esta ação será auditada.
            </div>
          )}
          {msg && <div style={{ padding:'8px 12px',background:msg.startsWith('✅')?'rgba(52,211,153,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.startsWith('✅')?'#34d399':'#ef4444'}44`,borderRadius:8,fontSize:12,color:msg.startsWith('✅')?'#34d399':'#f87171' }}>{msg}</div>}
        </div>
        <div style={{ padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,0.07)',background:'#0d0d0d' }}>
          <button onClick={salvar} disabled={saving||!motivo}
            style={{ width:'100%',background:confirm?'linear-gradient(135deg,#f59e0b,#E8621A)':'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'12px',color:'#000',fontSize:13,fontWeight:700,cursor:saving||!motivo?'not-allowed':'pointer',opacity:!motivo?0.5:1 }}>
            {saving?'⏳ Salvando...' : confirm?'✅ CONFIRMAR ALTERAÇÃO':'💾 Salvar Alteração'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ModuloPlanos({ adminId }:{ adminId?:string }) {
  const [tab, setTab] = useState<'overview'|'usuarios'|'assinaturas'|'config'>('overview')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [planSettings, setPlanSettings] = useState<PlanSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('all')
  const [userSearch, setUserSearch] = useState('')
  const [editUser, setEditUser] = useState<Profile|null>(null)
  const [savingConfig, setSavingConfig] = useState<string|null>(null)
  const [configMsg, setConfigMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const [pRes, aRes, payRes, psRes] = await Promise.all([
      fetch('/api/admin/list-users', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
        .then(r => r.json()).catch(() => ({ users: [] })),
      supabase.from('assinaturas').select('*').order('created_at',{ascending:false}),
      supabase.from('payments').select('*').order('created_at',{ascending:false}).limit(50),
      supabase.from('plan_settings').select('*').order('ordem_exibicao'),
    ])
    setProfiles(pRes.users || [])
    setAssinaturas(aRes.data || [])
    setPayments(payRes.data || [])
    setPlanSettings(psRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Computed metrics ──────────────────────────────────────────────────────
  const profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]))
  const totalUsers  = profiles.length
  const pagos       = profiles.filter(p => p.plano && p.plano !== 'gratuito').length
  const gratuitos   = totalUsers - pagos
  const conversao   = totalUsers > 0 ? Math.round((pagos/totalUsers)*100) : 0
  const ativasCount = assinaturas.filter(a => a.status === 'ativo' && a.user_id).length
  const pendentes   = assinaturas.filter(a => a.status === 'pendente').length
  const orfas       = assinaturas.filter(a => !a.user_id).length
  const mrr         = assinaturas.filter(a => a.status==='ativo' && a.user_id && a.valor)
    .reduce((s,a) => s + (a.valor||0), 0)

  const contPorPlano = PLANOS.reduce((acc,p) => {
    acc[p.key] = profiles.filter(u => (u.plano || 'gratuito') === p.key).length; return acc
  },{} as Record<string,number>)

  // Inconsistências
  const inconsistencias = assinaturas.filter(a => {
    if (!a.user_id) return false
    const p = profilesMap[a.user_id]
    if (!p) return false
    if (a.status === 'ativo' && (!p.plano || p.plano === 'gratuito')) return true
    if (a.status === 'ativo' && a.plano !== p.plano) return true
    if (a.status === 'cancelado' && p.plano && p.plano !== 'gratuito') return true
    return false
  })

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = (tipo:'usuarios'|'assinaturas') => {
    let csv = '', filename = ''
    if (tipo === 'usuarios') {
      csv = 'Email,Nome,Plano,Role,Ultimo Acesso,Cadastro\n' +
        profiles.map(p => `${p.email},${p.nome||''},${p.plano||'gratuito'},${p.role||'user'},${p.ultimo_acesso||''},${p.created_at?.slice(0,10)}`).join('\n')
      filename = 'tigerjus_usuarios.csv'
    } else {
      csv = 'ID,User ID,Plano,Status,Valor,MP Payment ID,Inicio,Fim,Criado\n' +
        assinaturas.map(a => `${a.id},${a.user_id||'null'},${a.plano},${a.status},${a.valor||''},${a.mp_payment_id||''},${a.inicio?.slice(0,10)||''},${a.fim?.slice(0,10)||''},${a.created_at?.slice(0,10)}`).join('\n')
      filename = 'tigerjus_assinaturas.csv'
    }
    const blob = new Blob([csv], {type:'text/csv'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Users filtered ────────────────────────────────────────────────────────
  const usersFiltrados = profiles.filter(u => {
    if (userFilter === 'admins'  && u.role !== 'admin') return false
    if (userFilter === 'comuns'  && u.role === 'admin') return false
    if (userFilter !== 'all' && userFilter !== 'admins' && userFilter !== 'comuns' && (u.plano||'gratuito') !== userFilter) return false
    if (userSearch) {
      const q = userSearch.toLowerCase()
      if (!u.email.toLowerCase().includes(q) && !(u.nome||'').toLowerCase().includes(q) && !(u.plano||'').toLowerCase().includes(q)) return false
    }
    return true
  })

  // ── Plan settings save ────────────────────────────────────────────────────
  const saveConfig = async (ps: PlanSetting, field: string, value: unknown) => {
    setSavingConfig(ps.id+field)
    const { error } = await supabase.from('plan_settings').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', ps.id)
    if (!error) {
      setPlanSettings(prev => prev.map(p => p.id === ps.id ? { ...p, [field]: value } : p))
      setConfigMsg('✅ Salvo!'); setTimeout(() => setConfigMsg(''), 2000)
    } else { setConfigMsg('❌ Erro: ' + error.message) }
    setSavingConfig(null)
  }

  const TABS = [
    { key:'overview',     label:'📊 Visão Geral'    },
    { key:'usuarios',     label:'👥 Usuários'         },
    { key:'assinaturas',  label:'💳 Assinaturas'     },
    { key:'config',       label:'⚙️ Configurações'  },
  ] as const

  if (loading) return <div style={{ textAlign:'center',padding:60,color:'#555' }}><div style={{ fontSize:36,marginBottom:16 }}>⏳</div>Carregando planos...</div>

  return (
    <div style={{ color:'#fff',fontFamily:'inherit' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12 }}>
        <div>
          <h2 style={{ fontSize:22,fontWeight:900,marginBottom:4 }}>Planos e Assinaturas 💳</h2>
          <div style={{ fontSize:13,color:'#555' }}>Monitore usuários, planos ativos, assinaturas e ajustes manuais.</div>
        </div>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
          <button onClick={load} style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 14px',color:'#888',fontSize:12,cursor:'pointer' }}>🔄 Atualizar</button>
          <button onClick={() => exportCSV('usuarios')} style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 14px',color:'#888',fontSize:12,cursor:'pointer' }}>📥 CSV Usuários</button>
          <button onClick={() => exportCSV('assinaturas')} style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 14px',color:'#888',fontSize:12,cursor:'pointer' }}>📥 CSV Assinaturas</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'9px 18px',background:'transparent',border:'none',cursor:'pointer',fontSize:13,
              fontWeight:tab===t.key?700:400,color:tab===t.key?'#D4A843':'#666',
              borderBottom:tab===t.key?'2px solid #D4A843':'2px solid transparent',
              transition:'all 0.15s',whiteSpace:'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: VISÃO GERAL ── */}
      {tab === 'overview' && (
        <div>
          {/* Metrics */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:24 }}>
            {[
              { label:'Total Usuários',   value:totalUsers,  color:'#60a5fa', icon:'👥' },
              { label:'Gratuitos',        value:gratuitos,   color:'#6B7280', icon:'🆓' },
              { label:'Pagos',            value:pagos,       color:'#34d399', icon:'✅' },
              { label:'Conversão',        value:`${conversao}%`, color:'#a78bfa', icon:'📈' },
              { label:'MRR Estimado',     value:`R$${mrr.toFixed(2)}`, color:'#D4A843', icon:'💰' },
              { label:'Assin. Ativas',    value:ativasCount, color:'#34d399', icon:'⚡' },
              { label:'Pendentes',        value:pendentes,   color:'#fbbf24', icon:'⏳' },
              { label:'Órfãs',            value:orfas,       color:orfas>0?'#f87171':'#555', icon:'⚠️' },
            ].map(m => (
              <div key={m.label} style={{ background:'#1a1a1a',border:`1px solid ${typeof m.value==='number'&&m.value>0&&m.color==='#f87171'?'rgba(248,113,113,0.2)':'rgba(255,255,255,0.06)'}`,borderRadius:12,padding:'14px 16px',textAlign:'center' }}>
                <div style={{ fontSize:18,marginBottom:6 }}>{m.icon}</div>
                <div style={{ fontSize:20,fontWeight:900,color:m.color }}>{m.value}</div>
                <div style={{ fontSize:10,color:'#555',marginTop:2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* MRR por plano */}
          <div style={{ background:'#1a1a1a',border:'1px solid rgba(212,168,67,0.12)',borderRadius:14,padding:20,marginBottom:20 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:'#D4A843',marginBottom:16 }}>💰 MRR POR PLANO (assinaturas ativas)</div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {PLANOS.filter(p=>p.preco>0).map(p => {
                const ativos = assinaturas.filter(a => a.status==='ativo' && a.plano===p.key && a.user_id && a.valor)
                const mrrP   = ativos.reduce((s,a)=>s+(a.valor||0),0)
                return (
                  <div key={p.key} style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <div style={{ width:60,textAlign:'right' }}><PlanBadge plano={p.key}/></div>
                    <div style={{ flex:1,height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden' }}>
                      <div style={{ width: mrr>0?`${Math.round((mrrP/mrr)*100)}%`:'0%',height:'100%',background:p.cor,borderRadius:4,transition:'width 0.5s' }}/>
                    </div>
                    <div style={{ fontSize:12,color:'#D4A843',width:80,textAlign:'right',fontWeight:700 }}>R${mrrP.toFixed(2)}</div>
                    <div style={{ fontSize:11,color:'#555',width:60 }}>{ativos.length} ativa{ativos.length!==1?'s':''}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Distribuição */}
          <div style={{ background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:20,marginBottom:20 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:'#888',marginBottom:16 }}>📊 DISTRIBUIÇÃO DE USUÁRIOS POR PLANO</div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {PLANOS.map(p => {
                const cnt = contPorPlano[p.key]||0
                const pct = totalUsers>0?Math.round((cnt/totalUsers)*100):0
                return (
                  <div key={p.key} style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <div style={{ width:70 }}><PlanBadge plano={p.key}/></div>
                    <div style={{ flex:1,height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`,height:'100%',background:p.cor,borderRadius:4,transition:'width 0.5s' }}/>
                    </div>
                    <div style={{ fontSize:12,fontWeight:700,color:p.cor,width:28,textAlign:'right' }}>{cnt}</div>
                    <div style={{ fontSize:11,color:'#555',width:36 }}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Alertas */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12 }}>
            {/* Órfãs */}
            {orfas > 0 && (
              <div style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:12,padding:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#f87171',marginBottom:8 }}>⚠️ ASSINATURAS ÓRFÃS</div>
                <div style={{ fontSize:22,fontWeight:900,color:'#f87171',marginBottom:4 }}>{orfas}</div>
                <div style={{ fontSize:12,color:'#888',lineHeight:1.6 }}>Assinaturas sem user_id vinculado. Pagamentos possivelmente não atribuídos.</div>
                <button onClick={() => setTab('assinaturas')} style={{ marginTop:10,padding:'6px 14px',background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:6,color:'#f87171',fontSize:11,cursor:'pointer',fontWeight:700 }}>Ver assinaturas →</button>
              </div>
            )}
            {/* Inconsistências */}
            {inconsistencias.length > 0 && (
              <div style={{ background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:12,padding:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#fbbf24',marginBottom:8 }}>🔄 INCONSISTÊNCIAS DE PLANO</div>
                <div style={{ fontSize:22,fontWeight:900,color:'#fbbf24',marginBottom:4 }}>{inconsistencias.length}</div>
                <div style={{ fontSize:12,color:'#888',lineHeight:1.6 }}>Usuários com plano no perfil diferente da assinatura ativa. Requer revisão manual.</div>
                <button onClick={() => setTab('usuarios')} style={{ marginTop:10,padding:'6px 14px',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.3)',borderRadius:6,color:'#fbbf24',fontSize:11,cursor:'pointer',fontWeight:700 }}>Ver usuários →</button>
              </div>
            )}
            {/* Pendentes */}
            {pendentes > 0 && (
              <div style={{ background:'rgba(96,165,250,0.06)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:12,padding:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#60a5fa',marginBottom:8 }}>⏳ PAGAMENTOS PENDENTES</div>
                <div style={{ fontSize:22,fontWeight:900,color:'#60a5fa',marginBottom:4 }}>{pendentes}</div>
                <div style={{ fontSize:12,color:'#888',lineHeight:1.6 }}>Assinaturas com status pendente aguardando confirmação do Mercado Pago.</div>
                <button onClick={() => setTab('assinaturas')} style={{ marginTop:10,padding:'6px 14px',background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.3)',borderRadius:6,color:'#60a5fa',fontSize:11,cursor:'pointer',fontWeight:700 }}>Ver assinaturas →</button>
              </div>
            )}
            {inconsistencias.length===0 && orfas===0 && pendentes===0 && (
              <div style={{ background:'rgba(52,211,153,0.06)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:12,padding:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#34d399',marginBottom:8 }}>✅ TUDO OK</div>
                <div style={{ fontSize:14,color:'#888',lineHeight:1.6 }}>Nenhuma inconsistência ou alerta detectado no momento.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: USUÁRIOS ── */}
      {tab === 'usuarios' && (
        <div>
          <div style={{ display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center' }}>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {[{k:'all',l:'Todos'},{k:'gratuito',l:'Gratuito'},{k:'start',l:'Start'},{k:'pro',l:'Pro'},{k:'elite',l:'Elite'},{k:'admins',l:'Admins'},{k:'comuns',l:'Comuns'}].map(f=>(
                <button key={f.k} onClick={()=>setUserFilter(f.k)}
                  style={{ padding:'5px 12px',borderRadius:100,fontSize:11,cursor:'pointer',
                    border:userFilter===f.k?`1px solid ${getPlanCor(f.k==='all'||f.k==='admins'||f.k==='comuns'?null:f.k)}`:'1px solid rgba(255,255,255,0.08)',
                    background:userFilter===f.k?`${getPlanCor(f.k==='all'||f.k==='admins'||f.k==='comuns'?null:f.k)}18`:'transparent',
                    color:userFilter===f.k?getPlanCor(f.k==='all'||f.k==='admins'||f.k==='comuns'?null:f.k):'#666' }}>
                  {f.l} {f.k==='all'?profiles.length : f.k==='admins'?profiles.filter(p=>p.role==='admin').length : f.k==='comuns'?profiles.filter(p=>p.role!=='admin').length : profiles.filter(p=>(p.plano||'gratuito')===f.k).length}
                </button>
              ))}
            </div>
            <div style={{ flex:1,minWidth:220,position:'relative' }}>
              <input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Buscar por email, nome ou plano..."
                style={{ width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'7px 12px 7px 32px',color:'#fff',fontSize:12,outline:'none',boxSizing:'border-box' as const }}/>
              <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#555',fontSize:13 }}>🔍</span>
            </div>
            <button onClick={()=>exportCSV('usuarios')} style={{ padding:'7px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#666',fontSize:11,cursor:'pointer' }}>📥 CSV</button>
          </div>
          <div style={{ fontSize:12,color:'#555',marginBottom:12 }}>{usersFiltrados.length} usuário{usersFiltrados.length!==1?'s':''}</div>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {usersFiltrados.map(u => {
              const assinAtiva = assinaturas.find(a=>a.user_id===u.id&&a.status==='ativo')
              const inconsist  = assinAtiva && assinAtiva.plano !== u.plano
              return (
                <div key={u.id} style={{ background:'#1a1a1a',border:`1px solid ${inconsist?'rgba(251,191,36,0.2)':'rgba(255,255,255,0.06)'}`,borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',transition:'border-color 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(212,168,67,0.2)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=inconsist?'rgba(251,191,36,0.2)':'rgba(255,255,255,0.06)'}>
                  <div style={{ width:36,height:36,borderRadius:10,background:`${getPlanCor(u.plano)}18`,border:`1px solid ${getPlanCor(u.plano)}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 }}>
                    {u.nome?u.nome[0].toUpperCase():'?'}
                  </div>
                  <div style={{ flex:1,minWidth:180 }}>
                    <div style={{ fontSize:13,fontWeight:600,color:'#fff',marginBottom:2 }}>{u.nome||'Sem nome'}</div>
                    <div style={{ fontSize:11,color:'#666' }}>{u.email}</div>
                  </div>
                  <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
                    <PlanBadge plano={u.plano||'gratuito'}/>
                    {u.role==='admin'&&<span style={{ fontSize:9,padding:'2px 6px',borderRadius:4,background:'rgba(212,168,67,0.1)',color:'#D4A843',border:'1px solid rgba(212,168,67,0.2)' }}>ADMIN</span>}
                    {inconsist&&<span style={{ fontSize:9,padding:'2px 6px',borderRadius:4,background:'rgba(251,191,36,0.1)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.2)' }}>⚠️ INCONSIST.</span>}
                    {u.ultimo_acesso&&<span style={{ fontSize:10,color:'#555' }}>{u.ultimo_acesso}</span>}
                  </div>
                  <button onClick={()=>setEditUser(u)} style={{ padding:'6px 14px',background:'rgba(212,168,67,0.08)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:8,color:'#D4A843',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0 }}>
                    Alterar Plano
                  </button>
                </div>
              )
            })}
            {usersFiltrados.length===0&&<div style={{ textAlign:'center',padding:40,color:'#555' }}>Nenhum usuário encontrado.</div>}
          </div>
        </div>
      )}

      {/* ── TAB: ASSINATURAS ── */}
      {tab === 'assinaturas' && (
        <div>
          <div style={{ fontSize:12,color:'#555',marginBottom:14 }}>{assinaturas.length} assinaturas · {payments.length} pagamentos recentes</div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:'#888',marginBottom:12 }}>ASSINATURAS</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {assinaturas.map(a=>{
                const user = a.user_id ? profilesMap[a.user_id] : null
                const isOrfa = !a.user_id
                return (
                  <div key={a.id} style={{ background:'#1a1a1a',border:`1px solid ${isOrfa?'rgba(248,113,113,0.2)':'rgba(255,255,255,0.06)'}`,borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
                    <div style={{ flex:1,minWidth:200 }}>
                      {isOrfa
                        ? <div style={{ fontSize:12,color:'#f87171',fontWeight:600 }}>⚠️ Assinatura Órfã (sem user_id)</div>
                        : <><div style={{ fontSize:13,fontWeight:600,color:'#fff',marginBottom:2 }}>{user?.nome||user?.email||'Usuário não encontrado'}</div>
                           <div style={{ fontSize:11,color:'#666' }}>{user?.email||a.user_id}</div></>
                      }
                    </div>
                    <PlanBadge plano={a.plano}/>
                    <StatusBadge status={a.status}/>
                    {a.valor&&<span style={{ fontSize:12,fontWeight:700,color:'#D4A843' }}>R${a.valor.toFixed(2)}</span>}
                    {a.fim&&<span style={{ fontSize:10,color:'#555' }}>até {a.fim.slice(0,10)}</span>}
                    {a.mp_payment_id&&<span style={{ fontSize:9,color:'#444',fontFamily:'monospace' }}>{a.mp_payment_id}</span>}
                    <span style={{ fontSize:10,color:'#555' }}>{a.created_at?.slice(0,10)}</span>
                  </div>
                )
              })}
            </div>
          </div>
          {payments.length>0&&(
            <div>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,color:'#888',marginBottom:12 }}>PAGAMENTOS RECENTES</div>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {payments.slice(0,20).map(p=>{
                  const user = p.user_id ? profilesMap[p.user_id] : null
                  return (
                    <div key={p.id} style={{ background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'10px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
                      <div style={{ flex:1,minWidth:160 }}>
                        <div style={{ fontSize:12,fontWeight:600,color:'#fff' }}>{user?.email||p.user_id||'Desconhecido'}</div>
                      </div>
                      <PlanBadge plano={p.plan}/>
                      <StatusBadge status={p.status}/>
                      {p.amount&&<span style={{ fontSize:12,fontWeight:700,color:'#D4A843' }}>R${Number(p.amount).toFixed(2)}</span>}
                      {p.provider_payment_id&&<span style={{ fontSize:9,color:'#444',fontFamily:'monospace' }}>{p.provider_payment_id}</span>}
                      <span style={{ fontSize:10,color:'#555' }}>{p.created_at?.slice(0,10)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CONFIGURAÇÕES ── */}
      {tab === 'config' && (
        <div>
          <div style={{ fontSize:13,color:'#555',marginBottom:20 }}>Edite os limites, permissões e visual de cada plano. Alterações são salvas imediatamente em <code style={{ color:'#D4A843' }}>plan_settings</code>.</div>
          {configMsg&&<div style={{ marginBottom:16,padding:'8px 14px',background:configMsg.startsWith('✅')?'rgba(52,211,153,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${configMsg.startsWith('✅')?'#34d399':'#ef4444'}44`,borderRadius:8,fontSize:12,color:configMsg.startsWith('✅')?'#34d399':'#f87171' }}>{configMsg}</div>}
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
            {planSettings.map(ps=>{
              const planInfo = PLANOS.find(p=>p.key===ps.plano)
              const cor = ps.cor_plano || planInfo?.cor || '#888'
              return (
                <div key={ps.id} style={{ background:'#1a1a1a',border:`1px solid ${cor}22`,borderRadius:16,overflow:'hidden' }}>
                  <div style={{ padding:'14px 20px',borderBottom:`1px solid ${cor}18`,display:'flex',alignItems:'center',gap:12,background:`${cor}08` }}>
                    <PlanBadge plano={ps.plano}/>
                    <span style={{ fontSize:13,color:'#ccc' }}>{ps.cta_texto||''}</span>
                    <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:8 }}>
                      <span style={{ fontSize:11,color:'#555' }}>Ativo</span>
                      <Toggle on={ps.ativo} onChange={v=>saveConfig(ps,'ativo',v)}/>
                    </div>
                  </div>
                  <div style={{ padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10 }}>
                    {[
                      {label:'IA (perguntas/dia)',field:'ia_perguntas_limite',val:ps.ia_perguntas_limite},
                      {label:'Quiz (questões)',field:'quiz_questoes_limite',val:ps.quiz_questoes_limite},
                      {label:'Flashcards por disc.',field:'flashcards_por_disciplina',val:ps.flashcards_por_disciplina},
                      {label:'Mini simulado (qtd)',field:'mini_simulado_qtd',val:ps.mini_simulado_qtd},
                    ].map(f=>(
                      <div key={f.field}>
                        <label style={{ fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:4 }}>{f.label}</label>
                        <input type="number" defaultValue={f.val??''} onBlur={e=>saveConfig(ps,f.field,e.target.value?parseInt(e.target.value):null)}
                          style={{ width:'100%',background:'#111',border:`1px solid ${cor}33`,borderRadius:6,padding:'6px 10px',color:'#fff',fontSize:12,outline:'none',boxSizing:'border-box' as const }}/>
                      </div>
                    ))}
                    <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                      {[
                        {label:'PDF',f:'permite_pdf',v:ps.permite_pdf},
                        {label:'Simulado completo',f:'permite_simulado_completo',v:ps.permite_simulado_completo},
                        {label:'Rankings',f:'permite_rankings',v:ps.permite_rankings},
                        {label:'Radar TigerJus',f:'permite_radar',v:ps.permite_radar},
                      ].map(b=>(
                        <div key={b.f} style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <Toggle on={b.v} onChange={v=>saveConfig(ps,b.f,v)}/>
                          <span style={{ fontSize:11,color:'#888' }}>{b.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plan change drawer */}
      {editUser && <PlanoDrawer user={editUser} adminId={adminId} onClose={()=>setEditUser(null)} onSaved={()=>{setEditUser(null);load()}}/>}
    </div>
  )
}
