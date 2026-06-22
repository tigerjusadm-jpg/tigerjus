'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const DEFAULT_EMAIL = 'contato@tigerjus.com.br'
const DEFAULT_TEXTO = `A TigerJus é uma plataforma de preparação para a 1ª fase do Exame da OAB e é a controladora dos seus dados, nos termos da LGPD (Lei nº 13.709/2018).

## 1. Quais dados coletamos
Dados de cadastro (nome e e-mail), dados de uso e desempenho (questões, acertos, XP, nível, streak), dados de pagamento (processados pelo Mercado Pago, sem que armazenemos seu meio de pagamento) e dados técnicos básicos (IP, dispositivo) para segurança.

## 2. Para que usamos
Criar e manter sua conta, oferecer os recursos de estudo e a gamificação, processar pagamentos, comunicar avisos do serviço e melhorar a plataforma.

## 3. Base legal
Execução do contrato, seu consentimento (dado no cadastro) e legítimo interesse para segurança e melhoria.

## 4. Com quem compartilhamos
Não vendemos seus dados. Compartilhamos o mínimo com Supabase (infraestrutura), Mercado Pago (pagamento) e ferramentas de análise de uso.

## 5. Seus direitos (LGPD)
Você pode pedir confirmação, acesso, correção, anonimização, eliminação, portabilidade e revogar o consentimento, escrevendo para o nosso contato.

## 6. Retenção e segurança
Guardamos os dados enquanto a conta estiver ativa, com medidas de proteção como controle de acesso e criptografia em trânsito.`

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

export default function PrivacidadePage() {
  const [texto, setTexto] = useState(DEFAULT_TEXTO)
  const [email, setEmail] = useState(DEFAULT_EMAIL)
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase.from('app_settings').select('key,value').in('key', ['privacidade_texto', 'juridico_email'])
        const map: Record<string, string> = {}
        ;(data || []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value })
        if (map['privacidade_texto'] && map['privacidade_texto'].trim()) setTexto(map['privacidade_texto'])
        if (map['juridico_email'] && map['juridico_email'].trim()) setEmail(map['juridico_email'])
      } catch { /* usa padrão */ }
    })()
  }, [])
  return (
    <main style={{ background: '#060a12', minHeight: '100vh', color: '#fff', padding: '48px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none' }}>← Voltar</Link>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '18px 0 24px' }}>Política de Privacidade</h1>
        <Render texto={texto} />
        <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)', marginTop: 24 }}>
          <strong>Contato:</strong> {email}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 40 }}>🐯 TigerJus — Estude como um Tigre.</p>
      </div>
    </main>
  )
}
