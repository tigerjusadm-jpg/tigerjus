'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [sessaoAtiva, setSessaoAtiva] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    const init = async () => {
      // Estratégia 1: lê o hash diretamente da URL
      // O Supabase envia: /reset-password#access_token=xxx&refresh_token=yyy&type=recovery
      const hash = window.location.hash
      if (hash && hash.includes('type=recovery')) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) {
            setSessaoAtiva(true)
            setVerificando(false)
            // Limpa o hash da URL sem reload
            window.history.replaceState(null, '', window.location.pathname)
            return
          }
        }
      }

      // Estratégia 2: verifica sessão já existente (SIGNED_IN normal)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessaoAtiva(true)
      }
      setVerificando(false)
    }

    // Listener como fallback adicional
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessaoAtiva(true)
        setVerificando(false)
      }
    })

    init()
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    if (!senha || !confirmar) { setErro('Preencha os dois campos.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setErro('')

    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setErro('Erro ao redefinir senha. Solicite um novo link.')
    } else {
      setSucesso(true)
      setTimeout(() => router.push('/plataforma'), 2500)
    }
    setLoading(false)
  }

  // Verificando token
  if (verificando) return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16,animation:'pulse 1.5s infinite'}}>🔐</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,color:'var(--gold)'}}>Verificando link...</div>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.9)}}`}</style>
      </div>
    </div>
  )

  // Link inválido ou expirado
  if (!sessaoAtiva) return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:440,textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>⚠️</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:900,marginBottom:12,color:'var(--orange)'}}>
          Link inválido ou expirado
        </h2>
        <p style={{color:'var(--text-muted)',marginBottom:28,lineHeight:1.7,fontSize:14}}>
          O link de recuperação expirou ou já foi utilizado. Solicite um novo link abaixo.
        </p>
        {/* Formulário de reset inline — sem precisar voltar ao login */}
        <ResetInline />
      </div>
      <div className="grain-overlay" />
    </div>
  )

  // Sucesso
  if (sucesso) return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>✅</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:'var(--success)',marginBottom:8}}>
          Senha redefinida!
        </h2>
        <p style={{color:'var(--text-muted)',fontSize:14}}>Redirecionando para a plataforma...</p>
      </div>
      <div className="grain-overlay" />
    </div>
  )

  // Formulário de nova senha
  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:440}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🔐</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,marginBottom:8}}>Nova senha</h1>
          <p style={{color:'var(--text-muted)',fontSize:14}}>Digite sua nova senha abaixo.</p>
        </div>
        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:24,padding:40}}>
          {erro && (
            <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#E8421A'}}>
              ❌ {erro}
            </div>
          )}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Nova senha</label>
            <input className="form-input" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key==='Enter' && handleReset()} />
          </div>
          <div style={{marginBottom:24}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Confirmar senha</label>
            <input className="form-input" type="password" placeholder="••••••••" value={confirmar} onChange={e => setConfirmar(e.target.value)} onKeyDown={e => e.key==='Enter' && handleReset()} />
          </div>
          <button className="btn-primary" style={{width:'100%',fontSize:15,padding:16,opacity:loading?0.7:1}} onClick={handleReset} disabled={loading}>
            {loading ? '⏳ Salvando...' : 'SALVAR NOVA SENHA'}
          </button>
        </div>
      </div>
      <div className="grain-overlay" />
    </div>
  )
}

// Componente inline para solicitar novo link — sem redirecionar
function ResetInline() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const enviar = async () => {
    if (!email) { setErro('Digite seu email.'); return }
    setLoading(true); setErro('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setErro('Erro ao enviar. Tente novamente.') }
    else { setEnviado(true) }
    setLoading(false)
  }

  if (enviado) return (
    <div style={{background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:14,padding:'16px 20px',fontSize:13,color:'var(--success)',lineHeight:1.6}}>
      ✅ Email enviado! Verifique sua caixa de entrada e clique no novo link.
    </div>
  )

  return (
    <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:24,textAlign:'left'}}>
      {erro && (
        <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#E8421A'}}>❌ {erro}</div>
      )}
      <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Seu email</label>
      <input className="form-input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && enviar()} style={{marginBottom:14}} />
      <button className="btn-primary" style={{width:'100%',fontSize:13,padding:13,opacity:loading?0.7:1}} onClick={enviar} disabled={loading}>
        {loading ? '⏳ Enviando...' : 'SOLICITAR NOVO LINK'}
      </button>
    </div>
  )
}
