'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'

// ---- mapeamento de apelidos de lei -> slug na tabela leis_secas ----
const GRUPOS: { slug: string; nome: string; re: RegExp }[] = [
  { slug: 'eaoab', nome: 'Estatuto da OAB', re: /^(EAOAB|EOAB|Estatuto da OAB|Estatuto da Advocacia|Lei\s*n?[º°.\s]*8\.?906)/i },
  { slug: 'cdc', nome: 'Código de Defesa do Consumidor', re: /^(CDC|C[óo]digo de Defesa do Consumidor|Lei\s*n?[º°.\s]*8\.?078)/i },
  { slug: 'eca', nome: 'Estatuto da Criança e do Adolescente', re: /^(ECA|Estatuto da Crian[çc]a(?:\s+e do Adolescente)?|Lei\s*n?[º°.\s]*8\.?069)/i },
]
function slugDoApelido(apelido: string): { slug: string; nome: string } | null {
  const g = GRUPOS.find(x => x.re.test(apelido.trim()))
  return g ? { slug: g.slug, nome: g.nome } : null
}

type Node =
  | { t: 'txt'; v: string }
  | { t: 'cite'; v: string; slug: string; leiNome: string; artigo: string; num: number }

// rótulo do artigo no formato da tabela: "Art. 7º" (1–9) / "Art. 10" / "Art. 17-A"
function rotuloArtigo(num: number, bis: string): string {
  return `Art. ${num}${num <= 9 ? 'º' : ''}${bis ? bis.toUpperCase() : ''}`
}

// quebra o comentário em texto + citações clicáveis (só EAOAB/CDC/ECA viram link)
function parse(texto: string): Node[] {
  const nodes: Node[] = []
  const t = texto || ''
  const anchor = /\b(arts?\.?|artigos?)\s+(\d+)\s*[ºo°]?\s*(-[A-Za-z])?/gi
  const leiRe = /\bd[oa]\s+(EAOAB|EOAB|Estatuto da OAB|Estatuto da Advocacia|CDC|C[óo]digo de Defesa do Consumidor|ECA|Estatuto da Crian[çc]a(?:\s+e do Adolescente)?|Lei\s*n?[º°.\s]*8\.?906|Lei\s*n?[º°.\s]*8\.?078|Lei\s*n?[º°.\s]*8\.?069)/i
  let last = 0
  let m: RegExpExecArray | null
  while ((m = anchor.exec(t)) !== null) {
    const artStart = m.index
    const numEnd = m.index + m[0].length
    const num = parseInt(m[2], 10)
    const bis = (m[3] || '')
    // janela após o número (até 45 chars), cortada no próximo "art" ou em . ;
    let win = t.slice(numEnd, numEnd + 45)
    const prox = win.search(/\b(arts?\.?|artigos?)\b/i)
    if (prox >= 0) win = win.slice(0, prox)
    const fim = win.search(/[.;]/)
    if (fim >= 0) win = win.slice(0, fim)
    const lm = win.match(leiRe)
    if (lm && typeof lm.index === 'number') {
      const info = slugDoApelido(lm[1])
      if (info) {
        const citeEnd = numEnd + lm.index + lm[0].length
        if (artStart > last) nodes.push({ t: 'txt', v: t.slice(last, artStart) })
        nodes.push({
          t: 'cite',
          v: t.slice(artStart, citeEnd),
          slug: info.slug,
          leiNome: info.nome,
          artigo: rotuloArtigo(num, bis),
          num,
        })
        last = citeEnd
        anchor.lastIndex = citeEnd
        continue
      }
    }
    // não linkável (CF, CP, etc.) — segue como texto normal
  }
  if (last < t.length) nodes.push({ t: 'txt', v: t.slice(last) })
  return nodes
}

// limpa o corpo do artigo no popup (mesma regra da Lei Seca)
function limparCorpo(texto: string): string {
  let t = texto || ''
  t = t.replace(/^\s*Art\.?\s*\d+\s*[ºo°]?(?:-[A-Z])?\.?\s*/i, '')
  t = t.replace(/\s+\.\s*\./g, '.')
  t = t.replace(/[’'']\s*\(NR\)["”]?/g, '')
  t = t.replace(/\s{2,}/g, ' ').trim()
  return t
}

interface Alvo { slug: string; leiNome: string; artigo: string; num: number }

export default function ComentarioComLei({ texto }: { texto: string }) {
  const [alvo, setAlvo] = useState<Alvo | null>(null)
  const [corpo, setCorpo] = useState<string>('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!alvo) return
    let vivo = true
    setCarregando(true); setErro(''); setCorpo('')
    ;(async () => {
      try {
        // tenta pelo rótulo exato; se não achar, pelo número
        let { data } = await supabase
          .from('leis_secas').select('texto,artigo')
          .eq('lei_slug', alvo.slug).eq('status', 'publicado').eq('artigo', alvo.artigo).limit(1)
        if ((!data || !data.length)) {
          const r2 = await supabase
            .from('leis_secas').select('texto,artigo')
            .eq('lei_slug', alvo.slug).eq('status', 'publicado').eq('artigo_num', alvo.num).order('ordem').limit(1)
          data = r2.data
        }
        if (!vivo) return
        if (data && data.length) setCorpo(limparCorpo(data[0].texto))
        else setErro('Não encontrei esse artigo na base ainda.')
      } catch {
        if (vivo) setErro('Não consegui abrir o artigo agora.')
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => { vivo = false }
  }, [alvo])

  const nodes = parse(texto)

  return (
    <>
      <span>
        {nodes.map((n, i) =>
          n.t === 'txt' ? (
            <span key={i}>{n.v}</span>
          ) : (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setAlvo({ slug: n.slug, leiNome: n.leiNome, artigo: n.artigo, num: n.num }) }}
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
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{alvo.leiNome}</div>
              </div>
              <button
                onClick={() => setAlvo(null)}
                aria-label="Fechar"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, lineHeight: 1, cursor: 'pointer', padding: 0 }}
              >×</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 14.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {carregando && <span style={{ color: 'var(--text-muted)' }}>Carregando o artigo…</span>}
              {erro && <span style={{ color: 'var(--text-muted)' }}>{erro}</span>}
              {!carregando && !erro && corpo}
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button
                onClick={() => setAlvo(null)}
                style={{ background: 'var(--gold)', color: '#1a1200', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
              >Fechar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
