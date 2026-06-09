'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import HeroMedia from '@/components/HeroMedia'
import LandingTopBanner from '@/components/LandingTopBanner'

const PLANS = [
  { id:'free', name:'Plano Generosidade', price:'0', period:'3 dias grátis', color:'var(--text-muted)', features:[{ok:true,txt:'15 questões'},{ok:true,txt:'5 perguntas IA'},{ok:true,txt:'1 mini simulado'},{ok:false,txt:'Simulados completos'},{ok:false,txt:'PDF por disciplina'},{ok:false,txt:'Radar TigerJus'}] },
  { id:'start', name:'Tiger Start', price:'1,99', period:'/mês', color:'var(--success)', features:[{ok:true,txt:'Questões ilimitadas'},{ok:true,txt:'IA jurídica (20/dia)'},{ok:true,txt:'Simulados completos'},{ok:true,txt:'Streak + ranking'},{ok:false,txt:'PDF por disciplina'},{ok:false,txt:'Radar TigerJus'}] },
  { id:'plus', name:'Tiger Plus', price:'5,99', period:'/mês', color:'var(--blue)', features:[{ok:true,txt:'PDF por disciplina'},{ok:true,txt:'Radar TigerJus'},{ok:true,txt:'Simulados OAB 42º e 43º'},{ok:true,txt:'Flashcards avançados'},{ok:false,txt:'IA avançada'},{ok:false,txt:'Trilhas personalizadas'}] },
  { id:'pro', name:'Tiger Pro', price:'9,99', period:'/mês', badge:'POPULAR', featured:true, color:'var(--gold)', features:[{ok:true,txt:'IA avançada (150/dia)'},{ok:true,txt:'Simulados OAB 42º ao 44º'},{ok:true,txt:'Trilhas personalizadas'},{ok:true,txt:'Previsão de aprovação'},{ok:false,txt:'Tudo ilimitado'},{ok:false,txt:'Acesso total vitalício'}] },
  { id:'elite', name:'Tiger Elite', price:'19,99', period:'/mês', badge:'TOP', elite:true, color:'var(--orange)', features:[{ok:true,txt:'Tudo ilimitado'},{ok:true,txt:'IA prioritária'},{ok:true,txt:'Todos os simulados OAB'},{ok:true,txt:'Acesso total vitalício'},{ok:true,txt:'Conteúdos exclusivos'},{ok:true,txt:'Ranking elite'}] },
]

const FEATURES = [
  {icon:'🤖',title:'IA Jurídica Avançada',desc:'Tutor inteligente que explica artigos, resolve dúvidas e sugere revisão personalizada 24/7.'},
  {icon:'📝',title:'Simulados OAB',desc:'Simulados cronometrados com correção automática e análise detalhada do seu desempenho.'},
  {icon:'🏆',title:'Gamificação Total',desc:'XP, níveis, streak, medalhas e ranking nacional para manter você motivado todos os dias.'},
  {icon:'📊',title:'Dashboard Analítico',desc:'Gráficos de evolução, taxa de acerto, estimativa de aprovação e identificação de pontos fracos.'},
  {icon:'⚡',title:'Revisão Inteligente',desc:'Flashcards adaptativos e resumos otimizados para máxima retenção em menos tempo.'},
  {icon:'🎯',title:'Radar TigerJus',desc:'Saiba quais temas têm maior probabilidade de cair na próxima prova da OAB.'},
]

function normalizeBoolean(value: unknown): boolean {
  if (value === true) return true
  if (value === 1) return true
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'yes' || v === 'on'
  }
  return false
}

