-- Supabase grants fix for frontend anon/authenticated roles.
-- Run this after docs/supabase-schema.sql if admin screens show "permission denied for table ...".
-- RLS policies still control what anon and authenticated users can actually do.

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

grant execute on function public.is_admin() to anon, authenticated;
