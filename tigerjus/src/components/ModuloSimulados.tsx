'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface Prova {
  id: string
  exame: string
  numero_exame: number
  ano: number
  edicao: string | null
  total_questoes: number | null
  taxa_aprovacao_oficial: number | null
  status: string | null
  created_at: string | null
  questoes_count?: number
}

const EXAMES = ['OAB 1ª Fase', 'OAB 2ª Fase']

const STATUS_COLOR: Record<string,{color:string;bg:string}> = {
  ativo:     {color:'#34d399',bg:'rgba(52,211,153,0.1)'},
  inativo:   {color:'#6B7280',bg:'rgba(107,114,128,0.1)'},
  rascunho:  {color:'#60a5fa',bg:'rgba(96,165,250,0.1)'},
  arquivado: {color:'#888',bg:'rgba(255,255,255,0.05)'},
}

const POR_PAGINA = 25

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({msg}:{msg:string}) {
  return (
    <div style={{textAlign:'center',padding:48,color:'#555'}}>
      <div style={{fontSize:36,marginBottom:12}}>📋</div>
      <div style={{fontSize:14,fontWeight:600,color:'#666',marginBottom:6}}>Nenhuma prova encontrada</div>
      <div style={{fontSize:12}}>{msg}</div>
    </div>
  )
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {[...Array(6)].map((_,i) => (
        <div key={i} style={{height:54,borderRadius:10,background:'rgba(255,255,255,0.04)',animation:'pulse 1.5s infinite'}}/>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}

// ─── BADGE ────────────────────────────────────────────────────────────────────

function Badge({label,color,bg}:{label:string;color:string;bg:string}) {
  return (
    <span style={{display:'inline-block',padding:'2px 8px',borderRadius:100,fontSize:10,fontWeight:700,color,background:bg,border:`1px solid ${color}33`,whiteSpace:'nowrap'}}>
      {label.toUpperCase()}
    </span>
  )
}

// ─── EDITOR DE PROVA ──────────────────────────────────────────────────────────

interface EditorProps {
  prova: Partial<Prova>
  adminId: string
  onClose: () => void
  onSaved: () => void
}

function EditorProva({prova, adminId, onClose, onSaved}: EditorProps) {
  const isNova = !prova.id
  const [form, setForm] = useState({
    exame:                  prova.exame || EXAMES[0],
    numero_exame:           prova.numero_exame?.toString() || '',
    ano:                    prova.ano?.toString() || new Date().getFullYear().toString(),
    edicao:                 prova.edicao || '',
    total_questoes:         prova.total_questoes?.toString() || '80',
    taxa_aprovacao_oficial: prova.taxa_aprovacao_oficial?.toString() || '0',
    status:                 prova.status || 'ativo',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}))

  const salvar = async () => {
    if (!form.exame || !form.numero_exame || !form.ano) {
      setMsg('❌ Exame, número e ano são obrigatórios.'); return
    }
    const numExame = parseInt(form.numero_exame, 10)
    const ano = parseInt(form.ano, 10)
    if (isNaN(numExame) || numExame <= 0) {
      setMsg('❌ Número do exame deve ser positivo.'); return
    }
    if (isNaN(ano) || ano < 2010 || ano > 2099) {
      setMsg('❌ Ano inválido (2010-2099).'); return
    }
    const totalQ = parseInt(form.total_questoes, 10)
    const taxa = parseFloat(form.taxa_aprovacao_oficial)

    setSaving(true); setMsg('')

    const payload: any = {
      exame:                  form.exame,
      numero_exame:           numExame,
      ano:                    ano,
      edicao:                 form.edicao || null,
      total_questoes:         isNaN(totalQ) ? 80 : totalQ,
      taxa_aprovacao_oficial: isNaN(taxa) ? null : taxa,
      status:                 form.status,
    }

    if (isNova) {
      const { error } = await supabase.from('provas_oab').insert(payload)
      if (error) { setMsg(`❌ Erro ao criar: ${error.message}`); setSaving(false); return }
      await supabase.from('admin_audit_logs').insert({
        user_id: adminId, action_type: 'CREATE',
        target_type: 'prova_oab', target_id: 'nova',
        metadata: { exame: form.exame, numero_exame: numExame, ano: ano, edicao: form.edicao },
      })
    } else {
      const { error } = await supabase
        .from('provas_oab')
        .update(payload)
        .eq('id', prova.id!)
      if (error) { setMsg(`❌ Erro ao salvar: ${error.message}`); setSaving(false); return }

      await supabase.from('admin_audit_logs').insert({
        user_id: adminId, action_type: 'UPDATE',
        target_type: 'prova_oab', target_id: prova.id,
        metadata: {
          before: {
            exame: prova.exame, numero_exame: prova.numero_exame, ano: prova.ano,
            edicao: prova.edicao, status: prova.status,
            taxa_aprovacao_oficial: prova.taxa_aprovacao_oficial,
            total_questoes: prova.total_questoes,
          },
          after: payload,
        },
      })
    }

    setMsg('✅ Salvo!'); setTimeout(() => onSaved(), 800)
    setSaving(false)
  }

  const label = (s: string) => (
    <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:5}}>
      {s}
    </label>
  )

  const inp = (val: string, onChange: (v:string)=>void, placeholder='') => (
    <input value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,
        padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
  )

  const sel = (val: string, onChange: (v:string)=>void, opts: string[][]) => (
    <select value={val} onChange={e=>onChange(e.target.value)}
      style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,
        padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
      {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  )

  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(2px)'}} onClick={onClose}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,zIndex:201,width:560,maxWidth:'100vw',
        background:'#111',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'18px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:'#0d0d0d'}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{isNova ? 'Nova Prova OAB' : 'Editar Prova OAB'}</div>
            {!isNova && prova.id && <div style={{fontSize:11,color:'#555'}}>ID: {prova.id.slice(0,8)}…</div>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:20}}>✕</button>
        </div>

        {/* Corpo */}
        <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:16}}>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              {label('TIPO DE EXAME')}
              {sel(form.exame, v=>set('exame',v), EXAMES.map(e=>[e,e]))}
            </div>
            <div>
              {label('STATUS')}
              {sel(form.status, v=>set('status',v), [['ativo','Ativo'],['inativo','Inativo'],['rascunho','Rascunho'],['arquivado','Arquivado']])}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              {label('NÚMERO DO EXAME')}
              {inp(form.numero_exame, v=>set('numero_exame',v.replace(/\D/g,'')), 'Ex: 46')}
            </div>
            <div>
              {label('ANO')}
              {inp(form.ano, v=>set('ano',v.replace(/\D/g,'').slice(0,4)), 'Ex: 2026')}
            </div>
          </div>

          <div>
            {label('EDIÇÃO (TÍTULO DESCRITIVO)')}
            {inp(form.edicao, v=>set('edicao',v), 'Ex: 46º Exame de Ordem Unificado — 2026/1')}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              {label('TOTAL DE QUESTÕES')}
              {inp(form.total_questoes, v=>set('total_questoes',v.replace(/\D/g,'')), '80')}
            </div>
            <div>
              {label('TAXA DE APROVAÇÃO OFICIAL (%)')}
              {inp(form.taxa_aprovacao_oficial, v=>set('taxa_aprovacao_oficial',v.replace(/[^\d.]/g,'')), 'Ex: 42.5')}
            </div>
          </div>

          {!isNova && (prova.questoes_count || 0) > 0 && (
            <div style={{padding:'12px 14px',background:'rgba(96,165,250,0.06)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:10,fontSize:12,color:'#93c5fd',lineHeight:1.6}}>
              ℹ️ Esta prova tem <strong>{prova.questoes_count} questão(ões) vinculada(s)</strong>. Editar campos descritivos é seguro — as questões não serão afetadas.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0,background:'#0d0d0d'}}>
          {msg && (
            <div style={{marginBottom:10,padding:'8px 12px',background:msg.startsWith('✅')?'rgba(52,211,153,0.1)':'rgba(239,68,68,0.1)',
              border:`1px solid ${msg.startsWith('✅')?'#34d399':'#ef4444'}44`,borderRadius:8,fontSize:12,
              color:msg.startsWith('✅')?'#34d399':'#f87171'}}>
              {msg}
            </div>
          )}
          <div style={{display:'flex',gap:8}}>
            <button onClick={salvar} disabled={saving}
              style={{flex:1,background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,
                padding:'11px',color:'#000',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
              {saving?'⏳ Salvando...':isNova?'+ Criar Prova':'💾 Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloSimulados({adminId}:{adminId?:string}) {
  const [provas, setProvas]     = useState<Prova[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [pagina, setPagina]     = useState(0)
  const [busca, setBusca]       = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroExame, setFiltroExame]   = useState('')
  const [editando, setEditando] = useState<Partial<Prova>|null>(null)
  const [novaCriando, setNovaCriando] = useState(false)
  const buscaTimer              = useRef<NodeJS.Timeout | undefined>(undefined)

  const load = useCallback(async (pag = pagina, termoBusca = busca) => {
    setLoading(true)

    let query = supabase.from('provas_oab').select(
      'id,exame,numero_exame,ano,edicao,total_questoes,taxa_aprovacao_oficial,status,created_at',
      { count: 'exact' }
    )

    if (filtroStatus) query = query.eq('status', filtroStatus)
    if (filtroExame)  query = query.eq('exame', filtroExame)
    if (termoBusca.trim()) {
      const t = termoBusca.trim()
      query = query.or(`edicao.ilike.%${t}%,exame.ilike.%${t}%`)
    }

    const { data, count, error } = await query
      .order('ano', { ascending: false })
      .order('numero_exame', { ascending: false })
      .range(pag * POR_PAGINA, (pag + 1) * POR_PAGINA - 1)

    if (error || !data) { setLoading(false); return }

    const provaIds = data.map(p => p.id)
    const counts: Record<string, number> = {}
    if (provaIds.length > 0) {
      const { data: questoesLink } = await supabase
        .from('questoes_oab')
        .select('prova_id')
        .in('prova_id', provaIds)
      if (questoesLink) {
        for (const q of questoesLink) {
          if (q.prova_id) counts[q.prova_id] = (counts[q.prova_id] || 0) + 1
        }
      }
    }

    setProvas((data as Prova[]).map(p => ({...p, questoes_count: counts[p.id] || 0})))
    setTotal(count || 0)
    setLoading(false)
  }, [pagina, busca, filtroStatus, filtroExame])

  useEffect(() => { setPagina(0) }, [filtroStatus, filtroExame])
  useEffect(() => { load(pagina, busca) }, [pagina, filtroStatus, filtroExame])

  const handleBusca = (v: string) => {
    setBusca(v)
    clearTimeout(buscaTimer.current)
    buscaTimer.current = setTimeout(() => { setPagina(0); load(0, v) }, 400)
  }

  const totalPags = Math.ceil(total / POR_PAGINA)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>

      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:2}}>Simulados / Provas OAB</h2>
            <div style={{fontSize:12,color:'#555'}}>{total.toLocaleString()} prova(s) cadastrada(s)</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>load(pagina,busca)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'7px 14px',color:'#888',fontSize:12,cursor:'pointer'}}>
              🔄 Atualizar
            </button>
            <button onClick={()=>setNovaCriando(true)}
              style={{background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'7px 16px',color:'#000',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              + Nova Prova
            </button>
          </div>
        </div>

        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input value={busca} onChange={e=>handleBusca(e.target.value)}
            placeholder="Buscar por edição ou exame..."
            style={{flex:1,minWidth:220,background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 14px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
          <select value={filtroStatus} onChange={e=>{setFiltroStatus(e.target.value);setPagina(0)}}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:filtroStatus?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
            <option value="">Todos status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="rascunho">Rascunho</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <select value={filtroExame} onChange={e=>{setFiltroExame(e.target.value);setPagina(0)}}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:filtroExame?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
            <option value="">Todos exames</option>
            {EXAMES.map(e=><option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {loading ? <Skeleton/> : provas.length === 0 ? (
        <EmptyState msg={busca ? 'Tente outros termos.' : 'Ajuste os filtros ou crie uma nova prova.'}/>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'2.5fr 0.5fr 0.5fr 1fr 0.8fr 0.8fr',gap:8,padding:'6px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:4}}>
            {['PROVA','Nº','ANO','EXAME','QUESTÕES','STATUS'].map((h,i)=>(
              <div key={i} style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:'#444',textTransform:'uppercase'}}>{h}</div>
            ))}
          </div>

          <div style={{flex:1,overflowY:'auto'}}>
            {provas.map(p=>(
              <div key={p.id}
                onClick={()=>setEditando(p)}
                style={{display:'grid',gridTemplateColumns:'2.5fr 0.5fr 0.5fr 1fr 0.8fr 0.8fr',gap:8,padding:'11px 14px',
                  borderRadius:10,marginBottom:4,background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.05)',
                  cursor:'pointer',transition:'border-color 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(212,168,67,0.2)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}>

                <div style={{minWidth:0,display:'flex',flexDirection:'column',justifyContent:'center'}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}>
                    {p.edicao || `${p.numero_exame}º Exame — ${p.ano}`}
                  </div>
                  {p.taxa_aprovacao_oficial !== null && p.taxa_aprovacao_oficial > 0 && (
                    <div style={{fontSize:10,color:'#888'}}>Aprovação: {p.taxa_aprovacao_oficial}%</div>
                  )}
                </div>

                <div style={{display:'flex',alignItems:'center',fontSize:13,fontWeight:600,color:'#D4A843'}}>{p.numero_exame}º</div>
                <div style={{display:'flex',alignItems:'center',fontSize:12,color:'#aaa'}}>{p.ano}</div>
                <div style={{display:'flex',alignItems:'center',fontSize:11,color:'#888',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.exame}</div>

                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:13,fontWeight:600,color:p.questoes_count?'#fff':'#444'}}>{p.questoes_count || 0}</span>
                  <span style={{fontSize:9,color:'#555'}}>/{p.total_questoes || 80}</span>
                </div>

                <div style={{display:'flex',alignItems:'center'}}>
                  <Badge label={p.status || 'ativo'} {...(STATUS_COLOR[p.status || 'ativo']||{color:'#888',bg:'#1a1a1a'})}/>
                </div>
              </div>
            ))}
          </div>

          {totalPags > 1 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.07)',marginTop:8,flexShrink:0}}>
              <div style={{fontSize:12,color:'#555'}}>
                Página {pagina+1} de {totalPags} · {total.toLocaleString()} provas
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <button onClick={()=>setPagina(0)} disabled={pagina===0}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 10px',color:pagina===0?'#444':'#ccc',fontSize:11,cursor:pagina===0?'not-allowed':'pointer'}}>«</button>
                <button onClick={()=>setPagina(p=>Math.max(0,p-1))} disabled={pagina===0}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 12px',color:pagina===0?'#444':'#ccc',fontSize:12,cursor:pagina===0?'not-allowed':'pointer'}}>← Anterior</button>
                <span style={{fontSize:12,color:'#666',padding:'0 4px'}}>{pagina+1}</span>
                <button onClick={()=>setPagina(p=>Math.min(totalPags-1,p+1))} disabled={pagina===totalPags-1}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 12px',color:pagina===totalPags-1?'#444':'#ccc',fontSize:12,cursor:pagina===totalPags-1?'not-allowed':'pointer'}}>Próxima →</button>
                <button onClick={()=>setPagina(totalPags-1)} disabled={pagina===totalPags-1}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 10px',color:pagina===totalPags-1?'#444':'#ccc',fontSize:11,cursor:pagina===totalPags-1?'not-allowed':'pointer'}}>»</button>
              </div>
            </div>
          )}
        </>
      )}

      {(editando || novaCriando) && adminId && (
        <EditorProva
          prova={novaCriando ? {} : editando!}
          adminId={adminId}
          onClose={()=>{setEditando(null);setNovaCriando(false)}}
          onSaved={()=>{setEditando(null);setNovaCriando(false);load(pagina,busca)}}
        />
      )}
    </div>
  )
}
