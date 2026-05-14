'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────
interface Profile {
  id: string; name: string; email: string; plan: string
  xp: number; level: number; level_name: string; streak: number
  free_questions_used: number; free_ia_used: number
  total_questions_answered: number; total_correct: number
}

type LevelName = 'Filhote' | 'Caçador' | 'Alpha' | 'Tigre Supremo' | 'Mestre TigerJus'

// ── Data ───────────────────────────────────────────────
const DISCIPLINES = [
  {id:1,icon:'⚖️',name:'Constitucional',progress:68,q:142,tags:['Quiz','Resumo','Flash','PDF']},
  {id:2,icon:'🏛️',name:'Administrativo',progress:45,q:98,tags:['Quiz','Resumo','Flash']},
  {id:3,icon:'🔒',name:'Penal',progress:72,q:210,tags:['Quiz','Resumo','Flash','PDF']},
  {id:4,icon:'🔍',name:'Processo Penal',progress:38,q:156,tags:['Quiz','Resumo']},
  {id:5,icon:'📋',name:'Civil',progress:55,q:187,tags:['Quiz','Resumo','Flash','PDF']},
  {id:6,icon:'⚡',name:'Processo Civil',progress:30,q:134,tags:['Quiz','Resumo']},
  {id:7,icon:'🦺',name:'Trabalho',progress:60,q:112,tags:['Quiz','Flash','PDF']},
  {id:8,icon:'👷',name:'Proc. Trabalho',progress:25,q:89,tags:['Quiz','Resumo']},
  {id:9,icon:'💰',name:'Tributário',progress:42,q:76,tags:['Quiz','Resumo','Flash']},
  {id:10,icon:'🏢',name:'Empresarial',progress:35,q:93,tags:['Quiz','Resumo']},
  {id:11,icon:'📜',name:'Ética OAB',progress:80,q:64,tags:['Quiz','Resumo','PDF']},
  {id:12,icon:'🛒',name:'Consumidor',progress:50,q:55,tags:['Quiz','Flash']},
  {id:13,icon:'🌍',name:'Direitos Humanos',progress:28,q:48,tags:['Quiz','Resumo']},
  {id:14,icon:'🌿',name:'Ambiental',progress:20,q:42,tags:['Quiz']},
  {id:15,icon:'📖',name:'Filosofia',progress:15,q:30,tags:['Resumo','Flash']},
  {id:16,icon:'🌐',name:'Internacional',progress:22,q:38,tags:['Quiz','Resumo']},
  {id:17,icon:'👶',name:'ECA',progress:32,q:44,tags:['Quiz','Flash']},
]

