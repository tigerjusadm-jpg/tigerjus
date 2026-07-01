import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function exigirAdmin(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { erro: 'unauthorized', status: 401 as const }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { erro: 'unauthorized', status: 401 as const }
  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (perfil?.role !== 'admin') return { erro: 'forbidden', status: 403 as const }
  return { user }
}

// Extrai artigos limpos do HTML do Planalto (remove versões revogadas e anotações).
function limparEExtrair(htmlBruto: string) {
  let html = htmlBruto
    // remove versões REVOGADAS / riscadas (o Planalto mantém a redação antiga riscada junto da nova)
    .replace(/<strike[\s\S]*?<\/strike>/gi, '')
    .replace(/<s>[\s\S]*?<\/s>/gi, '')
    .replace(/<del[\s\S]*?<\/del>/gi, '')
    .replace(/<span[^>]*line-through[\s\S]*?<\/span>/gi, '')
    // remove blocos de <script> e <style> (ex.: JS de segurança do rodapé do Planalto)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // mantém o TEXTO dos links (ex.: referências a artigos/leis), removendo só as tags <a>
    // as anotações (Vide/Incluído/...) que sobrarem são limpas depois pela remoção de parênteses
    .replace(/<a\b[^>]*>/gi, '').replace(/<\/a>/gi, '')

  let texto = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ccedil;/gi, 'ç')
    .replace(/&atilde;/gi, 'ã').replace(/&otilde;/gi, 'õ').replace(/&acirc;/gi, 'â')
    .replace(/&ecirc;/gi, 'ê').replace(/&ocirc;/gi, 'ô').replace(/&agrave;/gi, 'à')
    .replace(/&quot;/gi, '"').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&apos;/gi, "'").replace(/&#39;/g, "'")
    .replace(/&#150;/g, '–').replace(/&#151;/g, '—')
    .replace(/&#(\d+);/g, (_m: string, n: string) => { try { return String.fromCharCode(parseInt(n, 10)) } catch { return ' ' } })
    .replace(/[ \t\r\f\v]+/g, ' ')

  // remove parênteses de anotação remanescentes (tolera espaço depois do "(")
  // OBS: mantém "(VETADO)" de propósito — é informativo pro aluno (mostra dispositivo vetado)
  texto = texto.replace(
    /\(\s*(?:Vide|Inclu[ií]d[oa]|Reda[çc][ãa]o dada|Reda[çc][ãa]o|Vig[êe]ncia|Revogad[oa]|Renumerad[oa]|Regulamento|Promulga[çc][ãa]o|Produ[çc][ãa]o de efeito|Express[ãa]o substitu[íi]d[ao])[^)]*\)/gi,
    ''
  )
  // anotações de acréscimo por lei (ex.: "(Parágrafo acrescentado pela Lei nº 8.703...)")
  texto = texto.replace(/\([^)]*acresc(?:entad|id)[oa][^)]*\)/gi, '')
  // "Vigência" solto (link de anotação do Planalto sem parênteses) — comum em leis muito emendadas (ECA).
  // Protege usos legítimos ("a vigência", "período de vigência") via lista branca de palavras anteriores.
  texto = texto.replace(/(?<!\b(?:a|à|da|de|do|em|na|no|sua|seu|toda|cuja|pela|entrada|perda|prazo|período)\s)\bVig[êe]ncia\b/gi, '')
  // ponto órfão logo após "(Vetado)"/"(VETADO)" — ex.: "(Vetado) ." -> "(Vetado)"
  texto = texto.replace(/(\((?:VETADO|Vetado)\))\s*\./g, '$1')

  // corta o rodapé do Planalto (nota do DOU + qualquer lixo residual depois dela)
  const fimLei = texto.search(/Este texto n[ãa]o substitui/i)
  if (fimLei > 0) texto = texto.slice(0, fimLei)

  // começa no primeiro "Art. 1"
  const ini = texto.search(/Art\.?\s*1\s*[ºo°]/)
  if (ini > 0) texto = texto.slice(ini)

  // divide por "Art. N" (inclui bis: 3º-A)
  const partes = texto.split(/(?=Art\.?\s*\d+\s*[ºo°]?(?:-[A-Z])?[.\s])/)
  const artigos: { artigo: string; num: number; texto: string }[] = []
  const vistos = new Set<string>()
  for (const p of partes) {
    const m = p.match(/^Art\.?\s*(\d+)\s*[ºo°]?(-[A-Z])?/)
    if (!m) continue
    const num = parseInt(m[1], 10)
    const bis = m[2] || ''
    // 1º ao 9º levam "º"; de 10 em diante é cardinal ("Art. 10", "Art. 83")
    const label = `Art. ${m[1]}${num <= 9 ? 'º' : ''}${bis}`
    if (vistos.has(label)) continue
    let corpo = p.replace(/\s+/g, ' ').trim()
    if (corpo.length < 10) continue
    if (corpo.length > 20000) corpo = corpo.slice(0, 20000)
    vistos.add(label)
    artigos.push({ artigo: label, num, texto: corpo })
  }
  return artigos
}

