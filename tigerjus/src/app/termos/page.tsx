'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const DEFAULT_EMAIL = 'contato@tigerjus.com.br'
const DEFAULT_TEXTO = `Bem-vindo ao TigerJus. Ao criar uma conta, você concorda com estes Termos.

## 1. Sobre o serviço
Plataforma de estudos para a 1ª fase da OAB, com questões, simulados, resumos, flashcards e gamificação.

## 2. Conta
Você é responsável pela sua senha e pelas atividades na sua conta. Os dados de cadastro devem ser verdadeiros. A conta é pessoal e intransferível.

## 3. Planos e pagamentos
Há um plano gratuito e planos pagos, processados via Mercado Pago (PIX). Valores e benefícios são informados na plataforma e podem mudar com aviso prévio.

## 4. Uso permitido
O conteúdo é para uso pessoal de estudo. Não é permitido copiar, redistribuir, revender ou compartilhar o acesso.

## 5. Conteúdo educacional
O material é de apoio e não garante aprovação. Não substitui a legislação oficial.

## 6. Cancelamento
Você pode encerrar a conta a qualquer momento. Reembolsos seguem a legislação e as condições da contratação.`

function Render({ texto }: { texto: string }) {
  return (
    <>
      {texto.split('\n').map((linha, i) => {
        if (linha.startsWith('## ')) return <h2 key={i} style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold,#D4A843)', margin: '26px 0 8px' }}>{linha.slice(3)}</h2>
        if (!linha.trim()) return <div key={i} style={{ height: 6 }} />
        return <p key={i} style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)', margin: '0 0 8px' }}>{linha}</p>
      })}
    </>
  )
}

export default function TermosPage() {
  const [texto, setTexto] = useState(DEFAULT_TEXTO)
  const [email, setEmail] = useState(DEFAULT_EMAIL)
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase.from('app_settings').select('key,value').in('key', ['termos_texto', 'juridico_email'])
        const map: Record<string, string> = {}
        ;(data || []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value })
        if (map['termos_texto'] && map['termos_texto'].trim()) setTexto(map['termos_texto'])
        if (map['juridico_email'] && map['juridico_email'].trim()) setEmail(map['juridico_email'])
      } catch { /* usa padrão */ }
    })()
  }, [])
  return (
    <main style={{ background: '#060a12', minHeight: '100vh', color: '#fff', padding: '48px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none' }}>← Voltar</Link>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '18px 0 24px' }}>Termos de Uso</h1>
        <Render texto={texto} />
        <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)', marginTop: 24 }}>
          <strong>Contato:</strong> {email}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 40 }}>🐯 TigerJus — Estude como um Tigre.</p>
      </div>
    </main>
  )
}
