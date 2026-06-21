import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade · TigerJus',
  description: 'Como o TigerJus coleta, usa, compartilha e protege seus dados pessoais, conforme a LGPD.',
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

export default function PrivacidadePage() {
  return (
    <main style={{ background: '#060a12', minHeight: '100vh', color: '#fff', padding: '48px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none' }}>← Voltar</Link>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '18px 0 6px' }}>Política de Privacidade</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 32 }}>Última atualização: {ATUALIZADO}</p>

        <Sec titulo="1. Quem somos">
          O TigerJus é uma plataforma online de preparação para a 1ª fase do Exame da OAB. Somos o controlador
          dos seus dados pessoais, nos termos da Lei nº 13.709/2018 (LGPD). Qualquer dúvida sobre esta política
          pode ser enviada para <strong>{CONTATO}</strong>.
        </Sec>

        <Sec titulo="2. Quais dados coletamos">
          Coletamos apenas o necessário para o funcionamento da plataforma: dados de cadastro (nome e e-mail);
          dados de uso e desempenho (questões respondidas, acertos, XP, nível, streak e progresso de estudo);
          dados de pagamento, quando você assina um plano — processados diretamente pelo Mercado Pago, sem que
          armazenemos os dados do seu meio de pagamento; e dados técnicos básicos (como endereço IP e informações
          do dispositivo) para segurança e funcionamento.
        </Sec>

        <Sec titulo="3. Para que usamos seus dados">
          Usamos seus dados para criar e manter sua conta, oferecer os recursos de estudo e a gamificação
          (XP, ranking, conquistas), processar pagamentos e liberar acesso, comunicar avisos importantes sobre o
          serviço e melhorar a plataforma com base em estatísticas de uso.
        </Sec>

        <Sec titulo="4. Base legal">
          Tratamos seus dados com base na execução do contrato (para entregar o serviço que você contratou),
          no seu consentimento (que você fornece ao se cadastrar e aceitar esta política) e no legítimo interesse
          (para segurança e melhoria do produto), sempre respeitando seus direitos.
        </Sec>

        <Sec titulo="5. Com quem compartilhamos">
          <strong>Nós não vendemos seus dados.</strong> Compartilhamos o mínimo necessário com fornecedores que
          viabilizam o serviço: infraestrutura e banco de dados (Supabase), processamento de pagamentos
          (Mercado Pago) e ferramentas de análise de uso. Esses parceiros tratam os dados apenas para as
          finalidades aqui descritas.
        </Sec>

        <Sec titulo="6. Cookies">
          Utilizamos cookies e tecnologias semelhantes para manter você conectado, lembrar preferências e
          entender como a plataforma é usada. Você pode gerenciar cookies nas configurações do seu navegador.
        </Sec>

        <Sec titulo="7. Seus direitos (LGPD)">
          A qualquer momento você pode solicitar: confirmação de que tratamos seus dados; acesso aos seus dados;
          correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados
          desnecessários; portabilidade; informação sobre compartilhamento; e revogação do consentimento.
          Para exercer qualquer direito, escreva para <strong>{CONTATO}</strong>.
        </Sec>

        <Sec titulo="8. Por quanto tempo guardamos">
          Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento, guardamos apenas o que for
          exigido por obrigação legal ou regulatória, e eliminamos o restante de forma segura.
        </Sec>

        <Sec titulo="9. Segurança">
          Adotamos medidas técnicas e organizacionais para proteger seus dados, como controle de acesso e
          criptografia em trânsito. Nenhum sistema é 100% infalível, mas trabalhamos continuamente para reduzir riscos.
        </Sec>

        <Sec titulo="10. Alterações desta política">
          Podemos atualizar esta política para refletir mudanças no serviço ou na legislação. Quando isso acontecer,
          atualizaremos a data no topo desta página.
        </Sec>

        <Sec titulo="11. Contato">
          Dúvidas, pedidos ou reclamações sobre seus dados: <strong>{CONTATO}</strong>.
        </Sec>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 40 }}>
          🐯 TigerJus — Estude como um Tigre.
        </p>
      </div>
    </main>
  )
}