export async function POST(req: Request) {
  try {
    const auth = await exigirAdmin(req)
    if ('erro' in auth) return NextResponse.json({ error: auth.erro }, { status: auth.status })

    const body = await req.json()
    const action = body.action

    if (action === 'importar') {
      const { url, lei_slug, lei_nome } = body
      if (!url || !lei_slug || !lei_nome)
        return NextResponse.json({ error: 'faltam url, lei_slug ou lei_nome' }, { status: 400 })
      if (!/^https?:\/\/(www\.)?planalto\.gov\.br\//i.test(url))
        return NextResponse.json({ error: 'a URL deve ser do planalto.gov.br' }, { status: 400 })

      // Planalto usa cert TLS antigo — afrouxa a verificação só durante a busca (conteúdo público, sem risco)
      const tlsPrev = process.env.NODE_TLS_REJECT_UNAUTHORIZED
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      let resp: Response
      try {
        resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
        })
      } catch (e: any) {
        const causa = e?.cause?.code || e?.cause?.message || e?.message || 'desconhecido'
        return NextResponse.json({ error: `não consegui acessar o Planalto (${causa})` }, { status: 502 })
      } finally {
        if (tlsPrev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = tlsPrev
      }
      if (!resp.ok) return NextResponse.json({ error: `Planalto respondeu ${resp.status}` }, { status: 502 })
      const buf = await resp.arrayBuffer()
      // Planalto usa encoding antigo (windows-1252 / ISO-8859-1) — decodifica corretamente
      const html = new TextDecoder('windows-1252').decode(buf)
      const artigos = limparEExtrair(html)
      if (artigos.length === 0)
        return NextResponse.json({ error: 'nenhum artigo extraído — confira a URL' }, { status: 422 })

      // limpa rascunhos antigos desta lei e insere os novos
      await supabase.from('leis_secas').delete().eq('lei_slug', lei_slug).eq('status', 'rascunho')
      const rows = artigos.map((a, i) => ({
        lei_slug, lei_nome, artigo: a.artigo, artigo_num: a.num,
        texto: a.texto, fonte_url: url, status: 'rascunho', ordem: i,
      }))
      const { error } = await supabase.from('leis_secas').upsert(rows, { onConflict: 'lei_slug,artigo' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, total: artigos.length, amostra: artigos.slice(0, 5) })
    }

    if (action === 'listar') {
      const { lei_slug } = body
      let query = supabase
        .from('leis_secas')
        .select('id,lei_slug,lei_nome,artigo,artigo_num,texto,status,ordem')
        .order('ordem', { ascending: true })
      if (lei_slug) query = query.eq('lei_slug', lei_slug)
      const { data, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, artigos: data || [] })
    }

    if (action === 'publicar') {
      const { lei_slug } = body
      if (!lei_slug) return NextResponse.json({ error: 'falta lei_slug' }, { status: 400 })
      const { error } = await supabase
        .from('leis_secas')
        .update({ status: 'publicado' })
        .eq('lei_slug', lei_slug)
        .eq('status', 'rascunho')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'descartar') {
      const { lei_slug } = body
      if (!lei_slug) return NextResponse.json({ error: 'falta lei_slug' }, { status: 400 })
      const { error } = await supabase.from('leis_secas').delete().eq('lei_slug', lei_slug).eq('status', 'rascunho')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'ação inválida' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erro' }, { status: 500 })
  }
}
