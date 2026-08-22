'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Artigo {
  lei_slug: string
  lei_nome: string
  artigo: string
  artigo_num: number
  texto: string
  ordem: number
}

interface LeiIndex {
  lei_slug: string
  lei_nome: string
  total_artigos: number
}

// ícone + nome curto por lei (o nome completo vem do banco)
const LEI_META: Record<string, { icone: string; curto: string }> = {
  eaoab: { icone: '⚖️', curto: 'Estatuto da OAB' },
  cdc: { icone: '🛒', curto: 'Código de Defesa do Consumidor' },
  eca: { icone: '🧒', curto: 'Estatuto da Criança e do Adolescente' },
}

// remove a repetição "Art. Nº" do começo do corpo + limpa resíduos de anotação
function limparCorpo(texto: string): string {
  let t = texto || ''
  t = t.replace(/^\s*Art\.?\s*\d+\s*[ºo°]?(?:-[A-Z])?\.?\s*/i, '')
  t = t.replace(/\s+\.\s*\./g, '.')
  t = t.replace(/[’'']\s*\(NR\)["”]?/g, '')
  t = t.replace(/\s{2,}/g, ' ').trim()
  return t
}

const SELECT_COLS = 'lei_slug,lei_nome,artigo,artigo_num,texto,ordem'

export default function LeiSecaPage() {
  const [indice, setIndice] = useState<LeiIndex[]>([])
  const [loadingIndice, setLoadingIndice] = useState(true)
  const [erro, setErro] = useState('')
  const [slugAberta, setSlugAberta] = useState<string | null>(null)
  const [nomeAberta, setNomeAberta] = useState<string>('')
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Artigo[]>([])
  const [buscando, setBuscando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  // 1) Índice leve das leis (view leis_secas_index) — nome + contagem
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('leis_secas_index')
          .select('lei_slug,lei_nome,total_artigos')
          .order('lei_nome', { ascending: true })
        if (error) throw error
        if (vivo) setIndice((data || []) as LeiIndex[])
      } catch {
        if (vivo) setErro('Não consegui carregar as leis agora. Tenta de novo em instantes.')
      } finally {
        if (vivo) setLoadingIndice(false)
      }
    })()
    return () => { vivo = false }
  }, [])

  // 2) Busca sob demanda (debounced). Traz só o necessário do servidor.
  //    - Numa lei, sem termo: primeiros 40 artigos.
  //    - Numa lei, com termo: até 200 artigos que casam (número ou palavra).
  //    - Na lista (sem lei aberta), com termo: até 60 artigos em TODAS as leis.
  //    - Na lista, sem termo: nada (mostra os cards das leis).
  useEffect(() => {
    let vivo = true
    const q = busca.trim()
    if (!slugAberta && !q) { setResultados([]); setBuscando(false); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        let query = supabase.from('leis_secas').select(SELECT_COLS).eq('status', 'publicado')
        if (slugAberta) query = query.eq('lei_slug', slugAberta)
        if (q) {
          if (/^\d+$/.test(q)) query = query.eq('artigo_num', parseInt(q, 10))
          else query = query.ilike('texto', `%${q}%`)
        }
        const limite = slugAberta ? (q ? 200 : 40) : 60
        query = query
          .order('lei_slug', { ascending: true })
          .order('ordem', { ascending: true })
          .limit(limite)
        const { data, error } = await query
        if (error) throw error
        if (vivo) setResultados((data || []) as Artigo[])
      } catch {
        if (vivo) setResultados([])
      } finally {
        if (vivo) setBuscando(false)
      }
    }, 320)
    return () => { vivo = false; clearTimeout(t) }
  }, [slugAberta, busca])

  const abrirLei = (l: LeiIndex) => {
    setBusca('')
    setResultados([])
    setNomeAberta(l.lei_nome)
    setSlugAberta(l.lei_slug)
  }
  const voltar = () => {
    setSlugAberta(null)
    setNomeAberta('')
    setBusca('')
    setResultados([])
  }

  const copiar = async (a: Artigo) => {
    const chave = a.lei_slug + ':' + a.artigo
    try {
      await navigator.clipboard.writeText(`${a.artigo}. ${limparCorpo(a.texto)}`)
      setCopiado(chave)
      setTimeout(() => setCopiado(c => (c === chave ? null : c)), 1500)
    } catch { /* ignora */ }
  }

  const card: React.CSSProperties = {
    background: 'var(--tj-card-bg,rgba(12,20,40,0.85))',
    border: '1px solid var(--tj-card-border,rgba(99,130,200,0.18))',
    borderRadius: 14,
    backdropFilter: 'blur(8px)',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
    border: '1px solid var(--tj-card-border,rgba(99,130,200,0.18))', background: 'rgba(255,255,255,0.04)',
    color: 'var(--white)', fontSize: 14, outline: 'none', marginBottom: 14,
  }

  const ArtigoCard = ({ a, comLei }: { a: Artigo; comLei?: boolean }) => {
    const chave = a.lei_slug + ':' + a.artigo
    const m = LEI_META[a.lei_slug]
    return (
      <div style={{ ...card, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{a.artigo}</span>
            {comLei && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 100 }}>{m?.curto || a.lei_nome}</span>}
          </div>
          <button
            onClick={() => copiar(a)}
            title="Copiar artigo"
            style={{ background: 'none', border: '1px solid var(--tj-card-border,rgba(99,130,200,0.18))', borderRadius: 8, color: copiado === chave ? 'var(--gold)' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {copiado === chave ? '✓ copiado' : '⧉ copiar'}
          </button>
        </div>
        <div style={{ fontSize: 14.5, color: 'var(--white)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {limparCorpo(a.texto)}
        </div>
      </div>
    )
  }

  if (loadingIndice) {
    return (
      <div style={{ padding: '32px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
        Carregando a Lei Seca…
      </div>
    )
  }
  if (erro) {
    return (<div style={{ ...card, padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>{erro}</div>)
  }

  // ---------- LISTA DE LEIS + BUSCA GLOBAL ----------
  if (!slugAberta) {
    const q = busca.trim()
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '4px' }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            📜 Lei Seca
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
            Digite um tema, palavra ou número de artigo para buscar em todas as leis — ou escolha uma lei abaixo para navegar.
          </p>
        </div>

        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="🔎 Buscar em todas as leis (tema, palavra ou nº do artigo)…"
          style={inputStyle}
        />

        {q ? (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              {buscando ? 'Buscando…' : `${resultados.length} resultado(s) para “${busca}”${resultados.length >= 60 ? '+ (refine a busca)' : ''}`}
            </div>
            {!buscando && resultados.length === 0 && (
              <div style={{ ...card, padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                Nenhum artigo encontrado para “{busca}”.
              </div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              {resultados.map(a => <ArtigoCard key={a.lei_slug + ':' + a.artigo} a={a} comLei />)}
            </div>
          </div>
        ) : (
          <>
            {indice.length === 0 && (
              <div style={{ ...card, padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>
                Nenhuma lei publicada ainda.
              </div>
            )}
            <div style={{ display: 'grid', gap: 12 }}>
              {indice.map(l => {
                const meta = LEI_META[l.lei_slug] || { icone: '📖', curto: l.lei_nome }
                return (
                  <button
                    key={l.lei_slug}
                    onClick={() => abrirLei(l)}
                    style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'transform 0.15s, border-color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--tj-card-border,rgba(99,130,200,0.18))' }}
                  >
                    <div style={{ fontSize: 34, lineHeight: 1 }}>{meta.icone}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--white)' }}>{meta.curto}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{l.lei_nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6, fontWeight: 700 }}>{l.total_artigos} artigos</div>
                    </div>
                    <div style={{ color: 'var(--gold)', fontSize: 20, fontWeight: 700 }}>→</div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // ---------- LEITURA/BUSCA DENTRO DE UMA LEI ----------
  const meta = LEI_META[slugAberta] || { icone: '📖', curto: nomeAberta }
  const totalLei = indice.find(l => l.lei_slug === slugAberta)?.total_artigos
  const q = busca.trim()
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '4px' }}>
      <button
        onClick={voltar}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '2px 0', marginBottom: 10 }}
      >
        ← Voltar às leis
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 30 }}>{meta.icone}</div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--white)', margin: 0, lineHeight: 1.2 }}>{meta.curto}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{nomeAberta}{totalLei ? ` · ${totalLei} artigos` : ''}</div>
        </div>
      </div>

      <input
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por número do artigo ou palavra nesta lei…"
        style={inputStyle}
      />

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
        {buscando ? 'Buscando…' : q ? `${resultados.length} resultado(s)${resultados.length >= 200 ? '+ (refine a busca)' : ''}` : `Mostrando os primeiros ${resultados.length} — digite para buscar em toda a lei.`}
      </div>

      {!buscando && resultados.length === 0 && q && (
        <div style={{ ...card, padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhum artigo encontrado para “{busca}”.
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {resultados.map(a => <ArtigoCard key={a.lei_slug + ':' + a.artigo} a={a} />)}
      </div>
    </div>
  )
}
