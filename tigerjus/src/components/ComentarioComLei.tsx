'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'

// ---- leis reconhecidas (slug + nome + padrões de citação) ----
const LEIS: { slug: string; nome: string; pat: string }[] = [
  { slug: 'cf',    nome: 'Constituição Federal',                 pat: 'CF\\/?(?:88|1988)?|CRFB\\/?(?:88|1988)?|Constitui[çc][ãa]o Federal|Constitui[çc][ãa]o da Rep[úu]blica|Constitui[çc][ãa]o' },
  { slug: 'cc',    nome: 'Código Civil',                         pat: 'C[óo]digo Civil|CC\\b|Lei\\s*n?[º°.\\s]*10\\.?406' },
  { slug: 'cp',    nome: 'Código Penal',                         pat: 'C[óo]digo Penal|CP\\b' },
  { slug: 'cpc',   nome: 'Código de Processo Civil',             pat: 'C[óo]digo de Processo Civil|CPC\\b|Lei\\s*n?[º°.\\s]*13\\.?105' },
  { slug: 'cpp',   nome: 'Código de Processo Penal',             pat: 'C[óo]digo de Processo Penal|CPP\\b' },
  { slug: 'clt',   nome: 'CLT',                                  pat: 'CLT\\b|Consolida[çc][ãa]o das Leis do Trabalho' },
  { slug: 'eaoab', nome: 'Estatuto da OAB',                      pat: 'EAOAB|EOAB|Estatuto da OAB|Estatuto da Advocacia|Lei\\s*n?[º°.\\s]*8\\.?906' },
  { slug: 'cdc',   nome: 'Código de Defesa do Consumidor',       pat: 'CDC\\b|C[óo]digo de Defesa do Consumidor|Lei\\s*n?[º°.\\s]*8\\.?078' },
  { slug: 'eca',   nome: 'Estatuto da Criança e do Adolescente', pat: 'ECA\\b|Estatuto da Crian[çc]a(?:\\s+e do Adolescente)?|Lei\\s*n?[º°.\\s]*8\\.?069' },
  { slug: 'ctn',   nome: 'Código Tributário Nacional',           pat: 'CTN\\b|C[óo]digo Tribut[áa]rio Nacional|Lei\\s*n?[º°.\\s]*5\\.?172' },
  { slug: 'ced',   nome: 'Código de Ética da OAB',               pat: 'CED\\/?OAB|CED\\b|C[óo]digo de [ÉEée]tica(?:\\s+e Disciplina)?(?:\\s+d[ao]\\s+OAB)?' },
]

function acharLei(win: string): { slug: string; nome: string; idx: number; len: number } | null {
  let best: { slug: string; nome: string; idx: number; len: number } | null = null
  for (const L of LEIS) {
    const m = win.match(new RegExp('\\b(?:' + L.pat + ')', 'i'))
    if (m && typeof m.index === 'number' && (!best || m.index < best.idx)) {
      best = { slug: L.slug, nome: L.nome, idx: m.index, len: m[0].length }
    }
  }
  return best
}

