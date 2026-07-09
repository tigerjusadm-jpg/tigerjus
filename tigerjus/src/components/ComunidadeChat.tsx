'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Comunidade Elite — sala única de chat em tempo real (estilo Telegram).
 * Só usuários Elite (ou admin) leem/escrevem — travado por RLS no banco.
 * Admin pode apagar mensagem e banir usuário do chat.
 *
 * Uso: <ComunidadeChat profile={profile} showUpgrade={showUpgrade} />
 */

function iniciais(nome: string) {
  const p = (nome || '?').trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?'
}
function hora(iso: string) {
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function ComunidadeChat(props: any) {
  const profile = props?.profile
  const showUpgrade = props?.showUpgrade
  const meuId: string | undefined = profile?.id
  const isElite = !!profile && (String(profile?.plano).toLowerCase() === 'elite' || profile?.role === 'admin')
  const isAdmin = profile?.role === 'admin'

  const [msgs, setMsgs] = useState<any[]>([])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  const fimRef = useRef<HTMLDivElement | null>(null)
  const cacheAutor = useRef<Record<string, { nome: string; avatar_url: string | null }>>({})

  function rolarFim() {
    requestAnimationFrame(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }) })
  }

  async function autorDe(userId: string) {
    if (cacheAutor.current[userId]) return cacheAutor.current[userId]
    try {
      const { data } = await supabase.from('profiles').select('nome,avatar_url').eq('id', userId).single()
      const a = { nome: data?.nome || 'Usuário', avatar_url: data?.avatar_url || null }
      cacheAutor.current[userId] = a
      return a
    } catch {
      return { nome: 'Usuário', avatar_url: null }
    }
  }

  // carga inicial + realtime
  useEffect(() => {
    if (!isElite) { setCarregando(false); return }
    let vivo = true
    ;(async () => {
      const { data } = await supabase
        .from('chat_mensagens')
        .select('id,user_id,texto,criado_em,deletado, autor:profiles(nome,avatar_url)')
        .eq('deletado', false)
        .order('criado_em', { ascending: true })
        .limit(100)
      if (!vivo) return
      const linhas = (data || []).map((m: any) => {
        const autor = Array.isArray(m.autor) ? m.autor[0] : m.autor
        if (autor) cacheAutor.current[m.user_id] = { nome: autor.nome, avatar_url: autor.avatar_url }
        return { ...m, autor }
      })
      setMsgs(linhas)
      setCarregando(false)
      rolarFim()
    })()

    const ch = supabase
      .channel('comunidade-elite')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens' }, async (payload: any) => {
        const m = payload.new
        if (m.deletado) return
        const autor = await autorDe(m.user_id)
        setMsgs(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, { ...m, autor }]))
        rolarFim()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_mensagens' }, (payload: any) => {
        const m = payload.new
        setMsgs(prev => (m.deletado ? prev.filter(x => x.id !== m.id) : prev))
      })
      .subscribe()

    return () => { vivo = false; supabase.removeChannel(ch) }
  }, [isElite])

  async function enviar() {
    const t = texto.trim()
    if (!t || enviando || !meuId) return
    setEnviando(true); setAviso('')
    const { error } = await supabase.from('chat_mensagens').insert({ user_id: meuId, texto: t })
    if (error) {
      setAviso(/rápido demais|aguarde/i.test(error.message) ? 'Você está enviando rápido demais. Aguarde alguns segundos.' : 'Não foi possível enviar. Tente novamente.')
    } else {
      setTexto('')
    }
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

  // ---- bloqueio para não-Elite ----
  if (!isElite) {
    return (
      <div style={{ flex: 1, padding: '24px 20px' }}>
        <div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', background: 'var(--gray)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 20, padding: '40px 28px' }}>
          <div style={{ fontSize: 46, marginBottom: 10 }}>🐯💬</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Comunidade <span style={{ color: 'var(--gold)' }}>Elite</span></h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>Um espaço exclusivo pra quem é Elite trocar ideias, tirar dúvidas e estudar junto. Faça upgrade e entre na sala.</p>
          <button className="btn-primary" onClick={() => showUpgrade && showUpgrade()} style={{ fontSize: 14, padding: '12px 26px' }}>🚀 Virar Elite</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', minHeight: 0 }}>
      <div style={{ padding: '16px 20px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
          Comunidade <span style={{ color: 'var(--gold)' }}>Elite</span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, background: 'rgba(76,175,125,0.15)', color: 'var(--success)', padding: '3px 9px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} /> AO VIVO</span>
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Seja respeitoso. Mensagens em tempo real com toda a comunidade Elite.</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        {carregando && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>Carregando conversa…</div>}
        {!carregando && msgs.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 30 }}>Ainda não há mensagens. Seja o primeiro a falar! 🐯</div>}
        {msgs.map(m => {
          const meu = m.user_id === meuId
          const nome = m.autor?.nome || cacheAutor.current[m.user_id]?.nome || 'Usuário'
          const avatar = m.autor?.avatar_url || cacheAutor.current[m.user_id]?.avatar_url || null
          return (
            <div key={m.id} style={{ display: 'flex', gap: 10, flexDirection: meu ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg,var(--gold),var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#241701' }}>
                {avatar ? <img src={avatar} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : iniciais(nome)}
              </div>
              <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: meu ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: meu ? 'var(--gold)' : 'var(--white)' }}>{meu ? 'Você' : nome}</span>
                  <span>{hora(m.criado_em)}</span>
                  {isAdmin && (
                    <>
                      <button onClick={() => apagar(m.id)} title="Apagar mensagem" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, padding: 0 }}>apagar</button>
                      {!meu && <button onClick={() => banir(m.user_id, nome)} title="Banir do chat" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, padding: 0 }}>banir</button>}
                    </>
                  )}
                </div>
                <div style={{ padding: '9px 13px', borderRadius: 14, borderTopRightRadius: meu ? 4 : 14, borderTopLeftRadius: meu ? 14 : 4, background: meu ? 'linear-gradient(135deg,rgba(212,168,67,0.22),rgba(232,98,26,0.14))' : 'var(--gray)', border: `1px solid ${meu ? 'rgba(212,168,67,0.35)' : 'rgba(255,255,255,0.07)'}`, fontSize: 14, lineHeight: 1.45, color: 'var(--white)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.texto}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={fimRef} />
      </div>

      {aviso && <div style={{ padding: '6px 20px', fontSize: 12, color: 'var(--orange)' }}>{aviso}</div>}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value.slice(0, 1000))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          placeholder="Escreva uma mensagem…"
          rows={1}
          style={{ flex: 1, resize: 'none', maxHeight: 120, background: 'var(--gray)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '11px 14px', color: 'var(--white)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' }}
        />
        <button className="btn-primary" onClick={enviar} disabled={enviando || !texto.trim()} style={{ fontSize: 14, padding: '11px 20px', flexShrink: 0 }}>
          {enviando ? '…' : '➤'}
        </button>
      </div>
    </div>
  )
}
