'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAppSettings } from '@/contexts/AppSettingsContext'

const PLANS: Record<string, any> = {
  start: { name:'Tiger Start', price:'1,99', amount:1.99, color:'var(--success)', features:['Questões ilimitadas','IA intermediária','Mais simulados','Streak + ranking'] },
  plus:  { name:'Tiger Plus',  price:'5,99', amount:5.99, color:'var(--blue)',    features:['Simulados completos','Mapas mentais','PDFs premium','IA ampliada'] },
  pro:   { name:'Tiger Pro',   price:'9,99', amount:9.99, color:'var(--gold)',    features:['IA avançada ilimitada','Radar jurídico','Trilhas personalizadas','Previsão de aprovação'] },
  elite: { name:'Tiger Elite', price:'19,99',amount:19.99,color:'var(--orange)', features:['Tudo ilimitado','IA prioritária','Conteúdos exclusivos','Simulados inéditos'] },
}

function CheckoutContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { settings } = useAppSettings()
  const planId = params.get('plan') || 'pro'
  const ciclo = params.get('ciclo') === 'anual' ? 'anual' : 'mensal'
  const ehAnual = ciclo === 'anual'
  const plan = PLANS[planId]

  // Valor exibido conforme o ciclo. Anual = 12x o mensal (pagamento único PIX).
  const [descontoPercent, setDescontoPercent] = useState(0)

  const valorAnualCheio = plan ? Math.round(plan.amount * 12 * 100) / 100 : 0
  const valorAnualFinal = Math.round(valorAnualCheio * (1 - descontoPercent / 100) * 100) / 100
  const temDesconto = ehAnual && descontoPercent > 0
  const precoExibido = ehAnual
    ? valorAnualFinal.toFixed(2).replace('.', ',')
    : plan?.price
  const precoCheioStr = valorAnualCheio.toFixed(2).replace('.', ',')
  const sufixoCiclo = ehAnual ? '/ano' : '/mês'
  const labelCiclo = ehAnual ? 'Plano anual · 12 meses de acesso' : 'Renovação automática mensal · Cancele quando quiser'

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

  // Lê o desconto anual do banco (só para EXIBIÇÃO). O valor real é recalculado
  // e travado no servidor (api/payment/create) — aqui é apenas visual.
  useEffect(() => {
    if (!ehAnual) return
    supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['desconto_anual_ativo', 'desconto_anual_percent'])
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const c of (data || []) as { key: string; value: string }[]) map[c.key] = c.value
        const ativo = map['desconto_anual_ativo'] === 'true' || map['desconto_anual_ativo'] === '1'
        if (ativo) {
          const bruto = Number(map['desconto_anual_percent'] || '0')
          setDescontoPercent(Number.isFinite(bruto) ? Math.min(50, Math.max(0, bruto)) : 0)
        }
      })
  }, [ehAnual])

  useEffect(() => {
    if (!pixData || pixDone) return
    const t = setInterval(() => setPixTimer(p => { if(p<=1){clearInterval(t);return 0;} return p-1 }), 1000)
    return () => clearInterval(t)
  }, [pixData, pixDone])

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const copiarPix = async () => {
    const codigo = pixData?.copy_paste || ''
    if (!codigo) return
    let ok = false
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codigo)
        ok = true
      }
    } catch { ok = false }

    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = codigo
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.top = '0'
        ta.style.left = '0'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        ta.setSelectionRange(0, codigo.length)
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { ok = false }
    }

    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } else {
      alert('Não foi possível copiar automaticamente. Selecione o código e copie manualmente.')
    }
  }

  const createPixPayment = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payment/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ plan:planId, method:'pix', ciclo, userId:user?.id, email:user?.email, name:user?.user_metadata?.name }),
      })
      const data = await res.json()
      if (data.pix) setPixData(data.pix)

      const paymentId = String(data.payment_id || '')
      if (paymentId) {
        const poll = setInterval(async () => {
          const { data: assinatura } = await supabase
            .from('assinaturas')
            .select('status')
            .eq('mp_payment_id', paymentId)
            .maybeSingle()
          if (assinatura?.status === 'ativo') {
            clearInterval(poll)
            setPixDone(true)
          }
        }, 3000)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCard = async () => {
    setCardLoading(true)
    try {
      const res = await fetch('/api/payment/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ plan:planId, method:'credit_card', ciclo, userId:user?.id, email:user?.email, name:card.name, card }),
      })
      const data = await res.json()
      if (data.checkout_url) { window.location.href = data.checkout_url; return }
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

  return (
    <div style={{minHeight:'100vh',background:'var(--deep-black)',padding:'24px 16px',position:'relative'}}>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,168,67,0.05), transparent)',pointerEvents:'none'}} />

      <div style={{maxWidth:960,margin:'0 auto',marginBottom:24}}>
        <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:8,color:'var(--text-muted)',fontSize:13,textDecoration:'none',marginBottom:20}}>← Voltar</Link>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {settings.logo_url
            ? <img src={settings.logo_url} alt={settings.site_name||'TigerJus'} style={{width:36,height:36,borderRadius:8,objectFit:'contain',flexShrink:0}}/>
            : <div style={{width:36,height:36,background:'linear-gradient(135deg,var(--gold),var(--orange))',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:18,fontWeight:900,color:'var(--deep-black)',flexShrink:0}}>T</div>}
          <span style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,var(--gold-light),var(--gold))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TIGERJUS</span>
        </div>
      </div>

      <div style={{maxWidth:960,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:24,position:'relative'}}>

        <div>
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.08),rgba(232,98,26,0.04))',border:'1px solid rgba(212,168,67,0.2)',borderRadius:20,padding:28,marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{plan.name}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'clamp(40px,8vw,52px)',fontWeight:900,color:plan.color,marginBottom:4}}>
              <sup style={{fontSize:18,verticalAlign:'super',color:'var(--text-muted)'}}>R$</sup>{precoExibido}
              <span style={{fontSize:15,color:'var(--text-muted)'}}>{sufixoCiclo}</span>
            </div>
            {temDesconto && (
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:14,color:'var(--text-dim)',textDecoration:'line-through'}}>R${precoCheioStr}</span>
                <span style={{fontSize:11,fontWeight:800,letterSpacing:1,background:'rgba(232,98,26,0.15)',border:'1px solid rgba(232,98,26,0.35)',color:'var(--orange)',padding:'2px 8px',borderRadius:100}}>−{descontoPercent}% OFF</span>
              </div>
            )}
            {ehAnual && <p style={{fontSize:12,color:'var(--success)',marginBottom:6}}>Pagamento único · 12 meses de acesso</p>}
            <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:20}}>{labelCiclo}</p>
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

        <div style={{background:'var(--gray)',border:'1px solid rgba(212,168,67,0.15)',borderRadius:20,overflow:'hidden'}}>
          <div style={{background:'linear-gradient(135deg,rgba(212,168,67,0.1),rgba(232,98,26,0.06))',padding:'20px 24px',borderBottom:'1px solid rgba(212,168,67,0.12)'}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:900}}>Finalizar Assinatura</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>TigerJus {plan.name} — R${precoExibido}{sufixoCiclo}</div>
          </div>
          <div style={{padding:24}}>
            <div style={{display:'flex',gap:8,marginBottom:24}}>
              {(['pix','card'] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'11px 8px',borderRadius:8,border:tab===t?'1px solid rgba(212,168,67,0.3)':'1px solid rgba(255,255,255,0.08)',background:tab===t?'rgba(212,168,67,0.1)':'transparent',color:tab===t?'var(--gold)':'var(--text-muted)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)',transition:'all 0.2s'}}>
                  {t==='pix'?'⚡ PIX':'💳 Cartão'}
                </button>
              ))}
            </div>

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
                  <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:14}}>
                    Valor: <strong style={{color:'var(--gold)'}}>R${precoExibido}{sufixoCiclo}</strong>
                  </div>

                  <div style={{fontSize:11,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8,textAlign:'left'}}>
                    PIX Copia e Cola
                  </div>
                  <div style={{background:'var(--gray-mid)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'12px 14px',fontSize:11,fontFamily:'var(--font-mono)',color:'var(--text-muted)',marginBottom:10,wordBreak:'break-all',textAlign:'left',maxHeight:72,overflowY:'auto',lineHeight:1.5}}>
                    {pixData.copy_paste || ''}
                  </div>
                  <button
                    onClick={copiarPix}
                    className="btn-primary"
                    style={{width:'100%',fontSize:14,padding:14,marginBottom:16,background:copied?'var(--success)':undefined}}>
                    {copied ? '✅ Código copiado!' : '📋 COPIAR CÓDIGO PIX'}
                  </button>

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
                  <div style={{background:'rgba(58,143,232,0.06)',border:'1px solid rgba(58,143,232,0.15)',borderRadius:10,padding:'12px 14px',marginBottom:16,fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>
                    💳 Você será levado ao ambiente seguro do Mercado Pago para concluir o pagamento com cartão.
                  </div>
                  <button className="btn-primary" style={{width:'100%'}} onClick={handleCard} disabled={cardLoading}>
                    {cardLoading?'⏳ Redirecionando...':`PAGAR R$${precoExibido}${sufixoCiclo} COM CARTÃO`}
                  </button>
                  <div style={{marginTop:12,fontSize:11,color:'var(--text-dim)',textAlign:'center'}}>
                    🔒 Pagamento processado pelo Mercado Pago · Cancele quando quiser
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
