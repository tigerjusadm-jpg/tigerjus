'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string; nome: string; email: string; plano: string
  xp: number; level: number; level_name: string; streak: number
  free_questions_used: number; free_ia_used: number
  questoes_respondidas: number; questoes_corretas: number
  role?: string
}

type LevelName = 'Filhote' | 'Caçador' | 'Alpha' | 'Tigre Supremo' | 'Mestre TigerJus'

const XP_NEXT: Record<LevelName, number> = {
  'Filhote': 1000, 'Caçador': 5000, 'Alpha': 15000,
  'Tigre Supremo': 40000, 'Mestre TigerJus': 999999,
}
const XP_PREV: Record<LevelName, number> = {
  'Filhote': 0, 'Caçador': 1000, 'Alpha': 5000,
  'Tigre Supremo': 15000, 'Mestre TigerJus': 40000,
}

const PLANS_UPGRADE = [
  { id:'start', name:'Tiger Start', price:'1,99', color:'var(--success)', features:['Questões ilimitadas','IA intermediária','Mais simulados','Streak + ranking'] },
  { id:'plus', name:'Tiger Plus', price:'5,99', color:'var(--blue)', features:['Simulados completos','Mapas mentais','PDFs premium','IA ampliada'] },
  { id:'pro', name:'Tiger Pro', price:'9,99', color:'var(--gold)', badge:'POPULAR', featured:true, features:['IA avançada ilimitada','Radar jurídico','Trilhas personalizadas','Previsão de aprovação'] },
  { id:'elite', name:'Tiger Elite', price:'19,99', color:'var(--orange)', badge:'TOP', features:['Tudo ilimitado','IA prioritária','Conteúdos exclusivos','Simulados inéditos'] },
]

const DISCIPLINES = [
  {id:1,icon:'⚖️',name:'Constitucional',slug:'constitucional',progress:68,q:142,tags:['Quiz','Resumo','Flash','PDF']},
  {id:2,icon:'🏛️',name:'Administrativo',slug:'administrativo',progress:45,q:98,tags:['Quiz','Resumo','Flash']},
  {id:3,icon:'🔒',name:'Penal',slug:'penal',progress:72,q:210,tags:['Quiz','Resumo','Flash','PDF']},
  {id:4,icon:'🔍',name:'Processo Penal',slug:'processo-penal',progress:38,q:156,tags:['Quiz','Resumo']},
  {id:5,icon:'📋',name:'Civil',slug:'civil',progress:55,q:187,tags:['Quiz','Resumo','Flash','PDF']},
  {id:6,icon:'⚡',name:'Processo Civil',slug:'processo-civil',progress:30,q:134,tags:['Quiz','Resumo']},
  {id:7,icon:'🦺',name:'Trabalho',slug:'trabalho',progress:60,q:112,tags:['Quiz','Flash','PDF']},
  {id:8,icon:'👷',name:'Proc. Trabalho',slug:'proc-trabalho',progress:25,q:89,tags:['Quiz','Resumo']},
  {id:9,icon:'💰',name:'Tributário',slug:'tributario',progress:42,q:76,tags:['Quiz','Resumo','Flash']},
  {id:10,icon:'🏢',name:'Empresarial',slug:'empresarial',progress:35,q:93,tags:['Quiz','Resumo']},
  {id:11,icon:'📜',name:'Ética OAB',slug:'etica',progress:80,q:64,tags:['Quiz','Resumo','PDF']},
  {id:12,icon:'🛒',name:'Consumidor',slug:'consumidor',progress:50,q:55,tags:['Quiz','Flash']},
  {id:13,icon:'🌍',name:'Direitos Humanos',slug:'direitos-humanos',progress:28,q:48,tags:['Quiz','Resumo']},
  {id:14,icon:'🌿',name:'Ambiental',slug:'ambiental',progress:20,q:42,tags:['Quiz']},
  {id:15,icon:'📖',name:'Filosofia',slug:'filosofia',progress:15,q:30,tags:['Resumo','Flash']},
  {id:16,icon:'🌐',name:'Internacional',slug:'internacional',progress:22,q:38,tags:['Quiz','Resumo']},
  {id:17,icon:'👶',name:'ECA',slug:'eca',progress:32,q:44,tags:['Quiz','Flash']},
]

const QUESTIONS = [
  {id:1,disc:'Constitucional',dificuldade:'Médio',q:'Segundo a CF/88, o mandado de segurança pode ser impetrado por:',
    opts:['Qualquer pessoa natural ou jurídica','Apenas pessoas naturais','Apenas partidos políticos','Apenas o Ministério Público'],correct:0,
    exp:'O MS pode ser impetrado por qualquer pessoa natural ou jurídica para proteger direito líquido e certo não amparado por HC ou HD (art. 5º, LXIX, CF/88).'},
  {id:2,disc:'Direito Penal',dificuldade:'Fácil',q:'De acordo com o Código Penal, o crime é culposo quando o agente:',
    opts:['Quis o resultado','Assumiu o risco de produzi-lo','Deu causa ao resultado por imprudência, negligência ou imperícia','Agiu com dolo eventual'],correct:2,
    exp:'Crime culposo: agente dá causa ao resultado por imprudência, negligência ou imperícia (art. 18, II, CP).'},
  {id:3,disc:'Direito Civil',dificuldade:'Fácil',q:'Segundo o Código Civil, são absolutamente incapazes:',
    opts:['Os menores de 16 anos','Os ébrios habituais','Os pródigos','Os maiores de 70 anos'],correct:0,
    exp:'Após a Lei 13.146/2015, apenas os menores de 16 anos são absolutamente incapazes (art. 3º, CC).'},
  {id:4,disc:'Ética OAB',dificuldade:'Médio',q:'O advogado tem dever de guardar sigilo das informações do cliente:',
    opts:['Apenas durante o mandato','Apenas se houver cláusula contratual','Mesmo após o encerramento do mandato','Somente perante terceiros'],correct:2,
    exp:'O sigilo profissional é permanente, mesmo após encerramento do mandato (art. 34, VII, Estatuto OAB).'},
  {id:5,disc:'Processo Civil',dificuldade:'Difícil',q:'O prazo para contestação no CPC/2015 é de:',
    opts:['10 dias úteis','15 dias úteis','20 dias úteis','30 dias corridos'],correct:1,
    exp:'Conforme art. 335 do CPC/2015, o réu pode oferecer contestação em 15 dias úteis (art. 219 CPC).'},
]

