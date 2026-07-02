'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Artigo {
  lei_slug: string
  lei_nome: string
  artigo: string
  artigo_num: number
  texto: string
  ordem: number
}

interface LeiAgrupada {
  slug: string
  nome: string
  artigos: Artigo[]
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
  // tira o rótulo do artigo no início ("Art. 237 ", "Art. 8º ", "Art. 17-A. ")
  t = t.replace(/^\s*Art\.?\s*\d+\s*[ºo°]?(?:-[A-Z])?\.?\s*/i, '')
  // resíduos: ponto órfão duplicado, "'(NR)"" no fim, espaços
  t = t.replace(/\s+\.\s*\./g, '.')
  t = t.replace(/[’'']\s*\(NR\)["”]?/g, '')
  t = t.replace(/\s{2,}/g, ' ').trim()
  return t
}

// normaliza para busca sem acento e sem caixa
function norm(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function LeiSecaPage() {
  const [leis, setLeis] = useState<LeiAgrupada[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [slugAberta, setSlugAberta] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('leis_secas')
          .select('lei_slug,lei_nome,artigo,artigo_num,texto,ordem')
          .eq('status', 'publicado')
          .order('lei_slug', { ascending: true })
          .order('ordem', { ascending: true })
        if (error) throw error
        if (!vivo) return
        const mapa = new Map<string, LeiAgrupada>()
        for (const a of (data || []) as Artigo[]) {
          if (!mapa.has(a.lei_slug)) mapa.set(a.lei_slug, { slug: a.lei_slug, nome: a.lei_nome, artigos: [] })
          mapa.get(a.lei_slug)!.artigos.push(a)
        }
        setLeis(Array.from(mapa.values()))
      } catch (e: any) {
        if (vivo) setErro('Não consegui carregar as leis agora. Tenta de novo em instantes.')
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [])

  const leiAtual = useMemo(
    () => leis.find(l => l.slug === slugAberta) || null,
    [leis, slugAberta]
  )

  const artigosFiltrados = useMemo(() => {
    if (!leiAtual) return []
    const q = busca.trim()
    if (!q) return leiAtual.artigos
    // busca só por número: "237", "8", "17"
    if (/^\d+$/.test(q)) {
      const n = parseInt(q, 10)
      return leiAtual.artigos.filter(a => a.artigo_num === n)
    }
    const nq = norm(q)
    return leiAtual.artigos.filter(a => norm(a.artigo).includes(nq) || norm(a.texto).includes(nq))
  }, [leiAtual, busca])

  const copiar = async (a: Artigo) => {
    try {
      await navigator.clipboard.writeText(`${a.artigo}. ${limparCorpo(a.texto)}`)
      setCopiado(a.artigo)
      setTimeout(() => setCopiado(c => (c === a.artigo ? null : c)), 1500)
    } catch { /* ignora */ }
  }

  // ---------- estilos base (tema TigerJus) ----------
  const card: React.CSSProperties = {
    background: 'var(--tj-card-bg,rgba(12,20,40,0.85))',
    border: '1px solid var(--tj-card-border,rgba(99,130,200,0.18))',
    borderRadius: 14,
    backdropFilter: 'blur(8px)',
  }

  if (loading) {
    return (
      <div style={{ padding: '32px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
        Carregando a Lei Seca…
      </div>
    )
  }

  if (erro) {
    return (
      <div style={{ ...card, padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
        {erro}
      </div>
    )
  }

  // ---------- LISTA DE LEIS (nenhuma aberta) ----------
  if (!leiAtual) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '4px' }}>
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            📜 Lei Seca
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
            A letra da lei na íntegra, direto da fonte oficial. Toque numa lei para ler e buscar por artigo.
          </p>
        </div>

        {leis.length === 0 && (
          <div style={{ ...card, padding: 20, marginTop: 16, color: 'var(--text-muted)', textAlign: 'center' }}>
            Nenhuma lei publicada ainda.
          </div>
        )}

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {leis.map(l => {
            const meta = LEI_META[l.slug] || { icone: '📖', curto: l.nome }
            return (
              <button
                key={l.slug}
                onClick={() => { setBusca(''); setSlugAberta(l.slug) }}
                style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'transform 0.15s, border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--tj-card-border,rgba(99,130,200,0.18))' }}
              >
                <div style={{ fontSize: 34, lineHeight: 1 }}>{meta.icone}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{meta.curto}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{l.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6, fontWeight: 700 }}>{l.artigos.length} artigos</div>
                </div>
                <div style={{ color: 'var(--gold)', fontSize: 20, fontWeight: 700 }}>→</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ---------- LEITURA DE UMA LEI ----------
  const meta = LEI_META[leiAtual.slug] || { icone: '📖', curto: leiAtual.nome }
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '4px' }}>
      <button
        onClick={() => { setSlugAberta(null); setBusca('') }}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '2px 0', marginBottom: 10 }}
      >
        ← Voltar às leis
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 30 }}>{meta.icone}</div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2 }}>{meta.curto}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{leiAtual.nome} · {leiAtual.artigos.length} artigos</div>
        </div>
      </div>

      <input
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por número do artigo ou palavra…"
        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--tj-card-border,rgba(99,130,200,0.18))', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 14 }}
      />

      {artigosFiltrados.length === 0 && (
        <div style={{ ...card, padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhum artigo encontrado para “{busca}”.
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {artigosFiltrados.map(a => (
          <div key={a.artigo} style={{ ...card, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{a.artigo}</div>
              <button
                onClick={() => copiar(a)}
                title="Copiar artigo"
                style={{ background: 'none', border: '1px solid var(--tj-card-border,rgba(99,130,200,0.18))', borderRadius: 8, color: copiado === a.artigo ? 'var(--gold)' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {copiado === a.artigo ? '✓ copiado' : '⧉ copiar'}
              </button>
            </div>
            <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {limparCorpo(a.texto)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
