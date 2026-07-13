export const metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
  return (
    <article className="flex flex-col gap-xs">
      <h1>Política de Privacidade</h1>
      <p>Última atualização: 12 de julho de 2026.</p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Dados de conta:</strong> e-mail, nome e avatar (quando você
          entra com o Google) — o mínimo necessário para operar o serviço;
        </li>
        <li>
          <strong>Dados de uso:</strong> pesquisas realizadas, favoritos e
          eventos de navegação na plataforma, usados para operar e melhorar o
          produto;
        </li>
        <li>
          <strong>Dados públicos do YouTube:</strong> métricas públicas de
          canais e vídeos, obtidas das APIs oficiais do YouTube. Não são
          dados pessoais dos nossos usuários e são atualizados ou descartados
          em até 30 dias, conforme as políticas da API do YouTube. O uso
          dessas APIs está sujeito à Política de Privacidade do Google
          (policies.google.com/privacy).
        </li>
      </ul>

      <h2>2. Como usamos</h2>
      <ul>
        <li>Autenticação e operação da sua conta (base legal: execução de
        contrato);</li>
        <li>Processamento de pagamentos via Stripe — não armazenamos dados
        de cartão;</li>
        <li>Monitoramento de erros e desempenho (Sentry);</li>
        <li>E-mails transacionais (verificação de conta, cobrança). Não
        enviamos marketing sem consentimento.</li>
      </ul>

      <h2>3. Compartilhamento</h2>
      <p>
        Não vendemos dados pessoais. Compartilhamos apenas com os provedores
        que operam o serviço: Supabase (banco de dados e autenticação),
        Vercel (hospedagem), Stripe (pagamentos), Google/YouTube (APIs de
        dados públicos) e Sentry (erros) — cada um sob seus próprios termos
        de proteção de dados.
      </p>

      <h2>4. Seus direitos (LGPD)</h2>
      <ul>
        <li>Acessar e corrigir seus dados (página Conta);</li>
        <li>
          <strong>Excluir sua conta e todos os dados associados</strong> a
          qualquer momento, na página Conta — a exclusão remove perfil,
          pesquisas, favoritos e histórico de uso de forma permanente;
        </li>
        <li>Solicitar portabilidade ou esclarecimentos:
        contatomwmcorp@gmail.com.</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        Usamos apenas cookies essenciais de sessão (autenticação). Não usamos
        cookies de publicidade ou rastreamento de terceiros.
      </p>
    </article>
  );
}