const RANKING_DATA = [
  {pos:1,name:'Rafael M.',level:'Tigre Supremo',xp:48200,streak:45,av:'🦁'},
  {pos:2,name:'Ana C.',level:'Alpha',xp:41800,streak:38,av:'⚡'},
  {pos:3,name:'Lucas F.',level:'Alpha',xp:39500,streak:22,av:'🔥'},
  {pos:4,name:'Beatriz S.',level:'Caçador',xp:28900,streak:15,av:'🎯'},
  {pos:5,name:'Você',level:'Caçador',xp:18400,streak:7,av:'🐯',me:true},
  {pos:6,name:'Carlos L.',level:'Caçador',xp:14200,streak:9,av:'⚖️'},
  {pos:7,name:'Marina T.',level:'Filhote',xp:8900,streak:4,av:'📚'},
]

const RESUMOS: Record<string, string> = {
  constitucional: `**DIREITO CONSTITUCIONAL — RESUMO ESSENCIAL**

📌 **Estrutura da CF/88**
A Constituição Federal de 1988 é rígida, analítica e promulgada. Organiza-se em 9 títulos.

📌 **Direitos Fundamentais (Art. 5º)**
São cláusulas pétreas. Principais garantias:
- Habeas Corpus — liberdade de locomoção
- Mandado de Segurança — direito líquido e certo
- Habeas Data — informações pessoais
- Mandado de Injunção — omissão legislativa

📌 **Princípios Fundamentais**
- Soberania, Cidadania, Dignidade da pessoa humana
- Valores sociais do trabalho e da livre iniciativa
- Pluralismo político

📌 **Organização dos Poderes**
- Executivo, Legislativo e Judiciário — independentes e harmônicos
- Sistema de freios e contrapesos`,

  penal: `**DIREITO PENAL — RESUMO ESSENCIAL**

📌 **Teoria do Crime**
Crime = Fato típico + Ilicitude + Culpabilidade

📌 **Dolo e Culpa**
- Dolo direto: quis o resultado
- Dolo eventual: assumiu o risco
- Culpa: imprudência, negligência ou imperícia

📌 **Excludentes de Ilicitude (Art. 23 CP)**
- Estado de necessidade
- Legítima defesa
- Estrito cumprimento do dever legal`,

  civil: `**DIREITO CIVIL — RESUMO ESSENCIAL**

📌 **Capacidade**
- Plena: maiores de 18 anos não incapazes
- Absolutamente incapaz: menores de 16 anos (art. 3º CC)
- Relativamente incapaz: 16-18 anos, ébrios habituais, pródigos

📌 **Responsabilidade Civil**
- Subjetiva: necessita de culpa
- Objetiva: independe de culpa (risco da atividade)`,
}

function UpgradeModal({ onClose, onSelect }: { onClose: () => void; onSelect: (plan: string) => void }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.95)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:900,position:'relative',padding:'20px 0'}}>
        <button onClick={onClose} style={{position:'absolute',top:-10,right:0,background:'none',border:'none',color:'#888',fontSize:24,cursor:'pointer',zIndex:10}}>✕</button>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🚀</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:900,marginBottom:8}}>Escolha seu <span style={{color:'var(--gold)'}}>plano</span></h2>
          <p style={{color:'var(--text-muted)',fontSize:15}}>Desbloqueie todo o potencial do TigerJus</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16}}>
          {PLANS_UPGRADE.map(plan => (
            <div key={plan.id} style={{background:(plan as any).featured?'linear-gradient(160deg,rgba(212,168,67,0.1),rgba(30,30,30,1))':'rgba(20,20,20,0.9)',border:(plan as any).featured?'1px solid var(--gold)':'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:24,position:'relative',cursor:'pointer',transition:'transform 0.2s'}}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
              {(plan as any).badge && <div style={{position:'absolute',top:16,right:16,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'#000',fontSize:9,fontWeight:900,letterSpacing:'1.5px',padding:'4px 10px',borderRadius:100}}>{(plan as any).badge}</div>}
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{plan.name}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:38,fontWeight:900,color:plan.color,marginBottom:4}}>
                <sup style={{fontSize:15,color:'var(--text-muted)',verticalAlign:'super'}}>R$</sup>{plan.price}
              </div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:20}}>/mês</div>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                {plan.features.map((f,i) => (
                  <li key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--white)'}}>
                    <span style={{color:'var(--success)'}}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => onSelect(plan.id)} className={(plan as any).featured ? 'btn-primary' : 'btn-secondary'} style={{width:'100%',fontSize:13,padding:'12px'}}>
                {(plan as any).featured ? 'ASSINAR AGORA' : 'ASSINAR'}
              </button>
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

function Notification({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{position:'fixed',top:90,right:24,zIndex:150,background:'var(--gray)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:14,padding:'16px 20px',minWidth:280,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',animation:'fadeInDown 0.4s ease'}}>
      <div style={{fontSize:12,fontWeight:700,color:'var(--gold)',marginBottom:4}}>🐯 TigerJus</div>
      <div style={{fontSize:13,color:'var(--text-muted)'}}>{msg}</div>
    </div>
  )
}

function XPTooltip({ xp, levelName }: { xp: number; levelName: LevelName }) {
  const [show, setShow] = useState(false)
  const xpNext = XP_NEXT[levelName] || 5000
  const xpPrev = XP_PREV[levelName] || 0
  const pct = Math.min(100, Math.round(((xp - xpPrev) / (xpNext - xpPrev)) * 100))
  return (
    <div style={{position:'relative',display:'inline-block'}} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{cursor:'help',borderBottom:'1px dashed rgba(212,168,67,0.4)',color:'var(--gold)',fontWeight:700}}>
        {xp.toLocaleString()} XP ℹ️
      </span>
      {show && (
        <div style={{position:'absolute',top:'calc(100% + 8px)',left:'50%',transform:'translateX(-50%)',background:'#1a1a1a',border:'1px solid rgba(212,168,67,0.25)',borderRadius:12,padding:16,width:280,zIndex:100,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--gold)',marginBottom:8}}>O que é XP?</div>
          <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6,marginBottom:12}}>XP representa seus pontos de evolução. Quanto mais você estudar, mais XP acumula e sobe de nível.</div>
          <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6}}>Progresso atual: <strong style={{color:'var(--gold)'}}>{pct}%</strong></div>
          <div style={{background:'rgba(255,255,255,0.08)',borderRadius:100,height:6,overflow:'hidden'}}>
            <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100}} />
          </div>
          <div style={{marginTop:10,fontSize:11,color:'var(--text-dim)'}}>Faltam <strong style={{color:'var(--gold)'}}>{(xpNext - xp).toLocaleString()} XP</strong> para o próximo nível</div>
          <div style={{marginTop:8,fontSize:11,color:'var(--text-muted)'}}>💡 Questão certa = +100 XP · Simulado = +500 XP · Login diário = +50 XP</div>
        </div>
      )}
    </div>
  )
}

