'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'

// ---- leis reconhecidas (slug + nome + padrões de citação) ----
const LEIS: { slug: string; nome: string; pat: string; url?: string }[] = [
  { slug: 'cf',    nome: 'Constituição Federal',                 pat: '(?:CF|CRFB)(?:\\/?(?:88|1988))?(?![A-Za-zÀ-ú])|Constitui[çc][ãa]o Federal|Constitui[çc][ãa]o da Rep[úu]blica|Constitui[çc][ãa]o' },
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
  // ---- fora do acervo: abrem no Planalto (se um dia forem importadas com este slug, viram popup interno) ----
  { slug: 'l8213',  nome: 'Lei nº 8.213/91 — Benefícios da Previdência',  pat: 'Lei\\s*n?[º°.\\s]*8\\.?213',  url: 'https://www.planalto.gov.br/ccivil_03/leis/l8213compilado.htm' },
  { slug: 'l8212',  nome: 'Lei nº 8.212/91 — Custeio da Seguridade',      pat: 'Lei\\s*n?[º°.\\s]*8\\.?212',  url: 'https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm' },
  { slug: 'd3048',  nome: 'Decreto nº 3.048/99 — Regulamento da Previdência', pat: 'Decreto\\s*n?[º°.\\s]*3\\.?048|Regulamento da Previd[êe]ncia Social', url: 'https://www.planalto.gov.br/ccivil_03/decreto/d3048compilado.htm' },
  { slug: 'ec103',  nome: 'EC nº 103/2019 — Reforma da Previdência',      pat: '(?:EC|Emenda\\s+Constitucional)\\s*n?[º°.\\s]*103', url: 'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc103.htm' },
  { slug: 'l4737',  nome: 'Código Eleitoral (Lei nº 4.737/65)',           pat: 'C[óo]digo Eleitoral|Lei\\s*n?[º°.\\s]*4\\.?737', url: 'https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm' },
  { slug: 'l9504',  nome: 'Lei nº 9.504/97 — Lei das Eleições',           pat: 'Lei\\s*n?[º°.\\s]*9\\.?504|Lei das Elei[çc][õo]es', url: 'https://www.planalto.gov.br/ccivil_03/leis/l9504.htm' },
  { slug: 'lc64',   nome: 'LC nº 64/90 — Lei das Inelegibilidades',       pat: '(?:LC|Lei\\s*Complementar)\\s*n?[º°.\\s]*64|Lei das Inelegibilidades', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp64.htm' },
  { slug: 'l4320',  nome: 'Lei nº 4.320/64 — Normas de Direito Financeiro', pat: 'Lei\\s*n?[º°.\\s]*4\\.?320', url: 'https://www.planalto.gov.br/ccivil_03/leis/l4320compilado.htm' },
  { slug: 'l14133', nome: 'Lei nº 14.133/21 — Licitações e Contratos',    pat: 'Lei\\s*n?[º°.\\s]*14\\.?133', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm' },
  { slug: 'l11101', nome: 'Lei nº 11.101/05 — Recuperação e Falência',    pat: 'Lei\\s*n?[º°.\\s]*11\\.?101', url: 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm' },
  { slug: 'l8429',  nome: 'Lei nº 8.429/92 — Improbidade Administrativa', pat: 'Lei\\s*n?[º°.\\s]*8\\.?429',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L8429.htm' },
  { slug: 'l9784',  nome: 'Lei nº 9.784/99 — Processo Administrativo',    pat: 'Lei\\s*n?[º°.\\s]*9\\.?784',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L9784.htm' },
  { slug: 'l8112',  nome: 'Lei nº 8.112/90 — Servidores Públicos',        pat: 'Lei\\s*n?[º°.\\s]*8\\.?112',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L8112cons.htm' },
  { slug: 'l9279',  nome: 'Lei nº 9.279/96 — Propriedade Industrial',     pat: 'Lei\\s*n?[º°.\\s]*9\\.?279',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L9279.htm' },
  { slug: 'l6830',  nome: 'Lei nº 6.830/80 — Execução Fiscal',            pat: 'Lei\\s*n?[º°.\\s]*6\\.?830',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L6830.htm' },
  { slug: 'l9605',  nome: 'Lei nº 9.605/98 — Crimes Ambientais',          pat: 'Lei\\s*n?[º°.\\s]*9\\.?605',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L9605.htm' },
  { slug: 'l6938',  nome: 'Lei nº 6.938/81 — Política Nac. Meio Ambiente',pat: 'Lei\\s*n?[º°.\\s]*6\\.?938',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L6938.htm' },
  { slug: 'l9985',  nome: 'Lei nº 9.985/00 — SNUC',                       pat: 'Lei\\s*n?[º°.\\s]*9\\.?985',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L9985.htm' },
  { slug: 'l9433',  nome: 'Lei nº 9.433/97 — Recursos Hídricos',          pat: 'Lei\\s*n?[º°.\\s]*9\\.?433',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L9433.htm' },
  { slug: 'l12305', nome: 'Lei nº 12.305/10 — Resíduos Sólidos',          pat: 'Lei\\s*n?[º°.\\s]*12\\.?305', url: 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm' },
  { slug: 'l12651', nome: 'Lei nº 12.651/12 — Código Florestal',          pat: 'Lei\\s*n?[º°.\\s]*12\\.?651', url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm' },
  { slug: 'l10257', nome: 'Lei nº 10.257/01 — Estatuto da Cidade',        pat: 'Lei\\s*n?[º°.\\s]*10\\.?257', url: 'https://www.planalto.gov.br/ccivil_03/leis/LEIS_2001/L10257.htm' },
  { slug: 'lc140',  nome: 'LC nº 140/2011 — Competências Ambientais',     pat: 'LC\\s*n?[º°.\\s]*140|Lei\\s*Complementar\\s*n?[º°.\\s]*140', url: 'https://www.planalto.gov.br/ccivil_03/leis/LCP/Lcp140.htm' },
  { slug: 'lc101',  nome: 'LC nº 101/2000 — Lei de Responsabilidade Fiscal', pat: 'LC\\s*n?[º°.\\s]*101|Lei\\s*Complementar\\s*n?[º°.\\s]*101|Lei de Responsabilidade Fiscal|LRF\\b', url: 'https://www.planalto.gov.br/ccivil_03/leis/LCP/Lcp101.htm' },
  { slug: 'lc123',  nome: 'LC nº 123/2006 — Simples Nacional',            pat: 'LC\\s*n?[º°.\\s]*123|Lei\\s*Complementar\\s*n?[º°.\\s]*123', url: 'https://www.planalto.gov.br/ccivil_03/leis/LCP/Lcp123.htm' },
  { slug: 'l13146', nome: 'Lei nº 13.146/15 — Estatuto da Pessoa com Deficiência', pat: 'Lei\\s*n?[º°.\\s]*13\\.?146|Estatuto da Pessoa com Defici[êe]ncia', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm' },
  { slug: 'l13445', nome: 'Lei nº 13.445/17 — Lei de Migração',           pat: 'Lei\\s*n?[º°.\\s]*13\\.?445|Lei de Migra[çc][ãa]o', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/L13445.htm' },
  { slug: 'l9474',  nome: 'Lei nº 9.474/97 — Refugiados',                 pat: 'Lei\\s*n?[º°.\\s]*9\\.?474',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L9474.htm' },
  { slug: 'l13709', nome: 'Lei nº 13.709/18 — LGPD',                      pat: 'Lei\\s*n?[º°.\\s]*13\\.?709|LGPD\\b', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm' },
  { slug: 'l8036',  nome: 'Lei nº 8.036/90 — FGTS',                       pat: 'Lei\\s*n?[º°.\\s]*8\\.?036',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L8036consol.htm' },
  { slug: 'l6019',  nome: 'Lei nº 6.019/74 — Trabalho Temporário',        pat: 'Lei\\s*n?[º°.\\s]*6\\.?019',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L6019.htm' },
  { slug: 'l6404',  nome: 'Lei nº 6.404/76 — Sociedades por Ações',       pat: 'Lei\\s*n?[º°.\\s]*6\\.?404',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L6404consol.htm' },
  { slug: 'l5474',  nome: 'Lei nº 5.474/68 — Duplicatas',                 pat: 'Lei\\s*n?[º°.\\s]*5\\.?474',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L5474.htm' },
  { slug: 'l8934',  nome: 'Lei nº 8.934/94 — Registro de Empresas',       pat: 'Lei\\s*n?[º°.\\s]*8\\.?934',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L8934.htm' },
  { slug: 'l8245',  nome: 'Lei nº 8.245/91 — Locações',                   pat: 'Lei\\s*n?[º°.\\s]*8\\.?245',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L8245.htm' },
  { slug: 'l9099',  nome: 'Lei nº 9.099/95 — Juizados Especiais',         pat: 'Lei\\s*n?[º°.\\s]*9\\.?099',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L9099.htm' },
  { slug: 'l9503',  nome: 'CTB — Código de Trânsito Brasileiro (Lei nº 9.503/97)', pat: 'C[óo]digo de Tr[âa]nsito(?:\\s+Brasileiro)?|CTB\\b|Lei\\s*n?[º°.\\s]*9\\.?503', url: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm' },
  { slug: 'l8987',  nome: 'Lei nº 8.987/95 — Concessões',                 pat: 'Lei\\s*n?[º°.\\s]*8\\.?987',  url: 'https://www.planalto.gov.br/ccivil_03/leis/L8987cons.htm' },
  { slug: 'l11079', nome: 'Lei nº 11.079/04 — PPP',                       pat: 'Lei\\s*n?[º°.\\s]*11\\.?079', url: 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l11079.htm' },
  { slug: 'l12846', nome: 'Lei nº 12.846/13 — Anticorrupção',             pat: 'Lei\\s*n?[º°.\\s]*12\\.?846', url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm' },
  { slug: 'l12527', nome: 'Lei nº 12.527/11 — Acesso à Informação',       pat: 'Lei\\s*n?[º°.\\s]*12\\.?527', url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm' },
  { slug: 'lindb',  nome: 'LINDB — Decreto-Lei nº 4.657/42',              pat: 'LINDB\\b|Decreto-Lei\\s*n?[º°.\\s]*4\\.?657|Lei\\s*n?[º°.\\s]*4\\.?657', url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/Del4657compilado.htm' },
  { slug: 'dl3365', nome: 'DL nº 3.365/41 — Desapropriações',             pat: 'Decreto-Lei\\s*n?[º°.\\s]*3\\.?365|DL\\s*n?[º°.\\s]*3\\.?365', url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/Del3365.htm' },
]

function acharLei(win: string): { slug: string; nome: string; idx: number; len: number; url?: string } | null {
  let best: { slug: string; nome: string; idx: number; len: number; url?: string } | null = null
  for (const L of LEIS) {
    const m = win.match(new RegExp('\\b(?:' + L.pat + ')', 'i'))
    if (m && typeof m.index === 'number' && (!best || m.index < best.idx)) {
      best = { slug: L.slug, nome: L.nome, idx: m.index, len: m[0].length, url: L.url }
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
        // View com os slugs distintos (11 linhas em vez de milhares).
        // Fallback para a tabela caso a view ainda não exista no banco.
        let { data, error } = await supabase.from('leis_disponiveis').select('lei_slug')
        if (error || !data) {
          const r = await supabase
            .from('leis_secas').select('lei_slug').eq('status', 'publicado').limit(10000)
          data = r.data
        }
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
  | { t: 'ext'; v: string; url: string; leiNome: string }

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
    // Fonte externa citada, mas fora do acervo (Provimento/Resolução/Súmula/Decreto/EC/Lei numerada não mapeada):
    // não transforma em link, para não abrir popup errado (nem para a CF, nem para a lei padrão da disciplina).
    const fonteExterna = /\b(?:Provimento|Resolu[çc][ãa]o|S[úu]mula(?:\s+Vinculante)?|Decreto(?:-Lei)?|Portaria|Instru[çc][ãa]o\s+Normativa|Emenda\s+Constitucional|Lei\s*(?:Complementar\s*)?n?[º°.\s]*\d)/i.test(win)
    if (lei && !slugs.has(lei.slug) && lei.url) {
      // Lei reconhecida, porém fora do acervo local: link direto para o Planalto.
      const leiStart = numEnd + lei.idx
      const citeEnd = leiStart + lei.len
      if (artStart > last) nodes.push({ t: 'txt', v: t.slice(last, artStart) })
      nodes.push({ t: 'ext', v: t.slice(artStart, citeEnd), url: lei.url, leiNome: lei.nome })
      last = citeEnd
      anchor.lastIndex = citeEnd
    } else if (lei && slugs.has(lei.slug)) {
      const leiStart = numEnd + lei.idx
      const citeEnd = leiStart + lei.len
      const { paras, incisos } = refsDoMeio(t.slice(numEnd, leiStart))
      if (artStart > last) nodes.push({ t: 'txt', v: t.slice(last, artStart) })
      nodes.push({ t: 'cite', v: t.slice(artStart, citeEnd), slug: lei.slug, leiNome: lei.nome, artigo: rotuloArtigo(num, bis), num, paras, incisos })
      last = citeEnd
      anchor.lastIndex = citeEnd
    } else if (!fonteExterna && leiPadrao && slugs.has(leiPadrao)) {
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
          ) : n.t === 'ext' ? (
            <a
              key={i}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={`Abrir no Planalto — ${n.leiNome}`}
              style={{ color: 'var(--gold)', textDecoration: 'underline', textUnderlineOffset: 2, textDecorationStyle: 'dotted', cursor: 'pointer' }}
            >
              {n.v}<span style={{ fontSize: '0.75em', opacity: 0.7, marginLeft: 2 }}>↗</span>
            </a>
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
