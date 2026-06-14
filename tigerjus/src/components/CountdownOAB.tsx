'use client'
import { Fragment, useEffect, useState } from 'react'
import { supabasePublic } from '@/lib/supabase'

type Variant = 'landing' | 'dash'

function ymdLocal(dt: Date) {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export default function CountdownOAB({ variant = 'landing' }: { variant?: Variant }) {
  const [exam, setExam] = useState<{ numero: number; edicao: string; data: string } | null>(null)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const hoje = ymdLocal(new Date())
    ;(async () => {
      try {
        const { data } = await supabasePublic
          .from('calendario_oab')
          .select('numero_exame, edicao, data_prova_1fase, status')
          .eq('status', 'ativo')
          .gte('data_prova_1fase', hoje)
          .order('data_prova_1fase', { ascending: true })
          .limit(1)
        if (data && data.length) {
          setExam({ numero: data[0].numero_exame, edicao: data[0].edicao, data: data[0].data_prova_1fase })
        }
      } catch {}
    })()
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (now === null || !exam) return null

  const hoje = ymdLocal(new Date(now))
  const ehHoje = hoje === exam.data
  const diff = parseLocalDate(exam.data).getTime() - now
  if (!ehHoje && diff <= 0) return null

  const dias = ehHoje ? 0 : Math.floor(diff / 86400000)
  const horas = ehHoje ? 0 : Math.floor((diff % 86400000) / 3600000)
  const mins = ehHoje ? 0 : Math.floor((diff % 3600000) / 60000)
  const segs = ehHoje ? 0 : Math.floor((diff % 60000) / 1000)

  const isLanding = variant === 'landing'
  const titulo = `${exam.numero}º Exame OAB · 1ª Fase`
  const cells: [number, string][] = [[dias, 'dias'], [horas, 'horas'], [mins, 'min'], [segs, 'seg']]

  const wrap: React.CSSProperties = isLanding
    ? { width: '100%', maxWidth: 760, margin: '0 auto', background: 'linear-gradient(135deg, rgba(212,168,67,0.10), rgba(232,98,26,0.06))', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 18, padding: '20px 24px', textAlign: 'center' }
    : { width: '100%', background: 'var(--tj-card-bg, rgba(15,22,38,0.8))', border: '1px solid rgba(212,168,67,0.22)', borderRadius: 14, padding: '14px 18px', textAlign: 'center' }

  const num: React.CSSProperties = {
    fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 1,
    fontSize: isLanding ? 'clamp(28px,7vw,44px)' : 26,
    background: 'linear-gradient(135deg,var(--gold-light),var(--gold),var(--orange))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  }
  const unit: React.CSSProperties = { fontSize: isLanding ? 11 : 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }

  return (
    <div style={wrap}>
      <div style={{ fontSize: isLanding ? 12 : 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: isLanding ? 14 : 10 }}>
        🎯 {ehHoje ? 'Hoje é a prova!' : 'Contagem regressiva'} · {titulo}
      </div>

      {ehHoje ? (
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: isLanding ? 'clamp(26px,7vw,40px)' : 22, color: 'var(--orange)' }}>
          É HOJE! 🐯 Boa prova!
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: isLanding ? 14 : 10 }}>
          {cells.map(([v, u], i) => (
            <Fragment key={u}>
              <div style={{ minWidth: isLanding ? 54 : 40 }}>
                <div style={num}>{String(v).padStart(2, '0')}</div>
                <div style={unit}>{u}</div>
              </div>
              {i < 3 && <div style={{ ...num, opacity: 0.35 }}>:</div>}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
