'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Fluxo de redefinição por CÓDIGO (OTP) enviado por e-mail.
// Vantagem: o código não é "queimado" por robôs de pré-visualização de e-mail
// (Gmail/Outlook/antivírus), que era a causa do "link inválido nas primeiras tentativas".
//
// Etapas:
//   'email'   -> usuário digita o e-mail e pede o código
//   'codigo'  -> usuário digita o código recebido + nova senha
//   'success' -> senha alterada, redireciona para o login

type Etapa = 'email' | 'codigo' | 'success'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialized = useRef(false)

  const [etapa, setEtapa] = useState<Etapa>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [reenviarEm, setReenviarEm] = useState(0)

  // Pré-preenche o e-mail caso venha por query (?email=...)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(emailParam)
  }, [searchParams])

  // Contador para liberar o reenvio do código
  useEffect(() => {
    if (reenviarEm <= 0) return
    const t = setInterval(() => setReenviarEm(s => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [reenviarEm])

  // ── Etapa 1: enviar o código para o e-mail ───────────────────────────────
  const enviarCodigo = async () => {
    const emailLimpo = email.trim().toLowerCase()
    if (!emailLimpo) { setErro('Digite seu e-mail.'); return }
    if (!emailLimpo.includes('@')) { setErro('Digite um e-mail válido.'); return }

    setLoading(true); setErro('')
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo)
    setLoading(false)

    // O e-mail com o código é enviado mesmo quando o Supabase retorna um aviso
    // (ex.: rate limit informativo). Por isso SEMPRE avançamos para o passo de
    // digitar o código — assim o usuário nunca fica preso na primeira etapa.
    if (error) {
      console.warn('[TigerJus Reset] aviso ao enviar código:', error.message)
    }
    setEtapa('codigo')
    setReenviarEm(60)
  }

  // ── Etapa 2: validar o código e trocar a senha ───────────────────────────
  const confirmarCodigo = async () => {
    const emailLimpo = email.trim().toLowerCase()
    const codigoLimpo = codigo.replace(/\D/g, '')

    if (codigoLimpo.length < 6) { setErro('Digite o código que enviamos por e-mail.'); return }
    if (!senha || !confirmar) { setErro('Preencha a nova senha nos dois campos.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }

    setLoading(true); setErro('')

    // 1) Verifica o código (cria a sessão de recuperação)
    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      email: emailLimpo,
      token: codigoLimpo,
      type: 'recovery',
    })

    if (otpError || !otpData?.session) {
      setLoading(false)
      setErro('Código inválido ou expirado. Confira o código ou solicite um novo.')
      return
    }

    // 2) Com a sessão criada, atualiza a senha.
    // Tenta uma vez; se a sessão ainda não tiver assentado, espera e tenta de novo.
    let updateError = (await supabase.auth.updateUser({ password: senha })).error
    if (updateError) {
      await new Promise(r => setTimeout(r, 600))
      updateError = (await supabase.auth.updateUser({ password: senha })).error
    }
    setLoading(false)

    if (updateError) {
      setErro('Não foi possível salvar a nova senha. Solicite um novo código e tente de novo.')
      return
    }

    await supabase.auth.signOut()
    setEtapa('success')
    setTimeout(() => router.push('/login'), 1800)
  }

  const reenviar = async () => {
    if (reenviarEm > 0) return
    const emailLimpo = email.trim().toLowerCase()
    setLoading(true); setErro('')
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo)
    setLoading(false)
    if (error) { setErro('Não foi possível reenviar. Tente novamente.'); return }
    setReenviarEm(60)
  }

  // ── SUCCESS ──────────────────────────────────────────────────────────────
  if (etapa === 'success') return (
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

  // ── FORMULÁRIO ─────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:440}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🔐</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,marginBottom:8}}>Recuperar senha</h1>
          <p style={{color:'var(--text-muted)',fontSize:14}}>
            {etapa === 'email'
              ? 'Digite seu e-mail para receber um código de verificação.'
              : 'Digite o código que enviamos e crie sua nova senha.'}
          </p>
        </div>

        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:24,padding:40}}>
          {erro && (
            <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#E8421A'}}>
              ❌ {erro}
            </div>
          )}

          {/* ── ETAPA 1: e-mail ── */}
          {etapa === 'email' && (
            <>
              <div style={{marginBottom:24}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>
                  Seu e-mail
                </label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && enviarCodigo()}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <button
                className="btn-primary"
                style={{width:'100%',fontSize:15,padding:16,opacity:loading?0.7:1}}
                onClick={enviarCodigo}
                disabled={loading}
              >
                {loading ? '⏳ Enviando...' : 'ENVIAR CÓDIGO'}
              </button>
            </>
          )}

          {/* ── ETAPA 2: código + nova senha ── */}
          {etapa === 'codigo' && (
            <>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>
                  Código de verificação
                </label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="________"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  disabled={loading}
                  style={{letterSpacing:'8px',textAlign:'center',fontSize:22,fontFamily:'var(--font-mono)'}}
                  autoComplete="one-time-code"
                />
                <div style={{marginTop:8,fontSize:12,color:'var(--text-muted)'}}>
                  Enviado para <strong style={{color:'var(--gold)'}}>{email.trim().toLowerCase()}</strong>
                </div>
              </div>

              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>
                  Nova senha
                </label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <div style={{marginBottom:24}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>
                  Confirmar nova senha
                </label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmarCodigo()}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <button
                className="btn-primary"
                style={{width:'100%',fontSize:15,padding:16,opacity:loading?0.7:1}}
                onClick={confirmarCodigo}
                disabled={loading}
              >
                {loading ? '⏳ Salvando...' : 'CONFIRMAR E SALVAR SENHA'}
              </button>

              <div style={{marginTop:16,textAlign:'center',fontSize:13,color:'var(--text-muted)'}}>
                {reenviarEm > 0
                  ? <>Reenviar código em {reenviarEm}s</>
                  : <button onClick={reenviar} disabled={loading} style={{background:'none',border:'none',color:'var(--gold)',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)',fontWeight:700}}>Reenviar código</button>
                }
              </div>
            </>
          )}

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
