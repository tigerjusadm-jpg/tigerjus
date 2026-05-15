'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const handleReset = async () => {
    if (!senha || !confirmar) { setErro('Preencha os dois campos.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setErro('')
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setErro('Erro ao redefinir senha. O link pode ter expirado.')
    } else {
      setSucesso(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
    setLoading(false)
  }

  if (sucesso) return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:16}}>✅</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:'var(--success)',marginBottom:8}}>Senha redefinida!</h2>
        <p style={{color:'var(--text-muted)'}}>Redirecionando para o dashboard...</p>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:440}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🔐</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,marginBottom:8}}>Nova senha</h1>
          <p style={{color:'var(--text-muted)'}}>Digite sua nova senha abaixo.</p>
        </div>
        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:24,padding:40}}>
          {erro && (
            <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:13,color:'#E8421A'}}>
              ❌ {erro}
            </div>
          )}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Nova senha</label>
            <input className="form-input" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} />
          </div>
          <div style={{marginBottom:24}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Confirmar senha</label>
            <input className="form-input" type="password" placeholder="••••••••" value={confirmar} onChange={e => setConfirmar(e.target.value)} />
          </div>
          <button className="btn-primary" style={{width:'100%'}} onClick={handleReset} disabled={loading}>
            {loading ? '⏳ Salvando...' : 'SALVAR NOVA SENHA'}
          </button>
        </div>
      </div>
      <div className="grain-overlay" />
    </div>
  )
}
