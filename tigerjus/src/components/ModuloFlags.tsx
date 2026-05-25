'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface FeatureFlag {
  id: string
  key: string
  enabled: boolean
  scope: string
  target: string | null
  description: string | null
  created_at: string | null
  updated_at: string | null
}

const SCOPES = ['global', 'plan', 'user', 'beta', 'internal'] as const

const SCOPE_COLOR: Record<string, { color: string; bg: string }> = {
  global:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  plan:     { color: '#D4A843', bg: 'rgba(212,168,67,0.1)'  },
  user:     { color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
  beta:     { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  internal: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

// ─── MODAL DE EDIÇÃO ──────────────────────────────────────────────────────────

interface ModalProps {
  flag: FeatureFlag
  adminId: string
  onClose: () => void
  onSaved: () => void
}

function EditModal({ flag, adminId, onClose, onSaved }: ModalProps) {
  const [description, setDescription] = useState(flag.description || '')
  const [scope, setScope]             = useState(flag.scope)
  const [target, setTarget]           = useState(flag.target || '')
  const [saving, setSaving]           = useState(false)
  const [erro, setErro]               = useState('')

  const salvar = async () => {
    setSaving(true); setErro('')
    const { error } = await supabase
      .from('feature_flags')
      .update({
        description: description || null,
        scope,
        target: target || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', flag.id)

    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSaving(false); return }

    await supabase.from('admin_audit_logs').insert({
      user_id: adminId,
      action_type: 'UPDATE',
      target_type: 'feature_flag',
      target_id: flag.id,
      metadata: {
        key: flag.key,
        campos: {
          description: { de: flag.description, para: description || null },
          scope:       { de: flag.scope,       para: scope },
          target:      { de: flag.target,      para: target || null },
        },
      },
    })

    onSaved()
  }

  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(3px)'}} onClick={onClose}/>
      <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:301,width:'100%',maxWidth:460,background:'#111',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:24,boxShadow:'0 24px 60px rgba(0,0,0,0.6)'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:2}}>Editar flag</div>
            <code style={{fontSize:12,color:'#D4A843',background:'rgba(212,168,67,0.08)',padding:'2px 8px',borderRadius:4}}>{flag.key}</code>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:20}}>✕</button>
        </div>

        {/* Campos */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>DESCRIÇÃO</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o objetivo desta flag..."
              rows={3}
              style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 12px',color:'#fff',fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}
            />
          </div>

          <div>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>SCOPE</label>
            <select value={scope} onChange={e => setScope(e.target.value)}
              style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
              {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>
              TARGET <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'#444'}}>— plano, user_id ou vazio</span>
            </label>
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="ex: pro, elite, user_id..."
              style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
            />
          </div>
        </div>

        {erro && (
          <div style={{marginTop:14,padding:'10px 14px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,fontSize:12,color:'#f87171'}}>
            ❌ {erro}
          </div>
        )}

        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button onClick={salvar} disabled={saving}
            style={{flex:1,background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'11px',color:'#000',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
            {saving ? '⏳ Salvando...' : '💾 Salvar'}
          </button>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'11px 16px',color:'#888',fontSize:13,cursor:'pointer'}}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── MODAL NOVA FLAG ──────────────────────────────────────────────────────────

interface NovaFlagProps {
  adminId: string
  onClose: () => void
  onSaved: () => void
}

function NovaFlagModal({ adminId, onClose, onSaved }: NovaFlagProps) {
  const [key, setKey]               = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope]           = useState('global')
  const [target, setTarget]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [erro, setErro]             = useState('')

  const criar = async () => {
    if (!key.trim()) { setErro('Key é obrigatória.'); return }
    setSaving(true); setErro('')

    const { data, error } = await supabase
      .from('feature_flags')
      .insert({
        key: key.trim().toLowerCase().replace(/\s+/g, '_'),
        enabled: false,
        scope,
        target: target || null,
        description: description || null,
      })
      .select()
      .single()

    if (error) {
      setErro(error.message.includes('unique') ? 'Já existe uma flag com esta key.' : 'Erro ao criar. Tente novamente.')
      setSaving(false); return
    }

    await supabase.from('admin_audit_logs').insert({
      user_id: adminId,
      action_type: 'CREATE',
      target_type: 'feature_flag',
      target_id: data.id,
      metadata: { key: data.key, scope, target: target || null },
    })

    onSaved()
  }

  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(3px)'}} onClick={onClose}/>
      <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:301,width:'100%',maxWidth:460,background:'#111',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:24,boxShadow:'0 24px 60px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>Nova Feature Flag</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:20}}>✕</button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>KEY *</label>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="ex: nova_funcionalidade"
              style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#D4A843',fontSize:13,outline:'none',fontFamily:'monospace',boxSizing:'border-box'}}/>
            <div style={{fontSize:10,color:'#444',marginTop:4}}>Será convertida para snake_case automaticamente.</div>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>DESCRIÇÃO</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Para que serve esta flag?" rows={2}
              style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 12px',color:'#fff',fontSize:13,outline:'none',resize:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>SCOPE</label>
              <select value={scope} onChange={e => setScope(e.target.value)}
                style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
                {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>TARGET</label>
              <input value={target} onChange={e => setTarget(e.target.value)} placeholder="ex: pro"
                style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            </div>
          </div>
        </div>

        {erro && (
          <div style={{marginTop:14,padding:'10px 14px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,fontSize:12,color:'#f87171'}}>❌ {erro}</div>
        )}

        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button onClick={criar} disabled={saving}
            style={{flex:1,background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'11px',color:'#000',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
            {saving ? '⏳ Criando...' : '+ Criar Flag'}
          </button>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'11px 16px',color:'#888',fontSize:13,cursor:'pointer'}}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── TOGGLE SWITCH ────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{width:44,height:24,borderRadius:12,background:enabled?'#D4A843':'#374151',position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0}}>
      <div style={{position:'absolute',top:3,left:enabled?22:3,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.4)'}}/>
    </div>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloFlags({ adminId }: { adminId?: string }) {
  const [flags, setFlags]           = useState<FeatureFlag[]>([])
  const [loading, setLoading]       = useState(true)
  const [editando, setEditando]     = useState<FeatureFlag | null>(null)
  const [criando, setCriando]       = useState(false)
  const [filtroScope, setFiltroScope] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('feature_flags').select('*').order('scope').order('key')
    if (data) setFlags(data as FeatureFlag[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (flag: FeatureFlag) => {
    if (!adminId) return
    // Optimistic update
    setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f))

    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: !flag.enabled, updated_at: new Date().toISOString() })
      .eq('id', flag.id)

    if (error) {
      // Reverte se falhou
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: flag.enabled } : f))
      return
    }

    await supabase.from('admin_audit_logs').insert({
      user_id: adminId,
      action_type: 'TOGGLE',
      target_type: 'feature_flag',
      target_id: flag.id,
      metadata: { key: flag.key, de: flag.enabled, para: !flag.enabled },
    })
  }

  const filtradas = filtroScope ? flags.filter(f => f.scope === filtroScope) : flags
  const ativas    = flags.filter(f => f.enabled).length

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:2}}>Feature Flags</h2>
          <div style={{fontSize:12,color:'#555'}}>
            {ativas} ativas · {flags.length - ativas} inativas · {flags.length} total
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={load} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'7px 14px',color:'#888',fontSize:12,cursor:'pointer'}}>
            🔄 Atualizar
          </button>
          <button onClick={() => setCriando(true)}
            style={{background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'7px 16px',color:'#000',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            + Nova Flag
          </button>
        </div>
      </div>

      {/* Filtros de scope */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:18}}>
        {['', ...SCOPES].map(s => (
          <button key={s} onClick={() => setFiltroScope(s)}
            style={{
              padding:'5px 12px', borderRadius:100, border:'none', cursor:'pointer', fontSize:11, fontWeight:600,
              background: filtroScope === s
                ? (s ? SCOPE_COLOR[s]?.bg : 'rgba(212,168,67,0.1)')
                : 'rgba(255,255,255,0.04)',
              color: filtroScope === s
                ? (s ? SCOPE_COLOR[s]?.color : '#D4A843')
                : '#555',
              transition:'all 0.15s',
            }}>
            {s || 'Todos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[...Array(4)].map((_,i) => (
            <div key={i} style={{height:76,borderRadius:12,background:'rgba(255,255,255,0.04)',animation:'pulse 1.5s infinite'}}/>
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      ) : filtradas.length === 0 ? (
        <div style={{textAlign:'center',padding:48,color:'#555'}}>
          <div style={{fontSize:36,marginBottom:12}}>🚩</div>
          <div style={{fontSize:14,fontWeight:600,color:'#666',marginBottom:6}}>Nenhuma flag encontrada</div>
          <div style={{fontSize:12}}>Crie uma nova flag com o botão acima.</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtradas.map(flag => {
            const sc = SCOPE_COLOR[flag.scope] || { color:'#888', bg:'rgba(136,136,136,0.1)' }
            return (
              <div key={flag.id} style={{background:'#1a1a1a',border:`1px solid ${flag.enabled?'rgba(212,168,67,0.15)':'rgba(255,255,255,0.05)'}`,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,transition:'border-color 0.2s'}}>

                {/* Toggle */}
                <Toggle enabled={flag.enabled} onChange={() => toggle(flag)} />

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                    <code style={{fontSize:13,fontWeight:700,color:flag.enabled?'#D4A843':'#888',background:'rgba(255,255,255,0.04)',padding:'1px 7px',borderRadius:4}}>
                      {flag.key}
                    </code>
                    <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,color:sc.color,background:sc.bg,border:`1px solid ${sc.color}33`}}>
                      {flag.scope}
                    </span>
                    {flag.target && (
                      <span style={{fontSize:10,padding:'2px 8px',borderRadius:100,color:'#9CA3AF',background:'rgba(156,163,175,0.08)',border:'1px solid rgba(156,163,175,0.15)'}}>
                        → {flag.target}
                      </span>
                    )}
                    <span style={{fontSize:10,padding:'2px 8px',borderRadius:100,fontWeight:700,color:flag.enabled?'#34d399':'#6B7280',background:flag.enabled?'rgba(52,211,153,0.08)':'rgba(107,114,128,0.08)'}}>
                      {flag.enabled ? '● ATIVO' : '○ INATIVO'}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:'#555'}}>
                    {flag.description || <em style={{color:'#333'}}>Sem descrição</em>}
                  </div>
                  {flag.updated_at && (
                    <div style={{fontSize:10,color:'#333',marginTop:3}}>
                      Atualizado: {new Date(flag.updated_at).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>

                {/* Botão editar */}
                <button onClick={() => setEditando(flag)}
                  style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'6px 12px',color:'#666',fontSize:11,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
                  ✏️ Editar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modais */}
      {editando && adminId && (
        <EditModal flag={editando} adminId={adminId} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); load() }} />
      )}
      {criando && adminId && (
        <NovaFlagModal adminId={adminId} onClose={() => setCriando(false)} onSaved={() => { setCriando(false); load() }} />
      )}
    </div>
  )
}