function comMilhar(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function rotuloArtigo(num: number, bis: string): string {
  return `Art. ${comMilhar(num)}${num <= 9 ? 'º' : ''}${bis ? bis.toUpperCase() : ''}`
}

// referências de §§ e incisos citadas no trecho entre o número e a lei
function refsDoMeio(meio: string): { paras: number[]; incisos: string[] } {
  const paras: number[] = []
  const incisos: string[] = []
  const s = meio.search(/§/)
  if (s >= 0) {
    for (const m of meio.slice(s).matchAll(/(\d+)/g)) paras.push(parseInt(m[1], 10))
  } else {
    for (const m of meio.matchAll(/\b([IVXLCDM]{1,7})\b/g)) incisos.push(m[1].toUpperCase())
  }
  return { paras: [...new Set(paras)], incisos: [...new Set(incisos)] }
}

// extrai só os §§/incisos pedidos do corpo do artigo (retorna '' se não achar)
function extrairTrecho(texto: string, paras: number[], incisos: string[]): string {
  if (paras.length) {
    const segs = texto.split(/(?=§\s*\d)/)
    const out = segs.filter(x => { const m = x.match(/^§\s*(\d+)/); return m && paras.includes(parseInt(m[1], 10)) }).map(x => x.trim())
    if (out.length) return out.join('\n\n')
  }
  if (incisos.length) {
    const segs = texto.split(/(?=(?:^|[\s;])[IVXLCDM]{1,7}\s*[-–]\s)/)
    const out = segs.filter(x => { const m = x.trim().match(/^([IVXLCDM]{1,7})\s*[-–]/); return m && incisos.includes(m[1].toUpperCase()) }).map(x => x.trim())
    if (out.length) return out.join('\n\n')
  }
  return ''
}

// ---- cache (1x/sessão) das leis publicadas na base ----
let _slugs: Set<string> | null = null
let _promise: Promise<Set<string>> | null = null
function getSlugs(): Promise<Set<string>> {
  if (_slugs) return Promise.resolve(_slugs)
  if (!_promise) {
    _promise = (async () => {
      try {
        const { data } = await supabase
          .from('leis_secas').select('lei_slug').eq('status', 'publicado').limit(10000)
        _slugs = new Set((data || []).map((r: any) => r.lei_slug))
      } catch {
        _slugs = new Set<string>()
      }
      return _slugs!
    })()
  }
  return _promise
}

type Node =
  | { t: 'txt'; v: string }
  | { t: 'cite'; v: string; slug: string; leiNome: string; artigo: string; num: number; paras: number[]; incisos: string[] }

function parse(texto: string, slugs: Set<string>, leiPadrao?: string): Node[] {
  const nodes: Node[] = []
  const t = texto || ''
  const anchor = /\b(arts?\.?|artigos?)\s+(\d+(?:\.\d{3})*)\s*[ºo°]?\s*(-[A-Za-z])?/gi
  let last = 0
  let m: RegExpExecArray | null
  while ((m = anchor.exec(t)) !== null) {
    const artStart = m.index
    const numEnd = m.index + m[0].length
    const num = parseInt(m[2].replace(/\./g, ''), 10)
    const bis = m[3] || ''
    // Janela ampliada: a lei costuma vir depois dos §§/incisos ("art. 26, §2º, I, do CDC").
    let win = t.slice(numEnd, numEnd + 180)
    const prox = win.search(/\b(arts?\.?|artigos?)\b/i)
    if (prox >= 0) win = win.slice(0, prox)
    // Corta no fim da frase (; ou ". ") sem quebrar no ponto interno do número da lei (ex.: 8.069, 8.906).
    const corte = win.search(/;|\.(?=\s)/)
    if (corte >= 0) win = win.slice(0, corte)
    const lei = acharLei(win)
    if (lei && slugs.has(lei.slug)) {
      const leiStart = numEnd + lei.idx
      const citeEnd = leiStart + lei.len
      const { paras, incisos } = refsDoMeio(t.slice(numEnd, leiStart))
      if (artStart > last) nodes.push({ t: 'txt', v: t.slice(last, artStart) })
      nodes.push({ t: 'cite', v: t.slice(artStart, citeEnd), slug: lei.slug, leiNome: lei.nome, artigo: rotuloArtigo(num, bis), num, paras, incisos })
      last = citeEnd
      anchor.lastIndex = citeEnd
    } else if (leiPadrao && slugs.has(leiPadrao)) {
      // Nenhuma lei nomeada por perto: usa a lei padrão da disciplina (ex.: resumo de Constitucional → CF).
      const Lp = LEIS.find(L => L.slug === leiPadrao)
      const { paras, incisos } = refsDoMeio(win)
      if (artStart > last) nodes.push({ t: 'txt', v: t.slice(last, artStart) })
      nodes.push({ t: 'cite', v: t.slice(artStart, numEnd), slug: leiPadrao, leiNome: Lp ? Lp.nome : '', artigo: rotuloArtigo(num, bis), num, paras, incisos })
      last = numEnd
      anchor.lastIndex = numEnd
    }
  }
  if (last < t.length) nodes.push({ t: 'txt', v: t.slice(last) })
  return nodes
}

function limparCorpo(texto: string): string {
  let t = texto || ''
  t = t.replace(/^\s*Art\.?\s*[\d.]+\s*[ºo°]?(?:-[A-Z])?\.?\s*/i, '')
  t = t.replace(/\s+\.\s*\./g, '.')
  t = t.replace(/[’'']\s*\(NR\)["”]?/g, '')
  t = t.replace(/\s{2,}/g, ' ').trim()
  return t
}

interface Alvo { slug: string; leiNome: string; artigo: string; num: number; paras: number[]; incisos: string[]; ref: string }

export default function ComentarioComLei({ texto, leiPadrao }: { texto: string; leiPadrao?: string }) {
  const [slugs, setSlugs] = useState<Set<string> | null>(_slugs)
  const [alvo, setAlvo] = useState<Alvo | null>(null)
  const [corpoFull, setCorpoFull] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [verComplet, setVerComplet] = useState(false)

  useEffect(() => { if (!slugs) getSlugs().then(s => setSlugs(new Set(s))) }, [slugs])

  useEffect(() => {
    if (!alvo) return
    let vivo = true
    setCarregando(true); setErro(''); setCorpoFull(''); setVerComplet(false)
    ;(async () => {
      try {
        let { data } = await supabase
          .from('leis_secas').select('texto')
          .eq('lei_slug', alvo.slug).eq('status', 'publicado').eq('artigo', alvo.artigo).limit(1)
        if (!data || !data.length) {
          const r2 = await supabase
            .from('leis_secas').select('texto')
            .eq('lei_slug', alvo.slug).eq('status', 'publicado').eq('artigo_num', alvo.num).order('ordem').limit(1)
          data = r2.data
        }
        if (!vivo) return
        if (data && data.length) setCorpoFull(limparCorpo(data[0].texto))
        else setErro('Não encontrei esse artigo na base.')
      } catch {
        if (vivo) setErro('Não consegui abrir o artigo agora.')
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => { vivo = false }
  }, [alvo])

  const nodes = parse(texto, slugs || new Set(), leiPadrao)
  const trecho = alvo ? extrairTrecho(corpoFull, alvo.paras, alvo.incisos) : ''
  const temTrecho = !!trecho
  const mostrar = (temTrecho && !verComplet) ? trecho : corpoFull

  return (
    <>
      <span>
        {nodes.map((n, i) =>
          n.t === 'txt' ? (
            <span key={i}>{n.v}</span>
          ) : (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setAlvo({ slug: n.slug, leiNome: n.leiNome, artigo: n.artigo, num: n.num, paras: n.paras, incisos: n.incisos, ref: n.v }) }}
              title={`Ver ${n.artigo} — ${n.leiNome}`}
              style={{ background: 'none', border: 'none', padding: 0, margin: 0, font: 'inherit', color: 'var(--gold)', textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}
            >
              {n.v}
            </button>
          )
        )}
      </span>

      {alvo && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setAlvo(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--tj-card-bg,#0c1428)', border: '1px solid var(--tj-card-border,rgba(99,130,200,0.25))', borderRadius: 16, maxWidth: 620, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '20px 22px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: 'var(--gold)' }}>{alvo.artigo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{alvo.leiNome}{temTrecho && !verComplet ? ' · trecho citado' : ''}</div>
              </div>
              <button onClick={() => setAlvo(null)} aria-label="Fechar" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</button>
            </div>

            {temTrecho && (
              <button
                onClick={() => setVerComplet(v => !v)}
                style={{ marginTop: 8, marginBottom: 4, background: 'none', border: '1px solid var(--tj-card-border,rgba(99,130,200,0.25))', borderRadius: 8, color: 'var(--gold)', fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer' }}
              >
                {verComplet ? '↑ Ver só o trecho citado' : '↓ Ver artigo completo'}
              </button>
            )}

            <div style={{ marginTop: 12, fontSize: 14.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {carregando && <span style={{ color: 'var(--text-muted)' }}>Carregando o artigo…</span>}
              {erro && <span style={{ color: 'var(--text-muted)' }}>{erro}</span>}
              {!carregando && !erro && mostrar}
            </div>

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setAlvo(null)} style={{ background: 'var(--gold)', color: '#1a1200', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Fechar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
