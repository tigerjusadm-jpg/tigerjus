'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface DisciplineSummary {
  id?: string
  disciplina_slug: string
  resumo: string
  resumo_curto: string
  resumo_memorizacao: string
  tipo: 'manual' | 'automatico' | 'ia'
  tags: string[]
  nivel_dificuldade: 'iniciante' | 'medio' | 'avancado'
  ultima_geracao_ia?: string | null
  versao: number
  ativo: boolean
  autor_id?: string | null
  created_at?: string
  updated_at?: string
}

// ─── MAPEAMENTO DISCIPLINAS ───────────────────────────────────────────────────

const DISCIPLINES = [
  { slug: 'constitucional',  name: 'Constitucional',   icon: '⚖️'  },
  { slug: 'administrativo',  name: 'Administrativo',    icon: '🏛️'  },
  { slug: 'penal',           name: 'Penal',             icon: '🔒'  },
  { slug: 'processo-penal',  name: 'Processo Penal',    icon: '🔍'  },
  { slug: 'civil',           name: 'Civil',             icon: '📋'  },
  { slug: 'processo-civil',  name: 'Processo Civil',    icon: '⚡'  },
  { slug: 'trabalho',        name: 'Trabalho',          icon: '🦺'  },
  { slug: 'proc-trabalho',   name: 'Proc. Trabalho',    icon: '👷'  },
  { slug: 'tributario',      name: 'Tributário',        icon: '💰'  },
  { slug: 'empresarial',     name: 'Empresarial',       icon: '🏢'  },
  { slug: 'etica',           name: 'Ética OAB',         icon: '📜'  },
  { slug: 'consumidor',      name: 'Consumidor',        icon: '🛒'  },
  { slug: 'direitos-humanos',name: 'Direitos Humanos',  icon: '🌍'  },
  { slug: 'ambiental',       name: 'Ambiental',         icon: '🌿'  },
  { slug: 'filosofia',       name: 'Filosofia',         icon: '📖'  },
  { slug: 'internacional',   name: 'Internacional',     icon: '🌐'  },
  { slug: 'eca',             name: 'ECA',               icon: '👶'  },
  { slug: 'eleitoral',       name: 'Eleitoral',         icon: '🗳️'  },
  { slug: 'financeiro',      name: 'Financeiro',        icon: '🏦'  },
  { slug: 'previdenciario',  name: 'Previdenciário',    icon: '🛡️'  },
]

const TIPO_LABEL: Record<string, string> = {
  manual: 'Manual', automatico: 'Automático', ia: 'IA',
}
const TIPO_COLOR: Record<string, string> = {
  manual: '#60a5fa', automatico: '#34d399', ia: '#a78bfa',
}
const NIVEL_LABEL: Record<string, string> = {
  iniciante: 'Iniciante', medio: 'Médio', avancado: 'Avançado',
}

const EMPTY: Omit<DisciplineSummary, 'disciplina_slug'> = {
  resumo: '', resumo_curto: '', resumo_memorizacao: '', tipo: 'manual',
  tags: [], nivel_dificuldade: 'medio', versao: 1, ativo: true,
}

// ─── EDITOR DE TAGS ───────────────────────────────────────────────────────────

function TagsEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')

  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }

  const remove = (t: string) => onChange(tags.filter(x => x !== t))

  return (
    <div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
        {tags.map(t => (
          <span key={t} style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:100,padding:'3px 10px',fontSize:12,color:'#D4A843'}}>
            {t}
            <button onClick={() => remove(t)} style={{background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:14,lineHeight:1,padding:0}}>×</button>
          </span>
        ))}
        {tags.length === 0 && <span style={{fontSize:12,color:'#444',fontStyle:'italic'}}>Nenhuma tag</span>}
      </div>
      <div style={{display:'flex',gap:8}}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Nova tag... (Enter para adicionar)"
          style={{flex:1,background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'7px 12px',color:'#fff',fontSize:12,outline:'none',fontFamily:'inherit'}}
        />
        <button onClick={add} style={{background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:8,padding:'7px 14px',color:'#D4A843',fontSize:12,cursor:'pointer',fontWeight:700}}>
          + Add
        </button>
      </div>
    </div>
  )
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────

