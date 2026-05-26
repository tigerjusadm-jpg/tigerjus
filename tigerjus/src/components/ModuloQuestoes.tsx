'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface Questao {
  id: string
  prova_id: string | null
  numero_questao: number
  disciplina: string
  enunciado: string
  opcao_a: string
  opcao_b: string
  opcao_c: string
  opcao_d: string
  resposta_correta: string
  comentario: string | null
  status: string
  dificuldade: string
  fonte: string
  tags: string[]
  quality_score: number | null
  flagged: boolean
  flag_reason: string | null
  review_status: string
  review_notes: string | null
  versao_editorial: number
  lock_version: number
  created_at: string | null
  updated_at: string | null
}

const DISCIPLINAS = [
  'Direito Constitucional','Direito Administrativo','Direito Penal',
  'Direito Processual Penal','Direito Civil','Direito Processual Civil',
  'Direito do Trabalho','Direito Processual do Trabalho','Direito Tributário',
  'Direito Empresarial','Ética e Estatuto da OAB','Direito do Consumidor',
  'Direitos Humanos','Direito Ambiental','Filosofia do Direito',
  'Direito Internacional','Direito da Criança e do Adolescente',
]

const STATUS_COLOR: Record<string,{color:string;bg:string}> = {
  publicado:  {color:'#34d399',bg:'rgba(52,211,153,0.1)'},
  rascunho:   {color:'#60a5fa',bg:'rgba(96,165,250,0.1)'},
  revisao:    {color:'#D4A843',bg:'rgba(212,168,67,0.1)'},
  arquivado:  {color:'#6B7280',bg:'rgba(107,114,128,0.1)'},
}
const DIFIC_COLOR: Record<string,string> = {
  facil:'#34d399', medio:'#D4A843', dificil:'#f87171',
}

