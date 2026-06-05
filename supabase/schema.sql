create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  native_language text not null default 'es',
  english_level text not null default 'beginner',
  daily_goal_minutes int not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists public.phrases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text_en text not null,
  text_es text not null default '',
  pronunciation text not null default '',
  topic text not null,
  level text not null default 'beginner',
  favorite boolean not null default false,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.speaking_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  topic text not null,
  duration_seconds int not null default 0,
  fluency_level int not null default 3 check (fluency_level between 1 and 5),
  notes text not null default '',
  phrase_ids uuid[] not null default '{}',
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_generation_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  model text not null default 'deepseek-v4-flash',
  prompt text not null,
  response jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Conversations & Paragraphs (AI generated)
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  mode text not null default 'dialogue' check (mode in ('dialogue','paragraph')),
  topic text not null,
  level text not null default 'beginner',
  title text not null default '',
  summary_es text not null default '',
  lines jsonb not null default '[]'::jsonb,
  source text not null default 'ai',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists conversations_user_created_idx
  on public.conversations (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.phrases enable row level security;
alter table public.speaking_sessions enable row level security;
alter table public.ai_generation_logs enable row level security;
alter table public.conversations enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "phrases_crud_own" on public.phrases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_crud_own" on public.speaking_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "logs_crud_own" on public.ai_generation_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conversations_crud_own" on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
