'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import RadarOAB from '@/components/RadarOAB'
import ComunidadeChat from '@/components/ComunidadeChat'
import MeuPerfilPage from '@/components/MeuPerfilPage'
import { TigerAvatar, isTigerId } from '@/components/TigerAvatars'

// ── Hook compartilhado: detecta quando o usuário sai da aba ────────────────────
// Regra única para TODOS os cronômetros do app (Quiz, QuizDisciplina, Radar,
// Simulado): quando a aba perde a visibilidade (troca de aba, minimiza, atende
// o celular), o cronômetro deve pausar; ao voltar, retoma de onde parou.
// Centralizado aqui para que a regra seja idêntica em todos os lugares — mudar
// o comportamento no futuro é mexer só nesta função.
function useAbaOculta(): boolean {
  const [oculta, setOculta] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => setOculta(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    setOculta(document.visibilityState === 'hidden')
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  return oculta
}
import DashboardTopBanner from '@/components/DashboardTopBanner'
import LandingTopBanner from '@/components/LandingTopBanner'
import LeiSecaPage from '@/components/LeiSecaPage'
import ComentarioComLei from '@/components/ComentarioComLei'
import CronometroSimulado from '@/components/CronometroSimulado'
import { canAccess, isAdmin, getLimites, isPago, getQuizModes, getResumoTier, planoMinimoExame, getNivelByXp, getNextNivel, type Plano } from '@/lib/planos'

interface Profile {
  id: string; nome: string; email: string; plano: string
  xp: number; nivel: number; streak: number
  free_questions_used: number; free_ia_used: number
  questoes_respondidas: number; questoes_corretas: number
  role?: string
  referral_code?: string
  referred_by?: string
  referral_count?: number
  ambassador_badge?: string
  referral_days_bonus?: number
  referral_discount_pct?: number
}


// Níveis calculados dinamicamente via getNivelByXp() de planos.ts

const PLANS_UPGRADE = [
  { id:'start', name:'Tiger Start', price:'4,99', color:'var(--success)', features:['50 questões por dia','IA TigerJus (20/dia)','Simulados completos OAB','Flashcards + resumos rápidos'] },
  { id:'pro', name:'Tiger Pro', price:'9,99', color:'var(--gold)', badge:'MAIS POPULAR', featured:true, features:['Questões ilimitadas','IA TigerJus (40/dia)','Resumos completos + Índice Remissivo','Exportar PDF + flashcards avançados'] },
  { id:'elite', name:'Tiger Elite', price:'24,99', color:'var(--orange)', badge:'TOP', features:['Tudo do Pro, sem limites','IA TigerJus (80/dia)','Radar OAB + Lei Seca de memorização','Mini-simulados e flashcards ilimitados'] },
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
  {id:18,icon:'🗳️',name:'Eleitoral',slug:'eleitoral',progress:0,q:8,tags:['Quiz','Resumo','Flash','PDF']},
  {id:19,icon:'🏦',name:'Financeiro',slug:'financeiro',progress:0,q:8,tags:['Quiz','Resumo','Flash','PDF']},
  {id:20,icon:'🛡️',name:'Previdenciário',slug:'previdenciario',progress:0,q:10,tags:['Quiz','Resumo','Flash','PDF']},
]

// Mapa EXATO: nome da disciplina no app -> nome(s) exato(s) no banco (questoes_oab.disciplina).
// Evita o filtro por "primeira palavra" que misturava Penal/Processo Penal, Civil/Processo Civil etc.
const PDF_DISC_MAP: Record<string,string[]> = {
  'Constitucional':['Direito Constitucional'],
  'Administrativo':['Direito Administrativo'],
  'Penal':['Direito Penal'],
  'Processo Penal':['Direito Processual Penal'],
  'Civil':['Direito Civil'],
  'Processo Civil':['Direito Processual Civil'],
  'Trabalho':['Direito do Trabalho'],
  'Proc. Trabalho':['Direito Processual do Trabalho'],
  'Tributário':['Direito Tributário'],
  'Empresarial':['Direito Empresarial'],
  'Ética OAB':['Ética e Estatuto da OAB'],
  'Consumidor':['Direito do Consumidor'],
  'Direitos Humanos':['Direitos Humanos'],
  'Ambiental':['Direito Ambiental'],
  'Filosofia':['Filosofia do Direito','Filosofia e Hermenêutica do Direito','Hermenêutica Jurídica'],
  'Internacional':['Direito Internacional','Direito Internacional Privado','Direito Internacional Público','Direito Internacional Público e Privado'],
  'ECA':['Direito da Criança e do Adolescente'],
  'Eleitoral':['Direito Eleitoral'],
  'Financeiro':['Direito Financeiro'],
  'Previdenciário':['Direito Previdenciário'],
}

const DISC_MAP: Record<string, string> = {
  'Constitucional':'Constitucional','Administrativo':'Administrativo','Penal':'Penal',
  'Processo Penal':'Processo Penal','Civil':'Civil','Processo Civil':'Processo Civil',
  'Trabalho':'Trabalho','Processo do Trabalho':'Proc. Trabalho','Tributário':'Tributário',
  'Empresarial':'Empresarial','Ética':'Ética OAB','Consumidor':'Consumidor',
  'Direitos Humanos':'Direitos Humanos','Ambiental':'Ambiental','Filosofia':'Filosofia',
  'Internacional':'Internacional','ECA':'ECA',
  'Eleitoral':'Eleitoral','Financeiro':'Financeiro','Previdenciário':'Previdenciário',
}

// Reverse: valor cru de questoes_publicas.disciplina (ex.: "Direito Civil") -> nome do card (ex.: "Civil").
// Usado ao gravar quiz_resultados a partir do Quiz principal e do Simulado, pra bater com os cards da Trilha.
const _RAW_TO_CARD: Record<string,string> = (()=>{const m:Record<string,string>={};for(const [card,vals] of Object.entries(PDF_DISC_MAP))for(const v of vals)m[v]=card;return m})()
function cardDaDisciplina(raw:string):string{return _RAW_TO_CARD[raw]||DISC_MAP[raw]||raw}

// ── Contagem REAL de questões por disciplina (1 RPC leve, cacheada) ────────────
// Usa a RPC contar_questoes_por_disciplina (group by feito no banco), em vez
// de trazer todas as linhas pro cliente — evita o limite padrão de 1.000
// linhas do Supabase conforme o banco de questões cresce.
// Reverse-mapeia o valor de questoes_publicas.disciplina -> nome do card via PDF_DISC_MAP.
let _discCountsCache: Record<string, number> | null = null
let _discCountsPromise: Promise<Record<string, number>> | null = null
// Alvo de navegação vindo do Radar: disciplina escolhida pra estudar.
let _radarTarget: any = null
let _radarTargetTab: 'resumo'|'quiz'|'flash'|'pdf'|'leiseca' = 'quiz'
async function _loadDiscCounts(): Promise<Record<string, number>> {
  if (_discCountsCache) return _discCountsCache
  const rev: Record<string, string> = {}
  for (const [card, vals] of Object.entries(PDF_DISC_MAP)) for (const v of vals) rev[v] = card
  const { data, error } = await supabase.rpc('contar_questoes_por_disciplina')
  const counts: Record<string, number> = {}
  if (error || !data) {
    // Fallback de segurança: se a RPC não existir ainda (migration não aplicada),
    // volta pro comportamento anterior em vez de quebrar a tela. Pagina pra não
    // subcontar caso o banco passe de 1.000 questões.
    const rows:{disciplina:string}[]=[]
    for(let inicio=0;;inicio+=1000){
      const { data: bloco, error: e2 } = await supabase.from('questoes_publicas').select('disciplina').range(inicio,inicio+999)
      if(e2||!bloco||bloco.length===0)break
      rows.push(...(bloco as {disciplina:string}[]))
      if(bloco.length<1000)break
    }
    for (const row of rows) {
      const card = rev[row.disciplina]
      if (card) counts[card] = (counts[card] || 0) + 1
    }
  } else {
    for (const row of data as { disciplina: string; total: number }[]) {
      const card = rev[row.disciplina]
      if (card) counts[card] = (counts[card] || 0) + Number(row.total)
    }
  }
  _discCountsCache = counts
  return counts
}
function useDisciplineCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>(_discCountsCache || {})
  useEffect(() => {
    let alive = true
    if (!_discCountsPromise) _discCountsPromise = _loadDiscCounts()
    _discCountsPromise.then(c => { if (alive) setCounts(c) })
    return () => { alive = false }
  }, [])
  return counts
}

// ── Contagem TOTAL de questões publicadas (1 query leve, cacheada) ─────────
// Usa count exact/head para não trazer as linhas — só o número.
let _totalQuestoesCache: number | null = null
let _totalQuestoesPromise: Promise<number> | null = null
async function _loadTotalQuestoes(): Promise<number> {
  if (_totalQuestoesCache !== null) return _totalQuestoesCache
  const { count } = await supabase
    .from('questoes_publicas')
    .select('id', { count: 'exact', head: true })
  _totalQuestoesCache = count || 0
  return _totalQuestoesCache
}
function useTotalQuestoes(): number | null {
  const [total, setTotal] = useState<number | null>(_totalQuestoesCache)
  useEffect(() => {
    let alive = true
    if (!_totalQuestoesPromise) _totalQuestoesPromise = _loadTotalQuestoes()
    _totalQuestoesPromise.then(t => { if (alive) setTotal(t) })
    return () => { alive = false }
  }, [])
  return total
}

// Ranking carregado do Supabase em RankingPage

const RESUMOS: Record<string, string> = {
  constitucional:`DIREITO CONSTITUCIONAL — RESUMO ESSENCIAL\n\nESTRUTURA DA CF/88\nA Constituição Federal de 1988 é rígida, analítica e promulgada. Organiza-se em 9 títulos.\n\nDIREITOS FUNDAMENTAIS (Art. 5º)\nSão cláusulas pétreas. Principais garantias:\n- Habeas Corpus — liberdade de locomoção\n- Mandado de Segurança — direito líquido e certo\n- Habeas Data — informações pessoais\n- Mandado de Injunção — omissão legislativa\n\nPRINCÍPIOS FUNDAMENTAIS\n- Soberania, Cidadania, Dignidade da pessoa humana\n- Valores sociais do trabalho e da livre iniciativa\n- Pluralismo político\n\nORGANIZAÇÃO DOS PODERES\n- Executivo, Legislativo e Judiciário — independentes e harmônicos\n- Sistema de freios e contrapesos`,
  penal:`DIREITO PENAL — RESUMO ESSENCIAL\n\nTEORIA DO CRIME\nCrime = Fato típico + Ilicitude + Culpabilidade\n\nDOLO E CULPA\n- Dolo direto: quis o resultado\n- Dolo eventual: assumiu o risco\n- Culpa: imprudência, negligência ou imperícia\n\nEXCLUDENTES DE ILICITUDE (Art. 23 CP)\n- Estado de necessidade\n- Legítima defesa\n- Estrito cumprimento do dever legal`,
  civil:`DIREITO CIVIL — RESUMO ESSENCIAL\n\nCAPACIDADE\n- Plena: maiores de 18 anos não incapazes\n- Absolutamente incapaz: menores de 16 anos (art. 3º CC)\n- Relativamente incapaz: 16-18 anos, ébrios habituais, pródigos\n\nRESPONSABILIDADE CIVIL\n- Subjetiva: necessita de culpa\n- Objetiva: independe de culpa (risco da atividade)`,
}

// Resumo usado na geração de PDF.
// A tela de Resumos já lia de discipline_summaries, mas o PDF lia só o RESUMOS
// hardcoded acima (3 slugs) — as outras 17 disciplinas saíam com a seção vazia.
// Aqui o banco vira a fonte primária e o RESUMOS local fica como fallback,
// mesmo critério aplicado na tela.
async function carregarResumoParaPDF(slug: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('discipline_summaries')
      .select('resumo')
      .eq('disciplina_slug', slug)
      .eq('ativo', true)
      .maybeSingle()
    if (data?.resumo) return data.resumo
  } catch { /* rede/RLS: cai no fallback local em vez de quebrar o download */ }
  return RESUMOS[slug] || ''
}

