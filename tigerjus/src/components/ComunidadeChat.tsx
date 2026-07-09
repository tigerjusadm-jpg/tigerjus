'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Comunidade PRO + ELITE — chat em tempo real com:
 *  - lista de membros (🟢 online = usando a plataforma agora / ⚪ offline)
 *  - menção @nome (clicar no membro insere @Nome e notifica ele)
 *  - responder mensagem (reply com citação)
 *
 * Props:
 *  - profile: perfil do usuário logado (id, nome, plano, role, avatar_url)
 *  - showUpgrade(): abre o modal de upgrade
 *  - onlineIds: string[]  -> ids de quem está online na plataforma (presença global, vinda do app)
 */

function iniciais(nome: string) {
  const p = (nome || '?').trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?'
}
function hora(iso: string) {
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function primeiroNome(nome: string) { return (nome || 'Usuário').trim().split(/\s+/)[0] }

export default function ComunidadeChat(props: any) {
  const profile = props?.profile
  const showUpgrade = props?.showUpgrade
  const onlineIds: string[] = props?.onlineIds || []
  const meuId: string | undefined = profile?.id
  const plano = String(profile?.plano || '').toLowerCase()
  const podeEntrar = !!profile && (plano === 'pro' || plano === 'elite' || profile?.role === 'admin')
  const isAdmin = profile?.role === 'admin'
  const onlineSet = new Set(onlineIds)

  const [msgs, setMsgs] = useState<any[]>([])
  const [membros, setMembros] = useState<any[]>([])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [replyTo, setReplyTo] = useState<any | null>(null)
  const [mostrarMembros, setMostrarMembros] = useState(false)
  const fimRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const cacheAutor = useRef<Record<string, { nome: string; avatar_url: string | null }>>({})
  const mencoesPend = useRef<Record<string, string>>({}) // "@primeironome" -> id
  const msgPorId = useRef<Record<string, any>>({})

  function rolarFim() { requestAnimationFrame(() => fimRef.current?.scrollIntoView({ behavior: 'smooth' })) }

  async function autorDe(userId: string) {
    if (cacheAutor.current[userId]) return cacheAutor.current[userId]
    try {
      const { data } = await supabase.from('profiles').select('nome,avatar_url').eq('id', userId).single()
      const a = { nome: data?.nome || 'Usuário', avatar_url: data?.avatar_url || null }
      cacheAutor.current[userId] = a; return a
    } catch { return { nome: 'Usuário', avatar_url: null } }
  }

  // membros (Pro/Elite) via função segura
  useEffect(() => {
    if (!podeEntrar) return
    ;(async () => {
      try {
        const { data } = await supabase.rpc('membros_comunidade')
        const lista = (data as any[]) || []
        lista.forEach((m: any) => { cacheAutor.current[m.id] = { nome: m.nome, avatar_url: m.avatar_url } })
        setMembros(lista)
      } catch { /* ignora */ }
    })()
  }, [podeEntrar])

  // carga inicial + realtime das mensagens
  useEffect(() => {
    if (!podeEntrar) { setCarregando(false); return }
    let vivo = true
    ;(async () => {
      const { data } = await supabase
        .from('chat_mensagens')
        .select('id,user_id,texto,criado_em,deletado,mencionados,reply_a, autor:profiles(nome,avatar_url)')
        .eq('deletado', false).order('criado_em', { ascending: true }).limit(120)
      if (!vivo) return
      const linhas = (data || []).map((m: any) => {
        const autor = Array.isArray(m.autor) ? m.autor[0] : m.autor
        if (autor) cacheAutor.current[m.user_id] = { nome: autor.nome, avatar_url: autor.avatar_url }
        msgPorId.current[m.id] = { ...m, autor }
        return { ...m, autor }
      })
      setMsgs(linhas); setCarregando(false); rolarFim()
    })()

    const ch = supabase
      .channel('comunidade-msgs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens' }, async (payload: any) => {
        const m = payload.new
        if (m.deletado) return
        const autor = await autorDe(m.user_id)
        const linha = { ...m, autor }
        msgPorId.current[m.id] = linha
        setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, linha]))
        rolarFim()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_mensagens' }, (payload: any) => {
        const m = payload.new
        setMsgs(prev => (m.deletado ? prev.filter(x => x.id !== m.id) : prev))
      })
      .subscribe()
    return () => { vivo = false; supabase.removeChannel(ch) }
  }, [podeEntrar])

  function mencionar(membro: any) {
    const tag = '@' + primeiroNome(membro.nome)
    mencoesPend.current[tag.toLowerCase()] = membro.id
    setTexto(t => (t ? t.replace(/\s*$/, '') + ' ' : '') + tag + ' ')
    setMostrarMembros(false)
    inputRef.current?.focus()
  }

  function idsMencionados(txt: string): string[] {
    const ids: string[] = []
    for (const [tag, id] of Object.entries(mencoesPend.current)) {
      if (txt.toLowerCase().includes(tag)) ids.push(id)
    }
    return Array.from(new Set(ids))
  }

  async function enviar() {
    const t = texto.trim()
    if (!t || enviando || !meuId) return
    setEnviando(true); setAviso('')
    const payload: any = { user_id: meuId, texto: t, mencionados: idsMencionados(t) }
    if (replyTo?.id) payload.reply_a = replyTo.id
    const { error } = await supabase.from('chat_mensagens').insert(payload)
    if (error) {
      setAviso(/rápido demais|aguarde/i.test(error.message) ? 'Você está enviando rápido demais. Aguarde alguns segundos.' : 'Não foi possível enviar. Tente novamente.')
    } else { setTexto(''); setReplyTo(null); mencoesPend.current = {} }
    setEnviando(false)
  }

  async function apagar(id: string) {
    if (!isAdmin) return
    await supabase.from('chat_mensagens').update({ deletado: true }).eq('id', id)
    setMsgs(prev => prev.filter(x => x.id !== id))
  }
  async function banir(userId: string, nome: string) {
    if (!isAdmin || userId === meuId) return
    if (!window.confirm(`Banir ${nome} do chat da Comunidade?`)) return
    await supabase.from('chat_banidos').insert({ user_id: userId, banido_por: meuId })
    setAviso(`${nome} foi banido do chat.`)
  }

  if (!podeEntrar) {
    return (
      <div style={{ flex: 1, padding: '24px 20px' }}>
        <div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', background: 'var(--gray)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 20, padding: '40px 28px' }}>
          <div style={{ fontSize: 46, marginBottom: 10 }}>🐯💬</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Comunidade <span style={{ color: 'var(--gold)' }}>Tiger</span></h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>Um espaço pra quem é <b>Pro</b> ou <b>Elite</b> trocar ideias, tirar dúvidas e estudar junto. Faça upgrade e entre na sala.</p>
          <button className="btn-primary" onClick={() => showUpgrade && showUpgrade()} style={{ fontSize: 14, padding: '12px 26px' }}>🚀 Fazer upgrade</button>
        </div>
      </div>
    )
  }

  const membrosOrdenados = Array.from(membros).sort((a, b) => {
    const ao = onlineSet.has(a.id) ? 0 : 1, bo = onlineSet.has(b.id) ? 0 : 1
    return ao - bo || String(a.nome).localeCompare(String(b.nome))
  })
  const qtdOnline = membros.filter(m => onlineSet.has(m.id)).length

  const ListaMembros = (
    <div style={{ width: 240, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '12px 14px', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        Membros · <span style={{ color: 'var(--success)' }}>{qtdOnline} online</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
        {membrosOrdenados.map(m => {
          const on = onlineSet.has(m.id)
          return (
            <button key={m.id} onClick={() => mencionar(m)} title={`Mencionar @${primeiroNome(m.nome)}`} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', opacity: on ? 1 : 0.5 }}>
              <span style={{ position: 'relative', flexShrink: 0 }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,var(--gold),var(--orange))', fontSize: 11, fontWeight: 800, color: '#241701' }}>
                  {m.avatar_url ? <img src={m.avatar_url} alt={m.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : iniciais(m.nome)}
                </span>
                <span style={{ position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: '50%', background: on ? 'var(--success)' : '#6b7280', border: '2px solid var(--tj-bg,#0a0f1e)' }} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}{m.id === meuId ? ' (você)' : ''}</span>
                <span style={{ fontSize: 10, color: on ? 'var(--success)' : 'var(--text-muted)' }}>{on ? 'online' : 'offline'}{String(m.plano).toLowerCase() === 'elite' ? ' · Elite' : ''}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 60px)', minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(19px,4vw,25px)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
              Comunidade <span style={{ color: 'var(--gold)' }}>Tiger</span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, background: 'rgba(76,175,125,0.15)', color: 'var(--success)', padding: '3px 9px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} /> {qtdOnline} ONLINE</span>
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Pro & Elite · clique num nome pra mencionar, ou numa mensagem pra responder.</p>
          </div>
          <button onClick={() => setMostrarMembros(v => !v)} className="btn-secondary" style={{ fontSize: 12, padding: '8px 12px' }}>👥 Membros</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {carregando && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>Carregando conversa…</div>}
          {!carregando && msgs.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 30 }}>Ainda não há mensagens. Seja o primeiro a falar! 🐯</div>}
          {msgs.map(m => {
            const meu = m.user_id === meuId
            const nome = m.autor?.nome || cacheAutor.current[m.user_id]?.nome || 'Usuário'
            const avatar = m.autor?.avatar_url || cacheAutor.current[m.user_id]?.avatar_url || null
            const meMencionou = Array.isArray(m.mencionados) && meuId && m.mencionados.includes(meuId)
            const pai = m.reply_a ? msgPorId.current[m.reply_a] : null
            return (
              <div key={m.id} style={{ display: 'flex', gap: 10, flexDirection: meu ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg,var(--gold),var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#241701' }}>
                  {avatar ? <img src={avatar} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : iniciais(nome)}
                </div>
                <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: meu ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: meu ? 'var(--gold)' : 'var(--white)' }}>{meu ? 'Você' : nome}</span>
                    <span>{hora(m.criado_em)}</span>
                    <button onClick={() => { setReplyTo(m); inputRef.current?.focus() }} title="Responder" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: 0 }}>responder</button>
                    {isAdmin && <button onClick={() => apagar(m.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, padding: 0 }}>apagar</button>}
                    {isAdmin && !meu && <button onClick={() => banir(m.user_id, nome)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, padding: 0 }}>banir</button>}
                  </div>
                  <div style={{ padding: '9px 13px', borderRadius: 14, borderTopRightRadius: meu ? 4 : 14, borderTopLeftRadius: meu ? 14 : 4, background: meu ? 'linear-gradient(135deg,rgba(212,168,67,0.22),rgba(232,98,26,0.14))' : 'var(--gray)', border: '1px solid ' + (meMencionou ? 'var(--gold)' : (meu ? 'rgba(212,168,67,0.35)' : 'rgba(255,255,255,0.07)')), boxShadow: meMencionou ? '0 0 0 1px var(--gold)' : 'none', fontSize: 14, lineHeight: 1.45, color: 'var(--white)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {pai && (
                      <div style={{ borderLeft: '3px solid var(--gold)', padding: '2px 8px', marginBottom: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{pai.autor?.nome || cacheAutor.current[pai.user_id]?.nome || 'Usuário'}</span>
                        <span style={{ color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{pai.texto}</span>
                      </div>
                    )}
                    {meMencionou && <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: 'var(--gold)', marginBottom: 3 }}>✦ VOCÊ FOI MENCIONADO</span>}
                    <span style={{ display: 'block' }}>{m.texto}</span>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={fimRef} />
        </div>

        {aviso && <div style={{ padding: '6px 20px', fontSize: 12, color: 'var(--orange)' }}>{aviso}</div>}
        {replyTo && (
          <div style={{ margin: '0 20px', padding: '6px 12px', background: 'rgba(212,168,67,0.08)', borderLeft: '3px solid var(--gold)', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Respondendo a <b style={{ color: 'var(--gold)' }}>{replyTo.autor?.nome || 'Usuário'}</b>: {replyTo.texto}</span>
            <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea ref={inputRef} value={texto}
            onChange={e => setTexto(e.target.value.slice(0, 1000))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Escreva uma mensagem…  (clique num membro pra mencionar)" rows={1}
            style={{ flex: 1, resize: 'none', maxHeight: 120, background: 'var(--gray)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '11px 14px', color: 'var(--white)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' }} />
          <button className="btn-primary" onClick={enviar} disabled={enviando || !texto.trim()} style={{ fontSize: 14, padding: '11px 20px', flexShrink: 0 }}>{enviando ? '…' : '➤'}</button>
        </div>
      </div>

      <div style={{ display: mostrarMembros ? 'flex' : 'none' }} className="com-membros-mobile">{ListaMembros}</div>
      <div className="com-membros-desk" style={{ display: 'flex' }}>{ListaMembros}</div>

      <style>{`
        @media (max-width: 860px){ .com-membros-desk{ display:none !important } .com-membros-mobile{ position:fixed; right:0; top:60px; bottom:0; z-index:40; background:var(--tj-bg,#0a0f1e); box-shadow:-10px 0 30px rgba(0,0,0,.5) } }
        @media (min-width: 861px){ .com-membros-mobile{ display:none !important } }
      `}</style>
    </div>
  )
}
