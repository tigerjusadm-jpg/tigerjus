'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
type BannerArea = 'landing' | 'dashboard' | 'hero'
type AreaFilter = 'all' | BannerArea
type StatusFilter = 'all' | 'active' | 'inactive' | 'noimage'

interface BannerDef {
  id: string; nome: string; area: BannerArea; slide: number | null
  urlKey: string; linkKey: string; altKey: string
  enabledKey: string; areaEnabledKey: string
}

interface BannerItem extends BannerDef {
  url: string; link: string; alt: string
  enabled: boolean; areaEnabled: boolean; hasImage: boolean
  startDate: string; endDate: string
}

type SettingsMap = Record<string, string>

// ── Static banner definitions ─────────────────────────────────────────────────
const BANNER_DEFS: BannerDef[] = [
  { id:'landing_1', nome:'Landing Page — Slide 1', area:'landing', slide:1,
    urlKey:'landing_top_banner_url', linkKey:'landing_top_banner_link', altKey:'landing_top_banner_alt',
    enabledKey:'landing_top_banner_slide_1_enabled', areaEnabledKey:'landing_top_banner_enabled' },
  { id:'landing_2', nome:'Landing Page — Slide 2', area:'landing', slide:2,
    urlKey:'landing_top_banner_url_2', linkKey:'landing_top_banner_link_2', altKey:'landing_top_banner_alt_2',
    enabledKey:'landing_top_banner_slide_2_enabled', areaEnabledKey:'landing_top_banner_enabled' },
  { id:'landing_3', nome:'Landing Page — Slide 3', area:'landing', slide:3,
    urlKey:'landing_top_banner_url_3', linkKey:'landing_top_banner_link_3', altKey:'landing_top_banner_alt_3',
    enabledKey:'landing_top_banner_slide_3_enabled', areaEnabledKey:'landing_top_banner_enabled' },
  { id:'dashboard_1', nome:'Dashboard — Slide 1', area:'dashboard', slide:1,
    urlKey:'dashboard_banner_url', linkKey:'dashboard_banner_link', altKey:'dashboard_banner_alt',
    enabledKey:'dashboard_banner_slide_1_enabled', areaEnabledKey:'dashboard_banner_enabled' },
  { id:'dashboard_2', nome:'Dashboard — Slide 2', area:'dashboard', slide:2,
    urlKey:'dashboard_banner_url_2', linkKey:'dashboard_banner_link_2', altKey:'dashboard_banner_alt_2',
    enabledKey:'dashboard_banner_slide_2_enabled', areaEnabledKey:'dashboard_banner_enabled' },
  { id:'dashboard_3', nome:'Dashboard — Slide 3', area:'dashboard', slide:3,
    urlKey:'dashboard_banner_url_3', linkKey:'dashboard_banner_link_3', altKey:'dashboard_banner_alt_3',
    enabledKey:'dashboard_banner_slide_3_enabled', areaEnabledKey:'dashboard_banner_enabled' },
  { id:'hero_1', nome:'Hero Media', area:'hero', slide:null,
    urlKey:'hero_media_url', linkKey:'', altKey:'',
    enabledKey:'hero_media_enabled', areaEnabledKey:'hero_media_enabled' },
]

// Visual config keys per area
const VISUAL_KEYS: Record<BannerArea, string[]> = {
  landing:   ['landing_top_banner_interval','landing_top_banner_height','landing_top_banner_position',
               'landing_top_banner_opacity','landing_top_banner_fit','landing_top_banner_margin_top',
               'landing_top_banner_margin_bottom','landing_top_banner_radius','landing_top_banner_max_width'],
  dashboard: ['dashboard_banner_interval','dashboard_banner_height','dashboard_banner_position',
               'dashboard_banner_opacity','dashboard_banner_fit','dashboard_banner_radius','dashboard_banner_max_width'],
  hero:      ['hero_media_type','hero_media_position','hero_media_opacity',
               'hero_media_animation','hero_media_max_width','hero_media_blur'],
}

