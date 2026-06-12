'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Prova {
  id: string; numero_exame: number; nome: string
  ano: number | null; edicao: string | null; ativo: boolean
  created_at: string; _qtd?: number
}

interface Questao {
  id: string; prova_id: string; disciplina: string; numero_questao: number | null
  enunciado: string; opcao_a: string; opcao_b: string; opcao_c: string; opcao_d: string
  resposta_correta: string; comentario: string | null; ativo: boolean
}

const DISCIPLINAS = [
  'Constitucional','Administrativo','Penal','Processo Penal','Civil',
  'Processo Civil','Trabalho','Processo do Trabalho','Tributário',
  'Empresarial','Ética','Consumidor','Direitos Humanos','Ambiental',
  'Filosofia','Internacional','ECA'
]

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={e => { e.stopPropagation(); onChange(!on) }}
      style={{ width:36, height:20, borderRadius:10, background: on ? '#34d399' : '#374151',
        position:'relative', cursor:'pointer', flexShrink:0, transition:'background 0.2s' }}>
      <div style={{ position:'absolute', top:2, left: on ? 18 : 2, width:16, height:16,
        borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
    </div>
  )
}

// ── QuestaoForm (edit/create questao) ─────────────────────────────────────────
function QuestaoForm({ q, provaId, adminId, onSaved, onCancel }: {
  q?: Questao; provaId: string; adminId?: string
  onSaved: () => void; onCancel: () => void
}) {
  const [form, setForm] = useState({
    numero_questao: q?.numero_questao?.toString() || '',
    disciplina: q?.disciplina || DISCIPLINAS[0],
    enunciado: q?.enunciado || '',
    opcao_a: q?.opcao_a || '', opcao_b: q?.opcao_b || '',
    opcao_c: q?.opcao_c || '', opcao_d: q?.opcao_d || '',
    resposta_correta: q?.resposta_correta || 'A',
    comentario: q?.comentario || '', ativo: q?.ativo ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const salvar = async () => {
    if (!form.enunciado.trim()) { setMsg('❌ Enunciado obrigatório.'); return }
    setSaving(true); setMsg('')
    const payload = {
      prova_id: provaId, disciplina: form.disciplina,
      numero_questao: form.numero_questao ? parseInt(form.numero_questao) : null,
      enunciado: form.enunciado, opcao_a: form.opcao_a,
      opcao_b: form.opcao_b, opcao_c: form.opcao_c, opcao_d: form.opcao_d,
      resposta_correta: form.resposta_correta.toUpperCase(),
      comentario: form.comentario || null, ativo: form.ativo,
    }
    const { error } = q?.id
      ? await supabase.from('questoes_oab').update(payload).eq('id', q.id)
      : await supabase.from('questoes_oab').insert(payload)
    if (error) { setMsg('❌ Erro: ' + error.message) }
    else { setMsg('✅ Salvo!'); setTimeout(onSaved, 700) }
    setSaving(false)
  }

  const inp = (label: string, key: string, placeholder = '') => (
    <div>
      <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:4 }}>{label}</label>
      <input value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit' }}/>
    </div>
  )

  return (
    <div style={{ background:'#1a1a1a', border:'1px solid rgba(212,168,67,0.2)', borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:13, fontWeight:700, color:'#D4A843', marginBottom:4 }}>{q ? 'Editar Questão' : '+ Nova Questão'}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:4 }}>DISCIPLINA</label>
          <select value={form.disciplina} onChange={e => set('disciplina', e.target.value)}
            style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:13, outline:'none', colorScheme:'dark' as const, fontFamily:'inherit' }}>
            {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>{inp('Nº Questão', 'numero_questao', 'Ex: 1')}</div>
      </div>
      <div>
        <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:4 }}>ENUNCIADO *</label>
        <textarea value={form.enunciado} onChange={e => set('enunciado', e.target.value)} rows={4}
          style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:13, outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6, boxSizing:'border-box' as const }}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {inp('Opção A', 'opcao_a')}{inp('Opção B', 'opcao_b')}
        {inp('Opção C', 'opcao_c')}{inp('Opção D', 'opcao_d')}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:4 }}>RESPOSTA CORRETA</label>
          <select value={form.resposta_correta} onChange={e => set('resposta_correta', e.target.value)}
            style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'#34d399', fontSize:14, fontWeight:700, outline:'none', colorScheme:'dark' as const, fontFamily:'inherit' }}>
            {['A','B','C','D'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:24 }}>
          <Toggle on={form.ativo} onChange={v => set('ativo', v)}/>
          <span style={{ fontSize:12, color: form.ativo ? '#34d399' : '#888' }}>{form.ativo ? 'Ativa' : 'Inativa'}</span>
        </div>
      </div>
      <div>
        <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:4 }}>COMENTÁRIO / FUNDAMENTAÇÃO</label>
        <textarea value={form.comentario} onChange={e => set('comentario', e.target.value)} rows={2}
          style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'#ccc', fontSize:12, outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6, boxSizing:'border-box' as const }}/>
      </div>
      {msg && <div style={{ padding:'8px 12px', background: msg.startsWith('✅') ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', border:`1px solid ${msg.startsWith('✅') ? '#34d399' : '#ef4444'}44`, borderRadius:8, fontSize:12, color: msg.startsWith('✅') ? '#34d399' : '#f87171' }}>{msg}</div>}
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={salvar} disabled={saving}
          style={{ flex:1, background:'linear-gradient(135deg,#D4A843,#E8621A)', border:'none', borderRadius:8, padding:'10px', color:'#000', fontSize:13, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '⏳ Salvando...' : '💾 Salvar'}
        </button>
        <button onClick={onCancel}
          style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'10px 16px', color:'#888', fontSize:13, cursor:'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── ProvaDrawer (edit prova + view questoes) ──────────────────────────────────
function ProvaDrawer({ prova, adminId, onClose, onSaved }: {
  prova: Prova | null; adminId?: string; onClose: () => void; onSaved: () => void
}) {
  const isNova = !prova
  const [tab, setTab] = useState<'info'|'questoes'|'stats'>('info')
  const [form, setForm] = useState({ nome: prova?.nome || '', numero_exame: prova?.numero_exame?.toString() || '', ano: prova?.ano?.toString() || '', edicao: prova?.edicao || '', ativo: prova?.ativo ?? true })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [loadingQ, setLoadingQ] = useState(false)
  const [novaQ, setNovaQ] = useState(false)
  const [editQ, setEditQ] = useState<Questao | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [filtroDisc, setFiltroDisc] = useState('')
  const [buscaQ, setBuscaQ] = useState('')

  const loadQuestoes = useCallback(async () => {
    if (!prova?.id) return
    setLoadingQ(true)
    const { data } = await supabase.from('questoes_oab').select('*').eq('prova_id', prova.id).order('numero_questao', { ascending: true })
    setQuestoes(data || [])
    setLoadingQ(false)
  }, [prova?.id])

  useEffect(() => { if (tab === 'questoes') loadQuestoes() }, [tab, loadQuestoes])

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const salvarProva = async () => {
    if (!form.nome.trim() || !form.numero_exame) { setMsg('❌ Nome e nº do exame são obrigatórios.'); return }
    setSaving(true); setMsg('')
    const payload = { nome: form.nome, numero_exame: parseInt(form.numero_exame), ano: form.ano ? parseInt(form.ano) : null, edicao: form.edicao || null, ativo: form.ativo }
    const { error } = isNova
      ? await supabase.from('provas_oab').insert(payload)
      : await supabase.from('provas_oab').update(payload).eq('id', prova!.id)
    if (error) { setMsg('❌ Erro: ' + error.message) }
    else { setMsg('✅ Salvo!'); setTimeout(() => { onSaved(); if (isNova) onClose() }, 800) }
    setSaving(false)
  }

  const excluirQ = async (id: string) => {
    await supabase.from('questoes_oab').delete().eq('id', id)
    setConfirmDel(null); loadQuestoes()
  }

  const questoesFiltradas = questoes.filter(q => {
    if (filtroDisc && q.disciplina !== filtroDisc) return false
    if (buscaQ && !q.enunciado.toLowerCase().includes(buscaQ.toLowerCase())) return false
    return true
  })

  const discCount = DISCIPLINAS.reduce((acc, d) => {
    acc[d] = questoes.filter(q => q.disciplina === d).length
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(2px)' }} onClick={onClose}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, zIndex:201, width:680, maxWidth:'100vw', background:'#111', borderLeft:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', overflowY:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'18px 20px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'#0d0d0d', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{isNova ? '+ Nova Prova OAB' : `${prova!.numero_exame}º Exame de Ordem`}</div>
              {!isNova && <div style={{ fontSize:11, color:'#555', marginTop:2 }}>{prova!.nome}</div>}
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', fontSize:22, cursor:'pointer' }}>✕</button>
          </div>
          {!isNova && (
            <div style={{ display:'flex', gap:4, marginBottom:0 }}>
              {(['info','questoes','stats'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding:'8px 16px', borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer', fontSize:12, fontWeight: tab===t ? 700 : 400, background: tab===t ? '#111' : 'transparent', color: tab===t ? '#D4A843' : '#666', borderBottom: tab===t ? '2px solid #D4A843' : '2px solid transparent' }}>
                  {t === 'info' ? '📋 Informações' : t === 'questoes' ? `📝 Questões (${questoes.length})` : '📊 Estatísticas'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>

          {/* Tab: Info / Nova Prova */}
          {(tab === 'info' || isNova) && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[['Nome da Prova','nome','Ex: 46º Exame de Ordem Unificado'],['Nº do Exame','numero_exame','Ex: 46'],['Ano','ano','Ex: 2026'],['Edição','edicao','Ex: 2026/1']].map(([label,key,ph]) => (
                  <div key={key} style={{ gridColumn: key === 'nome' ? 'span 2' : 'span 1' }}>
                    <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:5 }}>{label}</label>
                    <input value={(form as any)[key]} onChange={e => setF(key, e.target.value)} placeholder={ph}
                      style={{ width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit' }}/>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Toggle on={form.ativo} onChange={v => setF('ativo', v)}/>
                <span style={{ fontSize:13, color: form.ativo ? '#34d399' : '#888' }}>{form.ativo ? 'Prova ativa — visível para usuários' : 'Prova inativa — oculta'}</span>
              </div>
              {msg && <div style={{ padding:'8px 12px', background: msg.startsWith('✅') ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', border:`1px solid ${msg.startsWith('✅') ? '#34d399' : '#ef4444'}44`, borderRadius:8, fontSize:12, color: msg.startsWith('✅') ? '#34d399' : '#f87171' }}>{msg}</div>}
            </div>
          )}

          {/* Tab: Questoes */}
          {tab === 'questoes' && !isNova && (
            <div>
              {/* Distribuição por disciplina */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                {DISCIPLINAS.filter(d => discCount[d] > 0).map(d => (
                  <button key={d} onClick={() => setFiltroDisc(filtroDisc === d ? '' : d)}
                    style={{ padding:'4px 10px', borderRadius:100, fontSize:11, cursor:'pointer',
                      background: filtroDisc === d ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${filtroDisc === d ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: filtroDisc === d ? '#D4A843' : '#777' }}>
                    {d} <span style={{ opacity:0.6 }}>{discCount[d]}</span>
                  </button>
                ))}
              </div>
              {/* Busca */}
              <div style={{ position:'relative', marginBottom:16 }}>
                <input value={buscaQ} onChange={e => setBuscaQ(e.target.value)} placeholder="Buscar no enunciado..."
                  style={{ width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px 8px 36px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' as const }}/>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#555', fontSize:14 }}>🔍</span>
                {(buscaQ || filtroDisc) && <button onClick={() => { setBuscaQ(''); setFiltroDisc('') }} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:16 }}>✕</button>}
              </div>
              {/* Nova questão */}
              {!novaQ && !editQ && (
                <button onClick={() => setNovaQ(true)}
                  style={{ width:'100%', background:'rgba(212,168,67,0.06)', border:'1px dashed rgba(212,168,67,0.25)', borderRadius:10, padding:'10px', color:'#D4A843', fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:14 }}>
                  + Nova Questão
                </button>
              )}
              {novaQ && <div style={{ marginBottom:14 }}><QuestaoForm provaId={prova!.id} adminId={adminId} onSaved={() => { setNovaQ(false); loadQuestoes() }} onCancel={() => setNovaQ(false)}/></div>}
              {/* Lista */}
              {loadingQ ? <div style={{ textAlign:'center', padding:32, color:'#555' }}>⏳ Carregando questões...</div>
                : questoesFiltradas.length === 0 ? <div style={{ textAlign:'center', padding:32, color:'#555' }}>Nenhuma questão encontrada.</div>
                : questoesFiltradas.map((q, idx) => (
                  <div key={q.id} style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:14, marginBottom:10 }}>
                    {editQ?.id === q.id
                      ? <QuestaoForm q={q} provaId={prova!.id} adminId={adminId} onSaved={() => { setEditQ(null); loadQuestoes() }} onCancel={() => setEditQ(null)}/>
                      : <>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, gap:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                              <span style={{ fontSize:10, fontWeight:700, color:'#888' }}>Q{q.numero_questao || idx+1}</span>
                              <span style={{ fontSize:9, padding:'2px 8px', borderRadius:100, background:'rgba(212,168,67,0.08)', color:'#D4A843', border:'1px solid rgba(212,168,67,0.2)' }}>{q.disciplina}</span>
                              <span style={{ fontSize:9, padding:'2px 8px', borderRadius:100, background: q.resposta_correta === '*' ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.1)', color: q.resposta_correta === '*' ? '#fbbf24' : '#34d399', border:`1px solid ${q.resposta_correta === '*' ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.3)'}` }}>
                                {q.resposta_correta === '*' ? 'Anulada' : `Resp: ${q.resposta_correta}`}
                              </span>
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={() => setEditQ(q)} style={{ padding:'4px 10px', background:'rgba(212,168,67,0.08)', border:'1px solid rgba(212,168,67,0.2)', borderRadius:6, color:'#D4A843', fontSize:11, cursor:'pointer' }}>Editar</button>
                              {confirmDel === q.id
                                ? <button onClick={() => excluirQ(q.id)} style={{ padding:'4px 10px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, color:'#f87171', fontSize:11, cursor:'pointer', fontWeight:700 }}>Confirmar</button>
                                : <button onClick={() => setConfirmDel(q.id)} style={{ padding:'4px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, color:'#555', fontSize:11, cursor:'pointer' }}>Excluir</button>
                              }
                            </div>
                          </div>
                          <div style={{ fontSize:12, color:'#ccc', lineHeight:1.6 }}>{q.enunciado.slice(0,180)}{q.enunciado.length > 180 ? '...' : ''}</div>
                        </>
                    }
                  </div>
                ))
              }
            </div>
          )}

          {/* Tab: Stats */}
          {tab === 'stats' && !isNova && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:'rgba(212,168,67,0.04)', border:'1px solid rgba(212,168,67,0.12)', borderRadius:12, padding:16 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:'#D4A843', marginBottom:12 }}>📊 RESUMO DA PROVA</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {[
                    { label:'Total de Questões', value: prova?._qtd || '—', color:'#60a5fa' },
                    { label:'Status', value: prova?.ativo ? 'Ativa' : 'Inativa', color: prova?.ativo ? '#34d399' : '#f87171' },
                    { label:'Edição', value: prova?.edicao || '—', color:'#D4A843' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:14, textAlign:'center' }}>
                      <div style={{ fontSize:20, fontWeight:900, color:s.color, marginBottom:6 }}>{s.value}</div>
                      <div style={{ fontSize:10, color:'#555' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:16 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:'#888', marginBottom:12 }}>📐 QUESTÕES POR DISCIPLINA</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {DISCIPLINAS.filter(d => discCount[d] > 0).sort((a,b) => discCount[b] - discCount[a]).map(d => (
                    <div key={d} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:140, fontSize:12, color:'#ccc', flexShrink:0 }}>{d}</div>
                      <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${Math.round((discCount[d]/(prova?._qtd||80))*100)}%`, height:'100%', background:'linear-gradient(90deg,#D4A843,#E8621A)', borderRadius:3 }}/>
                      </div>
                      <div style={{ fontSize:12, color:'#888', width:24, textAlign:'right' }}>{discCount[d]}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:12, padding:16, textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>📈</div>
                <div style={{ fontSize:13, color:'#888', lineHeight:1.7 }}>
                  Para rastrear quem realizou esta prova e a taxa de acerto por usuário,<br/>crie a tabela <code style={{ color:'#D4A843' }}>simulado_results</code> com campos<br/><code style={{ color:'#D4A843' }}>user_id, prova_id, score, total, created_at</code>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(tab === 'info' || isNova) && (
          <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', background:'#0d0d0d', flexShrink:0 }}>
            <button onClick={salvarProva} disabled={saving}
              style={{ width:'100%', background:'linear-gradient(135deg,#D4A843,#E8621A)', border:'none', borderRadius:8, padding:'12px', color:'#000', fontSize:13, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Salvando...' : '💾 Salvar Prova'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ModuloSimulados({ adminId }: { adminId?: string }) {
  const [provas, setProvas] = useState<Prova[]>([])
  const [loading, setLoading] = useState(true)
  const [editProva, setEditProva] = useState<Prova | null | undefined>(undefined)
  const [filtro, setFiltro] = useState<'all'|'ativa'|'inativa'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: provData } = await supabase.from('provas_oab').select('*').order('numero_exame', { ascending: false })
    const { data: qtdData } = await supabase.from('questoes_oab').select('prova_id')
    const qtdMap: Record<string, number> = {}
    if (qtdData) qtdData.forEach(q => { qtdMap[q.prova_id] = (qtdMap[q.prova_id] || 0) + 1 })
    setProvas((provData || []).map(p => ({ ...p, _qtd: qtdMap[p.id] || 0 })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleAtivo = async (p: Prova) => {
    await supabase.from('provas_oab').update({ ativo: !p.ativo }).eq('id', p.id)
    load()
  }

  const filtradas = provas.filter(p => filtro === 'all' ? true : filtro === 'ativa' ? p.ativo : !p.ativo)
  const totalQ = provas.reduce((s, p) => s + (p._qtd || 0), 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:900, color:'#fff', marginBottom:4 }}>Simulados 📋</h2>
          <div style={{ fontSize:13, color:'#555' }}>Gerencie provas OAB e questões</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 14px', color:'#888', fontSize:12, cursor:'pointer' }}>🔄</button>
          <button onClick={() => setEditProva(null)} style={{ background:'linear-gradient(135deg,#D4A843,#E8621A)', border:'none', borderRadius:8, padding:'8px 18px', color:'#000', fontSize:13, fontWeight:700, cursor:'pointer' }}>+ Nova Prova</button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
        {[
          { label:'Total de Provas', value: provas.length, color:'#60a5fa', icon:'📋' },
          { label:'Provas Ativas', value: provas.filter(p=>p.ativo).length, color:'#34d399', icon:'✅' },
          { label:'Total de Questões', value: totalQ, color:'#D4A843', icon:'📝' },
          { label:'Questões Ativas', value: provas.filter(p=>p.ativo).reduce((s,p)=>s+(p._qtd||0),0), color:'#a78bfa', icon:'⚡' },
        ].map(m => (
          <div key={m.label} style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
            <div style={{ fontSize:22, fontWeight:900, color:m.color }}>{m.value}</div>
            <div style={{ fontSize:10, color:'#555', marginTop:2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {(['all','ativa','inativa'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding:'6px 16px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer',
              border: filtro===f ? '1px solid #D4A843' : '1px solid rgba(255,255,255,0.1)',
              background: filtro===f ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.03)',
              color: filtro===f ? '#D4A843' : '#666' }}>
            {{ all:'Todas', ativa:'Ativas', inativa:'Inativas' }[f]}
          </button>
        ))}
      </div>

      {/* Provas list */}
      {loading ? <div style={{ textAlign:'center', padding:48, color:'#555' }}>⏳ Carregando provas...</div>
        : filtradas.length === 0 ? <div style={{ textAlign:'center', padding:48, color:'#555' }}><div style={{ fontSize:36, marginBottom:12 }}>📋</div>Nenhuma prova encontrada.</div>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtradas.map(p => (
              <div key={p.id} style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'16px 18px', display:'flex', alignItems:'center', gap:16, transition:'border-color 0.15s', flexWrap:'wrap' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(212,168,67,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}>
                {/* Badge */}
                <div style={{ width:52, height:52, borderRadius:12, background: p.ativo ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', border:`1px solid ${p.ativo ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:900, color: p.ativo ? '#34d399' : '#555' }}>{p.numero_exame}º</span>
                </div>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4 }}>{p.nome}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {p.edicao && <span style={{ fontSize:10, color:'#888' }}>📅 {p.edicao}</span>}
                    <span style={{ fontSize:10, color:'#888' }}>📝 {p._qtd} questões</span>
                    <span style={{ fontSize:10, padding:'1px 8px', borderRadius:100, background: p.ativo ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', color: p.ativo ? '#34d399' : '#f87171', border:`1px solid ${p.ativo ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}` }}>{p.ativo ? 'Ativa' : 'Inativa'}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                  <button onClick={() => setEditProva(p)} style={{ padding:'6px 14px', background:'rgba(212,168,67,0.08)', border:'1px solid rgba(212,168,67,0.2)', borderRadius:8, color:'#D4A843', fontSize:12, fontWeight:600, cursor:'pointer' }}>Editar</button>
                  <Toggle on={p.ativo} onChange={() => toggleAtivo(p)}/>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Drawer */}
      {editProva !== undefined && (
        <ProvaDrawer prova={editProva} adminId={adminId}
          onClose={() => setEditProva(undefined)}
          onSaved={() => { load(); if (editProva !== null) setEditProva(undefined) }}/>
      )}
    </div>
  )
}