function PremiumGate({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.93)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.22)',borderRadius:24,padding:'48px 40px',textAlign:'center',maxWidth:480,width:'100%'}}>
        <div style={{fontSize:54,marginBottom:18}}>🔒</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:900,lineHeight:1.2,marginBottom:14}}>Seu modo<br/><span style={{color:'var(--gold)'}}>degustação terminou.</span></h2>
        <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28,lineHeight:1.7}}>Você atingiu o limite gratuito. Assine e continue evoluindo sem parar.</p>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28,textAlign:'left'}}>
          {['IA ilimitada','Simulados completos OAB','Radar TigerJus','Trilhas personalizadas','Mapas mentais e PDFs'].map((l,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.12)',borderRadius:10,padding:'12px 16px',fontSize:13}}>
              <span style={{color:'var(--success)'}}>✓</span><span>{l}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{width:'100%',marginBottom:12,fontSize:15,padding:16}} onClick={onUpgrade}>🚀 VER PLANOS</button>
        <button className="btn-secondary" style={{width:'100%',fontSize:12}} onClick={onClose}>Continuar no plano gratuito</button>
        <div style={{marginTop:16,fontSize:11,color:'var(--text-dim)'}}>A partir de R$1,99/mês · Cancele quando quiser</div>
      </div>
    </div>
  )
}

