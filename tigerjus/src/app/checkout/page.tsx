'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const PLANS: Record<string, any> = {
  start: { name:'Tiger Start', price:'1,99', amount:1.99, color:'var(--success)', features:['Questões ilimitadas','IA intermediária','Mais simulados','Streak + ranking'] },
  plus:  { name:'Tiger Plus',  price:'5,99', amount:5.99, color:'var(--blue)',    features:['Simulados completos','Mapas mentais','PDFs premium','IA ampliada'] },
  pro:   { name:'Tiger Pro',   price:'9,99', amount:9.99, color:'var(--gold)',    features:['IA avançada ilimitada','Radar jurídico','Trilhas personalizadas','Previsão de aprovação'] },
  elite: { name:'Tiger Elite', price:'19,99',amount:19.99,color:'var(--orange)', features:['Tudo ilimitado','IA prioritária','Conteúdos exclusivos','Simulados inéditos'] },
}

function CheckoutContent() {
  const params = useSearchParams()
  const router = useRouter()
  const planId = params.get('plan') || 'pro'
  const plan = PLANS[planId]

  const [tab, setTab] = useState<'pix'|'card'>('pix')
  const [pixData, setPixData] = useState<any>(null)
  const [pixTimer, setPixTimer] = useState(600)
  const [pixDone, setPixDone] = useState(false)
  const [card, setCard] = useState({ number:'', name:'', expiry:'', cvv:'' })
  const [cardLoading, setCardLoading] = useState(false)
  const [cardDone, setCardDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [copied, setCopied] = useState(false)

  // 🔒 TRAVA (gate): exige login ANTES de mostrar o checkout.
  // Se não estiver logado, manda pro /login guardando este checkout no ?redirect=,
  // pra trazer a pessoa de volta ao plano que ela escolheu depois de entrar/cadastrar.
  useEffect(() => {
    if (!plan) return
    let active = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return
      if (!user) {
        const back = `/checkout?plan=${planId}`
        router.replace(`/login?redirect=${encodeURIComponent(back)}`)
        return
      }
      setUser(user)
      setAuthChecked(true)
    })
    return () => { active = false }
  }, [plan, planId, router])

  useEffect(() => {
    if (!pixData || pixDone) return
    const t = setInterval(() => setPixTimer(p => { if(p<=1){clearInterval(t);return 0;} return p-1 }), 1000)
    return () => clearInterval(t)
  }, [pixData, pixDone])

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const createPixPayment = async () => {
    if (!user?.id) return // segurança: nunca cria pagamento sem dono
    setLoading(true)
    try {
      const res = await fetch('/api/payment/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ plan:planId, method:'pix', userId:user?.id, email:user?.email, name:user?.user_metadata?.name }),
      })
      const data = await res.json()
      if (data.pix) setPixData(data.pix)
      const poll = setInterval(async () => {
        const { data: payment } = await supabase.from('payments').select('status').eq('provider_payment_id', String(data.payment_id)).single()
        if (payment?.status === 'approved') { clearInterval(poll); setPixDone(true) }
      }, 3000)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCard = async () => {
    if (!user?.id) return // segurança: nunca cria pagamento sem dono
    setCardLoading(true)
    try {
      const res = await fetch('/api/payment/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ plan:planId, method:'credit_card', userId:user?.id, email:user?.email, name:card.name, card }),
      })
      const data = await res.json()
      if (data.status === 'approved' || data.payment_id) setCardDone(true)
    } catch (e) { console.error(e) }
    finally { setCardLoading(false) }
  }

  const onSuccess = () => router.push('/dashboard')

  if (!plan) return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--white)'}}>
      Plano inválido
    </div>
  )

  // Enquanto verifica o login (ou redireciona pro login), não mostra o formulário de pagamento.
  if (!authChecked) return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>🐯</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,color:'var(--gold)'}}>Verificando sua conta...</div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',padding:'24px 16px',position:'relative'}}>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,168,67,0.05), transparent)',pointerEvents:'none'}} />

      {/* Header mobile */}
      <div style={{maxWidth:960,margin:'0 auto',marginBottom:24}}>
        <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,textDecoration:'none',marginBottom:20}}>← Voltar</Link>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,color:'var(--deep-black)',flexShrink:0}}>T</div>
          <span style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
        </div>
      </div>

      <div style={{maxWidth:960,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:24,position:'relative'}}>

        {/* Resumo do plano */}
        <div>
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.08),rgba(232,98,26,0.04))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:28,marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{plan.name}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(40px,8vw,52px)',fontWeight:900,color:plan.color,marginBottom:4}}>
              <sup style={{fontSize:18,verticalAlign:'super',color:'var(--text-muted)'}}>R$</sup>{plan.price}
              <span style={{fontSize:15,color:'var(--text-muted)'}}>/mês</span>
            </div>
            <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:20}}>Renovação automática mensal · Cancele quando quiser</p>
            <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:10}}>
              {plan.features.map((f: string) => (
                <li key={f} style={{display:'flex',alignItems:'center',gap:10,fontSize:14}}>
                  <span style={{color:'var(--success)',flexShrink:0}}>✓</span>{f}
                </li>
              ))}
            </ul>
          </div>
          <div style={{background:'rgba(76,175,125,0.06)',border:'1px solid rgba(76,175,125,0.15)',borderRadius:12,padding:'14px 16px',fontSize:13,color:'var(--text-muted)'}}>
            🔒 Pagamento 100% seguro · Via Mercado Pago · Dados criptografados
          </div>
        </div>

        {/* Formulário de pagamento */}
        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:20,overflow:'hidden'}}>
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',padding:'20px 24px',borderBottom:'1px solid rgba(212,168,67,0.12)'}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900}}>Finalizar Assinatura</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>TigerJus {plan.name} — R${plan.price}/mês</div>
          </div>
          <div style={{padding:24}}>
            {/* Tabs PIX / Cartão */}
            <div style={{display:'flex',gap:8,marginBottom:24}}>
              {(['pix','card'] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'11px 8px',borderRadius:8,border:tab===t?'1px solid rgba(212,168,67,0.3)':'1px solid rgba(255,255,255,0.08)',background:tab===t?'rgba(212,168,67,0.1)':'transparent',color:tab===t?'var(--gold)':'var(--text-muted)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)',transition:'all 0.2s'}}>
                  {t==='pix'?'⚡ PIX':'💳 Cartão'}
                </button>
              ))}
            </div>

            {/* PIX */}
            {tab==='pix' && (
              pixDone ? (
                <div style={{textAlign:'center',background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:16,padding:32}}>
                  <div style={{fontSize:52,marginBottom:14}}>✅</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,color:'var(--success)',marginBottom:10}}>Pagamento Confirmado!</div>
                  <div style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>Acesso liberado automaticamente.</div>
                  <button className="btn-primary" style={{width:'100%'}} onClick={onSuccess}>ACESSAR PLATAFORMA →</button>
                </div>
              ) : pixData ? (
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>Escaneie o QR Code com seu banco:</div>
                  {pixData.qr_code_base64 && (
                    <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX"
                      style={{width:180,height:180,borderRadius:16,background:'white',padding:10,margin:'0 auto 16px',display:'block'}} />
                  )}
                  <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>
                    Valor: <strong style={{color:'var(--gold)'}}>R${plan.price}/mês</strong>
                  </div>
                  <div
                    style={{background:'var(--gray-mid)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'12px 14px',fontSize:11,fontFamily:'var(--font-mono)',color:'var(--text-muted)',cursor:'pointer',marginBottom:16,wordBreak:'break-all',transition:'all 0.2s',textAlign:'left'}}
                    onClick={()=>{navigator.clipboard.writeText(pixData.copy_paste||'');setCopied(true)}}>
                    {copied?'✅ Código copiado!':pixData.copy_paste?.slice(0,60)+'...'}
                  </div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>Expira em:</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:32,fontWeight:700,color:pixTimer<60?'var(--danger)':'var(--gold)',marginBottom:12}}>{fmt(pixTimer)}</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:13,color:'var(--text-muted)'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:'var(--gold)',animation:'pulse 1.5s infinite',flexShrink:0}} />
                    Aguardando confirmação...
                  </div>
                </div>
              ) : (
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:56,marginBottom:16}}>⚡</div>
                  <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24,lineHeight:1.7}}>
                    Gere o QR Code PIX e pague em segundos. O acesso é liberado automaticamente.
                  </p>
                  <button className="btn-primary" style={{width:'100%'}} onClick={createPixPayment} disabled={loading}>
                    {loading?'⏳ Gerando PIX...':'GERAR QR CODE PIX'}
                  </button>
                </div>
              )
            )}

            {/* Cartão */}
            {tab==='card' && (
              cardDone ? (
                <div style={{textAlign:'center',background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:16,padding:32}}>
                  <div style={{fontSize:52,marginBottom:14}}>✅</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900,color:'var(--success)',marginBottom:10}}>Pagamento Aprovado!</div>
                  <div style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>Acesso liberado automaticamente.</div>
                  <button className="btn-primary" style={{width:'100%'}} onClick={onSuccess}>ACESSAR PLATAFORMA →</button>
                </div>
              ) : (
                <div>
                  <div style={{marginBottom:16}}>
                    <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Número do Cartão</label>
                    <input className="form-input" placeholder="0000 0000 0000 0000" maxLength={19}
                      value={card.number}
                      onChange={e=>setCard(p=>({...p,number:e.target.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim()}))} />
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Nome no Cartão</label>
                    <input className="form-input" placeholder="NOME SOBRENOME"
                      value={card.name}
                      onChange={e=>setCard(p=>({...p,name:e.target.value.toUpperCase()}))} />
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
                    <div>
                      <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Validade</label>
                      <input className="form-input" placeholder="MM/AA" maxLength={5}
                        value={card.expiry}
                        onChange={e=>setCard(p=>({...p,expiry:e.target.value}))} />
                    </div>
                    <div>
                      <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>CVV</label>
                      <input className="form-input" placeholder="•••" maxLength={4} type="password"
                        value={card.cvv}
                        onChange={e=>setCard(p=>({...p,cvv:e.target.value.replace(/\D/g,'')}))} />
                    </div>
                  </div>
                  <button className="btn-primary" style={{width:'100%'}} onClick={handleCard} disabled={cardLoading}>
                    {cardLoading?'⏳ Processando...':`PAGAR R$${plan.price}/mês`}
                  </button>
                  <div style={{marginTop:12,fontSize:11,color:'var(--text-dim)',textAlign:'center'}}>
                    🔒 Pagamento criptografado via Mercado Pago · Cancele quando quiser
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
      <div className="grain-overlay" />
      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.9)}}
      `}</style>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>🐯</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,color:'var(--gold)'}}>Carregando...</div>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
