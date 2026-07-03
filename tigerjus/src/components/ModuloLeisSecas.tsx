'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const PRESETS = [
  { lei_slug: 'eaoab', lei_nome: 'Estatuto da OAB (Lei 8.906/1994)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8906.htm' },
  { lei_slug: 'cdc', lei_nome: 'Código de Defesa do Consumidor (Lei 8.078/1990)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm' },
  { lei_slug: 'eca', lei_nome: 'Estatuto da Criança e do Adolescente (Lei 8.069/1990)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8069.htm' },
  { lei_slug: 'cf', lei_nome: 'Constituição Federal (1988)', url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm' },
  { lei_slug: 'cp', lei_nome: 'Código Penal (Decreto-Lei 2.848/1940)', url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm' },
  { lei_slug: 'cc', lei_nome: 'Código Civil (Lei 10.406/2002)', url: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm' },
  { lei_slug: 'cpc', lei_nome: 'Código de Processo Civil (Lei 13.105/2015)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105compilada.htm' },
  { lei_slug: 'cpp', lei_nome: 'Código de Processo Penal (Decreto-Lei 3.689/1941)', url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm' },
  { lei_slug: 'clt', lei_nome: 'CLT (Decreto-Lei 5.452/1943)', url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm' },
]

const inp: any = { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 13, width: '100%' }
const btn = (bg: string): any => ({ padding: '10px 16px', borderRadius: 8, border: 'none', background: bg, color: bg === '#3a3a3a' ? '#fff' : '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' })

export default function ModuloLeisSecas() {
  const [url, setUrl] = useState(PRESETS[0].url)
  const [slug, setSlug] = useState(PRESETS[0].lei_slug)
  const [nome, setNome] = useState(PRESETS[0].lei_nome)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [artigos, setArtigos] = useState<any[]>([])

  const api = async (action: string, extra: any = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/leis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ action, ...extra }),
    })
    return res.json()
  }

  const importar = async () => {
    setLoading(true); setMsg('⏳ Buscando no Planalto e limpando (encoding + versões revogadas)...')
    try {
      const out = await api('importar', { url, lei_slug: slug, lei_nome: nome })
      if (out.error) { setMsg('❌ ' + out.error); return }
      setMsg(`✅ ${out.total} artigos importados como RASCUNHO. Revise abaixo e publique.`)
      await listar()
    } catch (e: any) { setMsg('❌ ' + (e?.message || 'erro')) }
    finally { setLoading(false) }
  }
  const listar = async () => {
    const out = await api('listar', { lei_slug: slug })
    setArtigos(out.artigos || [])
  }
  const publicar = async () => {
    if (!confirm('Publicar todos os rascunhos desta lei? Ficarão visíveis no app.')) return
    setLoading(true)
    try { const out = await api('publicar', { lei_slug: slug }); setMsg(out.error ? '❌ ' + out.error : '✅ Publicado! Já está no ar.'); await listar() }
    finally { setLoading(false) }
  }
  const descartar = async () => {
    if (!confirm('Descartar os rascunhos desta lei?')) return
    setLoading(true)
    try { await api('descartar', { lei_slug: slug }); setMsg('Rascunhos descartados.'); await listar() }
    finally { setLoading(false) }
  }

  const rascunhos = artigos.filter(a => a.status === 'rascunho')
  const publicados = artigos.filter(a => a.status === 'publicado')

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>⚡ Lei Seca — Importar do Planalto</h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Busca a lei no site do Planalto, limpa (encoding + remove versões revogadas) e salva como <b>rascunho</b> para sua revisão. Só o que você <b>publicar</b> aparece no app.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {PRESETS.map(p => (
          <button key={p.lei_slug} onClick={() => { setUrl(p.url); setSlug(p.lei_slug); setNome(p.lei_nome); setArtigos([]); setMsg('') }}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: slug === p.lei_slug ? 'rgba(212,168,67,0.15)' : 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
            {p.lei_nome}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxWidth: 620 }}>
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da lei" style={inp} />
        <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug (ex: eaoab)" style={inp} />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL do Planalto" style={inp} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={importar} disabled={loading} style={btn('#D4A843')}>⬇️ Importar do Planalto</button>
        <button onClick={listar} disabled={loading} style={btn('#3a3a3a')}>🔄 Recarregar</button>
        {rascunhos.length > 0 && <button onClick={publicar} disabled={loading} style={btn('#4caf50')}>✅ Publicar {rascunhos.length} rascunhos</button>}
        {rascunhos.length > 0 && <button onClick={descartar} disabled={loading} style={btn('#c0392b')}>🗑️ Descartar rascunhos</button>}
      </div>

      {msg && <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontSize: 13, marginBottom: 16 }}>{msg}</div>}

      {publicados.length > 0 && <div style={{ fontSize: 12, color: '#4caf50', marginBottom: 8 }}>✅ {publicados.length} artigos publicados (no ar)</div>}
      {rascunhos.length > 0 && <div style={{ fontSize: 12, color: '#D4A843', marginBottom: 8 }}>📝 {rascunhos.length} rascunhos — confira se o texto está limpo antes de publicar:</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rascunhos.slice(0, 300).map(a => (
          <div key={a.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D4A843', marginBottom: 4 }}>{a.artigo}</div>
            <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{a.texto}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
