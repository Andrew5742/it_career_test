-- Draft Supabase schema for admin, materials, quizzes, workshops, and feedback.
-- Run this in the Supabase SQL editor after reviewing it for the target project.
-- The frontend must use only the anon key. Do not expose a service_role key in client code.

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'link',
  view_url text,
  download_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  default_question_count int not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'role',
  explanation text,
  visual_type text not null default 'general',
  difficulty text not null default 'easy',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_questions_question_type_check check (question_type in ('role', 'task', 'tool', 'myth', 'situation', 'specialty')),
  constraint quiz_questions_visual_type_check check (visual_type in ('frontend', 'backend', 'fullstack', 'qa', 'ux', 'data', 'ai', 'cybersecurity', 'devops', 'sysadmin', 'database', 'network', 'embedded', 'gamedev', 'manager', 'general')),
  constraint quiz_questions_difficulty_check check (difficulty in ('easy', 'medium', 'hard'))
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean not null default false,
  tags text[] not null default '{}',
  sort_order int not null default 0
);

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  participant_label text
);

create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete set null,
  quiz_slug text,
  session_id uuid references public.quiz_sessions(id) on delete set null,
  participant_label text,
  score integer not null default 0,
  total integer not null default 0,
  top_tags text[] not null default '{}',
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_forms (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid references public.workshops(id) on delete set null,
  title text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.feedback_forms(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'text',
  options jsonb,
  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.feedback_forms(id) on delete cascade,
  participant_name text,
  participant_contact text,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.feedback_responses(id) on delete cascade,
  question_id uuid not null references public.feedback_questions(id) on delete cascade,
  answer_text text,
  answer_value jsonb
);

alter table public.admin_profiles enable row level security;
alter table public.materials enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_results enable row level security;
alter table public.workshops enable row level security;
alter table public.feedback_forms enable row level security;
alter table public.feedback_questions enable row level security;
alter table public.feedback_responses enable row level security;
alter table public.feedback_answers enable row level security;

grant usage on schema public to anon, authenticated;

grant select on public.materials to anon, authenticated;
grant select on public.quizzes to anon, authenticated;
grant select on public.quiz_questions to anon, authenticated;
grant select on public.quiz_answers to anon, authenticated;
grant insert on public.quiz_sessions to anon, authenticated;
grant insert on public.quiz_results to anon, authenticated;
grant select on public.workshops to anon, authenticated;
grant select on public.feedback_forms to anon, authenticated;
grant select on public.feedback_questions to anon, authenticated;
grant insert on public.feedback_responses to anon, authenticated;
grant insert on public.feedback_answers to anon, authenticated;

grant all on public.admin_profiles to authenticated;
grant all on public.materials to authenticated;
grant all on public.quizzes to authenticated;
grant all on public.quiz_questions to authenticated;
grant all on public.quiz_answers to authenticated;
grant all on public.quiz_sessions to authenticated;
grant all on public.quiz_results to authenticated;
grant all on public.workshops to authenticated;
grant all on public.feedback_forms to authenticated;
grant all on public.feedback_questions to authenticated;
grant all on public.feedback_responses to authenticated;
grant all on public.feedback_answers to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "Admins can read admin profiles" on public.admin_profiles;
drop policy if exists "Anon can read active materials" on public.materials;
drop policy if exists "Anon can read active quizzes" on public.quizzes;
drop policy if exists "Anon can read active quiz questions" on public.quiz_questions;
drop policy if exists "Anon can read active quiz answers" on public.quiz_answers;
drop policy if exists "Anon can read active workshops" on public.workshops;
drop policy if exists "Anon can read active feedback forms" on public.feedback_forms;
drop policy if exists "Anon can read active feedback questions" on public.feedback_questions;
drop policy if exists "Anon can insert quiz results" on public.quiz_results;
drop policy if exists "Anon can insert feedback responses" on public.feedback_responses;
drop policy if exists "Anon can insert feedback answers" on public.feedback_answers;
drop policy if exists "Admins can manage materials" on public.materials;
drop policy if exists "Admins can manage quizzes" on public.quizzes;
drop policy if exists "Admins can manage quiz questions" on public.quiz_questions;
drop policy if exists "Admins can manage quiz answers" on public.quiz_answers;
drop policy if exists "Admins can manage workshops" on public.workshops;
drop policy if exists "Admins can manage feedback forms" on public.feedback_forms;
drop policy if exists "Admins can manage feedback questions" on public.feedback_questions;
drop policy if exists "Admins can read quiz sessions" on public.quiz_sessions;
drop policy if exists "Admins can read quiz results" on public.quiz_results;
drop policy if exists "Admins can read feedback responses" on public.feedback_responses;
drop policy if exists "Admins can read feedback answers" on public.feedback_answers;

create policy "Admins can read admin profiles"
on public.admin_profiles
for select
to authenticated
using (public.is_admin());

create policy "Anon can read active materials"
on public.materials
for select
to anon
using (is_active = true);

create policy "Anon can read active quizzes"
on public.quizzes
for select
to anon
using (is_active = true);

create policy "Anon can read active quiz questions"
on public.quiz_questions
for select
to anon
using (
  is_active = true
  and exists (
    select 1 from public.quizzes
    where quizzes.id = quiz_questions.quiz_id
      and quizzes.is_active = true
  )
);

create policy "Anon can read active quiz answers"
on public.quiz_answers
for select
to anon
using (
  exists (
    select 1
    from public.quiz_questions
    join public.quizzes on quizzes.id = quiz_questions.quiz_id
    where quiz_questions.id = quiz_answers.question_id
      and quiz_questions.is_active = true
      and quizzes.is_active = true
  )
);

create policy "Anon can read active workshops"
on public.workshops
for select
to anon
using (is_active = true);

create policy "Anon can read active feedback forms"
on public.feedback_forms
for select
to anon
using (
  is_active = true
  and (
    workshop_id is null
    or exists (
      select 1 from public.workshops
      where workshops.id = feedback_forms.workshop_id
        and workshops.is_active = true
    )
  )
);

create policy "Anon can read active feedback questions"
on public.feedback_questions
for select
to anon
using (
  is_active = true
  and exists (
    select 1 from public.feedback_forms
    where feedback_forms.id = feedback_questions.form_id
      and feedback_forms.is_active = true
  )
);

create policy "Anon can insert quiz results"
on public.quiz_results
for insert
to anon
with check (true);

create policy "Anon can insert feedback responses"
on public.feedback_responses
for insert
to anon
with check (true);

create policy "Anon can insert feedback answers"
on public.feedback_answers
for insert
to anon
with check (true);

create policy "Admins can manage materials"
on public.materials
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage quizzes"
on public.quizzes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage quiz questions"
on public.quiz_questions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage quiz answers"
on public.quiz_answers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage workshops"
on public.workshops
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage feedback forms"
on public.feedback_forms
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage feedback questions"
on public.feedback_questions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read quiz sessions"
on public.quiz_sessions
for select
to authenticated
using (public.is_admin());

create policy "Admins can read quiz results"
on public.quiz_results
for select
to authenticated
using (public.is_admin());

create policy "Admins can read feedback responses"
on public.feedback_responses
for select
to authenticated
using (public.is_admin());

create policy "Admins can read feedback answers"
on public.feedback_answers
for select
to authenticated
using (public.is_admin());

-- RLS concept summary:
-- anon can select only active materials.
-- anon can select only active quizzes, questions, and answers.
-- anon can select active workshops, forms, and questions.
-- anon can insert feedback_responses and feedback_answers.
-- anon cannot update or delete public or quiz data because no anon update/delete policies exist.
-- admin can CRUD materials, workshops, forms, questions, quizzes, quiz questions, and quiz answers.
-- admin can review feedback responses and answers.
-- service_role is not used in the frontend.