const QUESTIONS = [
  {id:1,disc:'Constitucional',q:'Segundo a CF/88, o mandado de segurança pode ser impetrado por:',
    opts:['Qualquer pessoa natural ou jurídica','Apenas pessoas naturais','Apenas partidos políticos','Apenas o Ministério Público'],correct:0,
    exp:'O MS pode ser impetrado por qualquer pessoa natural ou jurídica para proteger direito líquido e certo não amparado por HC ou HD (art. 5º, LXIX, CF/88).'},
  {id:2,disc:'Direito Penal',q:'De acordo com o Código Penal, o crime é culposo quando o agente:',
    opts:['Quis o resultado','Assumiu o risco de produzi-lo','Deu causa ao resultado por imprudência, negligência ou imperícia','Agiu com dolo eventual'],correct:2,
    exp:'Crime culposo: agente dá causa ao resultado por imprudência, negligência ou imperícia (art. 18, II, CP). Não há vontade direcionada ao resultado.'},
  {id:3,disc:'Direito Civil',q:'Segundo o Código Civil, são absolutamente incapazes de exercer pessoalmente os atos da vida civil:',
    opts:['Os menores de 16 anos','Os ébrios habituais','Os pródigos','Os maiores de 70 anos'],correct:0,
    exp:'Após a Lei 13.146/2015, apenas os menores de 16 anos são absolutamente incapazes (art. 3º, CC). As demais categorias foram revogadas.'},
  {id:4,disc:'Ética OAB',q:'O advogado tem o dever de guardar sigilo das informações do cliente:',
    opts:['Apenas durante o mandato','Apenas se houver cláusula contratual','Mesmo após o encerramento do mandato','Somente perante terceiros'],correct:2,
    exp:'O sigilo profissional do advogado é permanente e abrange até mesmo o período após o encerramento do mandato, conforme art. 34, VII do Estatuto da OAB.'},
  {id:5,disc:'Processo Civil',q:'O prazo para contestação no CPC/2015 é de:',
    opts:['10 dias úteis','15 dias úteis','20 dias úteis','30 dias corridos'],correct:1,
    exp:'Conforme art. 335 do CPC/2015, o réu poderá oferecer contestação no prazo de 15 (quinze) dias. Trata-se de dias úteis, conforme art. 219 do CPC.'},
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

const SIMULADOS_DATA = [
  {icon:'📋',t:'Simulado OAB 1ª Fase Completo',info:'80 questões · 5h · Estilo oficial',tags:['OAB','Cronometrado','Completo'],lock:true},
  {icon:'🔥',t:'Simulado Intensivo — Penal',info:'30 questões · 45min · Dificuldade alta',tags:['Intensivo','Cronometrado'],lock:true},
  {icon:'⚡',t:'Mini Simulado — Constitucional',info:'10 questões · 15min · Grátis',tags:['Grátis'],lock:false},
  {icon:'📝',t:'Simulado OAB 2ª Fase — Peça',info:'Redação de peça jurídica · 5h',tags:['OAB'],lock:true},
  {icon:'📜',t:'Ética e Estatuto OAB',info:'20 questões · 30min',tags:['OAB'],lock:true},
  {icon:'🏛️',t:'Simulado Geral — Todas as Disciplinas',info:'60 questões · 4h',tags:['Completo','Cronometrado'],lock:true},
]

const XP_NEXT: Record<LevelName, number> = {
  'Filhote': 1000,
  'Caçador': 5000,
  'Alpha': 15000,
  'Tigre Supremo': 40000,
  'Mestre TigerJus': 999999,
}

const XP_PREV: Record<LevelName, number> = {
  'Filhote': 0,
  'Caçador': 1000,
  'Alpha': 5000,
  'Tigre Supremo': 15000,
  'Mestre TigerJus': 40000,
}

// ── Notification ───────────────────────────────────────
function Notification({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t) }, [])
  return (
    <div style={{position:'fixed',top:90,right:24,zIndex:150,background:'var(--gray)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:14,padding:'16px 20px',minWidth:280,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',animation:'fadeInDown 0.4s ease'}}>
      <div style={{fontSize:12,fontWeight:700,color:'var(--gold)',marginBottom:4}}>🐯 TigerJus</div>
      <div style={{fontSize:13,color:'var(--text-muted)'}}>{msg}</div>
    </div>
  )
}

// ── Premium Gate ───────────────────────────────────────
function PremiumGate({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.93)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.22)',borderRadius:24,padding:'48px 40px',textAlign:'center',maxWidth:480,width:'100%'}}>
        <div style={{fontSize:54,marginBottom:18}}>🔒</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:900,lineHeight:1.2,marginBottom:14}}>
          Seu modo<br/><span style={{color:'var(--gold)'}}>degustação terminou.</span>
        </h2>
        <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28,lineHeight:1.7}}>
          Você atingiu o limite gratuito. Assine e continue evoluindo sem parar.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28,textAlign:'left'}}>
          {['IA ilimitada — Tiger Pro / Elite','Simulados completos OAB — Tiger Plus+','Radar Jurídico — Tiger Pro','Trilhas personalizadas — Tiger Pro'].map((l,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.12)',borderRadius:10,padding:'12px 16px',fontSize:13}}>
              <span>🔐</span><span>{l}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{width:'100%',marginBottom:12,fontSize:15,padding:16}} onClick={onUpgrade}>🚀 DESBLOQUEAR AGORA</button>
        <button className="btn-secondary" style={{width:'100%',fontSize:12}} onClick={onClose}>Continuar no plano gratuito</button>
        <div style={{marginTop:16,fontSize:11,color:'var(--text-dim)'}}>A partir de R$1,99/mês · Cancele quando quiser</div>
      </div>
    </div>
  )
}