// Converte "1,99" → preço anual formatado "23,88"
function precoAnual(priceStr: string): string {
  const num = parseFloat(priceStr.replace(',', '.'))
  if (isNaN(num)) return priceStr
  return (Math.round(num * 12 * 100) / 100).toFixed(2).replace('.', ',')
}

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [ciclo, setCiclo] = useState<'mensal'|'anual'>('mensal')
  const ehAnual = ciclo === 'anual'

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.95)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:1100,position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:-40,right:0,background:'none',border:'none',color:'#888',fontSize:24,cursor:'pointer'}}>✕</button>
        <div style={{textAlign:'center',marginBottom:32}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:900,marginBottom:8}}>Escolha seu <span style={{color:'var(--gold)'}}>plano</span></h2>
          <p style={{color:'var(--text-muted)',marginBottom:18}}>Desbloqueie todo o potencial do TigerJus</p>
          {/* Toggle Mensal/Anual */}
          <div style={{display:'inline-flex',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:100,padding:4,gap:4}}>
            <button onClick={()=>setCiclo('mensal')} style={{padding:'8px 24px',borderRadius:100,border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:13,fontWeight:700,background:!ehAnual?'linear-gradient(135deg,var(--gold),var(--orange))':'transparent',color:!ehAnual?'#000':'var(--text-muted)',transition:'all 0.2s'}}>Mensal</button>
            <button onClick={()=>setCiclo('anual')} style={{padding:'8px 24px',borderRadius:100,border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:13,fontWeight:700,background:ehAnual?'linear-gradient(135deg,var(--gold),var(--orange))':'transparent',color:ehAnual?'#000':'var(--text-muted)',transition:'all 0.2s'}}>Anual</button>
          </div>
          {ehAnual && <p style={{color:'var(--success)',fontSize:12,marginTop:10}}>💎 Pague uma vez · 12 meses de acesso completo</p>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
          {PLANS.filter(p => p.id !== 'free').map(plan=>(
            <div key={plan.id} style={{background:(plan as any).featured?'linear-gradient(160deg,rgba(212,168,67,0.1),var(--gray))':'var(--gray)',border:(plan as any).featured?'1px solid var(--gold)':'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:24,position:'relative'}}>
              {(plan as any).badge&&<div style={{position:'absolute',top:16,right:16,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'var(--deep-black)',fontSize:9,fontWeight:900,letterSpacing:'1.5px',padding:'4px 10px',borderRadius:100}}>{(plan as any).badge}</div>}
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{plan.name}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:40,fontWeight:900,color:plan.color,marginBottom:4}}>
                <sup style={{fontSize:16,color:'var(--text-muted)',verticalAlign:'super'}}>R$</sup>
                {ehAnual ? precoAnual(plan.price) : plan.price}
              </div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom: ehAnual ? 4 : 20}}>{ehAnual ? '/ano' : plan.period}</div>
              {ehAnual && <div style={{fontSize:11,color:'var(--success)',marginBottom:16}}>Pagamento único · 12 meses</div>}
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                {plan.features.map((f,i)=>(
                  <li key={i} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12,color:f.ok?'var(--white)':'var(--text-muted)'}}>
                    <span style={{color:f.ok?'var(--success)':'var(--text-dim)',flexShrink:0}}>{f.ok?'✓':'✕'}</span>{f.txt}
                  </li>
                ))}
              </ul>
              <Link href={`/checkout?plan=${plan.id}&ciclo=${ciclo}`} className={(plan as any).featured?'btn-primary':'btn-secondary'} style={{display:'block',textAlign:'center',textDecoration:'none',padding:'12px',fontSize:13}} onClick={onClose}>
                {(plan as any).featured?'ASSINAR AGORA':'ASSINAR'}
              </Link>
            </div>
          ))}
        </div>
        <div style={{textAlign:'center',marginTop:20,fontSize:13,color:'var(--text-muted)'}}>
          💳 PIX ou Cartão · 🔒 Pagamento seguro · Cancele quando quiser
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { settings, loaded } = useAppSettings()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [ciclo, setCiclo] = useState<'mensal'|'anual'>('mensal')
  const ehAnual = ciclo === 'anual'

  const heroMedia = {
    enabled:   loaded ? normalizeBoolean(settings.hero_media_enabled) : false,
    type:      settings.hero_media_type      || 'image',
    url:       settings.hero_media_url       || '',
    position:  settings.hero_media_position  || 'right',
    opacity:   settings.hero_media_opacity   ?? 90,
    animation: settings.hero_media_animation || 'float',
    maxWidth:  settings.hero_media_max_width ?? 650,
    blur:      settings.hero_media_blur      ?? 0,
  }

  const heroIsRight = heroMedia.enabled && heroMedia.position === 'right'
  const heroIsLeft  = heroMedia.enabled && heroMedia.position === 'left'
  const heroIsBg    = heroMedia.enabled && heroMedia.position === 'background'

  const navItems = [
    { label:'Plataforma', action: () => { document.getElementById('plataforma')?.scrollIntoView({behavior:'smooth'}); setMenuOpen(false) } },
    { label:'Disciplinas', action: () => { router.push('/login'); setMenuOpen(false) } },
    { label:'Simulados',   action: () => { router.push('/login'); setMenuOpen(false) } },
    { label:'Planos',      action: () => { document.getElementById('planos')?.scrollIntoView({behavior:'smooth'}); setMenuOpen(false) } },
  ]

  const sociais = [
    { url: settings.instagram_url, icon: '📸', label: 'Instagram', color: 'rgba(212,168,67,0.15)' },
    { url: settings.whatsapp_url,  icon: '💬', label: 'WhatsApp',  color: 'rgba(37,211,102,0.15)' },
    { url: settings.telegram_url,  icon: '✈️', label: 'Telegram',  color: 'rgba(96,165,250,0.15)' },
    { url: settings.youtube_url,   icon: '▶️', label: 'YouTube',   color: 'rgba(248,113,113,0.15)' },
  ].filter(s => s.url)

  return (
    <div style={{background:'var(--tj-bg, #060a12)',minHeight:'100vh',position:'relative'}}>
      <div className="tj-grid-overlay"/>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {/* NAVBAR */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',height:60,background:'rgba(6,10,18,0.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:17,fontWeight:900,color:'var(--deep-black)',boxShadow:'0 0 20px rgba(212,168,67,0.3)',flexShrink:0}}>T</div>
          <span style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{settings.site_name||'TIGERJUS'}</span>
        </div>
        <div className="landing-nav-desktop" style={{display:'flex',gap:28,alignItems:'center'}}>
          {navItems.map(item=>(
            <button key={item.label} onClick={item.action}
              style={{color:'var(--text-muted)',fontSize:12,fontWeight:500,letterSpacing:1,textTransform:'uppercase',border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)',transition:'color 0.2s'}}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--gold)')}
              onMouseLeave={e=>(e.currentTarget.style.color='var(--text-muted)')}>{item.label}</button>
          ))}
        </div>
        <div className="landing-nav-desktop" style={{display:'flex',gap:10,alignItems:'center'}}>
          <Link href="/login" style={{color:'var(--text-muted)',fontSize:12,fontWeight:500,letterSpacing:1,textTransform:'uppercase',textDecoration:'none'}}>Entrar</Link>
          <Link href="/login?modo=cadastro" className="btn-primary" style={{padding:'10px 22px',fontSize:12}}>COMEÇAR GRÁTIS</Link>
        </div>
        <button className="landing-nav-mobile" onClick={() => setMenuOpen(o => !o)}
          style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,width:36,height:36,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,cursor:'pointer',padding:8,flexShrink:0}}>
          <span style={{display:'block',width:18,height:2,background:'var(--white)',borderRadius:2,transition:'all 0.25s',transform:menuOpen?'rotate(45deg) translate(5px,5px)':'none'}}/>
          <span style={{display:'block',width:18,height:2,background:'var(--white)',borderRadius:2,transition:'all 0.25s',opacity:menuOpen?0:1}}/>
          <span style={{display:'block',width:18,height:2,background:'var(--white)',borderRadius:2,transition:'all 0.25s',transform:menuOpen?'rotate(-45deg) translate(5px,-5px)':'none'}}/>
        </button>
      </nav>

      {/* MENU MOBILE */}
      {menuOpen && (
        <div style={{position:'fixed',top:60,left:0,right:0,zIndex:99,background:'rgba(8,8,8,0.98)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',padding:'8px 0'}}>
          {navItems.map(item=>(
            <button key={item.label} onClick={item.action}
              style={{display:'flex',alignItems:'center',padding:'14px 24px',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:15,color:'var(--white)',textAlign:'left',letterSpacing:1,textTransform:'uppercase',fontWeight:500}}>
              {item.label}
            </button>
          ))}
          <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'12px 20px',display:'flex',flexDirection:'column',gap:10}}>
            <Link href="/login" onClick={() => setMenuOpen(false)}
              style={{display:'block',textAlign:'center',padding:'12px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'var(--text-muted)',textDecoration:'none',fontSize:13,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>
              ENTRAR
            </Link>
            <Link href="/login?modo=cadastro" onClick={() => setMenuOpen(false)} className="btn-primary"
              style={{display:'block',textAlign:'center',padding:'14px',fontSize:14,textDecoration:'none'}}>
              {settings.hero_cta_primary||'🐯 COMEÇAR GRÁTIS'}
            </Link>
          </div>
        </div>
      )}

      {/* BANNER DO TOPO */}
      <LandingTopBanner />

      {/* HERO */}
      <section style={{
        minHeight:'100vh',
        display:'flex',
        flexDirection:'column',
        alignItems:'center',
        justifyContent:'center',
        padding:'120px 24px 80px',
        position:'relative',
        overflow:'hidden',
        textAlign: heroIsRight||heroIsLeft ? 'left' : 'center',
      }}>
        {heroIsBg && <HeroMedia {...heroMedia}/>}
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 90% 70% at 50% 10%, rgba(99,130,200,0.18) 0%, rgba(212,168,67,0.06) 50%, transparent 75%)',pointerEvents:'none',zIndex:1}} />
        <div style={{position:'absolute',top:'20%',left:'50%',transform:'translateX(-50%)',width:600,height:400,background:'radial-gradient(ellipse at center, rgba(99,130,200,0.1) 0%, transparent 70%)',pointerEvents:'none',zIndex:1,filter:'blur(40px)'}} />

        <div className="hero-two-col" style={{
          display:'flex',
          alignItems:'center',
          gap:48,
          width:'100%',
          maxWidth: heroIsRight||heroIsLeft ? 1200 : 'none',
          flexDirection: heroIsLeft ? 'row-reverse' : 'row',
          flexWrap:'wrap',
          position:'relative',
          zIndex:2,
        }}>
          {(heroIsRight||heroIsLeft) && (
            <div className="desktop-hero-media">
              <HeroMedia {...heroMedia}/>
            </div>
          )}

          <div className="hero-content-col" style={{flex:1,display:'flex',flexDirection:'column',alignItems:heroIsRight||heroIsLeft?'flex-start':'center',position:'relative',zIndex:2}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1px solid rgba(212,168,67,0.3)',borderRadius:100,padding:'8px 20px',marginBottom:40,fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',background:'rgba(212,168,67,0.05)',animation:'fadeInDown 0.8s ease both'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'var(--gold)',animation:'pulse 2s infinite'}} />
              {settings.hero_badge||'Plataforma jurídica de nova geração'}
            </div>

            <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(38px,8vw,88px)',fontWeight:900,lineHeight:1.05,letterSpacing:-1,marginBottom:24,animation:'fadeInUp 0.8s 0.1s ease both'}}>
              {settings.hero_headline
                ? settings.hero_headline.includes('Direito')
                  ? <>{settings.hero_headline.split('Direito')[0]}<span style={{background:'linear-gradient(135deg,var(--gold-light) 0%,var(--gold) 50%,var(--orange) 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Direito{settings.hero_headline.split('Direito')[1]}</span></>
                  : settings.hero_headline
                : <>O jeito mais inteligente<br/><span style={{background:'linear-gradient(135deg,var(--gold-light) 0%,var(--gold) 50%,var(--orange) 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>de evoluir no Direito.</span></>
              }
            </h1>

            <p style={{fontSize:'clamp(15px,2vw,20px)',color:'var(--text-muted)',maxWidth:580,lineHeight:1.7,marginBottom:16,animation:'fadeInUp 0.8s 0.2s ease both'}}>
              {settings.hero_subtitle||'Estude com IA, gamificação e metodologia de alta performance. Aprovação na OAB com método e inteligência.'}
            </p>
            <p style={{fontSize:13,color:'var(--gold-dark)',fontStyle:'italic',letterSpacing:1,marginBottom:40,animation:'fadeInUp 0.8s 0.25s ease both'}}>
              ✦ "{settings.hero_quote||'Não basta estudar Direito. É preciso pensar como um Tigre.'}"
            </p>

            <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:60,animation:'fadeInUp 0.8s 0.3s ease both'}}>
              <Link href="/login?modo=cadastro" className="btn-primary" style={{fontSize:15,padding:'16px 40px'}}>{settings.hero_cta_primary||'🐯 COMEÇAR GRÁTIS'}</Link>
              <Link href="/login" className="btn-secondary" style={{fontSize:15,padding:'16px 32px'}}>JÁ TENHO CONTA</Link>
            </div>

            <div className="teste-mobile-tigre">
              <img src={settings.hero_media_url || ''} alt="TigerJus Cyber Tiger" loading="eager"
                style={{display:'block',margin:'0 auto',width:'min(78vw, 300px)',height:'auto',objectFit:'contain',filter:'drop-shadow(0 0 32px rgba(212,168,67,0.5))'}} />
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'20px 40px',maxWidth:480,margin:'0 auto',animation:'fadeInUp 0.8s 0.4s ease both'}}>
              {[['12.400+','Estudantes Ativos'],['97%','Satisfação'],['3.200+','Aprovados OAB'],['17','Disciplinas']].map(([n,l])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(28px,6vw,36px)',fontWeight:900,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{n}</div>
                  <div style={{fontSize:10,color:'var(--text-muted)',letterSpacing:'1.5px',textTransform:'uppercase',marginTop:4}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(heroIsRight||heroIsLeft) && heroMedia.url && (
          <div className="mobile-hero-tiger">
            <img src={heroMedia.url} alt="TigerJus Cyber Tiger" loading="eager"
              style={{display:'block',width:'min(78vw, 320px)',height:'auto',objectFit:'contain',filter:'drop-shadow(0 0 32px rgba(212,168,67,0.5))'}} />
          </div>
        )}
      </section>

      {/* FEATURES */}
      <section id="plataforma" style={{padding:'80px 24px',background:'var(--tj-bg-secondary, #0a1020)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="section-tag">🐯 A PLATAFORMA</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(28px,5vw,54px)',fontWeight:900,lineHeight:1.1,marginBottom:16}}>Tudo que você precisa para<br/><span style={{color:'var(--gold)'}}>ser aprovado.</span></h2>
          <div className="divider" />
          <p style={{fontSize:16,color:'var(--text-muted)',maxWidth:540,lineHeight:1.7,marginBottom:40}}>Uma experiência completa que combina tecnologia, disciplina e performance jurídica.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
            {FEATURES.map(f=>(
              <div key={f.title} style={{background:'var(--tj-card-bg, rgba(12,20,40,0.85))',border:'1px solid var(--tj-card-border, rgba(99,130,200,0.18))',borderRadius:16,padding:28,transition:'all 0.3s',cursor:'default',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}>
                <div style={{fontSize:30,marginBottom:16}}>{f.icon}</div>
                <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>{f.title}</div>
                <div style={{fontSize:14,color:'var(--text-muted)',lineHeight:1.7}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{padding:'80px 24px'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="section-tag">📍 COMO FUNCIONA</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(28px,5vw,54px)',fontWeight:900,lineHeight:1.1,marginBottom:16}}>Sua jornada no <span style={{color:'var(--gold)'}}>TigerJus.</span></h2>
          <div className="divider" />
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:24}}>
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
      <section style={{padding:'80px 24px',background:'var(--tj-bg-secondary, #0a1020)'}} id="planos">
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="section-tag">💎 PLANOS</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(28px,5vw,54px)',fontWeight:900,lineHeight:1.1,marginBottom:16}}>Invista no seu <span style={{color:'var(--gold)'}}>futuro jurídico.</span></h2>
          <div className="divider" />

          {/* ── Toggle Mensal / Anual ── */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,marginBottom:36}}>
            <div style={{display:'inline-flex',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:100,padding:4,gap:4}}>
              <button
                onClick={()=>setCiclo('mensal')}
                style={{padding:'10px 28px',borderRadius:100,border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:14,fontWeight:700,background:!ehAnual?'linear-gradient(135deg,var(--gold),var(--orange))':'transparent',color:!ehAnual?'#000':'var(--text-muted)',transition:'all 0.2s'}}>
                Mensal
              </button>
              <button
                onClick={()=>setCiclo('anual')}
                style={{padding:'10px 28px',borderRadius:100,border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:14,fontWeight:700,background:ehAnual?'linear-gradient(135deg,var(--gold),var(--orange))':'transparent',color:ehAnual?'#000':'var(--text-muted)',transition:'all 0.2s'}}>
                Anual
              </button>
            </div>
            {ehAnual && (
              <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:100,padding:'6px 16px',fontSize:13,color:'var(--success)',fontWeight:600}}>
                💎 Pagamento único · 12 meses de acesso completo
              </div>
            )}
          </div>

          <div className="planos-grid">
            {PLANS.map(plan=>(
              <div key={plan.id} style={{background:(plan as any).featured?'linear-gradient(160deg,rgba(212,168,67,0.08),var(--gray))':(plan as any).elite?'linear-gradient(160deg,rgba(232,98,26,0.08),var(--gray))':'var(--gray)',border:(plan as any).featured?'1px solid var(--gold)':(plan as any).elite?'1px solid var(--orange-light)':'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:24,position:'relative',transition:'transform 0.3s'}}>
                {(plan as any).badge&&<div style={{position:'absolute',top:16,right:16,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'var(--deep-black)',fontSize:9,fontWeight:900,letterSpacing:'1.5px',padding:'4px 10px',borderRadius:100}}>{(plan as any).badge}</div>}
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:10}}>{plan.name}</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:40,fontWeight:900,lineHeight:1,color:plan.color}}>
                  <sup style={{fontSize:16,fontWeight:600,color:'var(--text-muted)',verticalAlign:'super'}}>R$</sup>
                  {plan.id === 'free' ? plan.price : (ehAnual ? precoAnual(plan.price) : plan.price)}
                </div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginBottom: ehAnual && plan.id !== 'free' ? 4 : 20}}>
                  {plan.id === 'free' ? plan.period : (ehAnual ? '/ano' : plan.period)}
                </div>
                {ehAnual && plan.id !== 'free' && (
                  <div style={{fontSize:11,color:'var(--success)',marginBottom:16}}>Pagamento único · 12 meses</div>
                )}
                <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                  {plan.features.map((f,i)=>(
                    <li key={i} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12,lineHeight:1.5,color:f.ok?'var(--white)':'var(--text-muted)'}}>
                      <span style={{color:f.ok?'var(--success)':'var(--text-dim)',flexShrink:0,marginTop:2}}>{f.ok?'✓':'✕'}</span>{f.txt}
                    </li>
                  ))}
                </ul>
                {plan.id==='free'
                  ? <Link href="/login?modo=cadastro" className="btn-secondary" style={{display:'block',textAlign:'center',textDecoration:'none',padding:'12px',fontSize:13}}>🎁 Plano Generosidade</Link>
                  : <Link href={`/checkout?plan=${plan.id}&ciclo=${ciclo}`} className={(plan as any).featured?'btn-primary':'btn-secondary'} style={{display:'block',textAlign:'center',textDecoration:'none',padding:'12px',fontSize:13}}>
                      {(plan as any).featured?'ASSINAR AGORA':'ASSINAR'}
                    </Link>
                }
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:24,fontSize:13,color:'var(--text-muted)'}}>
            💳 PIX instantâneo ou Cartão · 🔒 Acesso liberado automaticamente · Cancele quando quiser
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{padding:'80px 24px'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="section-tag">⭐ DEPOIMENTOS</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(28px,5vw,54px)',fontWeight:900,marginBottom:16}}>Tigres que já <span style={{color:'var(--gold)'}}>foram aprovados.</span></h2>
          <div className="divider" />
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
            {[
              {n:'Fernanda O.',r:'Aprovada OAB 1ª Fase',t:'A IA jurídica me salvou nas dúvidas de madrugada. Estudei 3 meses e fui aprovada. O TigerJus é diferente de tudo que usei.'},
              {n:'Gabriel M.',r:'Aprovado OAB 2ª Fase',t:'O sistema de ranking me fez estudar mais do que qualquer cursinho. A competição saudável com outros alunos é viciante.'},
              {n:'Isabela R.',r:'Estudante 5º ano',t:'Os simulados são idênticos à OAB real. Minha taxa de acerto foi de 52% para 78% em apenas 6 semanas de uso.'},
            ].map(t=>(
              <div key={t.n} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:24}}>
                <div style={{fontSize:14,marginBottom:12}}>⭐⭐⭐⭐⭐</div>
                <p style={{fontSize:14,lineHeight:1.8,color:'var(--white)',marginBottom:16}}>"{t.t}"</p>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),var(--orange))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🐯</div>
                  <div><div style={{fontWeight:700,fontSize:14}}>{t.n}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{t.r}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{padding:'80px 24px',background:'linear-gradient(135deg,rgba(212,168,67,0.08),rgba(232,98,26,0.04))'}}>
        <div style={{maxWidth:600,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:52,marginBottom:20}}>🐯</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(28px,5vw,54px)',fontWeight:900,marginBottom:16}}>
            {settings.final_cta_title
              ? settings.final_cta_title.includes('Tigre')
                ? <>{settings.final_cta_title.split('Tigre')[0]}<span style={{color:'var(--gold)'}}>Tigre{settings.final_cta_title.split('Tigre')[1]}</span></>
                : settings.final_cta_title
              : <>Pronto para pensar<br/><span style={{color:'var(--gold)'}}>como um Tigre?</span></>
            }
          </h2>
          <p style={{color:'var(--text-muted)',fontSize:16,marginBottom:36,lineHeight:1.7}}>
            {settings.final_cta_subtitle||'Mais de 12.400 estudantes já estão evoluindo. Comece grátis e sinta a diferença.'}
          </p>
          <Link href="/login?modo=cadastro" className="btn-primary" style={{fontSize:16,padding:'16px 48px',display:'inline-block'}}>
            {settings.final_cta_button||'COMEÇAR AGORA'}
          </Link>
          <div style={{marginTop:16,fontSize:13,color:'var(--text-muted)'}}>
            {settings.final_cta_footer||'Sem cartão de crédito · Acesso imediato · 3 dias grátis'}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:'var(--tj-bg, #060a12)',borderTop:'1px solid var(--tj-border, rgba(99,130,200,0.15))',padding:'36px 24px',textAlign:'center'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,letterSpacing:2,color:'var(--gold)',marginBottom:10}}>{settings.site_name||'TIGERJUS'}</div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:14}}>"{settings.hero_quote||'Não basta estudar Direito. É preciso pensar como um Tigre.'}"</div>
        {sociais.length > 0 && (
          <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:16,flexWrap:'wrap'}}>
            {sociais.map(s=>(
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label}
                style={{width:38,height:38,borderRadius:10,background:s.color,border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,textDecoration:'none'}}>
                {s.icon}
              </a>
            ))}
          </div>
        )}
        <div style={{display:'flex',gap:20,justifyContent:'center',flexWrap:'wrap',fontSize:12,color:'var(--text-dim)'}}>
          <span>{settings.footer_copyright||'© 2025 TigerJus'}</span>
          <Link href="/privacidade" style={{color:'var(--text-dim)',textDecoration:'none'}}>Privacidade</Link>
          <Link href="/termos" style={{color:'var(--text-dim)',textDecoration:'none'}}>Termos</Link>
          {settings.email_suporte
            ? <a href={`mailto:${settings.email_suporte}`} style={{color:'var(--text-dim)',textDecoration:'none'}}>{settings.email_suporte}</a>
            : <a href="mailto:contato@tigerjus.com.br" style={{color:'var(--text-dim)',textDecoration:'none'}}>contato@tigerjus.com.br</a>
          }
        </div>
      </footer>

      <style>{`
        @keyframes fadeInUp   { from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);} }
        @keyframes fadeInDown { from{opacity:0;transform:translateY(-16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes pulse      { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(0.9);} }

        .planos-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          align-items: stretch;
        }
        @media (max-width: 1100px) {
          .planos-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .planos-grid { grid-template-columns: 1fr; }
        }

        .landing-nav-desktop { display: flex !important; }
        .landing-nav-mobile  { display: none !important; }

        .teste-mobile-banner { display: none; }
        .teste-mobile-tigre  { display: none; }

        .desktop-top-banner  { display:block; width:100%; margin-top:60px; overflow:hidden; line-height:0; }
        .mobile-top-banner   { display:none; }
        .desktop-hero-media  { display:flex; flex-shrink:0; max-width:48vw; align-items:center; justify-content:center; }
        .mobile-hero-tiger   { display:none; }

        @media (max-width: 768px) {
          .landing-nav-desktop { display: none !important; }
          .landing-nav-mobile  { display: flex !important; }

          .teste-mobile-banner {
            display: block !important;
            position: relative;
            z-index: 9999;
            width: 100%;
            margin-top: 60px;
            overflow: hidden;
            line-height: 0;
          }
          .teste-mobile-banner img {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            object-fit: cover !important;
          }

          .teste-mobile-tigre {
            display: block !important;
            position: relative;
            z-index: 9999;
            width: 100%;
            padding: 0;
            margin: 24px 0;
            text-align: center;
          }
          .teste-mobile-tigre img {
            display: block !important;
            margin: 0 auto !important;
            width: min(78vw, 300px) !important;
            height: auto !important;
            object-fit: contain !important;
          }

          .desktop-top-banner { display: none !important; }
          .mobile-top-banner  { display: block !important; width: 100% !important; overflow: hidden !important; line-height: 0 !important; }
          .mobile-top-banner img { display: block !important; width: 100% !important; height: auto !important; min-height: 60px !important; object-fit: cover !important; }
          .desktop-hero-media { display: none !important; }
          .mobile-hero-tiger  { display: flex !important; width: 100% !important; justify-content: center !important; align-items: center !important; margin: 24px auto 32px !important; position: relative !important; z-index: 20 !important; }
          .mobile-hero-tiger img { display: block !important; width: min(78vw, 320px) !important; height: auto !important; object-fit: contain !important; }
        }
      `}</style>
    </div>
  )
}
