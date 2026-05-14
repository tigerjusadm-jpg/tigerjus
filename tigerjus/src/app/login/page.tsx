'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    if (!email || !pass) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { name } }
        })
        if (error) throw error
        // Create profile
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            name,
            plan: 'free',
          })
        }
      }
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message || 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative'}}>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,168,67,0.06), transparent)',pointerEvents:'none'}} />
      <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:20,padding:'44px 40px',width:'100%',maxWidth:420,position:'relative'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:28}}>
          <div style={{width:38,height:38,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,color:'var(--deep-black)'}}>T</div>
          <span style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
        </div>
        <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,textAlign:'center',marginBottom:8}}>
          {mode==='login' ? 'Bem-vindo de volta' : 'Criar conta'}
        </div>
        <div style={{fontSize:14,color:'var(--text-muted)',textAlign:'center',marginBottom:28}}>
          {mode==='login' ? 'Continue sua jornada jurídica.' : 'Comece gratuitamente hoje.'}
        </div>

        {error && <div style={{background:'rgba(232,66,26,0.1)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13,color:'var(--danger)'}}>{error}</div>}

        {mode==='signup' && (
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Nome completo</label>
            <input className="form-input" placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)} />
          </div>
        )}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>E-mail</label>
          <input className="form-input" type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div style={{marginBottom:24}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Senha</label>
          <input className="form-input" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handle()} />
        </div>

        <button className="btn-primary" style={{width:'100%',opacity:loading?0.7:1}} onClick={handle} disabled={loading}>
          {loading ? '⏳ Aguarde...' : mode==='login' ? 'ENTRAR' : 'CRIAR CONTA'}
        </button>

        <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0'}}>
          <div style={{flex:1,height:1,background:'rgba(255,255,255,0.07)'}} />
          <span style={{fontSize:11,color:'var(--text-muted)'}}>ou</span>
          <div style={{flex:1,height:1,background:'rgba(255,255,255,0.07)'}} />
        </div>

        <button onClick={handleGoogle} style={{width:'100%',background:'var(--gray-mid)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:12,color:'var(--white)',fontSize:14,fontFamily:'var(--font-body)',cursor:'pointer',marginBottom:8,transition:'all 0.2s'}}
          onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.16)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}>
          🔷 Entrar com Google
        </button>

        <div style={{textAlign:'center',fontSize:13,color:'var(--text-muted)',marginTop:20}}>
          {mode==='login'
            ? <>Não tem conta? <span style={{color:'var(--gold)',cursor:'pointer',fontWeight:700}} onClick={()=>setMode('signup')}>Criar agora</span></>
            : <>Já tem conta? <span style={{color:'var(--gold)',cursor:'pointer',fontWeight:700}} onClick={()=>setMode('login')}>Entrar</span></>
          }
        </div>
        {mode==='login' && <div style={{textAlign:'center',marginTop:10,fontSize:12,color:'var(--text-dim)',cursor:'pointer'}}>Esqueci minha senha</div>}
        <div style={{textAlign:'center',marginTop:16}}>
          <Link href="/" style={{fontSize:12,color:'var(--text-dim)',textDecoration:'none'}}>← Voltar ao início</Link>
        </div>
      </div>
      <div className="grain-overlay" />
    </div>
  )
}
