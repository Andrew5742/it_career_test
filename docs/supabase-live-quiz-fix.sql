-- Live quiz and feedback submit fix.
-- Run this in Supabase SQL Editor after the previous schema/grants files.

create table if not exists public.live_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete set null,
  quiz_slug text not null,
  question_count int not null default 10,
  question_order jsonb not null default '[]'::jsonb,
  status text not null default 'lobby',
  phase text not null default 'lobby',
  current_question_index int not null default -1,
  phase_ends_at timestamptz,
  expires_at timestamptz,
  leaderboard jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_quiz_sessions add column if not exists leaderboard jsonb not null default '[]'::jsonb;
alter table public.live_quiz_sessions add column if not exists question_order jsonb not null default '[]'::jsonb;
alter table public.live_quiz_sessions add column if not exists status text not null default 'lobby';
alter table public.live_quiz_sessions add column if not exists phase text not null default 'lobby';
alter table public.live_quiz_sessions add column if not exists current_question_index int not null default -1;
alter table public.live_quiz_sessions add column if not exists phase_ends_at timestamptz;
alter table public.live_quiz_sessions add column if not exists expires_at timestamptz;
alter table public.live_quiz_sessions add column if not exists updated_at timestamptz not null default now();

create table if not exists public.live_quiz_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_quiz_sessions(id) on delete cascade,
  nickname text not null,
  joined_at timestamptz not null default now(),
  unique (session_id, nickname)
);

create table if not exists public.live_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_quiz_sessions(id) on delete cascade,
  player_id uuid not null references public.live_quiz_players(id) on delete cascade,
  question_id text not null,
  answer_id text,
  is_correct boolean not null default false,
  response_ms int not null default 10000,
  points int not null default 0,
  answered_at timestamptz not null default now(),
  unique (session_id, player_id, question_id)
);

alter table public.live_quiz_sessions enable row level security;
alter table public.live_quiz_players enable row level security;
alter table public.live_quiz_answers enable row level security;

grant all on public.live_quiz_sessions to anon, authenticated;
grant all on public.live_quiz_players to anon, authenticated;
grant all on public.live_quiz_answers to anon, authenticated;

drop policy if exists "Anon can manage live quiz sessions" on public.live_quiz_sessions;
drop policy if exists "Anon can manage live quiz players" on public.live_quiz_players;
drop policy if exists "Anon can manage live quiz answers" on public.live_quiz_answers;

create policy "Anon can manage live quiz sessions"
on public.live_quiz_sessions
for all
to anon, authenticated
using (true)
with check (true);

create policy "Anon can manage live quiz players"
on public.live_quiz_players
for all
to anon, authenticated
using (true)
with check (true);

create policy "Anon can manage live quiz answers"
on public.live_quiz_answers
for all
to anon, authenticated
using (true)
with check (true);

create or replace function public.submit_feedback_response(
  p_form_id uuid,
  p_participant_name text default null,
  p_participant_contact text default null,
  p_answers jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  response_id uuid;
  answer_item jsonb;
begin
  insert into public.feedback_responses (form_id, participant_name, participant_contact)
  values (p_form_id, nullif(p_participant_name, ''), nullif(p_participant_contact, ''))
  returning id into response_id;

  for answer_item in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    insert into public.feedback_answers (response_id, question_id, answer_text, answer_value)
    values (
      response_id,
      (answer_item ->> 'question_id')::uuid,
      nullif(answer_item ->> 'answer_text', ''),
      answer_item -> 'answer_value'
    );
  end loop;

  return response_id;
end;
$$;

grant execute on function public.submit_feedback_response(uuid, text, text, jsonb) to anon, authenticated;
