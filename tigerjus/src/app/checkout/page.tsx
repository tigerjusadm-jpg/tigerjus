'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const PLANS: Record<string, any> = {
  start: { name:'Tiger Start', price:'1,99', amount:1.99, color:'var(--success)', features:['Questões ilimitadas','IA intermediária','Mais simulados','Streak + ranking'] },
  plus:  { name:'Tiger Plus',  price:'5,99', amount:5.99, color:'var(--blue)',    features:['Simulados completos','Mapas mentais','PDFs premium','IA ampliada'] },
  pro:   { name:'Tiger Pro',   price:'9,99', amount:9.99, color:'var(--gold)',    features:['IA avançada ilimitada','Radar jurídico','Trilhas personalizadas','Previsão de aprovação'] },
  elite: { name:'Tiger Elite', price:'19,99',amount:19.99,color:'var(--orange)', features:['Tudo ilimitado','IA prioritária','Conteúdos exclusivos','Simulados inéditos'] },
}

export default function CheckoutPage() {
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
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  // Countdown timer for PIX
  useEffect(() => {
    if (!pixData || pixDone) return
    const t = setInterval(() => setPixTimer(p => { if(p<=1){clearInterval(t);return 0;} return p-1 }), 1000)
    return () => clearInterval(t)
  }, [pixData, pixDone])

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const createPixPayment = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payment/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ plan:planId, method:'pix', userId:user?.id, email:user?.email, name:user?.user_metadata?.name }),
      })
      const data = await res.json()
      if (data.pix) setPixData(data.pix)
      // Poll for payment confirmation
      const poll = setInterval(async () => {
        const { data: payment } = await supabase.from('payments').select('status').eq('provider_payment_id', String(data.payment_id)).single()
        if (payment?.status === 'approved') { clearInterval(poll); setPixDone(true) }
      }, 3000)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCard = async () => {
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

  if (!plan) return <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--white)'}}>Plano inválido</div>

  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative'}}>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,168,67,0.05), transparent)',pointerEvents:'none'}} />

      <div style={{width:'100%',maxWidth:960,display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,position:'relative'}}>
        {/* Plan summary */}
        <div>
          <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,textDecoration:'none',marginBottom:32}}>← Voltar</Link>
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.08),rgba(232,98,26,0.04))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:32,marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{plan.name}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:52,fontWeight:900,color:plan.color,marginBottom:4}}>
              <sup style={{fontSize:20,verticalAlign:'super',color:'var(--text-muted)'}}>R$</sup>{plan.price}
              <span style={{fontSize:16,color:'var(--text-muted)'}}>/mês</span>
            </div>
            <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:24}}>Renovação automática mensal · Cancele quando quiser</p>
            <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:12}}>
              {plan.features.map((f: string) => (
                <li key={f} style={{display:'flex',alignItems:'center',gap:10,fontSize:14}}>
                  <span style={{color:'var(--success)'}}>✓</span>{f}
                </li>
              ))}
            </ul>
          </div>
          <div style={{background:'rgba(76,175,125,0.06)',border:'1px solid rgba(76,175,125,0.15)',borderRadius:12,padding:'14px 16px',fontSize:13,color:'var(--text-muted)'}}>
            🔒 Pagamento 100% seguro · Via Mercado Pago · Dados criptografados
          </div>
        </div>

        {/* Payment form */}
        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:20,overflow:'hidden'}}>
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',padding:'22px 28px',borderBottom:'1px solid rgba(212,168,67,0.12)'}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:900}}>Finalizar Assinatura</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>TigerJus {plan.name} — R${plan.price}/mês</div>
          </div>

          <div style={{padding:28}}>
            <div style={{display:'flex',gap:8,marginBottom:24}}>
              {(['pix','card'] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:10,borderRadius:8,border:tab===t?'1px solid rgba(212,168,67,0.3)':'1px solid rgba(255,255,255,0.08)',background:tab===t?'rgba(212,168,67,0.1)':'transparent',color:tab===t?'var(--gold)':'var(--text-muted)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)',transition:'all 0.2s'}}>
                  {t==='pix'?'⚡ PIX':'💳 Cartão'}
                </button>
              ))}
            </div>

            {tab==='pix' && (
              pixDone ? (
                <div style={{textAlign:'center',background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:16,padding:32}}>
                  <div style={{fontSize:52,marginBottom:14}}>✅</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,color:'var(--success)',marginBottom:10}}>Pagamento Confirmado!</div>
                  <div style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>Acesso liberado automaticamente.</div>
                  <button className="btn-primary" style={{width:'100%'}} onClick={onSuccess}>ACESSAR PLATAFORMA →</button>
                </div>
              ) : pixData ? (
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>Escaneie o QR Code com seu banco:</div>
                  {pixData.qr_code_base64 && (
                    <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" style={{width:190,height:190,borderRadius:16,background:'white',padding:12,margin:'0 auto 20px',display:'block'}} />
                  )}
                  <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>Valor: <strong style={{color:'var(--gold)'}}>R${plan.price}/mês</strong></div>
                  <div style={{background:'var(--gray-mid)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'12px 16px',fontSize:11,fontFamily:'var(--font-mono)',color:'var(--text-muted)',cursor:'pointer',marginBottom:16,wordBreak:'break-all',transition:'all 0.2s'}}
                    onClick={()=>{navigator.clipboard.writeText(pixData.copy_paste||'');setCopied(true)}}>
                    {copied?'✅ Código copiado!':pixData.copy_paste?.slice(0,60)+'...'}
                  </div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>Expira em:</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:30,fontWeight:700,color:pixTimer<60?'var(--danger)':'var(--gold)',marginBottom:12}}>{fmt(pixTimer)}</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:13,color:'var(--text-muted)'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:'var(--gold)',animation:'pulse 1.5s infinite'}} />
                    Aguardando confirmação do pagamento...
                  </div>
                </div>
              ) : (
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:64,marginBottom:20}}>⚡</div>
                  <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24,lineHeight:1.7}}>Gere o QR Code PIX e pague em segundos. O acesso é liberado automaticamente.</p>
                  <button className="btn-primary" style={{width:'100%'}} onClick={createPixPayment} disabled={loading}>
                    {loading?'⏳ Gerando PIX...':'GERAR QR CODE PIX'}
                  </button>
                </div>
              )
            )}

            {tab==='card' && (
              cardDone ? (
                <div style={{textAlign:'center',background:'rgba(76,175,125,0.1)',border:'1px solid rgba(76,175,125,0.25)',borderRadius:16,padding:32}}>
                  <div style={{fontSize:52,marginBottom:14}}>✅</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:900,color:'var(--success)',marginBottom:10}}>Pagamento Aprovado!</div>
                  <div style={{fontSize:14,color:'var(--text-muted)',marginBottom:20}}>Acesso liberado automaticamente.</div>
                  <button className="btn-primary" style={{width:'100%'}} onClick={onSuccess}>ACESSAR PLATAFORMA →</button>
                </div>
              ) : (
                <div>
                  <div style={{marginBottom:16}}>
                    <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Número do Cartão</label>
                    <input className="form-input" placeholder="0000 0000 0000 0000" maxLength={19} value={card.number} onChange={e=>setCard(p=>({...p,number:e.target.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim()}))} />
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Nome no Cartão</label>
                    <input className="form-input" placeholder="NOME SOBRENOME" value={card.name} onChange={e=>setCard(p=>({...p,name:e.target.value.toUpperCase()}))} />
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
                    <div>
                      <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>Validade</label>
                      <input className="form-input" placeholder="MM/AA" maxLength={5} value={card.expiry} onChange={e=>setCard(p=>({...p,expiry:e.target.value}))} />
                    </div>
                    <div>
                      <label style={{fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--text-muted)',display:'block',marginBottom:8}}>CVV</label>
                      <input className="form-input" placeholder="•••" maxLength={4} type="password" value={card.cvv} onChange={e=>setCard(p=>({...p,cvv:e.target.value.replace(/\D/g,'')}))} />
                    </div>
                  </div>
                  <button className="btn-primary" style={{width:'100%'}} onClick={handleCard} disabled={cardLoading}>
                    {cardLoading?'⏳ Processando...':`PAGAR R$${plan.price}/mês`}
                  </button>
                  <div style={{marginTop:12,fontSize:11,color:'var(--text-dim)',textAlign:'center'}}>🔒 Pagamento criptografado via Mercado Pago · Cancele quando quiser</div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="grain-overlay" />
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.9)}}`}</style>
    </div>
  )
}