function DashHome({ profile, onNav, showUpgrade }: any) {
  const xp = profile?.xp || 0
  const levelName = (profile?.level_name || 'Filhote') as LevelName
  const streak = profile?.streak || 0
  const xpNext = XP_NEXT[levelName] || 1000
  const xpPrev = XP_PREV[levelName] || 0
  const pct = Math.min(100, Math.round(((xp - xpPrev) / (xpNext - xpPrev)) * 100))
  const questoes = profile?.questoes_respondidas || 0
  const corretas = profile?.questoes_corretas || 0
  const taxa = questoes > 0 ? Math.round((corretas / questoes) * 100) : 0

  return (
    <div style={{padding:'32px 40px',flex:1,overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Olá, {profile?.nome?.split(' ')[0] || levelName}! 🔥</h1>
          <p style={{fontSize:15,color:'var(--text-muted)'}}>
            {streak > 0 ? `Você está em uma sequência de ` : 'Comece seus estudos hoje. '}
            {streak > 0 && <span style={{color:'var(--gold)'}}>{streak} dias</span>}
            {streak > 0 && ' de estudo. Continue!'}
          </p>
        </div>
        {streak > 0 && <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(232,98,26,0.1)',border:'1px solid rgba(232,98,26,0.25)',borderRadius:100,padding:'8px 16px',fontSize:13,fontWeight:700,color:'var(--orange)'}}>🔥 {streak} dias seguidos</div>}
      </div>
      <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.12),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:32,marginBottom:24,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-16,top:-16,fontSize:120,opacity:0.04,pointerEvents:'none'}}>🐯</div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--gold)',marginBottom:8}}>NÍVEL — {levelName.toUpperCase()}</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:4}}><XPTooltip xp={xp} levelName={levelName} /></div>
        <div style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>{xp < xpNext ? `${(xpNext - xp).toLocaleString()} XP para o próximo nível 🏆` : 'Nível máximo atingido! 👑'}</div>
        <div style={{background:'rgba(255,255,255,0.08)',borderRadius:100,height:8,overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 1s ease'}} />
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:11,color:'var(--text-muted)'}}>
          <span>{levelName}</span><span>{pct}%</span><span>Próximo nível</span>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:14,marginBottom:28}}>
        {[
          {label:'Questões',value:questoes.toLocaleString(),cls:'var(--gold)',sub:'respondidas'},
          {label:'Taxa Acerto',value:`${taxa}%`,cls:'var(--success)',sub:'de aproveitamento'},
          {label:'Streak',value:`${streak} 🔥`,cls:'var(--orange)',sub:'dias seguidos'},
          {label:'XP Total',value:xp.toLocaleString(),cls:'var(--gold)',sub:'pontos ganhos'},
        ].map(s=>(
          <div key={s.label} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:20}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:10}}>{s.label}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:s.cls}}>{s.value}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:16,padding:20,marginBottom:24,cursor:'pointer'}} onClick={() => onNav('quiz')}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:4}}>⚡ QUESTÃO DO DIA</div>
            <div style={{fontWeight:700,fontSize:16}}>Penal — Teoria do Crime: Tipicidade</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>+150 XP bônus ao responder hoje</div>
          </div>
          <button className="btn-gold-sm">RESPONDER +150 XP</button>
        </div>
      </div>
      <div style={{background:'linear-gradient(135deg,rgba(58,143,232,0.08),rgba(212,168,67,0.06))',border:'1px solid rgba(58,143,232,0.2)',borderRadius:16,padding:24,marginBottom:28,cursor:'pointer'}} onClick={() => showUpgrade()}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
          <span style={{fontSize:20}}>🎯</span>
          <div style={{fontSize:16,fontWeight:700,flex:1}}>Radar TigerJus</div>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:'1.5px',textTransform:'uppercase',background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.2)',color:'var(--gold)',padding:'4px 10px',borderRadius:100}}>🔒 Premium</div>
        </div>
        <div style={{fontSize:13,color:'var(--text-muted)'}}>Temas com maior probabilidade de cair na próxima OAB.</div>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900}}>Disciplinas em destaque</h2>
        <button style={{color:'var(--gold)',fontSize:13,border:'none',background:'none',cursor:'pointer'}} onClick={() => onNav('disciplines')}>Ver todas →</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14}}>
        {DISCIPLINES.slice(0,6).map(d=>(
          <div key={d.id} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:20,cursor:'pointer',transition:'all 0.2s'}}
            onClick={() => onNav('disciplines')}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.2)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{fontSize:24,marginBottom:12}}>{d.icon}</div>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{d.name}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>{d.progress}% · {d.q} questões</div>
            <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,overflow:'hidden',marginBottom:10}}>
              <div style={{width:`${d.progress}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100}} />
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {d.tags.slice(0,3).map(t=><span key={t} style={{fontSize:9,padding:'2px 7px',background:'rgba(212,168,67,0.07)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:4,color:'var(--gold-dark)',fontWeight:600}}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuizPage({ freeQ, setFreeQ, showUpgrade, onXp, profile }: any) {
  const [disciplina, setDisciplina] = useState<string>('')
  const [dificuldade, setDificuldade] = useState<string>('')
  const [quantidade, setQuantidade] = useState<number>(5)
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [cur, setCur] = useState(0)
  const [sel, setSel] = useState<number|null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [time, setTime] = useState(90)

  useEffect(() => {
    if (!started || answered || done) return
    const t = setInterval(() => setTime(p => { if (p<=1) { clearInterval(t); setAnswered(true); return 0; } return p-1 }), 1000)
    return () => clearInterval(t)
  }, [started, answered, done, cur])

  const startQuiz = () => {
    let filtered = QUESTIONS
    if (disciplina) filtered = filtered.filter(q => q.disc.toLowerCase().includes(disciplina.toLowerCase()))
    if (dificuldade) filtered = filtered.filter(q => q.dificuldade === dificuldade)
    const selected = filtered.slice(0, quantidade)
    setQuestions(selected.length === 0 ? QUESTIONS.slice(0, quantidade) : selected)
    setStarted(true); setCur(0); setSel(null); setAnswered(false); setScore(0); setDone(false); setTime(90)
  }

  const pick = (i: number) => {
    if (answered) return
    if (freeQ <= 0) { showUpgrade(); return }
    setSel(i); setAnswered(true); setFreeQ((p:number) => p-1)
    if (i === questions[cur].correct) { setScore(p=>p+1); onXp('question_correct') }
    else onXp('question_wrong')
  }

  const next = () => {
    if (cur+1 >= questions.length) { setDone(true); return }
    setCur(p=>p+1); setSel(null); setAnswered(false); setTime(90)
  }

  const restart = () => { setStarted(false); setDone(false); setScore(0); setCur(0) }

  if (!started) return (
    <div style={{padding:'32px 40px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Quiz 📝</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:32}}>Configure seu quiz e comece a treinar.</p>
      <div style={{maxWidth:600,background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:36}}>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:10}}>Disciplina</label>
          <select value={disciplina} onChange={e => setDisciplina(e.target.value)} style={{width:'100%',background:'var(--gray-mid)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'12px 16px',color:'var(--white)',fontSize:14,fontFamily:'var(--font-body)'}}>
            <option value="">Todas as disciplinas</option>
            {DISCIPLINES.map(d => <option key={d.id} value={d.name}>{d.icon} {d.name}</option>)}
          </select>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:10}}>Dificuldade</label>
          <div style={{display:'flex',gap:10}}>
            {['','Fácil','Médio','Difícil'].map(d => (
              <button key={d} onClick={() => setDificuldade(d)} style={{flex:1,padding:'10px',borderRadius:10,border:dificuldade===d?'1px solid rgba(212,168,67,0.4)':'1px solid rgba(255,255,255,0.08)',background:dificuldade===d?'rgba(212,168,67,0.1)':'transparent',color:dificuldade===d?'var(--gold)':'var(--text-muted)',fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)'}}>
                {d || 'Todas'}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:32}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:10}}>Quantidade: <span style={{color:'var(--gold)'}}>{quantidade} questões</span></label>
          <input type="range" min={1} max={15} value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} style={{width:'100%',accentColor:'var(--gold)'}} />
        </div>
        <button className="btn-primary" style={{width:'100%',fontSize:15,padding:16}} onClick={startQuiz}>INICIAR QUIZ →</button>
        <div style={{marginTop:12,textAlign:'center',fontSize:12,color:'var(--text-muted)'}}>
          {freeQ > 0 ? `${freeQ} questões grátis restantes` : '🔒 Limite gratuito atingido'}
        </div>
      </div>
    </div>
  )

  const q = questions[cur]
  const pct = Math.round(((cur + (answered?1:0)) / questions.length) * 100)

  if (done) {
    const rate = Math.round((score / questions.length) * 100)
    return (
      <div style={{padding:'32px 40px',flex:1}}>
        <div style={{maxWidth:720,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:68,marginBottom:22}}>{rate>=70?'🏆':rate>=50?'📝':'💪'}</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Quiz Concluído!</h1>
          <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>{score} de {questions.length} questões corretas</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:28}}>
            {[['Taxa de Acerto',`${rate}%`,rate>=70?'var(--gold)':'var(--orange)'],['XP Ganho',`+${score*100}`,'var(--gold)'],['Estimativa',rate>=60?'Aprovado ✓':'Treinar mais',rate>=60?'var(--success)':'var(--orange)']].map(([l,v,c]) => (
              <div key={l} style={{background:'var(--gray)',borderRadius:14,padding:20,border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{l}</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button className="btn-primary" onClick={restart}>NOVO QUIZ</button>
            <button className="btn-secondary" onClick={restart}>VER GABARITO</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:'32px 40px',flex:1}}>
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontSize:14,color:'var(--text-muted)'}}>Questão {cur+1} de {questions.length}</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:20,fontWeight:700,color:time<20?'var(--danger)':'var(--gold)'}}>{String(Math.floor(time/60)).padStart(2,'0')}:{String(time%60).padStart(2,'0')}</div>
        </div>
        <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:28,overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}} />
        </div>
        <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:36}}>
          <div style={{display:'flex',gap:10,marginBottom:18}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)'}}>{q.disc}</span>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--text-muted)'}}>· {q.dificuldade}</span>
          </div>
          <div style={{fontSize:18,fontWeight:600,lineHeight:1.6,marginBottom:32}}>{q.q}</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {q.opts.map((opt: string, i: number) => {
              let bg='rgba(255,255,255,0.03)', bc='rgba(255,255,255,0.08)', color='var(--white)'
              if (answered) {
                if (i===q.correct) { bg='rgba(76,175,125,0.1)'; bc='var(--success)'; color='var(--success)' }
                else if (i===sel) { bg='rgba(232,66,26,0.1)'; bc='var(--danger)'; color='var(--danger)' }
              } else if (sel===i) { bg='rgba(212,168,67,0.08)'; bc='rgba(212,168,67,0.5)' }
              return (
                <button key={i} onClick={() => pick(i)} style={{display:'flex',alignItems:'flex-start',gap:16,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'16px 20px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:14,color}}>
                  <span style={{width:28,height:28,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,background:'rgba(255,255,255,0.06)'}}>{String.fromCharCode(65+i)}</span>
                  <span style={{flex:1}}>{opt}</span>
                </button>
              )
            })}
          </div>
          {answered && <div style={{marginTop:24,padding:20,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:14,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> {q.exp}</div>}
          {answered && <button className="btn-primary" style={{width:'100%',marginTop:22}} onClick={next}>{cur+1>=questions.length?'VER RESULTADO':'PRÓXIMA QUESTÃO →'}</button>}
        </div>
      </div>
    </div>
  )
}

function IAPage({ freeIA, setFreeIA, showUpgrade, profile }: any) {
  const [msgs, setMsgs] = useState([{role:'assistant',text:'Olá! Sou o TigerJus AI — seu tutor jurídico de alta performance. 🐯⚖️\n\nPosso te ajudar com dúvidas de Direito, explicar artigos, resumir temas e te preparar para a OAB.\n\nO que você quer aprender hoje?'}])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}) }, [msgs])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return
    if (freeIA <= 0) { showUpgrade(); return }
    setInput(''); setFreeIA((p:number) => p-1)
    const newMsgs = [...msgs, {role:'user',text:msg}]
    setMsgs(newMsgs); setLoading(true)
    try {
      const res = await fetch('/api/ia', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages: newMsgs.slice(1).map(m => ({role:m.role,content:m.text})), userId: profile?.id, plan: profile?.plano || 'gratuito' }) })
      const data = await res.json()
      if (data.error === 'LIMIT_REACHED') { showUpgrade(); return }
      setMsgs(p => [...p, {role:'assistant',text:data.text || 'Erro ao conectar. Tente novamente.'}])
    } catch {
      setMsgs(p => [...p, {role:'assistant',text:'Erro ao conectar com a IA. Verifique sua conexão e tente novamente.'}])
    } finally { setLoading(false) }
  }

  const chips = ['Explique habeas corpus','O que é dolo eventual?','Resumir Constitucional','Cláusula pétrea','Princípio da legalidade penal','O que é mandado de injunção?']

  return (
    <div style={{padding:'32px 40px',flex:1,display:'flex',flexDirection:'column'}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>IA Jurídica 🤖</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:16}}>
        Tutor inteligente 24/7.
        {freeIA>0 ? <span style={{marginLeft:8,color:'var(--gold)',fontWeight:700}}>{freeIA} perguntas grátis restantes</span> : <span style={{marginLeft:8,color:'var(--danger)'}}>🔒 Limite atingido</span>}
      </p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
        {chips.map(c => (
          <button key={c} onClick={() => send(c)} style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.14)',borderRadius:100,padding:'6px 14px',fontSize:12,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font-body)'}}>{c}</button>
        ))}
      </div>
      <div style={{flex:1,background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:400}}>
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:16,padding:24}}>
          {msgs.map((m,i) => (
            <div key={i} style={{display:'flex',gap:12,maxWidth:'82%',alignSelf:m.role==='user'?'flex-end':'flex-start',flexDirection:m.role==='user'?'row-reverse':'row'}}>
              <div style={{width:36,height:36,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,background:m.role==='user'?'var(--gray-light)':'linear-gradient(135deg,var(--gold),var(--orange))'}}>{m.role==='user'?'👤':'🐯'}</div>
              <div style={{background:m.role==='user'?'rgba(212,168,67,0.1)':'rgba(255,255,255,0.04)',border:m.role==='user'?'1px solid rgba(212,168,67,0.2)':'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px 18px',fontSize:14,lineHeight:1.7,color:'var(--white)',whiteSpace:'pre-wrap'}}>{m.text}</div>
            </div>
          ))}
          {loading && <div style={{display:'flex',gap:12,maxWidth:'82%'}}><div style={{width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,var(--gold),var(--orange))'}}>🐯</div><div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px 18px',fontSize:14,opacity:0.6,fontStyle:'italic'}}>Analisando sua pergunta...</div></div>}
          <div ref={endRef} />
        </div>
        <div style={{display:'flex',gap:12,padding:16,background:'var(--gray-mid)',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <textarea className="form-input" placeholder="Pergunte algo jurídico..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }} style={{flex:1,resize:'none',minHeight:44}} rows={1} />
          <button onClick={() => send()} style={{background:'linear-gradient(135deg,var(--gold),var(--orange))',border:'none',borderRadius:10,width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18,color:'var(--deep-black)'}}>➤</button>
        </div>
      </div>
    </div>
  )
}

function DisciplinesPage({ showUpgrade, profile }: any) {
  const [selected, setSelected] = useState<any>(null)
  const [subTab, setSubTab] = useState<'resumo'|'quiz'|'flash'|'pdf'>('resumo')

  if (selected) {
    const resumo = RESUMOS[selected.slug] || `**${selected.name.toUpperCase()}**\n\nResumo completo em breve. Use a IA Jurídica para tirar dúvidas sobre esta disciplina!`
    return (
      <div style={{padding:'32px 40px',flex:1}}>
        <button onClick={() => setSelected(null)} style={{display:'flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,border:'none',background:'none',cursor:'pointer',marginBottom:24,fontFamily:'var(--font-body)'}}>← Voltar às disciplinas</button>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
          <span style={{fontSize:40}}>{selected.icon}</span>
          <div>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900}}>{selected.name}</h1>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>{selected.q} questões · {selected.progress}% concluído</p>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
          {(['resumo','quiz','flash','pdf'] as const).map(t => {
            const available = selected.tags.map((tag: string) => tag.toLowerCase()).includes(t)
            return (
              <button key={t} onClick={() => available ? setSubTab(t) : showUpgrade()} style={{padding:'10px 20px',borderRadius:10,border:subTab===t?'1px solid rgba(212,168,67,0.4)':'1px solid rgba(255,255,255,0.08)',background:subTab===t?'rgba(212,168,67,0.1)':'transparent',color:subTab===t?'var(--gold)':'var(--text-muted)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)',textTransform:'capitalize'}}>
                {t === 'resumo' ? '📖 Resumo' : t === 'quiz' ? '📝 Quiz' : t === 'flash' ? '🃏 Flashcards' : '📄 PDF'}{!available && ' 🔒'}
              </button>
            )
          })}
        </div>
        {subTab === 'resumo' && (
          <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:36}}>
            <div style={{fontSize:14,lineHeight:1.9,color:'var(--text-muted)',whiteSpace:'pre-wrap'}}>
              {resumo.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,color:'var(--white)',marginBottom:16,marginTop:i>0?24:0}}>{line.replace(/\*\*/g,'')}</div>
                if (line.startsWith('📌 **')) return <div key={i} style={{fontWeight:700,color:'var(--gold)',fontSize:15,marginTop:20,marginBottom:8}}>{line.replace(/\*\*/g,'')}</div>
                if (line.startsWith('•')) return <div key={i} style={{paddingLeft:16,marginBottom:4}}>{line}</div>
                return <div key={i} style={{marginBottom:4}}>{line}</div>
              })}
            </div>
          </div>
        )}
        {subTab === 'flash' && <FlashCards disciplina={selected.name} />}
        {subTab === 'pdf' && (
          <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:48,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>📄</div>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,marginBottom:8}}>PDF — {selected.name}</h3>
            <p style={{color:'var(--text-muted)',marginBottom:24}}>Material completo em PDF para download.</p>
            <button className="btn-primary" onClick={() => showUpgrade()}>🔒 DESBLOQUEAR PDF</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{padding:'32px 40px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Disciplinas 📚</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>17 disciplinas com resumos, quizzes, flashcards e PDFs exclusivos.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14}}>
        {DISCIPLINES.map(d => (
          <div key={d.id} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:20,cursor:'pointer',transition:'all 0.2s'}}
            onClick={() => setSelected(d)}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(212,168,67,0.2)'; e.currentTarget.style.transform='translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; e.currentTarget.style.transform='translateY(0)' }}>
            <div style={{fontSize:24,marginBottom:12}}>{d.icon}</div>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{d.name}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>{d.progress}% · {d.q} questões</div>
            <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,overflow:'hidden',marginBottom:10}}>
              <div style={{width:`${d.progress}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100}} />
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {d.tags.slice(0,3).map(t => <span key={t} style={{fontSize:9,padding:'2px 7px',background:'rgba(212,168,67,0.07)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:4,color:'var(--gold-dark)',fontWeight:600}}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FlashCards({ disciplina }: { disciplina: string }) {
  const cards = [
    {front:'O que é Habeas Corpus?',back:'Remédio constitucional que protege a liberdade de locomoção (art. 5º, LXVIII, CF/88).'},
    {front:'O que é Mandado de Segurança?',back:'Protege direito líquido e certo não amparado por HC ou HD (art. 5º, LXIX, CF/88).'},
    {front:'O que são Cláusulas Pétreas?',back:'Limitações materiais ao poder de reforma. Não podem ser abolidas: forma federativa, voto, separação dos poderes e direitos fundamentais (art. 60, §4º, CF/88).'},
    {front:'O que é Dolo Eventual?',back:'O agente prevê o resultado como possível e assume o risco de produzi-lo (art. 18, I, CP).'},
    {front:'Prescrição x Decadência?',back:'Prescrição: extingue a pretensão. Decadência: extingue o direito. Prescrição pode ser interrompida; decadência não.'},
  ]
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  return (
    <div style={{maxWidth:600}}>
      <div style={{marginBottom:16,fontSize:13,color:'var(--text-muted)'}}>Card {idx+1} de {cards.length} · {disciplina}</div>
      <div style={{perspective:1000,marginBottom:24,cursor:'pointer'}} onClick={() => setFlipped(f => !f)}>
        <div style={{position:'relative',height:240,transformStyle:'preserve-3d',transition:'transform 0.6s',transform:flipped?'rotateY(180deg)':'rotateY(0)'}}>
          <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',background:'var(--gray)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:32,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
            <div><div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:16}}>PERGUNTA</div><div style={{fontSize:18,fontWeight:600,lineHeight:1.5}}>{cards[idx].front}</div><div style={{marginTop:20,fontSize:12,color:'var(--text-muted)'}}>Clique para ver a resposta</div></div>
          </div>
          <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)',background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.3)',borderRadius:20,padding:32,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
            <div><div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:16}}>RESPOSTA</div><div style={{fontSize:15,lineHeight:1.7,color:'var(--text-muted)'}}>{cards[idx].back}</div></div>
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:12,justifyContent:'center'}}>
        <button className="btn-secondary" onClick={() => { setIdx(i => Math.max(0,i-1)); setFlipped(false) }} disabled={idx===0}>← Anterior</button>
        <button className="btn-secondary" onClick={() => setFlipped(f => !f)}>Virar</button>
        <button className="btn-primary" onClick={() => { setIdx(i => Math.min(cards.length-1,i+1)); setFlipped(false) }} disabled={idx===cards.length-1}>Próximo →</button>
      </div>
    </div>
  )
}

