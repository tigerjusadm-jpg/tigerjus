'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  uploadAsset, listAssets, updateAsset, deleteAsset,
  MEDIA_CATEGORIAS, MEDIA_CATEGORIA_LABEL,
  TIPOS_PERMITIDOS, isImagem,
  type MediaAsset, type MediaCategoria,
} from '@/lib/storage'

const POR_PAGINA = 24

const CATEGORIA_COR: Record<MediaCategoria, string> = {
  branding:'#D4A843', landing:'#60a5fa', dashboard:'#34d399', login:'#a78bfa',
  mascote:'#f472b6', marketing:'#fb923c', tema:'#fbbf24', campanha:'#ef4444',
}

// Ícones por extensão real do constraint
const TIPO_ICONE: Record<string, string> = {
  png:'🖼️', webp:'🖼️', jpg:'🖼️', jpeg:'🖼️', svg:'🎨',
  mp4:'🎬', webm:'🎬',
}

// Atributo accept do <input type="file"> — restringe na seleção
const FILE_ACCEPT = [
  '.png', '.webp', '.jpg', '.jpeg', '.svg', '.mp4', '.webm',
  'image/png', 'image/webp', 'image/jpeg', 'image/svg+xml',
  'video/mp4', 'video/webm',
].join(',')

const FORMATOS_HINT = TIPOS_PERMITIDOS.map(t => t.toUpperCase()).join(', ')

// ─── COMPONENTES PEQUENOS ─────────────────────────────────────────────────────

