'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Redefinição de senha por CÓDIGO (OTP) enviado por e-mail.
//
// MUDANÇA IMPORTANTE NESTA VERSÃO:
// Tudo fica em UMA tela só. Os campos de código e de nova senha estão SEMPRE
// visíveis — não existe mais "avançar de etapa". Isso elimina de vez o bug de
// a página travar no passo do e-mail sem nunca mostrar onde digitar o código.
//
// Fluxo pro usuário:
//   1. Digita o e-mail e clica "ENVIAR CÓDIGO"
//   2. O código chega no e-mail
//   3. Na MESMA tela (os campos já estão lá), cola o código + nova senha e salva

type Tela = 'form' | 'success'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialized = useRef(false)

  const [tela, setTela] = useState<Tela>('form')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [reenviarEm, setReenviarEm] = useState(0)

  // Pré-preenche o e-mail caso venha por query (?email=...)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(emailParam)
  }, [searchParams])

  // Contador para liberar o reenvio
  useEffect(() => {
    if (reenviarEm <= 0) return
    const t = setInterval(() => setReenviarEm(s => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [reenviarEm])

  // ── Enviar o código para o e-mail ────────────────────────────────────────
  const enviarCodigo = async () => {
    const emailLimpo = email.trim().toLowerCase()
    if (!emailLimpo) { setErro('Digite seu e-mail.'); return }
    if (!emailLimpo.includes('@')) { setErro('Digite um e-mail válido.'); return }

    setEnviando(true); setErro(''); setAviso('')
    try {
      // Mesmo que isto lance um erro/aviso, o try/finally garante que a tela
      // continua funcional e os campos abaixo permanecem disponíveis.
      await supabase.auth.resetPasswordForEmail(emailLimpo)
    } catch (e) {
      console.warn('[TigerJus Reset] aviso ao enviar código:', e)
    } finally {
      setEnviando(false)
      setCodigoEnviado(true)
      setAviso('Código enviado! Confira seu e-mail (inclusive a caixa de spam) e digite o código abaixo. Não feche esta página.')
      setReenviarEm(60)
    }
  }

  // ── Validar o código e trocar a senha ────────────────────────────────────
  const confirmarCodigo = async () => {
    const emailLimpo = email.trim().toLowerCase()
    const codigoLimpo = codigo.replace(/\D/g, '')

    if (!emailLimpo.includes('@')) { setErro('Digite seu e-mail no campo acima.'); return }
    if (codigoLimpo.length < 6) { setErro('Digite o código que enviamos por e-mail.'); return }
    if (!senha || !confirmar) { setErro('Preencha a nova senha nos dois campos.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }

    setSalvando(true); setErro('')

    // 1) Verifica o código (cria a sessão de recuperação)
    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      email: emailLimpo,
      token: codigoLimpo,
      type: 'recovery',
    })

    if (otpError || !otpData?.session) {
      setSalvando(false)
      setErro('Código inválido ou expirado. Se você pediu mais de um código, use o mais recente — ou solicite um novo.')
      return
    }

    // 2) Com a sessão criada, atualiza a senha (tenta de novo se a sessão demorar)
    let updateError = (await supabase.auth.updateUser({ password: senha })).error
    if (updateError) {
      await new Promise(r => setTimeout(r, 600))
      updateError = (await supabase.auth.updateUser({ password: senha })).error
    }
    setSalvando(false)

    if (updateError) {
      setErro('Não foi possível salvar a nova senha. Solicite um novo código e tente de novo.')
      return
    }

    await supabase.auth.signOut()
    setTela('success')
    setTimeout(() => router.push('/login'), 1800)
  }

  const reenviar = async () => {
    if (reenviarEm > 0 || enviando) return
    const emailLimpo = email.trim().toLowerCase()
    if (!emailLimpo.includes('@')) { setErro('Digite seu e-mail no campo acima.'); return }
    setEnviando(true); setErro('')
    try { await supabase.auth.resetPasswordForEmail(emailLimpo) } catch {}
    setEnviando(false)
    setAviso('Novo código enviado! Use o código mais recente que chegou no e-mail.')
    setReenviarEm(60)
  }

  // ── SUCCESS ───────────────────────────────────────────────────────────────
  if (tela === 'success') return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>✅</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:'var(--success)',marginBottom:8}}>
          Senha atualizada!
        </h2>
        <p style={{color:'var(--text-muted)',fontSize:14}}>Redirecionando para o login...</p>
      </div>
      <div className="grain-overlay" />
    </div>
  )

  // ── FORMULÁRIO (tela única, todos os campos sempre visíveis) ───────────────
  const labelStyle: React.CSSProperties = {fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}

  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:440}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:12}}>🔐</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,marginBottom:8}}>Recuperar senha</h1>
          <p style={{color:'var(--text-muted)',fontSize:14}}>
            Peça o código, confira seu e-mail e crie sua nova senha — tudo nesta mesma tela.
          </p>
        </div>

        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:24,padding:32}}>

          {erro && (
            <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#E8421A'}}>
              ❌ {erro}
            </div>
          )}
          {aviso && !erro && (
            <div style={{background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--success)'}}>
              ✅ {aviso}
            </div>
          )}

          {/* PASSO 1 — e-mail + enviar código */}
          <div style={{marginBottom:8}}>
            <span style={{fontSize:10,fontWeight:800,letterSpacing:'1px',color:'var(--gold)'}}>PASSO 1</span>
          </div>
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Seu e-mail</label>
            <input
              className="form-input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviarCodigo()}
              disabled={enviando}
              autoComplete="email"
            />
          </div>
          <button
            className="btn-primary"
            style={{width:'100%',fontSize:15,padding:16,opacity:enviando?0.7:1,marginBottom:8}}
            onClick={enviarCodigo}
            disabled={enviando}
          >
            {enviando ? '⏳ Enviando...' : (codigoEnviado ? 'ENVIAR NOVO CÓDIGO' : 'ENVIAR CÓDIGO')}
          </button>
          {codigoEnviado && (
            <div style={{textAlign:'center',fontSize:12,color:'var(--text-muted)',marginBottom:4}}>
              {reenviarEm > 0
                ? <>Já pode reenviar em {reenviarEm}s</>
                : <button onClick={reenviar} disabled={enviando} style={{background:'none',border:'none',color:'var(--gold)',cursor:'pointer',fontSize:12,fontFamily:'var(--font-body)',fontWeight:700}}>Reenviar código</button>
              }
            </div>
          )}

          {/* Divisória */}
          <div style={{display:'flex',alignItems:'center',gap:12,margin:'22px 0 18px'}}>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,0.08)'}} />
            <span style={{fontSize:11,color:'var(--text-dim)'}}>depois</span>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,0.08)'}} />
          </div>

          {/* PASSO 2 — código + nova senha (SEMPRE visível) */}
          <div style={{marginBottom:8}}>
            <span style={{fontSize:10,fontWeight:800,letterSpacing:'1px',color:'var(--gold)'}}>PASSO 2</span>
          </div>
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Código do e-mail</label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="________"
              value={codigo}
              onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))}
              disabled={salvando}
              style={{letterSpacing:'8px',textAlign:'center',fontSize:22,fontFamily:'var(--font-mono)'}}
              autoComplete="one-time-code"
            />
          </div>

          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Nova senha</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              disabled={salvando}
              autoComplete="new-password"
            />
          </div>

          <div style={{marginBottom:24}}>
            <label style={labelStyle}>Confirmar nova senha</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmarCodigo()}
              disabled={salvando}
              autoComplete="new-password"
            />
          </div>

          <button
            className="btn-primary"
            style={{width:'100%',fontSize:15,padding:16,opacity:salvando?0.7:1}}
            onClick={confirmarCodigo}
            disabled={salvando}
          >
            {salvando ? '⏳ Salvando...' : 'CONFIRMAR E SALVAR SENHA'}
          </button>

          <div style={{marginTop:20,textAlign:'center'}}>
            <a href="/login" style={{color:'var(--text-muted)',fontSize:13,textDecoration:'none'}}>← Voltar ao login</a>
          </div>
        </div>
      </div>
      <div className="grain-overlay" />
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.9)}}`}</style>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>🔐</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,color:'var(--gold)'}}>
            Carregando...
          </div>
        </div>
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  )
}