const VISUAL_LABELS: Record<string, string> = {
  landing_top_banner_interval:'Intervalo (seg)', landing_top_banner_height:'Altura (px)',
  landing_top_banner_position:'Posição', landing_top_banner_opacity:'Opacidade (0-100)',
  landing_top_banner_fit:'Fit (cover/contain)', landing_top_banner_margin_top:'Margin Top (px)',
  landing_top_banner_margin_bottom:'Margin Bottom (px)', landing_top_banner_radius:'Radius (px)',
  landing_top_banner_max_width:'Max Width (px)',
  dashboard_banner_interval:'Intervalo (seg)', dashboard_banner_height:'Altura (px)',
  dashboard_banner_position:'Posição', dashboard_banner_opacity:'Opacidade (0-100)',
  dashboard_banner_fit:'Fit (cover/contain)', dashboard_banner_radius:'Radius (px)',
  dashboard_banner_max_width:'Max Width (px)',
  hero_media_type:'Tipo (image/video)', hero_media_position:'Posição',
  hero_media_opacity:'Opacidade (0-100)', hero_media_animation:'Animação',
  hero_media_max_width:'Max Width (px)', hero_media_blur:'Blur (px)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseBool(val: string | undefined, def = true): boolean {
  if (val === undefined || val === null || val === '') return def
  return val !== 'false' && val !== '0'
}

async function upsertSetting(key: string, value: string, type = 'text') {
  const { data: ex } = await supabase.from('app_settings')
    .select('id').eq('key', key).is('tenant_id', null).maybeSingle()
  if (ex?.id) {
    await supabase.from('app_settings')
      .update({ value, updated_at: new Date().toISOString() }).eq('id', ex.id)
  } else {
    await supabase.from('app_settings')
      .insert({ key, value, type, ativo: true, tenant_id: null, description: key })
  }
}

function shortUrl(url: string, n = 38) {
  if (!url) return ''
  try { const u = new URL(url); return (u.hostname + u.pathname).slice(0, n) + (url.length > n + 12 ? '…' : '') }
  catch { return url.slice(0, n) + (url.length > n ? '…' : '') }
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width:40, height:22, borderRadius:11,
      background: on ? '#34d399' : '#374151', position:'relative', transition:'background 0.2s',
      cursor:'pointer', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left: on ? 21 : 3, width:16, height:16,
        borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ b }: { b: BannerItem }) {
  if (!b.hasImage) return <span style={{ fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:100,
    background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)',
    color:'#fbbf24', letterSpacing:1, textTransform:'uppercase' }}>Sem Imagem</span>
  if (!b.enabled || !b.areaEnabled) return <span style={{ fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:100,
    background:'rgba(248,113,113,0.15)', border:'1px solid rgba(248,113,113,0.3)',
    color:'#f87171', letterSpacing:1, textTransform:'uppercase' }}>Inativo</span>
  return <span style={{ fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:100,
    background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.3)',
    color:'#34d399', letterSpacing:1, textTransform:'uppercase' }}>Ativo</span>
}