function EmptyState({msg, onAction}:{msg:string; onAction?:()=>void}) {
  return (
    <div style={{textAlign:'center',padding:48,color:'#555'}}>
      <div style={{fontSize:48,marginBottom:16}}>🖼️</div>
      <div style={{fontSize:15,fontWeight:600,color:'#888',marginBottom:8}}>Nenhum asset encontrado</div>
      <div style={{fontSize:13,color:'#555',marginBottom:onAction?20:0}}>{msg}</div>
      {onAction && (
        <button onClick={onAction}
          style={{background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'10px 20px',color:'#000',fontSize:13,fontWeight:700,cursor:'pointer'}}>
          + Fazer primeiro upload
        </button>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:14}}>
      {[...Array(8)].map((_,i) => (
        <div key={i} style={{height:200,borderRadius:12,background:'rgba(255,255,255,0.04)',animation:'pulse 1.5s infinite'}}/>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}

// ─── CARD DE ASSET ────────────────────────────────────────────────────────────

function AssetCard({asset, onClick}:{asset:MediaAsset; onClick:()=>void}) {
  const cor = CATEGORIA_COR[asset.categoria] || '#888'
  const ehImagem = isImagem(asset.tipo)
  return (
    <div onClick={onClick}
      style={{
        background:'#1a1a1a',
        border:`1px solid ${asset.ativo?'rgba(255,255,255,0.06)':'rgba(248,113,113,0.2)'}`,
        borderRadius:12, overflow:'hidden', cursor:'pointer',
        transition:'transform 0.15s, border-color 0.15s',
        display:'flex', flexDirection:'column',
      }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=cor}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor=asset.ativo?'rgba(255,255,255,0.06)':'rgba(248,113,113,0.2)'}}>
      <div style={{
        aspectRatio:'1',
        background:ehImagem
          ? `url(${asset.url}) center/contain no-repeat, repeating-conic-gradient(#222 0% 25%, #1a1a1a 0% 50%) 50% / 16px 16px`
          : 'rgba(255,255,255,0.03)',
        display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
      }}>
        {!ehImagem && <span style={{fontSize:48}}>{TIPO_ICONE[asset.tipo] || '📦'}</span>}
        {!asset.ativo && (
          <span style={{position:'absolute',top:8,right:8,background:'rgba(248,113,113,0.95)',color:'#fff',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:100}}>
            INATIVO
          </span>
        )}
      </div>
      <div style={{padding:12,display:'flex',flexDirection:'column',gap:6,minHeight:84}}>
        <div style={{fontSize:12,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{asset.nome}</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
          <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:`${cor}22`,color:cor,border:`1px solid ${cor}44`,textTransform:'uppercase',letterSpacing:0.5}}>
            {MEDIA_CATEGORIA_LABEL[asset.categoria]}
          </span>
          {asset.tamanho_kb !== null && (
            <span style={{fontSize:10,color:'#666'}}>
              {asset.tamanho_kb > 1024 ? `${(asset.tamanho_kb/1024).toFixed(1)}MB` : `${asset.tamanho_kb}KB`}
            </span>
          )}
        </div>
        {asset.largura && asset.altura && (
          <div style={{fontSize:10,color:'#555'}}>{asset.largura}×{asset.altura}px</div>
        )}
      </div>
    </div>
  )
}

// ─── DRAWER UPLOAD/EDIT ───────────────────────────────────────────────────────

interface DrawerProps {
  asset: MediaAsset | null
  adminId: string
  onClose: () => void
  onSaved: () => void
}

function EditorAsset({asset, adminId, onClose, onSaved}: DrawerProps) {
  const isNovo = !asset
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nome: asset?.nome || '',
    alt_text: asset?.alt_text || '',
    descricao: asset?.descricao || '',
    categoria: (asset?.categoria || 'branding') as MediaCategoria,
    subcategoria: asset?.subcategoria || '',
    tags: (asset?.tags || []).join(', '),
    ativo: asset?.ativo ?? true,
  })

  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}))

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl('')
  }, [file])

  const handleFileSelect = (f: File) => {
    setFile(f)
    if (!form.nome) set('nome', f.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0])
  }

  const salvar = async () => {
    setSaving(true); setMsg('')
    const tagsArray = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []

    if (isNovo) {
      if (!file) { setMsg('❌ Selecione um arquivo.'); setSaving(false); return }
      if (!form.nome.trim()) { setMsg('❌ Nome é obrigatório.'); setSaving(false); return }

      const { data, error } = await uploadAsset({
        file, categoria: form.categoria,
        subcategoria: form.subcategoria || null,
        nome: form.nome,
        alt_text: form.alt_text || null,
        descricao: form.descricao || null,
        tags: tagsArray,
        criado_por: adminId,
      })

      if (error || !data) { setMsg(`❌ ${error || 'Erro no upload.'}`); setSaving(false); return }

      await supabase.from('admin_audit_logs').insert({
        user_id: adminId, action_type: 'CREATE',
        target_type: 'media_asset', target_id: data.id,
        metadata: {
          nome: data.nome, categoria: data.categoria, subcategoria: data.subcategoria,
          storage_path: data.storage_path, tamanho_kb: data.tamanho_kb,
          tipo: data.tipo, mime_type: data.mime_type,
        },
      })
      setMsg('✅ Asset criado!'); setTimeout(() => onSaved(), 800)
    } else {
      const before = {
        nome: asset.nome, alt_text: asset.alt_text, descricao: asset.descricao,
        categoria: asset.categoria, subcategoria: asset.subcategoria,
        tags: asset.tags, ativo: asset.ativo,
      }
      const patch = {
        nome: form.nome,
        alt_text: form.alt_text || null,
        descricao: form.descricao || null,
        categoria: form.categoria,
        subcategoria: form.subcategoria || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        ativo: form.ativo,
      }
      const { error } = await updateAsset(asset.id, patch)
      if (error) { setMsg(`❌ ${error}`); setSaving(false); return }

      await supabase.from('admin_audit_logs').insert({
        user_id: adminId, action_type: 'UPDATE',
        target_type: 'media_asset', target_id: asset.id,
        metadata: { before, after: patch },
      })
      setMsg('✅ Salvo!'); setTimeout(() => onSaved(), 800)
    }
    setSaving(false)
  }

  const excluir = async () => {
    if (!asset) return
    setSaving(true); setMsg('')
    const { error, deleted } = await deleteAsset(asset.id)
    if (error) { setMsg(`❌ ${error}`); setSaving(false); return }
    await supabase.from('admin_audit_logs').insert({
      user_id: adminId, action_type: 'DELETE',
      target_type: 'media_asset', target_id: asset.id,
      metadata: { nome: deleted?.nome, categoria: deleted?.categoria, storage_path: deleted?.storage_path, tipo: deleted?.tipo },
    })
    setMsg('✅ Excluído!')
    setTimeout(() => onSaved(), 500)
  }

  const copyUrl = async () => {
    if (!asset) return
    try {
      await navigator.clipboard.writeText(asset.url)
      setMsg('✅ URL copiada!'); setTimeout(() => setMsg(''), 1500)
    } catch { setMsg('❌ Não foi possível copiar.') }
  }

  const label = (s: string) => (
    <label style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#555',display:'block',marginBottom:5}}>{s}</label>
  )
  const inp = (val: string, onChange: (v:string)=>void, placeholder='') => (
    <input value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
  )
  const txt = (val: string, onChange: (v:string)=>void, rows=2, placeholder='') => (
    <textarea value={val} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 12px',color:'#ccc',fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',lineHeight:1.6,boxSizing:'border-box'}}/>
  )
  const sel = (val: string, onChange: (v:string)=>void, opts: string[][]) => (
    <select value={val} onChange={e=>onChange(e.target.value)}
      style={{width:'100%',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
      {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )

  // Ícone do arquivo selecionado (antes do upload)
  const fileExt = file ? file.name.split('.').pop()?.toLowerCase() || '' : ''
  const fileIcone = TIPO_ICONE[fileExt] || '📎'

  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(2px)'}} onClick={onClose}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,zIndex:201,width:620,maxWidth:'100vw',background:'#111',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto',display:'flex',flexDirection:'column'}}>

        <div style={{padding:'18px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:'#0d0d0d'}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{isNovo ? 'Upload de Asset' : 'Editar Asset'}</div>
            {!isNovo && asset && <div style={{fontSize:11,color:'#555',fontFamily:'monospace'}}>{asset.id.slice(0,8)}… · {asset.storage_path}</div>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:20}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:18}}>

          {isNovo ? (
            <section>
              {label('Arquivo')}
              <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                style={{
                  background:previewUrl ? `url(${previewUrl}) center/contain no-repeat, repeating-conic-gradient(#1a1a1a 0% 25%, #0d0d0d 0% 50%) 50% / 12px 12px` : 'rgba(255,255,255,0.03)',
                  border:`2px dashed ${file ? '#D4A843' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius:12, minHeight:200, display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', flexDirection:'column', gap:8, textAlign:'center', padding:20,
                }}>
                {file ? (
                  <>
                    {!previewUrl && <div style={{fontSize:36}}>{fileIcone}</div>}
                    <div style={{fontSize:13,fontWeight:600,color:'#D4A843',background:'rgba(0,0,0,0.7)',padding:'6px 12px',borderRadius:6}}>{file.name}</div>
                    <div style={{fontSize:11,color:'#888',background:'rgba(0,0,0,0.7)',padding:'4px 10px',borderRadius:6}}>{(file.size/1024).toFixed(1)} KB · {file.type || 'desconhecido'}</div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:36}}>📤</div>
                    <div style={{fontSize:13,fontWeight:600,color:'#aaa'}}>Clique ou arraste um arquivo</div>
                    <div style={{fontSize:11,color:'#555'}}>{FORMATOS_HINT}</div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" style={{display:'none'}} accept={FILE_ACCEPT}
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}/>
            </section>
          ) : (
            <section>
              {label('Preview')}
              <div style={{
                background:isImagem(asset?.tipo)
                  ? `url(${asset!.url}) center/contain no-repeat, repeating-conic-gradient(#1a1a1a 0% 25%, #0d0d0d 0% 50%) 50% / 12px 12px`
                  : 'rgba(255,255,255,0.03)',
                border:'1px solid rgba(255,255,255,0.08)', borderRadius:12,
                minHeight:200, display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {!isImagem(asset?.tipo) && <span style={{fontSize:48}}>{TIPO_ICONE[asset?.tipo || ''] || '📦'}</span>}
              </div>
              <button onClick={copyUrl}
                style={{marginTop:8,width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 12px',color:'#aaa',fontSize:11,cursor:'pointer',fontFamily:'monospace'}}>
                📋 Copiar URL pública
              </button>
            </section>
          )}

          <section style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>{label('Categoria')}{sel(form.categoria, v => set('categoria', v), MEDIA_CATEGORIAS.map(c => [c, MEDIA_CATEGORIA_LABEL[c]]))}</div>
            <div>{label('Subcategoria (opcional)')}{inp(form.subcategoria, v => set('subcategoria', v), 'Ex: logos, banners…')}</div>
          </section>

          <div>{label('Nome')}{inp(form.nome, v => set('nome', v), 'Ex: Logo Principal')}</div>
          <div>{label('Alt Text (acessibilidade)')}{inp(form.alt_text, v => set('alt_text', v), 'Descrição curta')}</div>
          <div>{label('Descrição')}{txt(form.descricao, v => set('descricao', v), 2, 'Notas internas…')}</div>
          <div>{label('Tags (separadas por vírgula)')}{inp(form.tags, v => set('tags', v), 'logo, principal, dark')}</div>

          <div onClick={() => set('ativo', !form.ativo)} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'8px 0'}}>
            <div style={{width:40,height:22,borderRadius:11,background:form.ativo?'#34d399':'#374151',position:'relative',transition:'background 0.2s',flexShrink:0}}>
              <div style={{position:'absolute',top:3,left:form.ativo?20:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:'#ccc'}}>Ativo</div>
              <div style={{fontSize:10,color:'#666'}}>{form.ativo ? 'Visível e disponível para uso' : 'Oculto / desativado'}</div>
            </div>
          </div>

          {!isNovo && asset && (
            <section>
              {label('Metadados técnicos')}
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:10,padding:'10px 14px',display:'flex',flexDirection:'column',gap:6,fontSize:11}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#666'}}>Tipo</span><span style={{color:'#aaa',textTransform:'uppercase'}}>{asset.tipo}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#666'}}>MIME</span><span style={{color:'#aaa',fontFamily:'monospace'}}>{asset.mime_type}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#666'}}>Tamanho</span><span style={{color:'#aaa'}}>{asset.tamanho_kb}KB</span></div>
                {asset.largura && asset.altura && <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#666'}}>Dimensões</span><span style={{color:'#aaa'}}>{asset.largura}×{asset.altura}</span></div>}
                <div style={{display:'flex',justifyContent:'space-between',gap:8}}><span style={{color:'#666'}}>Storage</span><span style={{color:'#aaa',fontFamily:'monospace',fontSize:10,wordBreak:'break-all',textAlign:'right'}}>{asset.storage_path}</span></div>
              </div>
            </section>
          )}
        </div>

        <div style={{padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0,background:'#0d0d0d'}}>
          {msg && (
            <div style={{marginBottom:10,padding:'8px 12px',background:msg.startsWith('✅')?'rgba(52,211,153,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${msg.startsWith('✅')?'#34d399':'#ef4444'}44`,borderRadius:8,fontSize:12,color:msg.startsWith('✅')?'#34d399':'#f87171'}}>
              {msg}
            </div>
          )}
          <div style={{display:'flex',gap:8}}>
            <button onClick={salvar} disabled={saving}
              style={{flex:1,background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'11px',color:'#000',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1}}>
              {saving?'⏳ Salvando...':isNovo?'+ Fazer Upload':'💾 Salvar'}
            </button>
            {!isNovo && !confirmDel && (
              <button onClick={()=>setConfirmDel(true)}
                style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'11px 14px',color:'#f87171',fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>
                Excluir
              </button>
            )}
            {!isNovo && confirmDel && (
              <button onClick={excluir} disabled={saving}
                style={{background:'rgba(239,68,68,0.2)',border:'1px solid #ef4444',borderRadius:8,padding:'11px 14px',color:'#f87171',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                Confirmar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloMediaLibrary({adminId}:{adminId?:string}) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<MediaCategoria | ''>('')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos'|'ativo'|'inativo'>('todos')
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [novoUpload, setNovoUpload] = useState(false)
  const buscaTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  const load = useCallback(async (pag = pagina, termo = busca) => {
    setLoading(true)
    const { data, count, error } = await listAssets({
      categoria: filtroCategoria,
      busca: termo,
      ativo: filtroAtivo === 'todos' ? undefined : filtroAtivo === 'ativo',
      limit: POR_PAGINA,
      offset: pag * POR_PAGINA,
    })
    if (!error) { setAssets(data); setTotal(count) }
    else { setAssets([]); setTotal(0) }
    setLoading(false)
  }, [pagina, busca, filtroCategoria, filtroAtivo])

  useEffect(() => { setPagina(0) }, [filtroCategoria, filtroAtivo])
  useEffect(() => { load(pagina, busca) }, [pagina, filtroCategoria, filtroAtivo])

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
            <h2 style={{fontSize:20,fontWeight:900,color:'#fff',marginBottom:2}}>Media Library</h2>
            <div style={{fontSize:12,color:'#555'}}>{total.toLocaleString()} asset(s) cadastrado(s)</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={() => load(pagina, busca)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'7px 14px',color:'#888',fontSize:12,cursor:'pointer'}}>
              🔄 Atualizar
            </button>
            <button onClick={() => setNovoUpload(true)}
              style={{background:'linear-gradient(135deg,#D4A843,#E8621A)',border:'none',borderRadius:8,padding:'7px 16px',color:'#000',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              + Novo Asset
            </button>
          </div>
        </div>

        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input value={busca} onChange={e => handleBusca(e.target.value)}
            placeholder="Buscar por nome, alt-text ou descrição..."
            style={{flex:1,minWidth:220,background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 14px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value as MediaCategoria | '')}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:filtroCategoria?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
            <option value="">Todas categorias</option>
            {MEDIA_CATEGORIAS.map(c => <option key={c} value={c}>{MEDIA_CATEGORIA_LABEL[c]}</option>)}
          </select>
          <select value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value as any)}
            style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'9px 12px',color:filtroAtivo!=='todos'?'#fff':'#555',fontSize:13,outline:'none',colorScheme:'dark',fontFamily:'inherit'}}>
            <option value="todos">Todos status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>

      {loading ? <Skeleton/> : assets.length === 0 ? (
        <EmptyState
          msg={busca || filtroCategoria ? 'Ajuste os filtros ou faça novo upload.' : 'Comece fazendo o upload do primeiro asset.'}
          onAction={() => setNovoUpload(true)}/>
      ) : (
        <>
          <div style={{flex:1,overflowY:'auto'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:14}}>
              {assets.map(asset => <AssetCard key={asset.id} asset={asset} onClick={() => setSelectedAsset(asset)}/>)}
            </div>
          </div>

          {totalPags > 1 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.07)',marginTop:12,flexShrink:0}}>
              <div style={{fontSize:12,color:'#555'}}>Página {pagina+1} de {totalPags} · {total.toLocaleString()} assets</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <button onClick={()=>setPagina(0)} disabled={pagina===0} style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 10px',color:pagina===0?'#444':'#ccc',fontSize:11,cursor:pagina===0?'not-allowed':'pointer'}}>«</button>
                <button onClick={()=>setPagina(p=>Math.max(0,p-1))} disabled={pagina===0} style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 12px',color:pagina===0?'#444':'#ccc',fontSize:12,cursor:pagina===0?'not-allowed':'pointer'}}>← Anterior</button>
                <span style={{fontSize:12,color:'#666',padding:'0 4px'}}>{pagina+1}</span>
                <button onClick={()=>setPagina(p=>Math.min(totalPags-1,p+1))} disabled={pagina===totalPags-1} style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 12px',color:pagina===totalPags-1?'#444':'#ccc',fontSize:12,cursor:pagina===totalPags-1?'not-allowed':'pointer'}}>Próxima →</button>
                <button onClick={()=>setPagina(totalPags-1)} disabled={pagina===totalPags-1} style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'5px 10px',color:pagina===totalPags-1?'#444':'#ccc',fontSize:11,cursor:pagina===totalPags-1?'not-allowed':'pointer'}}>»</button>
              </div>
            </div>
          )}
        </>
      )}

      {(selectedAsset || novoUpload) && adminId && (
        <EditorAsset
          asset={novoUpload ? null : selectedAsset}
          adminId={adminId}
          onClose={() => { setSelectedAsset(null); setNovoUpload(false) }}
          onSaved={() => { setSelectedAsset(null); setNovoUpload(false); load(pagina, busca) }}/>
      )}
    </div>
  )
}
