'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Flashcard {
  id: string
  disciplina: string
  frente: string
  verso: string
  questao_id: string | null
  ativo: boolean
  gerado_automaticamente: boolean
  fonte: string | null
  qualidade_score: number
  revisado: boolean
  created_at: string
  updated_at: string
}

const POR_PAGINA = 25

function Badge({ children, color = '#D4A843' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 100,
      fontSize: 10,
      fontWeight: 800,
      color,
      background: `${color}18`,
      border: `1px solid ${color}33`,
      whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  )
}

function Skeleton() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {[...Array(7)].map((_,i)=>(
        <div key={i} style={{height:58,borderRadius:10,background:'rgba(255,255,255,0.04)',animation:'pulse 1.5s infinite'}}/>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{textAlign:'center',padding:48,color:'#666'}}>
      <div style={{fontSize:40,marginBottom:12}}>🃏</div>
      <div style={{fontSize:16,fontWeight:800,color:'#fff',marginBottom:6}}>Nenhum flashcard encontrado</div>
      <div style={{fontSize:13}}>{msg}</div>
    </div>
  )
}

interface EditorProps {
  card: Partial<Flashcard>
  adminId?: string
  onClose: () => void
  onSaved: () => void
}

function EditorFlashcard({ card, adminId, onClose, onSaved }: EditorProps) {
  const isNovo = !card.id
  const [form, setForm] = useState({
    disciplina: card.disciplina || '',
    frente: card.frente || '',
    verso: card.verso || '',
    ativo: card.ativo ?? true,
    revisado: card.revisado ?? false,
    fonte: card.fonte || 'manual',
    qualidade_score: String(card.qualidade_score ?? 0),
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const audit = async (action_type: string, metadata: any) => {
    if (!adminId) return
    await supabase.from('admin_audit_logs').insert({
      user_id: adminId,
      action_type,
      target_type: 'flashcard',
      target_id: card.id || 'novo',
      metadata
    })
  }

  const salvar = async () => {
    if (!form.disciplina.trim() || !form.frente.trim() || !form.verso.trim()) {
      setMsg('❌ Disciplina, frente e verso são obrigatórios.')
      return
    }

    setSaving(true)
    setMsg('')

    const qualidade = parseInt(form.qualidade_score, 10)

    const payload = {
      disciplina: form.disciplina.trim(),
      frente: form.frente.trim(),
      verso: form.verso.trim(),
      ativo: form.ativo,
      revisado: form.revisado,
      fonte: form.fonte || 'manual',
      qualidade_score: isNaN(qualidade) ? 0 : qualidade,
      gerado_automaticamente: isNovo ? false : (card.gerado_automaticamente ?? false),
      updated_at: new Date().toISOString()
    }

    if (isNovo) {
      const { error } = await supabase.from('flashcards').insert(payload)
      if (error) {
        setMsg(`❌ Erro ao criar: ${error.message}`)
        setSaving(false)
        return
      }
      await audit('CREATE', { after: payload })
    } else {
      const { error } = await supabase.from('flashcards').update(payload).eq('id', card.id!)
      if (error) {
        setMsg(`❌ Erro ao salvar: ${error.message}`)
        setSaving(false)
        return
      }
      await audit('UPDATE', {
        before: {
          disciplina: card.disciplina,
          frente: card.frente,
          verso: card.verso,
          ativo: card.ativo,
          revisado: card.revisado,
          fonte: card.fonte,
          qualidade_score: card.qualidade_score
        },
        after: payload
      })
    }

    setMsg('✅ Salvo!')
    setSaving(false)
    setTimeout(onSaved, 700)
  }

  const label = (txt: string) => (
    <label style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#666',display:'block',marginBottom:6}}>
      {txt}
    </label>
  )

  const inputStyle: React.CSSProperties = {
    width:'100%',
    background:'#1a1a1a',
    border:'1px solid rgba(255,255,255,.1)',
    borderRadius:8,
    padding:'10px 12px',
    color:'#fff',
    fontSize:13,
    outline:'none',
    boxSizing:'border-box',
    fontFamily:'inherit'
  }

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.6)',backdropFilter:'blur(2px)'}}/>
      <div style={{
        position:'fixed',
        top:0,
        right:0,
        bottom:0,
        zIndex:201,
        width:620,
        maxWidth:'100vw',
        background:'#111',
        borderLeft:'1px solid rgba(255,255,255,.08)',
        display:'flex',
        flexDirection:'column'
      }}>
        <div style={{padding:'18px 20px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#0d0d0d'}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>{isNovo ? 'Novo Flashcard' : 'Editar Flashcard'}</div>
            {!isNovo && <div style={{fontSize:11,color:'#555'}}>ID: {card.id?.slice(0,8)}...</div>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#777',fontSize:22,cursor:'pointer'}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:16}}>
          <div>
            {label('Disciplina')}
            <input value={form.disciplina} onChange={e=>set('disciplina', e.target.value)} placeholder="Ex: Direito Constitucional" style={inputStyle}/>
          </div>

          <div>
            {label('Frente')}
            <textarea value={form.frente} onChange={e=>set('frente', e.target.value)} placeholder="Pergunta ou conceito..." rows={7}
              style={{...inputStyle, resize:'vertical', lineHeight:1.6}}/>
          </div>

          <div>
            {label('Verso')}
            <textarea value={form.verso} onChange={e=>set('verso', e.target.value)} placeholder="Resposta, explicação ou gabarito..." rows={7}
              style={{...inputStyle, resize:'vertical', lineHeight:1.6}}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              {label('Fonte')}
              <input value={form.fonte} onChange={e=>set('fonte', e.target.value)} placeholder="manual / auto / ia" style={inputStyle}/>
            </div>
            <div>
              {label('Qualidade Score')}
              <input value={form.qualidade_score} onChange={e=>set('qualidade_score', e.target.value.replace(/\D/g,''))} placeholder="0" style={inputStyle}/>
            </div>
          </div>

          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#ccc'}}>
              <input type="checkbox" checked={form.ativo} onChange={e=>set('ativo', e.target.checked)}/>
              Ativo
            </label>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#ccc'}}>
              <input type="checkbox" checked={form.revisado} onChange={e=>set('revisado', e.target.checked)}/>
              Revisado
            </label>
          </div>

          {!isNovo && card.questao_id && (
            <div style={{padding:12,borderRadius:10,background:'rgba(96,165,250,.08)',border:'1px solid rgba(96,165,250,.2)',fontSize:12,color:'#93c5fd'}}>
              Este flashcard foi gerado a partir de uma questão vinculada.
            </div>
          )}
        </div>

        <div style={{padding:16,borderTop:'1px solid rgba(255,255,255,.07)',background:'#0d0d0d'}}>
          {msg && (
            <div style={{marginBottom:10,padding:'9px 12px',borderRadius:8,fontSize:12,
              background:msg.startsWith('✅')?'rgba(52,211,153,.1)':'rgba(239,68,68,.1)',
              color:msg.startsWith('✅')?'#34d399':'#f87171',
              border:`1px solid ${msg.startsWith('✅')?'#34d399':'#ef4444'}44`}}>
              {msg}
            </div>
          )}
          <button onClick={salvar} disabled={saving}
            style={{width:'100%',background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'12px',fontWeight:900,color:'#000',cursor:saving?'not-allowed':'pointer',opacity:saving?.7:1}}>
            {saving ? '⏳ Salvando...' : isNovo ? '+ Criar Flashcard' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function ModuloFlashcards({ adminId }: { adminId?: string }) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [busca, setBusca] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [ativo, setAtivo] = useState('')
  const [editando, setEditando] = useState<Partial<Flashcard>|null>(null)
  const [novo, setNovo] = useState(false)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (pag = pagina, termo = busca) => {
    setLoading(true)

    let query = supabase
      .from('flashcards')
      .select('id,disciplina,frente,verso,questao_id,ativo,gerado_automaticamente,fonte,qualidade_score,revisado,created_at,updated_at', { count:'exact' })

    if (disciplina) query = query.eq('disciplina', disciplina)
    if (ativo === 'ativo') query = query.eq('ativo', true)
    if (ativo === 'inativo') query = query.eq('ativo', false)

    if (termo.trim()) {
      const t = termo.trim()
      query = query.or(`frente.ilike.%${t}%,verso.ilike.%${t}%,disciplina.ilike.%${t}%`)
    }

    const { data, count, error } = await query
      .order('updated_at', { ascending:false })
      .range(pag * POR_PAGINA, (pag + 1) * POR_PAGINA - 1)

    if (!error && data) {
      setCards(data as Flashcard[])
      setTotal(count || 0)
    }

    setLoading(false)
  }, [pagina, busca, disciplina, ativo])

  const loadDisciplinas = async () => {
    const { data } = await supabase.from('flashcards').select('disciplina')
    const unicas = [...new Set((data || []).map(d => d.disciplina).filter(Boolean))]
    return unicas.sort()
  }

  const [disciplinas, setDisciplinas] = useState<string[]>([])

  useEffect(() => {
    loadDisciplinas().then(setDisciplinas)
  }, [])

  useEffect(() => {
    setPagina(0)
  }, [disciplina, ativo])

  useEffect(() => {
    load(pagina, busca)
  }, [pagina, disciplina, ativo])

  const handleBusca = (v: string) => {
    setBusca(v)
    if (buscaTimer.current) clearTimeout(buscaTimer.current)
    buscaTimer.current = setTimeout(() => {
      setPagina(0)
      load(0, v)
    }, 400)
  }

  const audit = async (action_type: string, metadata: any) => {
    if (!adminId) return
    await supabase.from('admin_audit_logs').insert({
      user_id: adminId,
      action_type,
      target_type: 'flashcard',
      target_id: 'bulk',
      metadata
    })
  }

  const bulkAtivar = async (valor: boolean) => {
    if (selecionados.length === 0) return
    if (!confirm(`Confirmar alteração em ${selecionados.length} flashcard(s)?`)) return

    const { error } = await supabase.from('flashcards').update({
      ativo: valor,
      updated_at: new Date().toISOString()
    }).in('id', selecionados)

    if (!error) {
      await audit(valor ? 'BULK_ACTIVATE' : 'BULK_DEACTIVATE', { ids: selecionados, ativo: valor })
      setSelecionados([])
      load(pagina, busca)
    }
  }

  const totalPags = Math.ceil(total / POR_PAGINA)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:14}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:2}}>Flashcards</h2>
            <div style={{fontSize:12,color:'#555'}}>{total.toLocaleString()} flashcard(s) encontrado(s)</div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>load(pagina,busca)} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'8px 14px',color:'#888',fontSize:12,cursor:'pointer'}}>
              🔄 Atualizar
            </button>
            <button onClick={()=>setNovo(true)} style={{background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'8px 16px',color:'#000',fontSize:12,fontWeight:900,cursor:'pointer'}}>
              + Novo Flashcard
            </button>
          </div>
        </div>

        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input value={busca} onChange={e=>handleBusca(e.target.value)} placeholder="Buscar por frente, verso ou disciplina..."
            style={{flex:1,minWidth:240,background:'#1a1a1a',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'9px 14px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit'}}/>

          <select value={disciplina} onChange={e=>setDisciplina(e.target.value)}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'9px 12px',color:disciplina?'#fff':'#555',fontSize:13,colorScheme:'dark'}}>
            <option value="">Todas disciplinas</option>
            {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={ativo} onChange={e=>setAtivo(e.target.value)}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'9px 12px',color:ativo?'#fff':'#555',fontSize:13,colorScheme:'dark'}}>
            <option value="">Todos status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>

        {selecionados.length > 0 && (
          <div style={{marginTop:10,padding:10,borderRadius:10,background:'rgba(212,168,67,.08)',border:'1px solid rgba(212,168,67,.18)',display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}>
            <div style={{fontSize:12,color:'#D4A843'}}>{selecionados.length} selecionado(s)</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>bulkAtivar(true)} style={{background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.25)',borderRadius:7,padding:'6px 10px',color:'#34d399',fontSize:12,cursor:'pointer'}}>Ativar</button>
              <button onClick={()=>bulkAtivar(false)} style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:7,padding:'6px 10px',color:'#f87171',fontSize:12,cursor:'pointer'}}>Desativar</button>
            </div>
          </div>
        )}
      </div>

      {loading ? <Skeleton/> : cards.length === 0 ? (
        <EmptyState msg="Ajuste os filtros ou crie um novo flashcard."/>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'40px 1.5fr 2fr 1fr .8fr .8fr',gap:8,padding:'6px 14px',borderBottom:'1px solid rgba(255,255,255,.07)',marginBottom:4}}>
            {['','FRENTE','VERSO','DISCIPLINA','STATUS','ORIGEM'].map(h=>(
              <div key={h} style={{fontSize:10,fontWeight:800,letterSpacing:1.3,color:'#444',textTransform:'uppercase'}}>{h}</div>
            ))}
          </div>

          <div style={{flex:1,overflowY:'auto'}}>
            {cards.map(c => (
              <div key={c.id} onClick={()=>setEditando(c)}
                style={{display:'grid',gridTemplateColumns:'40px 1.5fr 2fr 1fr .8fr .8fr',gap:8,padding:'11px 14px',borderRadius:10,marginBottom:4,background:'#1a1a1a',border:'1px solid rgba(255,255,255,.05)',cursor:'pointer'}}
              >
                <div onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center'}}>
                  <input type="checkbox" checked={selecionados.includes(c.id)}
                    onChange={e=>setSelecionados(s => e.target.checked ? [...s, c.id] : s.filter(id => id !== c.id))}/>
                </div>

                <div style={{fontSize:12,color:'#fff',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                  {c.frente}
                </div>

                <div style={{fontSize:12,color:'#aaa',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                  {c.verso}
                </div>

                <div style={{fontSize:11,color:'#888',display:'flex',alignItems:'center',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {c.disciplina}
                </div>

                <div style={{display:'flex',alignItems:'center'}}>
                  {c.ativo ? <Badge color="#34d399">ATIVO</Badge> : <Badge color="#888">INATIVO</Badge>}
                </div>

                <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                  {c.gerado_automaticamente ? <Badge color="#60a5fa">AUTO</Badge> : <Badge color="#D4A843">MANUAL</Badge>}
                  {c.revisado && <Badge color="#34d399">REV</Badge>}
                </div>
              </div>
            ))}
          </div>

          {totalPags > 1 && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid rgba(255,255,255,.07)',marginTop:8}}>
              <div style={{fontSize:12,color:'#555'}}>Página {pagina + 1} de {totalPags}</div>
              <div style={{display:'flex',gap:6}}>
                <button disabled={pagina===0} onClick={()=>setPagina(p=>Math.max(0,p-1))}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'6px 12px',color:pagina===0?'#444':'#ccc',cursor:pagina===0?'not-allowed':'pointer'}}>←</button>
                <button disabled={pagina===totalPags-1} onClick={()=>setPagina(p=>Math.min(totalPags-1,p+1))}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'6px 12px',color:pagina===totalPags-1?'#444':'#ccc',cursor:pagina===totalPags-1?'not-allowed':'pointer'}}>→</button>
              </div>
            </div>
          )}
        </>
      )}

      {(editando || novo) && (
        <EditorFlashcard
          card={novo ? {} : editando!}
          adminId={adminId}
          onClose={()=>{setEditando(null);setNovo(false)}}
          onSaved={()=>{setEditando(null);setNovo(false);load(pagina,busca);loadDisciplinas().then(setDisciplinas)}}
        />
      )}
    </div>
  )
}