// ── BannerCard ────────────────────────────────────────────────────────────────
function BannerCard({ b, onEdit, onToggle, onCopy }:{
  b: BannerItem; onEdit:()=>void; onToggle:(v:boolean)=>void; onCopy:()=>void
}) {
  const [err, setErr] = useState(false)
  useEffect(()=>{ setErr(false) }, [b.url])
  return (
    <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column',
      transition:'transform 0.15s, border-color 0.15s' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='rgba(212,168,67,0.3)' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)' }}>

      {/* Card header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px 8px' }}>
        <StatusBadge b={b}/>
        <button onClick={onEdit} style={{ display:'flex', alignItems:'center', gap:4,
          background:'rgba(212,168,67,0.1)', border:'1px solid rgba(212,168,67,0.2)',
          borderRadius:6, padding:'4px 10px', color:'#D4A843', fontSize:11, fontWeight:700, cursor:'pointer' }}>
          ✏️ Editar
        </button>
      </div>

      {/* Image preview */}
      <div style={{ margin:'0 12px', borderRadius:8, overflow:'hidden', background:'#0a0a0a',
        aspectRatio:'16/5', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {b.url && !err
          ? <img src={b.url} alt={b.alt||b.nome} onError={()=>setErr(true)}
              style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{b.url&&err?'⚠️':'🖼️'}</div>
              <div style={{ fontSize:9, color:'#444' }}>{b.url&&err?'Erro ao carregar':'Sem imagem'}</div>
            </div>
        }
      </div>

      {/* Info */}
      <div style={{ padding:'10px 12px', flex:1 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#fff', marginBottom:5 }}>{b.nome}</div>
        <div style={{ fontSize:10, color: b.link?'#34d399':'#444', marginBottom:4,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {b.link ? `🔗 ${shortUrl(b.link)}` : 'Sem link'}
        </div>
        {b.url && <div style={{ fontSize:9, color:'#333', fontFamily:'monospace',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shortUrl(b.url)}</div>}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 12px 12px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', gap:5 }}>
          {b.url && <>
            <button onClick={()=>window.open(b.url,'_blank')} title="Abrir"
              style={{ width:26, height:26, borderRadius:6, background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.08)', color:'#777', fontSize:11, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center' }}>↗</button>
            <button onClick={onCopy} title="Copiar URL"
              style={{ width:26, height:26, borderRadius:6, background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.08)', color:'#777', fontSize:11, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center' }}>📋</button>
          </>}
          <button onClick={onEdit} title="Ver detalhes"
            style={{ width:26, height:26, borderRadius:6, background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)', color:'#777', fontSize:11, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center' }}>👁</button>
        </div>
        <Toggle on={b.enabled} onChange={onToggle}/>
      </div>
    </div>
  )
}

// ── BannerRow (list view) ─────────────────────────────────────────────────────
function BannerRow({ b, onEdit, onToggle, onCopy }:{
  b:BannerItem; onEdit:()=>void; onToggle:(v:boolean)=>void; onCopy:()=>void
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
      background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12,
      transition:'border-color 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(212,168,67,0.25)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}>
      {/* Mini preview */}
      <div style={{ width:72, height:22, borderRadius:4, overflow:'hidden', background:'#0a0a0a', flexShrink:0 }}>
        {b.url && <img src={b.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{b.nome}</div>
        <div style={{ fontSize:10, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {b.url ? shortUrl(b.url) : 'Sem imagem'}
        </div>
      </div>
      <StatusBadge b={b}/>
      <div style={{ display:'flex', gap:6 }}>
        {b.url && <>
          <button onClick={()=>window.open(b.url,'_blank')} style={{ width:26,height:26,borderRadius:6,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#777',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>↗</button>
          <button onClick={onCopy} style={{ width:26,height:26,borderRadius:6,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#777',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>📋</button>
        </>}
        <button onClick={onEdit} style={{ height:26,borderRadius:6,padding:'0 10px',background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.2)',color:'#D4A843',fontSize:11,fontWeight:700,cursor:'pointer' }}>Editar</button>
      </div>
      <Toggle on={b.enabled} onChange={onToggle}/>
    </div>
  )
}

// ── EditorDrawer ──────────────────────────────────────────────────────────────
function EditorDrawer({ b, sm, adminId, onClose, onSaved }:{
  b: BannerItem; sm: SettingsMap; adminId?: string
  onClose:()=>void; onSaved:(updates: SettingsMap)=>void
}) {
  const [form, setForm] = useState<SettingsMap>({
    [b.urlKey]: b.url, [b.linkKey||'_nolink']: b.link, [b.altKey||'_noalt']: b.alt,
    [b.enabledKey]: String(b.enabled), [b.areaEnabledKey]: String(b.areaEnabled),
    ...Object.fromEntries(VISUAL_KEYS[b.area].map(k => [k, sm[k]||''])),
    [`${b.id}_start_date`]: sm[`${b.id}_start_date`]||'',
    [`${b.id}_end_date`]: sm[`${b.id}_end_date`]||'',
  })

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [imgErr, setImgErr] = useState(false)
  const previewUrl = form[b.urlKey] || ''

  useEffect(()=>{ setImgErr(false) }, [previewUrl])

  const set = (k: string, v: string) => setForm(f => ({...f, [k]:v}))
  const setBool = (k: string, v: boolean) => setForm(f => ({...f, [k]: String(v)}))

  const areaEnabled = parseBool(form[b.areaEnabledKey])
  const slideEnabled = parseBool(form[b.enabledKey])

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      const before: SettingsMap = {}
      const after: SettingsMap = {}
      const changedKeys: string[] = []

      for (const [k, v] of Object.entries(form)) {
        if (k === '_nolink' || k === '_noalt') continue
        const old = sm[k] ?? ''
        if (v !== old) {
          before[k] = old; after[k] = v; changedKeys.push(k)
          const type = k.includes('_enabled') ? 'boolean' : 'text'
          await upsertSetting(k, v, type)
        }
      }

      if (adminId && changedKeys.length > 0) {
        await supabase.from('admin_audit_logs').insert({
          user_id: adminId, action_type: 'UPDATE', target_type: 'banner_settings',
          metadata: { before, after, keys: changedKeys, area: b.area, slide: b.slide, adminId },
        })
      }

      setMsg('✅ Salvo com sucesso!'); setTimeout(()=>{ setMsg(''); onSaved(after) }, 1200)
    } catch(e) { setMsg('❌ Erro ao salvar. Tente novamente.') }
    setSaving(false)
  }

  const inp = (label: string, key: string, placeholder='', type='text') => (
    <div>
      <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase',
        color:'#555', display:'block', marginBottom:5 }}>{label}</label>
      <input value={form[key]||''} onChange={e=>set(key, e.target.value)} placeholder={placeholder} type={type}
        style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
          padding:'9px 12px', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
    </div>
  )

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(2px)' }} onClick={onClose}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, zIndex:201, width:600, maxWidth:'100vw',
        background:'#111', borderLeft:'1px solid rgba(255,255,255,0.08)', overflowY:'auto',
        display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0d0d0d', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{b.nome}</div>
            <div style={{ fontSize:11, color:'#555', marginTop:2 }}>
              {b.area === 'landing' ? 'Landing Page' : b.area === 'dashboard' ? 'Dashboard' : 'Hero Media'}
              {b.slide ? ` · Slide ${b.slide}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>

        {/* Scroll body */}
        <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:18 }}>

          {/* Preview */}
          <div>
            <label style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', display:'block', marginBottom:8 }}>
              Preview
            </label>
            <div style={{ borderRadius:10, overflow:'hidden', background:'#0a0a0a', aspectRatio:'16/5',
              display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,0.06)' }}>
              {previewUrl && !imgErr
                ? <img src={previewUrl} alt="preview" onError={()=>setImgErr(true)}
                    style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>{previewUrl&&imgErr?'⚠️':'🖼️'}</div>
                    <div style={{ fontSize:12, color:'#444' }}>{previewUrl&&imgErr?'Erro ao carregar imagem':'Sem imagem configurada'}</div>
                    {b.area==='landing' && <div style={{ fontSize:10, color:'#333', marginTop:4 }}>Recomendado: 1800×300px</div>}
                    {b.area==='dashboard' && <div style={{ fontSize:10, color:'#333', marginTop:4 }}>Recomendado: 1200×300px</div>}
                  </div>
              }
            </div>
          </div>

          {/* Status toggles */}
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', marginBottom:12 }}>STATUS</div>
            {b.area !== 'hero' && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#ccc' }}>
                    {b.area === 'landing' ? 'Landing Page' : 'Dashboard'} — Área completa
                  </div>
                  <div style={{ fontSize:10, color:'#555' }}>Ativa ou desativa todos os banners desta área</div>
                </div>
                <Toggle on={areaEnabled} onChange={v=>setBool(b.areaEnabledKey, v)}/>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'#ccc' }}>
                  {b.slide ? `Slide ${b.slide}` : 'Hero Media'} — Este banner
                </div>
                <div style={{ fontSize:10, color:'#555' }}>Ativa ou desativa apenas este slide/banner</div>
              </div>
              <Toggle on={slideEnabled} onChange={v=>setBool(b.enabledKey, v)}/>
            </div>
          </div>

          {/* Content */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555' }}>CONTEÚDO</div>
            {inp('URL da Imagem', b.urlKey, 'https://...')}
            {b.area !== 'hero' && b.linkKey && inp('Link de Destino (opcional)', b.linkKey, 'https://tigerjus.com.br/planos')}
            {b.area !== 'hero' && b.altKey && inp('Texto Alternativo (Alt)', b.altKey, 'Banner promocional TigerJus')}
          </div>

          {/* Visual settings */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#555', marginBottom:12 }}>
              CONFIGURAÇÕES VISUAIS
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {VISUAL_KEYS[b.area].map(k => (
                <div key={k}>
                  <label style={{ fontSize:10, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'#555', display:'block', marginBottom:5 }}>
                    {VISUAL_LABELS[k] || k}
                  </label>
                  <input value={form[k]||''} onChange={e=>set(k, e.target.value)}
                    style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
                      padding:'8px 12px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduling (extra) */}
          <div style={{ background:'rgba(212,168,67,0.04)', border:'1px solid rgba(212,168,67,0.12)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#D4A843', marginBottom:12 }}>
              📅 AGENDAMENTO (OPCIONAL)
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'#555', display:'block', marginBottom:5 }}>Data Início</label>
                <input type="datetime-local" value={form[`${b.id}_start_date`]||''} onChange={e=>set(`${b.id}_start_date`, e.target.value)}
                  style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box', colorScheme:'dark' }}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'#555', display:'block', marginBottom:5 }}>Data Fim</label>
                <input type="datetime-local" value={form[`${b.id}_end_date`]||''} onChange={e=>set(`${b.id}_end_date`, e.target.value)}
                  style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box', colorScheme:'dark' }}/>
              </div>
            </div>
            <div style={{ marginTop:8, fontSize:10, color:'#666', lineHeight:1.5 }}>
              💡 Se configurado, o banner será exibido apenas dentro do período definido.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', background:'#0d0d0d', flexShrink:0 }}>
          {msg && (
            <div style={{ marginBottom:10, padding:'8px 12px',
              background: msg.startsWith('✅') ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${msg.startsWith('✅') ? '#34d399' : '#ef4444'}44`,
              borderRadius:8, fontSize:12, color: msg.startsWith('✅') ? '#34d399' : '#f87171' }}>
              {msg}
            </div>
          )}
          <button onClick={save} disabled={saving}
            style={{ width:'100%', background:'linear-gradient(135deg,#D4A843,#E8621A)', border:'none',
              borderRadius:8, padding:'12px', color:'#000', fontSize:13, fontWeight:700,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '⏳ Salvando...' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ModuloCentralBanners({ adminId }: { adminId?: string }) {
  const [sm, setSm] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('app_settings').select('key,value').is('tenant_id', null)
    const map: SettingsMap = {}
    if (data) data.forEach(r => { map[r.key] = String(r.value ?? '') })
    setSm(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  // Build banner items from settings
  const banners: BannerItem[] = BANNER_DEFS.map(def => {
    const url = sm[def.urlKey] || ''
    const enabledRaw = sm[def.enabledKey]
    const areaEnabledRaw = sm[def.areaEnabledKey]
    return {
      ...def,
      url,
      link: def.linkKey ? (sm[def.linkKey] || '') : '',
      alt: def.altKey ? (sm[def.altKey] || '') : '',
      enabled: parseBool(enabledRaw, !!url),
      areaEnabled: parseBool(areaEnabledRaw, true),
      hasImage: url.trim().length > 0,
      startDate: sm[`${def.id}_start_date`] || '',
      endDate: sm[`${def.id}_end_date`] || '',
    }
  })

  // Apply scheduling logic
  const now = new Date()
  const bannersWithSchedule = banners.map(b => {
    if (!b.startDate && !b.endDate) return b
    const started = !b.startDate || new Date(b.startDate) <= now
    const notExpired = !b.endDate || new Date(b.endDate) >= now
    return { ...b, enabled: b.enabled && started && notExpired }
  })

  // Metrics
  const total = bannersWithSchedule.length
  const ativos = bannersWithSchedule.filter(b => b.enabled && b.areaEnabled && b.hasImage).length
  const inativos = bannersWithSchedule.filter(b => !b.enabled || !b.areaEnabled).length
  const semImagem = bannersWithSchedule.filter(b => !b.hasImage).length

  // Filtered banners
  const filtered = bannersWithSchedule.filter(b => {
    if (areaFilter !== 'all' && b.area !== areaFilter) return false
    if (statusFilter === 'active' && (!b.enabled || !b.areaEnabled || !b.hasImage)) return false
    if (statusFilter === 'inactive' && (b.enabled && b.areaEnabled)) return false
    if (statusFilter === 'noimage' && b.hasImage) return false
    if (search) {
      const q = search.toLowerCase()
      if (!b.nome.toLowerCase().includes(q) && !b.url.toLowerCase().includes(q) && !b.area.includes(q)) return false
    }
    return true
  })

  const handleToggle = async (b: BannerItem, v: boolean) => {
    const newSm = { ...sm, [b.enabledKey]: String(v) }
    setSm(newSm)
    await upsertSetting(b.enabledKey, String(v), 'boolean')
    if (adminId) {
      await supabase.from('admin_audit_logs').insert({
        user_id: adminId, action_type: 'UPDATE', target_type: 'banner_settings',
        metadata: { before: { [b.enabledKey]: sm[b.enabledKey] }, after: { [b.enabledKey]: String(v) },
          keys: [b.enabledKey], area: b.area, slide: b.slide, adminId },
      })
    }
  }

  const handleCopy = async (b: BannerItem) => {
    if (!b.url) return
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(b.url)
      else { const t = document.createElement('textarea'); t.value = b.url; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t) }
      setCopiedKey(b.id); setTimeout(() => setCopiedKey(null), 1800)
    } catch {}
  }

  const editingBanner = editId ? bannersWithSchedule.find(b => b.id === editId) || null : null

  const AREAS: {key: AreaFilter; label: string; count: number}[] = [
    { key:'all', label:'Todos', count: total },
    { key:'landing', label:'Landing Page', count: banners.filter(b=>b.area==='landing').length },
    { key:'dashboard', label:'Dashboard', count: banners.filter(b=>b.area==='dashboard').length },
    { key:'hero', label:'Hero Media', count: banners.filter(b=>b.area==='hero').length },
  ]

  const SECTIONS: { area: BannerArea; label: string }[] = [
    { area:'landing', label:'LANDING PAGE — BANNER TOPO' },
    { area:'dashboard', label:'DASHBOARD — BANNER TOPO' },
    { area:'hero', label:'HERO MEDIA' },
  ]

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300, color:'#555' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:32, marginBottom:12 }}>⏳</div><div>Carregando banners...</div></div>
    </div>
  )

  return (
    <div style={{ color:'#fff', fontFamily:'inherit' }}>
      {/* Title */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:900, color:'#fff', marginBottom:4 }}>Central de Banners 🎯</h2>
        <p style={{ fontSize:13, color:'#555' }}>Gerencie Landing Page, Dashboard e Hero Media sem mexer no banco manualmente.</p>
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10, marginBottom:24 }}>
        {[
          { label:'Total', value: total, color:'#60a5fa', icon:'📊' },
          { label:'Ativos', value: ativos, color:'#34d399', icon:'✅' },
          { label:'Inativos', value: inativos, color:'#f87171', icon:'❌' },
          { label:'Sem Imagem', value: semImagem, color:'#fbbf24', icon:'⚠️' },
        ].map(m => (
          <div key={m.label} style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.06)',
            borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
            <div style={{ fontSize:22, fontWeight:900, color:m.color }}>{m.value}</div>
            <div style={{ fontSize:10, color:'#555', marginTop:2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        {/* Area filters */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {AREAS.map(a => (
            <button key={a.key} onClick={() => setAreaFilter(a.key)}
              style={{ padding:'6px 14px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer',
                border: areaFilter===a.key ? '1px solid var(--gold,#D4A843)' : '1px solid rgba(255,255,255,0.1)',
                background: areaFilter===a.key ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
                color: areaFilter===a.key ? '#D4A843' : '#777' }}>
              {a.label} <span style={{ opacity:0.6 }}>{a.count}</span>
            </button>
          ))}
        </div>

        {/* Status filters */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {(['all','active','inactive','noimage'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding:'5px 12px', borderRadius:100, fontSize:11, cursor:'pointer',
                border: statusFilter===s ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                background: statusFilter===s ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: statusFilter===s ? '#fff' : '#666' }}>
              {{ all:'Todos', active:'Ativos', inactive:'Inativos', noimage:'Sem imagem' }[s]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ flex:1, minWidth:180, position:'relative' }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#555' }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar banner..."
            style={{ width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
              padding:'8px 12px 8px 32px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
        </div>

        {/* View mode */}
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:3 }}>
          {(['cards','list'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding:'5px 12px', borderRadius:6, fontSize:11, cursor:'pointer',
                background: viewMode===v ? 'rgba(255,255,255,0.1)' : 'transparent',
                border:'none', color: viewMode===v ? '#fff' : '#555' }}>
              {v === 'cards' ? '⊞' : '☰'} {v === 'cards' ? 'Cards' : 'Lista'}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button onClick={loadSettings}
          style={{ padding:'7px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:8, color:'#666', fontSize:12, cursor:'pointer' }}>
          🔄
        </button>
      </div>

      {/* Banner sections */}
      {SECTIONS.map(sec => {
        const sectionBanners = filtered.filter(b => b.area === sec.area)
        if (sectionBanners.length === 0 && areaFilter !== 'all' && areaFilter !== sec.area) return null

        const areaEnabledKey = sec.area === 'landing' ? 'landing_top_banner_enabled'
          : sec.area === 'dashboard' ? 'dashboard_banner_enabled' : 'hero_media_enabled'
        const areaOn = parseBool(sm[areaEnabledKey], true)

        return (
          <div key={sec.area} style={{ marginBottom:28 }}>
            {/* Section header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:'2.5px', textTransform:'uppercase', color:'#666' }}>
                {sec.label}
              </div>
              {sec.area !== 'hero' && (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:'#555' }}>Área</span>
                  <Toggle on={areaOn} onChange={async v => {
                    setSm(p => ({...p, [areaEnabledKey]: String(v)}))
                    await upsertSetting(areaEnabledKey, String(v), 'boolean')
                  }}/>
                </div>
              )}
              {!areaOn && (
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:100,
                  background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.2)' }}>
                  Área desativada
                </span>
              )}
            </div>

            {/* Cards or list */}
            {viewMode === 'cards'
              ? <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
                  {sectionBanners.map(b => (
                    <BannerCard key={b.id} b={b}
                      onEdit={() => setEditId(b.id)}
                      onToggle={v => handleToggle(b, v)}
                      onCopy={() => handleCopy(b)}/>
                  ))}
                  {sectionBanners.length === 0 && (
                    <div style={{ gridColumn:'1/-1', padding:24, textAlign:'center', color:'#444', fontSize:12 }}>
                      Nenhum banner nesta área com os filtros aplicados.
                    </div>
                  )}
                </div>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {sectionBanners.map(b => (
                    <BannerRow key={b.id} b={b}
                      onEdit={() => setEditId(b.id)}
                      onToggle={v => handleToggle(b, v)}
                      onCopy={() => handleCopy(b)}/>
                  ))}
                </div>
            }
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:48, color:'#444' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🔎</div>
          <div>Nenhum banner encontrado com os filtros aplicados.</div>
        </div>
      )}

      {/* Copy feedback */}
      {copiedKey && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:300,
          background:'#1a1a1a', border:'1px solid rgba(52,211,153,0.3)', borderRadius:10,
          padding:'10px 20px', fontSize:13, color:'#34d399', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
          ✅ URL copiada!
        </div>
      )}

      {/* Drawer */}
      {editingBanner && (
        <EditorDrawer b={editingBanner} sm={sm} adminId={adminId}
          onClose={() => setEditId(null)}
          onSaved={updates => { setSm(p => ({...p, ...updates})); setEditId(null) }}/>
      )}
    </div>
  )
}