function ResumoPreview({ resumo, name }: { resumo: string; name: string }) {
  if (!resumo) return (
    <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#444',fontSize:13,fontStyle:'italic'}}>
      O preview aparece aqui enquanto você digita...
    </div>
  )

  return (
    <div style={{fontSize:13,lineHeight:1.9,color:'#aaa',whiteSpace:'pre-wrap',overflowY:'auto',height:'100%'}}>
      {resumo.split('\n').map((line, i) => {
        const isTitle = line.toUpperCase() === line && line.trim().length > 3 && !line.startsWith('-') && !line.startsWith('•')
        if (isTitle) return (
          <div key={i} style={{fontWeight:900,fontSize:15,color:'#fff',marginTop:i > 0 ? 20 : 0,marginBottom:8,letterSpacing:0.5}}>
            {line}
          </div>
        )
        return <div key={i} style={{marginBottom:2}}>{line}</div>
      })}
    </div>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloResumos({ adminId }: { adminId?: string }) {
  const [summaries, setSummaries] = useState<Record<string, DisciplineSummary>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<DisciplineSummary, 'disciplina_slug'>>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'editor' | 'preview'>('editor')

  // Carrega todos os resumos
  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('discipline_summaries').select('*')
    if (data) {
      const map: Record<string, DisciplineSummary> = {}
      for (const row of data) map[row.disciplina_slug] = row as DisciplineSummary
      setSummaries(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Seleciona disciplina
  const select = (slug: string) => {
    setSelected(slug)
    setSaved(false)
    setTab('editor')
    const existing = summaries[slug]
    if (existing) {
      setForm({
        resumo: existing.resumo,
        resumo_curto: existing.resumo_curto || '',
        resumo_memorizacao: existing.resumo_memorizacao || '',
        tipo: existing.tipo as any,
        tags: existing.tags || [],
        nivel_dificuldade: existing.nivel_dificuldade as any,
        versao: existing.versao,
        ativo: existing.ativo,
        ultima_geracao_ia: existing.ultima_geracao_ia,
        autor_id: existing.autor_id,
      })
    } else {
      setForm({ ...EMPTY })
    }
  }

  // Salvar
  const salvar = async () => {
    if (!selected) return
    setSaving(true)
    const payload: Partial<DisciplineSummary> = {
      disciplina_slug: selected,
      resumo: form.resumo,
      resumo_curto: form.resumo_curto,
      resumo_memorizacao: form.resumo_memorizacao,
      tipo: form.tipo,
      tags: form.tags,
      nivel_dificuldade: form.nivel_dificuldade,
      ativo: form.ativo,
      versao: (summaries[selected]?.versao || 0) + 1,
      autor_id: adminId || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('discipline_summaries')
      .upsert(payload, { onConflict: 'disciplina_slug' })

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      await load()
    }
    setSaving(false)
  }

  const disc = DISCIPLINES.find(d => d.slug === selected)
  const hasResumo = (slug: string) => !!summaries[slug]
  const isAtivo = (slug: string) => summaries[slug]?.ativo === true

  return (
    <div style={{display:'flex',gap:0,height:'calc(100vh - 54px - 48px)',minHeight:600}}>

      {/* ── LISTA DE DISCIPLINAS ── */}
      <div style={{width:240,flexShrink:0,borderRight:'1px solid rgba(255,255,255,0.07)',overflowY:'auto',background:'#0f0f0f'}}>
        <div style={{padding:'14px 16px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',marginBottom:2}}>
            DISCIPLINAS
          </div>
          <div style={{fontSize:11,color:'#444'}}>
            {Object.keys(summaries).length} de {DISCIPLINES.length} com resumo
          </div>
        </div>

        {loading ? (
          <div style={{padding:20,textAlign:'center',color:'#444',fontSize:12}}>Carregando...</div>
        ) : (
          DISCIPLINES.map(d => {
            const has = hasResumo(d.slug)
            const ativo = isAtivo(d.slug)
            const sum = summaries[d.slug]
            const isSelected = selected === d.slug

            return (
              <button key={d.slug} onClick={() => select(d.slug)}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  width:'100%', padding:'10px 14px',
                  background: isSelected ? 'rgba(212,168,67,0.08)' : 'transparent',
                  border:'none', borderLeft: isSelected ? '2px solid #D4A843' : '2px solid transparent',
                  cursor:'pointer', textAlign:'left',
                  borderBottom:'1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background='transparent' }}>
                <span style={{fontSize:18,flexShrink:0}}>{d.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:isSelected?700:400,color:isSelected?'#D4A843':'#ccc',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {d.name}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginTop:2}}>
                    {has ? (
                      <>
                        <span style={{width:5,height:5,borderRadius:'50%',background:ativo?'#34d399':'#f87171',flexShrink:0}}/>
                        <span style={{fontSize:10,color:TIPO_COLOR[sum.tipo]}}>
                          {TIPO_LABEL[sum.tipo]}
                        </span>
                        <span style={{fontSize:10,color:'#444'}}>v{sum.versao}</span>
                      </>
                    ) : (
                      <>
                        <span style={{width:5,height:5,borderRadius:'50%',background:'#555',flexShrink:0}}/>
                        <span style={{fontSize:10,color:'#555'}}>Sem resumo</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* ── EDITOR + PREVIEW ── */}
      {!selected ? (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,color:'#444'}}>
          <div style={{fontSize:40}}>📖</div>
          <div style={{fontSize:14,fontWeight:600,color:'#555'}}>Selecione uma disciplina</div>
          <div style={{fontSize:12,color:'#444'}}>Escolha uma disciplina na lista para editar ou criar o resumo.</div>
        </div>
      ) : (
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>

          {/* Header do editor */}
          <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexShrink:0,background:'#0f0f0f'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:22}}>{disc?.icon}</span>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{disc?.name}</div>
                <div style={{fontSize:11,color:'#555'}}>
                  {summaries[selected]
                    ? `Versão ${summaries[selected].versao} · Atualizado ${new Date(summaries[selected].updated_at!).toLocaleDateString('pt-BR')}`
                    : 'Resumo não cadastrado'}
                </div>
              </div>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {/* Toggle ativo */}
              <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer'}}>
                <div onClick={() => setForm(f => ({...f, ativo: !f.ativo}))}
                  style={{width:36,height:20,borderRadius:10,background:form.ativo?'#34d399':'#444',position:'relative',transition:'background 0.2s',cursor:'pointer',flexShrink:0}}>
                  <div style={{position:'absolute',top:3,left:form.ativo?18:3,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                </div>
                <span style={{fontSize:12,color:form.ativo?'#34d399':'#666'}}>{form.ativo?'Ativo':'Inativo'}</span>
              </label>

              {/* Salvar */}
              <button onClick={salvar} disabled={saving || !form.resumo}
                style={{
                  background: saved ? 'rgba(52,211,153,0.15)' : 'linear-gradient(135deg,#D4A843,#E8621A)',
                  border: saved ? '1px solid #34d399' : 'none',
                  borderRadius:8, padding:'8px 18px',
                  color: saved ? '#34d399' : '#000',
                  fontSize:13, fontWeight:700, cursor: saving||!form.resumo ? 'not-allowed' : 'pointer',
                  opacity: saving||!form.resumo ? 0.6 : 1,
                  transition:'all 0.2s', minWidth:100,
                }}>
                {saving ? '⏳ Salvando...' : saved ? '✅ Salvo!' : '💾 Salvar'}
              </button>
            </div>
          </div>

          {/* Tabs editor/preview */}
          <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0,background:'#0f0f0f'}}>
            {(['editor','preview'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding:'9px 20px', border:'none', cursor:'pointer',
                  background:'transparent', fontSize:12, fontWeight:tab===t?700:400,
                  color:tab===t?'#D4A843':'#555',
                  borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent',
                }}>
                {t === 'editor' ? '✏️ Editor' : '👁️ Preview'}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div style={{flex:1,overflow:'hidden',display:'flex'}}>

            {tab === 'editor' && (
              <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:18}}>

                {/* Metadados */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>TIPO</label>
                    <select value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value as any}))}
                      style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px',color:'#fff',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
                      <option value="manual">Manual</option>
                      <option value="automatico">Automático</option>
                      <option value="ia">IA</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>NÍVEL</label>
                    <select value={form.nivel_dificuldade} onChange={e => setForm(f => ({...f, nivel_dificuldade: e.target.value as any}))}
                      style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px',color:'#fff',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
                      <option value="iniciante">Iniciante</option>
                      <option value="medio">Médio</option>
                      <option value="avancado">Avançado</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>STATUS</label>
                    <div style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px',fontSize:13,color:form.ativo?'#34d399':'#f87171'}}>
                      {form.ativo ? '● Ativo' : '○ Inativo'}
                    </div>
                  </div>
                </div>

                {/* Resumo curto */}
                <div>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>
                    RESUMO CURTO <span style={{color:'#444',fontWeight:400,textTransform:'none',letterSpacing:0}}>— exibido em cards ({form.resumo_curto.length}/200)</span>
                  </label>
                  <input
                    value={form.resumo_curto}
                    onChange={e => setForm(f => ({...f, resumo_curto: e.target.value.slice(0,200)}))}
                    placeholder="Ex: Estrutura da CF/88, direitos fundamentais e organização dos poderes."
                    style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 14px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
                  />
                </div>

                {/* Resumo completo */}
                <div style={{flex:1,display:'flex',flexDirection:'column'}}>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>
                    RESUMO COMPLETO <span style={{color:'#444',fontWeight:400,textTransform:'none',letterSpacing:0}}>— {form.resumo.length} chars</span>
                  </label>
                  <textarea
                    value={form.resumo}
                    onChange={e => setForm(f => ({...f, resumo: e.target.value}))}
                    placeholder={`${disc?.name?.toUpperCase()} — RESUMO ESSENCIAL\n\nCONCEITO CENTRAL\n...\n\nPONTOS MAIS COBRADOS NA OAB\n...\n\nARTIGOS MAIS CITADOS\n...\n\nATENÇÃO\n...`}
                    style={{
                      flex:1, minHeight:280,
                      background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)',
                      borderRadius:8, padding:'12px 14px',
                      color:'#ccc', fontSize:13, lineHeight:1.8,
                      outline:'none', resize:'vertical', fontFamily:'inherit',
                    }}
                  />
                  <div style={{fontSize:10,color:'#444',marginTop:4}}>
                    💡 Linhas em MAIÚSCULO viram títulos no preview. Use quebras de linha para separar seções.
                  </div>
                </div>

                {/* Resumo de memorização */}
                <div style={{display:'flex',flexDirection:'column'}}>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>
                    RESUMO DE MEMORIZAÇÃO <span style={{color:'#444',fontWeight:400,textTransform:'none',letterSpacing:0}}>— bloco 📌 de fixação rápida ({form.resumo_memorizacao.length} chars)</span>
                  </label>
                  <textarea
                    value={form.resumo_memorizacao}
                    onChange={e => setForm(f => ({...f, resumo_memorizacao: e.target.value}))}
                    placeholder={`📌 RESUMO DE MEMORIZAÇÃO — TIGERJUS · ${disc?.name?.toUpperCase()}\n⚡ Fixação rápida — ...\n\n1. PONTO-CHAVE — ...\n\n⚠️ Não confundir: ...`}
                    style={{
                      minHeight:220,
                      background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)',
                      borderRadius:8, padding:'12px 14px',
                      color:'#ccc', fontSize:13, lineHeight:1.8,
                      outline:'none', resize:'vertical', fontFamily:'inherit',
                    }}
                  />
                  <div style={{fontSize:10,color:'#444',marginTop:4}}>
                    💡 Exibido na revisão rápida (modo memorização). Mesmo formato do resumo: linha em MAIÚSCULO vira título.
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>TAGS</label>
                  <TagsEditor tags={form.tags} onChange={tags => setForm(f => ({...f, tags}))} />
                </div>

              </div>
            )}

            {tab === 'preview' && (
              <div style={{flex:1,overflowY:'auto',padding:24}}>
                <div style={{maxWidth:680,margin:'0 auto'}}>

                  {/* Header do resumo como o usuário vê */}
                  <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
                    <span style={{fontSize:36}}>{disc?.icon}</span>
                    <div>
                      <h1 style={{fontSize:22,fontWeight:900,color:'#fff',marginBottom:4}}>{disc?.name}</h1>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontSize:10,padding:'2px 8px',background:`${TIPO_COLOR[form.tipo]}20`,border:`1px solid ${TIPO_COLOR[form.tipo]}44`,borderRadius:100,color:TIPO_COLOR[form.tipo],fontWeight:700}}>
                          {TIPO_LABEL[form.tipo]}
                        </span>
                        <span style={{fontSize:10,padding:'2px 8px',background:'rgba(255,255,255,0.06)',borderRadius:100,color:'#888'}}>
                          {NIVEL_LABEL[form.nivel_dificuldade]}
                        </span>
                        {form.tags.map(t => (
                          <span key={t} style={{fontSize:10,padding:'2px 8px',background:'rgba(212,168,67,0.08)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:100,color:'#D4A843'}}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {form.resumo_curto && (
                    <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#D4A843',lineHeight:1.6}}>
                      {form.resumo_curto}
                    </div>
                  )}

                  <div style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:24,minHeight:200}}>
                    <ResumoPreview resumo={form.resumo} name={disc?.name || ''} />
                  </div>

                  {form.resumo_memorizacao && (
                    <div style={{marginTop:20}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',marginBottom:8}}>📌 Memorização</div>
                      <div style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:24}}>
                        <ResumoPreview resumo={form.resumo_memorizacao} name={disc?.name || ''} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