// ── Dashboard Home ─────────────────────────────────────
function DashHome({ profile, onNav, showPremium }: any) {
  const xp = profile?.xp || 18400
  const levelName: LevelName = (profile?.level_name || 'Caçador') as LevelName
  const streak = profile?.streak || 7
  const xpNext = XP_NEXT[levelName] || 5000
  const xpPrev = XP_PREV[levelName] || 0
  const pct = Math.round(((xp - xpPrev) / (xpNext - xpPrev)) * 100)

  return (
    <div style={{padding:40,flex:1,overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Olá, {levelName}! 🔥</h1>
          <p style={{fontSize:15,color:'var(--text-muted)'}}>Você está a <span style={{color:'var(--gold)'}}>{streak} dias</span> de uma nova fase. Continue!</p>
        </div>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(232,98,26,0.1)',border:'1px solid rgba(232,98,26,0.25)',borderRadius:100,padding:'8px 16px',fontSize:13,fontWeight:700,color:'var(--orange)'}}>
          🔥 {streak} dias seguidos
        </div>
      </div>

      {/* Level card */}
      <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.12),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:32,marginBottom:24,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-16,top:-16,fontSize:120,opacity:0.04,pointerEvents:'none'}}>🐯</div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--gold)',marginBottom:8}}>NÍVEL — {levelName.toUpperCase()}</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:4}}>{xp.toLocaleString()} XP</div>
        <div style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>{(xpNext-xp).toLocaleString()} XP para o próximo nível 🏆</div>
        <div style={{background:'rgba(255,255,255,0.08)',borderRadius:100,height:8,overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 1s ease'}} />
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:11,color:'var(--text-muted)'}}>
          <span>{levelName}</span><span>{pct}%</span><span>Próximo nível</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:14,marginBottom:28}}>
        {[
          {label:'Questões',value:(profile?.total_questions_answered||847).toLocaleString(),cls:'var(--gold)',sub:'+23 hoje'},
          {label:'Taxa Acerto',value:`${profile?.total_questions_answered ? Math.round((profile.total_correct/profile.total_questions_answered)*100) : 71}%`,cls:'var(--success)',sub:'+4% este mês'},
          {label:'Streak',value:`${streak} 🔥`,cls:'var(--orange)',sub:'dias seguidos'},
          {label:'Simulados',value:'12',cls:'var(--gold)',sub:'realizados'},
          {label:'Horas',value:'94h',cls:'var(--success)',sub:'de estudo'},
          {label:'Ranking',value:'#5',cls:'var(--orange)',sub:'nacional'},
        ].map(s=>(
          <div key={s.label} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:20,transition:'border-color 0.2s'}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:10}}>{s.label}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:s.cls}}>{s.value}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Questão do dia */}
      <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:16,padding:20,marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:4}}>⚡ QUESTÃO DO DIA</div>
            <div style={{fontWeight:700,fontSize:16}}>Penal — Teoria do Crime: Tipicidade</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>+150 XP bônus ao responder hoje</div>
          </div>
          <button className="btn-gold-sm" onClick={()=>onNav('quiz')}>RESPONDER +150 XP</button>
        </div>
      </div>

      {/* Radar (locked) */}
      <div style={{background:'linear-gradient(135deg,rgba(58,143,232,0.08),rgba(212,168,67,0.06))',border:'1px solid rgba(58,143,232,0.2)',borderRadius:16,padding:24,marginBottom:28,cursor:'pointer',transition:'border-color 0.3s'}} onClick={()=>showPremium()}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <span style={{fontSize:20}}>🎯</span>
          <div style={{fontSize:16,fontWeight:700,flex:1}}>Radar TigerJus</div>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:'1.5px',textTransform:'uppercase',background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.2)',color:'var(--gold)',padding:'4px 10px',borderRadius:100}}>🔒 Tiger Pro</div>
        </div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:14}}>Temas com maior probabilidade de cair na próxima prova:</div>
        {[['Penal — Crimes Hediondos','92%',0.92],['Constitucional — Direitos Fundamentais','87%',0.87],['Processo Civil — Recursos','78%',0.78]].map(([d,p,v]:any)=>(
          <div key={d as string} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'10px 14px',marginBottom:8,filter:'blur(3px)',userSelect:'none'}}>
            <div style={{fontSize:13,fontWeight:700,flex:1}}>{d}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',width:40,textAlign:'right'}}>{p}</div>
            <div style={{flex:1,background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,overflow:'hidden'}}>
              <div style={{width:`${(v as number)*100}%`,height:'100%',background:'linear-gradient(90deg,var(--blue),var(--gold))',borderRadius:100}} />
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900}}>Disciplinas em destaque</h2>
        <button style={{color:'var(--text-muted)',fontSize:12,border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)'}} onClick={()=>onNav('disciplines')}>Ver todas →</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14}}>
        {DISCIPLINES.slice(0,6).map(d=>(
          <div key={d.id} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:20,cursor:'pointer',transition:'all 0.2s',position:'relative',overflow:'hidden'}}
            onClick={()=>onNav('quiz')}
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

// ── Quiz Page ──────────────────────────────────────────
function QuizPage({ freeQ, setFreeQ, showPremium, onXp }: any) {
  const [cur, setCur] = useState(0)
  const [sel, setSel] = useState<number|null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [time, setTime] = useState(90)

  useEffect(() => {
    if (answered || done) return
    const t = setInterval(() => setTime(p => { if (p<=1) { clearInterval(t); setAnswered(true); return 0; } return p-1 }), 1000)
    return () => clearInterval(t)
  }, [answered, done, cur])

  const pick = (i: number) => {
    if (answered) return
    if (freeQ <= 0) { showPremium(); return }
    setSel(i); setAnswered(true); setFreeQ((p:number) => p-1)
    const correct = i === QUESTIONS[cur].correct
    if (correct) { setScore(p=>p+1); onXp('question_correct') }
    else onXp('question_wrong')
  }

  const next = () => {
    if (cur+1 >= QUESTIONS.length) { setDone(true); return }
    setCur(p=>p+1); setSel(null); setAnswered(false); setTime(90)
  }

  const restart = () => { setCur(0); setSel(null); setAnswered(false); setScore(0); setDone(false); setTime(90) }
  const q = QUESTIONS[cur]
  const pct = Math.round(((cur+(answered?1:0))/QUESTIONS.length)*100)

  if (done) {
    const rate = Math.round((score/QUESTIONS.length)*100)
    return (
      <div style={{padding:40,flex:1}}>
        <div style={{maxWidth:720,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:68,marginBottom:22}}>{rate>=70?'🏆':rate>=50?'📝':'💪'}</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Simulado Concluído!</h1>
          <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>{score} de {QUESTIONS.length} questões corretas</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:28}}>
            {[['Taxa de Acerto',`${rate}%`,rate>=70?'var(--gold)':'var(--orange)'],['XP Ganho',`+${score*100}`,'var(--gold)'],['Estimativa',rate>=60?'Aprovado ✓':'Treinar mais',rate>=60?'var(--success)':'var(--orange)']].map(([l,v,c])=>(
              <div key={l} style={{background:'var(--gray)',borderRadius:14,padding:20,border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{l}</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,marginBottom:24,textAlign:'left'}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:'var(--gold)'}}>🎯 Análise de Desempenho</div>
            {[['Pontos Fortes','Constitucional, Ética OAB','var(--success)'],['Pontos Fracos','Tributário, Empresarial','var(--danger)'],['Revisão sugerida','Penal — Crimes contra o Patrimônio','var(--gold)']].map(([l,v,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <span style={{color:'var(--text-muted)'}}>{l}</span>
                <span style={{color:c,fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="btn-primary" onClick={restart}>TENTAR NOVAMENTE</button>
            <button className="btn-secondary" onClick={restart}>VER GABARITO</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:40,flex:1}}>
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontSize:14,color:'var(--text-muted)'}}>Questão {cur+1} de {QUESTIONS.length}</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:20,fontWeight:700,color:time<20?'var(--danger)':'var(--gold)'}}>{String(Math.floor(time/60)).padStart(2,'0')}:{String(time%60).padStart(2,'0')}</div>
        </div>
        <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:28,overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}} />
        </div>
        <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:36}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:18}}>{q.disc}</div>
          <div style={{fontSize:18,fontWeight:600,lineHeight:1.6,marginBottom:32}}>{q.q}</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {q.opts.map((opt,i)=>{
              let bg='rgba(255,255,255,0.03)', bc='rgba(255,255,255,0.08)', color='var(--white)'
              if (answered) {
                if (i===q.correct) { bg='rgba(76,175,125,0.1)'; bc='var(--success)'; color='var(--success)' }
                else if (i===sel) { bg='rgba(232,66,26,0.1)'; bc='var(--danger)'; color='var(--danger)' }
              } else if (sel===i) { bg='rgba(212,168,67,0.08)'; bc='rgba(212,168,67,0.5)' }
              return (
                <button key={i} onClick={()=>pick(i)} style={{display:'flex',alignItems:'flex-start',gap:16,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'16px 20px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:14,color}}>
                  <span style={{width:28,height:28,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,background:'rgba(255,255,255,0.06)'}}>{String.fromCharCode(65+i)}</span>
                  <span style={{flex:1}}>{opt}</span>
                </button>
              )
            })}
          </div>
          {answered && (
            <div style={{marginTop:24,padding:20,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:14,lineHeight:1.7,color:'var(--text-muted)'}}>
              {sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> {q.exp}
            </div>
          )}
          {answered && (
            <button className="btn-primary" style={{width:'100%',marginTop:22}} onClick={next}>
              {cur+1>=QUESTIONS.length?'VER RESULTADO':'PRÓXIMA QUESTÃO →'}
            </button>
          )}
        </div>
        <div style={{textAlign:'center',marginTop:14,fontSize:12,color:'var(--text-muted)'}}>{freeQ>0?`${freeQ} questões grátis restantes`:'Limite gratuito atingido'}</div>
      </div>
    </div>
  )
}

// ── IA Page ────────────────────────────────────────────
function IAPage({ freeIA, setFreeIA, showPremium, profile }: any) {
  const [msgs, setMsgs] = useState([{role:'assistant',text:'Olá! Sou o TigerJus AI — seu tutor jurídico de alta performance. 🐯⚖️\n\nPosso te ajudar com dúvidas de Direito, explicar artigos, resumir temas e te preparar para a OAB.\n\nO que você quer aprender hoje?'}])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return
    if (freeIA <= 0) { showPremium(); return }
    setInput(''); setFreeIA((p:number)=>p-1)
    const newMsgs = [...msgs, {role:'user',text:msg}]
    setMsgs(newMsgs); setLoading(true)
    try {
      const res = await fetch('/api/ia', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          messages: newMsgs.slice(1).map(m=>({role:m.role,content:m.text})),
          userId: profile?.id,
          plan: profile?.plan || 'free',
        }),
      })
      const data = await res.json()
      if (data.error === 'LIMIT_REACHED') { showPremium(); return }
      setMsgs(p=>[...p,{role:'assistant',text:data.text||'Erro ao conectar.'}])
    } catch {
      setMsgs(p=>[...p,{role:'assistant',text:'Erro ao conectar com a IA. Tente novamente.'}])
    } finally { setLoading(false) }
  }

  const chips = ['Explique habeas corpus','O que é dolo eventual?','Resumir Constitucional','Cláusula pétrea','Princípio da legalidade']

  return (
    <div style={{padding:40,flex:1,display:'flex',flexDirection:'column'}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>IA Jurídica 🤖</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:16}}>
        Tutor inteligente para tirar dúvidas e treinar para a OAB.
        {freeIA>0 ? <span style={{marginLeft:8,color:'var(--gold)'}}>{freeIA} perguntas grátis</span> : <span style={{marginLeft:8,color:'var(--danger)'}}>🔒 Limite atingido</span>}
      </p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
        {chips.map(c=><button key={c} onClick={()=>send(c)} style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.14)',borderRadius:100,padding:'6px 14px',fontSize:12,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font-body)',transition:'all 0.2s'}}>{c}</button>)}
      </div>
      <div style={{flex:1,background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:400}}>
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:16,padding:24}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:'flex',gap:12,maxWidth:'82%',alignSelf:m.role==='user'?'flex-end':'flex-start',flexDirection:m.role==='user'?'row-reverse':'row'}}>
              <div style={{width:36,height:36,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,background:m.role==='user'?'var(--gray-light)':'linear-gradient(135deg,var(--gold),var(--orange))'}}>
                {m.role==='user'?'👤':'🐯'}
              </div>
              <div style={{background:m.role==='user'?'rgba(212,168,67,0.1)':'rgba(255,255,255,0.04)',border:m.role==='user'?'1px solid rgba(212,168,67,0.2)':'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px 18px',fontSize:14,lineHeight:1.7,color:'var(--white)',whiteSpace:'pre-wrap'}}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{display:'flex',gap:12,maxWidth:'82%'}}>
              <div style={{width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,var(--gold),var(--orange))'}}>🐯</div>
              <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px 18px',fontSize:14,opacity:0.6,fontStyle:'italic'}}>Analisando...</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div style={{display:'flex',gap:12,padding:16,background:'var(--gray-mid)',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <textarea className="form-input" placeholder="Pergunte algo jurídico... Ex: O que é mandado de segurança?" value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
            style={{flex:1,resize:'none',minHeight:44}} rows={1} />
          <button onClick={()=>send()} style={{background:'linear-gradient(135deg,var(--gold),var(--orange))',border:'none',borderRadius:10,width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18,color:'var(--deep-black)',transition:'transform 0.2s'}}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>➤</button>
        </div>
      </div>
    </div>
  )
}

