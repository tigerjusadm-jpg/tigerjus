'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DISCIPLINES = [
  { slug: 'constitucional',   name: 'Constitucional',   icon: '⚖️' },
  { slug: 'administrativo',   name: 'Administrativo',    icon: '🏛️' },
  { slug: 'penal',            name: 'Penal',             icon: '🔒' },
  { slug: 'processo-penal',   name: 'Processo Penal',    icon: '🔍' },
  { slug: 'civil',            name: 'Civil',             icon: '📋' },
  { slug: 'processo-civil',   name: 'Processo Civil',    icon: '⚡' },
  { slug: 'trabalho',         name: 'Trabalho',          icon: '🦺' },
  { slug: 'proc-trabalho',    name: 'Proc. Trabalho',    icon: '👷' },
  { slug: 'tributario',       name: 'Tributário',        icon: '💰' },
  { slug: 'empresarial',      name: 'Empresarial',       icon: '🏢' },
  { slug: 'etica',            name: 'Ética OAB',         icon: '📜' },
  { slug: 'consumidor',       name: 'Consumidor',        icon: '🛒' },
  { slug: 'direitos-humanos', name: 'Direitos Humanos',  icon: '🌍' },
  { slug: 'ambiental',        name: 'Ambiental',         icon: '🌿' },
  { slug: 'filosofia',        name: 'Filosofia',         icon: '📖' },
  { slug: 'internacional',    name: 'Internacional',     icon: '🌐' },
  { slug: 'eca',              name: 'ECA',               icon: '👶' },
]

interface Mapa {
  id: string
  disciplina_slug: string
  titulo: string
  imagem_url: string
  descricao: string | null
  ordem: number
  ativo: boolean
  created_at: string
}

const nomeDisc = (slug: string) => DISCIPLINES.find(d => d.slug === slug)?.name || slug
const iconDisc = (slug: string) => DISCIPLINES.find(d => d.slug === slug)?.icon || '🗺️'

export default function ModuloMapasMentais({ adminId }: { adminId?: string }) {
  const [mapas, setMapas] = useState<Mapa[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const [disciplina, setDisciplina] = useState(DISCIPLINES[0].slug)
  const [titulo, setTitulo] = useState('')
  const [imagemUrl, setImagemUrl] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ordem, setOrdem] = useState(0)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('mapas_mentais')
      .select('*')
      .order('disciplina_slug', { ascending: true })
      .order('ordem', { ascending: true })
    setMapas((data as Mapa[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const adicionar = async () => {
    if (!titulo.trim() || !imagemUrl.trim()) { setMsg('⚠️ Preencha título e URL da imagem.'); return }
    setSalvando(true); setMsg('')
    const { error } = await supabase.from('mapas_mentais').insert({
      disciplina_slug: disciplina,
      titulo: titulo.trim(),
      imagem_url: imagemUrl.trim(),
      descricao: descricao.trim() || null,
      ordem: Number(ordem) || 0,
    })
    setSalvando(false)
    if (error) { setMsg('❌ Erro: ' + error.message); return }
    setTitulo(''); setImagemUrl(''); setDescricao(''); setOrdem(0)
    setMsg('✓ Mapa mental adicionado!')
    load()
  }

  const toggle = async (m: Mapa) => {
    await supabase.from('mapas_mentais').update({ ativo: !m.ativo }).eq('id', m.id)
    load()
  }
  const remover = async (m: Mapa) => {
    if (!confirm(`Remover o mapa "${m.titulo}"?`)) return
    await supabase.from('mapas_mentais').delete().eq('id', m.id)
    load()
  }

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }
  const input: React.CSSProperties = { width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none' }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0 }}>🗺️ Mapas Mentais</h1>
        <p style={{ color: '#888', fontSize: 14, margin: '6px 0 0' }}>
          Cadastre os mapas por disciplina. Suba a imagem na <strong style={{ color: '#D4A843' }}>Media Library</strong>, copie a URL e cole aqui.
        </p>
      </div>

      {/* Formulário */}
      <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, margin: '20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={label}>Disciplina</label>
            <select value={disciplina} onChange={e => setDisciplina(e.target.value)} style={input as React.CSSProperties}>
              {DISCIPLINES.map(d => <option key={d.slug} value={d.slug}>{d.icon} {d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Ordem (0 = primeiro)</label>
            <input type="number" value={ordem} onChange={e => setOrdem(Number(e.target.value))} style={input} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Título</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Princípios Constitucionais" style={input} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>URL da imagem</label>
          <input value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} placeholder="https://...  (copie da Media Library)" style={input} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Descrição (opcional)</label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Breve descrição do mapa" style={input} />
        </div>
        {imagemUrl.trim() && (
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Pré-visualização</label>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagemUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={adicionar} disabled={salvando}
            style={{ background: 'linear-gradient(135deg,#D4A843,#E8621A)', color: '#000', border: 'none', borderRadius: 8, padding: '11px 22px', fontWeight: 800, fontSize: 14, cursor: salvando ? 'default' : 'pointer', opacity: salvando ? 0.6 : 1 }}>
            {salvando ? 'Salvando…' : '+ Adicionar mapa'}
          </button>
          {msg && <span style={{ fontSize: 13, color: msg.startsWith('✓') ? '#6bbf59' : '#e8a33a' }}>{msg}</span>}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: '#888' }}>Carregando…</p>
      ) : mapas.length === 0 ? (
        <p style={{ color: '#888' }}>Nenhum mapa mental cadastrado ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mapas.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 12, opacity: m.ativo ? 1 : 0.5 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.imagem_url} alt={m.titulo} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: '#0d0d0d' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{iconDisc(m.disciplina_slug)} {nomeDisc(m.disciplina_slug)} · ordem {m.ordem}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{m.titulo}</div>
                {m.descricao && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{m.descricao}</div>}
              </div>
              <button onClick={() => toggle(m)} style={{ background: m.ativo ? 'rgba(107,191,89,0.15)' : 'rgba(255,255,255,0.06)', color: m.ativo ? '#6bbf59' : '#888', border: 'none', borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                {m.ativo ? 'Ativo' : 'Oculto'}
              </button>
              <button onClick={() => remover(m)} style={{ background: 'rgba(220,80,80,0.12)', color: '#dc5050', border: 'none', borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
