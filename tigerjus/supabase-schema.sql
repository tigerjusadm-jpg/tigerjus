-- =============================================
-- TIGERJUS — Schema Completo do Banco de Dados
-- Execute no Supabase SQL Editor
-- =============================================

-- EXTENSÕES
create extension if not exists "uuid-ossp";

-- =============================================
-- TABELA: profiles (usuários)
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free','start','plus','pro','elite')),
  xp integer default 0,
  level integer default 1,
  level_name text default 'Filhote',
  streak integer default 0,
  last_study_date date,
  streak_protected boolean default false,
  free_questions_used integer default 0,
  free_ia_used integer default 0,
  total_questions_answered integer default 0,
  total_correct integer default 0,
  total_study_minutes integer default 0,
  badges text[] default '{}',
  ranking_position integer,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
alter table public.profiles enable row level security;
create policy "Usuários veem próprio perfil" on public.profiles for select using (auth.uid() = id);
create policy "Usuários atualizam próprio perfil" on public.profiles for update using (auth.uid() = id);

-- =============================================
-- TABELA: disciplines (disciplinas)
-- =============================================
create table public.disciplines (
  id serial primary key,
  name text not null,
  icon text,
  slug text unique not null,
  description text,
  order_index integer default 0,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Inserir disciplinas
insert into public.disciplines (name, icon, slug, order_index) values
  ('Constitucional', '⚖️', 'constitucional', 1),
  ('Administrativo', '🏛️', 'administrativo', 2),
  ('Penal', '🔒', 'penal', 3),
  ('Processo Penal', '🔍', 'processo-penal', 4),
  ('Civil', '📋', 'civil', 5),
  ('Processo Civil', '⚡', 'processo-civil', 6),
  ('Trabalho', '🦺', 'trabalho', 7),
  ('Processo do Trabalho', '👷', 'processo-trabalho', 8),
  ('Tributário', '💰', 'tributario', 9),
  ('Empresarial', '🏢', 'empresarial', 10),
  ('Ética OAB', '📜', 'etica-oab', 11),
  ('Consumidor', '🛒', 'consumidor', 12),
  ('Direitos Humanos', '🌍', 'direitos-humanos', 13),
  ('Ambiental', '🌿', 'ambiental', 14),
  ('Filosofia do Direito', '📖', 'filosofia', 15),
  ('Internacional', '🌐', 'internacional', 16),
  ('ECA', '👶', 'eca', 17);

-- =============================================
-- TABELA: questions (questões)
-- =============================================
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  discipline_id integer references public.disciplines(id),
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  explanation text,
  difficulty text default 'medio' check (difficulty in ('facil','medio','dificil')),
  xp_reward integer default 100,
  year integer,
  source text,
  tags text[] default '{}',
  min_plan text default 'free' check (min_plan in ('free','start','plus','pro','elite')),
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.questions enable row level security;
create policy "Questões públicas visíveis" on public.questions for select using (active = true);

-- =============================================
-- TABELA: question_answers (respostas do usuário)
-- =============================================
create table public.question_answers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  question_id uuid references public.questions(id),
  selected_option char(1),
  is_correct boolean,
  time_spent_seconds integer,
  xp_earned integer default 0,
  answered_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.question_answers enable row level security;
create policy "Usuários veem próprias respostas" on public.question_answers for select using (auth.uid() = user_id);
create policy "Usuários inserem próprias respostas" on public.question_answers for insert with check (auth.uid() = user_id);

-- =============================================
-- TABELA: simulados
-- =============================================
create table public.simulados (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  type text default 'oab1' check (type in ('oab1','oab2','mini','intensivo','geral')),
  total_questions integer not null,
  time_minutes integer not null,
  min_plan text default 'free' check (min_plan in ('free','start','plus','pro','elite')),
  discipline_ids integer[] default '{}',
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.simulados enable row level security;
create policy "Simulados ativos visíveis" on public.simulados for select using (active = true);

-- =============================================
-- TABELA: simulado_attempts (tentativas de simulado)
-- =============================================
create table public.simulado_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  simulado_id uuid references public.simulados(id),
  answers jsonb default '{}',
  total_questions integer,
  correct_answers integer default 0,
  accuracy_percent numeric(5,2),
  time_spent_minutes integer,
  xp_earned integer default 0,
  status text default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  started_at timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

alter table public.simulado_attempts enable row level security;
create policy "Usuários veem próprias tentativas" on public.simulado_attempts for select using (auth.uid() = user_id);
create policy "Usuários inserem tentativas" on public.simulado_attempts for insert with check (auth.uid() = user_id);
create policy "Usuários atualizam tentativas" on public.simulado_attempts for update using (auth.uid() = user_id);

-- =============================================
-- TABELA: content (resumos, PDFs, flashcards)
-- =============================================
create table public.content (
  id uuid default uuid_generate_v4() primary key,
  discipline_id integer references public.disciplines(id),
  title text not null,
  type text not null check (type in ('resumo','pdf','flashcard','observacao','mapa_mental')),
  body text,
  file_url text,
  min_plan text default 'free' check (min_plan in ('free','start','plus','pro','elite')),
  order_index integer default 0,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.content enable row level security;
create policy "Conteúdo ativo visível" on public.content for select using (active = true);

-- =============================================
-- TABELA: subscriptions (assinaturas)
-- =============================================
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('start','plus','pro','elite')),
  status text default 'active' check (status in ('active','cancelled','past_due','trialing')),
  payment_provider text default 'mercadopago',
  provider_subscription_id text,
  provider_customer_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  amount_cents integer,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.subscriptions enable row level security;
create policy "Usuários veem próprias assinaturas" on public.subscriptions for select using (auth.uid() = user_id);

-- =============================================
-- TABELA: payments (pagamentos)
-- =============================================
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  subscription_id uuid references public.subscriptions(id),
  provider_payment_id text,
  amount_cents integer not null,
  currency text default 'BRL',
  status text default 'pending' check (status in ('pending','approved','rejected','cancelled','refunded')),
  payment_method text check (payment_method in ('pix','credit_card','debit_card','boleto')),
  pix_qr_code text,
  pix_qr_code_base64 text,
  pix_copy_paste text,
  expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.payments enable row level security;
create policy "Usuários veem próprios pagamentos" on public.payments for select using (auth.uid() = user_id);

-- =============================================
-- TABELA: xp_history (histórico de XP)
-- =============================================
create table public.xp_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.xp_history enable row level security;
create policy "Usuários veem próprio XP" on public.xp_history for select using (auth.uid() = user_id);

-- =============================================
-- TABELA: daily_goals (metas diárias)
-- =============================================
create table public.daily_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null default current_date,
  questions_goal integer default 10,
  questions_done integer default 0,
  study_minutes_goal integer default 30,
  study_minutes_done integer default 0,
  completed boolean default false,
  unique(user_id, date)
);

alter table public.daily_goals enable row level security;
create policy "Usuários veem próprias metas" on public.daily_goals for select using (auth.uid() = user_id);
create policy "Usuários inserem metas" on public.daily_goals for insert with check (auth.uid() = user_id);
create policy "Usuários atualizam metas" on public.daily_goals for update using (auth.uid() = user_id);

-- =============================================
-- TABELA: ia_conversations (histórico IA)
-- =============================================
create table public.ia_conversations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  messages jsonb default '[]',
  total_tokens integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.ia_conversations enable row level security;
create policy "Usuários veem próprias conversas" on public.ia_conversations for select using (auth.uid() = user_id);
create policy "Usuários inserem conversas" on public.ia_conversations for insert with check (auth.uid() = user_id);
create policy "Usuários atualizam conversas" on public.ia_conversations for update using (auth.uid() = user_id);

-- =============================================
-- TABELA: admin_users
-- =============================================
create table public.admin_users (
  id uuid references auth.users on delete cascade primary key,
  role text default 'admin' check (role in ('admin','super_admin')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- =============================================
-- FUNÇÃO: atualizar streak automaticamente
-- =============================================
create or replace function public.update_streak()
returns trigger as $$
begin
  if new.last_study_date = current_date then
    return new;
  end if;
  if new.last_study_date = current_date - interval '1 day' then
    new.streak := coalesce(old.streak, 0) + 1;
  else
    new.streak := 1;
  end if;
  new.last_study_date := current_date;
  return new;
end;
$$ language plpgsql security definer;

-- =============================================
-- FUNÇÃO: calcular nível por XP
-- =============================================
create or replace function public.get_level_info(xp integer)
returns json as $$
declare
  level_name text;
  level_num integer;
  xp_next integer;
begin
  if xp < 1000 then level_num := 1; level_name := 'Filhote'; xp_next := 1000;
  elsif xp < 5000 then level_num := 2; level_name := 'Caçador'; xp_next := 5000;
  elsif xp < 15000 then level_num := 3; level_name := 'Alpha'; xp_next := 15000;
  elsif xp < 40000 then level_num := 4; level_name := 'Tigre Supremo'; xp_next := 40000;
  else level_num := 5; level_name := 'Mestre TigerJus'; xp_next := 999999;
  end if;
  return json_build_object('level', level_num, 'name', level_name, 'xp_next', xp_next);
end;
$$ language plpgsql;

-- =============================================
-- VIEW: ranking público
-- =============================================
create or replace view public.ranking_view as
  select
    p.id,
    p.name,
    p.avatar_url,
    p.xp,
    p.level_name,
    p.streak,
    p.plan,
    row_number() over (order by p.xp desc) as position
  from public.profiles p
  where p.xp > 0
  order by p.xp desc
  limit 100;

-- =============================================
-- ÍNDICES para performance
-- =============================================
create index idx_question_answers_user on public.question_answers(user_id);
create index idx_question_answers_question on public.question_answers(question_id);
create index idx_questions_discipline on public.questions(discipline_id);
create index idx_questions_difficulty on public.questions(difficulty);
create index idx_profiles_xp on public.profiles(xp desc);
create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_payments_user on public.payments(user_id);
create index idx_xp_history_user on public.xp_history(user_id);
create index idx_ia_conversations_user on public.ia_conversations(user_id);