const POR_PAGINA = 25

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({msg}:{msg:string}) {
  return (
    <div style={{textAlign:'center',padding:48,color:'#555'}}>
      <div style={{fontSize:36,marginBottom:12}}>📝</div>
      <div style={{fontSize:14,fontWeight:600,color:'#666',marginBottom:6}}>Nenhuma questão encontrada</div>
      <div style={{fontSize:12}}>{msg}</div>
    </div>
  )
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {[...Array(8)].map((_,i) => (
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

// ─── EDITOR DE QUESTÃO ────────────────────────────────────────────────────────

interface EditorProps {
  questao: Partial<Questao>
  adminId: string
  onClose: () => void
  onSaved: () => void
}

function EditorQuestao({questao, adminId, onClose, onSaved}: EditorProps) {
  const isNova = !questao.id
  const [form, setForm] = useState({
    disciplina:      questao.disciplina      || DISCIPLINAS[0],
    enunciado:       questao.enunciado       || '',
    opcao_a:         questao.opcao_a         || '',
    opcao_b:         questao.opcao_b         || '',
    opcao_c:         questao.opcao_c         || '',
    opcao_d:         questao.opcao_d         || '',
    resposta_correta:questao.resposta_correta|| 'A',
    comentario:      questao.comentario      || '',
    status:          questao.status          || 'rascunho',
    dificuldade:     questao.dificuldade     || 'medio',
    fonte:           questao.fonte           || 'admin',
    review_status:   questao.review_status   || 'pendente',
    review_notes:    questao.review_notes    || '',
    tags:            (questao.tags || []).join(', '),
    flag_reason:     questao.flag_reason     || '',
    flagged:         questao.flagged         || false,
  })
  const [saving, setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [msg, setMsg]           = useState('')
  const lockVersion             = questao.lock_version || 1

  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}))

  const salvar = async () => {
    if (!form.enunciado || !form.opcao_a || !form.opcao_b || !form.opcao_c || !form.opcao_d) {
      setMsg('❌ Preencha enunciado e todas as opções.'); return
    }
    setSaving(true); setMsg('')

    const payload: any = {
      disciplina:       form.disciplina,
      enunciado:        form.enunciado,
      opcao_a:          form.opcao_a,
      opcao_b:          form.opcao_b,
      opcao_c:          form.opcao_c,
      opcao_d:          form.opcao_d,
      resposta_correta: form.resposta_correta,
      comentario:       form.comentario || null,
      status:           form.status,
      dificuldade:      form.dificuldade,
      fonte:            form.fonte,
      review_status:    form.review_status,
      review_notes:     form.review_notes || null,
      tags:             form.tags ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
      flagged:          form.flagged,
      flag_reason:      form.flag_reason || null,
      updated_by:       adminId,
    }

    if (isNova) {
      payload.created_by    = adminId
      payload.numero_questao = 0
      const { error } = await supabase.from('questoes_oab').insert(payload)
      if (error) { setMsg('❌ Erro ao criar questão.'); setSaving(false); return }
      await supabase.from('admin_audit_logs').insert({
        user_id: adminId, action_type: 'CREATE',
        target_type: 'questao', target_id: 'nova',
        metadata: { disciplina: form.disciplina },
      })
    } else {
      // Optimistic lock — verifica se outro admin não editou antes
      const { data: atual } = await supabase
        .from('questoes_oab').select('lock_version').eq('id', questao.id!).single()
      if (atual && atual.lock_version !== lockVersion) {
        setMsg('❌ Esta questão foi editada por outro admin. Feche e reabra para ver a versão atual.')
        setSaving(false); return
      }

      // Salva snapshot antes de atualizar
      await supabase.from('questoes_versoes').insert({
        questao_id:       questao.id,
        version_group_id: questao.id,
        versao_editorial: questao.versao_editorial || 1,
        snapshot:         questao,
        alterado_por:     adminId,
        motivo:           'Edição via admin',
      })

      const { error } = await supabase
        .from('questoes_oab')
        .update({ ...payload, versao_editorial: (questao.versao_editorial || 1) + 1 })
        .eq('id', questao.id!)
      if (error) { setMsg('❌ Erro ao salvar.'); setSaving(false); return }

      await supabase.from('admin_audit_logs').insert({
        user_id: adminId, action_type: 'UPDATE',
        target_type: 'questao', target_id: questao.id,
        metadata: { disciplina: form.disciplina, status: form.status },
      })
    }

    setMsg('✅ Salvo!'); setTimeout(() => onSaved(), 1000)
    setSaving(false)
  }

  const arquivar = async () => {
    if (!questao.id) return
    await supabase.from('questoes_oab').update({
      status: 'arquivado', archived_at: new Date().toISOString(), archived_by: adminId,
    }).eq('id', questao.id!)
    await supabase.from('admin_audit_logs').insert({
      user_id: adminId, action_type: 'ARCHIVE',
      target_type: 'questao', target_id: questao.id,
      metadata: {},
    })
    onSaved()
  }

  const label = (s: string) => (
    <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:5}}>
      {s}
    </label>
  )

  const inp = (val: string, onChange: (v:string)=>void, placeholder='', mono=false) => (
    <input value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,
        padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',fontFamily:mono?'monospace':'inherit',boxSizing:'border-box'}}/>
  )

  const textarea = (val: string, onChange: (v:string)=>void, rows=3, placeholder='') => (
    <textarea value={val} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,
        padding:'10px 12px',color:'#ccc',fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',
        lineHeight:1.7,boxSizing:'border-box'}}/>
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
      <div style={{position:'fixed',top:0,right:0,bottom:0,zIndex:201,width:600,maxWidth:'100vw',
        background:'#111',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'18px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:'#0d0d0d'}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{isNova ? 'Nova Questão' : 'Editar Questão'}</div>
            {!isNova && <div style={{fontSize:11,color:'#555'}}>v{questao.versao_editorial} · lock:{lockVersion}</div>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:20}}>✕</button>
        </div>

        {/* Corpo do editor */}
        <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:16}}>

          {/* Metadados */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            <div>{label('STATUS')}{sel(form.status, v=>set('status',v), [['rascunho','Rascunho'],['revisao','Revisão'],['publicado','Publicado'],['arquivado','Arquivado']])}</div>
            <div>{label('DIFICULDADE')}{sel(form.dificuldade, v=>set('dificuldade',v), [['facil','Fácil'],['medio','Médio'],['dificil','Difícil']])}</div>
            <div>{label('FONTE')}{sel(form.fonte, v=>set('fonte',v), [['oab_oficial','OAB Oficial'],['admin','Admin'],['ia','IA'],['importacao','Importação'],['parceiro','Parceiro']])}</div>
          </div>

          {/* Disciplina */}
          <div>
            {label('DISCIPLINA')}
            <select value={form.disciplina} onChange={e=>set('disciplina',e.target.value)}
              style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
              {DISCIPLINAS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Enunciado */}
          <div>
            {label(`ENUNCIADO (${form.enunciado.length} chars)`)}
            {textarea(form.enunciado, v=>set('enunciado',v), 6, 'Digite o enunciado da questão...')}
          </div>

          {/* Alternativas */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {label('ALTERNATIVAS')}
            {(['a','b','c','d'] as const).map(l => {
              const key = `opcao_${l}` as keyof typeof form
              const isCorreta = form.resposta_correta === l.toUpperCase()
              return (
                <div key={l} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <button onClick={()=>set('resposta_correta',l.toUpperCase())}
                    style={{width:28,height:28,borderRadius:'50%',flexShrink:0,marginTop:6,
                      background:isCorreta?'#34d399':'rgba(255,255,255,0.06)',
                      border:isCorreta?'2px solid #34d399':'2px solid rgba(255,255,255,0.1)',
                      color:isCorreta?'#000':'#888',fontSize:11,fontWeight:900,cursor:'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {l.toUpperCase()}
                  </button>
                  <div style={{flex:1}}>
                    {inp(form[key] as string, v=>set(key,v), `Opção ${l.toUpperCase()}...`)}
                  </div>
                </div>
              )
            })}
            <div style={{fontSize:11,color:'#555',marginTop:2}}>
              Clique na letra para marcar como gabarito. Atual: <strong style={{color:'#34d399'}}>{form.resposta_correta}</strong>
            </div>
          </div>

          {/* Comentário */}
          <div>
            {label('COMENTÁRIO / JUSTIFICATIVA')}
            {textarea(form.comentario, v=>set('comentario',v), 3, 'Explicação do gabarito...')}
          </div>

          {/* Tags */}
          <div>
            {label('TAGS (separadas por vírgula)')}
            {inp(form.tags, v=>set('tags',v), 'Ex: habeas corpus, art. 5º, STF')}
          </div>

          {/* Review */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>{label('STATUS DE REVISÃO')}{sel(form.review_status, v=>set('review_status',v), [['pendente','Pendente'],['em_revisao','Em revisão'],['aprovado','Aprovado'],['reprovado','Reprovado']])}</div>
            <div>
              {label('FLAGGED')}
              <div style={{display:'flex',alignItems:'center',gap:10,height:38}}>
                <div onClick={()=>set('flagged',!form.flagged)}
                  style={{width:40,height:22,borderRadius:11,background:form.flagged?'#f87171':'#374151',position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
                  <div style={{position:'absolute',top:3,left:form.flagged?20:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                </div>
                <span style={{fontSize:12,color:form.flagged?'#f87171':'#555'}}>{form.flagged?'Flagged':'Normal'}</span>
              </div>
            </div>
          </div>

          {form.flagged && (
            <div>
              {label('MOTIVO DO FLAG')}
              {inp(form.flag_reason, v=>set('flag_reason',v), 'Descreva o problema...')}
            </div>
          )}

          {form.review_notes !== undefined && (
            <div>
              {label('NOTAS DE REVISÃO')}
              {textarea(form.review_notes, v=>set('review_notes',v), 2, 'Notas para o revisor...')}
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
              {saving?'⏳ Salvando...':isNova?'+ Criar Questão':'💾 Salvar'}
            </button>
            {!isNova && !confirmDel && (
              <button onClick={()=>setConfirmDel(true)}
                style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,
                  padding:'11px 14px',color:'#f87171',fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>
                Arquivar
              </button>
            )}
            {confirmDel && (
              <button onClick={arquivar}
                style={{background:'rgba(239,68,68,0.2)',border:'1px solid #ef4444',borderRadius:8,
                  padding:'11px 14px',color:'#f87171',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                Confirmar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── PREVIEW DA QUESTÃO ───────────────────────────────────────────────────────

function PreviewQuestao({q, onClose}:{q:Questao; onClose:()=>void}) {
  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(3px)'}} onClick={onClose}/>
      <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:201,
        width:'100%',maxWidth:620,maxHeight:'85vh',overflowY:'auto',
        background:'#111',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:24}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Badge label={q.status} {...(STATUS_COLOR[q.status]||{color:'#888',bg:'#1a1a1a'})}/>
            <Badge label={q.dificuldade} color={DIFIC_COLOR[q.dificuldade]||'#888'} bg={`${DIFIC_COLOR[q.dificuldade]||'#888'}18`}/>
            <span style={{fontSize:11,color:'#555'}}>{q.disciplina}</span>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:18}}>✕</button>
        </div>
        <div style={{fontSize:15,fontWeight:600,lineHeight:1.7,color:'#fff',marginBottom:20}}>{q.enunciado}</div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {(['a','b','c','d'] as const).map(l=>{
            const isCorreta = q.resposta_correta === l.toUpperCase()
            const texto = q[`opcao_${l}` as keyof Questao] as string
            return (
              <div key={l} style={{display:'flex',gap:10,padding:'10px 14px',borderRadius:10,
                background:isCorreta?'rgba(52,211,153,0.08)':'rgba(255,255,255,0.03)',
                border:`1px solid ${isCorreta?'#34d399':'rgba(255,255,255,0.07)'}`}}>
                <span style={{fontWeight:800,color:isCorreta?'#34d399':'#666',flexShrink:0}}>{l.toUpperCase()})</span>
                <span style={{fontSize:13,color:isCorreta?'#fff':'#aaa'}}>{texto}</span>
                {isCorreta && <span style={{marginLeft:'auto',color:'#34d399',fontSize:12}}>✅ Gabarito</span>}
              </div>
            )
          })}
        </div>
        {q.comentario && (
          <div style={{padding:'12px 14px',background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:10,fontSize:13,color:'#aaa',lineHeight:1.7}}>
            <strong style={{color:'#D4A843'}}>Comentário:</strong> {q.comentario}
          </div>
        )}
      </div>
    </>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloQuestoes({adminId}:{adminId?:string}) {
  const [questoes, setQuestoes]   = useState<Questao[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [pagina, setPagina]       = useState(0)
  const [busca, setBusca]         = useState('')
  const [filtroDisciplina, setFiltroDisciplina] = useState('')
  const [filtroStatus, setFiltroStatus]         = useState('')
  const [filtroDificuldade, setFiltroDificuldade] = useState('')
  const [editando, setEditando]   = useState<Partial<Questao>|null>(null)
  const [preview, setPreview]     = useState<Questao|null>(null)
  const [novaCriando, setNovaCriando] = useState(false)
  const buscaTimer                = useRef<NodeJS.Timeout>()

  const load = useCallback(async (pag = pagina, termoBusca = busca) => {
    setLoading(true)

    let query = supabase.from('questoes_oab').select(
      'id,prova_id,numero_questao,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d,resposta_correta,comentario,status,dificuldade,fonte,tags,quality_score,flagged,flag_reason,review_status,review_notes,versao_editorial,lock_version,created_at,updated_at',
      { count: 'exact' }
    )

    // Filtros
    if (filtroStatus)      query = query.eq('status', filtroStatus)
    if (filtroDisciplina)  query = query.eq('disciplina', filtroDisciplina)
    if (filtroDificuldade) query = query.eq('dificuldade', filtroDificuldade)

    // Full text search ou busca simples
    if (termoBusca.trim().length >= 3) {
      query = query.textSearch('search_vector', termoBusca.trim(), {
        type: 'websearch', config: 'portuguese',
      })
    }

    const { data, count, error } = await query
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(pag * POR_PAGINA, (pag + 1) * POR_PAGINA - 1)

    if (!error && data) { setQuestoes(data as Questao[]); setTotal(count || 0) }
    setLoading(false)
  }, [pagina, busca, filtroStatus, filtroDisciplina, filtroDificuldade])

  useEffect(() => { setPagina(0) }, [filtroStatus, filtroDisciplina, filtroDificuldade])
  useEffect(() => { load(pagina, busca) }, [pagina, filtroStatus, filtroDisciplina, filtroDificuldade])

  const handleBusca = (v: string) => {
    setBusca(v)
    clearTimeout(buscaTimer.current)
    buscaTimer.current = setTimeout(() => { setPagina(0); load(0, v) }, 400)
  }

  const totalPags = Math.ceil(total / POR_PAGINA)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>

      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:2}}>Questões</h2>
            <div style={{fontSize:12,color:'#555'}}>{total.toLocaleString()} questões encontradas</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>load(pagina,busca)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'7px 14px',color:'#888',fontSize:12,cursor:'pointer'}}>
              🔄 Atualizar
            </button>
            <button onClick={()=>setNovaCriando(true)}
              style={{background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'7px 16px',color:'#000',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              + Nova Questão
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input value={busca} onChange={e=>handleBusca(e.target.value)}
            placeholder="Buscar no enunciado, comentário ou disciplina..."
            style={{flex:1,minWidth:220,background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 14px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
          <select value={filtroStatus} onChange={e=>{setFiltroStatus(e.target.value);setPagina(0)}}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:filtroStatus?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
            <option value="">Todos status</option>
            <option value="publicado">Publicado</option>
            <option value="rascunho">Rascunho</option>
            <option value="revisao">Revisão</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <select value={filtroDisciplina} onChange={e=>{setFiltroDisciplina(e.target.value);setPagina(0)}}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:filtroDisciplina?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
            <option value="">Todas disciplinas</option>
            {DISCIPLINAS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filtroDificuldade} onChange={e=>{setFiltroDificuldade(e.target.value);setPagina(0)}}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:filtroDificuldade?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
            <option value="">Todas dificuldades</option>
            <option value="facil">Fácil</option>
            <option value="medio">Médio</option>
            <option value="dificil">Difícil</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      {loading ? <Skeleton/> : questoes.length === 0 ? (
        <EmptyState msg={busca ? 'Tente outros termos de busca.' : 'Ajuste os filtros ou crie uma nova questão.'}/>
      ) : (
        <>
          {/* Cabeçalho */}
          <div style={{display:'grid',gridTemplateColumns:'3fr 1.2fr 0.8fr 0.8fr 0.6fr',gap:8,padding:'6px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:4}}>
            {['ENUNCIADO','DISCIPLINA','STATUS','DIFICULDADE',''].map((h,i)=>(
              <div key={i} style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:'#444',textTransform:'uppercase'}}>{h}</div>
            ))}
          </div>

          {/* Linhas */}
          <div style={{flex:1,overflowY:'auto'}}>
            {questoes.map(q=>(
              <div key={q.id}
                style={{display:'grid',gridTemplateColumns:'3fr 1.2fr 0.8fr 0.8fr 0.6fr',gap:8,padding:'11px 14px',
                  borderRadius:10,marginBottom:4,background:'#1a1a1a',border:`1px solid ${q.flagged?'rgba(248,113,113,0.2)':'rgba(255,255,255,0.05)'}`,
                  transition:'border-color 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(212,168,67,0.2)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor=q.flagged?'rgba(248,113,113,0.2)':'rgba(255,255,255,0.05)'}>

                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:500,color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3}}>
                    {q.flagged && <span style={{color:'#f87171',marginRight:6}}>⚑</span>}
                    {q.enunciado}
                  </div>
                  {q.tags?.length > 0 && (
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {q.tags.slice(0,3).map(t=>(
                        <span key={t} style={{fontSize:9,padding:'1px 6px',background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:4,color:'#D4A843'}}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{display:'flex',alignItems:'center'}}>
                  <span style={{fontSize:11,color:'#888',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {q.disciplina.replace('Direito ','').replace(' da OAB','')}
                  </span>
                </div>

                <div style={{display:'flex',alignItems:'center'}}>
                  <Badge label={q.status} {...(STATUS_COLOR[q.status]||{color:'#888',bg:'#1a1a1a'})}/>
                </div>

                <div style={{display:'flex',alignItems:'center'}}>
                  <Badge label={q.dificuldade} color={DIFIC_COLOR[q.dificuldade]||'#888'} bg={`${DIFIC_COLOR[q.dificuldade]||'#888'}18`}/>
                </div>

                <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                  <button onClick={()=>setPreview(q)}
                    style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,padding:'4px 8px',color:'#666',fontSize:10,cursor:'pointer'}}>
                    👁
                  </button>
                  <button onClick={()=>setEditando(q)}
                    style={{background:'rgba(212,168,67,0.08)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:6,padding:'4px 8px',color:'#D4A843',fontSize:10,cursor:'pointer'}}>
                    ✏️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação server-side */}
          {totalPags > 1 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.07)',marginTop:8,flexShrink:0}}>
              <div style={{fontSize:12,color:'#555'}}>
                Página {pagina+1} de {totalPags} · {total.toLocaleString()} questões
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <button onClick={()=>setPagina(0)} disabled={pagina===0}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 10px',color:pagina===0?'#444':'#ccc',fontSize:11,cursor:pagina===0?'not-allowed':'pointer'}}>
                  «
                </button>
                <button onClick={()=>setPagina(p=>Math.max(0,p-1))} disabled={pagina===0}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 12px',color:pagina===0?'#444':'#ccc',fontSize:12,cursor:pagina===0?'not-allowed':'pointer'}}>
                  ← Anterior
                </button>
                <span style={{fontSize:12,color:'#666',padding:'0 4px'}}>{pagina+1}</span>
                <button onClick={()=>setPagina(p=>Math.min(totalPags-1,p+1))} disabled={pagina===totalPags-1}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 12px',color:pagina===totalPags-1?'#444':'#ccc',fontSize:12,cursor:pagina===totalPags-1?'not-allowed':'pointer'}}>
                  Próxima →
                </button>
                <button onClick={()=>setPagina(totalPags-1)} disabled={pagina===totalPags-1}
                  style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 10px',color:pagina===totalPags-1?'#444':'#ccc',fontSize:11,cursor:pagina===totalPags-1?'not-allowed':'pointer'}}>
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Editor */}
      {(editando || novaCriando) && adminId && (
        <EditorQuestao
          questao={novaCriando ? {} : editando!}
          adminId={adminId}
          onClose={()=>{setEditando(null);setNovaCriando(false)}}
          onSaved={()=>{setEditando(null);setNovaCriando(false);load(pagina,busca)}}
        />
      )}

      {/* Preview */}
      {preview && <PreviewQuestao q={preview} onClose={()=>setPreview(null)}/>}
    </div>
  )
}
