'use client'
import Link from 'next/link'
import { useState } from 'react'

const PLANS = [
  { id:'free', name:'Degustação Tiger', price:'0', period:'3 dias grátis', color:'var(--text-muted)', features:[{ok:true,txt:'15 questões'},{ok:true,txt:'5 perguntas IA'},{ok:true,txt:'1 mini simulado'},{ok:false,txt:'Simulados completos'},{ok:false,txt:'IA avançada'},{ok:false,txt:'Ranking'}] },
  { id:'start', name:'Tiger Start', price:'1,99', period:'/mês', color:'var(--success)', features:[{ok:true,txt:'Questões ilimitadas'},{ok:true,txt:'IA intermediária'},{ok:true,txt:'Mais simulados'},{ok:true,txt:'Streak + ranking'},{ok:false,txt:'Mapas mentais'},{ok:false,txt:'IA avançada'}] },
  { id:'plus', name:'Tiger Plus', price:'5,99', period:'/mês', color:'var(--blue)', features:[{ok:true,txt:'Simulados completos'},{ok:true,txt:'Mapas mentais'},{ok:true,txt:'PDFs premium'},{ok:true,txt:'IA ampliada'},{ok:false,txt:'Radar jurídico'},{ok:false,txt:'Trilhas personalizadas'}] },
  { id:'pro', name:'Tiger Pro', price:'9,99', period:'/mês', badge:'POPULAR', featured:true, color:'var(--gold)', features:[{ok:true,txt:'IA avançada ilimitada'},{ok:true,txt:'Radar jurídico'},{ok:true,txt:'Trilhas personalizadas'},{ok:true,txt:'Previsão de aprovação'},{ok:true,txt:'Revisão inteligente'},{ok:true,txt:'Questões comentadas premium'}] },
  { id:'elite', name:'Tiger Elite', price:'19,99', period:'/mês', badge:'TOP', elite:true, color:'var(--orange)', features:[{ok:true,txt:'Tudo ilimitado'},{ok:true,txt:'IA prioritária'},{ok:true,txt:'Conteúdos exclusivos'},{ok:true,txt:'Desafios especiais'},{ok:true,txt:'Simulados inéditos'},{ok:true,txt:'Ranking elite'}] },
]

const FEATURES = [
  {icon:'🤖',title:'IA Jurídica Avançada',desc:'Tutor inteligente que explica artigos, resolve dúvidas e sugere revisão personalizada 24/7.'},
  {icon:'📝',title:'Simulados OAB',desc:'Simulados cronometrados com correção automática e análise detalhada do seu desempenho.'},
  {icon:'🏆',title:'Gamificação Total',desc:'XP, níveis, streak, medalhas e ranking nacional para manter você motivado todos os dias.'},
  {icon:'📊',title:'Dashboard Analítico',desc:'Gráficos de evolução, taxa de acerto, estimativa de aprovação e identificação de pontos fracos.'},
  {icon:'⚡',title:'Revisão Inteligente',desc:'Flashcards adaptativos e resumos otimizados para máxima retenção em menos tempo.'},
  {icon:'🎯',title:'Radar TigerJus',desc:'Saiba quais temas têm maior probabilidade de cair na próxima prova da OAB.'},
]

