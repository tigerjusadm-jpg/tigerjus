'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Mode = 'login' | 'cadastro' | 'reset'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()

  // De onde a pessoa veio (ex.: /checkout?plan=pro). Só aceitamos caminhos internos
  // (começam com "/" e não com "//") pra evitar redirecionamento pra sites externos.
  const rawRedirect = params.get('redirect')
  const redirect = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
    ? rawRedirect
    : null

  // Abre direto em "Criar conta" quando a landing manda ?modo=cadastro
  // (aceita também ?mode=cadastro por segurança).
  const modoParam = params.get('modo') || params.get('mode')
  const [mode, setMode] = useState<Mode>(modoParam === 'cadastro' ? 'cadastro' : 'login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [lembrar, setLembrar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  // Fluxo de recuperação por CÓDIGO (OTP) — substep dentro do modo 'reset'
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
  }, [])

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
      // Se veio do checkout, volta pra lá; senão, vai pra plataforma.
      router.push(redirect || '/plataforma')
    }
    setLoading(false)
  }

  const handleCadastro = async () => {
    if (!email || !senha || !nome) { setErro('Preencha todos os campos.'); return }
    if (senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setErro('')

    // Se a confirmação de email estiver ligada, a pessoa volta pra cá depois de confirmar:
    // levamos o destino (ex.: /checkout?plan=pro) no parâmetro "next" que o /auth/callback lê.
    const callbackUrl = redirect
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`
      : `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
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
        // Cadastro já com sessão (confirmação de email desligada): segue direto pro destino.
        router.push(redirect || '/plataforma')
      }
    }

    setLoading(false)
  }

  // Etapa 1 do reset: envia o CÓDIGO para o e-mail e avança para a etapa do código.
  const handleReset = async () => {
    const emailLimpo = email.trim().toLowerCase()
    if (!emailLimpo) { setErro('Digite seu email.'); return }
    if (!emailLimpo.includes('@')) { setErro('Digite um email válido.'); return }
    setLoading(true); setErro('')
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo)
    setLoading(false)
    // O e-mail com o código é enviado mesmo quando o Supabase retorna um aviso.
    // Por isso SEMPRE avançamos para a etapa do código — o usuário nunca fica preso.
    if (error) { console.warn('[TigerJus Reset] aviso ao enviar código:', error.message) }
    setResetEtapa('codigo')
  }

  // Etapa 2 do reset: valida o código e troca a senha.
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
            <div style={{width:48,height:48,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,color:'var(--deep-black)'}}>T</div>
            <span style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,#F5D78E,#D4A843)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
          </Link>
        </div>

        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:24,padding:40}}>
          {redirect?.startsWith('/checkout') && (
            <div style={{background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--gold)',textAlign:'center'}}>
              🔒 Entre ou crie sua conta para finalizar a assinatura.
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

              <button
                className="btn-primary"
                style={{width:'100%',marginBottom:16,fontSize:15,padding:16,opacity:loading?0.7:1}}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? '⏳ Aguarde...' : mode === 'login' ? 'ENTRAR' : mode === 'cadastro' ? 'CRIAR CONTA' : 'ENVIAR CÓDIGO'}
              </button>
            </>
          )}

          {/* ── RESET: etapa do código + nova senha ── */}
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
                  Enviado para <strong style={{color:'var(--gold)'}}>{email.trim().toLowerCase()}</strong>. Copie o código do e-mail e cole aqui (não feche esta tela).
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