function SimuladosPage({ showUpgrade, freeQ, setFreeQ, onXp }: any) {
  const [running, setRunning] = useState(false)
  const [cur, setCur] = useState(0)
  const [sel, setSel] = useState<number|null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [time, setTime] = useState(900)
  const [selectedSimulado, setSelectedSimulado] = useState<any>(null)

  const SIMULADOS = [
    {icon:'⚡',t:'Mini Simulado — Constitucional',info:'5 questões · 15min · Grátis',tags:['Grátis'],lock:false,questions:QUESTIONS.slice(0,5)},
    {icon:'📋',t:'Simulado OAB 1ª Fase Completo',info:'80 questões · 5h · Estilo oficial',tags:['OAB','Cronometrado'],lock:true,questions:[]},
    {icon:'🔥',t:'Simulado Intensivo — Penal',info:'30 questões · 45min',tags:['Intensivo'],lock:true,questions:[]},
    {icon:'📝',t:'Simulado OAB 2ª Fase',info:'Peça jurídica · 5h',tags:['OAB'],lock:true,questions:[]},
    {icon:'📜',t:'Ética e Estatuto OAB',info:'20 questões · 30min',tags:['OAB'],lock:true,questions:[]},
    {icon:'🏛️',t:'Simulado Geral',info:'60 questões · 4h',tags:['Completo'],lock:true,questions:[]},
  ]

  useEffect(() => {
    if (!running || answered || done) return
    const t = setInterval(() => setTime(p => { if(p<=1){clearInterval(t);setDone(true);return 0;} return p-1 }), 1000)
    return () => clearInterval(t)
  }, [running, answered, done, cur])

  const start = (s: any) => {
    if (s.lock) { showUpgrade(); return }
    setSelectedSimulado(s); setRunning(true); setCur(0); setSel(null); setAnswered(false); setScore(0); setDone(false); setTime(900)
  }

  const pick = (i: number) => {
    if (answered) return
    if (freeQ <= 0) { showUpgrade(); return }
    setSel(i); setAnswered(true); setFreeQ((p:number) => p-1)
    if (i === selectedSimulado.questions[cur].correct) { setScore(p=>p+1); onXp('question_correct') }
    else onXp('question_wrong')
  }

  const next = () => {
    if (cur+1 >= selectedSimulado.questions.length) { setDone(true); return }
    setCur(p=>p+1); setSel(null); setAnswered(false)
  }

  if (running && !done && selectedSimulado) {
    const q = selectedSimulado.questions[cur]
    const pct = Math.round(((cur+(answered?1:0))/selectedSimulado.questions.length)*100)
    const mins = Math.floor(time/60); const secs = time%60
    return (
      <div style={{padding:'32px 40px',flex:1}}>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontSize:14,color:'var(--text-muted)'}}>{selectedSimulado.t} · Q{cur+1}/{selectedSimulado.questions.length}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:20,fontWeight:700,color:time<120?'var(--danger)':'var(--gold)'}}>{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:28,overflow:'hidden'}}>
            <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}} />
          </div>
          <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:36}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:18}}>{q.disc}</div>
            <div style={{fontSize:18,fontWeight:600,lineHeight:1.6,marginBottom:32}}>{q.q}</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {q.opts.map((opt: string, i: number) => {
                let bg='rgba(255,255,255,0.03)', bc='rgba(255,255,255,0.08)', color='var(--white)'
                if (answered) {
                  if (i===q.correct) { bg='rgba(76,175,125,0.1)'; bc='var(--success)'; color='var(--success)' }
                  else if (i===sel) { bg='rgba(232,66,26,0.1)'; bc='var(--danger)'; color='var(--danger)' }
                }
                return (
                  <button key={i} onClick={() => pick(i)} style={{display:'flex',alignItems:'flex-start',gap:16,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'16px 20px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:14,color}}>
                    <span style={{width:28,height:28,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,background:'rgba(255,255,255,0.06)'}}>{String.fromCharCode(65+i)}</span>
                    <span style={{flex:1}}>{opt}</span>
                  </button>
                )
              })}
            </div>
            {answered && <div style={{marginTop:24,padding:20,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:14,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> {q.exp}</div>}
            {answered && <button className="btn-primary" style={{width:'100%',marginTop:22}} onClick={next}>{cur+1>=selectedSimulado.questions.length?'VER RESULTADO':'PRÓXIMA →'}</button>}
          </div>
        </div>
      </div>
    )
  }

  if (done && selectedSimulado) {
    const rate = Math.round((score/selectedSimulado.questions.length)*100)
    return (
      <div style={{padding:'32px 40px',flex:1}}>
        <div style={{maxWidth:720,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:68,marginBottom:22}}>{rate>=70?'🏆':rate>=50?'📝':'💪'}</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Simulado Concluído!</h1>
          <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>{score} de {selectedSimulado.questions.length} questões corretas</p>
          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button className="btn-primary" onClick={() => { setRunning(false); setDone(false) }}>NOVO SIMULADO</button>
            <button className="btn-secondary" onClick={() => showUpgrade()}>VER PREMIUM</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:'32px 40px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Simulados 📋</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>Estilo OAB. Cronometrados. Correção automática.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:16}}>
        {SIMULADOS.map(s => (
          <div key={s.t} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:24,transition:'all 0.2s',cursor:'pointer'}}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(212,168,67,0.18)'; e.currentTarget.style.transform='translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.transform='translateY(0)' }}>
            <div style={{fontSize:28,marginBottom:14}}>{s.icon}</div>
            <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>{s.t}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>{s.info}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:18}}>
              {s.tags.map(tag => <span key={tag} style={{fontSize:10,padding:'2px 9px',borderRadius:100,fontWeight:700,background:'rgba(212,168,67,0.1)',color:'var(--gold)',border:'1px solid rgba(212,168,67,0.2)'}}>{tag}</span>)}
            </div>
            {s.lock
              ? <button className="btn-secondary" style={{width:'100%',fontSize:12,padding:'10px'}} onClick={() => showUpgrade()}>🔒 DESBLOQUEAR</button>
              : <button className="btn-gold-sm" style={{width:'100%',fontSize:12}} onClick={() => start(s)}>INICIAR SIMULADO →</button>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

function RankingPage({ profile }: any) {
  const [tab, setTab] = useState<'geral'|'semanal'|'disciplina'>('semanal')
  return (
    <div style={{padding:'32px 40px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Ranking Nacional 🏆</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:24}}>Top estudantes. Compita, evolua, seja aprovado.</p>
      <div style={{display:'flex',gap:10,marginBottom:24,flexWrap:'wrap'}}>
        {(['geral','semanal','disciplina'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{background:tab===t?'rgba(212,168,67,0.1)':'var(--gray)',border:tab===t?'1px solid rgba(212,168,67,0.3)':'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'8px 16px',color:tab===t?'var(--gold)':'var(--text-muted)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)',textTransform:'capitalize'}}>
            {t === 'disciplina' ? 'Por Disciplina' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:28,justifyContent:'center',flexWrap:'wrap'}}>
        {[1,0,2].map(idx => {
          const r = RANKING_DATA[idx]
          const heights = [110,138,90]
          const h = heights[idx===0?1:idx===1?0:2]
          return (
            <div key={r.pos} style={{textAlign:'center',width:110}}>
              <div style={{fontSize:28,marginBottom:6}}>{r.av}</div>
              <div style={{fontWeight:700,fontSize:12,marginBottom:3}}>{r.name}</div>
              <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:8}}>{r.level}</div>
              <div style={{height:h,background:idx===0?'linear-gradient(135deg,var(--gold),var(--orange))':idx===1?'linear-gradient(135deg,#C0C0C0,#A0A0A0)':'linear-gradient(135deg,#CD7F32,#A0522D)',borderRadius:'8px 8px 0 0',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:8}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,color:idx===0?'var(--deep-black)':'#fff'}}>{['🥇','🥈','🥉'][idx===0?1:idx===1?0:2]}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {RANKING_DATA.map(r => (
          <div key={r.pos} style={{display:'flex',alignItems:'center',gap:16,background:(r as any).me?'rgba(212,168,67,0.06)':'var(--gray)',border:(r as any).me?'1px solid rgba(212,168,67,0.25)':'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:'16px 20px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:14,fontWeight:700,width:32,textAlign:'center',color:r.pos===1?'#FFD700':r.pos===2?'#C0C0C0':r.pos===3?'#CD7F32':'var(--text-muted)'}}>{r.pos<=3?['🥇','🥈','🥉'][r.pos-1]:`#${r.pos}`}</div>
            <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold-dark),var(--orange))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{r.av}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600}}>{r.name}{(r as any).me && <span style={{marginLeft:8,fontSize:10,background:'rgba(212,168,67,0.15)',color:'var(--gold)',padding:'2px 8px',borderRadius:4}}>VOCÊ</span>}</div>
              <div style={{fontSize:12,color:'var(--text-muted)'}}>{r.level}</div>
            </div>
            <div style={{fontSize:13,color:'var(--orange)'}}>🔥 {r.streak}d</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:14,fontWeight:700,color:'var(--gold)'}}>{r.xp.toLocaleString()} XP</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TigerJusApp() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile|null>(null)
  const [page, setPage] = useState('dashboard')
  const [showPremiumGate, setShowPremiumGate] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [freeQ, setFreeQ] = useState(15)
  const [freeIA, setFreeIA] = useState(5)
  const [notif, setNotif] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // Tenta getSession primeiro
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await loadProfile(session.user.id)
        return
      }
      // Se não encontrou, aguarda onAuthStateChange por até 3 segundos
      const timeout = setTimeout(() => {
        router.push('/login')
      }, 3000)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          clearTimeout(timeout)
          await loadProfile(session.user.id)
          subscription.unsubscribe()
        }
      })
      return () => {
        clearTimeout(timeout)
        subscription.unsubscribe()
      }
    }
    init()
  }, [])

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data as Profile)
      if (data.role === 'admin' || data.plano === 'elite' || data.plano === 'premium') {
        setFreeQ(999999)
        setFreeIA(999999)
      } else {
        setFreeQ(Math.max(0, 15 - (data.free_questions_used || 0)))
        setFreeIA(Math.max(0, 5 - (data.free_ia_used || 0)))
      }
    }
    setLoading(false)
    if (data) {
      const today = new Date().toISOString().split('T')[0]
      if (data.ultimo_acesso !== today) {
        await fetch('/api/xp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId, action:'daily_login'}) })
      }
    }
    setTimeout(() => setNotif('🔥 Bem-vindo de volta! Continue sua jornada jurídica.'), 1000)
  }

  const handleXp = async (action: string) => {
    if (!profile) return
    const res = await fetch('/api/xp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:profile.id, action}) })
    const data = await res.json()
    if (data.leveled_up) setNotif(`🎉 Você subiu para ${data.level.name}! +${data.xp_earned} XP`)
    else if (data.xp_earned > 0) setNotif(`+${data.xp_earned} XP ganho!`)
    if (profile) setProfile({...profile, xp:data.total_xp, level_name:data.level.name, streak:data.streak})
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleUpgradeSelect = (planId: string) => {
    setShowUpgradeModal(false)
    router.push(`/checkout?plan=${planId}`)
  }

  const showUpgrade = () => {
    setShowPremiumGate(false)
    setShowUpgradeModal(true)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16,animation:'pulse 1.5s infinite'}}>🐯</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,color:'var(--gold)'}}>Carregando TigerJus...</div>
      </div>
    </div>
  )

  const SIDEBAR = [
    {icon:'🏠',label:'Dashboard',key:'dashboard'},
    {icon:'📚',label:'Disciplinas',key:'disciplines'},
    {icon:'📝',label:'Quiz',key:'quiz'},
    {icon:'📋',label:'Simulados',key:'simulados'},
    {icon:'🤖',label:'IA Jurídica',key:'ia'},
    {icon:'🏆',label:'Ranking',key:'ranking'},
  ]

  return (
    <div style={{background:'var(--deep-black)',minHeight:'100vh'}}>
      {notif && <Notification msg={notif} onClose={() => setNotif(null)} />}
      {showPremiumGate && <PremiumGate onClose={() => setShowPremiumGate(false)} onUpgrade={showUpgrade} />}
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} onSelect={handleUpgradeSelect} />}

      <nav className="navbar">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:38,height:38,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,color:'var(--deep-black)'}}>T</div>
          <span style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
        </div>
        <div style={{display:'flex',gap:20,alignItems:'center'}}>
          {SIDEBAR.map(i => (
            <button key={i.key} onClick={() => setPage(i.key)} style={{color:page===i.key?'var(--gold)':'var(--text-muted)',fontSize:12,fontWeight:500,letterSpacing:1,textTransform:'uppercase',border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)',transition:'color 0.2s',borderBottom:page===i.key?'2px solid var(--gold)':'2px solid transparent',paddingBottom:2}}>
              {i.label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:13,color:'var(--text-muted)'}}>{profile?.nome?.split(' ')[0] || 'Usuário'}</span>
          <button className="btn-gold-sm" onClick={() => setShowUpgradeModal(true)}>🚀 PREMIUM</button>
          <button onClick={handleLogout} style={{color:'var(--text-muted)',fontSize:11,border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}>Sair</button>
        </div>
      </nav>

      <div style={{display:'flex',paddingTop:70,minHeight:'100vh'}}>
        <aside className="dash-sidebar">
          {SIDEBAR.map(item => (
            <button key={item.key} className={`sidebar-item${page===item.key?' active':''}`} onClick={() => setPage(item.key)}>
              <span style={{fontSize:17,width:24,textAlign:'center'}}>{item.icon}</span> {item.label}
            </button>
          ))}
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-dim)',padding:'12px 14px 6px',marginTop:8}}>CONTA</div>
          {profile?.role === 'admin' && (
            <button className="sidebar-item" onClick={() => router.push('/admin')}>⚙️ Admin Panel</button>
          )}
          <button className="sidebar-item" onClick={handleLogout}>🚪 Sair</button>
          <div style={{marginTop:'auto',padding:'20px 12px 0'}}>
            <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.14)',borderRadius:12,padding:16}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:6}}>{profile?.plano?.toUpperCase() || 'PLANO GRATUITO'}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>{freeQ > 9000 ? 'Ilimitado' : `${freeQ} questões`} · {freeIA > 9000 ? 'IA Ilimitada' : `${freeIA} perguntas IA`}</div>
              <button className="btn-gold-sm" style={{width:'100%',fontSize:11}} onClick={() => setShowUpgradeModal(true)}>🚀 FAZER UPGRADE</button>
            </div>
          </div>
        </aside>

        {page==='dashboard'   && <DashHome profile={profile} onNav={setPage} showUpgrade={showUpgrade} />}
        {page==='disciplines' && <DisciplinesPage showUpgrade={showUpgrade} profile={profile} />}
        {page==='quiz'        && <QuizPage freeQ={freeQ} setFreeQ={setFreeQ} showUpgrade={showUpgrade} onXp={handleXp} profile={profile} />}
        {page==='simulados'   && <SimuladosPage showUpgrade={showUpgrade} freeQ={freeQ} setFreeQ={setFreeQ} onXp={handleXp} />}
        {page==='ia'          && <IAPage freeIA={freeIA} setFreeIA={setFreeIA} showUpgrade={showUpgrade} profile={profile} />}
        {page==='ranking'     && <RankingPage profile={profile} />}
      </div>

      <div className="grain-overlay" />
      <style>{`
        @keyframes fadeInDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.9)} }
      `}</style>
    </div>
  )
}
