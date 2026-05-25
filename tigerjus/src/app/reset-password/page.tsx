'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Status = 'checking' | 'ready' | 'invalid' | 'saving' | 'success'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialized = useRef(false)

  const [status, setStatus] = useState<Status>('checking')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    // Evita dupla execução no React StrictMode
    if (initialized.current) return
    initialized.current = true

    const iniciarRecovery = async () => {
      // ── Estratégia 1: ?code= na query string (PKCE flow) ──────────────────
      const code = searchParams.get('code')
      console.log('[TigerJus Reset] code:', code)
      console.log('[TigerJus Reset] hash:', window.location.hash)

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        console.log('[TigerJus Reset] exchangeCode result:', data)
        console.log('[TigerJus Reset] exchangeCode error:', error)
        if (!error && data.session) {
          setStatus('ready')
          return
        }
      }

      // ── Estratégia 2: hash com access_token (implicit flow) ───────────────
      const hash = window.location.hash
      if (hash && hash.length > 1) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')
        console.log('[TigerJus Reset] hash type:', type, '| has tokens:', !!accessToken)

        if (accessToken && refreshToken && type === 'recovery') {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          console.log('[TigerJus Reset] setSession result:', data)
          console.log('[TigerJus Reset] setSession error:', error)
          if (!error && data.session) {
            // Limpa o hash da URL para evitar reuso/leak do token
            window.history.replaceState({}, document.title, '/reset-password')
            setStatus('ready')
            return
          }
        }
      }

      // ── Estratégia 3: sessão já existente ─────────────────────────────────
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('[TigerJus Reset] existing session:', !!session, '| error:', sessionError)
      if (session) {
        setStatus('ready')
        return
      }

      // Nenhuma estratégia funcionou
      setStatus('invalid')
    }

    // Listener de suporte para PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[TigerJus Reset] authStateChange event:', event)
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setStatus('ready')
      }
    })

    iniciarRecovery()
    return () => subscription.unsubscribe()
  }, [searchParams])

  const handleReset = async () => {
    if (!senha || !confirmar) { setErro('Preencha os dois campos.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres.'); return }

    setStatus('saving'); setErro('')
    const { error } = await supabase.auth.updateUser({ password: senha })
    console.log('[TigerJus Reset] updateUser error:', error)

    if (error) {
      setErro('Erro ao redefinir senha. Solicite um novo link.')
      setStatus('ready')
    } else {
      await supabase.auth.signOut()
      setStatus('success')
      setTimeout(() => router.push('/login'), 1800)
    }
  }

  // ── CHECKING ───────────────────────────────────────────────────────────────
  if (status === 'checking') return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16,animation:'pulse 1.5s infinite'}}>🔐</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,color:'var(--gold)'}}>
          Verificando link...
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.9)}}`}</style>
      </div>
    </div>
  )

  // ── SUCCESS ────────────────────────────────────────────────────────────────
  if (status === 'success') return (
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

  // ── INVALID ────────────────────────────────────────────────────────────────
  if (status === 'invalid') return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:440,textAlign:'center'}}>
        <div style={{fontSize:56,marginBottom:16}}>⚠️</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,marginBottom:12,color:'var(--orange)'}}>
          Link inválido ou expirado
        </h2>
        <p style={{color:'var(--text-muted)',marginBottom:28,lineHeight:1.7,fontSize:14}}>
          O link de recuperação expirou ou já foi utilizado.<br/>
          Solicite um novo link abaixo.
        </p>
        <ResetInline />
      </div>
      <div className="grain-overlay" />
    </div>
  )

  // ── READY + SAVING — formulário de nova senha ──────────────────────────────
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
              disabled={status === 'saving'}
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
              disabled={status === 'saving'}
            />
          </div>
          <button
            className="btn-primary"
            style={{width:'100%',fontSize:15,padding:16,opacity:status==='saving'?0.7:1}}
            onClick={handleReset}
            disabled={status === 'saving'}
          >
            {status === 'saving' ? '⏳ Salvando...' : 'SALVAR NOVA SENHA'}
          </button>
        </div>
      </div>
      <div className="grain-overlay" />
    </div>
  )
}

// ─── Solicitar novo link inline ───────────────────────────────────────────────
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
    <div style={{background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:14,padding:'16px 20px',fontSize:13,color:'var(--success)',lineHeight:1.7}}>
      ✅ Email enviado! Verifique sua caixa de entrada e clique no novo link.
    </div>
  )

  return (
    <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:24,textAlign:'left'}}>
      {erro && (
        <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#E8421A'}}>
          ❌ {erro}
        </div>
      )}
      <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>
        Seu email
      </label>
      <input
        className="form-input"
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key==='Enter' && enviar()}
        style={{marginBottom:14}}
      />
      <button
        className="btn-primary"
        style={{width:'100%',fontSize:13,padding:13,opacity:loading?0.7:1}}
        onClick={enviar}
        disabled={loading}
      >
        {loading ? '⏳ Enviando...' : 'SOLICITAR NOVO LINK'}
      </button>
    </div>
  )
}

// ─── Export com Suspense (obrigatório para useSearchParams no Next.js 15) ──────
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
