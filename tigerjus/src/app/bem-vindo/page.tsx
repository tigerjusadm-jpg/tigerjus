'use client'
import { useRouter } from 'next/navigation'

export default function BemVindoPage() {
  const router = useRouter()

  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{maxWidth:560,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:72,marginBottom:24}}>🐯</div>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:900,marginBottom:12}}>
          Plano <span style={{color:'var(--gold)'}}>Generosidade</span> Ativado!
        </h1>
        <p style={{fontSize:16,color:'var(--text-muted)',marginBottom:40,lineHeight:1.7}}>
          Bem-vindo ao TigerJus. Você tem <strong style={{color:'var(--gold)'}}>3 dias grátis</strong> para explorar tudo que a plataforma tem a oferecer.
        </p>
        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:32,marginBottom:32,textAlign:'left'}}>
          <div style={{fontSize:14,fontWeight:700,color:'var(--gold)',marginBottom:20,letterSpacing:1,textTransform:'uppercase'}}>✦ O que está liberado agora:</div>
          {[
            {icon:'📝',label:'15 questões para responder'},
            {icon:'🤖',label:'5 perguntas para a IA Jurídica'},
            {icon:'📋',label:'1 mini simulado completo'},
            {icon:'🏆',label:'Acesso ao ranking geral'},
            {icon:'📚',label:'Resumos introdutórios de cada disciplina'},
          ].map(i => (
            <div key={i.label} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <span style={{fontSize:20,width:28,textAlign:'center'}}>{i.icon}</span>
              <span style={{fontSize:14,color:'var(--text-muted)'}}>{i.label}</span>
              <span style={{marginLeft:'auto',color:'var(--success)',fontSize:12,fontWeight:700}}>✓ LIBERADO</span>
            </div>
          ))}
          <div style={{marginTop:16}}>
            {[
              {icon:'🎯',label:'Radar TigerJus'},
              {icon:'📄',label:'PDFs exclusivos'},
              {icon:'⚡',label:'Simulados completos OAB'},
            ].map(i => (
              <div key={i.label} style={{display:'flex',alignItems:'center',gap:14,padding:'10px 0'}}>
                <span style={{fontSize:20,width:28,textAlign:'center',opacity:0.4}}>{i.icon}</span>
                <span style={{fontSize:14,color:'var(--text-dim)',textDecoration:'line-through'}}>{i.label}</span>
                <span style={{marginLeft:'auto',color:'var(--text-dim)',fontSize:12}}>🔒 Premium</span>
              </div>
            ))}
          </div>
        </div>
        <button className="btn-primary" style={{width:'100%',fontSize:16,padding:18,marginBottom:16}}
          onClick={() => router.push('/dashboard')}>
          🎁 PLANO GENEROSIDADE — COMECE GRÁTIS AGORA
        </button>
        <button className="btn-secondary" style={{width:'100%',fontSize:13}}
          onClick={() => router.push('/checkout?plan=pro')}>
          Ver planos premium →
        </button>
      </div>
      <div className="grain-overlay" />
    </div>
  )
}
