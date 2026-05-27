'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface Plano {
  id: string
  plano: string
  ativo: boolean
  mini_simulado_qtd: number | null
  flashcards_por_disciplina: number | null
  ia_perguntas_limite: number | null
  quiz_questoes_limite: number | null
  permite_pdf: boolean
  permite_simulado_completo: boolean
  permite_filtros_avancados: boolean
  permite_rankings: boolean
  permite_radar: boolean
  ordem_exibicao: number
  cor_plano: string | null
  cta_texto: string | null
  cta_botao: string | null
  created_at: string
  updated_at: string
}

const PLANO_LABEL: Record<string, string> = {
  gratuito: 'Gratuito',
  start: 'Start',
  plus: 'Plus',
  pro: 'Pro',
  elite: 'Elite',
}

type CotaKey = 'mini_simulado_qtd' | 'flashcards_por_disciplina' | 'ia_perguntas_limite' | 'quiz_questoes_limite'

// ─── EMPTY/SKELETON ───────────────────────────────────────────────────────────

function EmptyState({msg}:{msg:string}) {
  return (
    <div style={{textAlign:'center',padding:48,color:'#555'}}>
      <div style={{fontSize:36,marginBottom:12}}>💎</div>
      <div style={{fontSize:14,fontWeight:600,color:'#666',marginBottom:6}}>Nenhum plano encontrado</div>
      <div style={{fontSize:12}}>{msg}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:14}}>
      {[...Array(5)].map((_,i) => (
        <div key={i} style={{height:240,borderRadius:14,background:'rgba(255,255,255,0.04)',animation:'pulse 1.5s infinite'}}/>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────

function Toggle({on, onToggle, label, sublabel}:{on:boolean;onToggle:()=>void;label?:string;sublabel?:string}) {
  return (
    <div onClick={onToggle} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'8px 0'}}>
      <div style={{width:40,height:22,borderRadius:11,background:on?'#34d399':'#374151',position:'relative',transition:'background 0.2s',flexShrink:0}}>
        <div style={{position:'absolute',top:3,left:on?20:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
      </div>
      {label && (
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:600,color:'#ccc'}}>{label}</div>
          {sublabel && <div style={{fontSize:10,color:'#666'}}>{sublabel}</div>}
        </div>
      )}
    </div>
  )
}

// ─── EDITOR ───────────────────────────────────────────────────────────────────

function EditorPlano({plano, adminId, onClose, onSaved}:{plano:Plano;adminId:string;onClose:()=>void;onSaved:()=>void}) {
  const [form, setForm] = useState({
    ativo: plano.ativo,
    ordem_exibicao: plano.ordem_exibicao.toString(),
    cor_plano: plano.cor_plano || '#6B7280',
    cta_texto: plano.cta_texto || '',
    cta_botao: plano.cta_botao || '',
    mini_simulado_qtd: plano.mini_simulado_qtd?.toString() || '',
    flashcards_por_disciplina: plano.flashcards_por_disciplina?.toString() || '',
    ia_perguntas_limite: plano.ia_perguntas_limite?.toString() || '',
    quiz_questoes_limite: plano.quiz_questoes_limite?.toString() || '',
    permite_pdf: plano.permite_pdf,
    permite_simulado_completo: plano.permite_simulado_completo,
    permite_filtros_avancados: plano.permite_filtros_avancados,
    permite_rankings: plano.permite_rankings,
    permite_radar: plano.permite_radar,
  })
  const [ilimitado, setIlimitado] = useState<Record<CotaKey, boolean>>({
    mini_simulado_qtd: plano.mini_simulado_qtd === null,
    flashcards_por_disciplina: plano.flashcards_por_disciplina === null,
    ia_perguntas_limite: plano.ia_perguntas_limite === null,
    quiz_questoes_limite: plano.quiz_questoes_limite === null,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k:string, v:any) => setForm(f => ({...f, [k]: v}))
  const setIli = (k:CotaKey, v:boolean) => setIlimitado(i => ({...i, [k]: v}))

  const salvar = async () => {
    setSaving(true); setMsg('')
    const ordem = parseInt(form.ordem_exibicao, 10)
    if (isNaN(ordem) || ordem < 0) { setMsg('❌ Ordem inválida.'); setSaving(false); return }

    const parseLim = (v:string, k:CotaKey):number|null => {
      if (ilimitado[k]) return null
      const n = parseInt(v, 10)
      return isNaN(n) ? null : n
    }

    const payload = {
      ativo: form.ativo,
      ordem_exibicao: ordem,
      cor_plano: form.cor_plano || null,
      cta_texto: form.cta_texto || null,
      cta_botao: form.cta_botao || null,
      mini_simulado_qtd: parseLim(form.mini_simulado_qtd, 'mini_simulado_qtd'),
      flashcards_por_disciplina: parseLim(form.flashcards_por_disciplina, 'flashcards_por_disciplina'),
      ia_perguntas_limite: parseLim(form.ia_perguntas_limite, 'ia_perguntas_limite'),
      quiz_questoes_limite: parseLim(form.quiz_questoes_limite, 'quiz_questoes_limite'),
      permite_pdf: form.permite_pdf,
      permite_simulado_completo: form.permite_simulado_completo,
      permite_filtros_avancados: form.permite_filtros_avancados,
      permite_rankings: form.permite_rankings,
      permite_radar: form.permite_radar,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('plan_settings').update(payload).eq('id', plano.id)
    if (error) { setMsg(`❌ Erro: ${error.message}`); setSaving(false); return }

    await supabase.from('admin_audit_logs').insert({
      user_id: adminId,
      action_type: 'UPDATE',
      target_type: 'plan_settings',
      target_id: plano.id,
      metadata: {
        plano: plano.plano,
        before: {
          ativo: plano.ativo, ordem: plano.ordem_exibicao, cor: plano.cor_plano,
          cta_texto: plano.cta_texto, cta_botao: plano.cta_botao,
          mini_simulado_qtd: plano.mini_simulado_qtd,
          flashcards_por_disciplina: plano.flashcards_por_disciplina,
          ia_perguntas_limite: plano.ia_perguntas_limite,
          quiz_questoes_limite: plano.quiz_questoes_limite,
          permite_pdf: plano.permite_pdf,
          permite_simulado_completo: plano.permite_simulado_completo,
          permite_filtros_avancados: plano.permite_filtros_avancados,
          permite_rankings: plano.permite_rankings,
          permite_radar: plano.permite_radar,
        },
        after: payload,
      },
    })

    setMsg('✅ Salvo!'); setTimeout(()=>onSaved(), 800)
    setSaving(false)
  }

  const label = (s:string) => (
    <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:5}}>{s}</label>
  )

  const inp = (val:string, onChange:(v:string)=>void, placeholder='', disabled=false) => (
    <input value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{width:'100%',background:disabled?'#0a0a0a':'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,
        padding:'9px 12px',color:disabled?'#444':'#fff',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
  )

  const cotaInput = (k:CotaKey, txt:string) => (
    <div>
      {label(txt)}
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        {inp(
          ilimitado[k] ? '∞' : (form[k as keyof typeof form] as string),
          v => set(k, v.replace(/\D/g, '')),
          '0',
          ilimitado[k]
        )}
        <div onClick={()=>setIli(k, !ilimitado[k])} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',flexShrink:0,padding:'7px 10px',borderRadius:8,background:ilimitado[k]?'rgba(212,168,67,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${ilimitado[k]?'#D4A843':'rgba(255,255,255,0.08)'}`}}>
          <div style={{width:14,height:14,borderRadius:3,background:ilimitado[k]?'#D4A843':'transparent',border:`1.5px solid ${ilimitado[k]?'#D4A843':'#555'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#000',fontWeight:900}}>
            {ilimitado[k]?'✓':''}
          </div>
          <span style={{fontSize:11,color:ilimitado[k]?'#D4A843':'#888'}}>Ilimitado</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(2px)'}} onClick={onClose}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,zIndex:201,width:600,maxWidth:'100vw',background:'#111',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto',display:'flex',flexDirection:'column'}}>

        <div style={{padding:'18px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:'#0d0d0d'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:form.cor_plano||'#374151',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:'#fff'}}>
              {(plano.plano[0]||'?').toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>Plano {PLANO_LABEL[plano.plano] || plano.plano}</div>
              <div style={{fontSize:11,color:'#555'}}>chave: <code style={{color:'#888'}}>{plano.plano}</code></div>
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:20}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:20}}>

          <section>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#D4A843',marginBottom:12,textTransform:'uppercase'}}>Identificação</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                {label('Ordem de Exibição')}
                {inp(form.ordem_exibicao, v=>set('ordem_exibicao',v.replace(/\D/g,'')))}
              </div>
              <div>
                {label('Cor do Plano')}
                <div style={{display:'flex',gap:6}}>
                  <input type="color" value={form.cor_plano} onChange={e=>set('cor_plano',e.target.value)}
                    style={{width:40,height:38,border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:2,background:'#1a1a1a',cursor:'pointer'}}/>
                  {inp(form.cor_plano, v=>set('cor_plano',v))}
                </div>
              </div>
            </div>
            <div style={{marginTop:12}}>
              <Toggle on={form.ativo} onToggle={()=>set('ativo',!form.ativo)} label="Ativo" sublabel={form.ativo?'Plano visível e disponível':'Plano escondido dos usuários'}/>
            </div>
          </section>

          <section>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#D4A843',marginBottom:12,textTransform:'uppercase'}}>Marketing</div>
            <div>
              {label('Texto / Tagline (CTA Texto)')}
              {inp(form.cta_texto, v=>set('cta_texto',v), 'Ex: Acesso total TigerJus')}
            </div>
            <div style={{marginTop:10}}>
              {label('Texto do Botão (CTA Botão)')}
              {inp(form.cta_botao, v=>set('cta_botao',v), 'Ex: Assinar Pro')}
            </div>
          </section>

          <section>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#D4A843',marginBottom:12,textTransform:'uppercase'}}>Cotas e Limites</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {cotaInput('mini_simulado_qtd', 'Mini-simulados por período')}
              {cotaInput('flashcards_por_disciplina', 'Flashcards por disciplina')}
              {cotaInput('ia_perguntas_limite', 'Perguntas IA por período')}
              {cotaInput('quiz_questoes_limite', 'Questões de quiz por período')}
            </div>
          </section>

          <section>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#D4A843',marginBottom:12,textTransform:'uppercase'}}>Permissões</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <Toggle on={form.permite_pdf} onToggle={()=>set('permite_pdf',!form.permite_pdf)} label="Permitir geração de PDF" sublabel="Baixar resumos e simulados em PDF"/>
              <Toggle on={form.permite_simulado_completo} onToggle={()=>set('permite_simulado_completo',!form.permite_simulado_completo)} label="Permitir simulado completo" sublabel="Acesso a provas OAB inteiras"/>
              <Toggle on={form.permite_filtros_avancados} onToggle={()=>set('permite_filtros_avancados',!form.permite_filtros_avancados)} label="Permitir filtros avançados" sublabel="Filtros por disciplina, dificuldade, ano"/>
              <Toggle on={form.permite_rankings} onToggle={()=>set('permite_rankings',!form.permite_rankings)} label="Permitir rankings" sublabel="Aparecer no ranking de usuários"/>
              <Toggle on={form.permite_radar} onToggle={()=>set('permite_radar',!form.permite_radar)} label="Permitir Radar OAB" sublabel="Acesso ao módulo Radar OAB"/>
            </div>
          </section>
        </div>

        <div style={{padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0,background:'#0d0d0d'}}>
          {msg && (
            <div style={{marginBottom:10,padding:'8px 12px',background:msg.startsWith('✅')?'rgba(52,211,153,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.startsWith('✅')?'#34d399':'#ef4444'}44`,borderRadius:8,fontSize:12,color:msg.startsWith('✅')?'#34d399':'#f87171'}}>{msg}</div>
          )}
          <button onClick={salvar} disabled={saving}
            style={{width:'100%',background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'11px',color:'#000',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
            {saving?'⏳ Salvando...':'💾 Salvar Alterações'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloPlanos({adminId}:{adminId?:string}) {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Plano | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('plan_settings')
      .select('*')
      .order('ordem_exibicao', { ascending: true })
    if (!error && data) setPlanos(data as Plano[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>

      <div style={{marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:2}}>Planos de Assinatura</h2>
            <div style={{fontSize:12,color:'#555'}}>{planos.length} plano(s) oficiais · editáveis, não removíveis</div>
          </div>
          <button onClick={()=>load()} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'7px 14px',color:'#888',fontSize:12,cursor:'pointer'}}>
            🔄 Atualizar
          </button>
        </div>
        <div style={{padding:'10px 14px',background:'rgba(212,168,67,0.04)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:8,fontSize:11,color:'#888',lineHeight:1.6}}>
          ⚠️ Os 5 planos são fixos no sistema. Você pode editar cores, cotas, marketing e permissões — mas <strong>não criar nem remover</strong> planos.
        </div>
      </div>

      {loading ? <Skeleton/> : planos.length === 0 ? (
        <EmptyState msg="Tabela plan_settings está vazia."/>
      ) : (
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:14}}>
            {planos.map(p => {
              const cor = p.cor_plano || '#6B7280'
              return (
                <div key={p.id} onClick={()=>setEditando(p)}
                  style={{
                    background:'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, #0d0d0d 100%)',
                    border:`1px solid ${p.ativo?'rgba(255,255,255,0.06)':'rgba(248,113,113,0.2)'}`,
                    borderRadius:14,padding:16,cursor:'pointer',position:'relative',overflow:'hidden',
                    transition:'transform 0.15s, border-color 0.15s'
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=cor}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor=p.ativo?'rgba(255,255,255,0.06)':'rgba(248,113,113,0.2)'}}>

                  <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:cor}}/>

                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,marginTop:4}}>
                    <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{PLANO_LABEL[p.plano]||p.plano}</div>
                    <span style={{display:'inline-block',padding:'2px 8px',borderRadius:100,fontSize:9,fontWeight:700,color:p.ativo?'#34d399':'#f87171',background:p.ativo?'rgba(52,211,153,0.1)':'rgba(248,113,113,0.1)',border:`1px solid ${p.ativo?'#34d399':'#f87171'}33`}}>
                      {p.ativo?'ATIVO':'INATIVO'}
                    </span>
                  </div>

                  <div style={{fontSize:11,color:'#888',marginBottom:14,minHeight:32,lineHeight:1.5}}>
                    {p.cta_texto || '—'}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:12,fontSize:11,color:'#aaa'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'#666'}}>Mini-simulados</span>
                      <strong style={{color:'#fff'}}>{p.mini_simulado_qtd===null?'∞':p.mini_simulado_qtd}</strong>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'#666'}}>Flashcards/disc.</span>
                      <strong style={{color:'#fff'}}>{p.flashcards_por_disciplina===null?'∞':p.flashcards_por_disciplina}</strong>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'#666'}}>IA por período</span>
                      <strong style={{color:'#fff'}}>{p.ia_perguntas_limite===null?'∞':p.ia_perguntas_limite}</strong>
                    </div>
                  </div>

                  <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:12,minHeight:24}}>
                    {p.permite_pdf && <span style={{fontSize:9,padding:'2px 6px',background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:4,color:'#34d399'}}>📄 PDF</span>}
                    {p.permite_simulado_completo && <span style={{fontSize:9,padding:'2px 6px',background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:4,color:'#34d399'}}>📋 Sim.Completo</span>}
                    {p.permite_filtros_avancados && <span style={{fontSize:9,padding:'2px 6px',background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:4,color:'#34d399'}}>🎯 Filtros</span>}
                    {p.permite_radar && <span style={{fontSize:9,padding:'2px 6px',background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:4,color:'#34d399'}}>📡 Radar</span>}
                  </div>

                  <div style={{padding:'8px',background:'rgba(255,255,255,0.03)',borderRadius:8,fontSize:10,fontWeight:700,color:'#D4A843',textAlign:'center',letterSpacing:1}}>
                    ✏️ CLIQUE PARA EDITAR
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {editando && adminId && (
        <EditorPlano plano={editando} adminId={adminId} onClose={()=>setEditando(null)} onSaved={()=>{setEditando(null);load()}}/>
      )}
    </div>
  )
}
