import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso · TigerJus',
  description: 'Regras de uso da plataforma TigerJus.',
}

const ATUALIZADO = 'Junho de 2026'
const CONTATO = 'contato@tigerjus.com.br' // ← troque pelo seu e-mail oficial

function Sec({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold, #D4A843)', marginBottom: 10 }}>{titulo}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)' }}>{children}</div>
    </section>
  )
}

export default function TermosPage() {
  return (
    <main style={{ background: '#060a12', minHeight: '100vh', color: '#fff', padding: '48px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none' }}>← Voltar</Link>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '18px 0 6px' }}>Termos de Uso</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 32 }}>Última atualização: {ATUALIZADO}</p>

        <Sec titulo="1. Sobre o serviço">
          O TigerJus é uma plataforma de estudos para a 1ª fase do Exame da OAB, com questões, simulados,
          resumos, flashcards, mapas mentais, gamificação e recursos de apoio. Ao criar uma conta, você concorda
          com estes Termos.
        </Sec>

        <Sec titulo="2. Conta e responsabilidade">
          Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na
          sua conta. As informações de cadastro devem ser verdadeiras e atualizadas. A conta é pessoal e
          intransferível.
        </Sec>

        <Sec titulo="3. Planos e pagamentos">
          Oferecemos um plano gratuito e planos pagos com recursos adicionais. As assinaturas são processadas via
          Mercado Pago (PIX). Os valores e benefícios de cada plano são informados na própria plataforma e podem
          ser ajustados, com aviso prévio razoável.
        </Sec>

        <Sec titulo="4. Uso permitido">
          O conteúdo da plataforma é para seu uso pessoal de estudo. Não é permitido copiar, redistribuir, revender
          ou compartilhar o acesso e os materiais com terceiros sem autorização.
        </Sec>

        <Sec titulo="5. Conteúdo educacional">
          Nosso conteúdo tem finalidade de apoio aos estudos e não garante aprovação no exame. Buscamos manter as
          informações corretas e atualizadas, mas elas não substituem a legislação oficial e fontes primárias.
        </Sec>

        <Sec titulo="6. Cancelamento">
          Você pode encerrar sua conta a qualquer momento. Cancelamentos e reembolsos seguem a legislação aplicável
          e as condições informadas no momento da contratação.
        </Sec>

        <Sec titulo="7. Alterações">
          Podemos atualizar estes Termos para refletir melhorias ou exigências legais. A data no topo indica a
          versão vigente.
        </Sec>

        <Sec titulo="8. Contato">
          Dúvidas sobre estes Termos: <strong>{CONTATO}</strong>.
        </Sec>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 40 }}>
          🐯 TigerJus — Estude como um Tigre.
        </p>
      </div>
    </main>
  )
}
