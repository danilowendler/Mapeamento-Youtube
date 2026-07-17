import { BRAND } from "@/lib/brand";

export const metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <article className="flex flex-col gap-xs">
      <h1>Termos de Uso</h1>
      <p>Última atualização: 12 de julho de 2026.</p>

      <h2>1. O serviço</h2>
      <p>
        O {BRAND.name} é uma plataforma de análise de dados
        públicos do YouTube que identifica vídeos com desempenho excepcional
        em relação ao histórico do próprio canal, ajudando criadores a
        encontrar temas com demanda comprovada. Ao criar uma conta, você
        concorda com estes termos.
      </p>

      <h2>2. Conta</h2>
      <ul>
        <li>Você é responsável pelas credenciais e pelo uso da sua conta;</li>
        <li>É necessário um e-mail válido; contas podem ser encerradas em
        caso de abuso, fraude ou violação destes termos;</li>
        <li>Você pode excluir sua conta a qualquer momento na página Conta —
        a exclusão é imediata e irreversível.</li>
      </ul>

      <h2>3. Planos e pagamento</h2>
      <ul>
        <li>O plano Gratuito tem limites mensais de uso; os planos pagos
        (Criador e Pro) ampliam esses limites e liberam recursos
        adicionais, conforme descrito na página de planos;</li>
        <li>Pagamentos são processados pela Stripe; não armazenamos dados de
        cartão;</li>
        <li>Assinaturas renovam mensalmente e podem ser canceladas a
        qualquer momento — o acesso permanece até o fim do período pago;</li>
        <li>Em caso de falha de pagamento, o acesso ao plano é mantido por 7
        dias; após esse prazo, a conta retorna ao plano Gratuito, sem perda
        de dados.</li>
      </ul>

      <h2>4. Dados e uso aceitável</h2>
      <ul>
        <li>As análises usam exclusivamente dados públicos obtidos por meio
        das APIs oficiais do YouTube, sujeitas aos Termos de Serviço da API
        do YouTube e à Política de Privacidade do Google
        (policies.google.com/privacy);</li>
        <li>Os resultados são informativos e não garantem desempenho de
        vídeos futuros;</li>
        <li>É proibido usar a plataforma para extração automatizada em
        massa, revenda de dados ou qualquer atividade que viole os termos
        do YouTube.</li>
      </ul>

      <h2>5. Limitação de responsabilidade</h2>
      <p>
        O serviço é fornecido “como está”. Empregamos os melhores esforços
        para mantê-lo disponível e correto, mas não nos responsabilizamos
        por indisponibilidades, alterações nas APIs do YouTube ou decisões
        tomadas com base nas análises.
      </p>

      <h2>6. Alterações</h2>
      <p>
        Estes termos podem ser atualizados; mudanças relevantes serão
        comunicadas pelo e-mail da conta. Dúvidas:
        contatomwmcorp@gmail.com.
      </p>
    </article>
  );
}
