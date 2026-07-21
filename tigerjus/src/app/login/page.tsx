'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAppSettings } from '@/contexts/AppSettingsContext'

type Mode = 'login' | 'cadastro' | 'reset'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { settings } = useAppSettings()

  const rawRedirect = params.get('redirect')
  const redirect = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
    ? rawRedirect
    : null

  const modoParam = params.get('modo') || params.get('mode')
  const [mode, setMode] = useState<Mode>(modoParam === 'cadastro' ? 'cadastro' : 'login')

  // ── REFERRAL: captura ?ref= da URL ──────────────────────────────────────
  const refCode = params.get('ref') || null

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [lembrar, setLembrar] = useState(false)
  const [aceito, setAceito] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [resetEtapa, setResetEtapa] = useState<'email'|'codigo'>('email')
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  useEffect(() => {
    const emailSalvo = localStorage.getItem('tigerjus_email')
    const lembrarSalvo = localStorage.getItem('tigerjus_lembrar')
    if (emailSalvo && lembrarSalvo === 'true') {
      setEmail(emailSalvo)
      setLembrar(true)
    }
    // ── REFERRAL: persiste o código no localStorage
    // caso o usuário precise confirmar e-mail antes de completar o cadastro
    if (refCode) {
      localStorage.setItem('tj_ref', refCode)
    }
  }, [refCode])

  const handleLogin = async () => {
    if (!email || !senha) { setErro('Preencha email e senha.'); return }
    setLoading(true); setErro('')
    if (lembrar) {
      localStorage.setItem('tigerjus_email', email)
      localStorage.setItem('tigerjus_lembrar', 'true')
    } else {
      localStorage.removeItem('tigerjus_email')
      localStorage.removeItem('tigerjus_lembrar')
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setErro('Confirme seu email antes de entrar. Verifique sua caixa de entrada.')
      } else if (error.message.includes('Invalid login credentials')) {
        setErro('Email ou senha incorretos.')
      } else {
        setErro('Erro ao entrar. Tente novamente.')
      }
    } else {
      router.push(redirect || '/plataforma')
    }
    setLoading(false)
  }

  const handleCadastro = async () => {
    if (!email || !senha || !nome) { setErro('Preencha todos os campos.'); return }
    if (!aceito) { setErro('Você precisa aceitar a Política de Privacidade para continuar.'); return }
    if (senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setErro('')

    const callbackUrl = redirect
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`
      : `${window.location.origin}/auth/callback`

    // ── REFERRAL: inclui o ref_code nos metadados do usuário ──────────────
    // Prioriza o da URL; fallback para o que estava salvo no localStorage
    const finalRefCode = refCode || localStorage.getItem('tj_ref') || null

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
          ...(finalRefCode ? { ref_code: finalRefCode } : {}),
        },
        emailRedirectTo: callbackUrl,
      }
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setErro('Este email já está cadastrado. Tente fazer login.')
      } else {
        setErro(`Erro ao criar conta: ${error.message}`)
      }
      setLoading(false)
      return
    }

    if (data?.user) {
      if (data.user.identities && data.user.identities.length === 0) {
        setErro('Este email já está cadastrado. Verifique sua caixa de entrada para confirmar.')
      } else if (!data.session) {
        setSucesso('✅ Conta criada! Enviamos um link de confirmação para seu email. Verifique sua caixa de entrada e clique no link para ativar sua conta.')
      } else {
        // Cadastro com sessão imediata: limpa o ref do localStorage
        localStorage.removeItem('tj_ref')
        router.push(redirect || '/plataforma')
      }
    }

    setLoading(false)
  }

  const handleReset = async () => {
    const emailLimpo = email.trim().toLowerCase()
    if (!emailLimpo) { setErro('Digite seu email.'); return }
    if (!emailLimpo.includes('@')) { setErro('Digite um email válido.'); return }
    setLoading(true); setErro('')
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo)
    setLoading(false)
    if (error) { console.warn('[TigerJus Reset] aviso ao enviar código:', error.message) }
    setResetEtapa('codigo')
  }

  const handleConfirmarCodigo = async () => {
    const emailLimpo = email.trim().toLowerCase()
    const codigoLimpo = codigo.replace(/\D/g, '')
    if (codigoLimpo.length < 6) { setErro('Digite o código que enviamos por e-mail.'); return }
    if (!novaSenha || !confirmarSenha) { setErro('Preencha a nova senha nos dois campos.'); return }
    if (novaSenha !== confirmarSenha) { setErro('As senhas não coincidem.'); return }
    if (novaSenha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setErro('')
    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      email: emailLimpo, token: codigoLimpo, type: 'recovery',
    })
    if (otpError || !otpData?.session) {
      setLoading(false)
      setErro('Código inválido ou expirado. Confira o código ou solicite um novo.')
      return
    }
    let updErr = (await supabase.auth.updateUser({ password: novaSenha })).error
    if (updErr) { await new Promise(r => setTimeout(r, 600)); updErr = (await supabase.auth.updateUser({ password: novaSenha })).error }
    setLoading(false)
    if (updErr) { setErro('Não foi possível salvar a nova senha. Solicite um novo código e tente de novo.'); return }
    await supabase.auth.signOut()
    setSucesso('✅ Senha atualizada! Use a nova senha para entrar.')
    setResetEtapa('email')
    setCodigo(''); setNovaSenha(''); setConfirmarSenha('')
    setMode('login')
  }

  const handleGoogle = async () => {
    setLoading(true); setErro('')
    const nextPath = redirect || '/plataforma'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        queryParams: { prompt: 'select_account' },
      },
    })
    // Sucesso redireciona a pagina inteira, entao so tratamos o erro.
    if (error) {
      setErro('Nao foi possivel conectar com o Google. Tente novamente.')
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (mode === 'login') handleLogin()
    else if (mode === 'cadastro') handleCadastro()
    else handleReset()
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative'}}>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(212,168,67,0.06), transparent)',pointerEvents:'none'}} />
      <div style={{width:'100%',maxWidth:440,position:'relative'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:10,textDecoration:'none'}}>
            {settings.logo_url
              ? <img src={settings.logo_url} alt={settings.site_name||'TigerJus'} style={{width:48,height:48,borderRadius:12,objectFit:'contain'}}/>
              : <div style={{width:48,height:48,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,color:'var(--deep-black)'}}>T</div>}
            <span style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,#F5D78E,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
          </Link>
        </div>

        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:24,padding:40}}>
          {/* Banner quando vem do checkout */}
          {redirect?.startsWith('/checkout') && (
            <div style={{background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--gold)',textAlign:'center'}}>
              🔒 Entre ou crie sua conta para finalizar a assinatura.
            </div>
          )}

          {/* Banner quando vem de indicação */}
          {refCode && mode === 'cadastro' && (
            <div style={{background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--success)',textAlign:'center'}}>
              🐯 Você foi convidado por um Tigre! Crie sua conta e comece grátis.
            </div>
          )}

          <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,marginBottom:8,textAlign:'center'}}>
            {mode === 'login' ? 'Bem-vindo de volta' : mode === 'cadastro' ? 'Criar conta grátis' : 'Recuperar senha'}
          </h1>
          <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:32,textAlign:'center'}}>
            {mode === 'login' ? 'Continue sua jornada jurídica.' : mode === 'cadastro' ? '3 dias grátis. Sem cartão.' : resetEtapa === 'email' ? 'Enviaremos um código para seu email.' : 'Digite o código que enviamos e crie sua nova senha.'}
          </p>

          {erro && (
            <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#E8421A'}}>
              ❌ {erro}
            </div>
          )}
          {sucesso && (
            <div style={{background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--success)',lineHeight:1.6}}>
              {sucesso}
            </div>
          )}

          {mode === 'cadastro' && !sucesso && (
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Nome completo</label>
              <input className="form-input" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSubmit()} />
            </div>
          )}

          {!sucesso && !(mode === 'reset' && resetEtapa === 'codigo') && (
            <>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>E-mail</label>
                <input className="form-input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSubmit()} />
              </div>

              {mode !== 'reset' && (
                <div style={{marginBottom: mode === 'login' ? 16 : 24}}>
                  <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Senha</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSubmit()} />
                </div>
              )}

              {mode === 'login' && (
                <div style={{marginBottom:24}}>
                  <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}} onClick={() => setLembrar(l => !l)}>
                    <div style={{width:20,height:20,borderRadius:6,border:lembrar?'2px solid var(--gold)':'2px solid rgba(255,255,255,0.2)',background:lembrar?'rgba(212,168,67,0.15)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}>
                      {lembrar && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#D4A843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{fontSize:13,color:lembrar?'var(--gold)':'var(--text-muted)',transition:'color 0.2s',fontWeight:lembrar?600:400}}>
                      Lembrar meu email neste dispositivo
                    </span>
                  </label>
                </div>
              )}

              {mode === 'cadastro' && !sucesso && (
                <div style={{marginBottom:20}}>
                  <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',userSelect:'none'}} onClick={() => setAceito(a => !a)}>
                    <div style={{width:20,height:20,borderRadius:6,border:aceito?'2px solid var(--gold)':'2px solid rgba(255,255,255,0.2)',background:aceito?'rgba(212,168,67,0.15)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1,transition:'all 0.2s'}}>
                      {aceito && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#D4A843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.5}}>
                      Li e aceito a <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{color:'var(--gold)'}} onClick={e=>e.stopPropagation()}>Política de Privacidade</a> e os <a href="/termos" target="_blank" rel="noopener noreferrer" style={{color:'var(--gold)'}} onClick={e=>e.stopPropagation()}>Termos de Uso</a>.
                    </span>
                  </label>
                </div>
              )}

              <button
                className="btn-primary"
                style={{width:'100%',marginBottom:16,fontSize:15,padding:16,opacity:loading?0.7:1}}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? '⏳ Aguarde...' : mode === 'login' ? 'ENTRAR' : mode === 'cadastro' ? 'CRIAR CONTA' : 'ENVIAR CÓDIGO'}
              </button>

              {mode !== 'reset' && (
                <>
                  <div style={{display:'flex',alignItems:'center',gap:12,margin:'4px 0 16px'}}>
                    <div style={{flex:1,height:1,background:'rgba(255,255,255,0.1)'}} />
                    <span style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)'}}>ou</span>
                    <div style={{flex:1,height:1,background:'rgba(255,255,255,0.1)'}} />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={loading}
                    style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:14,borderRadius:12,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.04)',color:'#F5F0E8',fontSize:14,fontWeight:600,fontFamily:'var(--font-body)',cursor:loading?'default':'pointer',opacity:loading?0.6:1,transition:'all 0.2s'}}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{flexShrink:0}}>
                      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"/>
                      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"/>
                    </svg>
                    {mode === 'cadastro' ? 'Criar conta com Google' : 'Entrar com Google'}
                  </button>
                </>
              )}
            </>
          )}

          {!sucesso && mode === 'reset' && resetEtapa === 'codigo' && (
            <>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Código de verificação</label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="________"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  style={{letterSpacing:'8px',textAlign:'center',fontSize:22,fontFamily:'var(--font-mono)'}}
                  autoComplete="one-time-code"
                />
                <div style={{marginTop:8,fontSize:12,color:'var(--text-muted)'}}>
                  Enviado para <strong style={{color:'var(--gold)'}}>{email.trim().toLowerCase()}</strong>.
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Nova senha</label>
                <input className="form-input" type="password" placeholder="••••••••" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password" />
              </div>
              <div style={{marginBottom:24}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Confirmar nova senha</label>
                <input className="form-input" type="password" placeholder="••••••••" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleConfirmarCodigo()} autoComplete="new-password" />
              </div>
              <button className="btn-primary" style={{width:'100%',marginBottom:16,fontSize:15,padding:16,opacity:loading?0.7:1}} onClick={handleConfirmarCodigo} disabled={loading}>
                {loading ? '⏳ Salvando...' : 'CONFIRMAR E SALVAR SENHA'}
              </button>
              <div style={{textAlign:'center',fontSize:13}}>
                <button onClick={() => { setResetEtapa('email'); setErro(''); }} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)'}}>
                  ← Usar outro e-mail
                </button>
              </div>
            </>
          )}

          {sucesso && mode === 'cadastro' && (
            <button
              className="btn-primary"
              style={{width:'100%',fontSize:15,padding:16}}
              onClick={() => { setMode('login'); setSucesso(''); setErro('') }}
            >
              IR PARA O LOGIN
            </button>
          )}

          <div style={{marginTop:24,textAlign:'center',fontSize:13,color:'var(--text-muted)'}}>
            {mode === 'login' && (
              <>
                <span>Não tem conta? </span>
                <button onClick={() => {setMode('cadastro');setErro('');setSucesso('')}} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)'}}>
                  Criar agora
                </button>
                <div style={{marginTop:12}}>
                  <button onClick={() => {setMode('reset');setResetEtapa('email');setErro('');setSucesso('')}} style={{color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)'}}>
                    Esqueci minha senha
                  </button>
                </div>
              </>
            )}
            {mode === 'cadastro' && !sucesso && (
              <span>Já tem conta? <button onClick={() => {setMode('login');setErro('');setSucesso('')}} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)'}}>Entrar</button></span>
            )}
            {mode === 'reset' && (
              <button onClick={() => {setMode('login');setResetEtapa('email');setErro('');setSucesso('')}} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)'}}>
                ← Voltar ao login
              </button>
            )}
          </div>

          <div style={{marginTop:20,textAlign:'center'}}>
            <Link href="/" style={{color:'var(--text-muted)',fontSize:12,textDecoration:'none'}}>← Voltar ao início</Link>
          </div>
        </div>
      </div>
      <div className="grain-overlay" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>🐯</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,color:'var(--gold)'}}>Carregando...</div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