// ── Ranking Page ───────────────────────────────────────
function RankingPage() {
  return (
    <div style={{padding:40,flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Ranking Nacional 🏆</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:24}}>Top estudantes da semana. Compita, evolua, seja aprovado.</p>
      <div style={{display:'flex',gap:10,marginBottom:24,flexWrap:'wrap'}}>
        {['Geral','Semanal','Por Disciplina'].map(t=>(
          <button key={t} style={{background:t==='Semanal'?'rgba(212,168,67,0.1)':'var(--gray)',border:t==='Semanal'?'1px solid rgba(212,168,67,0.3)':'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'8px 16px',color:t==='Semanal'?'var(--gold)':'var(--text-muted)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)'}}>{t}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:28,justifyContent:'center',flexWrap:'wrap'}}>
        {[1,0,2].map(idx=>{
          const r = RANKING_DATA[idx]; const heights=[110,138,90]; const h=heights[idx===0?1:idx===1?0:2]
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
        {RANKING_DATA.map(r=>(
          <div key={r.pos} style={{display:'flex',alignItems:'center',gap:16,background:(r as any).me?'rgba(212,168,67,0.06)':'var(--gray)',border:(r as any).me?'1px solid rgba(212,168,67,0.25)':'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:'16px 20px',transition:'border-color 0.2s'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:14,fontWeight:700,width:32,textAlign:'center',color:r.pos===1?'#FFD700':r.pos===2?'#C0C0C0':r.pos===3?'#CD7F32':'var(--text-muted)'}}>
              {r.pos<=3?['🥇','🥈','🥉'][r.pos-1]:`#${r.pos}`}
            </div>
            <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold-dark),var(--orange))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{r.av}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600}}>{r.name}{(r as any).me&&<span style={{marginLeft:8,fontSize:10,background:'rgba(212,168,67,0.15)',color:'var(--gold)',padding:'2px 8px',borderRadius:4}}>VOCÊ</span>}</div>
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

// ── Simulados Page ─────────────────────────────────────
function SimuladosPage({ showPremium }: any) {
  return (
    <div style={{padding:40,flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Simulados 📝</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>Estilo OAB. Cronometrados. Correção automática e análise detalhada.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:16}}>
        {SIMULADOS_DATA.map(s=>(
          <div key={s.t} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:24,transition:'all 0.2s',cursor:'pointer'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.18)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{fontSize:28,marginBottom:14}}>{s.icon}</div>
            <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>{s.t}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>{s.info}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:18}}>
              {s.tags.map(tag=><span key={tag} style={{fontSize:10,padding:'2px 9px',borderRadius:100,fontWeight:700,background:'rgba(212,168,67,0.1)',color:'var(--gold)',border:'1px solid rgba(212,168,67,0.2)'}}>{tag}</span>)}
            </div>
            {s.lock
              ? <button className="btn-secondary" style={{width:'100%',fontSize:12,padding:'10px'}} onClick={()=>showPremium()}>🔒 DESBLOQUEAR</button>
              : <button className="btn-gold-sm" style={{width:'100%',fontSize:12}}>INICIAR SIMULADO →</button>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Disciplines Page ───────────────────────────────────
function DisciplinesPage({ onNav }: any) {
  return (
    <div style={{padding:40,flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Disciplinas 📚</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>17 disciplinas com resumos, quizzes, flashcards e PDFs exclusivos.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14}}>
        {DISCIPLINES.map(d=>(
          <div key={d.id} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:20,cursor:'pointer',transition:'all 0.2s'}}
            onClick={()=>onNav('quiz')}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.2)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{fontSize:24,marginBottom:12}}>{d.icon}</div>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{d.name}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>{d.progress}% completo</div>
            <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,overflow:'hidden',marginBottom:10}}>
              <div style={{width:`${d.progress}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100}} />
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {d.tags.map(t=><span key={t} style={{fontSize:9,padding:'2px 7px',background:'rgba(212,168,67,0.07)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:4,color:'var(--gold-dark)',fontWeight:600}}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN APP ───────────────────────────────────────────
export default function TigerJusApp() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile|null>(null)
  const [page, setPage] = useState('dashboard')
  const [premium, setPremium] = useState(false)
  const [freeQ, setFreeQ] = useState(15)
  const [freeIA, setFreeIA] = useState(5)
  const [notif, setNotif] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data as Profile)
          setFreeQ(Math.max(0, 15 - (data.free_questions_used || 0)))
          setFreeIA(Math.max(0, 5 - (data.free_ia_used || 0)))
        }
        setLoading(false)
      })
    })
    setTimeout(() => setNotif('🔥 Streak de 7 dias! Continue assim, Caçador!'), 1500)
  }, [])

  const handleXp = async (action: string) => {
    if (!profile) return
    const res = await fetch('/api/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, action }),
    })
    const data = await res.json()
    if (data.leveled_up) setNotif(`🎉 Você subiu para ${data.level.name}! +${data.xp_earned} XP`)
    else setNotif(`+${data.xp_earned} XP ganho!`)
    if (profile) setProfile({ ...profile, xp: data.total_xp, level_name: data.level.name, streak: data.streak })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>🐯</div>
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
      {notif && <Notification msg={notif} onClose={()=>setNotif(null)} />}
      {premium && <PremiumGate onClose={()=>setPremium(false)} onUpgrade={()=>{ setPremium(false); router.push('/checkout?plan=pro') }} />}

      {/* Navbar */}
      <nav className="navbar">
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>router.push('/')}>
          <div style={{width:38,height:38,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,color:'var(--deep-black)'}}>T</div>
          <span style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
        </div>
        <div style={{display:'flex',gap:24,alignItems:'center'}}>
          {SIDEBAR.map(i=>(
            <button key={i.key} onClick={()=>setPage(i.key)} style={{color:page===i.key?'var(--gold)':'var(--text-muted)',fontSize:12,fontWeight:500,letterSpacing:1,textTransform:'uppercase',border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)',transition:'color 0.2s'}}>{i.label}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:13,color:'var(--text-muted)'}}>{profile?.name?.split(' ')[0] || 'Usuário'}</span>
          <button className="btn-gold-sm" onClick={()=>router.push('/checkout?plan=pro')}>🚀 PREMIUM</button>
          <button onClick={handleLogout} style={{color:'var(--text-muted)',fontSize:11,border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}>Sair</button>
        </div>
      </nav>

      {/* Layout */}
      <div style={{display:'flex',paddingTop:70,minHeight:'100vh'}}>
        {/* Sidebar */}
        <aside className="dash-sidebar">
          {SIDEBAR.map(item=>(
            <button key={item.key} className={`sidebar-item${page===item.key?' active':''}`} onClick={()=>setPage(item.key)}>
              <span style={{fontSize:17,width:24,textAlign:'center'}}>{item.icon}</span> {item.label}
            </button>
          ))}
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-dim)',padding:'12px 14px 6px',marginTop:8}}>CONTA</div>
          <button className="sidebar-item" onClick={()=>router.push('/admin')}>⚙️ Admin Panel</button>
          <button className="sidebar-item" onClick={handleLogout}>🚪 Sair</button>
          <div style={{marginTop:'auto',padding:'20px 12px 0'}}>
            <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.14)',borderRadius:12,padding:16}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:6}}>{profile?.plan?.toUpperCase() || 'PLANO GRATUITO'}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>{freeQ} questões · {freeIA} perguntas IA</div>
              <button className="btn-gold-sm" style={{width:'100%',fontSize:11}} onClick={()=>router.push('/checkout?plan=pro')}>🚀 FAZER UPGRADE</button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        {page==='dashboard'   && <DashHome profile={profile} onNav={setPage} showPremium={()=>setPremium(true)} />}
        {page==='disciplines' && <DisciplinesPage onNav={setPage} />}
        {page==='quiz'        && <QuizPage freeQ={freeQ} setFreeQ={setFreeQ} showPremium={()=>setPremium(true)} onXp={handleXp} />}
        {page==='simulados'   && <SimuladosPage showPremium={()=>setPremium(true)} />}
        {page==='ia'          && <IAPage freeIA={freeIA} setFreeIA={setFreeIA} showPremium={()=>setPremium(true)} profile={profile} />}
        {page==='ranking'     && <RankingPage />}
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
