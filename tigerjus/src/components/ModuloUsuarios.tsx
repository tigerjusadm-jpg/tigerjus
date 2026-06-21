'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  email: string
  nome: string | null
  avatar_url: string | null
  plano: string | null
  xp: number | null
  nivel: number | null
  streak: number | null
  ultimo_acesso: string | null
  questoes_respondidas: number | null
  questoes_corretas: number | null
  tempo_estudado: number | null
  created_at: string | null
  role: string | null
  free_ia_used: number | null
  free_questions_used: number | null
  last_quiz_reset: string | null
  last_ia_reset: string | null
}

const PLANOS = ['gratuito', 'start', 'pro', 'elite'] as const
const ROLES  = ['user', 'admin'] as const

const PLANO_COLOR: Record<string, string> = {
  gratuito: '#6B7280', start: '#3B82F6', plus: '#8B5CF6',
  pro: '#EC4899', elite: '#D4A843',
}
const ROLE_COLOR: Record<string, string> = {
  user: '#4B5563', admin: '#D4A843',
}

function nivelLabel(xp: number | null): string {
  if (!xp || xp < 1000)  return 'Filhote'
  if (xp < 5000)         return 'Caçador'
  if (xp < 15000)        return 'Alpha'
  if (xp < 40000)        return 'Tigre Supremo'
  return 'Mestre TigerJus'
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{display:'inline-block',padding:'2px 8px',borderRadius:100,fontSize:10,fontWeight:700,letterSpacing:0.5,color,background:bg,border:`1px solid ${color}44`}}>
      {label.toUpperCase()}
    </span>
  )
}

// Chama a rota segura de admin no servidor (usa service role lá dentro).
async function callAdminApi(payload: object): Promise<{ ok: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin/update-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok && data?.ok === true, error: data?.error }
}

// ─── DRAWER DE EDIÇÃO ─────────────────────────────────────────────────────────

interface DrawerProps {
  user: Profile
  adminId: string
  onClose: () => void
  onSaved: () => void
}

