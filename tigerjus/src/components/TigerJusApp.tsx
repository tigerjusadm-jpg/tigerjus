'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import RadarOAB from '@/components/RadarOAB'
import { canAccess, isAdmin, getLimites, isPago, PLANOS_DISPLAY, type Plano } from '@/lib/planos'

interface Profile {
  id: string; nome: string; email: string; plano: string
  xp: number; nivel: number; level_name: string; streak: number
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
  { id:'start', name:'Tiger Start', price:'1,99', color:'var(--success)', features:['Questões ilimitadas','IA intermediária','42º Exame OAB','Streak + ranking'] },
  { id:'plus', name:'Tiger Plus', price:'5,99', color:'#8B5CF6', features:['PDF por disciplina','Radar TigerJus','42º e 43º Exame OAB','Mais flashcards'] },
  { id:'pro', name:'Tiger Pro', price:'9,99', color:'var(--gold)', badge:'POPULAR', featured:true, features:['IA avançada ilimitada','42º ao 44º Exame OAB','Trilhas personalizadas','Previsão de aprovação'] },
  { id:'elite', name:'Tiger Elite', price:'19,99', color:'var(--orange)', badge:'TOP', features:['Tudo ilimitado','IA prioritária','Todos os simulados OAB','Acesso total vitalício'] },
]

const DISCIPLINES = [
  {id:1,icon:'⚖️',name:'Constitucional',slug:'constitucional',progress:68,q:142,tags:['Quiz','Resumo','Flash','PDF']},
  {id:2,icon:'🏛️',name:'Administrativo',slug:'administrativo',progress:45,q:98,tags:['Quiz','Resumo','Flash','PDF']},
  {id:3,icon:'🔒',name:'Penal',slug:'penal',progress:72,q:210,tags:['Quiz','Resumo','Flash','PDF']},
  {id:4,icon:'🔍',name:'Processo Penal',slug:'processo-penal',progress:38,q:156,tags:['Quiz','Resumo','Flash','PDF']},
  {id:5,icon:'📋',name:'Civil',slug:'civil',progress:55,q:187,tags:['Quiz','Resumo','Flash','PDF']},
  {id:6,icon:'⚡',name:'Processo Civil',slug:'processo-civil',progress:30,q:134,tags:['Quiz','Resumo','Flash','PDF']},
  {id:7,icon:'🦺',name:'Trabalho',slug:'trabalho',progress:60,q:112,tags:['Quiz','Resumo','Flash','PDF']},
  {id:8,icon:'👷',name:'Proc. Trabalho',slug:'proc-trabalho',progress:25,q:89,tags:['Quiz','Resumo','Flash','PDF']},
  {id:9,icon:'💰',name:'Tributário',slug:'tributario',progress:42,q:76,tags:['Quiz','Resumo','Flash','PDF']},
  {id:10,icon:'🏢',name:'Empresarial',slug:'empresarial',progress:35,q:93,tags:['Quiz','Resumo','Flash','PDF']},
  {id:11,icon:'📜',name:'Ética OAB',slug:'etica',progress:80,q:64,tags:['Quiz','Resumo','Flash','PDF']},
  {id:12,icon:'🛒',name:'Consumidor',slug:'consumidor',progress:50,q:55,tags:['Quiz','Resumo','Flash','PDF']},
  {id:13,icon:'🌍',name:'Direitos Humanos',slug:'direitos-humanos',progress:28,q:48,tags:['Quiz','Resumo','Flash','PDF']},
  {id:14,icon:'🌿',name:'Ambiental',slug:'ambiental',progress:20,q:42,tags:['Quiz','Resumo','Flash','PDF']},
  {id:15,icon:'📖',name:'Filosofia',slug:'filosofia',progress:15,q:30,tags:['Quiz','Resumo','Flash','PDF']},
  {id:16,icon:'🌐',name:'Internacional',slug:'internacional',progress:22,q:38,tags:['Quiz','Resumo','Flash','PDF']},
  {id:17,icon:'👶',name:'ECA',slug:'eca',progress:32,q:44,tags:['Quiz','Resumo','Flash','PDF']},
]

const DISC_MAP: Record<string, string> = {
  'Constitucional':'Constitucional','Administrativo':'Administrativo','Penal':'Penal',
  'Processo Penal':'Processo Penal','Civil':'Civil','Processo Civil':'Processo Civil',
  'Trabalho':'Trabalho','Processo do Trabalho':'Proc. Trabalho','Tributário':'Tributário',
  'Empresarial':'Empresarial','Ética':'Ética OAB','Consumidor':'Consumidor',
  'Direitos Humanos':'Direitos Humanos','Ambiental':'Ambiental','Filosofia':'Filosofia',
  'Internacional':'Internacional','ECA':'ECA',
}

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
  constitucional:`DIREITO CONSTITUCIONAL — RESUMO ESSENCIAL\n\nESTRUTURA DA CF/88\nA Constituição Federal de 1988 é rígida, analítica e promulgada. Organiza-se em 9 títulos.\n\nDIREITOS FUNDAMENTAIS (Art. 5º)\nSão cláusulas pétreas. Principais garantias:\n- Habeas Corpus — liberdade de locomoção\n- Mandado de Segurança — direito líquido e certo\n- Habeas Data — informações pessoais\n- Mandado de Injunção — omissão legislativa\n\nPRINCÍPIOS FUNDAMENTAIS\n- Soberania, Cidadania, Dignidade da pessoa humana\n- Valores sociais do trabalho e da livre iniciativa\n- Pluralismo político\n\nORGANIZAÇÃO DOS PODERES\n- Executivo, Legislativo e Judiciário — independentes e harmônicos\n- Sistema de freios e contrapesos`,
  penal:`DIREITO PENAL — RESUMO ESSENCIAL\n\nTEORIA DO CRIME\nCrime = Fato típico + Ilicitude + Culpabilidade\n\nDOLO E CULPA\n- Dolo direto: quis o resultado\n- Dolo eventual: assumiu o risco\n- Culpa: imprudência, negligência ou imperícia\n\nEXCLUDENTES DE ILICITUDE (Art. 23 CP)\n- Estado de necessidade\n- Legítima defesa\n- Estrito cumprimento do dever legal`,
  civil:`DIREITO CIVIL — RESUMO ESSENCIAL\n\nCAPACIDADE\n- Plena: maiores de 18 anos não incapazes\n- Absolutamente incapaz: menores de 16 anos (art. 3º CC)\n- Relativamente incapaz: 16-18 anos, ébrios habituais, pródigos\n\nRESPONSABILIDADE CIVIL\n- Subjetiva: necessita de culpa\n- Objetiva: independe de culpa (risco da atividade)`,
}

const RADAR_TEMAS = [
  { disc:'Direito Constitucional', tema:'Direitos Fundamentais — Art. 5º', prob:94, tipo:'Lei seca', dica:'Foco em HC, MS, HD e MI. Caem todo exame.' },
  { disc:'Direito Penal', tema:'Teoria do Crime — Dolo e Culpa', prob:91, tipo:'Jurisprudência', dica:'STJ e STF consolidaram entendimento sobre dolo eventual.' },
  { disc:'Ética OAB', tema:'Sigilo Profissional e Incompatibilidades', prob:89, tipo:'Estatuto', dica:'Art. 34 do Estatuto. Questão garantida em todo exame.' },
  { disc:'Processo Civil', tema:'Prazos e Recursos — CPC/2015', prob:86, tipo:'Lei seca', dica:'Prazo de 15 dias úteis para a maioria dos recursos.' },
  { disc:'Direito Civil', tema:'Responsabilidade Civil Objetiva', prob:82, tipo:'Doutrina', dica:'CDC + CC/2002. Risco da atividade muito cobrado.' },
  { disc:'Direito do Trabalho', tema:'Rescisão Contratual e FGTS', prob:79, tipo:'CLT', dica:'Multa de 40% sobre FGTS nas demissões sem justa causa.' },
]

function RadarModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.95)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:700,background:'var(--gray)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:24,padding:'32px 28px',position:'relative',maxHeight:'90vh',overflowY:'auto'}}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'none',border:'none',color:'#888',fontSize:22,cursor:'pointer'}}>✕</button>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <span style={{fontSize:28}}>🎯</span>
          <div>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,marginBottom:2}}>Radar TigerJus</h2>
            <p style={{fontSize:12,color:'var(--text-muted)'}}>Temas com maior probabilidade de cair no 47º Exame OAB</p>
          </div>
        </div>
        <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'10px 14px',marginBottom:24,fontSize:12,color:'var(--text-muted)'}}>
          📡 Baseado na análise dos últimos 5 exames (42º ao 46º) + jurisprudência recente STF/STJ
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {RADAR_TEMAS.map((t,i) => (
            <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'16px 18px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:4}}>{t.disc}</div>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--white)'}}>{t.tema}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,color:t.prob>=90?'var(--success)':t.prob>=80?'var(--gold)':'var(--orange)'}}>{t.prob}%</div>
                  <div style={{fontSize:10,color:'var(--text-muted)'}}>probabilidade</div>
                </div>
              </div>
              <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:5,overflow:'hidden',marginBottom:8}}>
                <div style={{width:`${t.prob}%`,height:'100%',background:`linear-gradient(90deg,${t.prob>=90?'var(--success)':t.prob>=80?'var(--gold)':'var(--orange)'},var(--orange))`,borderRadius:100,transition:'width 1s ease'}}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <span style={{fontSize:10,padding:'2px 8px',background:'rgba(58,143,232,0.1)',border:'1px solid rgba(58,143,232,0.2)',borderRadius:100,color:'#3a8fe8',fontWeight:600}}>{t.tipo}</span>
                <span style={{fontSize:12,color:'var(--text-muted)'}}>💡 {t.dica}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ADS_BANNER = [
  {id:1,url:'https://damasio.com.br',bg:'linear-gradient(135deg,#1a237e,#283593)',logo:'🎓',titulo:'Faculdade Damásio',subtitulo:'OAB 1ª e 2ª Fase — Aprovação garantida ou devolução do investimento',cta:'Conhecer agora',ctaBg:'#fff',ctaColor:'#1a237e',badge:'PARCEIRO OFICIAL',badgeBg:'rgba(255,255,255,0.15)'},
  {id:2,url:'https://cers.com.br',bg:'linear-gradient(135deg,#b71c1c,#c62828)',logo:'⚖️',titulo:'CERS Cursos Jurídicos',subtitulo:'Mais de 1 milhão de aprovados. A maior plataforma jurídica do Brasil.',cta:'Ver cursos',ctaBg:'#fff',ctaColor:'#b71c1c',badge:'TOP PARCEIRO',badgeBg:'rgba(255,255,255,0.15)'},
  {id:3,url:'https://grancursosonline.com.br',bg:'linear-gradient(135deg,#1b5e20,#2e7d32)',logo:'🏆',titulo:'Gran Cursos Online',subtitulo:'Simulados ilimitados para OAB. Comece grátis e seja aprovado.',cta:'Começar grátis',ctaBg:'#fff',ctaColor:'#1b5e20',badge:'RECOMENDADO',badgeBg:'rgba(255,255,255,0.15)'},
]

