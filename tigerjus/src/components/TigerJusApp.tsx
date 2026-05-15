'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Mode = 'login' | 'cadastro' | 'reset'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const handleLogin = async () => {
    if (!email || !senha) { setErro('Preencha email e senha.'); return }
    setLoading(true); setErro('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('Email ou senha incorretos.')
      setLoading(false)
      return
    }
    // Verificar se é admin e redirecionar corretamente
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      
      if (profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  const handleCadastro = async () => {
    if (!email || !senha || !nome) { setErro('Preencha todos os campos.'); return }
    if (senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setErro('')
    const { error } = await supabase.auth.signUp({
      email, password: senha,
      options: { data: { nome }, emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` }
    })
    if (error) { setErro('Erro ao criar conta. Tente novamente.') }
    else { setSucesso('Conta criada! Verifique seu email para confirmar o cadastro.') }
    setLoading(false)
  }

  const handleReset = async () => {
    if (!email) { setErro('Digite seu email.'); return }
    setLoading(true); setErro('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })
    if (error) { setErro('Erro ao enviar email. Tente novamente.') }
    else { setSucesso('Email enviado! Verifique sua caixa de entrada.') }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` }
    })
    if (error) setErro('Erro ao entrar com Google.')
    setLoading(false)
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
          <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,marginBottom:8,textAlign:'center'}}>
            {mode === 'login' ? 'Bem-vindo de volta' : mode === 'cadastro' ? 'Criar conta grátis' : 'Recuperar senha'}
          </h1>
          <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:32,textAlign:'center'}}>
            {mode === 'login' ? 'Continue sua jornada jurídica.' : mode === 'cadastro' ? '3 dias grátis. Sem cartão.' : 'Enviaremos um link para seu email.'}
          </p>
          {erro && <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#E8421A'}}>❌ {erro}</div>}
          {sucesso && <div style={{background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--success)'}}>✅ {sucesso}</div>}
          {mode === 'cadastro' && (
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Nome completo</label>
              <input className="form-input" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSubmit()} />
            </div>
          )}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>E-mail</label>
            <input className="form-input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSubmit()} />
          </div>
          {mode !== 'reset' && (
            <div style={{marginBottom:24}}>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Senha</label>
              <input className="form-input" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSubmit()} />
            </div>
          )}
          <button className="btn-primary" style={{width:'100%',marginBottom:16,fontSize:15,padding:16,opacity:loading?0.7:1}} onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Aguarde...' : mode === 'login' ? 'ENTRAR' : mode === 'cadastro' ? 'CRIAR CONTA' : 'ENVIAR LINK'}
          </button>
          {mode !== 'reset' && (
            <>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,0.08)'}} />
                <span style={{fontSize:12,color:'var(--text-muted)'}}>ou</span>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,0.08)'}} />
              </div>
              <button onClick={handleGoogle} disabled={loading}
                style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:14,cursor:'pointer',fontSize:14,color:'var(--white)',fontFamily:'var(--font-body)',transition:'all 0.2s'}}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.82v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.52V5.41H1.82A8 8 0 0 0 .98 9c0 1.29.31 2.51.84 3.59l2.69-2.07z"/>
                  <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.16 4.41l2.69 2.07c.63-1.89 2.39-3.9 4.47-3.9z"/>
                </svg>
                Entrar com Google
              </button>
            </>
          )}
          <div style={{marginTop:24,textAlign:'center',fontSize:13,color:'var(--text-muted)'}}>
            {mode === 'login' && (<>
              <span>Não tem conta? </span>
              <button onClick={() => {setMode('cadastro');setErro('');setSucesso('')}} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)'}}>Criar agora</button>
              <div style={{marginTop:12}}>
                <button onClick={() => {setMode('reset');setErro('');setSucesso('')}} style={{color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)'}}>Esqueci minha senha</button>
              </div>
            </>)}
            {mode === 'cadastro' && <span>Já tem conta? <button onClick={() => {setMode('login');setErro('');setSucesso('')}} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)'}}>Entrar</button></span>}
            {mode === 'reset' && <button onClick={() => {setMode('login');setErro('');setSucesso('')}} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)'}}>← Voltar ao login</button>}
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