function RadarModal({ onClose, onEstudar, podePDF, freeQ, setFreeQ, showUpgrade, onXp }: { onClose: () => void; onEstudar: (d:any)=>void; podePDF?: boolean; freeQ?: any; setFreeQ?: any; showUpgrade?: () => void; onXp?: (a:string)=>void }) {
  const discCounts = useDisciplineCounts()
  const [gerando,setGerando] = useState<string|null>(null)
  const [modo,setModo] = useState<'lista'|'top20'>('lista')

  // DOMINÂNCIA REAL: calculada das provas cadastradas (mesma fonte das contagens).
  const ranked = DISCIPLINES
    .map(d => ({ d, n: discCounts[d.name] || 0 }))
    .filter(x => x.n > 0)
    .sort((a,b) => b.n - a.n)
  const total = ranked.reduce((s,x) => s + x.n, 0) || 1
  const itens = ranked.map(x => ({ ...x, pct: Math.round(1000 * x.n / total) / 10 }))

  const baixarPDF = async (d:any) => {
    if (gerando) return
    setGerando(d.name)
    try {
      const discs = PDF_DISC_MAP[d.name] || [d.name]
      const { data } = await supabase.rpc('buscar_questoes_disciplina_pdf', { discs })
      await gerarPDF(d, await carregarResumoParaPDF(d.slug), data || [])
    } finally { setGerando(null) }
  }

  const cor = (p:number) => p >= 8 ? 'var(--success)' : p >= 5 ? 'var(--gold)' : 'var(--orange)'
  const banda = (p:number) => p >= 8 ? 'Dominância altíssima' : p >= 5 ? 'Dominância alta' : p >= 2.5 ? 'Dominância média' : 'Incidência menor'

  return (
    <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.95)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:700,background:'var(--gray)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:24,padding:'32px 28px',position:'relative',maxHeight:'90vh',overflowY:'auto'}}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'none',border:'none',color:'#888',fontSize:22,cursor:'pointer'}}>✕</button>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <span style={{fontSize:28}}>🎯</span>
          <div>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,marginBottom:2}}>Radar TigerJus</h2>
            <p style={{fontSize:12,color:'var(--text-muted)'}}>Matérias com maior dominância na próxima prova</p>
          </div>
        </div>
        {modo==='top20' ? (
          <RadarTop20 onBack={()=>setModo('lista')} podePDF={podePDF} freeQ={freeQ} setFreeQ={setFreeQ} showUpgrade={showUpgrade} onXp={onXp}/>
        ) : (
        <>
        <div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--text-muted)'}}>
          📡 Dominância real calculada sobre {total} questões das provas reais cadastradas. Quanto maior o peso histórico, maior a chance de pontuar.
        </div>
        <button onClick={()=>setModo('top20')} style={{width:'100%',marginBottom:22,padding:'14px',borderRadius:12,border:'none',background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'var(--deep-black)',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>🎯 Treinar as 40 questões mais prováveis</button>
        {itens.length === 0 ? (
          <div style={{textAlign:'center',color:'var(--text-muted)',fontSize:13,padding:'30px 0'}}>Calculando dominância…</div>
        ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {itens.map((t,i) => (
            <div key={t.d.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'16px 18px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8}}>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:4}}>#{i+1} · {banda(t.pct)}</div>
                  <div style={{fontSize:15,fontWeight:700,color:'var(--tj-text)'}}>{t.d.icon} {t.d.name}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,color:cor(t.pct)}}>{t.pct}%</div>
                  <div style={{fontSize:10,color:'var(--text-muted)'}}>{t.n} questões</div>
                </div>
              </div>
              <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:5,overflow:'hidden',marginBottom:12}}>
                <div style={{width:`${Math.min(t.pct*9,100)}%`,height:'100%',background:`linear-gradient(90deg,${cor(t.pct)},var(--orange))`,borderRadius:100,transition:'width 1s ease'}}/>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={()=>onEstudar(t.d)} style={{flex:1,minWidth:130,padding:'9px 14px',borderRadius:10,border:'none',background:'var(--gold)',color:'#1a1a1a',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)'}}>📚 Estudar questões</button>
                {podePDF && (
                  <button onClick={()=>baixarPDF(t.d)} disabled={gerando===t.d.name} style={{flex:1,minWidth:130,padding:'9px 14px',borderRadius:10,border:'1px solid rgba(212,168,67,0.4)',background:'transparent',color:'var(--gold)',fontSize:12,fontWeight:700,cursor:gerando===t.d.name?'wait':'pointer',fontFamily:'var(--font-body)',opacity:(gerando&&gerando!==t.d.name)?0.5:1}}>{gerando===t.d.name?'⏳ Gerando…':'📄 Baixar PDF'}</button>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

function UpgradeModal({ onClose, onSelect, planoAtual, ehAdmin }: { onClose: () => void; onSelect: (plan: string, ciclo: 'mensal'|'anual') => void; planoAtual?: string; ehAdmin?: boolean }) {
  const [ciclo, setCiclo] = useState<'mensal'|'anual'>('mensal')
  const ehAnual = ciclo === 'anual'
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.95)',backdropFilter:'blur(10px)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'40px 20px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:900,position:'relative',padding:'20px 0'}}>
        <button onClick={onClose} style={{position:'absolute',top:-10,right:0,background:'none',border:'none',color:'#888',fontSize:24,cursor:'pointer',zIndex:10}}>✕</button>
        <button onClick={onClose} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',color:'var(--text-muted)',fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',marginBottom:20,padding:0}}
          onMouseEnter={e=>e.currentTarget.style.color='var(--gold)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>← Voltar para a plataforma</button>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🚀</div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:900,marginBottom:8}}>Escolha seu <span style={{color:'var(--gold)'}}>plano</span></h2>
          <p style={{color:'var(--text-muted)',fontSize:15}}>Desbloqueie todo o potencial do TigerJus</p>
          <div style={{display:'inline-flex',marginTop:18,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:100,padding:4,gap:4}}>
            <button onClick={()=>setCiclo('mensal')} style={{padding:'8px 20px',borderRadius:100,border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:13,fontWeight:700,background:!ehAnual?'linear-gradient(135deg,var(--gold),var(--orange))':'transparent',color:!ehAnual?'#000':'var(--text-muted)'}}>Mensal</button>
            <button onClick={()=>setCiclo('anual')} style={{padding:'8px 20px',borderRadius:100,border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:13,fontWeight:700,background:ehAnual?'linear-gradient(135deg,var(--gold),var(--orange))':'transparent',color:ehAnual?'#000':'var(--text-muted)'}}>Anual</button>
          </div>
          {ehAnual && <p style={{color:'var(--success)',fontSize:12,marginTop:10}}>💎 Pague uma vez por ano · 12 meses de acesso</p>}
        </div>
        <div className="tj-upgrade-grid">
          {PLANS_UPGRADE.map(plan => {
            const jaPossui = ehAdmin || canAccess(planoAtual, plan.id as any)
            return (
            <div key={plan.id} style={{background:(plan as any).featured?'linear-gradient(160deg,rgba(212,168,67,0.1),rgba(30,30,30,1))':'rgba(20,20,20,0.9)',border:jaPossui?'1px solid rgba(76,175,125,0.4)':(plan as any).featured?'1px solid var(--gold)':'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:24,position:'relative',opacity:jaPossui?0.7:1}}>
              {jaPossui
                ?<div style={{position:'absolute',top:16,right:16,background:'rgba(76,175,125,0.18)',border:'1px solid rgba(76,175,125,0.4)',color:'var(--success)',fontSize:9,fontWeight:900,letterSpacing:'1.5px',padding:'4px 10px',borderRadius:100}}>✓ SEU PLANO</div>
                :(plan as any).badge&&<div style={{position:'absolute',top:16,right:16,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'#000',fontSize:9,fontWeight:900,letterSpacing:'1.5px',padding:'4px 10px',borderRadius:100}}>{(plan as any).badge}</div>}
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{plan.name}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:38,fontWeight:900,color:plan.color,marginBottom:4}}><sup style={{fontSize:15,color:'var(--text-muted)',verticalAlign:'super'}}>R$</sup>{ehAnual?(Math.round(parseFloat(plan.price.replace(',','.'))*12*100)/100).toFixed(2).replace('.',','):plan.price}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:20}}>{ehAnual?'/ano':'/mês'}</div>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                {plan.features.map((f,i)=><li key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}><span style={{color:'var(--success)'}}>✓</span>{f}</li>)}
              </ul>
              {jaPossui
                ?<button disabled style={{width:'100%',fontSize:13,padding:'12px',borderRadius:10,border:'1px solid rgba(76,175,125,0.3)',background:'rgba(76,175,125,0.08)',color:'var(--success)',fontWeight:700,cursor:'default',fontFamily:'var(--font-body)'}}>✓ PLANO ATUAL</button>
                :<button onClick={()=>onSelect(plan.id,ciclo)} className={(plan as any).featured?'btn-primary':'btn-secondary'} style={{width:'100%',fontSize:13,padding:'12px',cursor:'pointer'}}>{(plan as any).featured?'ASSINAR AGORA':'ASSINAR'}</button>}
            </div>
          )})}
        </div>
        <div style={{marginTop:28,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <div style={{fontSize:13,color:'var(--text-muted)'}}>💳 PIX ou Cartão · 🔒 Pagamento seguro · Cancele quando quiser</div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',justifyContent:'center'}}>
            <button onClick={onClose} className="btn-secondary" style={{fontSize:13,padding:'10px 24px'}}>← Voltar para a plataforma</button>
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',textDecoration:'underline',padding:'10px 0'}}>Continuar estudando agora</button>
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

function XPTooltip({ xp }: { xp: number }) {
  const [show,setShow]=useState(false)
  const _tn=getNivelByXp(xp); const xpNext=_tn.xp_max??999999; const xpPrev=_tn.xp_min; const levelName=_tn.nome
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
          {settings.cta_upgrade_title||'Recurso'} <span style={{color:'var(--gold)'}}>premium.</span>
        </h2>
        <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28,lineHeight:1.7}}>{settings.cta_upgrade_subtitle||'Faça upgrade para desbloquear este recurso.'}</p>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28,textAlign:'left'}}>
          {['IA ilimitada','Simulados completos OAB','Radar TigerJus','Trilhas personalizadas','PDFs exclusivos'].map((l,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.12)',borderRadius:10,padding:'12px 16px',fontSize:13}}>
              <span style={{color:'var(--success)'}}>✓</span><span>{l}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{width:'100%',marginBottom:12,fontSize:15,padding:16}} onClick={onUpgrade}>🚀 {settings.cta_upgrade_button||'VER PLANOS'}</button>
        <button className="btn-secondary" style={{width:'100%',fontSize:12}} onClick={onClose}>{settings.cta_downgrade_button||'Continuar no plano gratuito'}</button>
        <div style={{marginTop:16,fontSize:11,color:'var(--text-dim)'}}>{settings.upgrade_footer_text||'A partir de R$1,99/mês · Cancele quando quiser'}</div>
      </div>
    </div>
  )
}

function QuestaoDodia({onNav,onXp,profile}:{onNav:(k:string)=>void;onXp?:(a:string)=>void;profile?:any}){
  const [q,setQ]=useState<any>(null)
  const [aberto,setAberto]=useState(false)
  const [sel,setSel]=useState<number|null>(null)
  const [answered,setAnswered]=useState(false)
  const [correctIdx,setCorrectIdx]=useState<number|null>(null)
  const [coment,setComent]=useState('')
  const [checking,setChecking]=useState(false)
  const [jaHoje,setJaHoje]=useState(false)
  const hojeStr=new Date().toISOString().split('T')[0]
  const lsKey='tj_qdia:'+(profile?.id||'anon')+':'+hojeStr
  const respondidaHoje = jaHoje || (profile?.ultima_questao_dia===hojeStr)
  useEffect(()=>{
    try{if(typeof window!=='undefined'){const raw=localStorage.getItem(lsKey);if(raw){setJaHoje(true);setAnswered(true);try{const o=JSON.parse(raw);if(o&&typeof o.sel==='number'){setSel(o.sel);setCorrectIdx(typeof o.correctIdx==='number'?o.correctIdx:null);setComent(o.coment||'')}}catch{}}}}catch{}
    ;(async()=>{
      // Questão do dia determinística: mesma pra todos no mesmo dia, cobrindo o banco todo
      const dia=Math.floor(Date.now()/86400000)
      const {count}=await supabase.from('questoes_publicas').select('id',{count:'exact',head:true})
      const off=count?dia%count:0
      const {data}=await supabase.from('questoes_publicas').select('id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d').order('id').range(off,off)
      if(data?.[0])setQ(data[0])
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  const disc=q?.disciplina||'OAB'
  const opts:string[]=q?[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d]:[]
  const responder=async(i:number)=>{
    if(answered||checking||!q||respondidaHoje)return
    setSel(i);setChecking(true)
    try{
      const{data:{session}}=await supabase.auth.getSession()
      const res=await fetch('/api/questao/validar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify({questaoId:q.id,escolha:i})})
      const data=await res.json()
      if(res.ok){
        setCorrectIdx(['A','B','C','D'].indexOf(data.letra_correta))
        setComent(data.comentario||'')
        setAnswered(true)
        if(!jaHoje){try{if(typeof window!=='undefined')localStorage.setItem(lsKey,JSON.stringify({sel:i,correctIdx:['A','B','C','D'].indexOf(data.letra_correta),coment:data.comentario||''}))}catch{}setJaHoje(true);if(onXp)onXp('questao_dia')}
      }else setSel(null)
    }catch{setSel(null)}finally{setChecking(false)}
  }
  const wrap:React.CSSProperties={background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:16,padding:18,marginBottom:16}
  if(!aberto){
    const trecho=q?.enunciado?.slice(0,60)+(q&&q.enunciado.length>60?'...':'')
    return(
      <div style={{...wrap,cursor:q?'pointer':'default'}} onClick={()=>q&&setAberto(true)}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:4}}>⚡ QUESTÃO DO DIA</div>
            <div style={{fontWeight:700,fontSize:15}}>{q?`${disc} — ${trecho}`:'Carregando...'}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{respondidaHoje?'✅ Respondida hoje — +150 XP creditados':'+150 XP bônus ao responder hoje'}</div>
          </div>
          <button className="btn-gold-sm">{respondidaHoje?'✅ Feita':'Responder →'}</button>
        </div>
      </div>
    )
  }
  return(
    <div style={wrap}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,gap:10}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)'}}>⚡ QUESTÃO DO DIA · {disc}</div>
        {respondidaHoje&&<span style={{fontSize:11,color:'var(--gold)',fontWeight:700}}>+150 XP ✅</span>}
      </div>
      <div style={{fontSize:14,fontWeight:600,lineHeight:1.6,marginBottom:16}}>{q?.enunciado}</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {opts.map((opt,i)=>{
          let bg='rgba(255,255,255,0.03)',bc='rgba(255,255,255,0.08)',color='var(--tj-text)'
          if(checking&&i===sel){bg='rgba(212,168,67,0.08)';bc='rgba(212,168,67,0.6)';color='var(--gold)'}
          if(answered){if(i===correctIdx){bg='rgba(76,175,125,0.1)';bc='var(--success)';color='var(--success)'}else if(i===sel){bg='rgba(232,66,26,0.1)';bc='var(--danger)';color='var(--danger)'}}
          return(<button key={i} onClick={()=>responder(i)} disabled={answered||respondidaHoje} style={{display:'flex',alignItems:'flex-start',gap:10,background:bg,border:`1px solid ${bc}`,borderRadius:10,padding:'11px 14px',cursor:(answered||respondidaHoje)?'default':'pointer',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:13,color}}><span style={{width:22,height:22,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,background:'rgba(255,255,255,0.06)'}}>{String.fromCharCode(65+i)}</span><span style={{flex:1}}>{opt}</span></button>)
        })}
      </div>
      {respondidaHoje&&!answered&&<div style={{marginTop:14,padding:14,background:'rgba(76,175,125,0.08)',border:'1px solid rgba(76,175,125,0.2)',borderRadius:10,fontSize:12.5,color:'var(--success)',fontWeight:600}}>✅ Você já respondeu a questão de hoje. Volte amanhã para uma nova! 🐯</div>}
      {answered&&<div style={{marginTop:14,padding:14,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:10,fontSize:12.5,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===null||correctIdx===null?'✅ ':(sel===correctIdx?'✅ ':'❌ ')}<strong style={{color:'var(--gold)'}}>{sel===null||correctIdx===null?'Você já respondeu hoje.':(sel===correctIdx?'Correto!':'Incorreto.')}</strong> +150 XP creditados hoje 🎉 {coment?<ComentarioComLei texto={coment}/>:null}</div>}
    </div>
  )
}

function DashTicker(){
  const frases=[
    '🔥 Constância vence talento — faça sua questão de hoje.',
    '⚖️ Cada questão te aproxima da aprovação.',
    '🐯 Pense como um Tigre: foco, disciplina, evolução.',
    '🎯 30 minutos focados hoje valem mais que 3 horas amanhã.',
    '💪 Disciplina é fazer mesmo sem vontade. Bora pra cima!',
    '📈 O Elite libera IA ilimitada, simulados completos e o Radar OAB.',
    '⭐ Um dia você vai olhar pra trás e agradecer por não ter desistido.',
    '🚀 A aprovação começa na questão que você faz AGORA.',
  ]
  const [i,setI]=useState(0)
  useEffect(()=>{const t=setInterval(()=>setI(p=>(p+1)%frases.length),5000);return()=>clearInterval(t)},[frases.length])
  return(
    <div style={{position:'sticky',top:68,zIndex:20,margin:'0 0 18px',borderRadius:14,padding:'13px 18px',overflow:'hidden',background:'linear-gradient(120deg,rgba(212,168,67,0.20),rgba(232,98,26,0.11))',border:'1px solid rgba(212,168,67,0.42)',boxShadow:'0 8px 26px -14px rgba(232,98,26,0.55)',display:'flex',alignItems:'center',gap:14}}>
      <style>{`@keyframes tjFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes tjDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.65)}}@keyframes tjSheen{0%{transform:translateX(-160%) skewX(-18deg)}60%,100%{transform:translateX(520%) skewX(-18deg)}}`}</style>
      <div style={{position:'absolute',top:0,left:0,width:'30%',height:'100%',background:'linear-gradient(105deg,transparent,rgba(255,255,255,0.14),transparent)',animation:'tjSheen 6s ease-in-out infinite',pointerEvents:'none'}}/>
      <span style={{display:'inline-flex',alignItems:'center',gap:8,flexShrink:0,position:'relative'}}>
        <span style={{width:9,height:9,borderRadius:'50%',background:'var(--gold)',boxShadow:'0 0 10px var(--gold)',animation:'tjDot 1.4s ease-in-out infinite'}}/>
        <span style={{fontSize:12,fontWeight:900,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',whiteSpace:'nowrap'}}>TIGER</span>
      </span>
      <span key={i} style={{position:'relative',fontSize:'clamp(15px,2.4vw,18px)',fontWeight:800,color:'var(--white)',lineHeight:1.3,letterSpacing:0.2,animation:'tjFade 0.5s ease'}}>{frases[i]}</span>
    </div>
  )
}

function DegustacaoCard({ freeQ, freeIA, limites, showUpgrade }: any){
  const limQ = limites?.questoes===Infinity ? null : (limites?.questoes ?? 15)
  const limIA = limites?.ia===Infinity ? null : (limites?.ia ?? 5)
  const usadoQ = limQ===null?0:Math.max(0,limQ-(freeQ??limQ))
  const usadoIA = limIA===null?0:Math.max(0,limIA-(freeIA??limIA))
  const Bar = ({label,usado,lim,emoji}:any)=>{
    const p = lim? Math.min(100,Math.round((usado/lim)*100)) : 0
    return(
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
          <span style={{color:'var(--text-muted)'}}>{emoji} {label}</span>
          <span style={{fontWeight:700,color:p>=100?'var(--orange)':'var(--gold)'}}>{usado}/{lim} hoje</span>
        </div>
        <div style={{background:'rgba(255,255,255,0.07)',borderRadius:100,height:7,overflow:'hidden'}}>
          <div style={{width:`${p}%`,height:'100%',background:p>=100?'linear-gradient(90deg,var(--orange),var(--danger))':'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.6s'}}/>
        </div>
      </div>
    )
  }
  return(
    <div style={{background:'linear-gradient(135deg,rgba(232,98,26,0.1),rgba(212,168,67,0.06))',border:'1px solid rgba(232,98,26,0.28)',borderRadius:18,padding:20,marginBottom:20,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',right:-10,top:-10,fontSize:80,opacity:0.05,pointerEvents:'none'}}>🔓</div>
      <span style={{fontSize:9,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',background:'rgba(232,98,26,0.15)',border:'1px solid rgba(232,98,26,0.3)',color:'var(--orange)',padding:'3px 9px',borderRadius:100}}>Modo Degustação</span>
      <div style={{fontSize:15,fontWeight:800,color:'var(--tj-text)',margin:'10px 0 14px'}}>Você está testando o TigerJus grátis</div>
      {limQ!==null && <Bar label="Questões" usado={usadoQ} lim={limQ} emoji="📝"/>}
      {limIA!==null && <Bar label="Perguntas à IA" usado={usadoIA} lim={limIA} emoji="🤖"/>}
      <div style={{fontSize:12,color:'var(--text-muted)',margin:'6px 0 14px',lineHeight:1.5}}>No Premium: questões e IA <strong style={{color:'var(--gold)'}}>ilimitadas</strong>, simulados completos, Radar OAB e revisão inteligente.</div>
      <button className="btn-primary" style={{width:'100%',fontSize:14,fontWeight:800,padding:14,animation:'tjPulse 2s ease-in-out infinite'}} onClick={showUpgrade}>🚀 DESBLOQUEAR TUDO</button>
      <style>{`@keyframes tjPulse{0%,100%{box-shadow:0 0 0 0 rgba(232,98,26,0.4)}50%{box-shadow:0 0 0 8px rgba(232,98,26,0)}}`}</style>
    </div>
  )
}

function DepoimentoModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [papel, setPapel] = useState('')
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [statusAtual, setStatusAtual] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data } = await supabase.from('depoimentos').select('papel,texto,status').eq('user_id', profile?.id).maybeSingle()
        if (vivo && data) { setPapel(data.papel || ''); setTexto(data.texto || ''); setStatusAtual(data.status) }
      } catch { /* tabela pode não existir ainda */ }
      finally { if (vivo) setLoading(false) }
    })()
    return () => { vivo = false }
  }, [profile?.id])

  const enviar = async () => {
    if (texto.trim().length < 12) { setErro('Escreva um pouco mais sobre sua experiência (mín. 12 caracteres).'); return }
    setEnviando(true); setErro('')
    try {
      const payload = {
        nome: profile?.nome || (profile?.email ? String(profile.email).split('@')[0] : 'Aluno TigerJus'),
        papel: papel.trim() || 'Estudante TigerJus',
        texto: texto.trim(),
        status: 'pendente',
        updated_at: new Date().toISOString(),
      }
      const { error } = statusAtual
        ? await supabase.from('depoimentos').update(payload).eq('user_id', profile?.id)
        : await supabase.from('depoimentos').insert({ user_id: profile?.id, ...payload })
      if (error) throw error
      setEnviado(true); setStatusAtual('pendente')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar. Tente de novo.')
    } finally { setEnviando(false) }
  }

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:460,background:'var(--gray,#141414)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:24,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:21,fontWeight:900,margin:0}}>⭐ Deixe seu depoimento</h3>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:24,cursor:'pointer',lineHeight:1}}>×</button>
        </div>
        {loading ? (
          <div style={{padding:'30px 0',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Carregando…</div>
        ) : enviado ? (
          <div style={{padding:'18px 0 6px',textAlign:'center'}}>
            <div style={{fontSize:42,marginBottom:10}}>🎉</div>
            <div style={{fontWeight:800,fontSize:16,marginBottom:6}}>Depoimento enviado!</div>
            <p style={{color:'var(--text-muted)',fontSize:13,lineHeight:1.6,margin:0}}>Nossa equipe vai analisar e, se aprovado, ele aparece na página inicial. Obrigado! 🐯</p>
            <button onClick={onClose} className="btn-primary" style={{marginTop:18,fontSize:13,padding:'10px 24px'}}>Fechar</button>
          </div>
        ) : (
          <>
            <p style={{color:'var(--text-muted)',fontSize:13,lineHeight:1.6,marginTop:0,marginBottom:16}}>Conte sua experiência com o TigerJus. Depois de aprovado, ele pode aparecer na nossa landing.</p>
            {statusAtual && (
              <div style={{fontSize:12,fontWeight:700,marginBottom:14,padding:'9px 12px',borderRadius:8,
                background:statusAtual==='aprovado'?'rgba(52,211,153,0.12)':statusAtual==='rejeitado'?'rgba(248,113,113,0.12)':'rgba(212,168,67,0.12)',
                color:statusAtual==='aprovado'?'#34D399':statusAtual==='rejeitado'?'#F87171':'#D4A843'}}>
                {statusAtual==='aprovado'?'✅ Seu depoimento está no ar!':statusAtual==='rejeitado'?'Seu depoimento anterior não foi aprovado — pode reenviar.':'⏳ Em análise. Você pode editar e reenviar.'}
              </div>
            )}
            <label style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',display:'block',marginBottom:6,letterSpacing:'0.3px'}}>Como você quer aparecer (opcional)</label>
            <input value={papel} onChange={e=>setPapel(e.target.value)} maxLength={60} placeholder="Ex.: Estudante OAB · Aprovado(a) · 5º ano"
              style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'11px 13px',color:'#fff',fontSize:13.5,outline:'none',fontFamily:'inherit'}} />
            <label style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',display:'block',margin:'14px 0 6px',letterSpacing:'0.3px'}}>Seu depoimento</label>
            <textarea value={texto} onChange={e=>setTexto(e.target.value)} rows={4} maxLength={400} placeholder="Conte como o TigerJus está te ajudando nos estudos…"
              style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'11px 13px',color:'#fff',fontSize:13.5,outline:'none',fontFamily:'inherit',resize:'vertical'}} />
            <div style={{fontSize:11,color:'var(--text-muted)',textAlign:'right',marginTop:4}}>{texto.length}/400</div>
            {erro && <div style={{color:'#F87171',fontSize:12.5,marginTop:8}}>{erro}</div>}
            <button onClick={enviar} disabled={enviando} className="btn-primary" style={{width:'100%',marginTop:14,fontSize:14,padding:'12px',opacity:enviando?0.6:1}}>
              {enviando?'Enviando…':statusAtual?'Reenviar depoimento':'Enviar depoimento'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function EvolucaoChart({ profile }: { profile: any }) {
  const [dias, setDias] = useState<{ label: string; xp: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const desde = new Date(); desde.setDate(desde.getDate() - 13); desde.setHours(0, 0, 0, 0)
        const { data } = await supabase.from('xp_historico').select('xp,created_at').eq('user_id', profile?.id).gte('created_at', desde.toISOString())
        const mapa: Record<string, number> = {}
        ;(data || []).forEach((r: any) => {
          const k = new Date(r.created_at).toISOString().slice(0, 10)
          mapa[k] = (mapa[k] || 0) + (r.xp || 0)
        })
        const out: { label: string; xp: number }[] = []
        for (let i = 13; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i)
          out.push({ label: d.toLocaleDateString('pt-BR', { day: '2-digit' }), xp: mapa[d.toISOString().slice(0, 10)] || 0 })
        }
        if (vivo) setDias(out)
      } catch { /* xp_historico pode não existir ainda */ }
      finally { if (vivo) setLoading(false) }
    })()
    return () => { vivo = false }
  }, [profile?.id])

  const maxXp = Math.max(1, ...dias.map(d => d.xp))
  const totalXp = dias.reduce((a, d) => a + d.xp, 0)

  return (
    <div style={{ background: 'var(--gray)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '18px 18px 14px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>📈 Evolução · últimos 14 dias</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalXp.toLocaleString()} XP no período</div>
      </div>
      {loading ? (
        <div style={{ height: 90, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }} />
      ) : totalXp === 0 ? (
        <div style={{ textAlign: 'center', padding: '22px 0', color: 'var(--text-muted)', fontSize: 12.5 }}>Estude um pouco e sua evolução aparece aqui. 🐯</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
          {dias.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div title={`${d.xp} XP em ${d.label}`} style={{ width: '100%', maxWidth: 18, height: `${d.xp === 0 ? 2 : Math.max(6, (d.xp / maxXp) * 70)}px`, borderRadius: 4, background: d.xp === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(180deg,var(--gold),var(--orange))', transition: 'height 0.5s' }} />
              <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Conquistas({ profile }: { profile: any }) {
  const q = profile?.questoes_respondidas || 0
  const c = profile?.questoes_corretas || 0
  const taxa = q > 0 ? Math.round((c / q) * 100) : 0
  const streak = profile?.streak || 0
  const nivel = profile?.nivel || 1
  const xp = profile?.xp || 0

  const medalhas = [
    { icon: '🐾', nome: 'Primeira Caçada', desc: 'Responda sua 1ª questão',        ok: q >= 1,                 prog: `${Math.min(q, 1)}/1` },
    { icon: '💯', nome: 'Centurião',       desc: '100 questões respondidas',        ok: q >= 100,               prog: `${Math.min(q, 100)}/100` },
    { icon: '🎯', nome: 'Maratonista',     desc: '500 questões respondidas',        ok: q >= 500,               prog: `${Math.min(q, 500)}/500` },
    { icon: '🏹', nome: 'Pontaria de Tigre', desc: '70% de acerto (mín. 20 q)',     ok: q >= 20 && taxa >= 70,  prog: q >= 20 ? `${taxa}%` : `${q}/20 q` },
    { icon: '🎖️', nome: 'Sniper',          desc: '85% de acerto (mín. 50 q)',       ok: q >= 50 && taxa >= 85,  prog: q >= 50 ? `${taxa}%` : `${q}/50 q` },
    { icon: '🔥', nome: 'Fogo Diário',     desc: '3 dias seguidos',                 ok: streak >= 3,            prog: `${Math.min(streak, 3)}/3` },
    { icon: '⚡', nome: 'Chama Eterna',    desc: '7 dias seguidos',                 ok: streak >= 7,            prog: `${Math.min(streak, 7)}/7` },
    { icon: '💎', nome: 'Inabalável',      desc: '30 dias seguidos',                ok: streak >= 30,           prog: `${Math.min(streak, 30)}/30` },
    { icon: '🐯', nome: 'Caçador',         desc: 'Alcance o nível 2',               ok: nivel >= 2,             prog: `nível ${nivel}` },
    { icon: '👑', nome: 'Alpha',           desc: 'Alcance o nível 3',               ok: nivel >= 3,             prog: `nível ${nivel}` },
    { icon: '🏆', nome: 'Tigre Supremo',   desc: 'Alcance o nível 4',               ok: nivel >= 4,             prog: `nível ${nivel}` },
    { icon: '🌟', nome: '5K de XP',        desc: 'Acumule 5.000 XP',                ok: xp >= 5000,             prog: `${xp.toLocaleString()} XP` },
  ]
  const ganhas = medalhas.filter(m => m.ok).length

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(18px,4vw,22px)', fontWeight: 900 }}>🏅 Conquistas</h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ganhas} de {medalhas.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
        {medalhas.map(m => (
          <div key={m.nome} style={{ background: m.ok ? 'linear-gradient(135deg,rgba(212,168,67,0.12),rgba(232,98,26,0.05))' : 'var(--gray)', border: `1px solid ${m.ok ? 'rgba(212,168,67,0.35)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 14, padding: '14px', opacity: m.ok ? 1 : 0.5, transition: 'all 0.2s' }}>
            <div style={{ fontSize: 26, marginBottom: 6, filter: m.ok ? 'none' : 'grayscale(1)' }}>{m.ok ? m.icon : '🔒'}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: m.ok ? 'var(--tj-text)' : 'var(--text-muted)', marginBottom: 2 }}>{m.nome}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 6 }}>{m.desc}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: m.ok ? 'var(--gold)' : 'var(--text-muted)' }}>{m.ok ? '✓ Conquistada' : m.prog}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashHome({ profile, onNav, onMini, showUpgrade, isPago, canAccessPremium, canAccessElite, onOpenRadar, freeQ, freeIA, limites, onXp }: any) {
  const discCounts = useDisciplineCounts()
  const { settings: dashSettings } = useAppSettings()
  const [depoOpen, setDepoOpen] = useState(false)
  // Aproveitamento recente (7 dias): "momento atual", calculado no servidor a partir do xp_historico.
  const [recente7, setRecente7] = useState<{corretas:number,total:number,taxa:number|null}|null>(null)
  useEffect(()=>{
    if(!profile?.id)return
    let vivo=true
    ;(async()=>{
      try{
        const{data:{session}}=await supabase.auth.getSession()
        const res=await fetch('/api/stats/me',{headers:{Authorization:`Bearer ${session?.access_token||''}`}})
        const j=await res.json().catch(()=>null)
        if(vivo&&res.ok&&j?.recent7)setRecente7(j.recent7)
      }catch{/* silencioso */}
    })()
    return()=>{vivo=false}
  },[profile?.id,profile?.questoes_respondidas])
  const xp=profile?.xp||0; const _niv=getNivelByXp(xp); const levelName=_niv.nome
  const streak=profile?.streak||0; const xpNext=_niv.xp_max??999999; const xpPrev=_niv.xp_min
  const proxNivel=getNextNivel(xp); const xpFalta=Math.max(0,xpNext-xp)
  const primeiroNome=profile?.nome?.split(' ')[0]||'Tigre'
  const pct=Math.min(100,Math.round(((xp-xpPrev)/(xpNext-xpPrev))*100))
  const questoes=profile?.questoes_respondidas||0; const corretas=profile?.questoes_corretas||0
  const taxa=questoes>0?Math.round((corretas/questoes)*100):0
  return(
    <div style={{padding:'24px 20px',flex:1,overflowY:'auto',maxWidth:'100%'}}>
      {/* ── Banner parceiros — mesmo da página inicial, full-width ── */}
      <div style={{marginTop:-120,marginLeft:-20,marginRight:-20,marginBottom:12,overflowX:'hidden'}}>
        <LandingTopBanner/>
      </div>
      {/* ── Banner de imagem configurável pelo admin ── */}
      <DashboardTopBanner/>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Olá, {primeiroNome}! 🐯</h1>
          <p style={{fontSize:14,color:'var(--text-muted)'}}>Você é um <strong style={{color:'var(--gold)'}}>{levelName}</strong>{proxNivel?<> — faltam <strong style={{color:'var(--gold)'}}>{xpFalta.toLocaleString()} XP</strong> pra virar {proxNivel.nome} 🐯</>:<> — você chegou ao topo da selva! 👑</>}</p>
        </div>
        {streak>0&&<div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(232,98,26,0.1)',border:'1px solid rgba(232,98,26,0.25)',borderRadius:100,padding:'8px 16px',fontSize:13,fontWeight:700,color:'var(--orange)'}}>🔥 {streak} dias</div>}
      </div>
      {/* ── AÇÃO PRIMEIRO ───────────────────────────────────────── */}
      <div style={{marginBottom:20}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(16px,4vw,20px)',fontWeight:900,marginBottom:12}}>O que você quer fazer agora?</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12}}>
          {[
            {icon:'📝',label:'Estudar questões',sub:'Quiz OAB',key:'quiz',lock:false,grad:'linear-gradient(135deg,rgba(212,168,67,0.16),rgba(232,98,26,0.08))',bd:'rgba(212,168,67,0.3)'},
            {icon:'📋',label:'Fazer simulado',sub:'Estilo OAB',key:'simulados',lock:false,grad:'linear-gradient(135deg,rgba(58,143,232,0.14),rgba(212,168,67,0.05))',bd:'rgba(58,143,232,0.28)'},
            {icon:'🎯',label:'Mini-simulado',sub:'10 questões aleatórias',key:'simulados',action:'mini',lock:false,grad:'linear-gradient(135deg,rgba(232,98,26,0.14),rgba(212,168,67,0.05))',bd:'rgba(232,98,26,0.28)'},
            {icon:'🤖',label:'Tutor IA',sub:'Tire dúvidas',key:'ia',lock:!isPago,grad:'linear-gradient(135deg,rgba(139,92,246,0.14),rgba(58,143,232,0.05))',bd:'rgba(139,92,246,0.28)'},
            {icon:'🃏',label:'Revisar',sub:'Flashcards',key:'flashcards',lock:!isPago,grad:'linear-gradient(135deg,rgba(76,175,125,0.14),rgba(212,168,67,0.05))',bd:'rgba(76,175,125,0.28)'},
            {icon:'🧭',label:'Minha trilha',sub:'Onde focar agora',key:'trilhas',lock:!canAccessPremium,grad:'linear-gradient(135deg,rgba(212,168,67,0.16),rgba(58,143,232,0.06))',bd:'rgba(212,168,67,0.32)'},
          ].map(a=>(
            <button key={a.label} onClick={()=>(a as any).action==='mini'?onMini():onNav(a.key)} style={{textAlign:'left',cursor:'pointer',background:a.grad,border:`1px solid ${a.bd}`,borderRadius:16,padding:'16px 16px 14px',transition:'transform 0.2s',position:'relative'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
              {a.lock&&<span style={{position:'absolute',top:10,right:10,fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase',background:'rgba(212,168,67,0.15)',border:'1px solid rgba(212,168,67,0.3)',color:'var(--gold)',padding:'3px 7px',borderRadius:100}}>🔒 Premium</span>}
              <div style={{fontSize:26,marginBottom:10}}>{a.icon}</div>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tj-text)',marginBottom:2}}>{a.label}</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>{a.sub}</div>
            </button>
          ))}
        </div>
      </div>
      {!isPago&&<DegustacaoCard freeQ={freeQ} freeIA={freeIA} limites={limites} showUpgrade={showUpgrade}/>}
      <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.12),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:'24px',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-16,top:-16,fontSize:100,opacity:0.04,pointerEvents:'none'}}>🐯</div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--gold)',marginBottom:6}}>NÍVEL — {levelName.toUpperCase()}</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,5vw,32px)',fontWeight:900,marginBottom:4}}><XPTooltip xp={xp}/></div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>{xp<xpNext?`${(xpNext-xp).toLocaleString()} XP para o próximo nível 🏆`:'Nível máximo! 👑'}</div>
        <div style={{background:'rgba(255,255,255,0.08)',borderRadius:100,height:8,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 1s ease'}}/></div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:11,color:'var(--text-muted)'}}><span>{levelName}</span><span>{pct}%</span><span>Próximo</span></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:20}}>
        {[{label:'Questões',value:questoes.toLocaleString(),cls:'var(--gold)',sub:'respondidas'},{label:'Taxa Acerto',value:`${taxa}%`,cls:'var(--success)',sub:'aproveitamento'},{label:'Streak',value:`${streak} 🔥`,cls:'var(--orange)',sub:'dias seguidos'},{label:'XP Total',value:xp.toLocaleString(),cls:'var(--gold)',sub:'pontos ganhos'}].map(s=>(
          <div key={s.label} style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:14,padding:16}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{s.label}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,5vw,28px)',fontWeight:900,color:s.cls}}>{s.value}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>
      {recente7&&recente7.total>0&&(()=>{const t=recente7.taxa??0;const cor=t>=70?'var(--success)':t>=50?'var(--gold)':'var(--orange)';return(
        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:14,padding:'14px 16px',marginBottom:20}}>
          <div style={{fontSize:22}}>📈</div>
          <div style={{flex:1,minWidth:170}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:3}}>Aproveitamento recente · 7 dias</div>
            <div style={{fontSize:13,color:'var(--text-muted)'}}>Seu momento atual — <strong style={{color:cor}}>{recente7.corretas} de {recente7.total}</strong> questões</div>
          </div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,6vw,30px)',fontWeight:900,color:cor}}>{t}%</div>
        </div>
      )})()}
      <div style={{marginBottom:20}}><RadarOAB/></div>
      <EvolucaoChart profile={profile}/>
      {(()=>{const pf=profile;const faltando=!(pf?.nome&&pf?.telefone&&pf?.faculdade&&pf?.cidade&&pf?.uf&&pf?.periodo);if(!faltando||pf?.perfil_xp_dado)return null;return(
      <div onClick={()=>onNav('perfil')} style={{cursor:'pointer',marginBottom:16,padding:'14px 18px',borderRadius:14,background:'linear-gradient(135deg,rgba(212,168,67,0.14),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.3)',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
        <div style={{fontSize:30,flexShrink:0}}>🎁</div>
        <div style={{flex:1,minWidth:180}}>
          <div style={{fontSize:14,fontWeight:800,color:'var(--gold)',marginBottom:2}}>Complete seu perfil e ganhe +300 XP</div>
          <div style={{fontSize:12,color:'var(--text-muted)'}}>Leva 1 minuto — escolha seu avatar de tigre e conte de onde você é.</div>
        </div>
        <button className="btn-gold-sm" style={{flexShrink:0}}>Completar →</button>
      </div>
      )})()}
      <QuestaoDodia onNav={onNav} onXp={onXp} profile={profile}/>
      <div style={{background:canAccessElite?'linear-gradient(135deg,rgba(58,143,232,0.1),rgba(212,168,67,0.06))':'linear-gradient(135deg,rgba(58,143,232,0.08),rgba(212,168,67,0.06))',border:`1px solid ${canAccessElite?'rgba(58,143,232,0.25)':'rgba(58,143,232,0.2)'}`,borderRadius:16,padding:20,marginBottom:20,cursor:'pointer',transition:'all 0.2s'}}
        onClick={canAccessElite?onOpenRadar:showUpgrade}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)'}}
        onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <span style={{fontSize:20}}>🎯</span>
          <div style={{fontSize:16,fontWeight:700,flex:1}}>Radar TigerJus</div>
          {canAccessElite?<div style={{fontSize:9,fontWeight:800,letterSpacing:'1.5px',textTransform:'uppercase',background:'rgba(76,175,125,0.15)',border:'1px solid rgba(76,175,125,0.3)',color:'var(--success)',padding:'4px 10px',borderRadius:100}}>✓ ATIVO — CLIQUE</div>:<div style={{fontSize:9,fontWeight:800,letterSpacing:'1.5px',textTransform:'uppercase',background:'rgba(232,98,26,0.1)',border:'1px solid rgba(232,98,26,0.25)',color:'var(--orange)',padding:'4px 10px',borderRadius:100}}>🔒 Elite</div>}
        </div>
        <div style={{fontSize:13,color:'var(--text-muted)'}}>{canAccessElite?'Veja os 6 temas com maior probabilidade de cair no 47º Exame OAB →':'Exclusivo Elite — os temas com maior probabilidade de cair na próxima OAB.'}</div>
      </div>
      {/* ── BOTÃO INDICAR AMIGOS — sempre visível ─────────────── */}
      <div
        style={{background:'linear-gradient(135deg,rgba(212,168,67,0.13),rgba(232,98,26,0.08))',border:'1px solid rgba(212,168,67,0.35)',borderRadius:18,padding:'18px 20px',marginBottom:20,cursor:'pointer',transition:'all 0.2s'}}
        onClick={()=>onNav('referral')}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 10px 30px rgba(212,168,67,0.15)'}}
        onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:14,flex:1,minWidth:200}}>
            <div style={{width:46,height:46,borderRadius:12,background:'linear-gradient(135deg,rgba(212,168,67,0.2),rgba(232,98,26,0.1))',border:'1px solid rgba(212,168,67,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🐯</div>
            <div>
              <div style={{fontSize:14,fontWeight:900,color:'var(--gold)',marginBottom:3}}>
                {profile?.ambassador_badge||'Programa Tigre Embaixador'}
              </div>
              <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.5}}>
                {(profile?.referral_count||0)>0
                  ? `${profile?.referral_count} indicaç${(profile?.referral_count||0)===1?'ão':'ões'} · ${profile?.plano==='elite'?`${profile?.referral_discount_pct||0}% desconto acumulado`:`${profile?.referral_days_bonus||0} dias extras ganhos`}`
                  : 'Indique amigos e ganhe 15 dias extras por assinatura.'}
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            style={{fontSize:12,padding:'10px 22px',flexShrink:0,whiteSpace:'nowrap',fontWeight:800,letterSpacing:'0.5px'}}
            onClick={e=>{e.stopPropagation();onNav('referral')}}>
            🔗 INDICAR AGORA
          </button>
        </div>
      </div>
      {/* ── FIM BOTÃO INDICAR ────────────────────────────────────── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(18px,4vw,22px)',fontWeight:900}}>Disciplinas em destaque</h2>
        <button style={{color:'var(--gold)',fontSize:13,border:'none',background:'none',cursor:'pointer'}} onClick={()=>onNav('disciplines')}>Ver todas →</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
        {DISCIPLINES.slice(0,6).map(d=>(
          <div key={d.id} style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:14,padding:16,cursor:'pointer',transition:'all 0.2s'}}
            onClick={()=>onNav('disciplines')}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.2)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{fontSize:22,marginBottom:10}}>{d.icon}</div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:5}}>{d.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>{discCounts[d.name] ?? '…'} questões</div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{d.tags.map(t=><span key={t} style={{fontSize:9,padding:'2px 6px',background:'rgba(212,168,67,0.07)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:4,color:'var(--gold-dark)',fontWeight:600}}>{t}</span>)}</div>
          </div>
        ))}
      </div>

      <Conquistas profile={profile}/>

      {/* ── DEIXE SEU DEPOIMENTO ─────────────────────────────────── */}
      <div style={{marginTop:24,background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.05))',border:'1px solid rgba(212,168,67,0.22)',borderRadius:16,padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
        <div>
          <div style={{fontWeight:800,fontSize:15,marginBottom:3}}>⭐ Curtindo o TigerJus?</div>
          <div style={{fontSize:13,color:'var(--text-muted)'}}>Deixe seu depoimento e ajude outros futuros aprovados.</div>
        </div>
        <button onClick={()=>setDepoOpen(true)} className="btn-primary" style={{fontSize:13,padding:'10px 22px',fontWeight:800,whiteSpace:'nowrap',flexShrink:0}}>Deixar depoimento</button>
      </div>
      {depoOpen && <DepoimentoModal profile={profile} onClose={()=>setDepoOpen(false)} />}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// QUIZ — embaralhamento correto + cobertura do banco sem repetir
// ────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────
// Persistência de quiz em andamento (sobrevive a queda de energia/conexão,
// fechar o app ou dar reload). Guarda no localStorage do próprio aparelho —
// não depende de internet pra restaurar. Uma chave por tipo de quiz.
// ────────────────────────────────────────────────────────────────────
function salvarProgresso(chave:string,estado:any){
  try{ if(typeof window!=='undefined')window.localStorage.setItem(chave,JSON.stringify({...estado,_ts:Date.now()})) }catch{}
}
function lerProgresso(chave:string,maxAgeMs=24*60*60*1000):any{
  try{
    if(typeof window==='undefined')return null
    const s=window.localStorage.getItem(chave); if(!s)return null
    const obj=JSON.parse(s)
    // expira sozinho (padrão 24h) pra não ressuscitar quiz de dias atrás
    if(obj&&obj._ts&&Date.now()-obj._ts>maxAgeMs){window.localStorage.removeItem(chave);return null}
    return obj
  }catch{ return null }
}
function limparProgresso(chave:string){
  try{ if(typeof window!=='undefined')window.localStorage.removeItem(chave) }catch{}
}

// Embaralhamento REAL (Fisher-Yates). O antigo `.sort(()=>Math.random()-0.5)`
// é viciado no V8/Chrome e fazia cair quase sempre as mesmas questões.
function embaralhar<T>(arr:T[]):T[]{
  const a=[...arr]
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a
}

// Busca TODOS os ids do escopo driblando o teto de 1000 linhas do PostgREST
// (com 1.026+ questões, "Todas as disciplinas" nunca via 26 delas).
async function fetchIdsQuestoes(discs:string[]|null):Promise<string[]>{
  const ids:string[]=[]
  const passo=1000
  for(let inicio=0;;inicio+=passo){
    let q=supabase.from('questoes_publicas').select('id').range(inicio,inicio+passo-1)
    if(discs&&discs.length)q=q.in('disciplina',discs)
    const{data,error}=await q
    if(error||!data||data.length===0)break
    for(const r of data as any[])ids.push(r.id)
    if(data.length<passo)break
  }
  return ids
}

// Busca as LINHAS COMPLETAS de questoes_publicas driblando o teto de 1.000 do
// PostgREST. discs=null => banco inteiro. Usado por Radar e Simulados, que antes
// cortavam em 1.000 (ex.: o simulado Geral puxava o banco todo e perdia 26 questões).
async function fetchQuestoesCompletas(discs:string[]|null):Promise<any[]>{
  const cols='id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d'
  const todas:any[]=[]
  const passo=1000
  for(let inicio=0;;inicio+=passo){
    let q=supabase.from('questoes_publicas').select(cols).range(inicio,inicio+passo-1)
    if(discs&&discs.length)q=q.in('disciplina',discs)
    const{data,error}=await q
    if(error||!data||data.length===0)break
    todas.push(...(data as any[]))
    if(data.length<passo)break
  }
  return todas
}

// Sorteia `qtd` questões priorizando as que o usuário AINDA NÃO VIU.
// Quando o escopo esgota (viu tudo daquela disciplina), o ciclo reseta
// sozinho e recomeça. Marca as escolhidas como vistas (não bloqueia).
// Retorna os ids escolhidos, já embaralhados.
async function sortearNaoVistas(discs:string[]|null,qtd:number):Promise<string[]>{
  const pool=await fetchIdsQuestoes(discs)
  if(pool.length===0)return []
  const poolSet=new Set(pool)

  let userId:string|null=null
  try{ const{data:{user}}=await supabase.auth.getUser(); userId=user?.id||null }catch{ userId=null }

  // vistas do usuário que pertencem a este escopo
  const vistas=new Set<string>()
  if(userId){
    try{
      for(let inicio=0;;inicio+=1000){
        const{data,error}=await supabase.from('quiz_questoes_vistas').select('questao_id').eq('user_id',userId).range(inicio,inicio+999)
        if(error||!data||data.length===0)break
        for(const r of data as any[]){ if(poolSet.has(r.questao_id))vistas.add(r.questao_id) }
        if(data.length<1000)break
      }
    }catch{/* sem memória de vistas: cai no fluxo aleatório normal */}
  }

  let naoVistas=pool.filter(id=>!vistas.has(id))

  // ciclo esgotado → reseta as vistas DESTE escopo e recomeça do zero
  if(naoVistas.length===0){
    if(userId&&vistas.size){
      try{
        const ids=[...vistas]
        for(let i=0;i<ids.length;i+=500){
          await supabase.from('quiz_questoes_vistas').delete().eq('user_id',userId).in('questao_id',ids.slice(i,i+500))
        }
      }catch{/* silencioso */}
    }
    naoVistas=pool
  }

  const escolhidas=embaralhar(naoVistas).slice(0,qtd)

  // marca como vistas em segundo plano (se falhar, o quiz roda igual)
  if(userId&&escolhidas.length){
    const uid=userId
    ;(async()=>{
      try{
        const rows=escolhidas.map(qid=>({user_id:uid,questao_id:qid}))
        await supabase.from('quiz_questoes_vistas').upsert(rows,{onConflict:'user_id,questao_id',ignoreDuplicates:true})
      }catch{/* silencioso */}
    })()
  }

  return escolhidas
}

function QuizPage({ freeQ, setFreeQ, showUpgrade, onXp, profile, isPago }: any) {
  const totalQuestoes = useTotalQuestoes()
  const [disciplina,setDisciplina]=useState('')
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
  const [checking,setChecking]=useState(false)
  const [emAndamento,setEmAndamento]=useState<any>(null)
  const CHAVE_QUIZ='tj-quiz-progress:'+(profile?.id||'anon')
  const MODO_QTD:Record<string,number>={'Fácil':30,'Médio':60,'Difícil':80}
  const MODO_TEMPO:Record<string,number>={'Fácil':180,'Médio':180,'Difícil':180}
  const modosLib=getQuizModes(profile?.plano,profile?.role)
  const temCota=Number.isFinite(freeQ)

  // Ao abrir a tela: existe um quiz salvo pra retomar?
  useEffect(()=>{
    const s=lerProgresso(CHAVE_QUIZ)
    if(s&&Array.isArray(s.questions)&&s.questions.length&&!s.done&&s.cur<s.questions.length)setEmAndamento(s)
  },[])

  // Salva o progresso a cada mudança (inclui o cronômetro, 1x/seg). Limpa ao concluir.
  useEffect(()=>{
    if(!started)return
    if(done||questions.length===0){limparProgresso(CHAVE_QUIZ);return}
    salvarProgresso(CHAVE_QUIZ,{disciplina,modo,questions,cur,sel:answered?sel:null,answered,score,time,done:false})
  },[started,done,questions,cur,sel,answered,score,time,disciplina,modo])

  const retomar=()=>{
    const s=emAndamento;if(!s)return
    setDisciplina(s.disciplina||'');setModo(s.modo||'Fácil')
    setQuestions(s.questions);setCur(s.cur||0);setSel(s.answered?(s.sel??null):null);setAnswered(!!s.answered);setScore(s.score||0);setTime(s.time||0)
    setDone(false);setStarted(true);setEmAndamento(null)
  }
  const descartar=()=>{limparProgresso(CHAVE_QUIZ);setEmAndamento(null)}

  const abaOculta=useAbaOculta()
  const prazoRef=useRef<number>(0)
  const tempoRef=useRef<number>(time)
  tempoRef.current=time
  useEffect(()=>{
    if(!started||done||abaOculta)return
    // Relógio de parede: o tempo restante vem da diferença de horário REAL (Date.now),
    // não da soma de "tiques". Travadas de render/scroll não "comem" segundos; ao voltar
    // de uma pausa (aba oculta) o prazo é reancorado a partir do tempo que restava.
    prazoRef.current=Date.now()+tempoRef.current*1000
    const t=setInterval(()=>{
      const restante=Math.max(0,Math.ceil((prazoRef.current-Date.now())/1000))
      setTime(restante)
      if(restante<=0){clearInterval(t);setDone(true)}
    },250)
    setTime(Math.max(0,Math.ceil((prazoRef.current-Date.now())/1000)))
    return()=>clearInterval(t)
  },[started,done,abaOculta])

  const startQuiz=async()=>{
    setLoadingQ(true)
    setEmAndamento(null)
    try{
      let discs:string[]|null=null
      if(disciplina){const card=DISC_MAP[disciplina]||disciplina;discs=PDF_DISC_MAP[card]||[card]}
      // sorteia priorizando questões ainda NÃO VISTAS (percorre o banco todo)
      const ids=await sortearNaoVistas(discs,MODO_QTD[modo])
      if(ids.length===0){setLoadingQ(false);alert('Nenhuma questão encontrada.');return}
      const{data,error}=await supabase.from('questoes_publicas').select('id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d').in('id',ids)
      if(error||!data||data.length===0){setLoadingQ(false);alert('Nenhuma questão encontrada.');return}
      // o .in devolve na ordem do banco → reordena conforme o sorteio
      const byId=new Map((data as any[]).map(q=>[q.id,q]))
      const ordenadas=ids.map(id=>byId.get(id)).filter(Boolean)
      setQuestions(ordenadas.map((q:any)=>({id:q.id,disc:q.disciplina,q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:null,exp:''})))
      setLoadingQ(false);setStarted(true);setCur(0);setSel(null);setAnswered(false);setScore(0);setDone(false);setTime(ordenadas.length*MODO_TEMPO[modo])
    }catch{
      setLoadingQ(false);alert('Nenhuma questão encontrada.')
    }
  }

  // Valida a resposta no servidor. i=null => tempo esgotou (revela sem pontuar).
  const responder=async(i:number|null)=>{
    if(answered||checking)return
    if(i!==null&&freeQ<=0){showUpgrade();return}
    if(i!==null)setSel(i)
    setChecking(true)
    try{
      const{data:{session}}=await supabase.auth.getSession()
      const res=await fetch('/api/questao/validar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify({questaoId:questions[cur].id,contexto:'quiz',...(i!==null?{escolha:i}:{})})})
      if(res.status===403){setFreeQ(0);setSel(null);setChecking(false);showUpgrade();return}
      const data=await res.json()
      if(res.ok){
        const correctIdx=['A','B','C','D'].indexOf(data.letra_correta)
        setQuestions(prev=>prev.map((qq,idx)=>idx===cur?{...qq,correct:correctIdx,exp:data.comentario||''}:qq))
        if(i!==null){
          setFreeQ((p:number)=>p-1)
          if(data.correto){setScore(p=>p+1);onXp('question_correct')}else onXp('question_wrong')
          // Trilhas: grava cada resposta real na hora (por disciplina da questão), sem bloquear o quiz
          ;(async()=>{try{const{data:{user}}=await supabase.auth.getUser();if(user)await supabase.from('quiz_resultados').insert({user_id:user.id,disciplina:cardDaDisciplina(questions[cur].disc),acertos:data.correto?1:0,total:1})}catch{/* silencioso */}})()
        }
        setAnswered(true)
      }else if(i!==null){setSel(null)}
      else setAnswered(true)
    }catch{
      if(i!==null)setSel(null)
      else setAnswered(true)
    }finally{setChecking(false)}
  }

  const pick=(i:number)=>{ responder(i) }
  const next=()=>{if(cur+1>=questions.length){setDone(true);onXp('quiz_complete');return}setCur(p=>p+1);setSel(null);setAnswered(false)}
  const restart=()=>{setStarted(false);setDone(false);setScore(0);setCur(0)}

  if(!started) return(
    <div style={{padding:'24px 20px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Quiz OAB 📝</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:6}}>Questões reais das provas oficiais da OAB/FGV.</p>
      <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(212,168,67,0.08)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:100,padding:'5px 12px',fontSize:11,color:'var(--gold)',marginBottom:24}}>📋 {totalQuestoes !== null ? totalQuestoes.toLocaleString('pt-BR') : '…'} questões reais no banco</div>
      {temCota&&<div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--gold)'}}>⚡ <strong>{freeQ} questões restantes hoje</strong>. {isPago?'Suba para o Pro e tenha questões ilimitadas.':'Faça upgrade para mais questões por dia.'}</div>}
      {emAndamento&&<div style={{maxWidth:560,background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.4)',borderRadius:16,padding:'16px 18px',marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:800,color:'var(--gold)',marginBottom:4}}>⏸️ Quiz em andamento</div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>Modo {emAndamento.modo}{emAndamento.disciplina?` · ${emAndamento.disciplina}`:''} · você parou na questão {(emAndamento.cur||0)+1} de {emAndamento.questions.length}.</div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn-primary" style={{flex:1}} onClick={retomar}>▶️ Continuar de onde parei</button>
          <button className="btn-secondary" style={{flex:1}} onClick={descartar}>Descartar</button>
        </div>
      </div>}
      <div style={{maxWidth:560,border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:'24px'}}>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:10}}>Disciplina (opcional)</label>
          <select value={disciplina} onChange={e=>setDisciplina(e.target.value)} style={{width:'100%',background:'var(--field-bg)',border:'1px solid var(--tj-border)',borderRadius:10,padding:'12px 16px',color:'var(--field-fg)',fontSize:14,fontFamily:'var(--font-body)',colorScheme:'var(--field-scheme)'}}>
            <option value="">Todas as disciplinas</option>
            {Object.keys(DISC_MAP).map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{marginBottom:28}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:10}}>Modo — <span style={{color:'var(--gold)'}}>{modo} ({MODO_QTD[modo]} questões · {Math.round(MODO_QTD[modo]*MODO_TEMPO[modo]/60)} min · {Math.round(MODO_TEMPO[modo]/60)} min/questão)</span></label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {(['Fácil','Médio','Difícil'] as const).map(m=>{
              const bloqueado=!modosLib.includes(m)
              return(
              <button key={m} onClick={()=>{if(bloqueado){showUpgrade();return}setModo(m)}} style={{padding:'12px 8px',borderRadius:10,border:modo===m?'1px solid rgba(212,168,67,0.5)':'1px solid rgba(255,255,255,0.08)',background:modo===m?'rgba(212,168,67,0.1)':'transparent',color:modo===m?'var(--gold)':bloqueado?'var(--text-dim)':'var(--text-muted)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)',textAlign:'center'}}>
                <div>{m} {bloqueado&&'🔒'}</div>
                <div style={{fontSize:10,marginTop:3,opacity:0.7}}>{MODO_QTD[m]}q · {Math.round(MODO_QTD[m]*MODO_TEMPO[m]/60)}min</div>
              </button>
            )})}
          </div>
        </div>
        <button className="btn-primary" style={{width:'100%',fontSize:15,padding:16}} onClick={startQuiz} disabled={loadingQ}>{loadingQ?'⏳ Carregando...':'INICIAR QUIZ →'}</button>
        <div style={{marginTop:10,textAlign:'center',fontSize:12,color:'var(--text-muted)'}}>{!temCota?'✓ Ilimitado':freeQ>0?`${freeQ} restantes hoje`:'🔒 Limite diário atingido'}</div>
      </div>
    </div>
  )

  const q=questions[cur]
  const pct=Math.round(((cur+(answered?1:0))/questions.length)*100)

  if(done){
    const rate=Math.round((score/questions.length)*100)
    const aprovado=score>=Math.ceil(questions.length*0.5)
    return(
      <div style={{padding:'24px 20px',flex:1}}>
        <div style={{maxWidth:600,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:60,marginBottom:18}}>{aprovado?'🏆':rate>=50?'📝':'💪'}</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:8}}>Quiz Concluído!</h1>
          <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>{score} de {questions.length} corretas · Modo {modo}</p>
          <div style={{background:aprovado?'rgba(76,175,125,0.1)':'rgba(232,98,26,0.1)',border:`1px solid ${aprovado?'var(--success)':'var(--orange)'}`,borderRadius:16,padding:18,marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:900,color:aprovado?'var(--success)':'var(--orange)',marginBottom:6}}>{aprovado?'✅ Na média OAB!':'❌ Abaixo da média OAB'}</div>
            <div style={{fontSize:13,color:'var(--text-muted)'}}>{aprovado?`${rate}% — acima dos 50% exigidos.`:`Precisa de ${Math.ceil(questions.length*0.5)} acertos.`}</div>
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center'}}><button className="btn-primary" onClick={restart}>NOVO QUIZ</button><button className="btn-secondary" onClick={restart}>MUDAR MODO</button></div>
        </div>
      </div>
    )
  }

  return(
    <div style={{padding:'24px 20px',flex:1}}>
      <div style={{maxWidth:680,margin:'0 auto'}}>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>Q{cur+1}/{questions.length} · {modo}</div>
        <div style={{marginBottom:16}}><CronometroSimulado segundosRestantes={time} duracaoTotalSegundos={questions.length*MODO_TEMPO[modo]} /></div>
        <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:24,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}}/></div>
        {(() => { const resp=cur+(answered?1:0); const taxa=resp>0?Math.round(score/resp*100):0; return (
          <div style={{display:'flex',gap:12,marginBottom:24}}>
            <div style={{flex:1,background:'rgba(58,143,232,0.1)',border:'1px solid rgba(58,143,232,0.3)',borderRadius:14,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:'1px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:4}}>Respondidas</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:'#60a5fa',lineHeight:1}}>{resp}<span style={{fontSize:14,color:'var(--text-muted)',fontWeight:700}}>/{questions.length}</span></div>
            </div>
            <div style={{flex:1,background:taxa>=50?'rgba(76,175,125,0.1)':'rgba(232,66,26,0.08)',border:`1px solid ${taxa>=50?'rgba(76,175,125,0.35)':'rgba(232,66,26,0.3)'}`,borderRadius:14,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:'1px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:4}}>Taxa de acerto</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:taxa>=50?'var(--success)':'var(--danger)',lineHeight:1}}>{resp>0?`${taxa}%`:'—'}</div>
            </div>
          </div>
        ) })()}
        <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:'24px'}}>
          <div style={{display:'flex',gap:8,marginBottom:14}}><span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)'}}>{q.disc}</span><span style={{fontSize:10,color:'var(--text-muted)'}}>· OAB Oficial</span></div>
          <div style={{fontSize:'clamp(14px,3vw,18px)',fontWeight:600,lineHeight:1.6,marginBottom:24}}>{q.q}</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {q.opts.map((opt:string,i:number)=>{
              let bg='rgba(255,255,255,0.03)',bc='rgba(255,255,255,0.08)',color='var(--tj-text)'
              if(checking&&i===sel){bg='rgba(212,168,67,0.08)';bc='rgba(212,168,67,0.6)';color='var(--gold)'}
              if(answered){if(i===q.correct){bg='rgba(76,175,125,0.1)';bc='var(--success)';color='var(--success)'}else if(i===sel){bg='rgba(232,66,26,0.1)';bc='var(--danger)';color='var(--danger)'}}
              return(<button key={i} onClick={()=>pick(i)} style={{display:'flex',alignItems:'flex-start',gap:12,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'14px 16px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:'clamp(13px,2.5vw,14px)',color}}>
                <span style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,background:'rgba(255,255,255,0.06)'}}>{String.fromCharCode(65+i)}</span>
                <span style={{flex:1}}>{opt}</span>
              </button>)
            })}
          </div>
          {answered&&q.exp&&<div style={{marginTop:20,padding:16,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:13,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> <ComentarioComLei texto={q.exp}/></div>}
          {answered&&<button className="btn-primary" style={{width:'100%',marginTop:18}} onClick={next}>{cur+1>=questions.length?'VER RESULTADO':'PRÓXIMA →'}</button>}
        </div>
      </div>
    </div>
  )
}

function IAPage({ freeIA, setFreeIA, showUpgrade, profile, isPago, iaIlimitada }: any) {
  const { settings: iaSettings } = useAppSettings()
  const [msgs,setMsgs]=useState([{role:'assistant',text:iaSettings.ia_welcome_message||'Olá! Sou o TigerJus AI — seu tutor jurídico de alta performance. 🐯⚖️\n\nPosso te ajudar com dúvidas de Direito, explicar artigos, resumir temas e te preparar para a OAB.\n\nO que você quer aprender hoje?'}])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const endRef=useRef<HTMLDivElement>(null)
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  const send=async(text?:string)=>{
    const msg=text||input.trim()
    if(!msg)return
    if(!iaIlimitada&&freeIA<=0){showUpgrade();return}
    setInput('')
    if(!iaIlimitada)setFreeIA((p:number)=>p-1)
    const newMsgs=[...msgs,{role:'user',text:msg}]
    setMsgs(newMsgs);setLoading(true)
    try{
      const{data:{session}}=await supabase.auth.getSession()
      const res=await fetch('/api/ia',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify({messages:newMsgs.slice(1).map(m=>({role:m.role,content:m.text}))})})

      // Erros (ex.: cota diária) chegam como JSON antes de qualquer streaming
      if(!res.ok||!res.body){
        let payload:any={}
        try{payload=await res.json()}catch{}
        if(payload?.error==='LIMIT_REACHED'){showUpgrade();return}
        setMsgs(p=>[...p,{role:'assistant',text:payload?.text||'Erro ao conectar com a IA.'}])
        return
      }

      // Resposta em streaming: o texto aparece conforme a IA escreve.
      const reader=res.body.getReader()
      const decoder=new TextDecoder()
      let acumulado=''
      let iniciou=false
      while(true){
        const{done,value}=await reader.read()
        if(done)break
        acumulado+=decoder.decode(value,{stream:true})
        if(!iniciou){
          // primeiro pedaço: tira o "Analisando..." e cria a bolha da resposta
          iniciou=true
          setLoading(false)
          setMsgs(p=>[...p,{role:'assistant',text:acumulado}])
        }else{
          setMsgs(p=>{const c=[...p];c[c.length-1]={role:'assistant',text:acumulado};return c})
        }
      }
      if(!iniciou){
        setMsgs(p=>[...p,{role:'assistant',text:'Não recebi resposta da IA. Tente novamente.'}])
      }
    }catch{setMsgs(p=>[...p,{role:'assistant',text:'Erro ao conectar com a IA.'}])}
    finally{setLoading(false)}
  }

  const chips=['Explique habeas corpus','O que é dolo eventual?','Resumir Constitucional','Cláusula pétrea','Princípio da legalidade penal']
  return(
    <div style={{padding:'24px 20px',flex:1,display:'flex',flexDirection:'column'}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>IA Jurídica 🤖</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:12}}>Tutor inteligente 24/7. {freeIA>0?<span style={{color:'var(--gold)',fontWeight:700}}>{freeIA} pergunta{freeIA!==1?'s':''} restante{freeIA!==1?'s':''} hoje</span>:<span style={{color:'var(--danger)'}}>🔒 Limite atingido</span>}</p>
      {!iaIlimitada&&freeIA<=0&&(<div style={{background:'rgba(232,66,26,0.08)',border:'1px solid rgba(232,66,26,0.25)',borderRadius:12,padding:'14px 16px',marginBottom:16,fontSize:13,lineHeight:1.6}}><div style={{fontWeight:800,color:'var(--danger)',letterSpacing:'0.3px',marginBottom:profile?.plano==='elite'?0:4}}>🔒 SEU LIMITE DIÁRIO EXCEDEU. RETORNE AMANHÃ.</div>{profile?.plano!=='elite'&&<button onClick={showUpgrade} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)',fontWeight:700,padding:0}}>ou vire Pro pra mais perguntas hoje →</button>}</div>)}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>{chips.map(c=><button key={c} onClick={()=>send(c)} style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.14)',borderRadius:100,padding:'5px 12px',fontSize:11,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font-body)'}}>{c}</button>)}</div>
      {!iaIlimitada&&<div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:6,marginBottom:8,fontSize:12,fontWeight:700}}><span style={{opacity:0.6}}>🐯 IA Tiger:</span>{freeIA>0?<span style={{color:'var(--gold)'}}>{freeIA} pergunta{freeIA!==1?'s':''} restante{freeIA!==1?'s':''} hoje</span>:<span style={{color:'var(--danger)'}}>limite diário atingido</span>}</div>}
      <div style={{flex:1,border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:350}}>
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:14,padding:20}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:'flex',gap:10,maxWidth:'85%',alignSelf:m.role==='user'?'flex-end':'flex-start',flexDirection:m.role==='user'?'row-reverse':'row'}}>
              <div style={{width:34,height:34,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,background:m.role==='user'?'var(--gray-light)':'linear-gradient(135deg,var(--gold),var(--orange))'}}>{m.role==='user'?'👤':'🐯'}</div>
              <div style={{background:m.role==='user'?'rgba(212,168,67,0.1)':'rgba(255,255,255,0.04)',border:m.role==='user'?'1px solid rgba(212,168,67,0.2)':'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'12px 16px',fontSize:13,lineHeight:1.7,color:'var(--tj-text)',whiteSpace:'pre-wrap'}}>{m.text}</div>
            </div>
          ))}
          {loading&&<div style={{display:'flex',gap:10}}><div style={{width:34,height:34,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,var(--gold),var(--orange))'}}>🐯</div><div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'12px 16px',fontSize:13,opacity:0.6,fontStyle:'italic'}}>Analisando...</div></div>}
          <div ref={endRef}/>
        </div>
        <div style={{display:'flex',gap:10,padding:14,background:'var(--gray-mid)',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <textarea className="form-input" placeholder="Pergunte algo jurídico..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} style={{flex:1,resize:'none',minHeight:42}} rows={1} disabled={!iaIlimitada&&freeIA<=0}/>
          <button onClick={()=>send()} disabled={!iaIlimitada&&freeIA<=0} style={{background:'linear-gradient(135deg,var(--gold),var(--orange))',border:'none',borderRadius:10,width:42,height:42,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:17,color:'var(--deep-black)',opacity:(!iaIlimitada&&freeIA<=0)?0.4:1}}>➤</button>
        </div>
      </div>
    </div>
  )
}

const LEI_PADRAO_DISC:Record<string,string>={constitucional:'cf',penal:'cp','processo-penal':'cpp',civil:'cc','processo-civil':'cpc',trabalho:'clt','proc-trabalho':'clt',etica:'ced',tributario:'ctn',consumidor:'cdc',eca:'eca'}

function ResumoRenderer({ texto, leiPadrao }: { texto: string; leiPadrao?: string }) {
  const linhas = texto.split('\n')
  return (
    <div style={{fontSize:14,lineHeight:1.9,color:'var(--text-muted)'}}>
      {linhas.map((linha,i) => {
        const trim = linha.trim()
        if (!trim) return <div key={i} style={{height:8}}/>
        if (trim === trim.toUpperCase() && trim.length > 4 && !trim.startsWith('-') && !trim.startsWith('•'))
          return <div key={i} style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:900,color:'var(--tj-text)',marginTop:i>0?20:0,marginBottom:8,letterSpacing:0.3}}>{trim}</div>
        if (trim.startsWith('- ') || trim.startsWith('• '))
          return (<div key={i} style={{display:'flex',gap:8,marginBottom:4,paddingLeft:4}}><span style={{color:'var(--gold)',flexShrink:0,marginTop:2}}>▸</span><span><ComentarioComLei texto={trim.replace(/^[-•]\s/,'')} leiPadrao={leiPadrao}/></span></div>)
        return <div key={i} style={{marginBottom:4}}><ComentarioComLei texto={trim} leiPadrao={leiPadrao}/></div>
      })}
    </div>
  )
}

function ResumoSection({ disc, onNav, resumoTier = 'none', showUpgrade }: { disc: any; onNav: (tab: string) => void; resumoTier?: 'none'|'curto'|'completo'|'memorizacao'; showUpgrade?: () => void }) {
  const [estado,setEstado]=useState<'loading'|'banco'|'local'|'vazio'>('loading')
  const [texto,setTexto]=useState('')
  const [resumoCurto,setResumoCurto]=useState('')
  const fetchingRef=useRef(false)
  const cacheRef=useRef<Map<string,{texto:string;curto:string;fonte:'banco'|'local'|'vazio'}>>(new Map())

  useEffect(()=>{
    setEstado('loading');setTexto('');setResumoCurto('')
    const cached=cacheRef.current.get(disc.slug)
    if(cached){setTexto(cached.texto);setResumoCurto(cached.curto);setEstado(cached.fonte);return}
    if(fetchingRef.current)return
    fetchingRef.current=true
    const carregar=async()=>{
      try{
        const{data}=await supabase.from('discipline_summaries').select('resumo,resumo_curto,tipo,tags,nivel_dificuldade').eq('disciplina_slug',disc.slug).eq('ativo',true).maybeSingle()
        if(data?.resumo){
          const entry={texto:data.resumo,curto:data.resumo_curto||'',fonte:'banco' as const}
          cacheRef.current.set(disc.slug,entry);setTexto(entry.texto);setResumoCurto(entry.curto);setEstado('banco');return
        }
        const local=RESUMOS[disc.slug]
        if(local){
          const entry={texto:local,curto:'',fonte:'local' as const}
          cacheRef.current.set(disc.slug,entry);setTexto(local);setResumoCurto('');setEstado('local');return
        }
        cacheRef.current.set(disc.slug,{texto:'',curto:'',fonte:'vazio'});setEstado('vazio')
      }catch{setEstado('vazio')}
      finally{fetchingRef.current=false}
    }
    carregar()
  },[disc.slug])

  if(estado==='loading') return(
    <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:24}}>
      {[90,70,80,60,75].map((w,i)=><div key={i} style={{height:14,borderRadius:6,marginBottom:12,background:'rgba(255,255,255,0.06)',width:`${w}%`,animation:'pulse 1.5s infinite'}}/>)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )

  if(estado==='vazio') return(
    <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:32,textAlign:'center'}}>
      <div style={{fontSize:40,marginBottom:14}}>📖</div>
      <h3 style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,marginBottom:8,color:'var(--tj-text)'}}>Resumo em preparação</h3>
      <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7,marginBottom:24,maxWidth:380,margin:'0 auto 24px'}}>O resumo de <strong style={{color:'var(--gold)'}}>{disc.name}</strong> ainda está sendo elaborado.</p>
      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
        <button className="btn-primary" style={{fontSize:13}} onClick={()=>onNav('quiz')}>📝 Fazer Quiz</button>
        <button className="btn-secondary" style={{fontSize:13}} onClick={()=>onNav('flashcards')}>🃏 Ver Flashcards</button>
        <button className="btn-secondary" style={{fontSize:13}} onClick={()=>onNav('ia')}>🤖 Perguntar à IA</button>
      </div>
    </div>
  )

  const verCompleto=resumoTier==='completo'||resumoTier==='memorizacao'
  const leiPadrao=LEI_PADRAO_DISC[disc.slug]

  if(resumoTier==='none') return(
    <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:32,textAlign:'center'}}>
      <div style={{fontSize:44,marginBottom:14}}>🔒</div>
      <h3 style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,marginBottom:8}}>Resumos a partir do Tiger Start</h3>
      <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7,maxWidth:400,margin:'0 auto 22px'}}>No <strong style={{color:'var(--gold)'}}>Start</strong> você já leva os resumos rápidos. No <strong style={{color:'var(--gold)'}}>Pro</strong>, os resumos completos por disciplina. No <strong style={{color:'var(--orange)'}}>Elite</strong>, ainda a Lei Seca de memorização.</p>
      <button className="btn-primary" style={{fontSize:13,padding:'12px 28px'}} onClick={showUpgrade}>🚀 Ver planos</button>
    </div>
  )

  return(
    <div>
      {resumoCurto&&<div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,color:'var(--gold)',lineHeight:1.6}}><ComentarioComLei texto={resumoCurto} leiPadrao={leiPadrao}/></div>}
      <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:'24px'}}>
        {verCompleto?(
          <ResumoRenderer texto={texto} leiPadrao={leiPadrao}/>
        ):(
          <div style={{position:'relative'}}>
            <div style={{maxHeight:300,overflow:'hidden'}}><ResumoRenderer texto={texto} leiPadrao={leiPadrao}/></div>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:180,background:'linear-gradient(to bottom,transparent,var(--gray))',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',padding:'0 16px 20px'}}>
              <p style={{fontSize:11,color:'var(--text-muted)',marginBottom:10,textAlign:'center'}}>Resumo completo por disciplina no <strong style={{color:'var(--gold)'}}>Tiger Pro</strong></p>
              <button className="btn-primary" style={{fontSize:12,padding:'10px 22px'}} onClick={showUpgrade}>🔒 Desbloquear resumo completo</button>
            </div>
          </div>
        )}
        {estado==='local'&&verCompleto&&<div style={{marginTop:16,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.06)',fontSize:11,color:'var(--text-dim)'}}>📌 Resumo base · Atualizado conforme novas provas são adicionadas.</div>}
      </div>
    </div>
  )
}

function LeisecaSection({ disc, onNav, canMemorizacao = false, showUpgrade }: { disc: any; onNav?: (tab: string) => void; canMemorizacao?: boolean; showUpgrade?: () => void }) {
  const leiPadrao=LEI_PADRAO_DISC[disc.slug]
  const [estado,setEstado]=useState<'loading'|'ok'|'vazio'>('loading')
  const [texto,setTexto]=useState('')
  const fetchingRef=useRef(false)
  const cacheRef=useRef<Map<string,string>>(new Map())

  useEffect(()=>{
    setEstado('loading');setTexto('')
    const cached=cacheRef.current.get(disc.slug)
    if(cached!==undefined){setTexto(cached);setEstado(cached?'ok':'vazio');return}
    if(fetchingRef.current)return
    fetchingRef.current=true
    const carregar=async()=>{
      try{
        const{data}=await supabase.from('discipline_summaries').select('resumo_memorizacao').eq('disciplina_slug',disc.slug).eq('ativo',true).maybeSingle()
        const text=data?.resumo_memorizacao||''
        cacheRef.current.set(disc.slug,text);setTexto(text);setEstado(text?'ok':'vazio')
      }catch{setEstado('vazio')}
      finally{fetchingRef.current=false}
    }
    carregar()
  },[disc.slug])

  if(estado==='loading') return(
    <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:24}}>
      {[90,70,80,60,75].map((w,i)=><div key={i} style={{height:14,borderRadius:6,marginBottom:12,background:'rgba(255,255,255,0.06)',width:`${w}%`,animation:'pulse 1.5s infinite'}}/>)}
    </div>
  )

  if(!canMemorizacao) return(
    <div style={{background:'linear-gradient(135deg,rgba(232,98,26,0.08),rgba(212,168,67,0.05))',border:'1px solid rgba(232,98,26,0.25)',borderRadius:20,padding:32,textAlign:'center'}}>
      <div style={{fontSize:44,marginBottom:14}}>📌</div>
      <h3 style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,marginBottom:8}}>Lei Seca de memorização</h3>
      <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7,maxWidth:400,margin:'0 auto 22px'}}>O resumo de memorização — artigos e lei seca para fixar rápido — é <strong style={{color:'var(--orange)'}}>exclusivo do Tiger Elite</strong>.</p>
      <button className="btn-primary" style={{fontSize:13,padding:'12px 28px'}} onClick={showUpgrade}>🔥 Conhecer o Elite</button>
    </div>
  )

  if(estado==='vazio') return(
    <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:32,textAlign:'center'}}>
      <div style={{fontSize:40,marginBottom:14}}>📌</div>
      <h3 style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,marginBottom:8,color:'var(--tj-text)'}}>Lei Seca em preparação</h3>
      <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7,maxWidth:360,margin:'0 auto 24px'}}>O resumo de memorização de <strong style={{color:'var(--gold)'}}>{disc.name}</strong> está sendo elaborado. Em breve disponível.</p>
      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
        <button className="btn-primary" style={{fontSize:12}} onClick={()=>onNav?.('quiz')}>📝 Fazer Quiz</button>
        <button className="btn-secondary" style={{fontSize:12}} onClick={()=>onNav?.('ia')}>🤖 Perguntar à IA</button>
      </div>
    </div>
  )

  return(
    <div>
      <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.05))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18}}>📌</span>
          <div>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--gold)'}}>RESUMO TIGERJUS — LEI SECA</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>Fixação rápida · Artigos e lei seca</div>
          </div>
        </div>
        <div style={{fontSize:9,fontWeight:900,letterSpacing:'1.5px',background:'rgba(232,98,26,0.12)',border:'1px solid rgba(232,98,26,0.3)',color:'var(--orange)',padding:'4px 10px',borderRadius:100}}>✓ ELITE</div>
      </div>
      <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:'24px'}}>
        <ResumoRenderer texto={texto} leiPadrao={leiPadrao}/>
      </div>
    </div>
  )
}

async function gerarPDF(disciplina: any, resumo: string, questoes: any[]) {
  const data = new Date().toLocaleDateString('pt-BR')
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>TigerJus — ${disciplina.name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#fff;color:#1a1a1a;font-size:12px;line-height:1.6}.header{background:linear-gradient(135deg,#D4A843,#E8621A);padding:28px 40px;color:#000;display:flex;align-items:center;justify-content:space-between}.logo{font-size:28px;font-weight:900;letter-spacing:3px}.container{padding:32px 40px}.section-title{font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#D4A843;border-bottom:2px solid #D4A843;padding-bottom:8px;margin:28px 0 16px}.resumo-box{background:#fafafa;border:1px solid #eee;border-left:4px solid #D4A843;border-radius:8px;padding:20px 24px;white-space:pre-wrap;font-size:12px;line-height:1.8}.questao{border:1px solid #e0e0e0;border-radius:10px;padding:18px 20px;margin-bottom:16px}.opcao{display:flex;gap:10px;padding:8px 10px;border-radius:6px;margin-bottom:4px;font-size:12px}.opcao.correta{background:#e8f5e9;border:1px solid #4caf50;color:#1b5e20;font-weight:600}.opcao.normal{background:#fafafa;border:1px solid #eee}.footer{margin-top:40px;padding:20px 40px;background:#f5f5f5;border-top:2px solid #D4A843;display:flex;justify-content:space-between;font-size:10px;color:#888}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="header"><div><div class="logo">🐯 TIGERJUS</div><div>${disciplina.icon} ${disciplina.name.toUpperCase()}</div></div><div><div>Material Premium</div><div>${data}</div></div></div><div class="container">${resumo?`<div class="section-title">📚 Resumo Essencial</div><div class="resumo-box">${resumo}</div>`:''}${questoes.length>0?`<div class="section-title">📝 Questões OAB — ${questoes.length} no total</div>${questoes.map((q:any,i:number)=>`<div class="questao"><div style="font-size:10px;color:#888;margin-bottom:6px">Questão ${i+1} · ${q.disciplina||disciplina.name}</div><div style="font-size:13px;font-weight:600;margin-bottom:12px">${q.enunciado}</div>${['A','B','C','D'].map((l,li)=>`<div class="opcao ${q.resposta_correta===l?'correta':'normal'}"><span>${l})</span><span>${[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d][li]}</span>${q.resposta_correta===l?'<span style="margin-left:auto">✅</span>':''}</div>`).join('')}${q.comentario?`<div style="margin-top:10px;padding:10px;background:#fff8e1;border-radius:6px;font-size:11px">📖 ${q.comentario}</div>`:''}</div>`).join('')}`:''}
</div><div class="footer"><div>🐯 TIGERJUS</div><div>"Não basta estudar Direito. É preciso pensar como um Tigre."</div><div>${data}</div></div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) { const a = document.createElement('a'); a.href=url; a.download=`TigerJus_${disciplina.slug}.html`; document.body.appendChild(a); a.click(); document.body.removeChild(a) }
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function DisciplinesPage({ showUpgrade, profile, isPago, canAccessPremium, podePDF, freeQ, setFreeQ, onXp }: any) {
  const discCounts = useDisciplineCounts()
  const [selected,setSelected]=useState<any>(null)
  const [subTab,setSubTab]=useState<'resumo'|'quiz'|'flash'|'pdf'|'leiseca'>('resumo')
  const [gerandoPDF,setGerandoPDF]=useState(false)
  // Se veio do Radar com uma disciplina alvo, abre direto nas questões dela.
  useEffect(()=>{ if(_radarTarget){ const alvo=_radarTarget; const aba=_radarTargetTab||'quiz'; _radarTarget=null; _radarTargetTab='quiz'; setSelected(alvo); setSubTab(aba) } },[])
  const resumoTier=getResumoTier(profile?.plano,profile?.role)
  const canMemorizacao=resumoTier==='memorizacao'

  const handlePDF=async(disc:any)=>{
    if(!podePDF){showUpgrade();return}
    setGerandoPDF(true)
    try{
      const resumo=await carregarResumoParaPDF(disc.slug)
      const discs=PDF_DISC_MAP[disc.name]||[disc.name]
      const{data}=await supabase.rpc('buscar_questoes_disciplina_pdf',{discs})
      await gerarPDF(disc,resumo,data||[])
    }finally{setGerandoPDF(false)}
  }

  const navTab=(tab:string)=>{if(tab==='ia'){return}setSubTab(tab as any)}

  if(selected) return(
    <div style={{padding:'24px 20px',flex:1}}>
      <button onClick={()=>setSelected(null)} style={{display:'flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,border:'none',background:'none',cursor:'pointer',marginBottom:20,fontFamily:'var(--font-body)'}}>← Voltar</button>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
        <span style={{fontSize:36}}>{selected.icon}</span>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,5vw,28px)',fontWeight:900}}>{selected.name}</h1>
          <p style={{fontSize:12,color:'var(--text-muted)'}}>{discCounts[selected.name] ?? '…'} questões</p>
        </div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {(['leiseca','resumo','quiz','flash','pdf'] as const).map(t=>(
          <button key={t} onClick={()=>setSubTab(t)} style={{padding:'9px 18px',borderRadius:10,border:subTab===t?'1px solid rgba(212,168,67,0.4)':'1px solid rgba(255,255,255,0.08)',background:subTab===t?'rgba(212,168,67,0.1)':'transparent',color:subTab===t?'var(--gold)':'var(--text-muted)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)'}}>
            {t==='leiseca'?'⚡ Lei Seca':t==='resumo'?'📖 Resumo':t==='quiz'?'📝 Quiz':t==='flash'?'🃏 Flashcards':podePDF?'📄 PDF':'🔒 PDF'}
          </button>
        ))}
      </div>
      {subTab==='leiseca'&&<LeisecaSection disc={selected} onNav={navTab} canMemorizacao={canMemorizacao} showUpgrade={showUpgrade}/>}
      {subTab==='resumo'&&<ResumoSection disc={selected} onNav={navTab} resumoTier={resumoTier} showUpgrade={showUpgrade}/>}
      {subTab==='quiz'&&<QuizDisciplina disciplina={selected.name} freeQ={freeQ} setFreeQ={setFreeQ} showUpgrade={showUpgrade} onXp={onXp} profile={profile}/>}
      {subTab==='flash'&&(isPago?<FlashCards disciplina={selected.name}/>:(
        <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:40,textAlign:'center'}}>
          <div style={{fontSize:44,marginBottom:14}}>🔒</div>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,marginBottom:8}}>Flashcards — Recurso Pago</h3>
          <p style={{color:'var(--text-muted)',marginBottom:24,fontSize:14}}>Os flashcards de revisão fazem parte do Tiger Start em diante.</p>
          <button className="btn-primary" onClick={showUpgrade} style={{minWidth:220,fontSize:14}}>🚀 Ver planos</button>
        </div>
      ))}
      {subTab==='pdf'&&(
        <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:40,textAlign:'center'}}>
          {podePDF?(
            <><div style={{fontSize:44,marginBottom:14}}>📄</div><h3 style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,marginBottom:8}}>PDF — {selected.name}</h3><p style={{color:'var(--text-muted)',marginBottom:24,fontSize:14}}>Resumo essencial + questões OAB reais com gabarito comentado.</p><button className="btn-primary" onClick={()=>handlePDF(selected)} disabled={gerandoPDF} style={{minWidth:220,fontSize:14}}>{gerandoPDF?'⏳ Gerando PDF...':'📄 GERAR E BAIXAR PDF'}</button></>
          ):(
            <><div style={{fontSize:44,marginBottom:14}}>🔒</div><h3 style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,marginBottom:8}}>PDF — Recurso Pago</h3><p style={{color:'var(--text-muted)',marginBottom:24,fontSize:14}}>Faça upgrade para gerar PDFs com resumos e questões OAB.</p><button className="btn-primary" onClick={showUpgrade} style={{minWidth:220,fontSize:14}}>🚀 VER PLANOS</button></>
          )}
        </div>
      )}
    </div>
  )

  return(
    <div style={{padding:'24px 20px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Disciplinas 📚</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>20 disciplinas com resumos, quizzes, flashcards e PDFs.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
        {DISCIPLINES.map(d=>(
          <div key={d.id} style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:14,padding:16,cursor:'pointer',transition:'all 0.2s'}}
            onClick={()=>setSelected(d)}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.2)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{fontSize:22,marginBottom:10}}>{d.icon}</div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:5}}>{d.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>{discCounts[d.name] ?? '…'} questões</div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{d.tags.map(t=><span key={t} style={{fontSize:9,padding:'2px 6px',background:'rgba(212,168,67,0.07)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:4,color:'var(--gold-dark)',fontWeight:600}}>{t}</span>)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const DISCIPLINA_ALIASES: Record<string, string[]> = {
  'Constitucional':['Direito Constitucional','Constitucional'],
  'Administrativo':['Direito Administrativo','Administrativo'],
  'Penal':['Direito Penal','Penal'],
  'Processo Penal':['Direito Processual Penal','Processo Penal','Processual Penal'],
  'Civil':['Direito Civil','Civil'],
  'Processo Civil':['Direito Processual Civil','Processo Civil','Processual Civil'],
  'Trabalho':['Direito do Trabalho','Trabalho','Direito Trabalhista'],
  'Proc. Trabalho':['Direito Processual do Trabalho','Processo do Trabalho','Proc. Trabalho','Processual do Trabalho'],
  'Tributário':['Direito Tributário','Tributário'],
  'Empresarial':['Direito Empresarial','Empresarial','Direito Comercial'],
  'Ética OAB':['Ética e Estatuto da OAB','Ética OAB','Ética','Estatuto da OAB','Ética Profissional'],
  'Consumidor':['Direito do Consumidor','Consumidor','CDC'],
  'Direitos Humanos':['Direitos Humanos','Direito Internacional dos Direitos Humanos'],
  'Ambiental':['Direito Ambiental','Ambiental'],
  'Filosofia':['Filosofia do Direito','Filosofia','Sociologia Jurídica'],
  'Internacional':['Direito Internacional','Direito Internacional Público','Direito Internacional Privado','Internacional'],
  'ECA':['Direito da Criança e do Adolescente','ECA','Estatuto da Criança e do Adolescente','Direito da Criança'],
  'Eleitoral':['Direito Eleitoral','Eleitoral'],
  'Financeiro':['Direito Financeiro','Financeiro'],
  'Previdenciário':['Direito Previdenciário','Previdenciário','Previdenciario'],
}
function getDisciplinaAliases(disciplina:string):string[]{return DISCIPLINA_ALIASES[disciplina]??[disciplina]}

function FlashCardsPage({ isPago, showUpgrade }: any){
  const discCounts = useDisciplineCounts()
  const [disciplinaAtiva,setDisciplinaAtiva]=useState<string|null>(null)
  if(!isPago) return(
    <div style={{padding:'24px 20px',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
      <div style={{fontSize:56,marginBottom:18}}>🃏</div>
      <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,30px)',fontWeight:900,marginBottom:12}}>Flashcards <span style={{color:'var(--gold)'}}>de revisão</span></h2>
      <p style={{fontSize:15,color:'var(--text-muted)',maxWidth:440,lineHeight:1.7,marginBottom:26}}>Revise as disciplinas com flashcards gerados das questões reais da OAB. Disponível a partir do <strong style={{color:'var(--gold)'}}>Tiger Start</strong>.</p>
      <button className="btn-primary" style={{fontSize:14,padding:'14px 32px'}} onClick={showUpgrade}>🔓 Desbloquear flashcards</button>
    </div>
  )
  if(!disciplinaAtiva) return(
    <div style={{padding:'24px 20px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Flashcards 🃏</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>Escolha uma disciplina para revisar com flashcards gerados das questões reais da OAB.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
        {DISCIPLINES.map(d=>(
          <div key={d.id} style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:14,padding:16,cursor:'pointer',transition:'all 0.2s'}}
            onClick={()=>setDisciplinaAtiva(d.name)}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.2)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{fontSize:28,marginBottom:10}}>{d.icon}</div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{d.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:10}}>{discCounts[d.name] ?? '…'} questões</div>
            <div style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'var(--gold)',fontWeight:600}}>🃏 Ver flashcards →</div>
          </div>
        ))}
      </div>
    </div>
  )
  return(
    <div style={{padding:'24px 20px',flex:1}}>
      <button onClick={()=>setDisciplinaAtiva(null)} style={{display:'flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,border:'none',background:'none',cursor:'pointer',marginBottom:20,fontFamily:'var(--font-body)'}}>← Voltar às disciplinas</button>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <span style={{fontSize:36}}>{DISCIPLINES.find(d=>d.name===disciplinaAtiva)?.icon||'🃏'}</span>
        <div><h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,5vw,28px)',fontWeight:900}}>{disciplinaAtiva}</h1><p style={{fontSize:12,color:'var(--text-muted)'}}>Flashcards gerados das questões OAB</p></div>
      </div>
      <FlashCards disciplina={disciplinaAtiva}/>
    </div>
  )
}

function QuizDisciplina({disciplina,freeQ,setFreeQ,showUpgrade,onXp,profile}:{disciplina:string;freeQ?:any;setFreeQ?:any;showUpgrade?:()=>void;onXp?:(a:string)=>void;profile?:any}){
  const [questions,setQuestions]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [erro,setErro]=useState(false)
  const [started,setStarted]=useState(false)
  const [cur,setCur]=useState(0)
  const [sel,setSel]=useState<number|null>(null)
  const [answered,setAnswered]=useState(false)
  const [score,setScore]=useState(0)
  const [done,setDone]=useState(false)
  const [time,setTime]=useState(90)
  const [checking,setChecking]=useState(false)
  const fetchingRef=useRef(false)
  const cacheRef=useRef<Map<string,any[]>>(new Map())
  const [reloadKey,setReloadKey]=useState(0)
  const [emAndamento,setEmAndamento]=useState<any>(null)
  const CHAVE_DISC='tj-quizdisc-'+(profile?.id||'anon')+'-'+disciplina

  // Existe um quiz salvo desta disciplina pra retomar?
  useEffect(()=>{
    const s=lerProgresso(CHAVE_DISC)
    if(s&&Array.isArray(s.questions)&&s.questions.length&&!s.done&&s.cur<s.questions.length)setEmAndamento(s);else setEmAndamento(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[disciplina])

  useEffect(()=>{
    setStarted(false);setDone(false);setScore(0);setCur(0);setSel(null);setAnswered(false);setErro(false)
    const cached=cacheRef.current.get(disciplina)
    if(cached){setQuestions(cached);setLoading(false);return}
    if(fetchingRef.current)return
    fetchingRef.current=true;setLoading(true)
    const carregar=async()=>{
      try{
        const discs=PDF_DISC_MAP[disciplina]||[disciplina]
        // sorteia 20 priorizando questões ainda NÃO VISTAS desta disciplina
        const ids=await sortearNaoVistas(discs,20)
        if(ids.length===0){setQuestions([]);return}
        const res=await supabase.from('questoes_publicas').select('id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d').in('id',ids)
        if(res.error){setErro(true);return}
        const data:any[]=res.data||[]
        const byId=new Map(data.map((q:any)=>[q.id,q]))
        const ordenadas=ids.map(id=>byId.get(id)).filter(Boolean)
        const formatted=ordenadas.map((q:any)=>({id:q.id,disc:q.disciplina,q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:null,exp:''}))
        cacheRef.current.set(disciplina,formatted);setQuestions(formatted)
      }catch{setErro(true)}
      finally{setLoading(false);fetchingRef.current=false}
    }
    carregar()
  },[disciplina,reloadKey])

  // Força um novo lote de questões NÃO VISTAS (usado no "NOVO QUIZ" e no retry)
  const recarregar=()=>{limparProgresso(CHAVE_DISC);setEmAndamento(null);cacheRef.current.delete(disciplina);fetchingRef.current=false;setReloadKey(k=>k+1)}

  // Salva o progresso deste quiz (por disciplina). Limpa ao concluir.
  useEffect(()=>{
    if(!started)return
    if(done||questions.length===0){limparProgresso(CHAVE_DISC);return}
    salvarProgresso(CHAVE_DISC,{disciplina,questions,cur,sel:answered?sel:null,answered,score,time,done:false})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[started,done,questions,cur,sel,answered,score,time])

  const retomar=()=>{
    const s=emAndamento;if(!s)return
    setQuestions(s.questions);setCur(s.cur||0);setSel(s.answered?(s.sel??null):null);setAnswered(!!s.answered);setScore(s.score||0);setTime(typeof s.time==='number'?s.time:90)
    setDone(false);setStarted(true);setEmAndamento(null)
  }
  const descartarProg=()=>{limparProgresso(CHAVE_DISC);setEmAndamento(null)}

  const abaOculta=useAbaOculta()
  const prazoRef=useRef<number>(0)
  const tempoRef=useRef<number>(time)
  tempoRef.current=time
  useEffect(()=>{
    if(!started||answered||done||abaOculta)return
    // Relógio de parede: o tempo restante vem da diferença de horário REAL (Date.now),
    // não da soma de "tiques". Travadas de render/scroll não "comem" segundos; ao voltar
    // de uma pausa (aba oculta) o prazo é reancorado a partir do tempo que restava.
    prazoRef.current=Date.now()+tempoRef.current*1000
    const t=setInterval(()=>{
      const restante=Math.max(0,Math.ceil((prazoRef.current-Date.now())/1000))
      setTime(restante)
      if(restante<=0){clearInterval(t);responder(null)}
    },250)
    setTime(Math.max(0,Math.ceil((prazoRef.current-Date.now())/1000)))
    return()=>clearInterval(t)
  },[started,answered,done,cur,abaOculta])

  const responder=async(i:number|null)=>{
    if(answered||checking)return
    // Cota diária vale aqui também (antes este quiz burlava o limite do plano).
    if(i!==null&&Number.isFinite(freeQ)&&freeQ<=0){showUpgrade&&showUpgrade();return}
    if(i!==null)setSel(i)
    setChecking(true)
    try{
      const{data:{session}}=await supabase.auth.getSession()
      const res=await fetch('/api/questao/validar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify({questaoId:questions[cur].id,contexto:'quiz',...(i!==null?{escolha:i}:{})})})
      if(res.status===403){setFreeQ&&setFreeQ(0);setSel(null);setChecking(false);showUpgrade&&showUpgrade();return}
      const data=await res.json()
      if(res.ok){
        const correctIdx=['A','B','C','D'].indexOf(data.letra_correta)
        setQuestions(prev=>prev.map((qq,idx)=>idx===cur?{...qq,correct:correctIdx,exp:data.comentario||''}:qq))
        setAnswered(true)
        if(i!==null){
          setFreeQ&&setFreeQ((p:number)=>p-1)
          if(data.correto){setScore(p=>p+1);onXp&&onXp('question_correct')}else onXp&&onXp('question_wrong')
          // Trilhas: grava CADA resposta na hora (não bloqueia o quiz)
          ;(async()=>{
            try{
              const{data:{user}}=await supabase.auth.getUser()
              if(user)await supabase.from('quiz_resultados').insert({user_id:user.id,disciplina,acertos:data.correto?1:0,total:1})
            }catch{/* silencioso */}
          })()
        }
      }else if(i!==null){setSel(null)}
      else setAnswered(true)
    }catch{
      if(i!==null)setSel(null)
      else setAnswered(true)
    }finally{setChecking(false)}
  }
  const pick=(i:number)=>{ responder(i) }
  const next=()=>{if(cur+1>=questions.length){setDone(true);onXp&&onXp('quiz_complete');return}setCur(p=>p+1);setSel(null);setAnswered(false);setTime(90)}

  if(loading) return(<div style={{padding:'40px 0',textAlign:'center'}}><div style={{fontSize:36,marginBottom:12}}>⏳</div><div style={{fontSize:13,color:'var(--text-muted)'}}>Carregando questões de <strong style={{color:'var(--gold)'}}>{disciplina}</strong>...</div></div>)
  if(erro) return(<div style={{padding:'40px 0',textAlign:'center'}}><div style={{fontSize:36,marginBottom:12}}>⚠️</div><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Não foi possível carregar.</div><button className="btn-secondary" style={{fontSize:12}} onClick={recarregar}>🔄 Tentar novamente</button></div>)
  if(questions.length===0) return(<div style={{padding:'40px 0',textAlign:'center'}}><div style={{fontSize:40,marginBottom:12}}>📝</div><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Nenhuma questão disponível</div><div style={{fontSize:12,color:'var(--text-muted)'}}>As questões de <strong style={{color:'var(--gold)'}}>{disciplina}</strong> estão sendo preparadas.</div></div>)

  if(!started) return(
    <div style={{maxWidth:560}}>
      <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:24}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>📝 QUIZ — {disciplina.toUpperCase()}</div>
        <div style={{fontSize:28,fontWeight:900,fontFamily:'var(--font-display)',marginBottom:8}}>{questions.length} questões</div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:24,lineHeight:1.6}}>Questões reais da OAB de <strong style={{color:'var(--gold)'}}>{disciplina}</strong>. 90 segundos por questão.</div>
        {Number.isFinite(freeQ)&&<div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--gold)'}}>⚡ <strong>{freeQ} questões restantes hoje</strong></div>}
        {emAndamento&&<div style={{background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.4)',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:800,color:'var(--gold)',marginBottom:4}}>⏸️ Quiz em andamento</div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>Você parou na questão {(emAndamento.cur||0)+1} de {emAndamento.questions.length}.</div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn-primary" style={{flex:1,fontSize:13,padding:12}} onClick={retomar}>▶️ Continuar</button>
            <button className="btn-secondary" style={{flex:1,fontSize:13,padding:12}} onClick={descartarProg}>Descartar</button>
          </div>
        </div>}
        <button className="btn-primary" style={{width:'100%',fontSize:14,padding:14}} onClick={()=>{setStarted(true);setTime(90)}}>INICIAR QUIZ →</button>
      </div>
    </div>
  )

  if(done){
    const rate=Math.round((score/questions.length)*100);const aprovado=score>=Math.ceil(questions.length*0.5)
    return(<div style={{maxWidth:560,textAlign:'center'}}><div style={{fontSize:54,marginBottom:16}}>{aprovado?'🏆':rate>=50?'📝':'💪'}</div><h2 style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:900,marginBottom:8}}>Quiz Concluído!</h2><p style={{fontSize:13,color:'var(--text-muted)',marginBottom:20}}>{score} de {questions.length} corretas · {disciplina}</p><div style={{background:aprovado?'rgba(76,175,125,0.1)':'rgba(232,98,26,0.1)',border:`1px solid ${aprovado?'var(--success)':'var(--orange)'}`,borderRadius:14,padding:16,marginBottom:20}}><div style={{fontSize:16,fontWeight:900,color:aprovado?'var(--success)':'var(--orange)',marginBottom:4}}>{aprovado?'✅ Na média OAB!':'❌ Abaixo da média OAB'}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{aprovado?`${rate}% de acerto.`:`Precisava de ${Math.ceil(questions.length*0.5)} acertos.`}</div></div><button className="btn-primary" style={{width:'100%'}} onClick={recarregar}>🔄 NOVO QUIZ</button></div>)
  }

  const q=questions[cur];const pct=Math.round(((cur+(answered?1:0))/questions.length)*100)
  return(
    <div style={{maxWidth:680}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><div style={{fontSize:12,color:'var(--text-muted)'}}>Q{cur+1}/{questions.length} · {disciplina}</div><div style={{fontFamily:'var(--font-mono)',fontSize:16,fontWeight:700,color:time<20?'var(--danger)':'var(--gold)'}}>{String(Math.floor(time/60)).padStart(2,'0')}:{String(time%60).padStart(2,'0')}</div></div>
      <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:20,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}}/></div>
      <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:'22px'}}>
        <div style={{display:'flex',gap:8,marginBottom:14}}><span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)'}}>{q.disc}</span><span style={{fontSize:10,color:'var(--text-muted)'}}>· OAB Oficial</span></div>
        <div style={{fontSize:'clamp(14px,3vw,17px)',fontWeight:600,lineHeight:1.7,marginBottom:20}}>{q.q}</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {q.opts.map((opt:string,i:number)=>{
            let bg='rgba(255,255,255,0.03)',bc='rgba(255,255,255,0.08)',color='var(--tj-text)'
            if(checking&&i===sel){bg='rgba(212,168,67,0.08)';bc='rgba(212,168,67,0.6)';color='var(--gold)'}
            if(answered){if(i===q.correct){bg='rgba(76,175,125,0.1)';bc='var(--success)';color='var(--success)'}else if(i===sel){bg='rgba(232,66,26,0.1)';bc='var(--danger)';color='var(--danger)'}}
            return(<button key={i} onClick={()=>pick(i)} style={{display:'flex',alignItems:'flex-start',gap:12,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'12px 14px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:'clamp(13px,2.5vw,14px)',color}}><span style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,background:'rgba(255,255,255,0.06)',color:'var(--tj-text)'}}>{String.fromCharCode(65+i)}</span><span style={{flex:1}}>{opt}</span></button>)
          })}
        </div>
        {answered&&q.exp&&<div style={{marginTop:18,padding:14,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:13,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> <ComentarioComLei texto={q.exp}/></div>}
        {answered&&<button className="btn-primary" style={{width:'100%',marginTop:16}} onClick={next}>{cur+1>=questions.length?'VER RESULTADO':'PRÓXIMA →'}</button>}
      </div>
    </div>
  )
}

function RadarTop20({ onBack, podePDF, freeQ, setFreeQ, showUpgrade, onXp }: { onBack: () => void; podePDF?: boolean; freeQ?: any; setFreeQ?: any; showUpgrade?: () => void; onXp?: (a:string)=>void }) {
  const discCounts = useDisciplineCounts()
  const [questions,setQuestions]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [erro,setErro]=useState(false)
  const [started,setStarted]=useState(false)
  const [cur,setCur]=useState(0)
  const [sel,setSel]=useState<number|null>(null)
  const [answered,setAnswered]=useState(false)
  const [score,setScore]=useState(0)
  const [done,setDone]=useState(false)
  const [time,setTime]=useState(90)
  const [checking,setChecking]=useState(false)
  const [pdfLoad,setPdfLoad]=useState(false)
  const fetchingRef=useRef(false)
  const [emAndamento,setEmAndamento]=useState<any>(null)
  const CHAVE_RADAR='tj-radar-progress'
  useEffect(()=>{
    const s=lerProgresso(CHAVE_RADAR)
    if(s&&Array.isArray(s.questions)&&s.questions.length&&!s.done&&s.cur<s.questions.length)setEmAndamento(s)
  },[])

  useEffect(()=>{
    if(Object.keys(discCounts).length===0)return
    if(fetchingRef.current)return
    fetchingRef.current=true;setLoading(true)
    const carregar=async()=>{
      try{
        const N=40
        const entries=DISCIPLINES.map(d=>({d,n:discCounts[d.name]||0})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n)
        const total=entries.reduce((s,x)=>s+x.n,0)||1
        const alloc:any[]=entries.map(x=>({d:x.d,n:x.n,raw:N*x.n/total,base:0}))
        alloc.forEach((a:any)=>{a.base=Math.floor(a.raw)})
        let rem=N-alloc.reduce((s:number,a:any)=>s+a.base,0)
        alloc.sort((a:any,b:any)=>(b.raw-b.base)-(a.raw-a.base))
        for(let i=0;i<alloc.length&&rem>0;i++){alloc[i].base++;rem--}
        const allDiscs:string[]=[]
        for(const a of alloc){if(a.base>0)for(const v of (PDF_DISC_MAP[a.d.name]||[a.d.name]))allDiscs.push(v)}
        const questoesRadar=await fetchQuestoesCompletas(allDiscs)
        if(questoesRadar.length===0){setErro(true);return}
        const rev:Record<string,string>={}
        for(const [card,vals] of Object.entries(PDF_DISC_MAP))for(const v of vals)rev[v]=card
        const buckets:Record<string,any[]>={}
        for(const q of questoesRadar){const card=rev[q.disciplina]||q.disciplina;(buckets[card]=buckets[card]||[]).push(q)}
        const picked:any[]=[]
        for(const a of alloc){if(a.base<=0)continue;const pool=embaralhar(buckets[a.d.name]||[]).slice(0,a.base);const dom=Math.round(1000*a.n/total)/10;for(const q of pool)picked.push({...q,_card:a.d.name,_icon:a.d.icon,_dom:dom})}
        const mix=embaralhar(picked)
        const formatted=mix.map((q:any)=>({id:q.id,disc:q._card,icon:q._icon,dom:q._dom,q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:null,exp:''}))
        setQuestions(formatted)
      }catch{setErro(true)}
      finally{setLoading(false);fetchingRef.current=false}
    }
    carregar()
  },[discCounts])

  const abaOculta=useAbaOculta()
  const prazoRef=useRef<number>(0)
  const tempoRef=useRef<number>(time)
  tempoRef.current=time
  useEffect(()=>{
    if(!started||answered||done||abaOculta)return
    // Relógio de parede: o tempo restante vem da diferença de horário REAL (Date.now),
    // não da soma de "tiques". Travadas de render/scroll não "comem" segundos; ao voltar
    // de uma pausa (aba oculta) o prazo é reancorado a partir do tempo que restava.
    prazoRef.current=Date.now()+tempoRef.current*1000
    const t=setInterval(()=>{
      const restante=Math.max(0,Math.ceil((prazoRef.current-Date.now())/1000))
      setTime(restante)
      if(restante<=0){clearInterval(t);responder(null)}
    },250)
    setTime(Math.max(0,Math.ceil((prazoRef.current-Date.now())/1000)))
    return()=>clearInterval(t)
  },[started,answered,done,cur,abaOculta])

  const responder=async(i:number|null)=>{
    if(answered||checking)return
    if(i!==null&&Number.isFinite(freeQ)&&freeQ<=0){showUpgrade&&showUpgrade();return}
    if(i!==null)setSel(i)
    setChecking(true)
    try{
      const{data:{session}}=await supabase.auth.getSession()
      const res=await fetch('/api/questao/validar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify({questaoId:questions[cur].id,contexto:'quiz',...(i!==null?{escolha:i}:{})})})
      if(res.status===403){setFreeQ&&setFreeQ(0);setSel(null);setChecking(false);showUpgrade&&showUpgrade();return}
      const data=await res.json()
      if(res.ok){
        const correctIdx=['A','B','C','D'].indexOf(data.letra_correta)
        setQuestions(prev=>prev.map((qq,idx)=>idx===cur?{...qq,correct:correctIdx,exp:data.comentario||''}:qq))
        setAnswered(true)
        if(i!==null){
          setFreeQ&&setFreeQ((p:number)=>p-1)
          if(data.correto){setScore(p=>p+1);onXp&&onXp('question_correct')}else onXp&&onXp('question_wrong')
          ;(async()=>{try{const{data:{user}}=await supabase.auth.getUser();if(user)await supabase.from('quiz_resultados').insert({user_id:user.id,disciplina:questions[cur].disc,acertos:data.correto?1:0,total:1})}catch{/* silencioso */}})()
        }
      }else if(i!==null){setSel(null)}
      else setAnswered(true)
    }catch{
      if(i!==null)setSel(null)
      else setAnswered(true)
    }finally{setChecking(false)}
  }
  const pick=(i:number)=>{responder(i)}
  const next=()=>{if(cur+1>=questions.length){setDone(true);onXp&&onXp('quiz_complete');return}setCur(p=>p+1);setSel(null);setAnswered(false);setTime(90)}

  // Salva o progresso do treino do Radar. Limpa ao concluir.
  useEffect(()=>{
    if(!started)return
    if(done||questions.length===0){limparProgresso(CHAVE_RADAR);return}
    salvarProgresso(CHAVE_RADAR,{questions,cur,sel:answered?sel:null,answered,score,time,done:false})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[started,done,questions,cur,sel,answered,score,time])
  const retomarRadar=()=>{
    const s=emAndamento;if(!s)return
    setQuestions(s.questions);setCur(s.cur||0);setSel(s.answered?(s.sel??null):null);setAnswered(!!s.answered);setScore(s.score||0);setTime(typeof s.time==='number'?s.time:90)
    setDone(false);setStarted(true);setEmAndamento(null)
  }
  const descartarRadar=()=>{limparProgresso(CHAVE_RADAR);setEmAndamento(null)}

  const baixarPDFTop=async()=>{
    if(pdfLoad||questions.length===0)return
    setPdfLoad(true)
    try{
      const discsSet=new Set<string>()
      for(const q of questions){for(const v of (PDF_DISC_MAP[q.disc]||[q.disc]))discsSet.add(v)}
      const{data}=await supabase.rpc('buscar_questoes_disciplina_pdf',{discs:Array.from(discsSet)})
      const full:any[]=data||[]
      const ordenadas=questions.map(q=>full.find((r:any)=>r.enunciado===q.q)).filter(Boolean)
      await gerarPDF({name:'Top 40 do Radar — Questões de maior dominância',icon:'🎯'},'',ordenadas)
    }finally{setPdfLoad(false)}
  }

  const Voltar=()=>(<button onClick={onBack} style={{display:'flex',alignItems:'center',gap:6,color:'var(--text-muted)',fontSize:13,border:'none',background:'none',cursor:'pointer',marginBottom:16,fontFamily:'var(--font-body)'}}>← Voltar ao Radar</button>)

  if(loading) return(<div><Voltar/><div style={{padding:'40px 0',textAlign:'center'}}><div style={{fontSize:36,marginBottom:12}}>⏳</div><div style={{fontSize:13,color:'var(--text-muted)'}}>Montando as <strong style={{color:'var(--gold)'}}>40 questões de maior dominância</strong>...</div></div></div>)
  if(erro) return(<div><Voltar/><div style={{padding:'40px 0',textAlign:'center'}}><div style={{fontSize:36,marginBottom:12}}>⚠️</div><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Não foi possível carregar.</div><button className="btn-secondary" style={{fontSize:12}} onClick={()=>{fetchingRef.current=false;setErro(false);setLoading(true)}}>🔄 Tentar novamente</button></div></div>)
  if(questions.length===0) return(<div><Voltar/><div style={{padding:'40px 0',textAlign:'center'}}><div style={{fontSize:40,marginBottom:12}}>📝</div><div style={{fontSize:14,fontWeight:700}}>Nenhuma questão disponível ainda.</div></div></div>)

  if(!started) return(
    <div style={{maxWidth:560}}>
      <Voltar/>
      <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:20,padding:24}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>🎯 TOP 40 DO RADAR</div>
        <div style={{fontSize:'clamp(22px,5vw,28px)',fontWeight:900,fontFamily:'var(--font-display)',marginBottom:8}}>{questions.length} questões de maior rendimento</div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:24,lineHeight:1.6}}>Questões reais da OAB, concentradas nas matérias que mais <strong style={{color:'var(--gold)'}}>dominam</strong> o exame. 90 segundos por questão.</div>
        {emAndamento&&<div style={{background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.4)',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:800,color:'var(--gold)',marginBottom:4}}>⏸️ Treino em andamento</div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>Você parou na questão {(emAndamento.cur||0)+1} de {emAndamento.questions.length}.</div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn-primary" style={{flex:1,fontSize:13,padding:12}} onClick={retomarRadar}>▶️ Continuar</button>
            <button className="btn-secondary" style={{flex:1,fontSize:13,padding:12}} onClick={descartarRadar}>Descartar</button>
          </div>
        </div>}
        <button className="btn-primary" style={{width:'100%',fontSize:14,padding:14}} onClick={()=>{setStarted(true);setTime(90)}}>INICIAR TREINO →</button>
        {podePDF && <button onClick={baixarPDFTop} disabled={pdfLoad} style={{width:'100%',marginTop:10,padding:12,borderRadius:12,border:'1px solid rgba(212,168,67,0.4)',background:'transparent',color:'var(--gold)',fontSize:13,fontWeight:700,cursor:pdfLoad?'wait':'pointer',fontFamily:'var(--font-body)'}}>{pdfLoad?'⏳ Gerando PDF…':'📄 Baixar as 40 em PDF'}</button>}
      </div>
    </div>
  )

  if(done){
    const rate=Math.round((score/questions.length)*100);const aprovado=score>=Math.ceil(questions.length*0.5)
    return(<div style={{maxWidth:560,textAlign:'center'}}><Voltar/><div style={{fontSize:54,marginBottom:16}}>{aprovado?'🏆':rate>=50?'📝':'💪'}</div><h2 style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:900,marginBottom:8}}>Treino Concluído!</h2><p style={{fontSize:13,color:'var(--text-muted)',marginBottom:20}}>{score} de {questions.length} corretas · Top 40 do Radar</p><div style={{background:aprovado?'rgba(76,175,125,0.1)':'rgba(232,98,26,0.1)',border:`1px solid ${aprovado?'var(--success)':'var(--orange)'}`,borderRadius:14,padding:16,marginBottom:20}}><div style={{fontSize:16,fontWeight:900,color:aprovado?'var(--success)':'var(--orange)',marginBottom:4}}>{aprovado?'✅ Na média OAB!':'❌ Abaixo da média OAB'}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{aprovado?`${rate}% de acerto.`:`Precisava de ${Math.ceil(questions.length*0.5)} acertos.`}</div></div><button className="btn-primary" style={{width:'100%'}} onClick={()=>{fetchingRef.current=false;setStarted(false);setDone(false);setScore(0);setCur(0);setSel(null);setAnswered(false);setLoading(true)}}>🔄 NOVO TREINO</button>{podePDF && <button onClick={baixarPDFTop} disabled={pdfLoad} style={{width:'100%',marginTop:10,padding:12,borderRadius:12,border:'1px solid rgba(212,168,67,0.4)',background:'transparent',color:'var(--gold)',fontSize:13,fontWeight:700,cursor:pdfLoad?'wait':'pointer',fontFamily:'var(--font-body)'}}>{pdfLoad?'⏳ Gerando PDF…':'📄 Baixar as 40 em PDF'}</button>}</div>)
  }

  const q=questions[cur];const pct=Math.round(((cur+(answered?1:0))/questions.length)*100)
  return(
    <div style={{maxWidth:680}}>
      <Voltar/>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><div style={{fontSize:12,color:'var(--text-muted)'}}>Q{cur+1}/{questions.length} · Top 40 do Radar</div><div style={{fontFamily:'var(--font-mono)',fontSize:16,fontWeight:700,color:time<20?'var(--danger)':'var(--gold)'}}>{String(Math.floor(time/60)).padStart(2,'0')}:{String(time%60).padStart(2,'0')}</div></div>
      <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:20,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}}/></div>
      <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:'22px'}}>
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}><span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)'}}>{q.icon} {q.disc}</span><span style={{fontSize:10,padding:'2px 8px',background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:100,color:'var(--gold)',fontWeight:700}}>{q.dom}% dominância</span></div>
        <div style={{fontSize:'clamp(14px,3vw,17px)',fontWeight:600,lineHeight:1.7,marginBottom:20}}>{q.q}</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {q.opts.map((opt:string,i:number)=>{
            let bg='rgba(255,255,255,0.03)',bc='rgba(255,255,255,0.08)',color='var(--tj-text)'
            if(checking&&i===sel){bg='rgba(212,168,67,0.08)';bc='rgba(212,168,67,0.6)';color='var(--gold)'}
            if(answered){if(i===q.correct){bg='rgba(76,175,125,0.1)';bc='var(--success)';color='var(--success)'}else if(i===sel){bg='rgba(232,66,26,0.1)';bc='var(--danger)';color='var(--danger)'}}
            return(<button key={i} onClick={()=>pick(i)} style={{display:'flex',alignItems:'flex-start',gap:12,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'12px 14px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:'clamp(13px,2.5vw,14px)',color}}><span style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,background:'rgba(255,255,255,0.06)',color:'var(--tj-text)'}}>{String.fromCharCode(65+i)}</span><span style={{flex:1}}>{opt}</span></button>)
          })}
        </div>
        {answered&&q.exp&&<div style={{marginTop:18,padding:14,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:13,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> <ComentarioComLei texto={q.exp}/></div>}
        {answered&&<button className="btn-primary" style={{width:'100%',marginTop:16}} onClick={next}>{cur+1>=questions.length?'VER RESULTADO':'PRÓXIMA →'}</button>}
      </div>
    </div>
  )
}

function FlashCards({disciplina}:{disciplina:string}){
  const [cards,setCards]=useState<{id:string;frente:string;verso:string}[]>([])
  const [loading,setLoading]=useState(true)
  const [erro,setErro]=useState(false)
  const [idx,setIdx]=useState(0)
  const [flipped,setFlipped]=useState(false)
  const fetchingRef=useRef(false)
  const cacheRef=useRef<Map<string,{id:string;frente:string;verso:string}[]>>(new Map())

  useEffect(()=>{
    setIdx(0);setFlipped(false);setErro(false)
    const cached=cacheRef.current.get(disciplina)
    if(cached){setCards(cached);setLoading(false);return}
    if(fetchingRef.current)return
    fetchingRef.current=true;setLoading(true)
    const carregar=async()=>{
      try{
        const discs=PDF_DISC_MAP[disciplina]||[disciplina]
        // Carrega TODOS os flashcards da disciplina (pagina pra driblar o teto
        // de 1.000 do PostgREST). Nada de .limit(50) — antes ficava sempre nos
        // 50 primeiros e o resto do baralho nunca aparecia.
        const todos:any[]=[]
        const passo=1000
        for(let inicio=0;;inicio+=passo){
          const res=await supabase.from('flashcards').select('id,frente,verso').in('disciplina',discs).eq('ativo',true).order('created_at',{ascending:true}).range(inicio,inicio+passo-1)
          if(res.error){setErro(true);return}
          const bloco:any[]=res.data||[]
          todos.push(...bloco)
          if(bloco.length<passo)break
        }
        // Embaralha (Fisher-Yates): cada sessão vem numa ordem, cobrindo o baralho inteiro.
        const resultado=embaralhar(todos).map((c:any)=>({id:c.id,frente:c.frente,verso:c.verso}))
        cacheRef.current.set(disciplina,resultado);setCards(resultado)
      }catch{setErro(true)}
      finally{setLoading(false);fetchingRef.current=false}
    }
    carregar()
  },[disciplina])

  if(loading) return(<div style={{maxWidth:560,padding:'40px 0',textAlign:'center'}}><div style={{fontSize:36,marginBottom:12}}>⏳</div><div style={{fontSize:13,color:'var(--text-muted)'}}>Carregando flashcards de <strong style={{color:'var(--gold)'}}>{disciplina}</strong>...</div></div>)
  if(erro) return(<div style={{maxWidth:560,padding:'40px 0',textAlign:'center'}}><div style={{fontSize:36,marginBottom:12}}>⚠️</div><div style={{fontSize:14,fontWeight:700,marginBottom:8,color:'var(--tj-text)'}}>Não foi possível carregar.</div><button className="btn-secondary" style={{fontSize:12}} onClick={()=>{cacheRef.current.delete(disciplina);fetchingRef.current=false;setErro(false);setLoading(true)}}>🔄 Tentar novamente</button></div>)
  if(cards.length===0) return(<div style={{maxWidth:560,padding:'40px 0',textAlign:'center'}}><div style={{fontSize:40,marginBottom:12}}>🃏</div><div style={{fontSize:14,fontWeight:700,marginBottom:8,color:'var(--tj-text)'}}>Nenhum flashcard disponível</div><div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>Os flashcards de <strong style={{color:'var(--gold)'}}>{disciplina}</strong> estão sendo preparados.</div></div>)

  const card=cards[idx]
  return(
    <div style={{maxWidth:580}}>
      <div style={{marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{fontSize:13,color:'var(--text-muted)'}}>Card {idx+1} de {cards.length} · <span style={{color:'var(--gold)'}}>{disciplina}</span></div><div style={{fontSize:11,color:'var(--text-muted)'}}>{flipped?'👁️ Resposta':'❓ Pergunta'}</div></div>
      <div style={{perspective:1000,marginBottom:20,cursor:'pointer'}} onClick={()=>setFlipped(f=>!f)}>
        <div style={{position:'relative',transformStyle:'preserve-3d',transition:'transform 0.6s',transform:flipped?'rotateY(180deg)':'rotateY(0)'}}>
          <div style={{backfaceVisibility:'hidden',background:'var(--gray)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:'24px 24px 20px',minHeight:180,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>PERGUNTA</div>
            <div style={{fontSize:14,fontWeight:600,lineHeight:1.7,color:'var(--tj-text)',whiteSpace:'pre-wrap',wordBreak:'break-word',overflowWrap:'anywhere',maxHeight:280,overflowY:'auto',width:'100%'}}>{card.frente}</div>
            <div style={{marginTop:14,fontSize:11,color:'var(--text-muted)',flexShrink:0}}>Toque para ver a resposta</div>
          </div>
          <div style={{position:'absolute',top:0,left:0,right:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)',background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.3)',borderRadius:20,padding:'24px 24px 20px',minHeight:180,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>RESPOSTA</div>
            <div style={{fontSize:13,lineHeight:1.8,color:'var(--text-muted)',whiteSpace:'pre-wrap',wordBreak:'break-word',overflowWrap:'anywhere',maxHeight:300,overflowY:'auto',width:'100%'}}><ComentarioComLei texto={card.verso}/></div>
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
        <button className="btn-secondary" onClick={()=>{setIdx(i=>Math.max(0,i-1));setFlipped(false)}} disabled={idx===0}>← Anterior</button>
        <button className="btn-secondary" onClick={()=>setFlipped(f=>!f)}>Virar</button>
        <button className="btn-primary" onClick={()=>{setIdx(i=>Math.min(cards.length-1,i+1));setFlipped(false)}} disabled={idx===cards.length-1}>Próximo →</button>
      </div>
    </div>
  )
}

function SimuladosPage({ showUpgrade, freeQ, setFreeQ, onXp, profile, isPago, canAccessElite, intentMini, onConsumeIntent }: any) {
  const [running,setRunning]=useState(false)
  const [cur,setCur]=useState(0)
  const [sel,setSel]=useState<number|null>(null)
  const [answered,setAnswered]=useState(false)
  const [score,setScore]=useState(0)
  const [done,setDone]=useState(false)
  const [time,setTime]=useState(18000)
  const [checking,setChecking]=useState(false)
  const [selectedSimulado,setSelectedSimulado]=useState<any>(null)
  const [provasOAB,setProvasOAB]=useState<any[]>([])
  const [loadingProva,setLoadingProva]=useState(false)
  const [tab,setTab]=useState<'oficiais'|'pratica'>('oficiais')
  const [savedMap,setSavedMap]=useState<any>({})
  const [tematicaDisc,setTematicaDisc]=useState('')
  const [bestMap,setBestMap]=useState<any>({})
  const abaOculta=useAbaOculta()
  const BEST_KEY='tj_simulado_best:'+(profile?.id||'anon')
  const PROG_KEY='tj_simulados_progresso:'+(profile?.id||'anon')
  const progKey=(sim:any)=>sim?.oficial?`oficial:${sim.id}`:`pratica:${sim.t}`
  const readMap=()=>{try{if(typeof window==='undefined')return {};const raw=localStorage.getItem(PROG_KEY);return raw?(JSON.parse(raw)||{}):{}}catch{return {}}}
  const writeMap=(m:any)=>{try{if(typeof window!=='undefined')localStorage.setItem(PROG_KEY,JSON.stringify(m))}catch{}}

  function planoMinimoParaSimulado(numeroExame:number):Plano{return planoMinimoExame(numeroExame)} // graduais: Start 35-40 · Pro 35-44 · Elite 35-46
  const BADGE_COR:Record<string,{bg:string;color:string;label:string}>={start:{bg:'rgba(59,130,246,0.15)',color:'#60a5fa',label:'START'},pro:{bg:'rgba(236,72,153,0.15)',color:'#f472b6',label:'PRO'},elite:{bg:'rgba(212,168,67,0.12)',color:'var(--gold)',label:'ELITE'}}
  function podeLiberarProva(prova:any):boolean{if(profile?.role==='admin')return true;return canAccess(profile?.plano,planoMinimoParaSimulado(prova.numero_exame))}

  const SIMULADOS_PRATICA=[
    {icon:'⚡',t:'Mini Simulado Rápido',info:'questões aleatórias · 15min · aquecimento',tags:['Grátis'],dif:'Fácil',mins:15,lock:false},
  ]

  function podeLiberarPratica(s:any):boolean{
    if(profile?.role==='admin')return true;if(!s.lock)return true
    const tag=(s.tags&&s.tags[0]?String(s.tags[0]):'').toLowerCase()
    const plano:any=tag==='start'?'start':tag==='plus'?'plus':tag==='pro'?'pro':tag==='elite'?'elite':'start'
    return canAccess(profile?.plano,plano)
  }

  useEffect(()=>{(async()=>{const{data}=await supabase.from('provas_oab').select('*').eq('status','ativo').order('numero_exame',{ascending:false});if(data)setProvasOAB(data)})()},[])

  const iniciarProvaOficial=async(prova:any)=>{
    if(!podeLiberarProva(prova)){showUpgrade();return}
    setLoadingProva(true)
    const{data}=await supabase.from('questoes_publicas').select('id,disciplina,enunciado,opcao_a,opcao_b,opcao_c,opcao_d,numero_questao').eq('prova_id',prova.id).order('numero_questao')
    if(data&&data.length>0){
      const q=data.map((q:any)=>({id:q.id,disc:q.disciplina,dificuldade:'OAB Oficial',q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:null,exp:''}))
      setSelectedSimulado({...prova,questions:q,oficial:true});setRunning(true);setCur(0);setSel(null);setAnswered(false);setScore(0);setDone(false);setTime(18000)
    }
    setLoadingProva(false)
  }

  // ── SIMULADÃO TIGER (Elite) — montagem 100% no servidor via RPC ────────────
  const iniciarSimuladao=async()=>{
    if(!(profile?.role==='admin'||canAccess(profile?.plano,'elite'))){showUpgrade();return}
    setLoadingProva(true)
    try{
      const{data,error}=await supabase.rpc('montar_simuladao')
      if(error||!data||(data as any[]).length===0){alert('Não foi possível montar o Simuladão agora. Verifique se a classificação de temas (coluna tema) já foi aplicada no banco.');return}
      const formatted=(data as any[]).map((q:any)=>({id:q.id,disc:q.disciplina,dificuldade:'OAB Oficial',q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:null,exp:''}))
      setSelectedSimulado({t:'Simuladão Tiger',edicao:'Simuladão Tiger',questions:formatted,simuladao:true,mins:300})
      setRunning(true);setCur(0);setSel(null);setAnswered(false);setScore(0);setDone(false);setTime(18000)
    }finally{setLoadingProva(false)}
  }

  const iniciarSimuladoPratica=async(s:any)=>{
    if(!podeLiberarPratica(s)){showUpgrade();return}
    setLoadingProva(true)
    const miniQtd=getLimites(profile?.plano).mini_simulado
    const qtd = s.t.includes('Mini') ? miniQtd : (s.t.includes('Geral') ? 80 : 20)
    const mins = s.mins || 30
    const data=await fetchQuestoesCompletas(null)
    if(!data||data.length===0){setLoadingProva(false);alert('Ainda não há questões suficientes para este simulado. Experimente o Mini Simulado Rápido!');return}
    let shuffled:any[]
    if(s.t.includes('Geral')){
      // Fiel ao dia da prova: distribui as 80 proporcional à participação real de cada
      // disciplina no banco (as questões vêm de provas OAB reais, exames 35–46).
      const porDisc:Record<string,any[]>={}
      for(const q of data){(porDisc[q.disciplina]=porDisc[q.disciplina]||[]).push(q)}
      const alloc=Object.keys(porDisc).map(d=>{const exato=qtd*porDisc[d].length/data.length;const base=Math.floor(exato);return{d,base,resto:exato-base}})
      let soma=alloc.reduce((a,x)=>a+x.base,0)
      alloc.sort((a,b)=>b.resto-a.resto)
      for(let i=0;soma<qtd&&i<alloc.length;i++){alloc[i].base++;soma++}
      let escolhidas:any[]=[]
      for(const a of alloc){escolhidas=escolhidas.concat(embaralhar(porDisc[a.d]).slice(0,a.base))}
      if(escolhidas.length<qtd){const ids=new Set(escolhidas.map(x=>x.id));escolhidas=escolhidas.concat(embaralhar(data.filter((q:any)=>!ids.has(q.id))).slice(0,qtd-escolhidas.length))}
      shuffled=embaralhar(escolhidas)
    }else{
      shuffled=embaralhar(data).slice(0,qtd)
    }
    const formatted=shuffled.map((q:any)=>({id:q.id,disc:q.disciplina,dificuldade:'OAB Oficial',q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:null,exp:''}))
    setSelectedSimulado({...s,questions:formatted});setRunning(true);setCur(0);setSel(null);setAnswered(false);setScore(0);setDone(false);setTime(mins*60)
    setLoadingProva(false)
  }

  const iniciarTematico=async(disc:string)=>{
    if(!disc)return
    if(!isPago&&profile?.role!=='admin'){showUpgrade();return}
    setLoadingProva(true)
    const data=await fetchQuestoesCompletas(PDF_DISC_MAP[disc]||[disc])
    if(!data||data.length===0){setLoadingProva(false);alert('Ainda não há questões suficientes de '+disc+' para um temático. Tente outra disciplina.');return}
    const shuffled=embaralhar(data).slice(0,20)
    const formatted=shuffled.map((q:any)=>({id:q.id,disc:q.disciplina,dificuldade:'OAB Oficial',q:q.enunciado,opts:[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d],correct:null,exp:''}))
    const sim={icon:'🎯',t:'Temático — '+disc,info:'20 questões · 30min',tags:['Start'],dif:'Médio',mins:30}
    setSelectedSimulado({...sim,questions:formatted});setRunning(true);setCur(0);setSel(null);setAnswered(false);setScore(0);setDone(false);setTime(1800)
    setLoadingProva(false)
  }

  useEffect(()=>{
    if(intentMini){
      const mini=SIMULADOS_PRATICA.find(s=>s.t.includes('Mini'))
      setTab('pratica')
      if(mini)iniciarSimuladoPratica(mini)
      onConsumeIntent&&onConsumeIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  // Pausa o cronômetro quando o usuário sai da aba (hook compartilhado — mesma regra em todos os cronômetros)
  const prazoRef=useRef<number>(0)
  const tempoRef=useRef<number>(time)
  tempoRef.current=time
  useEffect(()=>{
    if(!running||done||abaOculta)return
    // Relógio de parede: o tempo restante vem da diferença de horário REAL (Date.now),
    // não da soma de "tiques". Travadas de render/scroll não "comem" segundos; ao voltar
    // de uma pausa (aba oculta) o prazo é reancorado a partir do tempo que restava.
    prazoRef.current=Date.now()+tempoRef.current*1000
    const t=setInterval(()=>{
      const restante=Math.max(0,Math.ceil((prazoRef.current-Date.now())/1000))
      setTime(restante)
      if(restante<=0){clearInterval(t);setDone(true)}
    },250)
    setTime(Math.max(0,Math.ceil((prazoRef.current-Date.now())/1000)))
    return()=>clearInterval(t)
  },[running,done,abaOculta])

  const responder=async(i:number)=>{
    if(answered||checking)return
    if(!isPago&&freeQ<=0){showUpgrade();return}
    setSel(i);setChecking(true)
    try{
      const{data:{session}}=await supabase.auth.getSession()
      const res=await fetch('/api/questao/validar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify({questaoId:selectedSimulado.questions[cur].id,escolha:i})})
      const data=await res.json()
      if(res.ok){
        const correctIdx=['A','B','C','D'].indexOf(data.letra_correta)
        setSelectedSimulado((prev:any)=>({...prev,questions:prev.questions.map((qq:any,idx:number)=>idx===cur?{...qq,correct:correctIdx,exp:data.comentario||''}:qq)}))
        setAnswered(true)
        if(!isPago)setFreeQ((p:number)=>p-1)
        if(data.correto){setScore(p=>p+1);onXp('question_correct')}else onXp('question_wrong')
        // Trilhas: grava a resposta do simulado por disciplina, sem bloquear
        ;(async()=>{try{const{data:{user}}=await supabase.auth.getUser();if(user)await supabase.from('quiz_resultados').insert({user_id:user.id,disciplina:cardDaDisciplina(selectedSimulado.questions[cur].disc),acertos:data.correto?1:0,total:1})}catch{/* silencioso */}})()
      }else setSel(null)
    }catch{setSel(null)}
    finally{setChecking(false)}
  }
  const pick=(i:number)=>{ responder(i) }
  const next=()=>{if(cur+1>=selectedSimulado.questions.length){setDone(true);onXp('simulado_complete');return}setCur(p=>p+1);setSel(null);setAnswered(false)}

  // Persistência de progresso (localStorage — mesmo aparelho). Cronômetro pausa ao sair.
  // Mapa: guarda VÁRIOS simulados em andamento ao mesmo tempo (um por prova).
  useEffect(()=>{
    if(typeof window==='undefined'||!selectedSimulado)return
    const key=progKey(selectedSimulado);const m=readMap()
    if(running&&!done){
      m[key]={selectedSimulado,cur,sel,answered,score,time,savedAt:Date.now()}
    }else if(done){
      delete m[key]
    }else{return}
    writeMap(m);setSavedMap(m)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[running,done,cur,answered,score,selectedSimulado])

  useEffect(()=>{
    try{if(typeof window!=='undefined')localStorage.removeItem('tj_simulados_progresso')}catch{}
    setSavedMap(readMap())
    try{if(typeof window!=='undefined'){const rb=localStorage.getItem(BEST_KEY);setBestMap(rb?(JSON.parse(rb)||{}):{})}}catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[profile?.id])

  useEffect(()=>{
    if(!done||!selectedSimulado||typeof window==='undefined')return
    try{
      const key=progKey(selectedSimulado)
      const total=selectedSimulado.questions.length||1
      const rate=Math.round((score/total)*100)
      const rb=localStorage.getItem(BEST_KEY);const m=rb?(JSON.parse(rb)||{}):{}
      if(!(key in m)||rate>m[key]){m[key]=rate;localStorage.setItem(BEST_KEY,JSON.stringify(m));setBestMap(m)}
    }catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[done])

  const continuarSimulado=(key:string)=>{
    const sp=readMap()[key];if(!sp)return
    setSelectedSimulado(sp.selectedSimulado);setCur(sp.cur||0);setSel(sp.sel??null);setAnswered(!!sp.answered);setScore(sp.score||0);setTime(typeof sp.time==='number'?sp.time:18000);setDone(false);setRunning(true)
  }
  const descartarProgresso=(key:string)=>{
    const m=readMap();delete m[key];writeMap(m);setSavedMap({...m})
  }

  if(running&&!done&&selectedSimulado){
    const q=selectedSimulado.questions[cur];const pct=Math.round(((cur+(answered?1:0))/selectedSimulado.questions.length)*100)
    const respondidas=cur+(answered?1:0);const taxaAcerto=respondidas>0?Math.round((score/respondidas)*100):0
    const duracaoTotal=(typeof selectedSimulado?.mins==='number'&&selectedSimulado.mins>0)?selectedSimulado.mins*60:18000
    return(
      <div style={{padding:'24px 20px',flex:1}}>
        <div style={{maxWidth:680,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><div style={{fontSize:12,color:'var(--text-muted)'}}>{selectedSimulado.edicao||selectedSimulado.t} · Q{cur+1}/{selectedSimulado.questions.length}</div></div>
          <div style={{marginBottom:16}}><CronometroSimulado segundosRestantes={time} duracaoTotalSegundos={duracaoTotal} />{abaOculta&&<div style={{marginTop:8,textAlign:'center',fontSize:12,fontWeight:700,color:'var(--gold)',letterSpacing:'0.3px'}}>⏸ Cronômetro pausado — você saiu da aba. Volte para continuar.</div>}</div>
          <div style={{display:'flex',gap:12,marginBottom:16}}>
            <div style={{flex:1,background:'rgba(58,143,232,0.1)',border:'1px solid rgba(58,143,232,0.3)',borderRadius:14,padding:'14px 12px',textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:'1px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:5}}>Respondidas</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:34,fontWeight:900,color:'#60a5fa',lineHeight:1}}>{respondidas}<span style={{fontSize:16,color:'var(--text-muted)',fontWeight:700}}>/{selectedSimulado.questions.length}</span></div>
            </div>
            <div style={{flex:1,background:taxaAcerto>=50?'rgba(76,175,125,0.1)':'rgba(232,66,26,0.08)',border:`1px solid ${taxaAcerto>=50?'rgba(76,175,125,0.35)':'rgba(232,66,26,0.3)'}`,borderRadius:14,padding:'14px 12px',textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:'1px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:5}}>Taxa de acerto</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:34,fontWeight:900,color:taxaAcerto>=50?'var(--success)':'var(--danger)',lineHeight:1}}>{respondidas>0?`${taxaAcerto}%`:'—'}</div>
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:22,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}}/></div>
          <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:20,padding:'22px'}}>
            <div style={{display:'flex',gap:8,marginBottom:14}}><span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)'}}>{q.disc}</span><span style={{fontSize:10,color:'var(--text-muted)'}}>· OAB Oficial</span></div>
            <div style={{fontSize:'clamp(14px,3vw,17px)',fontWeight:600,lineHeight:1.7,marginBottom:22}}>{q.q}</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {q.opts.map((opt:string,i:number)=>{let bg='rgba(255,255,255,0.03)',bc='rgba(255,255,255,0.08)',color='var(--tj-text)';if(checking&&i===sel){bg='rgba(212,168,67,0.08)';bc='rgba(212,168,67,0.6)';color='var(--gold)'}if(answered){if(i===q.correct){bg='rgba(76,175,125,0.1)';bc='var(--success)';color='var(--success)'}else if(i===sel){bg='rgba(232,66,26,0.1)';bc='var(--danger)';color='var(--danger)'}}return(<button key={i} onClick={()=>pick(i)} style={{display:'flex',alignItems:'flex-start',gap:12,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'13px 15px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:'clamp(13px,2.5vw,14px)',color}}><span style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,background:'rgba(255,255,255,0.06)',color:'var(--tj-text)'}}>{String.fromCharCode(65+i)}</span><span style={{flex:1}}>{opt}</span></button>)})}
            </div>
            {answered&&q.exp&&<div style={{marginTop:20,padding:16,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:13,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> <ComentarioComLei texto={q.exp}/></div>}
            {answered&&<button className="btn-primary" style={{width:'100%',marginTop:18}} onClick={next}>{cur+1>=selectedSimulado.questions.length?'VER RESULTADO':'PRÓXIMA →'}</button>}
          </div>
        </div>
      </div>
    )
  }

  if(done&&selectedSimulado){
    const total=selectedSimulado.questions.length;const rate=Math.round((score/total)*100);const corte=Math.ceil(total*0.5);const passou=score>=corte
    const est = rate>=68 ? {emoji:'🔥',cor:'var(--success)',t:'Alta chance de aprovação',d:'Desempenho bem acima do corte. Mantenha o ritmo!'}
              : rate>=57 ? {emoji:'🟢',cor:'var(--success)',t:'Boa chance de aprovação',d:'Acima do corte com margem. Reforce os pontos fracos pra subir mais.'}
              : rate>=50 ? {emoji:'🟡',cor:'var(--gold)',t:'Na linha de corte',d:'Passaria no limite — risco. Foque nas disciplinas que mais erra.'}
              :            {emoji:'🔴',cor:'var(--orange)',t:'Abaixo do corte',d:`Faltam ${corte-score} acertos pro corte da OAB. Bora revisar!`}
    return(<div style={{padding:'24px 20px',flex:1}}><div style={{maxWidth:600,margin:'0 auto',textAlign:'center'}}><div style={{fontSize:60,marginBottom:18}}>{est.emoji}</div><h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,30px)',fontWeight:900,marginBottom:8}}>Simulado Concluído!</h1><p style={{fontSize:14,color:'var(--text-muted)',marginBottom:6}}>{score} de {total} corretas · <strong style={{color:est.cor}}>{rate}%</strong></p><p style={{fontSize:12,color:'var(--text-muted)',opacity:0.7,marginBottom:20}}>Corte da OAB 1ª fase: {corte}/{total} (50%)</p><div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${est.cor}`,borderRadius:16,padding:18,marginBottom:18}}><div style={{fontSize:11,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>Estimativa de aprovação</div><div style={{fontSize:18,fontWeight:900,color:est.cor,marginBottom:6}}>{est.t}</div><div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.6}}>{est.d}</div><div style={{marginTop:14,height:8,borderRadius:100,background:'rgba(255,255,255,0.08)',overflow:'hidden',position:'relative'}}><div style={{width:`${Math.min(rate,100)}%`,height:'100%',background:est.cor,borderRadius:100,transition:'width 0.6s'}}/><div style={{position:'absolute',top:-3,left:'50%',width:2,height:14,background:'rgba(255,255,255,0.45)'}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-muted)',marginTop:5}}><span>0%</span><span>↑ corte 50%</span><span>100%</span></div></div><div style={{display:'flex',gap:10,justifyContent:'center'}}><button className="btn-primary" onClick={()=>{setRunning(false);setDone(false)}}>NOVO SIMULADO</button><button className="btn-secondary" onClick={()=>{setRunning(false);setDone(false);setTab('oficiais')}}>PROVAS OAB</button></div></div></div>)
  }

  return(
    <div style={{padding:'24px 20px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Simulados 📋</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>Treine com provas reais da OAB, com o Simuladão Tiger ou com um treino rápido de aquecimento.</p>
      {!isPago&&<div style={{background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--gold)'}}>🔒 Plano gratuito: apenas Mini Simulados disponíveis. <button onClick={showUpgrade} style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:13,fontFamily:'var(--font-body)',fontWeight:700}}>Fazer upgrade →</button></div>}
      <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
        {([['oficiais','🏛️ Provas OAB'],['pratica','⚡ Treino Rápido']] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{padding:'10px 18px',borderRadius:10,border:tab===key?'1px solid rgba(212,168,67,0.4)':'1px solid rgba(255,255,255,0.08)',background:tab===key?'rgba(212,168,67,0.1)':'transparent',color:tab===key?'var(--gold)':'var(--text-muted)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)'}}>{label}</button>
        ))}
      </div>
      {tab==='oficiais'&&(
        <div>
          {(()=>{const liberadoSimuladao=profile?.role==='admin'||canAccess(profile?.plano,'elite');return(
          <div style={{position:'relative',overflow:'hidden',borderRadius:20,marginBottom:20,padding:'26px 24px',background:'linear-gradient(120deg,#150f04 0%,#3d2608 42%,#b3760f 100%)',border:'1px solid rgba(212,168,67,0.6)',boxShadow:'0 0 0 1px rgba(212,168,67,0.2),0 14px 44px -10px rgba(232,98,26,0.5)'}}>
            <style>{`@keyframes tjShine{0%{transform:translateX(-140%) skewX(-18deg)}55%,100%{transform:translateX(420%) skewX(-18deg)}}@keyframes tjGlow{0%,100%{box-shadow:0 0 16px 2px rgba(232,98,26,.55)}50%{box-shadow:0 0 30px 7px rgba(232,98,26,.9)}}`}</style>
            <div style={{position:'absolute',top:0,left:0,width:'34%',height:'100%',background:'linear-gradient(105deg,transparent,rgba(255,255,255,0.22),transparent)',animation:'tjShine 5s ease-in-out infinite',pointerEvents:'none'}}/>
            <div style={{position:'absolute',top:15,right:-42,transform:'rotate(45deg)',background:'var(--danger)',color:'#fff',fontSize:10,fontWeight:900,letterSpacing:2,padding:'5px 48px',boxShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>NOVO</div>
            <div style={{position:'relative',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
              <div style={{fontSize:54,lineHeight:1,filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.55))'}}>🐯</div>
              <div style={{flex:1,minWidth:230}}>
                <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                  <span style={{fontSize:10,fontWeight:900,letterSpacing:2,background:'#000',color:'#f0c04a',padding:'4px 11px',borderRadius:100,border:'1px solid #f0c04a'}}>★ EXCLUSIVO ELITE</span>
                  <span style={{fontSize:10,fontWeight:900,letterSpacing:2,background:'#f0c04a',color:'#241701',padding:'4px 11px',borderRadius:100}}>80 QUESTÕES</span>
                </div>
                <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(30px,5.5vw,46px)',fontWeight:900,lineHeight:0.95,letterSpacing:1,color:'#fff',textShadow:'0 3px 14px rgba(0,0,0,0.45)'}}>SIMULADÃO <span style={{color:'#f5c84a'}}>TIGER</span></div>
                <div style={{marginTop:9,fontSize:14,fontWeight:800,letterSpacing:0.5,color:'#ffe4b0'}}>AS 80 QUESTÕES QUE MAIS CAEM NA OAB 🔥</div>
                <div style={{marginTop:5,fontSize:12,color:'rgba(255,255,255,0.72)',lineHeight:1.5}}>Prova inédita com os temas de maior incidência de todas as provas — nos moldes da OAB.</div>
              </div>
              {(()=>{const skSim='pratica:Simuladão Tiger';const progSim=savedMap[skSim];const respSim=progSim?((progSim.cur||0)+(progSim.answered?1:0)):0;const totSim=progSim?.selectedSimulado?.questions?.length||80;
                if(progSim&&liberadoSimuladao) return(
                <div style={{flexShrink:0,display:'flex',flexDirection:'column',gap:8,alignItems:'stretch'}}>
                  <div style={{fontSize:11,fontWeight:800,color:'#ffe4b0',textAlign:'center'}}>▶ {respSim}/{totSim} respondidas</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>continuarSimulado(skSim)} style={{fontSize:14,fontWeight:900,letterSpacing:1,padding:'14px 22px',borderRadius:14,border:'none',cursor:'pointer',color:'#241701',background:'linear-gradient(135deg,#ffd76a,#e8621a)',animation:'tjGlow 2s ease-in-out infinite'}}>▶ CONTINUAR</button>
                    <button onClick={()=>{if(confirm('Recomeçar o Simuladão do zero? O progresso atual será perdido.'))descartarProgresso(skSim)}} style={{fontSize:13,fontWeight:800,padding:'14px 16px',borderRadius:14,border:'1px solid rgba(255,255,255,0.3)',cursor:'pointer',color:'#fff',background:'rgba(0,0,0,0.35)'}}>↺</button>
                  </div>
                </div>)
                return(<button onClick={iniciarSimuladao} disabled={loadingProva} style={{flexShrink:0,fontSize:15,fontWeight:900,letterSpacing:1,padding:'16px 30px',borderRadius:14,border:'none',cursor:liberadoSimuladao?'pointer':'not-allowed',color:liberadoSimuladao?'#241701':'#fff',background:liberadoSimuladao?'linear-gradient(135deg,#ffd76a,#e8621a)':'rgba(0,0,0,0.4)',animation:liberadoSimuladao?'tjGlow 2s ease-in-out infinite':'none'}}>{loadingProva?'⏳ MONTANDO...':liberadoSimuladao?'▶ INICIAR AGORA':'🔒 ELITE'}</button>)
              })()}
            </div>
          </div>
          )})()}
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.08),rgba(232,98,26,0.04))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:16,padding:18,marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}><span style={{fontSize:18}}>📋</span><div style={{fontSize:14,fontWeight:700}}>Provas Oficiais da OAB</div><span style={{fontSize:11,color:'var(--text-muted)'}}>Acesso progressivo por plano</span></div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>{Object.entries(BADGE_COR).map(([plano,b])=><span key={plano} style={{fontSize:10,fontWeight:800,letterSpacing:'1px',background:b.bg,color:b.color,padding:'3px 10px',borderRadius:100,border:`1px solid ${b.color}33`}}>{b.label}</span>)}</div>
          </div>
          {loadingProva&&<div style={{textAlign:'center',padding:40,color:'var(--gold)'}}>⏳ Carregando...</div>}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {provasOAB.map((prova,i)=>{
              const planoMin=planoMinimoParaSimulado(prova.numero_exame);const badge=BADGE_COR[planoMin];const liberado=podeLiberarProva(prova)
              const spOf=savedMap['oficial:'+prova.id];const respOf=spOf?((spOf.cur||0)+(spOf.answered?1:0)):0;const txOf=respOf>0?Math.round((spOf.score||0)/respOf*100):0
              return(<div key={prova.id} style={{background:'var(--gray)',border:`1px solid ${liberado?'rgba(212,168,67,0.15)':'rgba(255,255,255,0.06)'}`,borderRadius:16,padding:'18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14,transition:'border-color 0.2s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(212,168,67,0.25)'} onMouseLeave={e=>e.currentTarget.style.borderColor=liberado?'rgba(212,168,67,0.15)':'rgba(255,255,255,0.06)'}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:i===0?'linear-gradient(135deg,var(--gold),var(--orange))':'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:i===0?18:13,fontWeight:900,color:i===0?'#000':'var(--text-muted)',fontFamily:'var(--font-display)',flexShrink:0}}>{i===0?'🆕':`${prova.numero_exame}º`}</div>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}><span style={{fontSize:14,fontWeight:700}}>{prova.edicao}</span>{i===0&&<span style={{fontSize:9,fontWeight:900,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'#000',padding:'2px 8px',borderRadius:100}}>RECENTE</span>}<span style={{fontSize:9,fontWeight:800,background:badge.bg,color:badge.color,padding:'2px 8px',borderRadius:100,border:`1px solid ${badge.color}44`}}>{liberado?'✓ ':''}{badge.label}</span></div>
                    <div style={{display:'flex',gap:12,fontSize:11,color:'var(--text-muted)',flexWrap:'wrap'}}><span>📝 {prova.total_questoes}q</span>{spOf&&<span style={{color:'var(--gold)',fontWeight:700}}>▶ {respOf}/{prova.total_questoes} respondidas{respOf>0?` · ${txOf}% acerto`:' · iniciado'}</span>}{!liberado&&<span style={{color:'var(--text-dim)'}}>🔒 Requer {badge.label}</span>}</div>
                  </div>
                </div>
                {savedMap['oficial:'+prova.id]?(
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
                    <button onClick={()=>continuarSimulado('oficial:'+prova.id)} className="btn-primary" style={{fontSize:12,padding:'10px 18px'}}>▶ CONTINUAR</button>
                    <button onClick={()=>descartarProgresso('oficial:'+prova.id)} className="btn-secondary" style={{fontSize:12,padding:'10px 14px'}}>↺ Recomeçar</button>
                  </div>
                ):(
                  <button onClick={()=>iniciarProvaOficial(prova)} className={liberado?'btn-primary':'btn-secondary'} style={{fontSize:12,padding:'10px 20px',opacity:liberado?1:0.7}} disabled={loadingProva}>{liberado?'▶ INICIAR':`🔒 ${badge.label}`}</button>
                )}
              </div>)
            })}
          </div>
        </div>
      )}
      {tab==='pratica'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
          <div style={{gridColumn:'1/-1',background:'linear-gradient(135deg,rgba(212,168,67,0.12),rgba(232,98,26,0.05))',border:'1px solid rgba(212,168,67,0.3)',borderRadius:16,padding:20}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}><span style={{fontSize:24}}>🎯</span><div style={{fontSize:15,fontWeight:800}}>Temático por Disciplina</div><span style={{fontSize:10,padding:'2px 9px',borderRadius:100,fontWeight:700,background:'rgba(255,255,255,0.06)',color:'var(--text-muted)'}}>Médio</span></div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>Escolha a matéria e treine 20 questões (30min) só dela. Ideal pra reforçar seu ponto fraco.</div>
            {(()=>{const bk='pratica:Temático — '+tematicaDisc;const best=bestMap[bk];const prog=savedMap[bk];return(
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              <select value={tematicaDisc} onChange={e=>setTematicaDisc(e.target.value)} style={{flex:'1 1 180px',background:'var(--field-bg)',border:'1px solid var(--tj-border)',borderRadius:10,padding:'11px 14px',color:'var(--field-fg)',fontSize:13,fontFamily:'var(--font-body)',colorScheme:'var(--field-scheme)'}}>
                <option value="">Escolha a disciplina…</option>
                {Object.keys(PDF_DISC_MAP).map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              {prog?(<>
                <button className="btn-gold-sm" style={{fontSize:12}} onClick={()=>continuarSimulado(bk)}>▶ CONTINUAR</button>
                <button className="btn-secondary" style={{fontSize:12,padding:'11px 12px'}} onClick={()=>descartarProgresso(bk)}>↺</button>
              </>):(
                <button className="btn-gold-sm" style={{fontSize:12}} disabled={!tematicaDisc||loadingProva} onClick={()=>iniciarTematico(tematicaDisc)}>{loadingProva?'⏳':'INICIAR →'}</button>
              )}
              {best!==undefined&&<span style={{fontSize:11,color:'var(--gold)',fontWeight:700,width:'100%'}}>🏆 Seu melhor em {tematicaDisc}: {best}%</span>}
            </div>
            )})()}
          </div>
          {SIMULADOS_PRATICA.map(s=>{const bk='pratica:'+s.t;const best=bestMap[bk];return(
            <div key={s.t} style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:16,padding:20,transition:'all 0.2s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.18)';e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)';e.currentTarget.style.transform='translateY(0)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><span style={{fontSize:26}}>{s.icon}</span><span style={{fontSize:10,padding:'2px 9px',borderRadius:100,fontWeight:700,background:'rgba(255,255,255,0.06)',color:'var(--text-muted)'}}>{s.dif}</span></div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>{s.t}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>{s.info}</div>
              {best!==undefined&&<div style={{fontSize:11,color:'var(--gold)',fontWeight:700,marginBottom:10}}>🏆 Seu melhor: {best}%</div>}
              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:16}}>{s.tags.map(tag=><span key={tag} style={{fontSize:10,padding:'2px 9px',borderRadius:100,fontWeight:700,background:'rgba(212,168,67,0.1)',color:'var(--gold)',border:'1px solid rgba(212,168,67,0.2)'}}>{tag}</span>)}</div>
              {savedMap['pratica:'+s.t]?(
                <div style={{display:'flex',gap:6}}>
                  <button className="btn-gold-sm" style={{flex:1,fontSize:12}} onClick={()=>continuarSimulado('pratica:'+s.t)}>▶ CONTINUAR</button>
                  <button className="btn-secondary" style={{fontSize:12,padding:'10px 12px'}} onClick={()=>descartarProgresso('pratica:'+s.t)}>↺</button>
                </div>
              ):!podeLiberarPratica(s)?<button className="btn-secondary" style={{width:'100%',fontSize:12,padding:'10px'}} onClick={()=>showUpgrade()}>🔒 DESBLOQUEAR</button>:<button className="btn-gold-sm" style={{width:'100%',fontSize:12}} onClick={()=>iniciarSimuladoPratica(s)} disabled={loadingProva}>{loadingProva?'⏳':'INICIAR →'}</button>}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

function formatRankName(nome:string|null):string{
  if(!nome)return 'Estudante'
  const p=nome.trim().split(' ')
  if(p.length===1)return p[0]
  return p[0]+' '+p[1][0]+'.'
}

function PlanoBadgeSmall({plano}:{plano:string}){
  const cfg:Record<string,{label:string;cor:string;bg:string}> = {
    start:    {label:'START', cor:'#60a5fa', bg:'rgba(96,165,250,0.12)'},
    pro:      {label:'PRO',   cor:'#f472b6', bg:'rgba(244,114,182,0.12)'},
    elite:    {label:'ELITE', cor:'#D4A843', bg:'rgba(212,168,67,0.15)'},
  }
  const c = cfg[plano]
  if(!c) return null
  return(
    <span style={{fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:4,
      background:c.bg,color:c.cor,letterSpacing:'0.5px',border:`1px solid ${c.cor}33`,
      whiteSpace:'nowrap'}}>
      {c.label}
    </span>
  )
}

function ResumosPage({ profile, showUpgrade, onNav }: any){
  const [selected,setSelected]=useState<any>(null)
  const resumoTier=getResumoTier(profile?.plano,profile?.role)
  if(selected) return(
    <div style={{padding:'24px 20px',flex:1}}>
      <button onClick={()=>setSelected(null)} style={{display:'flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,border:'none',background:'none',cursor:'pointer',marginBottom:20,fontFamily:'var(--font-body)'}}>← Voltar aos resumos</button>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
        <span style={{fontSize:36}}>{selected.icon}</span>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,5vw,28px)',fontWeight:900}}>{selected.name}</h1>
          <p style={{fontSize:12,color:'var(--text-muted)'}}>Resumo baseado nas provas reais da OAB</p>
        </div>
      </div>
      <ResumoSection disc={selected} onNav={onNav} resumoTier={resumoTier} showUpgrade={showUpgrade}/>
    </div>
  )
  return(
    <div style={{padding:'24px 20px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Resumos 📒</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>Resumos inteligentes de cada disciplina, baseados em todas as provas oficiais da OAB/FGV cadastradas na plataforma.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
        {DISCIPLINES.map(d=>(
          <div key={d.id} style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:14,padding:16,cursor:'pointer',transition:'all 0.2s'}}
            onClick={()=>setSelected(d)}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.2)';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';e.currentTarget.style.transform='translateY(0)'}}>
            <div style={{fontSize:22,marginBottom:10}}>{d.icon}</div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:5}}>{d.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>📖 Ver resumo</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const MAPA_DISCIPLINAS: Record<string,{name:string,icon:string}> = {
  'constitucional':{name:'Constitucional',icon:'⚖️'},'administrativo':{name:'Administrativo',icon:'🏛️'},
  'penal':{name:'Penal',icon:'🔒'},'processo-penal':{name:'Processo Penal',icon:'🔍'},
  'civil':{name:'Civil',icon:'📋'},'processo-civil':{name:'Processo Civil',icon:'⚡'},
  'trabalho':{name:'Trabalho',icon:'🦺'},'proc-trabalho':{name:'Proc. Trabalho',icon:'👷'},
  'tributario':{name:'Tributário',icon:'💰'},'empresarial':{name:'Empresarial',icon:'🏢'},
  'etica':{name:'Ética OAB',icon:'📜'},'consumidor':{name:'Consumidor',icon:'🛒'},
  'direitos-humanos':{name:'Direitos Humanos',icon:'🌍'},'ambiental':{name:'Ambiental',icon:'🌿'},
  'filosofia':{name:'Filosofia',icon:'📖'},'internacional':{name:'Internacional',icon:'🌐'},'eca':{name:'ECA',icon:'👶'},
  'eleitoral':{name:'Eleitoral',icon:'🗳️'},'financeiro':{name:'Financeiro',icon:'🏦'},'previdenciario':{name:'Previdenciário',icon:'🛡️'},
}

function TrilhasPage({ canAccessPremium, showUpgrade, onNav }: any){
  const [stats,setStats]=useState<Record<string,{acertos:number,total:number}>>({})
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    if(!canAccessPremium){setLoading(false);return}
    ;(async()=>{
      try{
        const{data:{user}}=await supabase.auth.getUser()
        if(!user){setLoading(false);return}
        const{data}=await supabase.from('quiz_resultados').select('disciplina,acertos,total').eq('user_id',user.id)
        const agg:Record<string,{acertos:number,total:number}>={}
        ;(data||[]).forEach((r:any)=>{
          const k=r.disciplina
          if(!agg[k])agg[k]={acertos:0,total:0}
          agg[k].acertos+=r.acertos||0;agg[k].total+=r.total||0
        })
        setStats(agg)
      }catch{/* ignora */}
      finally{setLoading(false)}
    })()
  },[canAccessPremium])

  if(!canAccessPremium) return(
    <div style={{maxWidth:520,margin:'40px auto',textAlign:'center',padding:'40px 28px',background:'rgba(212,168,67,0.05)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:18}}>
      <div style={{fontSize:54,marginBottom:14}}>🧭</div>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,5vw,28px)',fontWeight:900,marginBottom:10}}>Trilhas é <span style={{color:'var(--gold)'}}>premium</span></h1>
      <p style={{fontSize:14,color:'var(--text-muted)',lineHeight:1.6,marginBottom:24}}>Sua trilha de estudo montada pelo seu desempenho real — focando onde você mais erra. Disponível nos planos Pro e Elite.</p>
      <button className="btn-gold" onClick={showUpgrade}>🚀 Desbloquear agora</button>
    </div>
  )

  const lista=DISCIPLINES.map(d=>{
    const s=stats[d.name];const total=s?.total||0
    const taxa=total>0?Math.round((s!.acertos/total)*100):null
    return {id:d.id,icon:d.icon,name:d.name,total,taxa}
  })
  const avaliadas=lista.filter(x=>x.taxa!==null)
  const foco=avaliadas.filter(x=>(x.taxa as number)<60).sort((a,b)=>(a.taxa as number)-(b.taxa as number))
  const bem=avaliadas.filter(x=>(x.taxa as number)>=60).sort((a,b)=>(b.taxa as number)-(a.taxa as number))
  const naoAval=lista.filter(x=>x.taxa===null)
  const cor=(t:number)=>t<50?'#dc5050':t<70?'#e8a33a':'#6bbf59'

  // Roteiro de estudo: cada etapa abre a disciplina já na aba certa.
  const ETAPAS:{k:'leiseca'|'resumo'|'flash'|'quiz';icon:string;label:string}[]=[
    {k:'resumo',icon:'📄',label:'Resumo'},
    {k:'flash',icon:'🃏',label:'Flashcards'},
    {k:'leiseca',icon:'⚡',label:'Lei Seca'},
    {k:'quiz',icon:'📝',label:'Refazer quiz'},
  ]
  const irPara=(nomeDisc:string,aba:'leiseca'|'resumo'|'flash'|'quiz')=>{
    const alvo=DISCIPLINES.find(d=>d.name===nomeDisc)
    if(alvo){_radarTarget=alvo;_radarTargetTab=aba}
    onNav('disciplines')
  }
  const Roteiro=({nome}:{nome:string})=>(
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:12}}>
      {ETAPAS.map((e,i)=>(
        <span key={e.k} style={{display:'flex',alignItems:'center',gap:6}}>
          <button onClick={()=>irPara(nome,e.k)} style={{background:'rgba(212,168,67,0.08)',border:'1px solid rgba(212,168,67,0.25)',borderRadius:100,padding:'6px 12px',fontSize:11,fontWeight:700,color:'var(--gold)',cursor:'pointer',fontFamily:'var(--font-body)',whiteSpace:'nowrap'}}>{e.icon} {e.label}</button>
          {i<ETAPAS.length-1&&<span style={{color:'rgba(212,168,67,0.4)',fontSize:11}}>→</span>}
        </span>
      ))}
    </div>
  )
  const Metodo=()=>(
    <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'14px 16px',marginBottom:24}}>
      <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:6}}>Como usar sua trilha</div>
      <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>Em cada disciplina abaixo, siga a ordem: <strong style={{color:'var(--gold)'}}>Resumo → Flashcards → Lei Seca → Refazer quiz</strong>. Os botões levam direto para a etapa.</div>
    </div>
  )

  const Bar=({t}:{t:number})=>(
    <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:6,overflow:'hidden',marginTop:6}}>
      <div style={{width:`${t}%`,height:'100%',background:cor(t),borderRadius:100}}/>
    </div>
  )

  return(
    <div>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Trilhas 🧭</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>Montada pelo seu desempenho real nos quizzes. Foque onde você mais erra.</p>
      <Metodo/>

      {loading?(
        <p style={{color:'var(--text-muted)'}}>Carregando seu desempenho…</p>
      ):avaliadas.length===0?(
        <div style={{textAlign:'center',padding:'40px 20px',background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:16}}>
          <div style={{fontSize:44,marginBottom:12}}>🧭</div>
          <p style={{fontSize:15,color:'var(--text-muted)',lineHeight:1.6,marginBottom:18}}>Faça alguns quizzes nas disciplinas e sua trilha vai se montar sozinha,<br/>destacando onde você precisa focar.</p>
          <button className="btn-primary" onClick={()=>irPara(DISCIPLINES[0].name,'quiz')}>Começar pelo primeiro quiz →</button>
        </div>
      ):(
        <>
          {foco.length>0&&(
            <div style={{marginBottom:26}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,marginBottom:12}}>🎯 Foco recomendado</h2>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {foco.map(d=>(
                  <div key={d.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${cor(d.taxa as number)}33`,borderRadius:14,padding:16}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                      <div style={{fontSize:15,fontWeight:800}}>{d.icon} {d.name}</div>
                      <div style={{fontSize:15,fontWeight:900,color:cor(d.taxa as number)}}>{d.taxa}%</div>
                    </div>
                    <Bar t={d.taxa as number}/>
                    <Roteiro nome={d.name}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {naoAval.length>0&&(
            <div style={{marginBottom:26}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,marginBottom:12}}>📊 Ainda não avaliadas</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:10}}>
                {naoAval.map(d=>(
                  <div key={d.id} onClick={()=>irPara(d.name,'quiz')} style={{cursor:'pointer',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'12px 14px'}}>
                    <div style={{fontSize:14,fontWeight:700}}>{d.icon} {d.name}</div>
                    <div style={{fontSize:11,color:'var(--gold)',marginTop:3}}>▶ Fazer quiz pra avaliar</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bem.length>0&&(
            <div style={{marginBottom:10}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,marginBottom:12}}>✅ Você está bem</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:10}}>
                {bem.map(d=>(
                  <div key={d.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(107,191,89,0.2)',borderRadius:12,padding:'12px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:14,fontWeight:700}}>{d.icon} {d.name}</span>
                      <span style={{fontSize:13,fontWeight:900,color:cor(d.taxa as number)}}>{d.taxa}%</span>
                    </div>
                    <Bar t={d.taxa as number}/>
                    <button onClick={()=>irPara(d.name,'flash')} style={{marginTop:10,width:'100%',background:'transparent',border:'1px solid rgba(107,191,89,0.3)',borderRadius:8,padding:'6px',fontSize:11,fontWeight:700,color:'#6bbf59',cursor:'pointer',fontFamily:'var(--font-body)'}}>🃏 Revisar com flashcards</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RankingPage({profile,onNav}:any){
  const [tab,setTab]=useState<'geral'|'semanal'|'streak'|'questoes'>('geral')
  const [rankData,setRankData]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [totalUsers,setTotalUsers]=useState(0)
  const [myPos,setMyPos]=useState<number|null>(null)
  const [myMetric,setMyMetric]=useState<number|null>(null)
  const [allUsers,setAllUsers]=useState<any[]>([])

  const mapRow=(p:any,i:number,metric:number)=>({
    pos:i+1,id:p.id,name:formatRankName(p.nome),
    level:getNivelByXp(p.xp||0).nome,icon:getNivelByXp(p.xp||0).icon,
    xp:p.xp||0,streak:p.streak||0,
    questoes:p.questoes_respondidas||0,acertos:p.questoes_corretas||0,
    plano:p.plano||'gratuito',badge:p.ambassador_badge,avatar_url:p.avatar_url,
    metric,me:p.id===profile?.id,
  })

  const loadRanking=async()=>{
    setLoading(true)
    try{
      const{data:{session}}=await supabase.auth.getSession()
      const res=await fetch('/api/ranking',{headers:{Authorization:`Bearer ${session?.access_token??''}`}})
      const json=await res.json()
      setAllUsers(res.ok?(json.users||[]):[])
    }catch{ setAllUsers([]) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ loadRanking() },[profile?.id])

  useEffect(()=>{
    const metricOf=(p:any)=> tab==='geral'?(p.xp||0):tab==='semanal'?(p.xp_semana||0):tab==='streak'?(p.streak||0):(p.questoes_respondidas||0)
    let lista=[...allUsers]
    if(tab==='semanal')lista=lista.filter((p:any)=>(p.xp_semana||0)>0)
    else if(tab==='streak')lista=lista.filter((p:any)=>(p.streak||0)>0)
    else if(tab==='questoes')lista=lista.filter((p:any)=>(p.questoes_respondidas||0)>0)
    lista.sort((a:any,b:any)=>metricOf(b)-metricOf(a))
    setTotalUsers(tab==='geral'?allUsers.length:lista.length)
    setRankData(lista.slice(0,20).map((p:any,i:number)=>mapRow(p,i,metricOf(p))))
    const meIdx=lista.findIndex((p:any)=>p.id===profile?.id)
    if(meIdx>=0){setMyPos(meIdx+1);setMyMetric(metricOf(lista[meIdx]))}
    else{setMyPos(null);setMyMetric(null)}
  },[tab,allUsers,profile?.id])

  const TABS=[
    {key:'geral',   icon:'🏆',label:'Geral',   sub:'XP total'},
    {key:'semanal', icon:'📅',label:'Semanal', sub:'Esta semana'},
    {key:'streak',  icon:'🔥',label:'Streak',  sub:'Dias seguidos'},
    {key:'questoes',icon:'📝',label:'Questões',sub:'Respondidas'},
  ] as const

  const metricLabel=(r:any)=>{
    if(tab==='geral'  )return `${(r.xp||0).toLocaleString('pt-BR')} XP`
    if(tab==='semanal')return `+${(r.metric||0).toLocaleString('pt-BR')} XP`
    if(tab==='streak' )return `${r.streak}d 🔥`
    const acerto=r.questoes>0?Math.round((r.acertos/r.questoes)*100):0
    return `${r.questoes}q · ${acerto}%`
  }

  const top3=rankData.slice(0,3)
  const notInTop=!rankData.find(r=>r.me) && myPos

  const motivacional=()=>{
    if(tab!=='geral'||!myPos)return null
    const minha=profile?.xp||0
    const acima=rankData.find(r=>r.pos===myPos-1)
    if(acima&&acima.metric>minha){
      const diff=(acima.metric-minha).toLocaleString('pt-BR')
      return `🎯 Faltam ${diff} XP para ultrapassar ${acima.name} e subir para #${myPos-1}`
    }
    return null
  }

  return(
    <div style={{padding:'24px 20px',flex:1,overflowY:'auto'}}>

      {/* ── Título + header stats ── */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:8}}>
          Ranking Nacional 🏆
        </h1>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {totalUsers>0&&<span style={{fontSize:12,color:'var(--text-muted)',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:100,padding:'4px 12px'}}>👥 {totalUsers} estudantes</span>}
          {myPos&&<span style={{fontSize:12,color:'var(--gold)',background:'rgba(212,168,67,0.08)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:100,padding:'4px 12px',fontWeight:700}}>🎯 Você: #{myPos}</span>}
          {myMetric!==null&&tab==='geral'&&<span style={{fontSize:12,color:'var(--text-muted)',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:100,padding:'4px 12px'}}>⚡ {(myMetric||0).toLocaleString('pt-BR')} XP</span>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',transition:'all 0.15s',
              background:tab===t.key?'rgba(212,168,67,0.12)':'rgba(255,255,255,0.04)',
              outline:tab===t.key?'1px solid rgba(212,168,67,0.35)':'1px solid rgba(255,255,255,0.07)'}}>
            <span style={{fontSize:16,marginBottom:2}}>{t.icon}</span>
            <span style={{fontSize:11,fontWeight:tab===t.key?700:400,color:tab===t.key?'var(--gold)':'var(--text-muted)'}}>{t.label}</span>
            <span style={{fontSize:9,color:'var(--text-dim)'}}>{t.sub}</span>
          </button>
        ))}
      </div>

      {loading?(
        <div style={{textAlign:'center',padding:48,color:'var(--text-muted)'}}>
          <div style={{fontSize:36,marginBottom:12,animation:'pulse 1.5s infinite'}}>⏳</div>
          Carregando ranking...
        </div>
      ):rankData.length===0?(
        <div style={{textAlign:'center',padding:48}}>
          <div style={{fontSize:48,marginBottom:16}}>
            {tab==='semanal'?'📅':tab==='streak'?'🔥':tab==='questoes'?'📝':'🏆'}
          </div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>
            {tab==='semanal'?'Nenhum XP esta semana ainda':'Ranking vazio por enquanto'}
          </div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:20,lineHeight:1.6}}>
            {tab==='semanal'
              ?'Responda questões hoje para aparecer no ranking semanal!'
              :tab==='streak'?'Estude todos os dias para construir seu streak!'
              :tab==='questoes'?'Comece respondendo questões agora!'
              :'Seja o primeiro! Responda questões para aparecer aqui.'}
          </div>
          <button className="btn-primary" style={{fontSize:13,padding:'10px 24px'}}
            onClick={()=>onNav&&onNav('quiz')}>
            Ir para Questões →
          </button>
        </div>
      ):(
        <>
          {/* ── Pódio top 3 ── */}
          {top3.length>=2&&(
            <div style={{display:'flex',alignItems:'flex-end',gap:8,marginBottom:28,justifyContent:'center',flexWrap:'wrap'}}>
              {([1,0,2] as const).map(idx=>{
                const r=top3[idx];if(!r)return null
                const isFirst=idx===0
                const heights=[120,90,74]
                const h=heights[idx]
                const grad=['linear-gradient(135deg,var(--gold),var(--orange))','linear-gradient(135deg,#C0C0C0,#a0a0a0)','linear-gradient(135deg,#CD7F32,#a05a2c)'][idx]
                const medal=['🥇','🥈','🥉'][idx]
                return(
                  <div key={idx} style={{textAlign:'center',minWidth:90,flex:isFirst?'0 0 110px':'0 0 90px',
                    transform:isFirst?'scale(1.05)':'none',transition:'transform 0.2s',
                    filter:r.me?'drop-shadow(0 0 8px rgba(212,168,67,0.5))':'none'}}>
                    <div style={{marginBottom:4,display:'flex',justifyContent:'center'}}>{isTigerId(r.avatar_url)?<span style={{width:isFirst?44:34,height:isFirst?44:34,borderRadius:'50%',overflow:'hidden',display:'inline-block'}}><TigerAvatar id={r.avatar_url} size={isFirst?44:34}/></span>:<span style={{fontSize:isFirst?28:22}}>{r.icon}</span>}</div>
                    <div style={{fontSize:isFirst?12:10,fontWeight:700,marginBottom:1,color:r.me?'var(--gold)':'var(--tj-text)'}}>{r.name}{r.me?' 👈':''}</div>
                    <div style={{fontSize:9,color:'var(--text-muted)',marginBottom:6}}>{r.level}</div>
                    <div style={{height:h,background:grad,borderRadius:'10px 10px 0 0',
                      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-start',
                      paddingTop:10,gap:4}}>
                      <span style={{fontSize:isFirst?20:16}}>{medal}</span>
                      <span style={{fontSize:9,color:isFirst?'var(--deep-black)':'rgba(255,255,255,0.8)',fontWeight:700,fontFamily:'var(--font-mono)'}}>
                        {metricLabel(r)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Lista principal ── */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {rankData.map(r=>(
              <div key={r.id} style={{
                display:'flex',alignItems:'center',gap:10,
                background:r.me?'rgba(212,168,67,0.07)':'rgba(255,255,255,0.03)',
                border:r.me?'1px solid rgba(212,168,67,0.3)':'1px solid rgba(255,255,255,0.05)',
                borderRadius:12,padding:'12px 14px',transition:'all 0.15s'}}>
                {/* Rank */}
                <div style={{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:700,width:28,textAlign:'center',flexShrink:0,
                  color:r.pos===1?'#FFD700':r.pos===2?'#C0C0C0':r.pos===3?'#CD7F32':'var(--text-muted)'}}>
                  {r.pos<=3?['🥇','🥈','🥉'][r.pos-1]:`#${r.pos}`}
                </div>
                {/* Avatar */}
                <div style={{width:34,height:34,borderRadius:'50%',flexShrink:0,
                  background:'linear-gradient(135deg,rgba(212,168,67,0.2),rgba(232,98,26,0.1))',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,overflow:'hidden'}}>
                  {isTigerId(r.avatar_url)?<TigerAvatar id={r.avatar_url} size={34}/>:r.icon}
                </div>
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:600,color:r.me?'var(--gold)':'var(--tj-text)'}}>
                      {r.name}
                    </span>
                    {r.me&&<span style={{fontSize:9,background:'rgba(212,168,67,0.15)',color:'var(--gold)',padding:'1px 7px',borderRadius:4,fontWeight:700}}>VOCÊ</span>}
                    <PlanoBadgeSmall plano={r.plano}/>
                  </div>
                  <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1}}>{r.level}</div>
                </div>
                {/* Streak se relevante */}
                {tab!=='streak'&&r.streak>0&&(
                  <div style={{fontSize:11,color:'var(--orange)',fontWeight:600,flexShrink:0}}>🔥{r.streak}d</div>
                )}
                {/* Métrica principal */}
                <div style={{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:700,
                  color:r.me?'var(--gold)':'var(--text-muted)',flexShrink:0,textAlign:'right'}}>
                  {metricLabel(r)}
                </div>
              </div>
            ))}
          </div>

          {/* ── Usuário fora do top 20 (pinado) ── */}
          {notInTop&&(
            <>
              <div style={{display:'flex',alignItems:'center',gap:10,margin:'16px 0 8px',opacity:0.4}}>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,0.1)'}}/>
                <span style={{fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap'}}>sua posição</span>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,0.1)'}}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,
                background:'rgba(212,168,67,0.07)',border:'1px dashed rgba(212,168,67,0.25)',
                borderRadius:12,padding:'12px 14px'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:700,width:28,textAlign:'center',color:'var(--text-muted)'}}>
                  #{myPos}
                </div>
                <div style={{width:34,height:34,borderRadius:'50%',
                  background:'linear-gradient(135deg,rgba(212,168,67,0.2),rgba(232,98,26,0.1))',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,overflow:'hidden'}}>
                  {isTigerId(profile?.avatar_url)?<TigerAvatar id={profile?.avatar_url} size={34}/>:getNivelByXp(profile?.xp||0).icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:13,fontWeight:600,color:'var(--gold)'}}>
                      {formatRankName(profile?.nome)}
                    </span>
                    <span style={{fontSize:9,background:'rgba(212,168,67,0.15)',color:'var(--gold)',padding:'1px 7px',borderRadius:4,fontWeight:700}}>VOCÊ</span>
                  </div>
                  <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1}}>{getNivelByXp(profile?.xp||0).nome}</div>
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:700,color:'var(--gold)',textAlign:'right'}}>
                  {tab==='geral'?`${(myMetric||0).toLocaleString('pt-BR')} XP`
                   :tab==='streak'?`${profile?.streak||0}d 🔥`
                   :`${profile?.questoes_respondidas||0}q`}
                </div>
              </div>
            </>
          )}

          {/* ── Texto motivacional ── */}
          {motivacional()&&(
            <div style={{marginTop:14,padding:'12px 16px',background:'rgba(212,168,67,0.06)',
              border:'1px solid rgba(212,168,67,0.15)',borderRadius:10,fontSize:12,
              color:'var(--text-muted)',textAlign:'center',lineHeight:1.6}}>
              {motivacional()}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function IndiceJuridico({ showUpgrade, isPago }: any) {
  const [busca, setBusca] = useState('')
  const [letraSel, setLetraSel] = useState<string|null>(null)
  const [termos, setTermos] = useState<any[]>([])
  const [questoesBusca, setQuestoesBusca] = useState<any[]>([])
  const [flashBusca, setFlashBusca] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [termoSel, setTermoSel] = useState<any|null>(null)
  const [questRel, setQuestRel] = useState<any[]>([])
  const [loadingModal, setLoadingModal] = useState(false)
  const buscaRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  const LETRAS = 'ABCDEFGHIJLMNOPQRSTUVZ'.split('')

  const buscarTudo = async (texto: string, letra: string|null) => {
    setLoading(true)
    try {
      if (texto.length >= 2) {
        // Busca multi-fonte simultânea
        const [resTermos, resQuestoes, resFlash] = await Promise.all([
          supabase.rpc('buscar_indice_termos', { q: texto }),
          supabase.rpc('buscar_questoes_indice', { q: texto, lim: 10 }),
          supabase.rpc('buscar_flashcards_indice', { q: texto, lim: 10 }),
        ])
        setTermos(resTermos.data || [])
        setQuestoesBusca(resQuestoes.data || [])
        setFlashBusca(resFlash.data || [])
      } else if (letra) {
        // Filtro A-Z: só no índice
        // Browse A-Z: carrega TODOS os termos da letra (pagina; antes cortava em 100)
        const termosLetra:any[]=[]
        for(let inicio=0;;inicio+=1000){
          const { data, error } = await supabase.from('indice_remissivo').select('*')
            .eq('ativo', true).eq('letra', letra).order('termo').range(inicio,inicio+999)
          if(error||!data||data.length===0)break
          termosLetra.push(...data)
          if(data.length<1000)break
        }
        setTermos(termosLetra)
        setQuestoesBusca([])
        setFlashBusca([])
      } else {
        setTermos([]); setQuestoesBusca([]); setFlashBusca([])
      }
    } catch { setTermos([]); setQuestoesBusca([]); setFlashBusca([]) }
    finally { setLoading(false) }
  }

  const handleBusca = (val: string) => {
    setBusca(val); setLetraSel(null)
    if (buscaRef.current) clearTimeout(buscaRef.current)
    buscaRef.current = setTimeout(() => buscarTudo(val, null), 350)
  }

  const handleLetra = (letra: string) => {
    const nova = letraSel === letra ? null : letra
    setLetraSel(nova); setBusca('')
    buscarTudo('', nova)
  }

  const abrirTermo = async (termo: any) => {
    setTermoSel(termo); setLoadingModal(true)
    try {
      const { data } = await supabase.rpc('buscar_questoes_indice', { q: termo.termo, lim: 3 })
      setQuestRel(data || [])
    } catch { setQuestRel([]) }
    finally { setLoadingModal(false) }
  }

  const TIPO_COR: Record<string,string> = {
    'ação':'#3a8fe8','princípio':'var(--gold)','conceito':'var(--success)',
    'instituto':'#8B5CF6','crime':'var(--danger)','excludente':'var(--orange)',
    'remédio constitucional':'var(--gold)',
  }

  const totalResultados = termos.length + questoesBusca.length + flashBusca.length
  const buscaAtiva = busca.length >= 2 || !!letraSel

  if (!isPago) return (
    <div style={{padding:'24px 20px',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
      <div style={{fontSize:56,marginBottom:20}}>📚</div>
      <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,30px)',fontWeight:900,marginBottom:12}}>
        Índice Jurídico <span style={{color:'var(--gold)'}}>Remissivo</span>
      </h2>
      <p style={{fontSize:15,color:'var(--text-muted)',maxWidth:460,lineHeight:1.7,marginBottom:28}}>
        Busca inteligente em todo o conteúdo da plataforma — termos, questões OAB e flashcards — em um único lugar.
      </p>
      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28,width:'100%',maxWidth:380,textAlign:'left'}}>
        {['Busca simultânea em termos, questões e flashcards','Navegação A-Z por letra do índice','Definição completa com questões OAB relacionadas','Cobertura de todas as 17 disciplinas'].map((f,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.12)',borderRadius:10,padding:'10px 14px',fontSize:13}}>
            <span style={{color:'var(--success)'}}>✓</span>{f}
          </div>
        ))}
      </div>
      <button className="btn-primary" style={{fontSize:14,padding:'14px 32px'}} onClick={showUpgrade}>
        🔓 Desbloquear Índice Jurídico
      </button>
    </div>
  )

  return (
    <div style={{padding:'24px 20px',flex:1,overflowY:'auto'}}>
      {/* Modal do termo selecionado */}
      {termoSel && (
        <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.92)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}}>
          <div style={{width:'100%',maxWidth:640,background:'var(--gray)',border:'1px solid rgba(212,168,67,0.2)',borderRadius:24,padding:'28px',position:'relative',maxHeight:'88vh',overflowY:'auto'}}>
            <button onClick={()=>{setTermoSel(null);setQuestRel([])}} style={{position:'absolute',top:16,right:16,background:'none',border:'none',color:'#888',fontSize:22,cursor:'pointer'}}>✕</button>
            <div style={{marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
                <span style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:`${TIPO_COR[termoSel.tipo]||'rgba(255,255,255,0.06)'}22`,border:`1px solid ${TIPO_COR[termoSel.tipo]||'rgba(255,255,255,0.1)'}44`,color:TIPO_COR[termoSel.tipo]||'var(--text-muted)',padding:'3px 10px',borderRadius:100}}>{termoSel.tipo}</span>
                <span style={{fontSize:11,color:'var(--text-muted)',background:'rgba(255,255,255,0.06)',padding:'3px 10px',borderRadius:100}}>{termoSel.nome_disciplina}</span>
              </div>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:'clamp(20px,4vw,26px)',fontWeight:900,color:'var(--tj-text)',marginBottom:12}}>{termoSel.termo}</h2>
              <p style={{fontSize:14,color:'var(--text-muted)',lineHeight:1.8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'14px 16px'}}>{termoSel.descricao}</p>
            </div>
            {loadingModal
              ? <div style={{textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:13}}>⏳ Buscando questões...</div>
              : questRel.length > 0 ? (
                <div>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--gold)',marginBottom:12}}>📝 QUESTÕES OAB RELACIONADAS</div>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {questRel.map((q,i)=>(
                      <div key={q.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'14px 16px'}}>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6}}>Questão {i+1} · OAB Oficial</div>
                        <div style={{fontSize:13,lineHeight:1.6,marginBottom:10,color:'var(--tj-text)'}}>{q.enunciado.slice(0,220)}{q.enunciado.length>220?'...':''}</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                          {['A','B','C','D'].map((l,li)=>{
                            const opt=[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d][li]
                            const certa=q.resposta_correta===l
                            return <div key={l} style={{fontSize:11,padding:'4px 10px',borderRadius:6,background:certa?'rgba(76,175,125,0.12)':'rgba(255,255,255,0.04)',border:`1px solid ${certa?'var(--success)':'rgba(255,255,255,0.08)'}`,color:certa?'var(--success)':'var(--text-muted)',flex:'1 1 40%'}}>{l}) {opt?.slice(0,60)}{opt?.length>60?'...':''}</div>
                          })}
                        </div>
                        {q.comentario&&<div style={{marginTop:8,fontSize:11,color:'var(--text-muted)',borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:8}}>💡 <ComentarioComLei texto={q.comentario}/></div>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div style={{fontSize:13,color:'var(--text-muted)',textAlign:'center',padding:'12px 0'}}>Nenhuma questão OAB encontrada para este termo.</div>
            }
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Índice Jurídico 📚</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>Busca em termos, questões OAB e flashcards simultaneamente.</p>

      {/* Campo de busca */}
      <div style={{position:'relative',marginBottom:16,maxWidth:580}}>
        <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:16,pointerEvents:'none'}}>🔍</span>
        <input value={busca} onChange={e=>handleBusca(e.target.value)}
          placeholder="Buscar em toda a plataforma... ex: Tutela, Prescrição, Dolo"
          className="form-input" style={{width:'100%',paddingLeft:42,fontSize:14}}/>
        {busca&&<button onClick={()=>{setBusca('');setTermos([]);setQuestoesBusca([]);setFlashBusca([]);setLetraSel(null)}} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:18}}>✕</button>}
      </div>

      {/* Filtro A-Z */}
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:24}}>
        {LETRAS.map(l=>(
          <button key={l} onClick={()=>handleLetra(l)} style={{width:34,height:34,borderRadius:8,border:letraSel===l?'1px solid var(--gold)':'1px solid rgba(255,255,255,0.08)',background:letraSel===l?'rgba(212,168,67,0.15)':'rgba(255,255,255,0.03)',color:letraSel===l?'var(--gold)':'var(--text-muted)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-mono)',transition:'all 0.15s'}}>
            {l}
          </button>
        ))}
        {buscaAtiva&&<button onClick={()=>{setLetraSel(null);setBusca('');setTermos([]);setQuestoesBusca([]);setFlashBusca([])}} style={{padding:'0 14px',height:34,borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'var(--text-muted)',fontSize:12,cursor:'pointer',fontFamily:'var(--font-body)'}}>Limpar</button>}
      </div>

      {/* Estado inicial */}
      {!buscaAtiva&&!loading&&(
        <div style={{textAlign:'center',padding:'40px 20px'}}>
          <div style={{fontSize:44,marginBottom:14}}>📖</div>
          <p style={{fontSize:14,color:'var(--text-muted)',lineHeight:1.7,maxWidth:400,margin:'0 auto'}}>Digite qualquer termo jurídico ou clique em uma letra para explorar o índice.</p>
        </div>
      )}

      {/* Loading */}
      {loading&&<div style={{textAlign:'center',padding:32,color:'var(--text-muted)',fontSize:13}}>⏳ Buscando em toda a plataforma...</div>}

      {/* Sem resultados */}
      {!loading&&buscaAtiva&&totalResultados===0&&(
        <div style={{textAlign:'center',padding:32}}>
          <div style={{fontSize:36,marginBottom:12}}>🔎</div>
          <p style={{fontSize:14,color:'var(--text-muted)'}}>Nenhum resultado encontrado. Tente outro termo.</p>
        </div>
      )}

      {/* RESULTADOS */}
      {!loading&&buscaAtiva&&totalResultados>0&&(
        <div>
          {/* Contador geral */}
          {busca.length>=2&&(
            <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
              {[
                {label:'Termos do Índice',count:termos.length,cor:'var(--gold)',icon:'📖'},
                {label:'Questões OAB',count:questoesBusca.length,cor:'#3a8fe8',icon:'📝'},
                {label:'Flashcards',count:flashBusca.length,cor:'#8B5CF6',icon:'🃏'},
              ].map(s=>(
                <div key={s.label} style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'8px 14px',fontSize:12}}>
                  <span>{s.icon}</span>
                  <span style={{color:s.cor,fontWeight:700}}>{s.count}</span>
                  <span style={{color:'var(--text-muted)'}}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* SEÇÃO: Termos do Índice */}
          {termos.length>0&&(
            <div style={{marginBottom:28}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--gold)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                📖 TERMOS DO ÍNDICE
                <span style={{fontSize:10,background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.2)',color:'var(--gold)',padding:'2px 8px',borderRadius:100}}>{termos.length}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                {termos.map(t=>(
                  <div key={t.id} onClick={()=>abrirTermo(t)}
                    style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:14,padding:'16px',cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,168,67,0.3)';e.currentTarget.style.transform='translateY(-2px)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)';e.currentTarget.style.transform='translateY(0)'}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:8}}>
                      <div style={{fontWeight:700,fontSize:14,color:'var(--tj-text)',lineHeight:1.3}}>{t.termo}</div>
                      <span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:`${TIPO_COR[t.tipo]||'rgba(255,255,255,0.06)'}22`,border:`1px solid ${TIPO_COR[t.tipo]||'rgba(255,255,255,0.1)'}44`,color:TIPO_COR[t.tipo]||'var(--text-muted)',padding:'3px 8px',borderRadius:100,flexShrink:0,whiteSpace:'nowrap'}}>{t.tipo}</span>
                    </div>
                    <div style={{fontSize:11,color:'var(--gold)',marginBottom:6,fontWeight:600}}>{t.nome_disciplina}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>{t.descricao.slice(0,110)}{t.descricao.length>110?'...':''}</div>
                    <div style={{marginTop:8,fontSize:11,color:'var(--text-dim)'}}>Clique para ver definição + questões →</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO: Questões OAB */}
          {questoesBusca.length>0&&(
            <div style={{marginBottom:28}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'#3a8fe8',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                📝 QUESTÕES OAB
                <span style={{fontSize:10,background:'rgba(58,143,232,0.1)',border:'1px solid rgba(58,143,232,0.2)',color:'#3a8fe8',padding:'2px 8px',borderRadius:100}}>{questoesBusca.length}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {questoesBusca.map((q,i)=>(
                  <div key={q.id} style={{background:'var(--gray)',border:'1px solid rgba(58,143,232,0.12)',borderRadius:14,padding:'16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#3a8fe8'}}>OAB OFICIAL</span>
                      <span style={{fontSize:11,color:'var(--text-muted)'}}>· {q.disciplina}</span>
                    </div>
                    <div style={{fontSize:13,lineHeight:1.7,marginBottom:12,color:'var(--tj-text)'}}>{q.enunciado.slice(0,260)}{q.enunciado.length>260?'...':''}</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {['A','B','C','D'].map((l,li)=>{
                        const opt=[q.opcao_a,q.opcao_b,q.opcao_c,q.opcao_d][li]
                        const certa=q.resposta_correta===l
                        return opt?<div key={l} style={{fontSize:11,padding:'5px 10px',borderRadius:6,background:certa?'rgba(76,175,125,0.1)':'rgba(255,255,255,0.03)',border:`1px solid ${certa?'var(--success)':'rgba(255,255,255,0.07)'}`,color:certa?'var(--success)':'var(--text-muted)',flex:'1 1 40%',lineHeight:1.5}}><strong>{l})</strong> {opt.slice(0,70)}{opt.length>70?'...':''}</div>:null
                      })}
                    </div>
                    {q.comentario&&<div style={{marginTop:10,padding:'10px 12px',background:'rgba(212,168,67,0.05)',border:'1px solid rgba(212,168,67,0.12)',borderRadius:8,fontSize:11,color:'var(--text-muted)',lineHeight:1.6}}>💡 <ComentarioComLei texto={q.comentario}/></div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO: Flashcards */}
          {flashBusca.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'#8B5CF6',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                🃏 FLASHCARDS
                <span style={{fontSize:10,background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.2)',color:'#8B5CF6',padding:'2px 8px',borderRadius:100}}>{flashBusca.length}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                {flashBusca.map(f=>(
                  <div key={f.id} style={{background:'var(--gray)',border:'1px solid rgba(139,92,246,0.15)',borderRadius:14,padding:'16px'}}>
                    <div style={{fontSize:11,color:'#8B5CF6',fontWeight:700,marginBottom:8}}>{f.disciplina}</div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--tj-text)',marginBottom:8,lineHeight:1.5}}>{f.frente.slice(0,120)}{f.frente.length>120?'...':''}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6,paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.06)'}}>{f.verso.slice(0,120)}{f.verso.length>120?'...':''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ── PROGRAMA TIGRE EMBAIXADOR ────────────────────────────────────────────────
const REFERRAL_TIERS = [
  {count:1, badge:'Recrutador',         icon:'🎯', reward:'15 dias extras',      cor:'#CD7F32'},
  {count:3, badge:'Embaixador Bronze',  icon:'🥉', reward:'45 dias extras',      cor:'#CD7F32'},
  {count:5, badge:'Embaixador Prata',   icon:'🥈', reward:'75 dias extras',      cor:'#C0C0C0'},
  {count:10,badge:'Embaixador Ouro',    icon:'👑', reward:'Elite por 6 meses',   cor:'var(--gold)'},
]

function ReferralPage({profile,showUpgrade,isPago}:any){
  const [copiado,setCopiado]=useState(false)
  const [saldo,setSaldo]=useState(0)
  const [extrato,setExtrato]=useState<any[]>([])
  const [ativos,setAtivos]=useState(0)
  const [loading,setLoading]=useState(false)
  const [uPlano,setUPlano]=useState('pro')
  const [uCiclo,setUCiclo]=useState('mensal')
  const [uPresente,setUPresente]=useState(false)
  const [uEmail,setUEmail]=useState('')
  const [usando,setUsando]=useState(false)
  const [uMsg,setUMsg]=useState<{tipo:string,txt:string}|null>(null)

  const refLink = typeof window!=='undefined'
    ? `${window.location.origin}/login?ref=${profile?.referral_code||''}`
    : `https://www.tigerjus.com.br/login?ref=${profile?.referral_code||''}`

  const pctAtual = ativos>=10?10:ativos>=5?7:ativos>=2?5:3
  const TIERS=[{pct:3,label:'1 indicado ativo'},{pct:5,label:'2 a 4 ativos'},{pct:7,label:'5 a 9 ativos'},{pct:10,label:'10+ ativos'}]
  const PRECOS:Record<string,number>={start:4.99,pro:9.99,elite:24.99}
  const precoUso = uCiclo==='anual' ? Math.round(PRECOS[uPlano]*12*100)/100 : PRECOS[uPlano]

  const carregar=async()=>{
    if(!profile?.id)return
    setLoading(true)
    const {data:cart}=await supabase.from('carteira_creditos').select('saldo').eq('user_id',profile.id).maybeSingle()
    setSaldo(Number(cart?.saldo)||0)
    const {data:tx}=await supabase.from('carteira_transacoes').select('*').eq('user_id',profile.id).order('criado_em',{ascending:false}).limit(30)
    setExtrato(tx||[])
    if(profile?.referral_code){
      const {count}=await supabase.from('profiles').select('id',{count:'exact',head:true}).eq('referred_by',profile.referral_code).neq('plano','gratuito')
      setAtivos(count||0)
    }
    setLoading(false)
  }
  useEffect(()=>{carregar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[profile?.id,profile?.referral_code])

  const usarCredito=async()=>{
    if(usando)return
    if(uPresente && !uEmail.trim()){setUMsg({tipo:'erro',txt:'Digite o e-mail de quem vai receber.'});return}
    setUsando(true);setUMsg(null)
    try{
      const{data:{session}}=await supabase.auth.getSession()
      const res=await fetch('/api/carteira/usar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify({plano:uPlano,ciclo:uCiclo,...(uPresente?{alvo_email:uEmail.trim()}:{})})})
      const data=await res.json()
      if(res.ok&&data.ok){
        setUMsg({tipo:'ok',txt:uPresente?`Assinatura ${uPlano.toUpperCase()} presenteada para ${uEmail.trim()}! 🎁`:`Sua assinatura ${uPlano.toUpperCase()} foi ativada com o crédito! 🎉`})
        setUEmail('')
        await carregar()
      }else{
        setUMsg({tipo:'erro',txt:data.error||'Não foi possível concluir.'})
      }
    }catch{setUMsg({tipo:'erro',txt:'Erro de conexão. Tente de novo.'})}
    finally{setUsando(false)}
  }

  const copiarLink=async()=>{
    try{
      if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(refLink)}
      else{const t=document.createElement('textarea');t.value=refLink;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t)}
      setCopiado(true);setTimeout(()=>setCopiado(false),2500)
    }catch{alert('Copie o link manualmente: '+refLink)}
  }
  const fmt=(v:number)=>`R$ ${(Math.round(v*100)/100).toFixed(2).replace('.',',')}`
  const LBL:React.CSSProperties={fontSize:10,fontWeight:800,letterSpacing:'2px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:12}
  const inp:React.CSSProperties={flex:'1 1 120px',background:'var(--field-bg)',border:'1px solid var(--tj-border)',borderRadius:10,padding:'11px 14px',color:'var(--field-fg)',fontSize:13,colorScheme:'var(--field-scheme)' as any}

  return(
    <div style={{padding:'24px 20px',flex:1,overflowY:'auto'}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(22px,5vw,32px)',fontWeight:900,marginBottom:6}}>Programa Tigre Embaixador 🐯</h1>
      <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24}}>Indique amigos e ganhe <b>comissão em R$</b> toda vez que eles pagarem. Quanto mais indicados ativos, maior a sua porcentagem.</p>

      <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.14),rgba(232,98,26,0.06))',border:'1px solid rgba(212,168,67,0.3)',borderRadius:18,padding:'22px 24px',marginBottom:20}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:'2px',textTransform:'uppercase',color:'var(--gold)',marginBottom:6}}>💰 Minha carteira</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:40,fontWeight:900,lineHeight:1,marginBottom:12}}>{fmt(saldo)}</div>
        <div style={{display:'flex',gap:20,flexWrap:'wrap',fontSize:13,color:'var(--text-muted)'}}>
          <span><b style={{color:'#fff'}}>{ativos}</b> indicado{ativos!==1?'s':''} ativo{ativos!==1?'s':''}</span>
          <span>comissão atual: <b style={{color:'var(--gold)'}}>{pctAtual}%</b></span>
        </div>
      </div>

      <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:16,padding:20,marginBottom:20}}>
        <div style={LBL}>💳 Usar meu crédito</div>
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          <button onClick={()=>{setUPresente(false);setUMsg(null)}} style={{flex:1,padding:'10px',borderRadius:10,border:`1px solid ${!uPresente?'var(--gold)':'rgba(255,255,255,0.1)'}`,background:!uPresente?'rgba(212,168,67,0.1)':'transparent',color:'var(--white)',fontSize:13,fontWeight:700,cursor:'pointer'}}>Minha assinatura</button>
          <button onClick={()=>{setUPresente(true);setUMsg(null)}} style={{flex:1,padding:'10px',borderRadius:10,border:`1px solid ${uPresente?'var(--gold)':'rgba(255,255,255,0.1)'}`,background:uPresente?'rgba(212,168,67,0.1)':'transparent',color:'var(--white)',fontSize:13,fontWeight:700,cursor:'pointer'}}>🎁 Presentear</button>
        </div>
        {uPresente&&(
          <input value={uEmail} onChange={e=>setUEmail(e.target.value)} placeholder="E-mail de quem vai receber (conta já existente)" style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'11px 14px',color:'#fff',fontSize:13,marginBottom:12}}/>
        )}
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          <select value={uPlano} onChange={e=>setUPlano(e.target.value)} style={inp}>
            <option value="start">Start</option><option value="pro">Pro</option><option value="elite">Elite</option>
          </select>
          <select value={uCiclo} onChange={e=>setUCiclo(e.target.value)} style={inp}>
            <option value="mensal">Mensal (30 dias)</option><option value="anual">Anual (12 meses)</option>
          </select>
        </div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>Custo: <b style={{color:'#fff'}}>{fmt(precoUso)}</b> · Seu saldo: <b style={{color:saldo>=precoUso?'var(--success)':'var(--danger)'}}>{fmt(saldo)}</b></div>
        {uMsg&&<div style={{fontSize:12.5,padding:'11px 14px',borderRadius:10,marginBottom:12,lineHeight:1.5,background:uMsg.tipo==='ok'?'rgba(76,175,125,0.1)':'rgba(232,66,26,0.1)',color:uMsg.tipo==='ok'?'var(--success)':'var(--danger)',border:`1px solid ${uMsg.tipo==='ok'?'rgba(76,175,125,0.3)':'rgba(232,66,26,0.3)'}`}}>{uMsg.txt}</div>}
        <button className="btn-gold-sm" style={{width:'100%',fontSize:13,opacity:(saldo<precoUso||usando)?0.5:1,cursor:(saldo<precoUso||usando)?'default':'pointer'}} disabled={saldo<precoUso||usando} onClick={usarCredito}>{usando?'Processando…':saldo<precoUso?'Saldo insuficiente':`Usar ${fmt(precoUso)} do crédito`}</button>
        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:10,lineHeight:1.5}}>Sem tirar dinheiro: o crédito vira assinatura na plataforma — sua ou de quem você quiser presentear. Se a pessoa já for assinante, os dias somam ao vencimento.</div>
      </div>

      <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:16,padding:20,marginBottom:24}}>
        <div style={LBL}>Seu link de indicação</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input readOnly value={refLink} style={{flex:'1 1 220px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'11px 14px',color:'#fff',fontSize:13}}/>
          <button className="btn-gold-sm" style={{fontSize:12}} onClick={copiarLink}>{copiado?'✓ Copiado':'Copiar link'}</button>
        </div>
      </div>

      <div style={{marginBottom:24}}>
        <div style={LBL}>Comissão por indicados ativos</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10}}>
          {TIERS.map(t=>{const aqui=pctAtual===t.pct;return(
            <div key={t.pct} style={{background:aqui?'rgba(212,168,67,0.1)':'var(--gray)',border:`1px solid ${aqui?'var(--gold)':'rgba(255,255,255,0.06)'}`,borderRadius:14,padding:'14px 12px',textAlign:'center'}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:900,color:'var(--gold)'}}>{t.pct}%</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{t.label}</div>
              {aqui&&<div style={{fontSize:10,color:'var(--success)',fontWeight:700,marginTop:6}}>✓ você está aqui</div>}
            </div>
          )})}
        </div>
        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:10,lineHeight:1.6}}>A porcentagem é calculada pelos indicados que estão <b>pagando naquele mês</b>. Se um cancelar, sua base cai; se renovar, sobe. A comissão incide sobre o valor líquido de cada pagamento e é recorrente enquanto o indicado continuar assinante.</div>
      </div>

      <div>
        <div style={LBL}>Extrato da carteira</div>
        {loading&&<div style={{fontSize:13,color:'var(--text-muted)'}}>Carregando…</div>}
        {!loading&&extrato.length===0&&(
          <div style={{border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:14,padding:20,textAlign:'center',fontSize:13,color:'var(--text-muted)'}}>Ainda sem movimentações. Quando um indicado pagar, a comissão aparece aqui. 💸</div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {extrato.map(t=>(
            <div key={t.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,border:'1.5px solid transparent',background:'linear-gradient(var(--gray),var(--gray)) padding-box,linear-gradient(135deg,var(--gold-light),var(--gold),var(--gold-dark)) border-box',borderRadius:12,padding:'12px 16px'}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700}}>{t.tipo==='comissao'?`Comissão ${t.percentual_aplicado}%`:(t.descricao||t.tipo)}</div>
                <div style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(t.criado_em).toLocaleDateString('pt-BR')}{t.valor_bruto?` · indicado pagou ${fmt(Number(t.valor_bruto))}`:''}</div>
              </div>
              <div style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:900,color:Number(t.valor)>=0?'var(--success)':'var(--danger)',whiteSpace:'nowrap'}}>{Number(t.valor)>=0?'+':''}{fmt(Number(t.valor))}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default function TigerJusApp() {
  const router=useRouter()
  const { settings } = useAppSettings()
  const [profile,setProfile]=useState<Profile|null>(null)
  const [page,setPage]=useState('dashboard')
  const [navHist,setNavHist]=useState<string[]>([])
  const [showPremiumGate,setShowPremiumGate]=useState(false)
  const [showUpgradeModal,setShowUpgradeModal]=useState(false)
  const [showRadar,setShowRadar]=useState(false)
  const [simIntentMini,setSimIntentMini]=useState(false)
  const [freeQ,setFreeQ]=useState(15)
  const [freeIA,setFreeIA]=useState(5)
  const [notif,setNotif]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [menuOpen,setMenuOpen]=useState(false)

  // ── Botão de tema claro (liga/desliga, por usuário, sem reload) ──────────────
  // Guarda a escolha em localStorage; o ThemeProvider lê essa chave e aplica.
  // O evento 'tj-theme-toggle' faz o tema virar na hora, sem recarregar a página.
  const [claroOn,setClaroOn]=useState(false)
  useEffect(()=>{ if(typeof window!=='undefined') setClaroOn(window.localStorage.getItem('tj-user-theme')==='claro') },[])
  const toggleClaro=()=>{
    const next=!claroOn
    setClaroOn(next)
    try{
      if(next) window.localStorage.setItem('tj-user-theme','claro')
      else window.localStorage.removeItem('tj-user-theme')
      window.dispatchEvent(new Event('tj-theme-toggle'))
    }catch(e){}
  }

  const plano=profile?.plano
  const [onlineIds,setOnlineIds]=useState<string[]>([])
  const [mencoes,setMencoes]=useState(0)
  const userIsPago=!!(isAdmin(profile?.role)||isPago(plano))
  const canAccessPremium=!!(isAdmin(profile?.role)||canAccess(plano,'pro'))
  const canAccessElite=!!(isAdmin(profile?.role)||canAccess(plano,'elite'))
  const limites=getLimites(plano)
  const iaIlimitada=isAdmin(profile?.role)||false // Elite limitado a 500/dia pelo backend (plan_settings)
  const podePDF=!!(isAdmin(profile?.role)||limites.permite_pdf)
  const NAV_REQ:Record<string,'start'|'pro'|'elite'>={ia:'start',flashcards:'start',resumos:'start',indice:'pro',trilhas:'pro',radar:'elite'}
  const navLocked=(k:string)=>{const r=NAV_REQ[k];return r?!(isAdmin(profile?.role)||canAccess(plano,r)):false}

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
      // ── REFERRAL: captura ref_code do metadata e grava em profiles.referred_by ──
      let profileAtualizado={...data}
      try{
        if(!data.referred_by){
          const refLocal=typeof window!=='undefined'?localStorage.getItem('tj_ref'):null
          const{data:{user}}=await supabase.auth.getUser()
          const refMeta=user?.user_metadata?.ref_code||null
          const finalRef=refMeta||refLocal
          if(finalRef&&finalRef!==data.referral_code){
            await supabase.from('profiles').update({referred_by:finalRef}).eq('id',userId)
            profileAtualizado.referred_by=finalRef
            if(typeof window!=='undefined')localStorage.removeItem('tj_ref')
          }
        }
        // Gera referral_code se ainda não existe
        if(!data.referral_code){
          const newCode='TJ-'+Math.random().toString(36).substring(2,10).toUpperCase()
          await supabase.from('profiles').update({referral_code:newCode}).eq('id',userId)
          profileAtualizado.referral_code=newCode
        }
      }catch(e){console.warn('Referral setup error (non-critical):',e)}
      setProfile(profileAtualizado as Profile)
      const l=getLimites(data.plano)
      if(isAdmin(data.role)){setFreeQ(Infinity);setFreeIA(Infinity)}
      else{setFreeQ(Math.max(0,l.questoes-(data.free_questions_used||0)));setFreeIA(Math.max(0,l.ia-(data.free_ia_used||0)))}
    }
    setLoading(false)
    if(data){
      const today=new Date().toISOString().split('T')[0]
      if(data.ultimo_acesso!==today){const{data:{session:sess}}=await supabase.auth.getSession();await fetch('/api/xp',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${sess?.access_token||''}`},body:JSON.stringify({userId,action:'daily_login'})})}
    }
    setTimeout(()=>setNotif(settings.welcome_message||'🔥 Bem-vindo de volta! Continue sua jornada jurídica.'),1000)
  }

  const handleXp=async(action:string)=>{
    if(!profile)return
    const{data:{session}}=await supabase.auth.getSession()
    const res=await fetch('/api/xp',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify({userId:profile.id,action})})
    const data=await res.json()
    if(data.leveled_up)setNotif(`🎉 Você subiu para ${data.level.name}! +${data.xp_earned} XP`)
    else if(data.xp_earned>0)setNotif(`+${data.xp_earned} XP ganho!`)
    setProfile(prev=>{
      if(!prev)return prev
      const incR=action==='question_correct'||action==='question_wrong'
      const incC=action==='question_correct'
      return{...prev,xp:data.total_xp??prev.xp,streak:data.streak??prev.streak,questoes_respondidas:(prev.questoes_respondidas||0)+(incR?1:0),questoes_corretas:(prev.questoes_corretas||0)+(incC?1:0)}
    })
  }

  const handleLogout=async()=>{await supabase.auth.signOut();router.push('/')}
  // ── ANALYTICS: rastreador de eventos (marketing) ──
  const [sessao]=useState(()=> Math.random().toString(36).slice(2)+Date.now().toString(36))
  const trackEvent=(evento:string,aba?:string,meta?:any)=>{
    // admin não polui as métricas de marketing
    try{ if(profile?.id && profile?.role!=='admin'){ supabase.from('analytics_eventos').insert({user_id:profile.id,sessao,evento,aba:aba??null,plano:(profile as any)?.plano??null,meta:meta??{}}).then(()=>{},()=>{}) } }catch{}
  }
  const handleUpgradeSelect=(planId:string,ciclo:'mensal'|'anual'='mensal')=>{trackEvent('checkout_start',undefined,{plan:planId,ciclo});setShowUpgradeModal(false);router.push(`/checkout?plan=${planId}&ciclo=${ciclo}`)}
  const showUpgrade=()=>{setShowPremiumGate(false);setShowUpgradeModal(true);trackEvent('upgrade_click',page)}
  const navOrRadar=(key:string)=>{ if(key==='radar'){ canAccessElite?setShowRadar(true):showUpgrade() } else navTo(key) }
  const navTo=(key:string)=>{ setNavHist(h=> key===page ? h : [...h,page].slice(-50)); setPage(key); setMenuOpen(false); trackEvent('page_view',key) }
  useEffect(()=>{ if(!profile?.id) return; trackEvent('session_start'); trackEvent('page_view',page); const iv=setInterval(()=>{ if(typeof document==='undefined'||document.visibilityState==='visible') trackEvent('session_ping') },45000); return ()=>clearInterval(iv) },[profile?.id])

  // Presença GLOBAL (quem está usando a plataforma agora) + contador de menções não lidas
  useEffect(()=>{
    const uid=profile?.id
    if(!uid) return
    const pl=String(profile?.plano||'').toLowerCase()
    const podeCom = pl==='pro'||pl==='elite'||profile?.role==='admin'
    const pres=supabase.channel('plataforma-online',{config:{presence:{key:uid}}})
      .on('presence',{event:'sync'},()=>{ const st:Record<string,any[]>=pres.presenceState(); setOnlineIds(Object.keys(st)) })
      .subscribe(async(status:string)=>{ if(status==='SUBSCRIBED'){ await pres.track({user_id:uid}) } })
    let notifCh:any=null
    if(podeCom){
      supabase.from('chat_notificacoes').select('id',{count:'exact',head:true}).eq('user_id',uid).eq('lida',false).then(({count}:any)=>setMencoes(count||0))
      notifCh=supabase.channel('minhas-notif-'+uid)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_notificacoes',filter:'user_id=eq.'+uid},()=>setMencoes((c:number)=>c+1))
        .subscribe()
    }
    return ()=>{ supabase.removeChannel(pres); if(notifCh) supabase.removeChannel(notifCh) }
  },[profile?.id])

  // Ao abrir a Comunidade, marca menções como lidas (badge some)
  useEffect(()=>{
    if(page==='comunidade' && profile?.id){
      supabase.from('chat_notificacoes').update({lida:true}).eq('user_id',profile.id).eq('lida',false).then(()=>{})
      setMencoes(0)
    }
  },[page,profile?.id])
  const goBack=()=>{
    if(navHist.length>0){
      const prev=navHist[navHist.length-1]
      setNavHist(navHist.slice(0,-1))
      setPage(prev)
    }else{
      setPage('dashboard')
    }
    setMenuOpen(false)
  }

  if(loading) return(
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16,animation:'pulse 1.5s infinite'}}>🐯</div><div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,color:'var(--gold)'}}>Carregando TigerJus...</div></div>
    </div>
  )

  const SIDEBAR_GROUPS=[
    {title:'',items:[{icon:'🏠',label:'Início',key:'dashboard'}]},
    {title:'ESTUDAR',items:[
      {icon:'📝',label:'Quiz',key:'quiz'},
      {icon:'📋',label:'Simulados',key:'simulados'},
      {icon:'🃏',label:'Flashcards',key:'flashcards'},
      {icon:'📚',label:'Disciplinas',key:'disciplines'},
      {icon:'📒',label:'Resumos',key:'resumos'},
      {icon:'📖',label:'Índice',key:'indice'},
      {icon:'📜',label:'Lei Seca',key:'leis'},
      {icon:'🧭',label:'Trilhas',key:'trilhas'},
    ]},
    {title:'INTELIGÊNCIA',items:[{icon:'🤖',label:'Tutor IA',key:'ia'},{icon:'🎯',label:'Radar',key:'radar'}]},
    {title:'EVOLUIR',items:[
      {icon:'🏆',label:'Ranking',key:'ranking'},
      {icon:'💬',label:'Comunidade',key:'comunidade'},
      {icon:'👤',label:'Meu Perfil',key:'perfil'},
      {icon:'🐯',label:'Indicar',key:'referral'},
    ]},
  ]
  const SIDEBAR=SIDEBAR_GROUPS.flatMap(g=>g.items)
  const planoDisplay=profile?.plano?.charAt(0).toUpperCase()+(profile?.plano?.slice(1)||'')||'Gratuito'

  return(
    <div style={{background:'var(--tj-bg,#060a12)',minHeight:'100vh',position:'relative'}}>
      <div className="tj-grid-overlay"/>
      <div className="tj-radial-glow" style={{zIndex:0}}/>
      {settings.maintenance_mode&&!isAdmin(profile?.role)&&(
        <div style={{position:'fixed',inset:0,zIndex:9999,background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{textAlign:'center',maxWidth:420}}>
            <div style={{fontSize:64,marginBottom:20}}>🔧</div>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:'var(--gold)',marginBottom:12}}>Em manutenção</h1>
            <p style={{fontSize:15,color:'var(--text-muted)',lineHeight:1.7,marginBottom:28}}>{settings.maintenance_message||'Voltamos em breve. Obrigado pela paciência!'}</p>
            {settings.whatsapp_url&&<a href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:8,background:'#25D366',border:'none',borderRadius:10,padding:'12px 24px',color:'#fff',fontSize:14,fontWeight:700,textDecoration:'none'}}>💬 Falar com o suporte</a>}
          </div>
        </div>
      )}
      {notif&&<Notification msg={notif} onClose={()=>setNotif(null)}/>}
      {showPremiumGate&&<PremiumGate onClose={()=>setShowPremiumGate(false)} onUpgrade={showUpgrade}/>}
      {showUpgradeModal&&<UpgradeModal onClose={()=>setShowUpgradeModal(false)} onSelect={handleUpgradeSelect} planoAtual={profile?.plano} ehAdmin={isAdmin(profile?.role)}/>}
      {showRadar&&<RadarModal onClose={()=>setShowRadar(false)} podePDF={podePDF} freeQ={freeQ} setFreeQ={setFreeQ} showUpgrade={showUpgrade} onXp={handleXp} onEstudar={(d)=>{_radarTarget=d;_radarTargetTab='quiz';setShowRadar(false);setPage('disciplines')}}/>}
      {settings.whatsapp_url&&!settings.maintenance_mode&&(
        <a href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer" title="Falar com suporte" style={{position:'fixed',bottom:24,right:24,zIndex:150,width:52,height:52,borderRadius:'50%',background:'#25D366',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(37,211,102,0.4)',textDecoration:'none',fontSize:24,transition:'transform 0.2s'}} onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.1)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>💬</a>
      )}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',height:60,background:'var(--tj-nav-bg)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--tj-border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {page!=='dashboard'&&(
            <button onClick={goBack} title="Voltar" aria-label="Voltar"
              style={{display:'flex',alignItems:'center',gap:6,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'var(--deep-black)',border:'none',borderRadius:10,padding:'8px 13px',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:800,fontSize:13,flexShrink:0,boxShadow:'0 2px 12px rgba(212,168,67,0.35)',transition:'transform 0.15s,box-shadow 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(212,168,67,0.5)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 2px 12px rgba(212,168,67,0.35)'}}>
              <span style={{fontSize:17,lineHeight:1,fontWeight:900}}>←</span>
              <span className="nav-desktop" style={{whiteSpace:'nowrap'}}>Voltar</span>
            </button>
          )}
          {settings.logo_url
            ? <img src={settings.logo_url} alt={settings.site_name||'TigerJus'} style={{width:34,height:34,borderRadius:8,objectFit:'contain',flexShrink:0}}/>
            : <div style={{width:34,height:34,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:16,fontWeight:900,color:'var(--deep-black)',flexShrink:0}}>T</div>}
          <span style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
        </div>
        <div className="nav-desktop tj-nav-items" style={{display:'flex',gap:'clamp(8px,1vw,14px)',alignItems:'center'}}>
          {SIDEBAR.map(i=>(<button key={i.key} onClick={()=>navLocked(i.key)?showUpgrade():navOrRadar(i.key)} style={{color:page===i.key?'var(--gold)':'var(--text-muted)',fontSize:'clamp(9px,0.85vw,11px)',fontWeight:600,letterSpacing:'clamp(0.5px,0.1vw,1px)',textTransform:'uppercase',border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)',borderBottom:page===i.key?'2px solid var(--gold)':'2px solid transparent',paddingBottom:2,whiteSpace:'nowrap'}}>{i.label}{navLocked(i.key)?' 🔒':''}</button>))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={toggleClaro} title={claroOn?'Voltar ao tema escuro':'Ativar tema claro'} aria-label="Alternar tema claro"
            style={{background:claroOn?'linear-gradient(135deg,var(--gold),var(--orange))':'none',border:'1px solid rgba(212,168,67,0.35)',borderRadius:8,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,flexShrink:0,transition:'all 0.2s',lineHeight:1}}>
            {claroOn?'🌙':'☀️'}
          </button>
          <span className="nav-desktop" style={{fontSize:12,color:'var(--text-muted)'}}>{profile?.nome?.split(' ')[0]||'Usuário'}</span>
          <button className="btn-gold-sm nav-desktop" onClick={()=>setShowUpgradeModal(true)} style={{fontSize:11}}>🚀 {planoDisplay.toUpperCase()}</button>
          <button onClick={handleLogout} className="nav-desktop" style={{color:'var(--text-muted)',fontSize:11,border:'none',background:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}>Sair</button>
          <button className="nav-mobile" onClick={()=>setMenuOpen(o=>!o)} style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,width:36,height:36,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,cursor:'pointer',padding:8}}>
            <span style={{display:'block',width:18,height:2,background:'var(--tj-text)',borderRadius:2,transition:'all 0.2s',transform:menuOpen?'rotate(45deg) translate(5px,5px)':'none'}}/>
            <span style={{display:'block',width:18,height:2,background:'var(--tj-text)',borderRadius:2,transition:'all 0.2s',opacity:menuOpen?0:1}}/>
            <span style={{display:'block',width:18,height:2,background:'var(--tj-text)',borderRadius:2,transition:'all 0.2s',transform:menuOpen?'rotate(-45deg) translate(5px,-5px)':'none'}}/>
          </button>
        </div>
      </nav>
      {menuOpen&&(
        <div style={{position:'fixed',top:60,left:0,right:0,zIndex:99,background:'var(--tj-nav-bg)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--tj-border)',padding:'12px 0',display:'flex',flexDirection:'column'}}>
          {SIDEBAR_GROUPS.map(g=>(
            <div key={g.title||'inicio'}>
              {g.title&&<div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--text-dim)',padding:'12px 20px 4px'}}>{g.title}</div>}
              {g.items.map(item=>(<button key={item.key} onClick={()=>navLocked(item.key)?showUpgrade():navOrRadar(item.key)} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',width:'100%',background:page===item.key?'rgba(212,168,67,0.08)':'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:15,color:page===item.key?'var(--gold)':'var(--tj-text)',textAlign:'left',borderLeft:page===item.key?'3px solid var(--gold)':'3px solid transparent'}}><span style={{fontSize:18,width:24,textAlign:'center'}}>{item.icon}</span>{item.label}{item.key==='comunidade'&&mencoes>0?<span style={{marginLeft:8,background:'var(--danger)',color:'#fff',fontSize:10,fontWeight:800,borderRadius:100,padding:'1px 7px'}}>{mencoes}</span>:null}{navLocked(item.key)&&<span style={{marginLeft:'auto',fontSize:12}}>🔒</span>}</button>))}
            </div>
          ))}
          {/* ── Admin link — apenas para usuários admin ── */}
          {isAdmin(profile?.role)&&(
            <button onClick={()=>{router.push('/admin');setMenuOpen(false)}}
              style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',
                background:'rgba(212,168,67,0.05)',border:'none',cursor:'pointer',
                fontFamily:'var(--font-body)',fontSize:15,color:'var(--gold)',
                textAlign:'left',borderLeft:'3px solid rgba(212,168,67,0.4)',
                borderTop:'1px solid rgba(255,255,255,0.05)'}}>
              <span style={{fontSize:18,width:24,textAlign:'center'}}>⚙️</span>
              <span style={{fontWeight:700}}>Painel Admin</span>
            </button>
          )}
          <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',margin:'8px 0',padding:'8px 20px',display:'flex',gap:10}}>
            <button className="btn-gold-sm" style={{flex:1,fontSize:12}} onClick={()=>{setShowUpgradeModal(true);setMenuOpen(false)}}>🚀 UPGRADE</button>
            <button onClick={()=>{handleLogout();setMenuOpen(false)}} style={{color:'var(--text-muted)',fontSize:12,border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 14px',background:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}>Sair</button>
          </div>
        </div>
      )}
      <div style={{display:'flex',paddingTop:60,minHeight:'100vh'}}>
        <aside className="dash-sidebar nav-desktop tj-sidebar">
          {SIDEBAR_GROUPS.map(g=>(
            <div key={g.title||'inicio'}>
              {g.title&&<div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-dim)',padding:'12px 14px 6px',marginTop:4}}>{g.title}</div>}
              {g.items.map(item=>(<button key={item.key} className={`sidebar-item${page===item.key?' active':''}`} onClick={()=>navLocked(item.key)?showUpgrade():navOrRadar(item.key)}><span style={{fontSize:17,width:24,textAlign:'center'}}>{item.icon}</span> {item.label}{item.key==='comunidade'&&mencoes>0?<span style={{marginLeft:8,background:'var(--danger)',color:'#fff',fontSize:10,fontWeight:800,borderRadius:100,padding:'1px 7px'}}>{mencoes}</span>:null}{navLocked(item.key)&&<span style={{marginLeft:'auto',fontSize:12}}>🔒</span>}</button>))}
            </div>
          ))}
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-dim)',padding:'12px 14px 6px',marginTop:8}}>CONTA</div>
          {isAdmin(profile?.role)&&<button className="sidebar-item" onClick={()=>router.push('/admin')}>⚙️ Admin Panel</button>}
          <button className="sidebar-item" onClick={handleLogout}>🚪 Sair</button>
          {(settings.whatsapp_url||settings.instagram_url||settings.youtube_url||settings.tiktok_url||settings.telegram_url)&&(
            <div style={{padding:'8px 12px 0'}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--text-dim)',marginBottom:6}}>SUPORTE</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[
                  {url:settings.instagram_url,iconUrl:settings.instagram_icon_url,emoji:'📸',label:'Instagram',bg:'rgba(212,168,67,0.08)',bd:'rgba(212,168,67,0.2)'},
                  {url:settings.whatsapp_url,iconUrl:settings.whatsapp_icon_url,emoji:'💬',label:'WhatsApp',bg:'#25D36618',bd:'#25D36633'},
                  {url:settings.youtube_url,iconUrl:settings.youtube_icon_url,emoji:'▶️',label:'YouTube',bg:'rgba(248,113,113,0.08)',bd:'rgba(248,113,113,0.2)'},
                  {url:settings.tiktok_url,iconUrl:settings.tiktok_icon_url,emoji:'🎵',label:'TikTok',bg:'rgba(255,255,255,0.06)',bd:'rgba(255,255,255,0.18)'},
                  {url:settings.telegram_url,iconUrl:settings.telegram_icon_url,emoji:'✈️',label:'Telegram',bg:'rgba(96,165,250,0.08)',bd:'rgba(96,165,250,0.2)'},
                ].filter(s=>s.url).map(s=>(
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label} style={{width:32,height:32,borderRadius:8,background:s.bg,border:`1px solid ${s.bd}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,textDecoration:'none',overflow:'hidden'}}>
                    {s.iconUrl?<img src={s.iconUrl} alt={s.label} style={{width:20,height:20,objectFit:'contain'}}/>:<span>{s.emoji}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}
          <div style={{marginTop:'auto',padding:'20px 12px 0'}}>
            <div style={{background:'var(--tj-card-bg,rgba(12,20,40,0.85))',border:'1px solid var(--tj-card-border,rgba(99,130,200,0.18))',borderRadius:12,padding:14,backdropFilter:'blur(8px)'}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)',marginBottom:5}}>{planoDisplay.toUpperCase()}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:10}}>{limites.questoes===Infinity?'Questões ilimitadas':`${freeQ} questões`} · {limites.ia===Infinity?'IA ilimitada':`${freeIA} perguntas IA`}</div>
              {!userIsPago&&<button className="btn-gold-sm" style={{width:'100%',fontSize:11}} onClick={()=>setShowUpgradeModal(true)}>🚀 FAZER UPGRADE</button>}
            </div>
          </div>
        </aside>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column'}}>
          <div style={{padding:'0 20px'}}><DashTicker/></div>
        {page==='dashboard'&&<DashHome profile={profile} onNav={navTo} onMini={()=>{setSimIntentMini(true);navTo('simulados')}} showUpgrade={showUpgrade} isPago={userIsPago} canAccessPremium={canAccessPremium} canAccessElite={canAccessElite} onOpenRadar={()=>setShowRadar(true)} freeQ={freeQ} freeIA={freeIA} limites={limites} onXp={handleXp}/>}
        {page==='disciplines'&&<DisciplinesPage showUpgrade={showUpgrade} profile={profile} isPago={userIsPago} canAccessPremium={canAccessPremium} podePDF={podePDF} freeQ={freeQ} setFreeQ={setFreeQ} onXp={handleXp}/>}
        {page==='quiz'&&<QuizPage freeQ={freeQ} setFreeQ={setFreeQ} showUpgrade={showUpgrade} onXp={handleXp} profile={profile} isPago={userIsPago}/>}
        {page==='flashcards'&&<FlashCardsPage isPago={userIsPago} showUpgrade={showUpgrade}/>}
        {page==='simulados'&&<SimuladosPage showUpgrade={showUpgrade} freeQ={freeQ} setFreeQ={setFreeQ} onXp={handleXp} profile={profile} isPago={userIsPago} canAccessElite={canAccessElite} intentMini={simIntentMini} onConsumeIntent={()=>setSimIntentMini(false)}/>}
        {page==='ia'&&<IAPage freeIA={freeIA} setFreeIA={setFreeIA} showUpgrade={showUpgrade} profile={profile} isPago={userIsPago} iaIlimitada={iaIlimitada}/>}
        {page==='ranking'&&<RankingPage profile={profile} onNav={navTo}/>}
        {page==='indice'&&<IndiceJuridico showUpgrade={showUpgrade} isPago={canAccessPremium}/>}
        {page==='leis'&&<LeiSecaPage/>}
        {page==='resumos'&&<ResumosPage profile={profile} showUpgrade={showUpgrade} onNav={navTo}/>}
        {page==='trilhas'&&<TrilhasPage canAccessPremium={canAccessPremium} showUpgrade={showUpgrade} onNav={navTo}/>}
        {page==='referral'&&<ReferralPage profile={profile} showUpgrade={showUpgrade} isPago={userIsPago}/>}
        {page==='comunidade'&&<ComunidadeChat profile={profile} showUpgrade={showUpgrade} onlineIds={onlineIds}/>}
        {page==='perfil'&&<MeuPerfilPage profile={profile} onXp={handleXp} onUpdate={(c:any)=>setProfile((pr:any)=>pr?{...pr,...c}:pr)}/>}
        </div>
      </div>
      <style>{`
        .tj-upgrade-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
        @media(max-width:720px){.tj-upgrade-grid{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:420px){.tj-upgrade-grid{grid-template-columns:1fr;}}
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
