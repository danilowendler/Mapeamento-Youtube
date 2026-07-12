-- M5 · Busca por palavra-chave + nichos curados (doc 3 §3.2/3.7, doc 5)

-- ============================================================
-- keyword_cache — cache de search.list (TTL lógico de 72 h)
-- search.list custa 100 unidades; keyword repetida por qualquer
-- usuário dentro da janela custa 0 (doc 3 §3.2).
-- ============================================================
create table public.keyword_cache (
  keyword text primary key, -- normalizada: lower + trim
  fetched_at timestamptz not null default now(),
  result_count int not null default 0
);

create table public.keyword_results (
  keyword text not null references public.keyword_cache (keyword) on delete cascade,
  position int not null,
  channel_id text not null,
  video_id text,
  primary key (keyword, position)
);

create index keyword_results_keyword_idx
  on public.keyword_results (keyword, position);

-- Acesso exclusivo do pipeline (service role) — a UI nunca lê direto.
alter table public.keyword_cache enable row level security;
alter table public.keyword_results enable row level security;

-- ============================================================
-- niches — catálogo curado PT-BR (doc 5 §5.1)
-- ============================================================
create table public.niches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  keywords text[] not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.niches enable row level security;

create policy "niches_read_authenticated"
  on public.niches for select
  to authenticated
  using (is_active);

-- ============================================================
-- Seed do catálogo (idempotente; curadoria evolui via migrations)
-- ============================================================
insert into public.niches (slug, name, description, keywords) values
  ('financas-pessoais', 'Finanças Pessoais', 'Organização financeira, dívidas e orçamento', array['finanças pessoais', 'como sair das dívidas', 'como organizar o dinheiro']),
  ('investimentos', 'Investimentos', 'Renda fixa, ações e independência financeira', array['investimentos para iniciantes', 'renda fixa', 'viver de renda']),
  ('fitness', 'Fitness & Treino', 'Treinos, hipertrofia e emagrecimento', array['treino em casa', 'hipertrofia', 'como emagrecer']),
  ('culinaria', 'Culinária', 'Receitas fáceis e cozinha do dia a dia', array['receitas fáceis', 'receita rápida', 'comida caseira']),
  ('games', 'Games', 'Gameplays, dicas e novidades', array['gameplay', 'dicas de jogos', 'melhores jogos']),
  ('tecnologia', 'Tecnologia', 'Reviews e custo-benefício', array['review celular', 'melhor custo benefício celular', 'dicas de tecnologia']),
  ('futebol', 'Futebol', 'Análises, notícias e bastidores', array['futebol brasileiro', 'análise de jogo', 'notícias do futebol']),
  ('empreendedorismo', 'Empreendedorismo', 'Negócio próprio e renda extra', array['como empreender', 'negócio próprio', 'renda extra']),
  ('marketing-digital', 'Marketing Digital', 'Vendas online e tráfego', array['marketing digital', 'como vender online', 'tráfego pago']),
  ('desenvolvimento-pessoal', 'Desenvolvimento Pessoal', 'Produtividade, hábitos e disciplina', array['produtividade', 'como criar hábitos', 'disciplina e foco']),
  ('estudos-concursos', 'Estudos & Concursos', 'Técnicas de estudo e concursos públicos', array['como estudar', 'concurso público', 'técnicas de estudo']),
  ('idiomas', 'Idiomas', 'Aprender inglês e outros idiomas', array['aprender inglês', 'inglês sozinho', 'dicas de inglês']),
  ('viagens', 'Viagens', 'Roteiros, dicas e viagem econômica', array['dicas de viagem', 'viajar barato', 'roteiro de viagem']),
  ('maternidade', 'Maternidade', 'Rotina, dicas e vida real com filhos', array['maternidade real', 'rotina com bebê', 'dicas para mães']),
  ('beleza', 'Beleza', 'Maquiagem e skincare', array['maquiagem para iniciantes', 'skincare', 'tutorial de maquiagem']),
  ('carros', 'Carros', 'Reviews, usados e mecânica', array['review de carro', 'carros usados', 'mecânica básica']),
  ('humor', 'Humor', 'Comédia e entretenimento', array['comédia brasileira', 'vídeos engraçados', 'stand up comedy']),
  ('ciencia-curiosidades', 'Ciência & Curiosidades', 'Explicações e fatos surpreendentes', array['curiosidades', 'ciência explicada', 'você sabia']),
  ('historia', 'História', 'História do Brasil e do mundo', array['história do brasil', 'segunda guerra mundial', 'documentário de história']),
  ('true-crime', 'True Crime', 'Casos criminais e mistérios', array['casos criminais', 'crimes reais', 'mistérios não resolvidos']),
  ('pets', 'Pets', 'Cuidados e adestramento', array['adestramento de cães', 'cuidados com gatos', 'dicas para pets']),
  ('filmes-series', 'Filmes & Séries', 'Análises e recomendações', array['análise de filmes', 'melhores séries', 'crítica de cinema'])
on conflict (slug) do nothing;