function AdBannerRotativo({ }: { isPremium: boolean }) {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % ADS_BANNER.length); setFade(true) }, 400)
    }, 10000)
    return () => clearInterval(interval)
  }, [])
  const ad = ADS_BANNER[idx]
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--text-dim)',marginBottom:6,textAlign:'right'}}>PUBLICIDADE</div>
      <div onClick={() => window.open(ad.url,'_blank')} style={{background:ad.bg,borderRadius:14,padding:'16px 20px',cursor:'pointer',transition:'opacity 0.4s ease, transform 0.2s',opacity:fade?1:0,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',boxShadow:'0 4px 20px rgba(0,0,0,0.3)'}} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.01)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
        <div style={{width:48,height:48,borderRadius:12,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{ad.logo}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
            <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>{ad.titulo}</span>
            <span style={{fontSize:9,fontWeight:800,letterSpacing:'1.5px',background:ad.badgeBg,color:'#fff',padding:'2px 8px',borderRadius:100,border:'1px solid rgba(255,255,255,0.3)'}}>{ad.badge}</span>
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',lineHeight:1.5}}>{ad.subtitulo}</div>
        </div>
        <button style={{background:ad.ctaBg,color:ad.ctaColor,border:'none',borderRadius:10,padding:'10px 18px',fontSize:12,fontWeight:800,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{ad.cta} →</button>
        <div style={{width:'100%',display:'flex',gap:5,justifyContent:'center',marginTop:4}}>
          {ADS_BANNER.map((_,i) => (<button key={i} onClick={e=>{e.stopPropagation();setFade(false);setTimeout(()=>{setIdx(i);setFade(true)},300)}} style={{width:i===idx?20:6,height:6,borderRadius:3,background:i===idx?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.3)',border:'none',cursor:'pointer',transition:'all 0.3s',padding:0}}/>))}
        </div>
      </div>
    </div>
  )
}

function AdCardFeed() {
  const ad = ADS_BANNER[1]
  return (
    <div onClick={() => window.open(ad.url,'_blank')} style={{background:'rgba(183,28,28,0.08)',border:'1px solid rgba(183,28,28,0.2)',borderRadius:14,padding:'14px 18px',marginBottom:16,cursor:'pointer',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <span style={{fontSize:20}}>⚖️</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--text-dim)',marginBottom:2}}>PUBLICIDADE</div>
        <div style={{fontSize:13,fontWeight:700}}>{ad.titulo}</div>
        <div style={{fontSize:11,color:'var(--text-muted)'}}>{ad.subtitulo}</div>
      </div>
      <button style={{background:'rgba(183,28,28,0.15)',border:'1px solid rgba(183,28,28,0.3)',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:700,color:'#ef5350',cursor:'pointer',whiteSpace:'nowrap'}}>Ver cursos →</button>
    </div>
  )
}

async function gerarPDF(disciplina: any, resumo: string, questoes: any[]) {
  const data = new Date().toLocaleDateString('pt-BR')
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>TigerJus — ${disciplina.name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#fff;color:#1a1a1a;font-size:12px;line-height:1.6}.header{background:linear-gradient(135deg,#D4A843,#E8621A);padding:28px 40px;color:#000;display:flex;align-items:center;justify-content:space-between}.logo{font-size:28px;font-weight:900;letter-spacing:3px}.container{padding:32px 40px}.section-title{font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#D4A843;border-bottom:2px solid #D4A843;padding-bottom:8px;margin:28px 0 16px}.resumo-box{background:#fafafa;border:1px solid #eee;border-left:4px solid #D4A843;border-radius:8px;padding:20px 24px;white-space:pre-wrap;font-size:12px;line-height:1.8}.questao{border:1px solid #e0e0e0;border-radius:10px;padding:18px 20px;margin-bottom:16px}.opcao{display:flex;gap:10px;padding:8px 10px;border-radius:6px;margin-bottom:4px;font-size:12px}.opcao.correta{background:#e8f5e9;border:1px solid #4caf50;color:#1b5e20;font-weight:600}.opcao.normal{background:#fafafa;border:1px solid #eee}.footer{margin-top:40px;padding:20px 40px;background:#f5f5f5;border-top:2px solid #D4A843;display:flex;justify-content:space-between;font-size:10px;color:#888}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="header"><div><div class="logo">🐯 TIGERJUS</div><div>${disciplina.icon} ${disciplina.name.toUpperCase()}</div></div><div><div>Material Premium</div><div>${data}</div></div></div><div class="container"><div class="section-title">📖 Resumo Essencial</div><div class="resumo-box">${resumo}</div>${questoes.length>0?`<div class="section-title">📝 Questões OAB</div>${questoes.slice(0,20).map((q:any,i:number)=>`<div class="questao"><div style="font-size:10px;color:#888;margin-bottom:6px">Questão ${i+1} · ${q.disciplina||disciplina.name}</div><div style="font-size:13px;font-weight:600;margin-bottom:12px">${q.enunciado}</div>${['A','B','C','D'].map((l,li)=>`<div class="opcao ${q.resposta_correta===l?'correta':'normal'}"><span>${l})</span><span>${[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d][li]}</span>${q.resposta_correta===l?'<span style="margin-left:auto">✅</span>':''}</div>`).join('')}${q.comentario?`<div style="margin-top:10px;padding:10px;background:#fff8e1;border-radius:6px;font-size:11px">📖 ${q.comentario}</div>`:''}</div>`).join('')}`:''}
</div><div class="footer"><div>🐯 TIGERJUS</div><div>"Não basta estudar Direito. É preciso pensar como um Tigre."</div><div>${data}</div></div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) { const a = document.createElement('a'); a.href=url; a.download=`TigerJus_${disciplina.slug}.html`; document.body.appendChild(a); a.click(); document.body.removeChild(a) }
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function UpgradeModal({ onClose, onSelect }: { onClose: () => void; onSelect: (plan: string) => void }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.95)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:900,position:'relative',padding:'20px 0'}}>

        {/* Botão X — mantido */}
        <button onClick={onClose} style={{position:'absolute',top:-10,right:0,background:'none',border:'none',color:'#888',fontSize:24,cursor:'pointer',zIndex:10}}>✕</button>

        {/* Botão de retorno — topo esquerdo, visível em mobile */}
        <button onClick={onClose} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',color:'var(--text-muted)',fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',marginBottom:20,padding:0,transition:'color 0.2s'}}
          onMouseEnter={e=>e.currentTarget.style.color='var(--gold)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
          ← Voltar para a plataforma
        </button>

        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🚀</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:900,marginBottom:8}}>Escolha seu <span style={{color:'var(--gold)'}}>plano</span></h2>
          <p style={{color:'var(--text-muted)',fontSize:15}}>Desbloqueie todo o potencial do TigerJus</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
          {PLANS_UPGRADE.map(plan => (
            <div key={plan.id} style={{background:(plan as any).featured?'linear-gradient(160deg,rgba(212,168,67,0.1),rgba(30,30,30,1))':'rgba(20,20,20,0.9)',border:(plan as any).featured?'1px solid var(--gold)':'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:24,position:'relative',cursor:'pointer',transition:'transform 0.2s'}} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-4px)'} onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
              {(plan as any).badge&&<div style={{position:'absolute',top:16,right:16,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'#000',fontSize:9,fontWeight:900,letterSpacing:'1.5px',padding:'4px 10px',borderRadius:100}}>{(plan as any).badge}</div>}
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{plan.name}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:38,fontWeight:900,color:plan.color,marginBottom:4}}><sup style={{fontSize:15,color:'var(--text-muted)',verticalAlign:'super'}}>R$</sup>{plan.price}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:20}}>/mês</div>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                {plan.features.map((f,i)=><li key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--white)'}}><span style={{color:'var(--success)'}}>✓</span>{f}</li>)}
              </ul>
              <button onClick={()=>onSelect(plan.id)} className={(plan as any).featured?'btn-primary':'btn-secondary'} style={{width:'100%',fontSize:13,padding:'12px'}}>{(plan as any).featured?'ASSINAR AGORA':'ASSINAR'}</button>
            </div>
          ))}
        </div>

        {/* Rodapé com retorno explícito */}
        <div style={{marginTop:28,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <div style={{fontSize:13,color:'var(--text-muted)'}}>💳 PIX ou Cartão · 🔒 Pagamento seguro · Cancele quando quiser</div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',justifyContent:'center'}}>
            <button onClick={onClose} className="btn-secondary" style={{fontSize:13,padding:'10px 24px'}}>
              ← Voltar para a plataforma
            </button>
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',textDecoration:'underline',textDecorationColor:'rgba(255,255,255,0.2)',padding:'10px 0'}}>
              Continuar estudando agora
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

function Notification({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(()=>{const t=setTimeout(onClose,4500);return()=>clearTimeout(t)},[onClose])
  return(
    <div style={{position:'fixed',top:90,right:24,zIndex:150,background:'var(--gray)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:14,padding:'16px 20px',minWidth:280,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',animation:'fadeInDown 0.4s ease'}}>
      <div style={{fontSize:12,fontWeight:700,color:'var(--gold)',marginBottom:4}}>🐯 TigerJus</div>
      <div style={{fontSize:13,color:'var(--text-muted)'}}>{msg}</div>
    </div>
  )
}

function XPTooltip({ xp, levelName }: { xp: number; levelName: LevelName }) {
  const [show,setShow]=useState(false)
  const xpNext=XP_NEXT[levelName]||5000
  const xpPrev=XP_PREV[levelName]||0
  const pct=Math.min(100,Math.round(((xp-xpPrev)/(xpNext-xpPrev))*100))
  return(
    <div style={{position:'relative',display:'inline-block'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span style={{cursor:'help',borderBottom:'1px dashed rgba(212,168,67,0.4)',color:'var(--gold)',fontWeight:700}}>{xp.toLocaleString()} XP ℹ️</span>
      {show&&(<div style={{position:'absolute',top:'calc(100% + 8px)',left:'50%',transform:'translateX(-50%)',background:'#1a1a1a',border:'1px solid rgba(212,168,67,0.25)',borderRadius:12,padding:16,width:280,zIndex:100,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--gold)',marginBottom:8}}>O que é XP?</div>
        <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6,marginBottom:12}}>XP representa seus pontos de evolução.</div>
        <div style={{background:'rgba(255,255,255,0.08)',borderRadius:100,height:6,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100}}/></div>
        <div style={{marginTop:10,fontSize:11,color:'var(--text-dim)'}}>Faltam <strong style={{color:'var(--gold)'}}>{(xpNext-xp).toLocaleString()} XP</strong> para o próximo nível</div>
        <div style={{marginTop:8,fontSize:11,color:'var(--text-muted)'}}>💡 Questão certa = +100 XP · Login diário = +50 XP</div>
      </div>)}
    </div>
  )
}

function PremiumGate({ onClose, onUpgrade }: { onClose:()=>void; onUpgrade:()=>void }) {
  const { settings } = useAppSettings()
  return(
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.93)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.22)',borderRadius:24,padding:'48px 40px',textAlign:'center',maxWidth:480,width:'100%'}}>
        <div style={{fontSize:54,marginBottom:18}}>🔒</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:900,lineHeight:1.2,marginBottom:14}}>
          {settings.cta_upgrade_title || 'Recurso'} <span style={{color:'var(--gold)'}}>premium.</span>
        </h2>
        <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28,lineHeight:1.7}}>
          {settings.cta_upgrade_subtitle || 'Faça upgrade para desbloquear este recurso.'}
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28,textAlign:'left'}}>
          {['IA ilimitada','Simulados completos OAB','Radar TigerJus','Trilhas personalizadas','Mapas mentais e PDFs'].map((l,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.12)',borderRadius:10,padding:'12px 16px',fontSize:13}}>
              <span style={{color:'var(--success)'}}>✓</span><span>{l}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{width:'100%',marginBottom:12,fontSize:15,padding:16}} onClick={onUpgrade}>
          🚀 {settings.cta_upgrade_button || 'VER PLANOS'}
        </button>
        <button className="btn-secondary" style={{width:'100%',fontSize:12}} onClick={onClose}>{settings.cta_downgrade_button||'Continuar no plano gratuito'}</button>
        <div style={{marginTop:16,fontSize:11,color:'var(--text-dim)'}}>{settings.upgrade_footer_text||'A partir de R\$1,99/mês · Cancele quando quiser'}</div>
      </div>
    </div>
  )
}

