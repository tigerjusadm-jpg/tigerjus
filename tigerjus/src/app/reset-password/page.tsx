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
    // O Supabase envia o token de recovery no hash da URL
    // Ex: /reset-password#access_token=xxx&type=recovery
    // O SDK detecta isso via onAuthStateChange com evento PASSWORD_RECOVERY

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Token válido — sessão de recovery ativa
        setSessaoAtiva(true)
        setVerificando(false)
      } else if (event === 'SIGNED_IN' && session) {
        // Já logado normalmente (não recovery)
        setSessaoAtiva(true)
        setVerificando(false)
      }
    })

    // Fallback: verifica sessão existente após breve delay
    // (caso o evento já tenha disparado antes do listener)
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessaoAtiva(true)
      }
      setVerificando(false)
    }, 1500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleReset = async () => {
    if (!senha || !confirmar) { setErro('Preencha os dois campos.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setErro('')

    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) {
      setErro('Erro ao redefinir senha. O link pode ter expirado. Solicite um novo.')
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

  // Token inválido ou expirado
  if (!sessaoAtiva) return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:440,textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>⚠️</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:900,marginBottom:12,color:'var(--orange)'}}>
          Link inválido ou expirado
        </h2>
        <p style={{color:'var(--text-muted)',marginBottom:28,lineHeight:1.7,fontSize:14}}>
          O link de recuperação expirou ou já foi utilizado. Solicite um novo link de recuperação de senha.
        </p>
        <button
          className="btn-primary"
          style={{minWidth:220,fontSize:14}}
          onClick={() => router.push('/login')}
        >
          Solicitar novo link
        </button>
      </div>
      <div className="grain-overlay" />
    </div>
  )

  // Senha redefinida com sucesso
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
          <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,marginBottom:8}}>
            Nova senha
          </h1>
          <p style={{color:'var(--text-muted)',fontSize:14}}>
            Digite sua nova senha abaixo.
          </p>
        </div>

        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:24,padding:40}}>
          {erro && (
            <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#E8421A'}}>
              ❌ {erro}
            </div>
          )}

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
              onKeyDown={e => e.key==='Enter' && handleReset()}
            />
          </div>

          <div style={{marginBottom:24}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>
              Confirmar senha
            </label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleReset()}
            />
          </div>

          <button
            className="btn-primary"
            style={{width:'100%',fontSize:15,padding:16,opacity:loading?0.7:1}}
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? '⏳ Salvando...' : 'SALVAR NOVA SENHA'}
          </button>
        </div>
      </div>
      <div className="grain-overlay" />
    </div>
  )
}