export default function HomePage() {
  const [activePlan, setActivePlan] = useState<string|null>(null)

  return (
    <div style={{background:'var(--deep-black)',minHeight:'100vh'}}>
      {/* NAVBAR */}
      <nav className="navbar">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:38,height:38,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,color:'var(--deep-black)',boxShadow:'0 0 20px rgba(212,168,67,0.3)'}}>T</div>
          <span style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
        </div>
        <div style={{display:'flex',gap:32,alignItems:'center'}}>
          {['Plataforma','Disciplinas','Simulados','Planos'].map(l=>(
            <button key={l} style={{color:'var(--text-muted)',fontSize:12,fontWeight:500,letterSpacing:1,textTransform:'uppercase',border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)',transition:'color 0.2s'}}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--gold)')}
              onMouseLeave={e=>(e.currentTarget.style.color='var(--text-muted)')}>{l}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <Link href="/login" style={{color:'var(--text-muted)',fontSize:12,fontWeight:500,letterSpacing:1,textTransform:'uppercase',textDecoration:'none'}}>Entrar</Link>
          <Link href="/dashboard" className="btn-primary" style={{padding:'10px 24px',fontSize:12}}>COMEÇAR GRÁTIS</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'120px 24px 80px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,168,67,0.07) 0%, transparent 70%)',pointerEvents:'none'}} />
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(212,168,67,0.025) 1px, transparent 1px),linear-gradient(90deg, rgba(212,168,67,0.025) 1px, transparent 1px)',backgroundSize:'64px 64px',pointerEvents:'none'}} />

        <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1px solid rgba(212,168,67,0.3)',borderRadius:100,padding:'8px 20px',marginBottom:40,fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',background:'rgba(212,168,67,0.05)',animation:'fadeInDown 0.8s ease both'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'var(--gold)',animation:'pulse 2s infinite'}} />
          Plataforma jurídica de nova geração
        </div>

        <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(42px,8vw,88px)',fontWeight:900,lineHeight:1.05,letterSpacing:-1,marginBottom:24,animation:'fadeInUp 0.8s 0.1s ease both'}}>
          O jeito mais inteligente<br />
          <span style={{background:'linear-gradient(135deg,var(--gold-light) 0%,var(--gold) 50%,var(--orange) 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>de evoluir no Direito.</span>
        </h1>
        <p style={{fontSize:'clamp(16px,2vw,20px)',color:'var(--text-muted)',maxWidth:580,lineHeight:1.7,marginBottom:16,animation:'fadeInUp 0.8s 0.2s ease both'}}>
          Estude com IA, gamificação e metodologia de alta performance. Aprovação na OAB com método e inteligência.
        </p>
        <p style={{fontSize:13,color:'var(--gold-dark)',fontStyle:'italic',letterSpacing:1,marginBottom:40,animation:'fadeInUp 0.8s 0.25s ease both'}}>
          ✦ "Não basta estudar Direito. É preciso pensar como um Tigre."
        </p>
        <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap',marginBottom:60,animation:'fadeInUp 0.8s 0.3s ease both'}}>
          <Link href="/dashboard" className="btn-primary" style={{fontSize:15,padding:'17px 48px'}}>🐯 COMEÇAR GRÁTIS</Link>
          <Link href="/login" className="btn-secondary">JÁ TENHO CONTA</Link>
        </div>
        <div style={{display:'flex',gap:48,justifyContent:'center',flexWrap:'wrap',animation:'fadeInUp 0.8s 0.4s ease both'}}>
          {[['12.400+','Estudantes Ativos'],['97%','Satisfação'],['3.200+','Aprovados OAB'],['17','Disciplinas']].map(([n,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:900,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{n}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',letterSpacing:'1.5px',textTransform:'uppercase',marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:'100px 24px',background:'var(--black)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="section-tag">🐯 A PLATAFORMA</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(32px,5vw,54px)',fontWeight:900,lineHeight:1.1,marginBottom:16}}>Tudo que você precisa para<br/><span style={{color:'var(--gold)'}}>ser aprovado.</span></h2>
          <div className="divider" />
          <p style={{fontSize:17,color:'var(--text-muted)',maxWidth:540,lineHeight:1.7,marginBottom:48}}>Uma experiência completa que combina tecnologia, disciplina e performance jurídica.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
            {FEATURES.map(f=>(
              <div key={f.title} style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.08)',borderRadius:16,padding:32,transition:'all 0.3s',cursor:'default'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.25)';e.currentTarget.style.transform='translateY(-4px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.08)';e.currentTarget.style.transform='translateY(0)'}}>
                <div style={{fontSize:32,marginBottom:20}}>{f.icon}</div>
                <div style={{fontSize:17,fontWeight:700,marginBottom:10}}>{f.title}</div>
                <div style={{fontSize:14,color:'var(--text-muted)',lineHeight:1.7}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{padding:'100px 24px'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="section-tag">📍 COMO FUNCIONA</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(32px,5vw,54px)',fontWeight:900,lineHeight:1.1,marginBottom:16}}>Sua jornada no <span style={{color:'var(--gold)'}}>TigerJus.</span></h2>
          <div className="divider" />
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:24}}>
            {[
              {n:'01',t:'Crie sua conta',d:'Cadastro em 30 segundos. Sem cartão. Começa grátis.'},
              {n:'02',t:'Defina seu objetivo',d:'Informe sua meta e data da prova. A IA monta seu plano.'},
              {n:'03',t:'Estude com IA',d:'Quizzes, resumos, flashcards e tutor jurídico integrado.'},
              {n:'04',t:'Seja aprovado',d:'Suba de nível, domine o ranking e conquiste sua aprovação.'},
            ].map(s=>(
              <div key={s.n} style={{borderLeft:'2px solid rgba(212,168,67,0.2)',paddingLeft:24}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--gold)',marginBottom:8}}>{s.n}</div>
                <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>{s.t}</div>
                <div style={{fontSize:14,color:'var(--text-muted)',lineHeight:1.7}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section style={{padding:'100px 24px',background:'var(--black)'}} id="planos">
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="section-tag">💎 PLANOS</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(32px,5vw,54px)',fontWeight:900,lineHeight:1.1,marginBottom:16}}>Invista no seu <span style={{color:'var(--gold)'}}>futuro jurídico.</span></h2>
          <div className="divider" />
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
            {PLANS.map(plan=>(
              <div key={plan.id} style={{background:plan.featured?'linear-gradient(160deg,rgba(212,168,67,0.08),var(--gray))':plan.elite?'linear-gradient(160deg,rgba(232,98,26,0.08),var(--gray))':'var(--gray)',border:plan.featured?'1px solid var(--gold)':plan.elite?'1px solid var(--orange-light)':'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:28,position:'relative',transition:'transform 0.3s'}}>
                {plan.badge&&<div style={{position:'absolute',top:20,right:20,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'var(--deep-black)',fontSize:9,fontWeight:900,letterSpacing:'1.5px',padding:'4px 10px',borderRadius:100}}>{plan.badge}</div>}
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:12}}>{plan.name}</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:46,fontWeight:900,lineHeight:1,color:plan.color}}>
                  <sup style={{fontSize:18,fontWeight:600,color:'var(--text-muted)',verticalAlign:'super'}}>R$</sup>{plan.price}
                </div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:28}}>{plan.period}</div>
                <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:10,marginBottom:28}}>
                  {plan.features.map((f,i)=>(
                    <li key={i} style={{display:'flex',alignItems:'flex-start',gap:10,fontSize:13,lineHeight:1.5,color:f.ok?'var(--white)':'var(--text-muted)'}}>
                      <span style={{color:f.ok?'var(--success)':'var(--text-dim)',flexShrink:0,marginTop:2}}>{f.ok?'✓':'✕'}</span>{f.txt}
                    </li>
                  ))}
                </ul>
                {plan.id==='free'
                  ? <Link href="/dashboard" className="btn-secondary" style={{display:'block',textAlign:'center',textDecoration:'none',padding:'14px'}}>Começar Grátis</Link>
                  : <Link href={`/checkout?plan=${plan.id}`} className={plan.featured?'btn-primary':'btn-secondary'} style={{display:'block',textAlign:'center',textDecoration:'none',padding:'14px',borderColor:plan.elite?'rgba(232,98,26,0.4)':'undefined'}}>
                      {plan.featured?'ASSINAR AGORA':'ASSINAR'}
                    </Link>
                }
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:28,fontSize:13,color:'var(--text-muted)'}}>
            💳 PIX instantâneo ou Cartão de Crédito · 🔒 Acesso liberado automaticamente · Cancele quando quiser
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{padding:'100px 24px'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="section-tag">⭐ DEPOIMENTOS</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(32px,5vw,54px)',fontWeight:900,marginBottom:16}}>Tigres que já <span style={{color:'var(--gold)'}}>foram aprovados.</span></h2>
          <div className="divider" />
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
            {[
              {n:'Fernanda O.',r:'Aprovada OAB 1ª Fase',t:'A IA jurídica me salvou nas dúvidas de madrugada. Estudei 3 meses e fui aprovada. O TigerJus é diferente de tudo que usei.'},
              {n:'Gabriel M.',r:'Aprovado OAB 2ª Fase',t:'O sistema de ranking me fez estudar mais do que qualquer cursinho. A competição saudável com outros alunos é viciante.'},
              {n:'Isabela R.',r:'Estudante 5º ano',t:'Os simulados são idênticos à OAB real. Minha taxa de acerto foi de 52% para 78% em apenas 6 semanas de uso.'},
            ].map(t=>(
              <div key={t.n} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:28}}>
                <div style={{fontSize:16,marginBottom:14}}>⭐⭐⭐⭐⭐</div>
                <p style={{fontSize:14,lineHeight:1.8,color:'var(--white)',marginBottom:20}}>"{t.t}"</p>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),var(--orange))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🐯</div>
                  <div><div style={{fontWeight:700,fontSize:14}}>{t.n}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{t.r}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{padding:'100px 24px',background:'linear-gradient(135deg,rgba(212,168,67,0.08),rgba(232,98,26,0.04))'}}>
        <div style={{maxWidth:600,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:56,marginBottom:24}}>🐯</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(32px,5vw,54px)',fontWeight:900,marginBottom:20}}>Pronto para pensar<br/><span style={{color:'var(--gold)'}}>como um Tigre?</span></h2>
          <p style={{color:'var(--text-muted)',fontSize:17,marginBottom:40,lineHeight:1.7}}>Mais de 12.400 estudantes já estão evoluindo. Comece grátis e sinta a diferença.</p>
          <Link href="/dashboard" className="btn-primary" style={{fontSize:16,padding:'18px 56px'}}>COMEÇAR AGORA</Link>
          <div style={{marginTop:20,fontSize:13,color:'var(--text-muted)'}}>Sem cartão de crédito · Acesso imediato · 3 dias grátis</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:'var(--black)',borderTop:'1px solid rgba(212,168,67,0.08)',padding:'40px 24px',textAlign:'center'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,letterSpacing:2,color:'var(--gold)',marginBottom:12}}>TIGERJUS</div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>"Não basta estudar Direito. É preciso pensar como um Tigre."</div>
        <div style={{display:'flex',gap:24,justifyContent:'center',flexWrap:'wrap',fontSize:12,color:'var(--text-dim)'}}>
          <span>© 2025 TigerJus</span>
          <Link href="/privacidade" style={{color:'var(--text-dim)',textDecoration:'none'}}>Privacidade</Link>
          <Link href="/termos" style={{color:'var(--text-dim)',textDecoration:'none'}}>Termos</Link>
          <a href="mailto:contato@tigerjus.com.br" style={{color:'var(--text-dim)',textDecoration:'none'}}>contato@tigerjus.com.br</a>
        </div>
      </footer>

      <div className="grain-overlay" />
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.9); } }
      `}</style>
    </div>
  )
}