function DashHome({ profile, onNav, showUpgrade, isPago, canAccessPremium, onOpenRadar }: any) {
  const { settings: dashSettings } = useAppSettings()
  const xp=profile?.xp||0
  const levelName=(profile?.level_name||'Filhote') as LevelName
  const streak=profile?.streak||0
  const xpNext=XP_NEXT[levelName]||1000
  const xpPrev=XP_PREV[levelName]||0
  const pct=Math.min(100,Math.round(((xp-xpPrev)/(xpNext-xpPrev))*100))
  const questoes=profile?.questoes_respondidas||0
  const corretas=profile?.questoes_corretas||0
  const taxa=questoes>0?Math.round((corretas/questoes)*100):0

  return(
    <div style={{padding:'24px 20px',flex:1,overflowY:'auto',maxWidth:'100%'}}>
      <AdBannerRotativo isPremium={canAccessPremium}/>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Olá, {profile?.nome?.split(' ')[0]||levelName}! 🔥</h1>
          <p style={{fontSize:14,color:'var(--text-muted)'}}>
            {streak>0?<>Sequência de <span style={{color:'var(--gold)'}}>{streak} dias</span>. Continue!</>:(dashSettings.dashboard_subtitle||'Comece seus estudos hoje.')}
          </p>
        </div>
        {streak>0&&<div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(232,98,26,0.1)',border:'1px solid rgba(232,98,26,0.25)',borderRadius:100,padding:'8px 16px',fontSize:13,fontWeight:700,color:'var(--orange)'}}>🔥 {streak} dias</div>}
      </div>

      <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.12),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:'24px',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-16,top:-16,fontSize:100,opacity:0.04,pointerEvents:'none'}}>🐯</div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--gold)',marginBottom:6}}>NÍVEL — {levelName.toUpperCase()}</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,5vw,32px)',fontWeight:900,marginBottom:4}}><XPTooltip xp={xp} levelName={levelName}/></div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>{xp<xpNext?`${(xpNext-xp).toLocaleString()} XP para o próximo nível 🏆`:'Nível máximo! 👑'}</div>
        <div style={{background:'rgba(255,255,255,0.08)',borderRadius:100,height:8,overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 1s ease'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:11,color:'var(--text-muted)'}}>
          <span>{levelName}</span><span>{pct}%</span><span>Próximo</span>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Questões',value:questoes.toLocaleString(),cls:'var(--gold)',sub:'respondidas'},
          {label:'Taxa Acerto',value:`${taxa}%`,cls:'var(--success)',sub:'aproveitamento'},
          {label:'Streak',value:`${streak} 🔥`,cls:'var(--orange)',sub:'dias seguidos'},
          {label:'XP Total',value:xp.toLocaleString(),cls:'var(--gold)',sub:'pontos ganhos'},
        ].map(s=>(
          <div key={s.label} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{s.label}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,5vw,28px)',fontWeight:900,color:s.cls}}>{s.value}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <AdCardFeed/>

      <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:16,padding:18,marginBottom:16,cursor:'pointer'}} onClick={()=>onNav('quiz')}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:4}}>⚡ QUESTÃO DO DIA</div>
            <div style={{fontWeight:700,fontSize:15}}>Penal — Teoria do Crime: Tipicidade</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>+150 XP bônus ao responder hoje</div>
          </div>
          <button className="btn-gold-sm">+150 XP</button>
        </div>
      </div>

      <div style={{background:canAccessPremium?'linear-gradient(135deg,rgba(58,143,232,0.1),rgba(212,168,67,0.06))':'linear-gradient(135deg,rgba(58,143,232,0.08),rgba(212,168,67,0.06))',border:`1px solid ${canAccessPremium?'rgba(58,143,232,0.25)':'rgba(58,143,232,0.2)'}`,borderRadius:16,padding:20,marginBottom:20,cursor:'pointer',transition:'all 0.2s'}}
        onClick={canAccessPremium?onOpenRadar:showUpgrade}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)'}}
        onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <span style={{fontSize:20}}>🎯</span>
          <div style={{fontSize:16,fontWeight:700,flex:1}}>Radar TigerJus</div>
          {canAccessPremium
            ?<div style={{fontSize:9,fontWeight:800,letterSpacing:'1.5px',textTransform:'uppercase',background:'rgba(76,175,125,0.15)',border:'1px solid rgba(76,175,125,0.3)',color:'var(--success)',padding:'4px 10px',borderRadius:100}}>✓ ATIVO — CLIQUE</div>
            :<div style={{fontSize:9,fontWeight:800,letterSpacing:'1.5px',textTransform:'uppercase',background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.2)',color:'var(--gold)',padding:'4px 10px',borderRadius:100}}>🔒 Premium</div>
          }
        </div>
        <div style={{fontSize:13,color:'var(--text-muted)'}}>
          {canAccessPremium?'Veja os 6 temas com maior probabilidade de cair no 47º Exame OAB →':'Temas com maior probabilidade de cair na próxima OAB.'}
        </div>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(18px,4vw,22px)',fontWeight:900}}>Disciplinas em destaque</h2>
        <button style={{color:'var(--gold)',fontSize:13,border:'none',background:'none',cursor:'pointer'}} onClick={()=>onNav('disciplines')}>Ver todas →</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
        {DISCIPLINES.slice(0,6).map(d=>(
          <div key={d.id} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:16,cursor:'pointer',transition:'all 0.2s'}}
            onClick={()=>onNav('disciplines')}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.2)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{fontSize:22,marginBottom:10}}>{d.icon}</div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:5}}>{d.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>{d.progress}% · {d.q}q</div>
            <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,overflow:'hidden',marginBottom:8}}><div style={{width:`${d.progress}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100}}/></div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{d.tags.map(t=><span key={t} style={{fontSize:9,padding:'2px 6px',background:'rgba(212,168,67,0.07)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:4,color:'var(--gold-dark)',fontWeight:600}}>{t}</span>)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuizPage({ freeQ, setFreeQ, showUpgrade, onXp, profile, isPago }: any) {
  const [disciplina,setDisciplina]=useState<string>('')
  const [modo,setModo]=useState<'Fácil'|'Médio'|'Difícil'>('Fácil')
  const [started,setStarted]=useState(false)
  const [questions,setQuestions]=useState<any[]>([])
  const [loadingQ,setLoadingQ]=useState(false)
  const [cur,setCur]=useState(0)
  const [sel,setSel]=useState<number|null>(null)
  const [answered,setAnswered]=useState(false)
  const [score,setScore]=useState(0)
  const [done,setDone]=useState(false)
  const [time,setTime]=useState(60)
  const MODO_QTD:Record<string,number>={'Fácil':20,'Médio':40,'Difícil':60}
  const MODO_TEMPO:Record<string,number>={'Fácil':60,'Médio':90,'Difícil':120}

  useEffect(()=>{
    if(!started||answered||done)return
    const t=setInterval(()=>setTime(p=>{if(p<=1){clearInterval(t);setAnswered(true);return 0;}return p-1}),1000)
    return()=>clearInterval(t)
  },[started,answered,done,cur])

  const startQuiz=async()=>{
    setLoadingQ(true)
    let query=supabase.from('questoes_oab').select('id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d,resposta_correta,comentario').neq('resposta_correta','*')
    if(disciplina)query=query.ilike('disciplina',`%${disciplina}%`)
    const{data,error}=await query
    if(error||!data||data.length===0){setLoadingQ(false);alert('Nenhuma questão encontrada.');return}
    const shuffled=[...data].sort(()=>Math.random()-0.5).slice(0,MODO_QTD[modo])
    setQuestions(shuffled.map((q:any)=>({id:q.id,disc:q.disciplina,q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:['A','B','C','D'].indexOf(q.resposta_correta),exp:q.comentario||''})))
    setLoadingQ(false);setStarted(true);setCur(0);setSel(null);setAnswered(false);setScore(0);setDone(false);setTime(MODO_TEMPO[modo])
  }

  const pick=(i:number)=>{
    if(answered)return
    if(!isPago && freeQ<=0){showUpgrade();return}
    setSel(i);setAnswered(true)
    if(!isPago)setFreeQ((p:number)=>p-1)
    if(i===questions[cur].correct){setScore(p=>p+1);onXp('question_correct')}else onXp('question_wrong')
  }
  const next=()=>{if(cur+1>=questions.length){setDone(true);return}setCur(p=>p+1);setSel(null);setAnswered(false);setTime(MODO_TEMPO[modo])}
  const restart=()=>{setStarted(false);setDone(false);setScore(0);setCur(0)}

  if(!started)return(
    <div style={{padding:'24px 20px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Quiz OAB 📝</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:6}}>Questões reais dos exames 42º ao 46º da OAB.</p>
      <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(212,168,67,0.08)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:100,padding:'5px 12px',fontSize:11,color:'var(--gold)',marginBottom:24}}>📋 400 questões reais no banco</div>
      {!isPago&&(
        <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--gold)'}}>
          ⚡ Plano gratuito: <strong>{freeQ} questões restantes</strong>. Faça upgrade para questões ilimitadas.
        </div>
      )}
      <div style={{maxWidth:560,background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:'24px'}}>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:10}}>Disciplina (opcional)</label>
          <select value={disciplina} onChange={e=>setDisciplina(e.target.value)} style={{width:'100%',background:'#1c1c1c',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'12px 16px',color:'#fff',fontSize:14,fontFamily:'var(--font-body)',colorScheme:'dark'}}>
            <option value="">Todas as disciplinas</option>
            {Object.keys(DISC_MAP).map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{marginBottom:28}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:10}}>Modo — <span style={{color:'var(--gold)'}}>{modo} ({MODO_QTD[modo]} questões · {MODO_TEMPO[modo]}s por questão)</span></label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {(['Fácil','Médio','Difícil'] as const).map(m=>(
              <button key={m} onClick={()=>{if(m!=='Fácil'&&!isPago){showUpgrade();return}setModo(m)}} style={{padding:'12px 8px',borderRadius:10,border:modo===m?'1px solid rgba(212,168,67,0.5)':'1px solid rgba(255,255,255,0.08)',background:modo===m?'rgba(212,168,67,0.1)':'transparent',color:modo===m?'var(--gold)':m!=='Fácil'&&!isPago?'var(--text-dim)':'var(--text-muted)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)',textAlign:'center',position:'relative'}}>
                <div>{m} {m!=='Fácil'&&!isPago&&'🔒'}</div>
                <div style={{fontSize:10,marginTop:3,opacity:0.7}}>{MODO_QTD[m]}q · {MODO_TEMPO[m]}s/q</div>
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary" style={{width:'100%',fontSize:15,padding:16}} onClick={startQuiz} disabled={loadingQ}>
          {loadingQ?'⏳ Carregando...':'INICIAR QUIZ →'}
        </button>
        <div style={{marginTop:10,textAlign:'center',fontSize:12,color:'var(--text-muted)'}}>
          {isPago?'✓ Ilimitado':freeQ>0?`${freeQ} grátis restantes`:'🔒 Limite atingido'}
        </div>
      </div>
    </div>
  )

  const q=questions[cur]
  const pct=Math.round(((cur+(answered?1:0))/questions.length)*100)

  if(done){
    const rate=Math.round((score/questions.length)*100)
    const aprovado=score>=Math.ceil(questions.length*0.625)
    return(
      <div style={{padding:'24px 20px',flex:1}}>
        <div style={{maxWidth:600,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:60,marginBottom:18}}>{aprovado?'🏆':rate>=50?'📝':'💪'}</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:8}}>Quiz Concluído!</h1>
          <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>{score} de {questions.length} corretas · Modo {modo}</p>
          <div style={{background:aprovado?'rgba(76,175,125,0.1)':'rgba(232,98,26,0.1)',border:`1px solid ${aprovado?'var(--success)':'var(--orange)'}`,borderRadius:16,padding:18,marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:900,color:aprovado?'var(--success)':'var(--orange)',marginBottom:6}}>{aprovado?'✅ Na média OAB!':'❌ Abaixo da média OAB'}</div>
            <div style={{fontSize:13,color:'var(--text-muted)'}}>{aprovado?`${rate}% — acima dos 62,5% exigidos.`:`Precisa de ${Math.ceil(questions.length*0.625)} acertos.`}</div>
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button className="btn-primary" onClick={restart}>NOVO QUIZ</button>
            <button className="btn-secondary" onClick={restart}>MUDAR MODO</button>
          </div>
        </div>
      </div>
    )
  }

  return(
    <div style={{padding:'24px 20px',flex:1}}>
      <div style={{maxWidth:680,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:13,color:'var(--text-muted)'}}>Q{cur+1}/{questions.length} · {modo}</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:18,fontWeight:700,color:time<20?'var(--danger)':'var(--gold)'}}>{String(Math.floor(time/60)).padStart(2,'0')}:{String(time%60).padStart(2,'0')}</div>
        </div>
        <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:24,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}}/></div>
        <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:'24px'}}>
          <div style={{display:'flex',gap:8,marginBottom:14}}><span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)'}}>{q.disc}</span><span style={{fontSize:10,color:'var(--text-muted)'}}>· OAB Oficial</span></div>
          <div style={{fontSize:'clamp(14px,3vw,18px)',fontWeight:600,lineHeight:1.6,marginBottom:24}}>{q.q}</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {q.opts.map((opt:string,i:number)=>{
              let bg='rgba(255,255,255,0.03)',bc='rgba(255,255,255,0.08)',color='var(--white)'
              if(answered){if(i===q.correct){bg='rgba(76,175,125,0.1)';bc='var(--success)';color='var(--success)'}else if(i===sel){bg='rgba(232,66,26,0.1)';bc='var(--danger)';color='var(--danger)'}}
              return(<button key={i} onClick={()=>pick(i)} style={{display:'flex',alignItems:'flex-start',gap:12,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'14px 16px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:'clamp(13px,2.5vw,14px)',color}}>
                <span style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,background:'rgba(255,255,255,0.06)'}}>{String.fromCharCode(65+i)}</span>
                <span style={{flex:1}}>{opt}</span>
              </button>)
            })}
          </div>
          {answered&&q.exp&&<div style={{marginTop:20,padding:16,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:13,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> {q.exp}</div>}
          {answered&&<button className="btn-primary" style={{width:'100%',marginTop:18}} onClick={next}>{cur+1>=questions.length?'VER RESULTADO':'PRÓXIMA →'}</button>}
        </div>
      </div>
    </div>
  )
}

function IAPage({ freeIA, setFreeIA, showUpgrade, profile, isPago }: any) {
  const { settings: iaSettings } = useAppSettings()
  const [msgs,setMsgs]=useState([{role:'assistant',text:iaSettings.ia_welcome_message||'Olá! Sou o TigerJus AI — seu tutor jurídico de alta performance. 🐯⚖️\n\nPosso te ajudar com dúvidas de Direito, explicar artigos, resumir temas e te preparar para a OAB.\n\nO que você quer aprender hoje?'}])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const endRef=useRef<HTMLDivElement>(null)
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  const send=async(text?:string)=>{
    const msg=text||input.trim()
    if(!msg)return
    if(!isPago && freeIA<=0){showUpgrade();return}
    setInput('')
    if(!isPago)setFreeIA((p:number)=>p-1)
    const newMsgs=[...msgs,{role:'user',text:msg}]
    setMsgs(newMsgs);setLoading(true)
    try{
      const res=await fetch('/api/ia',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:newMsgs.slice(1).map(m=>({role:m.role,content:m.text})),userId:profile?.id,plan:profile?.plano||'gratuito'})})
      const data=await res.json()
      if(data.error==='LIMIT_REACHED'){showUpgrade();return}
      setMsgs(p=>[...p,{role:'assistant',text:data.text||'Erro ao conectar.'}])
    }catch{setMsgs(p=>[...p,{role:'assistant',text:'Erro ao conectar com a IA.'}])}
    finally{setLoading(false)}
  }

  const chips=['Explique habeas corpus','O que é dolo eventual?','Resumir Constitucional','Cláusula pétrea','Princípio da legalidade penal']
  return(
    <div style={{padding:'24px 20px',flex:1,display:'flex',flexDirection:'column'}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>IA Jurídica 🤖</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:12}}>
        Tutor inteligente 24/7. {isPago?<span style={{color:'var(--success)',fontWeight:700}}>Ilimitado</span>:freeIA>0?<span style={{color:'var(--gold)',fontWeight:700}}>{freeIA} perguntas grátis</span>:<span style={{color:'var(--danger)'}}>🔒 Limite atingido</span>}
      </p>
      {!isPago&&freeIA<=0&&(
        <div style={{background:'rgba(232,66,26,0.08)',border:'1px solid rgba(232,66,26,0.2)',borderRadius:12,padding:'14px 16px',marginBottom:16,fontSize:13}}>
          🔒 Você atingiu o limite de perguntas do plano gratuito.
          <button onClick={showUpgrade} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)',marginLeft:8,fontWeight:700}}>Fazer upgrade →</button>
        </div>
      )}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        {chips.map(c=><button key={c} onClick={()=>send(c)} style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.14)',borderRadius:100,padding:'5px 12px',fontSize:11,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font-body)'}}>{c}</button>)}
      </div>
      <div style={{flex:1,background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:350}}>
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:14,padding:20}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:'flex',gap:10,maxWidth:'85%',alignSelf:m.role==='user'?'flex-end':'flex-start',flexDirection:m.role==='user'?'row-reverse':'row'}}>
              <div style={{width:34,height:34,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,background:m.role==='user'?'var(--gray-light)':'linear-gradient(135deg,var(--gold),var(--orange))'}}>{m.role==='user'?'👤':'🐯'}</div>
              <div style={{background:m.role==='user'?'rgba(212,168,67,0.1)':'rgba(255,255,255,0.04)',border:m.role==='user'?'1px solid rgba(212,168,67,0.2)':'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'12px 16px',fontSize:13,lineHeight:1.7,color:'var(--white)',whiteSpace:'pre-wrap'}}>{m.text}</div>
            </div>
          ))}
          {loading&&<div style={{display:'flex',gap:10}}><div style={{width:34,height:34,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,var(--gold),var(--orange))'}}>🐯</div><div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'12px 16px',fontSize:13,opacity:0.6,fontStyle:'italic'}}>Analisando...</div></div>}
          <div ref={endRef}/>
        </div>
        <div style={{display:'flex',gap:10,padding:14,background:'var(--gray-mid)',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <textarea className="form-input" placeholder="Pergunte algo jurídico..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} style={{flex:1,resize:'none',minHeight:42}} rows={1} disabled={!isPago&&freeIA<=0}/>
          <button onClick={()=>send()} disabled={!isPago&&freeIA<=0} style={{background:'linear-gradient(135deg,var(--gold),var(--orange))',border:'none',borderRadius:10,width:42,height:42,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:17,color:'var(--deep-black)',opacity:(!isPago&&freeIA<=0)?0.4:1}}>➤</button>
        </div>
      </div>
    </div>
  )
}

// ─── RESUMO RENDERER — markdown-light ────────────────────────────────────────
function ResumoRenderer({ texto }: { texto: string }) {
  const linhas = texto.split('\n')
  return (
    <div style={{fontSize:14, lineHeight:1.9, color:'var(--text-muted)'}}>
      {linhas.map((linha, i) => {
        const trim = linha.trim()
        // Linha vazia → espaço
        if (!trim) return <div key={i} style={{height:8}}/>
        // TÍTULO — linha toda maiúscula com mais de 4 chars
        if (trim === trim.toUpperCase() && trim.length > 4 && !trim.startsWith('-') && !trim.startsWith('•'))
          return <div key={i} style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:900,color:'var(--white)',marginTop:i>0?20:0,marginBottom:8,letterSpacing:0.3}}>{trim}</div>
        // BULLET — começa com - ou •
        if (trim.startsWith('- ') || trim.startsWith('• '))
          return (
            <div key={i} style={{display:'flex',gap:8,marginBottom:4,paddingLeft:4}}>
              <span style={{color:'var(--gold)',flexShrink:0,marginTop:2}}>▸</span>
              <span>{trim.replace(/^[-•]\s/,'')}</span>
            </div>
          )
        // Parágrafo normal
        return <div key={i} style={{marginBottom:4}}>{trim}</div>
      })}
    </div>
  )
}

// ─── RESUMO SECTION — busca banco + cache + fallback ─────────────────────────
function ResumoSection({ disc, onNav }: { disc: any; onNav: (tab: string) => void }) {
  const [estado, setEstado] = useState<'loading'|'banco'|'local'|'vazio'>('loading')
  const [texto, setTexto] = useState('')
  const [resumoCurto, setResumoCurto] = useState('')
  const fetchingRef = useRef(false)
  const cacheRef = useRef<Map<string, {texto:string; curto:string; fonte:'banco'|'local'|'vazio'}>>(new Map())

  useEffect(() => {
    setEstado('loading'); setTexto(''); setResumoCurto('')

    const cached = cacheRef.current.get(disc.slug)
    if (cached) { setTexto(cached.texto); setResumoCurto(cached.curto); setEstado(cached.fonte); return }

    if (fetchingRef.current) return
    fetchingRef.current = true

    const carregar = async () => {
      try {
        // 1. Tenta banco
        const { data } = await supabase
          .from('discipline_summaries')
          .select('resumo, resumo_curto, tipo, tags, nivel_dificuldade')
          .eq('disciplina_slug', disc.slug)
          .eq('ativo', true)
          .maybeSingle()

        if (data?.resumo) {
          const entry = { texto: data.resumo, curto: data.resumo_curto || '', fonte: 'banco' as const }
          cacheRef.current.set(disc.slug, entry)
          setTexto(entry.texto); setResumoCurto(entry.curto); setEstado('banco')
          return
        }

        // 2. Fallback local (RESUMOS hardcoded)
        const local = RESUMOS[disc.slug]
        if (local) {
          const entry = { texto: local, curto: '', fonte: 'local' as const }
          cacheRef.current.set(disc.slug, entry)
          setTexto(local); setResumoCurto(''); setEstado('local')
          return
        }

        // 3. Vazio
        cacheRef.current.set(disc.slug, { texto:'', curto:'', fonte:'vazio' })
        setEstado('vazio')
      } catch {
        setEstado('vazio')
      } finally {
        fetchingRef.current = false
      }
    }
    carregar()
  }, [disc.slug])

  // Loading skeleton
  if (estado === 'loading') return (
    <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:24}}>
      {[90,70,80,60,75].map((w,i) => (
        <div key={i} style={{height:14,borderRadius:6,marginBottom:12,background:'rgba(255,255,255,0.06)',width:`${w}%`,animation:'pulse 1.5s infinite'}}/>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )

  // Vazio — empty state com CTA
  if (estado === 'vazio') return (
    <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:32,textAlign:'center'}}>
      <div style={{fontSize:40,marginBottom:14}}>📖</div>
      <h3 style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,marginBottom:8,color:'var(--white)'}}>
        Resumo em preparação
      </h3>
      <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7,marginBottom:24,maxWidth:380,margin:'0 auto 24px'}}>
        O resumo de <strong style={{color:'var(--gold)'}}>{disc.name}</strong> ainda está sendo elaborado.
        Enquanto isso, pratique com as questões disponíveis.
      </p>
      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
        <button className="btn-primary" style={{fontSize:13}} onClick={() => onNav('quiz')}>
          📝 Fazer Quiz
        </button>
        <button className="btn-secondary" style={{fontSize:13}} onClick={() => onNav('flash')}>
          🃏 Ver Flashcards
        </button>
        <button className="btn-secondary" style={{fontSize:13}} onClick={() => onNav('ia')}>
          🤖 Perguntar à IA
        </button>
      </div>
    </div>
  )

  // Banco ou local — exibe resumo
  return (
    <div>
      {resumoCurto && (
        <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,color:'var(--gold)',lineHeight:1.6}}>
          {resumoCurto}
        </div>
      )}
      <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:'24px'}}>
        <ResumoRenderer texto={texto} />
        {estado === 'local' && (
          <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.06)',fontSize:11,color:'var(--text-dim)'}}>
            📌 Resumo base · Atualizado conforme novas provas são adicionadas.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DISCIPLINES PAGE ─────────────────────────────────────────────────────────
function DisciplinesPage({ showUpgrade, profile, isPago, canAccessPremium }: any) {
  const [selected,setSelected]=useState<any>(null)
  const [subTab,setSubTab]=useState<'resumo'|'quiz'|'flash'|'pdf'>('resumo')
  const [gerandoPDF,setGerandoPDF]=useState(false)

  const handlePDF=async(disc:any)=>{
    if(!isPago){showUpgrade();return}
    setGerandoPDF(true)
    try{
      const resumo=RESUMOS[disc.slug]||`${disc.name} — Resumo em elaboração.`
      const{data}=await supabase.from('questoes_oab').select('*').ilike('disciplina',`%${disc.name.split(' ')[0]}%`).neq('resposta_correta','*').limit(20)
      await gerarPDF(disc,resumo,data||[])
    }finally{setGerandoPDF(false)}
  }

  // Navegar para aba e opcionalmente para IA (no menu principal)
  const navTab = (tab: string) => {
    if (tab === 'ia') { /* handled by parent via setPage — não temos acesso aqui, IA está no menu */ return }
    setSubTab(tab as any)
  }

  if(selected){
    return(
      <div style={{padding:'24px 20px',flex:1}}>
        <button onClick={()=>setSelected(null)} style={{display:'flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,border:'none',background:'none',cursor:'pointer',marginBottom:20,fontFamily:'var(--font-body)'}}>← Voltar</button>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
          <span style={{fontSize:36}}>{selected.icon}</span>
          <div>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,5vw,28px)',fontWeight:900}}>{selected.name}</h1>
            <p style={{fontSize:12,color:'var(--text-muted)'}}>{selected.q} questões · {selected.progress}% concluído</p>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          {(['resumo','quiz','flash','pdf'] as const).map(t=>(
            <button key={t} onClick={()=>setSubTab(t)} style={{padding:'9px 18px',borderRadius:10,border:subTab===t?'1px solid rgba(212,168,67,0.4)':'1px solid rgba(255,255,255,0.08)',background:subTab===t?'rgba(212,168,67,0.1)':'transparent',color:subTab===t?'var(--gold)':'var(--text-muted)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)'}}>
              {t==='resumo'?'📖 Resumo':t==='quiz'?'📝 Quiz':t==='flash'?'🃏 Flashcards':isPago?'📄 PDF':'🔒 PDF'}
            </button>
          ))}
        </div>
        {subTab==='resumo'&&<ResumoSection disc={selected} onNav={navTab}/>}
        {subTab==='quiz'&&<QuizDisciplina disciplina={selected.name}/>}
        {subTab==='flash'&&<FlashCards disciplina={selected.name}/>}
        {subTab==='pdf'&&(
          <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:40,textAlign:'center'}}>
            {isPago?(
              <>
                <div style={{fontSize:44,marginBottom:14}}>📄</div>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,marginBottom:8}}>PDF — {selected.name}</h3>
                <p style={{color:'var(--text-muted)',marginBottom:24,fontSize:14}}>Resumo essencial + questões OAB reais com gabarito comentado.</p>
                <button className="btn-primary" onClick={()=>handlePDF(selected)} disabled={gerandoPDF} style={{minWidth:220,fontSize:14}}>
                  {gerandoPDF?'⏳ Gerando PDF...':'📄 GERAR E BAIXAR PDF'}
                </button>
              </>
            ):(
              <>
                <div style={{fontSize:44,marginBottom:14}}>🔒</div>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,marginBottom:8}}>PDF — Recurso Pago</h3>
                <p style={{color:'var(--text-muted)',marginBottom:24,fontSize:14}}>Faça upgrade para gerar PDFs com resumos e questões OAB.</p>
                <button className="btn-primary" onClick={showUpgrade} style={{minWidth:220,fontSize:14}}>🚀 VER PLANOS</button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return(
    <div style={{padding:'24px 20px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Disciplinas 📚</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>17 disciplinas com resumos, quizzes, flashcards e PDFs.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
        {DISCIPLINES.map(d=>(
          <div key={d.id} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:16,cursor:'pointer',transition:'all 0.2s'}}
            onClick={()=>setSelected(d)}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.2)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{fontSize:22,marginBottom:10}}>{d.icon}</div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:5}}>{d.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>{d.progress}% · {d.q}q</div>
            <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,overflow:'hidden',marginBottom:8}}><div style={{width:`${d.progress}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100}}/></div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{d.tags.map(t=><span key={t} style={{fontSize:9,padding:'2px 6px',background:'rgba(212,168,67,0.07)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:4,color:'var(--gold-dark)',fontWeight:600}}>{t}</span>)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ALIASES DE DISCIPLINA ────────────────────────────────────────────────────
// Mapeia o nome exibido na UI para possíveis valores no banco (questoes_oab / flashcards)
const DISCIPLINA_ALIASES: Record<string, string[]> = {
  'Constitucional':   ['Direito Constitucional', 'Constitucional'],
  'Administrativo':   ['Direito Administrativo', 'Administrativo'],
  'Penal':            ['Direito Penal', 'Penal'],
  'Processo Penal':   ['Direito Processual Penal', 'Processo Penal', 'Processual Penal'],
  'Civil':            ['Direito Civil', 'Civil'],
  'Processo Civil':   ['Direito Processual Civil', 'Processo Civil', 'Processual Civil'],
  'Trabalho':         ['Direito do Trabalho', 'Trabalho', 'Direito Trabalhista'],
  'Proc. Trabalho':   ['Direito Processual do Trabalho', 'Processo do Trabalho', 'Proc. Trabalho', 'Processual do Trabalho'],
  'Tributário':       ['Direito Tributário', 'Tributário'],
  'Empresarial':      ['Direito Empresarial', 'Empresarial', 'Direito Comercial'],
  'Ética OAB':        ['Ética e Estatuto da OAB', 'Ética OAB', 'Ética', 'Estatuto da OAB', 'Ética Profissional'],
  'Consumidor':       ['Direito do Consumidor', 'Consumidor', 'CDC'],
  'Direitos Humanos': ['Direitos Humanos', 'Direito Internacional dos Direitos Humanos'],
  'Ambiental':        ['Direito Ambiental', 'Ambiental'],
  'Filosofia':        ['Filosofia do Direito', 'Filosofia', 'Sociologia Jurídica'],
  'Internacional':    ['Direito Internacional', 'Direito Internacional Público', 'Direito Internacional Privado', 'Internacional'],
  'ECA':              ['Direito da Criança e do Adolescente', 'ECA', 'Estatuto da Criança e do Adolescente', 'Direito da Criança'],
}

/**
 * Retorna os termos de busca para uma disciplina:
 * 1º o nome exato da UI, 2º os aliases, 3º o primeiro token como fallback ilike
 */
function getDisciplinaAliases(disciplina: string): string[] {
  return DISCIPLINA_ALIASES[disciplina] ?? [disciplina]
}

// ─── FLASHCARDS PAGE — tela geral do menu lateral ────────────────────────────
function FlashCardsPage() {
  const [disciplinaAtiva, setDisciplinaAtiva] = useState<string|null>(null)

  // Grid de disciplinas
  if (!disciplinaAtiva) return (
    <div style={{padding:'24px 20px', flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)', fontSize:'clamp(22px,5vw,32px)', fontWeight:900, marginBottom:6}}>
        Flashcards 🃏
      </h1>
      <p style={{fontSize:14, color:'var(--text-muted)', marginBottom:24}}>
        Escolha uma disciplina para revisar com flashcards gerados das questões reais da OAB.
      </p>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12}}>
        {DISCIPLINES.map(d => (
          <div
            key={d.id}
            style={{background:'var(--gray)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:14, padding:16, cursor:'pointer', transition:'all 0.2s'}}
            onClick={() => setDisciplinaAtiva(d.name)}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(212,168,67,0.2)'; e.currentTarget.style.transform='translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; e.currentTarget.style.transform='translateY(0)' }}
          >
            <div style={{fontSize:28, marginBottom:10}}>{d.icon}</div>
            <div style={{fontSize:13, fontWeight:700, marginBottom:4}}>{d.name}</div>
            <div style={{fontSize:11, color:'var(--text-muted)', marginBottom:10}}>{d.q} questões</div>
            <div style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'var(--gold)', fontWeight:600}}>
              🃏 Ver flashcards →
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Tela de flashcards da disciplina selecionada
  return (
    <div style={{padding:'24px 20px', flex:1}}>
      <button
        onClick={() => setDisciplinaAtiva(null)}
        style={{display:'flex', alignItems:'center', gap:8, color:'var(--text-muted)', fontSize:13, border:'none', background:'none', cursor:'pointer', marginBottom:20, fontFamily:'var(--font-body)'}}
      >
        ← Voltar às disciplinas
      </button>
      <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:24}}>
        <span style={{fontSize:36}}>
          {DISCIPLINES.find(d => d.name === disciplinaAtiva)?.icon || '🃏'}
        </span>
        <div>
          <h1 style={{fontFamily:'var(--font-display)', fontSize:'clamp(20px,5vw,28px)', fontWeight:900}}>
            {disciplinaAtiva}
          </h1>
          <p style={{fontSize:12, color:'var(--text-muted)'}}>Flashcards gerados das questões OAB</p>
        </div>
      </div>
      {/* Reaproveitamento direto do componente FlashCards existente */}
      <FlashCards disciplina={disciplinaAtiva}/>
    </div>
  )
}

// ─── QUIZ POR DISCIPLINA — busca real do banco filtrada por disciplina ────────
function QuizDisciplina({disciplina}:{disciplina:string}) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [started, setStarted] = useState(false)
  const [cur, setCur] = useState(0)
  const [sel, setSel] = useState<number|null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [time, setTime] = useState(90)
  const fetchingRef = useRef(false)
  const cacheRef = useRef<Map<string, any[]>>(new Map())

  // Busca questões ao montar ou trocar disciplina
  useEffect(() => {
    setStarted(false); setDone(false); setScore(0); setCur(0)
    setSel(null); setAnswered(false); setErro(false)

    const cached = cacheRef.current.get(disciplina)
    if (cached) { setQuestions(cached); setLoading(false); return }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    const carregar = async () => {
      try {
        const aliases = getDisciplinaAliases(disciplina)
        let data: any[] | null = null
        let error: any = null

        // Tentativa 1: match exato em cada alias
        for (const alias of aliases) {
          const res = await supabase
            .from('questoes_oab')
            .select('id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d,resposta_correta,comentario')
            .eq('disciplina', alias)
            .neq('resposta_correta', '*')
          if (!res.error && res.data && res.data.length > 0) {
            data = res.data; error = null; break
          }
          error = res.error
        }

        // Tentativa 2: ilike com primeiro token se aliases falharam
        if (!error && (!data || data.length === 0)) {
          const token = aliases[0].split(' ')[0]
          const fb = await supabase
            .from('questoes_oab')
            .select('id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d,resposta_correta,comentario')
            .ilike('disciplina', `%${token}%`)
            .neq('resposta_correta', '*')
          data = fb.data; error = fb.error
        }

        if (error) { setErro(true); return }

        // Embaralha e limita (provisório — futuramente virá de plan_settings.mini_simulado_qtd)
        const shuffled = [...(data||[])].sort(() => Math.random() - 0.5).slice(0, 20)
        const formatted = shuffled.map((q:any) => ({
          id: q.id, disc: q.disciplina, q: q.enunciado,
          opts: [q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d],
          correct: ['A','B','C','D'].indexOf(q.resposta_correta),
          exp: q.comentario || '',
        }))
        cacheRef.current.set(disciplina, formatted)
        setQuestions(formatted)
      } catch { setErro(true) }
      finally { setLoading(false); fetchingRef.current = false }
    }
    carregar()
  }, [disciplina])

  // Timer por questão
  useEffect(() => {
    if (!started || answered || done) return
    const t = setInterval(() => setTime(p => {
      if (p <= 1) { clearInterval(t); setAnswered(true); return 0 }
      return p - 1
    }), 1000)
    return () => clearInterval(t)
  }, [started, answered, done, cur])

  const pick = (i: number) => {
    if (answered) return
    setSel(i); setAnswered(true)
    if (i === questions[cur].correct) setScore(p => p + 1)
  }

  const next = () => {
    if (cur + 1 >= questions.length) { setDone(true); return }
    setCur(p => p + 1); setSel(null); setAnswered(false); setTime(90)
  }

  const restart = () => {
    // Limpa cache para embaralhar novamente
    cacheRef.current.delete(disciplina)
    fetchingRef.current = false
    setStarted(false); setDone(false); setScore(0); setCur(0)
    setSel(null); setAnswered(false); setLoading(true); setErro(false)
    // Re-dispara o useEffect
    const carregar = async () => {
      try {
        const aliases = getDisciplinaAliases(disciplina)
        let data: any[] | null = null
        let error: any = null
        for (const alias of aliases) {
          const res = await supabase
            .from('questoes_oab')
            .select('id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d,resposta_correta,comentario')
            .eq('disciplina', alias).neq('resposta_correta', '*')
          if (!res.error && res.data && res.data.length > 0) { data = res.data; error = null; break }
          error = res.error
        }
        if (!error && (!data || data.length === 0)) {
          const fb = await supabase
            .from('questoes_oab')
            .select('id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d,resposta_correta,comentario')
            .ilike('disciplina', `%${getDisciplinaAliases(disciplina)[0].split(' ')[0]}%`).neq('resposta_correta', '*')
          data = fb.data; error = fb.error
        }
        if (error) { setErro(true); return }
        const shuffled = [...(data||[])].sort(() => Math.random() - 0.5).slice(0, 20)
        const formatted = shuffled.map((q:any) => ({
          id: q.id, disc: q.disciplina, q: q.enunciado,
          opts: [q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d],
          correct: ['A','B','C','D'].indexOf(q.resposta_correta),
          exp: q.comentario || '',
        }))
        cacheRef.current.set(disciplina, formatted)
        setQuestions(formatted)
      } catch { setErro(true) }
      finally { setLoading(false) }
    }
    carregar()
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{padding:'40px 0', textAlign:'center'}}>
      <div style={{fontSize:36, marginBottom:12}}>⏳</div>
      <div style={{fontSize:13, color:'var(--text-muted)'}}>
        Carregando questões de <strong style={{color:'var(--gold)'}}>{disciplina}</strong>...
      </div>
    </div>
  )

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (erro) return (
    <div style={{padding:'40px 0', textAlign:'center'}}>
      <div style={{fontSize:36, marginBottom:12}}>⚠️</div>
      <div style={{fontSize:14, fontWeight:700, marginBottom:8}}>Não foi possível carregar as questões.</div>
      <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:20}}>Verifique sua conexão e tente novamente.</div>
      <button className="btn-secondary" style={{fontSize:12}} onClick={() => {
        cacheRef.current.delete(disciplina); fetchingRef.current = false
        setErro(false); setLoading(true)
      }}>🔄 Tentar novamente</button>
    </div>
  )

  // ── Vazio ──────────────────────────────────────────────────────────────────
  if (questions.length === 0) return (
    <div style={{padding:'40px 0', textAlign:'center'}}>
      <div style={{fontSize:40, marginBottom:12}}>📝</div>
      <div style={{fontSize:14, fontWeight:700, marginBottom:8}}>Nenhuma questão disponível</div>
      <div style={{fontSize:12, color:'var(--text-muted)'}}>
        As questões de <strong style={{color:'var(--gold)'}}>{disciplina}</strong> ainda estão sendo preparadas.
      </div>
    </div>
  )

  // ── Tela inicial ───────────────────────────────────────────────────────────
  if (!started) return (
    <div style={{maxWidth:560}}>
      <div style={{background:'var(--gray)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:24}}>
        <div style={{fontSize:10, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:12}}>
          📝 QUIZ — {disciplina.toUpperCase()}
        </div>
        <div style={{fontSize:28, fontWeight:900, fontFamily:'var(--font-display)', marginBottom:8}}>
          {questions.length} questões
        </div>
        <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:24, lineHeight:1.6}}>
          Questões reais da OAB filtradas por <strong style={{color:'var(--gold)'}}>{disciplina}</strong>. 90 segundos por questão.
        </div>
        <button className="btn-primary" style={{width:'100%', fontSize:14, padding:14}} onClick={() => { setStarted(true); setTime(90) }}>
          INICIAR QUIZ →
        </button>
      </div>
    </div>
  )

  // ── Resultado ──────────────────────────────────────────────────────────────
  if (done) {
    const rate = Math.round((score / questions.length) * 100)
    const aprovado = score >= Math.ceil(questions.length * 0.625)
    return (
      <div style={{maxWidth:560, textAlign:'center'}}>
        <div style={{fontSize:54, marginBottom:16}}>{aprovado ? '🏆' : rate >= 50 ? '📝' : '💪'}</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:26, fontWeight:900, marginBottom:8}}>Quiz Concluído!</h2>
        <p style={{fontSize:13, color:'var(--text-muted)', marginBottom:20}}>
          {score} de {questions.length} corretas · {disciplina}
        </p>
        <div style={{background:aprovado?'rgba(76,175,125,0.1)':'rgba(232,98,26,0.1)', border:`1px solid ${aprovado?'var(--success)':'var(--orange)'}`, borderRadius:14, padding:16, marginBottom:20}}>
          <div style={{fontSize:16, fontWeight:900, color:aprovado?'var(--success)':'var(--orange)', marginBottom:4}}>
            {aprovado ? '✅ Na média OAB!' : '❌ Abaixo da média OAB'}
          </div>
          <div style={{fontSize:12, color:'var(--text-muted)'}}>
            {aprovado ? `${rate}% — acima dos 62,5% exigidos.` : `Precisava de ${Math.ceil(questions.length * 0.625)} acertos.`}
          </div>
        </div>
        <button className="btn-primary" style={{width:'100%'}} onClick={restart}>
          🔄 NOVO QUIZ
        </button>
      </div>
    )
  }

  // ── Questão ────────────────────────────────────────────────────────────────
  const q = questions[cur]
  const pct = Math.round(((cur + (answered ? 1 : 0)) / questions.length) * 100)

  return (
    <div style={{maxWidth:680}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{fontSize:12, color:'var(--text-muted)'}}>Q{cur+1}/{questions.length} · {disciplina}</div>
        <div style={{fontFamily:'var(--font-mono)', fontSize:16, fontWeight:700, color:time<20?'var(--danger)':'var(--gold)'}}>
          {String(Math.floor(time/60)).padStart(2,'0')}:{String(time%60).padStart(2,'0')}
        </div>
      </div>
      <div style={{background:'rgba(255,255,255,0.06)', borderRadius:100, height:4, marginBottom:20, overflow:'hidden'}}>
        <div style={{width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,var(--gold),var(--orange))', borderRadius:100, transition:'width 0.4s'}}/>
      </div>
      <div style={{background:'var(--gray)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px'}}>
        <div style={{display:'flex', gap:8, marginBottom:14}}>
          <span style={{fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)'}}>{q.disc}</span>
          <span style={{fontSize:10, color:'var(--text-muted)'}}>· OAB Oficial</span>
        </div>
        <div style={{fontSize:'clamp(14px,3vw,17px)', fontWeight:600, lineHeight:1.7, marginBottom:20}}>{q.q}</div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {q.opts.map((opt:string, i:number) => {
            let bg='rgba(255,255,255,0.03)', bc='rgba(255,255,255,0.08)', color='var(--white)'
            if (answered) {
              if (i === q.correct) { bg='rgba(76,175,125,0.1)'; bc='var(--success)'; color='var(--success)' }
              else if (i === sel) { bg='rgba(232,66,26,0.1)'; bc='var(--danger)'; color='var(--danger)' }
            }
            return (
              <button key={i} onClick={() => pick(i)} style={{display:'flex', alignItems:'flex-start', gap:12, background:bg, border:`1px solid ${bc}`, borderRadius:12, padding:'12px 14px', cursor:'pointer', transition:'all 0.2s', textAlign:'left', width:'100%', fontFamily:'var(--font-body)', fontSize:'clamp(13px,2.5vw,14px)', color}}>
                <span style={{width:26, height:26, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, background:'rgba(255,255,255,0.06)', color:'var(--white)'}}>{String.fromCharCode(65+i)}</span>
                <span style={{flex:1}}>{opt}</span>
              </button>
            )
          })}
        </div>
        {answered && q.exp && (
          <div style={{marginTop:18, padding:14, background:'rgba(212,168,67,0.06)', border:'1px solid rgba(212,168,67,0.15)', borderRadius:12, fontSize:13, lineHeight:1.7, color:'var(--text-muted)'}}>
            {sel === q.correct ? '✅ ' : '❌ '}
            <strong style={{color:'var(--gold)'}}>{sel === q.correct ? 'Correto!' : 'Incorreto.'}</strong> {q.exp}
          </div>
        )}
        {answered && (
          <button className="btn-primary" style={{width:'100%', marginTop:16}} onClick={next}>
            {cur + 1 >= questions.length ? 'VER RESULTADO' : 'PRÓXIMA →'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── FLASHCARDS — busca real do banco por disciplina ──────────────────────────
function FlashCards({disciplina}:{disciplina:string}) {
  const [cards, setCards] = useState<{id:string; frente:string; verso:string}[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const fetchingRef = useRef(false)
  const cacheRef = useRef<Map<string, {id:string; frente:string; verso:string}[]>>(new Map())

  useEffect(() => {
    setIdx(0); setFlipped(false); setErro(false)

    const cached = cacheRef.current.get(disciplina)
    if (cached) { setCards(cached); setLoading(false); return }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    const carregar = async () => {
      try {
        const aliases = getDisciplinaAliases(disciplina)
        let data: any[] | null = null
        let error: any = null

        // Tentativa 1: match exato em cada alias
        for (const alias of aliases) {
          const res = await supabase
            .from('flashcards')
            .select('id, frente, verso')
            .eq('disciplina', alias)
            .eq('ativo', true)
            .order('created_at', { ascending: true })
            .limit(50)
          if (!res.error && res.data && res.data.length > 0) {
            data = res.data; error = null; break
          }
          error = res.error
        }

        // Tentativa 2: ilike com primeiro token se aliases falharam
        if (!error && (!data || data.length === 0)) {
          const token = aliases[0].split(' ')[0]
          const fb = await supabase
            .from('flashcards')
            .select('id, frente, verso')
            .ilike('disciplina', `%${token}%`)
            .eq('ativo', true)
            .limit(50)
          data = fb.data; error = fb.error
        }

        if (error) { setErro(true); return }
        const resultado = (data || []).map((c: any) => ({ id: c.id, frente: c.frente, verso: c.verso }))
        cacheRef.current.set(disciplina, resultado)
        setCards(resultado)
      } catch { setErro(true) }
      finally { setLoading(false); fetchingRef.current = false }
    }
    carregar()
  }, [disciplina])

  if (loading) return (
    <div style={{maxWidth:560, padding:'40px 0', textAlign:'center'}}>
      <div style={{fontSize:36, marginBottom:12}}>⏳</div>
      <div style={{fontSize:13, color:'var(--text-muted)'}}>
        Carregando flashcards de <strong style={{color:'var(--gold)'}}>{disciplina}</strong>...
      </div>
    </div>
  )

  if (erro) return (
    <div style={{maxWidth:560, padding:'40px 0', textAlign:'center'}}>
      <div style={{fontSize:36, marginBottom:12}}>⚠️</div>
      <div style={{fontSize:14, fontWeight:700, marginBottom:8, color:'var(--white)'}}>Não foi possível carregar os flashcards.</div>
      <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:20}}>Verifique sua conexão e tente novamente.</div>
      <button className="btn-secondary" style={{fontSize:12}} onClick={() => {
        cacheRef.current.delete(disciplina); fetchingRef.current = false; setErro(false); setLoading(true)
      }}>🔄 Tentar novamente</button>
    </div>
  )

  if (cards.length === 0) return (
    <div style={{maxWidth:560, padding:'40px 0', textAlign:'center'}}>
      <div style={{fontSize:40, marginBottom:12}}>🃏</div>
      <div style={{fontSize:14, fontWeight:700, marginBottom:8, color:'var(--white)'}}>Nenhum flashcard disponível</div>
      <div style={{fontSize:12, color:'var(--text-muted)', lineHeight:1.6}}>
        Os flashcards de <strong style={{color:'var(--gold)'}}>{disciplina}</strong> ainda estão sendo preparados.
      </div>
    </div>
  )

  const card = cards[idx]

  return (
    <div style={{maxWidth:580}}>
      <div style={{marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{fontSize:13, color:'var(--text-muted)'}}>
          Card {idx+1} de {cards.length} · <span style={{color:'var(--gold)'}}>{disciplina}</span>
        </div>
        <div style={{fontSize:11, color:'var(--text-muted)'}}>{flipped ? '👁️ Resposta' : '❓ Pergunta'}</div>
      </div>

      {/* Card flip — altura dinâmica, sem overflow */}
      <div style={{perspective:1000, marginBottom:20, cursor:'pointer'}} onClick={() => setFlipped(f => !f)}>
        <div style={{position:'relative', transformStyle:'preserve-3d', transition:'transform 0.6s', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)'}}>

          {/* Frente */}
          <div style={{
            backfaceVisibility:'hidden',
            background:'var(--gray)', border:'1px solid rgba(212,168,67,0.2)',
            borderRadius:20, padding:'24px 24px 20px',
            minHeight:180,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center',
          }}>
            <div style={{fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)', marginBottom:12}}>PERGUNTA</div>
            <div style={{
              fontSize:14, fontWeight:600, lineHeight:1.7, color:'var(--white)',
              whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere',
              maxHeight:280, overflowY:'auto', width:'100%',
            }}>{card.frente}</div>
            <div style={{marginTop:14, fontSize:11, color:'var(--text-muted)', flexShrink:0}}>Toque para ver a resposta</div>
          </div>

          {/* Verso */}
          <div style={{
            position:'absolute', top:0, left:0, right:0,
            backfaceVisibility:'hidden', transform:'rotateY(180deg)',
            background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',
            border:'1px solid rgba(212,168,67,0.3)',
            borderRadius:20, padding:'24px 24px 20px',
            minHeight:180,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center',
          }}>
            <div style={{fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)', marginBottom:12}}>RESPOSTA</div>
            <div style={{
              fontSize:13, lineHeight:1.8, color:'var(--text-muted)',
              whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere',
              maxHeight:300, overflowY:'auto', width:'100%',
            }}>{card.verso}</div>
          </div>
        </div>
      </div>

      {/* Botões — sempre abaixo do card */}
      <div style={{display:'flex', gap:10, justifyContent:'center'}}>
        <button className="btn-secondary" onClick={() => { setIdx(i => Math.max(0, i-1)); setFlipped(false) }} disabled={idx === 0}>← Anterior</button>
        <button className="btn-secondary" onClick={() => setFlipped(f => !f)}>Virar</button>
        <button className="btn-primary" onClick={() => { setIdx(i => Math.min(cards.length-1, i+1)); setFlipped(false) }} disabled={idx === cards.length-1}>Próximo →</button>
      </div>
    </div>
  )
}


function SimuladosPage({ showUpgrade, freeQ, setFreeQ, onXp, profile, isPago, canAccessElite }: any) {
  const [running,setRunning]=useState(false)
  const [cur,setCur]=useState(0)
  const [sel,setSel]=useState<number|null>(null)
  const [answered,setAnswered]=useState(false)
  const [score,setScore]=useState(0)
  const [done,setDone]=useState(false)
  const [time,setTime]=useState(18000)
  const [selectedSimulado,setSelectedSimulado]=useState<any>(null)
  const [provasOAB,setProvasOAB]=useState<any[]>([])
  const [loadingProva,setLoadingProva]=useState(false)
  const [tab,setTab]=useState<'oficiais'|'pratica'>('oficiais')

  // ── Regra escalável por número de exame ──────────────────────────────────
  function planoMinimoParaSimulado(numeroExame: number): 'start'|'plus'|'pro'|'elite' {
    if (numeroExame <= 42) return 'start'
    if (numeroExame <= 43) return 'plus'
    if (numeroExame <= 44) return 'pro'
    return 'elite'
  }

  const BADGE_COR: Record<string,{bg:string; color:string; label:string}> = {
    start: { bg:'rgba(59,130,246,0.15)', color:'#60a5fa', label:'START'  },
    plus:  { bg:'rgba(139,92,246,0.15)', color:'#a78bfa', label:'PLUS'   },
    pro:   { bg:'rgba(236,72,153,0.15)', color:'#f472b6', label:'PRO'    },
    elite: { bg:'rgba(212,168,67,0.12)', color:'var(--gold)', label:'ELITE' },
  }

  function podeLiberarProva(prova: any): boolean {
    if (profile?.role === 'admin') return true
    const planoMin = planoMinimoParaSimulado(prova.numero_exame)
    return canAccess(profile?.plano, planoMin)
  }

  // ─────────────────────────────────────────────────────────────────────────

  const SIMULADOS_PRATICA=[
    {icon:'⚡',t:'Mini Simulado — Constitucional',info:'5 questões · 15min · Grátis',tags:['Grátis'],lock:false},
    {icon:'🔥',t:'Simulado Intensivo — Penal',info:'30 questões · 45min',tags:['Start'],lock:true},
    {icon:'📝',t:'Simulado OAB 2ª Fase',info:'Peça jurídica · 5h',tags:['Pro'],lock:true},
    {icon:'📜',t:'Ética e Estatuto OAB',info:'20 questões · 30min',tags:['Plus'],lock:true},
    {icon:'🏛️',t:'Simulado Geral',info:'60 questões · 4h',tags:['Elite'],lock:true},
  ]

  useEffect(()=>{loadProvas()},[])
  const loadProvas=async()=>{
    const{data}=await supabase.from('provas_oab').select('*').eq('status','ativo').order('numero_exame',{ascending:false})
    if(data)setProvasOAB(data)
  }

  const iniciarProvaOficial=async(prova:any)=>{
    if(!podeLiberarProva(prova)){showUpgrade();return}
    setLoadingProva(true)
    const{data}=await supabase.from('questoes_oab').select('*').eq('prova_id',prova.id).order('numero_questao')
    if(data&&data.length>0){
      const q=data.map((q:any)=>({id:q.id,disc:q.disciplina,dificuldade:'OAB Oficial',q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:['A','B','C','D'].indexOf(q.resposta_correta),exp:q.comentario||''}))
      setSelectedSimulado({...prova,questions:q,oficial:true})
      setRunning(true);setCur(0);setSel(null);setAnswered(false);setScore(0);setDone(false);setTime(18000)
    }
    setLoadingProva(false)
  }

  const iniciarSimuladoPratica=async(s:any)=>{
    if(s.lock&&!isPago){showUpgrade();return}
    setLoadingProva(true)
    const discMap:Record<string,string>={'Mini Simulado — Constitucional':'Constitucional','Simulado Intensivo — Penal':'Penal','Ética e Estatuto OAB':'Ética'}
    const qtdMap:Record<string,number>={'Mini Simulado — Constitucional':5,'Simulado Intensivo — Penal':30,'Ética e Estatuto OAB':20,'Simulado OAB 2ª Fase':40,'Simulado Geral':60}
    const disc=discMap[s.t];const qtd=qtdMap[s.t]||20
    let query=supabase.from('questoes_oab').select('*').neq('resposta_correta','*')
    if(disc)query=query.ilike('disciplina',`%${disc}%`)
    const{data}=await query
    if(!data||data.length===0){setLoadingProva(false);showUpgrade();return}
    const shuffled=[...data].sort(()=>Math.random()-0.5).slice(0,qtd)
    const formatted=shuffled.map((q:any)=>({id:q.id,disc:q.disciplina,dificuldade:'OAB Oficial',q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:['A','B','C','D'].indexOf(q.resposta_correta),exp:q.comentario||''}))
    setSelectedSimulado({...s,questions:formatted})
    setRunning(true);setCur(0);setSel(null);setAnswered(false);setScore(0);setDone(false);setTime(s.t.includes('Mini')?900:18000)
    setLoadingProva(false)
  }

  useEffect(()=>{
    if(!running||answered||done)return
    const t=setInterval(()=>setTime(p=>{if(p<=1){clearInterval(t);setDone(true);return 0;}return p-1}),1000)
    return()=>clearInterval(t)
  },[running,answered,done,cur])

  const pick=(i:number)=>{
    if(answered)return
    if(!isPago&&freeQ<=0){showUpgrade();return}
    setSel(i);setAnswered(true)
    if(!isPago)setFreeQ((p:number)=>p-1)
    if(i===selectedSimulado.questions[cur].correct){setScore(p=>p+1);onXp('question_correct')}else onXp('question_wrong')
  }
  const next=()=>{if(cur+1>=selectedSimulado.questions.length){setDone(true);return}setCur(p=>p+1);setSel(null);setAnswered(false)}

  if(running&&!done&&selectedSimulado){
    const q=selectedSimulado.questions[cur]
    const pct=Math.round(((cur+(answered?1:0))/selectedSimulado.questions.length)*100)
    const h=Math.floor(time/3600),m=Math.floor((time%3600)/60),s=time%60
    return(
      <div style={{padding:'24px 20px',flex:1}}>
        <div style={{maxWidth:680,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:12,color:'var(--text-muted)'}}>{selectedSimulado.edicao||selectedSimulado.t} · Q{cur+1}/{selectedSimulado.questions.length}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:16,fontWeight:700,color:time<600?'var(--danger)':'var(--gold)'}}>{h>0?`${String(h).padStart(2,'0')}:`:''}${String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:22,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}}/></div>
          <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:'22px'}}>
            <div style={{display:'flex',gap:8,marginBottom:14}}><span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)'}}>{q.disc}</span><span style={{fontSize:10,color:'var(--text-muted)'}}>· OAB Oficial</span></div>
            <div style={{fontSize:'clamp(14px,3vw,17px)',fontWeight:600,lineHeight:1.7,marginBottom:22}}>{q.q}</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {q.opts.map((opt:string,i:number)=>{
                let bg='rgba(255,255,255,0.03)',bc='rgba(255,255,255,0.08)',color='var(--white)'
                if(answered){if(i===q.correct){bg='rgba(76,175,125,0.1)';bc='var(--success)';color='var(--success)'}else if(i===sel){bg='rgba(232,66,26,0.1)';bc='var(--danger)';color='var(--danger)'}}
                return(<button key={i} onClick={()=>pick(i)} style={{display:'flex',alignItems:'flex-start',gap:12,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'13px 15px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:'clamp(13px,2.5vw,14px)',color}}>
                  <span style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,background:'rgba(255,255,255,0.06)',color:'var(--white)'}}>{String.fromCharCode(65+i)}</span>
                  <span style={{flex:1}}>{opt}</span>
                </button>)
              })}
            </div>
            {answered&&q.exp&&<div style={{marginTop:20,padding:16,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:13,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> {q.exp}</div>}
            {answered&&<button className="btn-primary" style={{width:'100%',marginTop:18}} onClick={next}>{cur+1>=selectedSimulado.questions.length?'VER RESULTADO':'PRÓXIMA →'}</button>}
          </div>
        </div>
      </div>
    )
  }

  if(done&&selectedSimulado){
    const total=selectedSimulado.questions.length
    const rate=Math.round((score/total)*100)
    const aprovado=score>=Math.ceil(total*0.625)
    return(
      <div style={{padding:'24px 20px',flex:1}}>
        <div style={{maxWidth:600,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:60,marginBottom:18}}>{aprovado?'🏆':rate>=50?'📝':'💪'}</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,30px)',fontWeight:900,marginBottom:8}}>Simulado Concluído!</h1>
          <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>{score} de {total} corretas</p>
          <div style={{background:aprovado?'rgba(76,175,125,0.1)':'rgba(232,98,26,0.1)',border:`1px solid ${aprovado?'var(--success)':'var(--orange)'}`,borderRadius:16,padding:16,marginBottom:18}}>
            <div style={{fontSize:18,fontWeight:900,color:aprovado?'var(--success)':'var(--orange)',marginBottom:6}}>{aprovado?'✅ APROVADO!':'❌ Não aprovado'}</div>
            <div style={{fontSize:13,color:'var(--text-muted)'}}>{aprovado?`${rate}% de acerto.`:`Precisava de ${Math.ceil(total*0.625)} acertos.`}</div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}>
            <button className="btn-primary" onClick={()=>{setRunning(false);setDone(false)}}>NOVO SIMULADO</button>
            <button className="btn-secondary" onClick={()=>{setRunning(false);setDone(false);setTab('oficiais')}}>PROVAS OAB</button>
          </div>
        </div>
      </div>
    )
  }

  return(
    <div style={{padding:'24px 20px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Simulados 📋</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>Treine com provas reais da OAB e simulados temáticos.</p>

      {!isPago&&(
        <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--gold)'}}>
          🔒 Plano gratuito: apenas Mini Simulados disponíveis. <button onClick={showUpgrade} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)',fontWeight:700}}>Fazer upgrade →</button>
        </div>
      )}

      <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
        {([['oficiais','🏛️ Provas OAB'],['pratica','⚡ Temáticos']] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{padding:'10px 18px',borderRadius:10,border:tab===key?'1px solid rgba(212,168,67,0.4)':'1px solid rgba(255,255,255,0.08)',background:tab===key?'rgba(212,168,67,0.1)':'transparent',color:tab===key?'var(--gold)':'var(--text-muted)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)'}}>{label}</button>
        ))}
      </div>

      {tab==='oficiais'&&(
        <div>
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.08),rgba(232,98,26,0.04))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:16,padding:18,marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
              <span style={{fontSize:18}}>📋</span>
              <div style={{fontSize:14,fontWeight:700}}>Provas Oficiais da OAB</div>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>Acesso progressivo por plano</span>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
              {Object.entries(BADGE_COR).map(([plano,b])=>(
                <span key={plano} style={{fontSize:10,fontWeight:800,letterSpacing:'1px',background:b.bg,color:b.color,padding:'3px 10px',borderRadius:100,border:`1px solid ${b.color}33`}}>
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {loadingProva&&<div style={{textAlign:'center',padding:40,color:'var(--gold)'}}>⏳ Carregando...</div>}

          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {provasOAB.map((prova,i)=>{
              const planoMin = planoMinimoParaSimulado(prova.numero_exame)
              const badge = BADGE_COR[planoMin]
              const liberado = podeLiberarProva(prova)
              return(
                <div key={prova.id}
                  style={{background:'var(--gray)',border:`1px solid ${liberado?'rgba(212,168,67,0.15)':'rgba(255,255,255,0.06)'}`,borderRadius:16,padding:'18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14,transition:'border-color 0.2s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(212,168,67,0.25)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=liberado?'rgba(212,168,67,0.15)':'rgba(255,255,255,0.06)'}>

                  <div style={{display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:44,height:44,borderRadius:12,background:i===0?'linear-gradient(135deg,var(--gold),var(--orange))':'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:i===0?18:13,fontWeight:900,color:i===0?'#000':'var(--text-muted)',fontFamily:'var(--font-display)',flexShrink:0}}>
                      {i===0?'🆕':`${prova.numero_exame}º`}
                    </div>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                        <span style={{fontSize:14,fontWeight:700}}>{prova.edicao}</span>
                        {i===0&&<span style={{fontSize:9,fontWeight:900,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'#000',padding:'2px 8px',borderRadius:100}}>RECENTE</span>}
                        {/* Badge do plano mínimo */}
                        <span style={{fontSize:9,fontWeight:800,background:badge.bg,color:badge.color,padding:'2px 8px',borderRadius:100,border:`1px solid ${badge.color}44`}}>
                          {liberado?'✓ ':''}{badge.label}
                        </span>
                      </div>
                      <div style={{display:'flex',gap:12,fontSize:11,color:'var(--text-muted)',flexWrap:'wrap'}}>
                        <span>📝 {prova.total_questoes}q</span>
                        <span>📊 {prova.taxa_aprovacao_oficial}% aprovação</span>
                        {!liberado&&<span style={{color:'var(--text-dim)'}}>🔒 Requer {badge.label}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={()=>iniciarProvaOficial(prova)}
                    className={liberado?'btn-primary':'btn-secondary'}
                    style={{fontSize:12,padding:'10px 20px',opacity:liberado?1:0.7}}
                    disabled={loadingProva}>
                    {liberado?'▶ INICIAR':`🔒 ${badge.label}`}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab==='pratica'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
          {SIMULADOS_PRATICA.map(s=>(
            <div key={s.t} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,transition:'all 0.2s',cursor:'pointer'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.18)';e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)';e.currentTarget.style.transform='translateY(0)'}}>
              <div style={{fontSize:26,marginBottom:12}}>{s.icon}</div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>{s.t}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>{s.info}</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:16}}>
                {s.tags.map(tag=><span key={tag} style={{fontSize:10,padding:'2px 9px',borderRadius:100,fontWeight:700,background:'rgba(212,168,67,0.1)',color:'var(--gold)',border:'1px solid rgba(212,168,67,0.2)'}}>{tag}</span>)}
              </div>
              {s.lock&&!isPago
                ?<button className="btn-secondary" style={{width:'100%',fontSize:12,padding:'10px'}} onClick={()=>showUpgrade()}>🔒 DESBLOQUEAR</button>
                :<button className="btn-gold-sm" style={{width:'100%',fontSize:12}} onClick={()=>iniciarSimuladoPratica(s)} disabled={loadingProva}>{loadingProva?'⏳':'INICIAR →'}</button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RankingPage({profile}:any) {
  const [tab,setTab]=useState<'geral'|'semanal'|'disciplina'>('semanal')
  return(
    <div style={{padding:'24px 20px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Ranking Nacional 🏆</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>Top estudantes. Compita, evolua, seja aprovado.</p>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {(['geral','semanal','disciplina'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?'rgba(212,168,67,0.1)':'var(--gray)',border:tab===t?'1px solid rgba(212,168,67,0.3)':'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'8px 14px',color:tab===t?'var(--gold)':'var(--text-muted)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)',textTransform:'capitalize'}}>
            {t==='disciplina'?'Por Disciplina':t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>
      <div style={{display:'flex',gap:10,marginBottom:24,justifyContent:'center',flexWrap:'wrap'}}>
        {[1,0,2].map(idx=>{
          const r=RANKING_DATA[idx]
          const heights=[110,138,90]
          const h=heights[idx===0?1:idx===1?0:2]
          return(
            <div key={r.pos} style={{textAlign:'center',width:100}}>
              <div style={{fontSize:26,marginBottom:5}}>{r.av}</div>
              <div style={{fontWeight:700,fontSize:11,marginBottom:2}}>{r.name}</div>
              <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:6}}>{r.level}</div>
              <div style={{height:h,background:idx===0?'linear-gradient(135deg,var(--gold),var(--orange))':idx===1?'linear-gradient(135deg,#C0C0C0,#A0A0A0)':'linear-gradient(135deg,#CD7F32,#A0522D)',borderRadius:'8px 8px 0 0',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:8}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,color:idx===0?'var(--deep-black)':'#fff'}}>{['🥇','🥈','🥉'][idx===0?1:idx===1?0:2]}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {RANKING_DATA.map(r=>(
          <div key={r.pos} style={{display:'flex',alignItems:'center',gap:12,background:(r as any).me?'rgba(212,168,67,0.06)':'var(--gray)',border:(r as any).me?'1px solid rgba(212,168,67,0.25)':'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:'14px 16px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:13,fontWeight:700,width:28,textAlign:'center',color:r.pos===1?'#FFD700':r.pos===2?'#C0C0C0':r.pos===3?'#CD7F32':'var(--text-muted)'}}>{r.pos<=3?['🥇','🥈','🥉'][r.pos-1]:`#${r.pos}`}</div>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold-dark),var(--orange))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{r.av}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600}}>{r.name}{(r as any).me&&<span style={{marginLeft:8,fontSize:10,background:'rgba(212,168,67,0.15)',color:'var(--gold)',padding:'2px 8px',borderRadius:4}}>VOCÊ</span>}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.level}</div>
            </div>
            <div style={{fontSize:12,color:'var(--orange)'}}>🔥{r.streak}d</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:700,color:'var(--gold)'}}>{r.xp.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function TigerJusApp() {
  const router=useRouter()
  const { settings } = useAppSettings()
  const [profile,setProfile]=useState<Profile|null>(null)
  const [page,setPage]=useState('dashboard')
  const [showPremiumGate,setShowPremiumGate]=useState(false)
  const [showUpgradeModal,setShowUpgradeModal]=useState(false)
  const [showRadar,setShowRadar]=useState(false)
  const [freeQ,setFreeQ]=useState(15)
  const [freeIA,setFreeIA]=useState(5)
  const [notif,setNotif]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [menuOpen,setMenuOpen]=useState(false)

  // ── Permissões centralizadas ──────────────────────────────────────────────
  const plano = profile?.plano
  const userIsPago = !!(isAdmin(profile?.role) || isPago(plano))
  const canAccessPremium = !!(isAdmin(profile?.role) || canAccess(plano, 'pro'))
  const canAccessElite = !!(isAdmin(profile?.role) || canAccess(plano, 'elite'))
  const limites = getLimites(plano)

  useEffect(()=>{
    const init=async()=>{
      const{data:{session}}=await supabase.auth.getSession()
      if(session){await loadProfile(session.user.id);return}
      const timeout=setTimeout(()=>{router.push('/login')},3000)
      const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
        if(session){clearTimeout(timeout);await loadProfile(session.user.id);subscription.unsubscribe()}
      })
      return()=>{clearTimeout(timeout);subscription.unsubscribe()}
    }
    init()
  },[])

  const loadProfile=async(userId:string)=>{
    const{data}=await supabase.from('profiles').select('*').eq('id',userId).single()
    if(data){
      setProfile(data as Profile)
      const l = getLimites(data.plano)
      if(isAdmin(data.role)){
        setFreeQ(999999);setFreeIA(999999)
      } else {
        setFreeQ(Math.max(0, l.questoes - (data.free_questions_used||0)))
        setFreeIA(Math.max(0, l.ia - (data.free_ia_used||0)))
      }
    }
    setLoading(false)
    if(data){
      const today=new Date().toISOString().split('T')[0]
      if(data.ultimo_acesso!==today)await fetch('/api/xp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,action:'daily_login'})})
    }
    setTimeout(()=>setNotif(settings.welcome_message||'🔥 Bem-vindo de volta! Continue sua jornada jurídica.'),1000)
  }

  const handleXp=async(action:string)=>{
    if(!profile)return
    const res=await fetch('/api/xp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:profile.id,action})})
    const data=await res.json()
    if(data.leveled_up)setNotif(`🎉 Você subiu para ${data.level.name}! +${data.xp_earned} XP`)
    else if(data.xp_earned>0)setNotif(`+${data.xp_earned} XP ganho!`)
    setProfile(prev=>{
      if(!prev)return prev
      const incR=action==='question_correct'||action==='question_wrong'
      const incC=action==='question_correct'
      return{...prev,xp:data.total_xp??prev.xp,level_name:data.level?.name??prev.level_name,streak:data.streak??prev.streak,
        questoes_respondidas:(prev.questoes_respondidas||0)+(incR?1:0),
        questoes_corretas:(prev.questoes_corretas||0)+(incC?1:0)}
    })
  }

  const handleLogout=async()=>{await supabase.auth.signOut();router.push('/')}
  const handleUpgradeSelect=(planId:string)=>{setShowUpgradeModal(false);router.push(`/checkout?plan=${planId}`)}
  const showUpgrade=()=>{setShowPremiumGate(false);setShowUpgradeModal(true)}
  const navTo=(key:string)=>{setPage(key);setMenuOpen(false)}

  if(loading)return(
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16,animation:'pulse 1.5s infinite'}}>🐯</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,color:'var(--gold)'}}>Carregando TigerJus...</div>
      </div>
    </div>
  )

  const SIDEBAR=[
    {icon:'🏠',label:'Dashboard',key:'dashboard'},
    {icon:'📚',label:'Disciplinas',key:'disciplines'},
    {icon:'📝',label:'Quiz',key:'quiz'},
    {icon:'🃏',label:'Flashcards',key:'flashcards'},
    {icon:'📋',label:'Simulados',key:'simulados'},
    {icon:'🤖',label:'IA Jurídica',key:'ia'},
    {icon:'🏆',label:'Ranking',key:'ranking'},
  ]

  const planoDisplay = profile?.plano?.charAt(0).toUpperCase() + (profile?.plano?.slice(1) || '') || 'Gratuito'

  return(
    <div style={{background:'var(--deep-black)',minHeight:'100vh'}}>

      {/* ── MAINTENANCE MODE — bloqueia usuário comum, admin passa ── */}
      {settings.maintenance_mode && !isAdmin(profile?.role) && (
        <div style={{position:'fixed',inset:0,zIndex:9999,background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{textAlign:'center',maxWidth:420}}>
            <div style={{fontSize:64,marginBottom:20}}>🔧</div>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:'var(--gold)',marginBottom:12}}>
              Em manutenção
            </h1>
            <p style={{fontSize:15,color:'var(--text-muted)',lineHeight:1.7,marginBottom:28}}>
              {settings.maintenance_message || 'Voltamos em breve. Obrigado pela paciência!'}
            </p>
            {settings.whatsapp_url && (
              <a href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:8,background:'#25D366',border:'none',borderRadius:10,padding:'12px 24px',color:'#fff',fontSize:14,fontWeight:700,textDecoration:'none'}}>
                💬 Falar com o suporte
              </a>
            )}
          </div>
        </div>
      )}

      {notif&&<Notification msg={notif} onClose={()=>setNotif(null)}/>}
      {showPremiumGate&&<PremiumGate onClose={()=>setShowPremiumGate(false)} onUpgrade={showUpgrade}/>}
      {showUpgradeModal&&<UpgradeModal onClose={()=>setShowUpgradeModal(false)} onSelect={handleUpgradeSelect}/>}
      {showRadar&&<RadarModal onClose={()=>setShowRadar(false)}/>}

      {/* ── BOTÃO FLUTUANTE WHATSAPP — só aparece se URL estiver cadastrada ── */}
      {settings.whatsapp_url && !settings.maintenance_mode && (
        <a href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer"
          title="Falar com suporte"
          style={{
            position:'fixed', bottom:24, right:24, zIndex:150,
            width:52, height:52, borderRadius:'50%',
            background:'#25D366',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 20px rgba(37,211,102,0.4)',
            textDecoration:'none', fontSize:24,
            transition:'transform 0.2s',
          }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.1)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
          💬
        </a>
      )}

      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',height:60,background:'rgba(8,8,8,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:34,height:34,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:16,fontWeight:900,color:'var(--deep-black)',flexShrink:0}}>T</div>
          <span style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
        </div>
        <div className="nav-desktop" style={{display:'flex',gap:16,alignItems:'center'}}>
          {SIDEBAR.map(i=>(
            <button key={i.key} onClick={()=>navTo(i.key)} style={{color:page===i.key?'var(--gold)':'var(--text-muted)',fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)',borderBottom:page===i.key?'2px solid var(--gold)':'2px solid transparent',paddingBottom:2}}>
              {i.label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span className="nav-desktop" style={{fontSize:12,color:'var(--text-muted)'}}>{profile?.nome?.split(' ')[0]||'Usuário'}</span>
          <button className="btn-gold-sm nav-desktop" onClick={()=>setShowUpgradeModal(true)} style={{fontSize:11}}>🚀 {planoDisplay.toUpperCase()}</button>
          <button onClick={handleLogout} className="nav-desktop" style={{color:'var(--text-muted)',fontSize:11,border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}>Sair</button>
          <button className="nav-mobile" onClick={()=>setMenuOpen(o=>!o)} style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,width:36,height:36,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,cursor:'pointer',padding:8}}>
            <span style={{display:'block',width:18,height:2,background:'var(--white)',borderRadius:2,transition:'all 0.2s',transform:menuOpen?'rotate(45deg) translate(5px,5px)':'none'}}/>
            <span style={{display:'block',width:18,height:2,background:'var(--white)',borderRadius:2,transition:'all 0.2s',opacity:menuOpen?0:1}}/>
            <span style={{display:'block',width:18,height:2,background:'var(--white)',borderRadius:2,transition:'all 0.2s',transform:menuOpen?'rotate(-45deg) translate(5px,-5px)':'none'}}/>
          </button>
        </div>
      </nav>

      {menuOpen&&(
        <div style={{position:'fixed',top:60,left:0,right:0,zIndex:99,background:'rgba(10,10,10,0.98)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'12px 0',display:'flex',flexDirection:'column'}}>
          {SIDEBAR.map(item=>(
            <button key={item.key} onClick={()=>navTo(item.key)} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',background:page===item.key?'rgba(212,168,67,0.08)':'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:15,color:page===item.key?'var(--gold)':'var(--white)',textAlign:'left',borderLeft:page===item.key?'3px solid var(--gold)':'3px solid transparent'}}>
              <span style={{fontSize:18,width:24,textAlign:'center'}}>{item.icon}</span>{item.label}
            </button>
          ))}
          <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',margin:'8px 0',padding:'8px 20px',display:'flex',gap:10}}>
            <button className="btn-gold-sm" style={{flex:1,fontSize:12}} onClick={()=>{setShowUpgradeModal(true);setMenuOpen(false)}}>🚀 UPGRADE</button>
            <button onClick={()=>{handleLogout();setMenuOpen(false)}} style={{color:'var(--text-muted)',fontSize:12,border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 14px',background:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}>Sair</button>
          </div>
        </div>
      )}

      <div style={{display:'flex',paddingTop:60,minHeight:'100vh'}}>
        <aside className="dash-sidebar nav-desktop">
          {SIDEBAR.map(item=>(
            <button key={item.key} className={`sidebar-item${page===item.key?' active':''}`} onClick={()=>navTo(item.key)}>
              <span style={{fontSize:17,width:24,textAlign:'center'}}>{item.icon}</span> {item.label}
            </button>
          ))}
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-dim)',padding:'12px 14px 6px',marginTop:8}}>CONTA</div>
          {isAdmin(profile?.role)&&<button className="sidebar-item" onClick={()=>router.push('/admin')}>⚙️ Admin Panel</button>}
          <button className="sidebar-item" onClick={handleLogout}>🚪 Sair</button>
          {(settings.whatsapp_url||settings.instagram_url||settings.telegram_url)&&(
            <div style={{padding:'8px 12px 0'}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--text-dim)',marginBottom:6}}>SUPORTE</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {settings.whatsapp_url&&<a href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer" title="WhatsApp" style={{width:32,height:32,borderRadius:8,background:'#25D36618',border:'1px solid #25D36633',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,textDecoration:'none'}}>💬</a>}
                {settings.instagram_url&&<a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" title="Instagram" style={{width:32,height:32,borderRadius:8,background:'rgba(212,168,67,0.08)',border:'1px solid rgba(212,168,67,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,textDecoration:'none'}}>📸</a>}
                {settings.telegram_url&&<a href={settings.telegram_url} target="_blank" rel="noopener noreferrer" title="Telegram" style={{width:32,height:32,borderRadius:8,background:'rgba(96,165,250,0.08)',border:'1px solid rgba(96,165,250,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,textDecoration:'none'}}>✈️</a>}
                {settings.youtube_url&&<a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" title="YouTube" style={{width:32,height:32,borderRadius:8,background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,textDecoration:'none'}}>▶️</a>}
              </div>
            </div>
          )}
          <div style={{marginTop:'auto'}},padding:'20px 12px 0'}}>
            <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.14)',borderRadius:12,padding:14}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:5}}>{planoDisplay.toUpperCase()}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:10}}>
                {userIsPago?'Ilimitado':`${freeQ} questões`} · {userIsPago?'IA Ilimitada':`${freeIA} perguntas IA`}
              </div>
              {!userIsPago&&<button className="btn-gold-sm" style={{width:'100%',fontSize:11}} onClick={()=>setShowUpgradeModal(true)}>🚀 FAZER UPGRADE</button>}
            </div>
            <RadarOAB/>
          </div>
        </aside>

        {page==='dashboard'&&<DashHome profile={profile} onNav={navTo} showUpgrade={showUpgrade} isPago={userIsPago} canAccessPremium={canAccessPremium} onOpenRadar={()=>setShowRadar(true)}/>}
        {page==='disciplines'&&<DisciplinesPage showUpgrade={showUpgrade} profile={profile} isPago={userIsPago} canAccessPremium={canAccessPremium}/>}
        {page==='quiz'&&<QuizPage freeQ={freeQ} setFreeQ={setFreeQ} showUpgrade={showUpgrade} onXp={handleXp} profile={profile} isPago={userIsPago}/>}
        {page==='flashcards'&&<FlashCardsPage/>}
        {page==='simulados'&&<SimuladosPage showUpgrade={showUpgrade} freeQ={freeQ} setFreeQ={setFreeQ} onXp={handleXp} profile={profile} isPago={userIsPago} canAccessElite={canAccessElite}/>}
        {page==='ia'&&<IAPage freeIA={freeIA} setFreeIA={setFreeIA} showUpgrade={showUpgrade} profile={profile} isPago={userIsPago}/>}
        {page==='ranking'&&<RankingPage profile={profile}/>}
      </div>

      <div className="grain-overlay"/>
      <style>{`
        @keyframes fadeInDown{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.9)}}
        .nav-desktop{display:flex !important;}
        .nav-mobile{display:none !important;}
        @media(max-width:768px){
          .nav-desktop{display:none !important;}
          .nav-mobile{display:flex !important;}
          .dash-sidebar{display:none !important;}
        }
      `}</style>
    </div>
  )
}
