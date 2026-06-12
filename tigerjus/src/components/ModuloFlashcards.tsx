'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Flashcard {
  id: string; disciplina: string; frente: string; verso: string
  ativo: boolean; nivel?: string | null; created_at: string
}

const DISCIPLINAS = [
  'Constitucional','Administrativo','Penal','Processo Penal','Civil',
  'Processo Civil','Trabalho','Processo do Trabalho','Tributário',
  'Empresarial','Ética','Consumidor','Direitos Humanos','Ambiental',
  'Filosofia','Internacional','ECA'
]

const DISC_CORES: Record<string,string> = {
  'Constitucional':'#60a5fa','Administrativo':'#34d399','Penal':'#f87171',
  'Processo Penal':'#fb923c','Civil':'#a78bfa','Processo Civil':'#c084fc',
  'Trabalho':'#fbbf24','Processo do Trabalho':'#f59e0b','Tributário':'#38bdf8',
  'Empresarial':'#4ade80','Ética':'#D4A843','Consumidor':'#f472b6',
  'Direitos Humanos':'#818cf8','Ambiental':'#34d399','Filosofia':'#94a3b8',
  'Internacional':'#22d3ee','ECA':'#e879f9',
}

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

// ── FlashcardDrawer (create / edit) ───────────────────────────────────────────
function FlashcardDrawer({ fc, adminId, onClose, onSaved }: {
  fc?: Flashcard; adminId?: string; onClose: () => void; onSaved: () => void
}) {
  const isNovo = !fc
  const [form, setForm] = useState({
    disciplina: fc?.disciplina || DISCIPLINAS[0],
    frente: fc?.frente || '',
    verso: fc?.verso || '',
    nivel: fc?.nivel || 'basico',
    ativo: fc?.ativo ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const salvar = async () => {
    if (!form.frente.trim() || !form.verso.trim()) { setMsg('❌ Frente e verso são obrigatórios.'); return }
    setSaving(true); setMsg('')
    const payload = { disciplina: form.disciplina, frente: form.frente, verso: form.verso, nivel: form.nivel, ativo: form.ativo }
    const { error } = isNovo
      ? await supabase.from('flashcards').insert(payload)
      : await supabase.from('flashcards').update(payload).eq('id', fc!.id)
    if (!error) { setMsg('✅ Salvo!'); setTimeout(() => { onSaved(); onClose() }, 700) }
    else setMsg('❌ Erro: ' + error.message)
    setSaving(false)
  }

  const excluir = async () => {
    if (!fc) return
    await supabase.from('flashcards').delete().eq('id', fc.id)
    onSaved(); onClose()
  }

  const corDisc = DISC_CORES[form.disciplina] || '#D4A843'

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(2px)' }} onClick={onClose}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, zIndex:201, width:560, maxWidth:'100vw', background:'#111', borderLeft:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'#0d0d0d', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{isNovo ? '+ Novo Flashcard' : 'Editar Flashcard'}</div>
            {!isNovo && <div style={{ fontSize:11, color:'#555', marginTop:2, fontFamily:'monospace' }}>{fc!.id.slice(0,12)}…</div>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:16 }}>

          {/* Preview */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ background:'linear-gradient(135deg,rgba(212,168,67,0.06),rgba(232,98,26,0.03))', border:`1px solid ${corDisc}22`, borderRadius:12, padding:14, minHeight:100 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, color:'#666', marginBottom:8 }}>FRENTE</div>
              <div style={{ fontSize:13, color:'#ccc', lineHeight:1.7 }}>{form.frente || <span style={{ color:'#444', fontStyle:'italic' }}>Digite a pergunta...</span>}</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${corDisc}22`, borderRadius:12, padding:14, minHeight:100 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, color:'#666', marginBottom:8 }}>VERSO</div>
              <div style={{ fontSize:13, color:'#ccc', lineHeight:1.7 }}>{form.verso || <span style={{ color:'#444', fontStyle:'italic' }}>Digite a resposta...</span>}</div>
            </div>
          </div>

          {/* Disciplina + Nível */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:5 }}>DISCIPLINA</label>
              <select value={form.disciplina} onChange={e => set('disciplina', e.target.value)}
                style={{ width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'9px 12px', color: corDisc, fontSize:13, fontWeight:600, outline:'none', colorScheme:'dark' as const, fontFamily:'inherit' }}>
                {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:5 }}>NÍVEL</label>
              <select value={form.nivel} onChange={e => set('nivel', e.target.value)}
                style={{ width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none', colorScheme:'dark' as const, fontFamily:'inherit' }}>
                {['basico','intermediario','avancado'].map(n => <option key={n} value={n}>{{ basico:'Básico', intermediario:'Intermediário', avancado:'Avançado' }[n]}</option>)}
              </select>
            </div>
          </div>

          {/* Frente */}
          <div>
            <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:5 }}>FRENTE (pergunta) *</label>
            <textarea value={form.frente} onChange={e => set('frente', e.target.value)} rows={4} placeholder="Ex: O que é o princípio da legalidade?"
              style={{ width:'100%', background:'#1a1a1a', border:`1px solid ${form.frente ? corDisc+'44' : 'rgba(255,255,255,0.1)'}`, borderRadius:8, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.7, boxSizing:'border-box' as const, transition:'border-color 0.2s' }}/>
          </div>

          {/* Verso */}
          <div>
            <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:5 }}>VERSO (resposta) *</label>
            <textarea value={form.verso} onChange={e => set('verso', e.target.value)} rows={5} placeholder="Ex: O princípio da legalidade determina que..."
              style={{ width:'100%', background:'#1a1a1a', border:`1px solid ${form.verso ? corDisc+'44' : 'rgba(255,255,255,0.1)'}`, borderRadius:8, padding:'10px 12px', color:'#ccc', fontSize:13, outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.7, boxSizing:'border-box' as const, transition:'border-color 0.2s' }}/>
          </div>

          {/* Status */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Toggle on={form.ativo} onChange={v => set('ativo', v)}/>
            <span style={{ fontSize:13, color: form.ativo ? '#34d399' : '#888' }}>{form.ativo ? 'Ativo — visível para usuários' : 'Inativo — oculto'}</span>
          </div>

          {msg && <div style={{ padding:'8px 12px', background: msg.startsWith('✅') ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', border:`1px solid ${msg.startsWith('✅') ? '#34d399' : '#ef4444'}44`, borderRadius:8, fontSize:12, color: msg.startsWith('✅') ? '#34d399' : '#f87171' }}>{msg}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', background:'#0d0d0d', flexShrink:0 }}>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={salvar} disabled={saving}
              style={{ flex:1, background:'linear-gradient(135deg,#D4A843,#E8621A)', border:'none', borderRadius:8, padding:'11px', color:'#000', fontSize:13, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Salvando...' : isNovo ? '+ Criar Flashcard' : '💾 Salvar'}
            </button>
            {!isNovo && !confirmDel && (
              <button onClick={() => setConfirmDel(true)}
                style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'11px 16px', color:'#f87171', fontSize:12, cursor:'pointer' }}>
                Excluir
              </button>
            )}
            {!isNovo && confirmDel && (
              <button onClick={excluir}
                style={{ background:'rgba(239,68,68,0.15)', border:'1px solid #ef4444', borderRadius:8, padding:'11px 16px', color:'#f87171', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                Confirmar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ModuloFlashcards({ adminId }: { adminId?: string }) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [discFilter, setDiscFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'ativo'|'inativo'>('all')
  const [busca, setBusca] = useState('')
  const [editCard, setEditCard] = useState<Flashcard | undefined | null>(undefined)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('flashcards').select('*').order('disciplina').order('created_at', { ascending: false })
    setCards(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleAtivo = async (fc: Flashcard) => {
    await supabase.from('flashcards').update({ ativo: !fc.ativo }).eq('id', fc.id)
    load()
  }

  const handleBusca = (v: string) => {
    setBusca(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {}, 0)
  }

  const filtrados = cards.filter(c => {
    if (discFilter && c.disciplina !== discFilter) return false
    if (statusFilter === 'ativo' && !c.ativo) return false
    if (statusFilter === 'inativo' && c.ativo) return false
    if (busca) {
      const q = busca.toLowerCase()
      if (!c.frente.toLowerCase().includes(q) && !c.verso.toLowerCase().includes(q)) return false
    }
    return true
  })

  const discCount = DISCIPLINAS.reduce((acc, d) => {
    acc[d] = cards.filter(c => c.disciplina === d).length; return acc
  }, {} as Record<string, number>)

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:900, color:'#fff', marginBottom:4 }}>Flashcards 🃏</h2>
          <div style={{ fontSize:13, color:'#555' }}>Gerencie os flashcards por disciplina</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 14px', color:'#888', fontSize:12, cursor:'pointer' }}>🔄</button>
          <button onClick={() => setEditCard(null)} style={{ background:'linear-gradient(135deg,#D4A843,#E8621A)', border:'none', borderRadius:8, padding:'8px 18px', color:'#000', fontSize:13, fontWeight:700, cursor:'pointer' }}>+ Novo Flashcard</button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
        {[
          { label:'Total', value: cards.length, color:'#60a5fa', icon:'🃏' },
          { label:'Ativos', value: cards.filter(c=>c.ativo).length, color:'#34d399', icon:'✅' },
          { label:'Inativos', value: cards.filter(c=>!c.ativo).length, color:'#f87171', icon:'❌' },
          { label:'Disciplinas', value: DISCIPLINAS.filter(d=>discCount[d]>0).length, color:'#D4A843', icon:'📚' },
        ].map(m => (
          <div key={m.label} style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
            <div style={{ fontSize:22, fontWeight:900, color:m.color }}>{m.value}</div>
            <div style={{ fontSize:10, color:'#555', marginTop:2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:6 }}>
          {(['all','ativo','inativo'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{ padding:'5px 14px', borderRadius:100, fontSize:12, cursor:'pointer',
                border: statusFilter===f ? '1px solid #D4A843' : '1px solid rgba(255,255,255,0.08)',
                background: statusFilter===f ? 'rgba(212,168,67,0.1)' : 'transparent',
                color: statusFilter===f ? '#D4A843' : '#666' }}>
              {{ all:'Todos', ativo:'Ativos', inativo:'Inativos' }[f]}
            </button>
          ))}
        </div>
        <div style={{ flex:1, minWidth:200, position:'relative' }}>
          <input value={busca} onChange={e => handleBusca(e.target.value)} placeholder="Buscar por conteúdo..."
            style={{ width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 12px 7px 32px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' as const }}/>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#555', fontSize:13 }}>🔍</span>
          {busca && <button onClick={() => setBusca('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:14 }}>✕</button>}
        </div>
      </div>

      {/* Disciplina pills */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
        <button onClick={() => setDiscFilter('')}
          style={{ padding:'4px 12px', borderRadius:100, fontSize:11, cursor:'pointer',
            border: !discFilter ? '1px solid #D4A843' : '1px solid rgba(255,255,255,0.08)',
            background: !discFilter ? 'rgba(212,168,67,0.1)' : 'transparent',
            color: !discFilter ? '#D4A843' : '#555' }}>
          Todas <span style={{ opacity:0.6 }}>{cards.length}</span>
        </button>
        {DISCIPLINAS.filter(d => discCount[d] > 0).map(d => {
          const cor = DISC_CORES[d] || '#888'
          const ativo = discFilter === d
          return (
            <button key={d} onClick={() => setDiscFilter(ativo ? '' : d)}
              style={{ padding:'4px 12px', borderRadius:100, fontSize:11, cursor:'pointer',
                border: `1px solid ${ativo ? cor+'66' : 'rgba(255,255,255,0.08)'}`,
                background: ativo ? cor+'18' : 'transparent',
                color: ativo ? cor : '#666' }}>
              {d} <span style={{ opacity:0.6 }}>{discCount[d]}</span>
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      {loading
        ? <div style={{ textAlign:'center', padding:48, color:'#555' }}>⏳ Carregando flashcards...</div>
        : filtrados.length === 0
          ? <div style={{ textAlign:'center', padding:48, color:'#555' }}><div style={{ fontSize:36, marginBottom:12 }}>🃏</div>Nenhum flashcard encontrado.</div>
          : (
            <>
              <div style={{ fontSize:12, color:'#555', marginBottom:12 }}>{filtrados.length} flashcard{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
                {filtrados.map(fc => {
                  const cor = DISC_CORES[fc.disciplina] || '#888'
                  return (
                    <div key={fc.id}
                      style={{ background:'#1a1a1a', border:`1px solid ${fc.ativo ? 'rgba(255,255,255,0.06)' : 'rgba(248,113,113,0.12)'}`, borderRadius:14, padding:16, transition:'all 0.15s', display:'flex', flexDirection:'column', gap:10 }}
                      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=cor+'44' }}
                      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor = fc.ativo ? 'rgba(255,255,255,0.06)' : 'rgba(248,113,113,0.12)' }}>

                      {/* Header */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:`${cor}18`, border:`1px solid ${cor}33`, color:cor }}>{fc.disciplina}</span>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          {!fc.ativo && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:100, background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.2)' }}>INATIVO</span>}
                          <Toggle on={fc.ativo} onChange={() => toggleAtivo(fc)}/>
                        </div>
                      </div>

                      {/* Frente */}
                      <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'10px 12px' }}>
                        <div style={{ fontSize:8, fontWeight:700, letterSpacing:2, color:'#555', marginBottom:4 }}>FRENTE</div>
                        <div style={{ fontSize:12, color:'#ccc', lineHeight:1.6 }}>{fc.frente.slice(0,100)}{fc.frente.length > 100 ? '...' : ''}</div>
                      </div>

                      {/* Verso */}
                      <div style={{ background:`${cor}08`, borderRadius:8, padding:'10px 12px', border:`1px solid ${cor}18` }}>
                        <div style={{ fontSize:8, fontWeight:700, letterSpacing:2, color:`${cor}88`, marginBottom:4 }}>VERSO</div>
                        <div style={{ fontSize:12, color:'#888', lineHeight:1.6 }}>{fc.verso.slice(0,100)}{fc.verso.length > 100 ? '...' : ''}</div>
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setEditCard(fc)}
                          style={{ flex:1, padding:'6px', background:'rgba(212,168,67,0.08)', border:'1px solid rgba(212,168,67,0.2)', borderRadius:8, color:'#D4A843', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )
      }

      {/* Drawer */}
      {editCard !== undefined && (
        <FlashcardDrawer
          fc={editCard ?? undefined}
          adminId={adminId}
          onClose={() => setEditCard(undefined)}
          onSaved={() => { load(); setEditCard(undefined) }}/>
      )}
    </div>
  )
}
