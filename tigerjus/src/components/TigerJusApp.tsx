function SimuladosPage({ showUpgrade, freeQ, setFreeQ, onXp, profile }: any) {
  const [running, setRunning] = useState(false)
  const [cur, setCur] = useState(0)
  const [sel, setSel] = useState<number|null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [time, setTime] = useState(18000) // 5 horas
  const [selectedSimulado, setSelectedSimulado] = useState<any>(null)
  const [provasOAB, setProvasOAB] = useState<any[]>([])
  const [questoesProva, setQuestoesProva] = useState<any[]>([])
  const [loadingProva, setLoadingProva] = useState(false)
  const [tab, setTab] = useState<'oficiais'|'pratica'>('oficiais')

  const isElite = profile?.role === 'admin' || profile?.plano === 'elite' || profile?.plano === 'premium'

  const SIMULADOS_PRATICA = [
    {icon:'⚡',t:'Mini Simulado — Constitucional',info:'5 questões · 15min · Grátis',tags:['Grátis'],lock:false,questions:QUESTIONS.slice(0,5)},
    {icon:'🔥',t:'Simulado Intensivo — Penal',info:'30 questões · 45min',tags:['Intensivo'],lock:true,questions:[]},
    {icon:'📝',t:'Simulado OAB 2ª Fase',info:'Peça jurídica · 5h',tags:['OAB'],lock:true,questions:[]},
    {icon:'📜',t:'Ética e Estatuto OAB',info:'20 questões · 30min',tags:['OAB'],lock:true,questions:[]},
    {icon:'🏛️',t:'Simulado Geral',info:'60 questões · 4h',tags:['Completo'],lock:true,questions:[]},
  ]

  useEffect(() => { loadProvas() }, [])

  const loadProvas = async () => {
    const { data } = await supabase.from('provas_oab').select('*').eq('status', 'ativo').order('numero_exame', { ascending: false })
    if (data) setProvasOAB(data)
  }

  const iniciarProvaOficial = async (prova: any) => {
    if (!isElite) { showUpgrade(); return }
    setLoadingProva(true)
    const { data } = await supabase.from('questoes_oab').select('*').eq('prova_id', prova.id).order('numero_questao')
    if (data && data.length > 0) {
      const questoesFormatadas = data.map(q => ({
        id: q.id,
        disc: q.disciplina,
        dificuldade: 'OAB Oficial',
        q: q.enunciado,
        opts: [q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d],
        correct: ['A','B','C','D'].indexOf(q.resposta_correta),
        exp: q.comentario || '',
      }))
      setQuestoesProva(questoesFormatadas)
      setSelectedSimulado({ ...prova, questions: questoesFormatadas, oficial: true })
      setRunning(true); setCur(0); setSel(null); setAnswered(false)
      setScore(0); setDone(false); setTime(18000)
    }
    setLoadingProva(false)
  }

  const start = (s: any) => {
    if (s.lock && !isElite) { showUpgrade(); return }
    if (!s.questions || s.questions.length === 0) { showUpgrade(); return }
    setSelectedSimulado(s); setRunning(true); setCur(0); setSel(null)
    setAnswered(false); setScore(0); setDone(false); setTime(900)
  }

  useEffect(() => {
    if (!running || answered || done) return
    const t = setInterval(() => setTime(p => { if(p<=1){clearInterval(t);setDone(true);return 0;} return p-1 }), 1000)
    return () => clearInterval(t)
  }, [running, answered, done, cur])

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
    const horas = Math.floor(mins/60); const minutosRestantes = mins%60
    return (
      <div style={{padding:'32px 40px',flex:1}}>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontSize:13,color:'var(--text-muted)'}}>{selectedSimulado.t || selectedSimulado.edicao} · Q{cur+1}/{selectedSimulado.questions.length}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:18,fontWeight:700,color:time<600?'var(--danger)':'var(--gold)'}}>
              {horas>0?`${String(horas).padStart(2,'0')}:`:''}{String(minutosRestantes).padStart(2,'0')}:{String(secs).padStart(2,'0')}
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,0.06)',borderRadius:100,height:4,marginBottom:28,overflow:'hidden'}}>
            <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,var(--gold),var(--orange))',borderRadius:100,transition:'width 0.4s'}} />
          </div>
          <div style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:36}}>
            <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--gold)'}}>{q.disc}</span>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--text-muted)'}}>· {q.dificuldade}</span>
            </div>
            <div style={{fontSize:17,fontWeight:600,lineHeight:1.7,marginBottom:32}}>{q.q}</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {q.opts.map((opt: string, i: number) => {
                let bg='rgba(255,255,255,0.03)', bc='rgba(255,255,255,0.08)', color='var(--white)'
                if (answered) {
                  if (i===q.correct) { bg='rgba(76,175,125,0.1)'; bc='var(--success)'; color='var(--success)' }
                  else if (i===sel) { bg='rgba(232,66,26,0.1)'; bc='var(--danger)'; color='var(--danger)' }
                }
                return (
                  <button key={i} onClick={() => pick(i)} style={{display:'flex',alignItems:'flex-start',gap:16,background:bg,border:`1px solid ${bc}`,borderRadius:12,padding:'16px 20px',cursor:'pointer',transition:'all 0.2s',textAlign:'left',width:'100%',fontFamily:'var(--font-body)',fontSize:14,color}}>
                    <span style={{width:28,height:28,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,background:'rgba(255,255,255,0.06)',color:'var(--white)'}}>{String.fromCharCode(65+i)}</span>
                    <span style={{flex:1}}>{opt}</span>
                  </button>
                )
              })}
            </div>
            {answered && q.exp && <div style={{marginTop:24,padding:20,background:'rgba(212,168,67,0.06)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:12,fontSize:14,lineHeight:1.7,color:'var(--text-muted)'}}>{sel===q.correct?'✅ ':'❌ '}<strong style={{color:'var(--gold)'}}>{sel===q.correct?'Correto!':'Incorreto.'}</strong> {q.exp}</div>}
            {answered && <button className="btn-primary" style={{width:'100%',marginTop:22}} onClick={next}>{cur+1>=selectedSimulado.questions.length?'VER RESULTADO':'PRÓXIMA →'}</button>}
          </div>
        </div>
      </div>
    )
  }

  if (done && selectedSimulado) {
    const total = selectedSimulado.questions.length
    const rate = Math.round((score/total)*100)
    const aprovado = score >= Math.ceil(total * 0.625) // 62.5% = aprovação OAB
    return (
      <div style={{padding:'32px 40px',flex:1}}>
        <div style={{maxWidth:720,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:68,marginBottom:22}}>{aprovado?'🏆':rate>=50?'📝':'💪'}</div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Simulado Concluído!</h1>
          <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:8}}>{selectedSimulado.edicao || selectedSimulado.t}</p>
          <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:28}}>{score} de {total} questões corretas</p>
          <div style={{background:aprovado?'rgba(76,175,125,0.1)':'rgba(232,98,26,0.1)',border:`1px solid ${aprovado?'var(--success)':'var(--orange)'}`,borderRadius:16,padding:20,marginBottom:24}}>
            <div style={{fontSize:20,fontWeight:900,color:aprovado?'var(--success)':'var(--orange)',marginBottom:8}}>
              {aprovado ? '✅ APROVADO!' : '❌ Não aprovado'}
            </div>
            <div style={{fontSize:14,color:'var(--text-muted)'}}>
              {aprovado ? `Parabéns! Você atingiu ${rate}% de acerto. Na OAB real você precisaria de 50/80 questões corretas.` : `Você precisaria de ${Math.ceil(total*0.625)} acertos para ser aprovado. Continue praticando!`}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:28}}>
            {[['Acertos',`${score}/${total}`,'var(--gold)'],['Taxa',`${rate}%`,rate>=62?'var(--success)':'var(--orange)'],['Aprovação OAB',aprovado?'✅ Sim':'❌ Não',aprovado?'var(--success)':'var(--danger)']].map(([l,v,c]) => (
              <div key={l} style={{background:'var(--gray)',borderRadius:14,padding:20,border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{l}</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center'}}>
            <button className="btn-primary" onClick={() => { setRunning(false); setDone(false) }}>NOVO SIMULADO</button>
            <button className="btn-secondary" onClick={() => { setRunning(false); setDone(false); setTab('oficiais') }}>VER PROVAS OAB</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:'32px 40px',flex:1}}>
      <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,marginBottom:8}}>Simulados 📋</h1>
      <p style={{fontSize:15,color:'var(--text-muted)',marginBottom:24}}>Treine com provas reais da OAB e simulados temáticos.</p>

      {/* Tabs */}
      <div style={{display:'flex',gap:10,marginBottom:28}}>
        {([['oficiais','🏛️ Provas OAB Reais'],['pratica','⚡ Simulados Temáticos']] as const).map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{padding:'10px 20px',borderRadius:10,border:tab===key?'1px solid rgba(212,168,67,0.4)':'1px solid rgba(255,255,255,0.08)',background:tab===key?'rgba(212,168,67,0.1)':'transparent',color:tab===key?'var(--gold)':'var(--text-muted)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)'}}>
            {label}
          </button>
        ))}
      </div>

      {/* Provas OAB Reais */}
      {tab === 'oficiais' && (
        <div>
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.08),rgba(232,98,26,0.04))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:16,padding:20,marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
              <span style={{fontSize:20}}>📋</span>
              <div style={{fontSize:15,fontWeight:700}}>Últimas 5 Provas Oficiais da OAB</div>
              {!isElite && <span style={{fontSize:10,fontWeight:800,background:'rgba(212,168,67,0.1)',border:'1px solid rgba(212,168,67,0.2)',color:'var(--gold)',padding:'3px 10px',borderRadius:100}}>🔒 ELITE</span>}
            </div>
            <div style={{fontSize:13,color:'var(--text-muted)'}}>Questões reais com gabarito oficial. Descubra se você seria aprovado!</div>
          </div>

          {loadingProva && (
            <div style={{textAlign:'center',padding:40,color:'var(--gold)'}}>⏳ Carregando questões...</div>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {provasOAB.map((prova, i) => (
              <div key={prova.id} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:24,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16,transition:'border-color 0.2s'}}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(212,168,67,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}>
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  <div style={{width:48,height:48,borderRadius:12,background:i===0?'linear-gradient(135deg,var(--gold),var(--orange))':'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:i===0?'#000':'var(--text-muted)',fontFamily:'var(--font-display)'}}>
                    {i===0?'🆕':`${prova.numero_exame}º`}
                  </div>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:15,fontWeight:700}}>{prova.edicao}</span>
                      {i===0 && <span style={{fontSize:9,fontWeight:900,background:'linear-gradient(135deg,var(--gold),var(--orange))',color:'#000',padding:'2px 8px',borderRadius:100}}>MAIS RECENTE</span>}
                    </div>
                    <div style={{display:'flex',gap:16,fontSize:12,color:'var(--text-muted)'}}>
                      <span>📝 {prova.total_questoes} questões</span>
                      <span>📊 Taxa aprovação: {prova.taxa_aprovacao_oficial}%</span>
                      <span>⏱️ 5 horas</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => iniciarProvaOficial(prova)}
                  className={isElite ? 'btn-primary' : 'btn-secondary'}
                  style={{fontSize:13,padding:'10px 24px',minWidth:160}}
                  disabled={loadingProva}>
                  {isElite ? '▶ INICIAR PROVA' : '🔒 ELITE'}
                </button>
              </div>
            ))}
          </div>

          {provasOAB.length === 0 && !loadingProva && (
            <div style={{textAlign:'center',padding:48,color:'var(--text-muted)'}}>
              <div style={{fontSize:48,marginBottom:16}}>📋</div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Provas sendo carregadas</div>
              <div style={{fontSize:14}}>As provas oficiais estarão disponíveis em breve.</div>
            </div>
          )}
        </div>
      )}

      {/* Simulados Temáticos */}
      {tab === 'pratica' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:16}}>
          {SIMULADOS_PRATICA.map(s => (
            <div key={s.t} style={{background:'var(--gray)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:24,transition:'all 0.2s',cursor:'pointer'}}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(212,168,67,0.18)'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.transform='translateY(0)' }}>
              <div style={{fontSize:28,marginBottom:14}}>{s.icon}</div>
              <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>{s.t}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>{s.info}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:18}}>
                {s.tags.map(tag => <span key={tag} style={{fontSize:10,padding:'2px 9px',borderRadius:100,fontWeight:700,background:'rgba(212,168,67,0.1)',color:'var(--gold)',border:'1px solid rgba(212,168,67,0.2)'}}>{tag}</span>)}
              </div>
              {s.lock && !isElite
                ? <button className="btn-secondary" style={{width:'100%',fontSize:12,padding:'10px'}} onClick={() => showUpgrade()}>🔒 DESBLOQUEAR</button>
                : <button className="btn-gold-sm" style={{width:'100%',fontSize:12}} onClick={() => start(s)}>INICIAR SIMULADO →</button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