function UserDrawer({ user, adminId, onClose, onSaved }: DrawerProps) {
  const [plano, setPlano] = useState(user.plano || 'gratuito')
  const [role, setRole] = useState(user.role || 'user')
  const [saving, setSaving] = useState(false)
  const [confirmRole, setConfirmRole] = useState(false)
  const [resetConfirm, setResetConfirm] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const isSelf = user.id === adminId
  const taxa = user.questoes_respondidas
    ? Math.round(((user.questoes_corretas || 0) / user.questoes_respondidas) * 100)
    : 0

  const salvar = async () => {
    // Proteção: admin tentando se auto-remover
    if (isSelf && role !== 'admin' && !confirmRole) {
      setConfirmRole(true)
      return
    }

    setSaving(true); setMsg('')
    const { ok, error } = await callAdminApi({ action: 'update', targetId: user.id, plano, role })
    if (ok) {
      setMsg('✅ Salvo com sucesso!')
      setTimeout(() => { setMsg(''); onSaved() }, 1500)
    } else {
      setMsg(`❌ ${error || 'Erro ao salvar. Tente novamente.'}`)
    }
    setSaving(false)
  }

  const resetar = async (campo: 'free_questions_used' | 'free_ia_used' | 'streak') => {
    setResetConfirm(null)
    const { ok, error } = await callAdminApi({ action: 'reset', targetId: user.id, field: campo })
    if (ok) {
      setMsg(`✅ ${campo} resetado!`)
      setTimeout(() => { setMsg(''); onSaved() }, 1500)
    } else {
      setMsg(`❌ ${error || 'Erro ao resetar.'}`)
    }
  }

  const label: Record<string, string> = {
    free_questions_used: 'Questões gratuitas usadas',
    free_ia_used: 'Perguntas IA usadas',
    streak: 'Streak (dias seguidos)',
  }

  return (
    <>
      {/* Overlay */}
      <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(2px)'}} onClick={onClose}/>

      {/* Drawer */}
      <div style={{position:'fixed',top:0,right:0,bottom:0,zIndex:201,width:420,maxWidth:'100vw',background:'#111',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'20px 20px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#D4A843,#E8621A)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:16,color:'#000',flexShrink:0}}>
              {(user.nome || user.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>{user.nome || '—'}</div>
              <div style={{fontSize:11,color:'#555'}}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:20,padding:4}}>✕</button>
        </div>

        {/* Stats */}
        <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#444',marginBottom:10}}>ESTATÍSTICAS</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              { label:'XP Total',     value: (user.xp || 0).toLocaleString() },
              { label:'Nível',        value: nivelLabel(user.xp) },
              { label:'Streak',       value: `${user.streak || 0} dias 🔥` },
              { label:'Taxa acerto',  value: `${taxa}%` },
              { label:'Questões',     value: user.questoes_respondidas || 0 },
              { label:'IA usada',     value: `${user.free_ia_used || 0}x` },
              { label:'Último acesso',value: user.ultimo_acesso || '—' },
              { label:'Membro desde', value: user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—' },
            ].map(s => (
              <div key={s.label} style={{background:'#1a1a1a',borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:10,color:'#555',marginBottom:2}}>{s.label}</div>
                <div style={{fontSize:13,fontWeight:600,color:'#ccc'}}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div style={{padding:'16px 20px',flex:1}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#444',marginBottom:12}}>EDITAR</div>

          {/* Plano */}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>PLANO</label>
            <select value={plano} onChange={e => setPlano(e.target.value)}
              style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
              {PLANOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>

          {/* Role */}
          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>ROLE</label>
            <select value={role} onChange={e => { setRole(e.target.value); setConfirmRole(false) }}
              style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {isSelf && role !== 'admin' && (
              <div style={{marginTop:8,padding:'8px 12px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,fontSize:11,color:'#f87171'}}>
                ⚠️ Você está removendo seu próprio acesso admin. Isso vai te bloquear do painel.
              </div>
            )}
          </div>

          {/* Confirmação auto-remoção */}
          {confirmRole && (
            <div style={{marginBottom:16,padding:14,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,fontSize:12,color:'#f87171'}}>
              <div style={{fontWeight:700,marginBottom:8}}>⚠️ Confirmar remoção de admin?</div>
              <div style={{marginBottom:12,color:'#aaa'}}>Você perderá acesso a este painel imediatamente.</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={salvar} style={{background:'rgba(239,68,68,0.2)',border:'1px solid #ef4444',borderRadius:6,padding:'6px 12px',color:'#f87171',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  Sim, remover
                </button>
                <button onClick={() => { setRole('admin'); setConfirmRole(false) }} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'6px 12px',color:'#888',fontSize:11,cursor:'pointer'}}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Resetar contadores */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#444',marginBottom:10}}>RESETAR CONTADORES</div>
            {(['free_questions_used','free_ia_used','streak'] as const).map(campo => (
              <div key={campo} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'#1a1a1a',borderRadius:8,marginBottom:6}}>
                <div>
                  <div style={{fontSize:12,color:'#ccc'}}>{label[campo]}</div>
                  <div style={{fontSize:11,color:'#555'}}>Atual: {user[campo] ?? 0}</div>
                </div>
                {resetConfirm === campo ? (
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={() => resetar(campo)} style={{background:'rgba(239,68,68,0.15)',border:'1px solid #ef4444',borderRadius:6,padding:'4px 10px',color:'#f87171',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      Confirmar
                    </button>
                    <button onClick={() => setResetConfirm(null)} style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'4px 10px',color:'#666',fontSize:11,cursor:'pointer'}}>
                      Não
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setResetConfirm(campo)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 12px',color:'#888',fontSize:11,cursor:'pointer'}}>
                    Zerar
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Msg feedback */}
          {msg && (
            <div style={{marginBottom:12,padding:'10px 14px',background:msg.startsWith('✅')?'rgba(52,211,153,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.startsWith('✅')?'#34d399':'#ef4444'}44`,borderRadius:8,fontSize:13,color:msg.startsWith('✅')?'#34d399':'#f87171'}}>
              {msg}
            </div>
          )}

          {/* Salvar */}
          {!confirmRole && (
            <button onClick={salvar} disabled={saving}
              style={{width:'100%',background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:10,padding:'12px',color:'#000',fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
              {saving ? '⏳ Salvando...' : '💾 Salvar alterações'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloUsuarios({ adminId }: { adminId?: string }) {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroPlan, setFiltroPlan] = useState('')
  const [filtroRole, setFiltroRole] = useState('')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [pagina, setPagina] = useState(0)
  const POR_PAGINA = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/list-users', {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const json = await res.json().catch(() => ({}))
      if (json?.users) setUsuarios(json.users as Profile[])
    } catch { /* mantém a lista atual em caso de falha */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Filtros aplicados no frontend
  const filtrados = usuarios.filter(u => {
    const termo = busca.toLowerCase()
    const matchBusca = !busca ||
      (u.nome || '').toLowerCase().includes(termo) ||
      (u.email || '').toLowerCase().includes(termo)
    const matchPlan = !filtroPlan || u.plano === filtroPlan
    const matchRole = !filtroRole || u.role === filtroRole
    return matchBusca && matchPlan && matchRole
  })

  const paginados = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
  const totalPags = Math.ceil(filtrados.length / POR_PAGINA)

  // Reset página ao mudar filtros
  useEffect(() => setPagina(0), [busca, filtroPlan, filtroRole])

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>

      {/* ── HEADER + FILTROS ── */}
      <div style={{marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:2}}>Usuários</h2>
            <div style={{fontSize:12,color:'#555'}}>{filtrados.length} de {usuarios.length} usuários</div>
          </div>
          <button onClick={load} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'7px 14px',color:'#888',fontSize:12,cursor:'pointer'}}>
            🔄 Atualizar
          </button>
        </div>

        {/* Busca + filtros */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou email..."
            style={{flex:1,minWidth:200,background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 14px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit'}}
          />
          <select value={filtroPlan} onChange={e => setFiltroPlan(e.target.value)}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:filtroPlan?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
            <option value="">Todos os planos</option>
            {PLANOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
          <select value={filtroRole} onChange={e => setFiltroRole(e.target.value)}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:filtroRole?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
            <option value="">Todos os roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* ── TABELA ── */}
      {loading ? (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[...Array(6)].map((_,i) => (
            <div key={i} style={{height:52,borderRadius:10,background:'rgba(255,255,255,0.04)',animation:'pulse 1.5s infinite'}}/>
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,color:'#555'}}>
          <div style={{fontSize:36}}>👥</div>
          <div style={{fontSize:14,fontWeight:600,color:'#666'}}>Nenhum usuário encontrado</div>
          <div style={{fontSize:12}}>Tente ajustar os filtros de busca.</div>
        </div>
      ) : (
        <>
          {/* Cabeçalho da tabela */}
          <div style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 0.8fr 0.8fr 0.8fr 0.7fr 0.5fr',gap:8,padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:4}}>
            {['USUÁRIO','PLANO','ROLE','XP','QUESTÕES','STREAK',''].map((h,i) => (
              <div key={i} style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:'#444',textTransform:'uppercase'}}>{h}</div>
            ))}
          </div>

          {/* Linhas */}
          <div style={{flex:1,overflowY:'auto'}}>
            {paginados.map(u => {
              const taxa = u.questoes_respondidas
                ? Math.round(((u.questoes_corretas||0)/u.questoes_respondidas)*100)
                : 0
              return (
                <div key={u.id}
                  onClick={() => setSelected(u)}
                  style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 0.8fr 0.8fr 0.8fr 0.7fr 0.5fr',gap:8,padding:'12px 14px',borderRadius:10,marginBottom:4,cursor:'pointer',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.05)',transition:'border-color 0.15s'}}
                  onMouseEnter={e => e.currentTarget.style.borderColor='rgba(212,168,67,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}>

                  {/* Usuário */}
                  <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#374151,#1F2937)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#9CA3AF',flexShrink:0}}>
                      {(u.nome||u.email||'?')[0].toUpperCase()}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.nome||'—'}</div>
                      <div style={{fontSize:11,color:'#555',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.email}</div>
                    </div>
                  </div>

                  {/* Plano */}
                  <div style={{display:'flex',alignItems:'center'}}>
                    <Badge label={u.plano||'—'} color={PLANO_COLOR[u.plano||'']||'#888'} bg={`${PLANO_COLOR[u.plano||'']||'#888'}18`}/>
                  </div>

                  {/* Role */}
                  <div style={{display:'flex',alignItems:'center'}}>
                    <Badge label={u.role||'user'} color={ROLE_COLOR[u.role||'user']||'#888'} bg={`${ROLE_COLOR[u.role||'user']||'#888'}18`}/>
                  </div>

                  {/* XP */}
                  <div style={{display:'flex',alignItems:'center',fontSize:12,color:'#D4A843',fontWeight:600}}>
                    {(u.xp||0).toLocaleString()}
                  </div>

                  {/* Questões */}
                  <div style={{display:'flex',alignItems:'center',fontSize:12,color:'#888'}}>
                    {u.questoes_respondidas||0}
                    {u.questoes_respondidas ? <span style={{color:taxa>=62?'#34d399':'#f87171',marginLeft:4,fontSize:10}}>({taxa}%)</span> : null}
                  </div>

                  {/* Streak */}
                  <div style={{display:'flex',alignItems:'center',fontSize:12,color:'#E8621A'}}>
                    {u.streak||0} 🔥
                  </div>

                  {/* Ação */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end'}}>
                    <span style={{fontSize:16,color:'#444'}}>›</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginação */}
          {totalPags > 1 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.07)',marginTop:8}}>
              <div style={{fontSize:12,color:'#555'}}>
                Página {pagina+1} de {totalPags} · {filtrados.length} registros
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={() => setPagina(p => Math.max(0,p-1))} disabled={pagina===0}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 12px',color:pagina===0?'#444':'#ccc',fontSize:12,cursor:pagina===0?'not-allowed':'pointer'}}>
                  ← Anterior
                </button>
                <button onClick={() => setPagina(p => Math.min(totalPags-1,p+1))} disabled={pagina===totalPags-1}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 12px',color:pagina===totalPags-1?'#444':'#ccc',fontSize:12,cursor:pagina===totalPags-1?'not-allowed':'pointer'}}>
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── DRAWER ── */}
      {selected && adminId && (
        <UserDrawer
          user={selected}
          adminId={adminId}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
