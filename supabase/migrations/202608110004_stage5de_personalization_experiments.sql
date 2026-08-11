create table if not exists public.experiment_quizzes (
  id text primary key check (id ~ '^[a-z0-9_-]{3,50}$'),
  title text not null check (char_length(title) between 2 and 80),
  prompt text not null check (char_length(prompt) between 5 and 300),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct_option_key text not null,
  reward_key text not null check (reward_key ~ '^[a-z0-9_-]{3,50}$'),
  reward_label text not null check (char_length(reward_label) between 2 and 80),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_quiz_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null references public.experiment_quizzes(id) on delete cascade,
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

create table if not exists public.interactive_polls (
  id text primary key check (id ~ '^[a-z0-9_-]{3,50}$'),
  title text not null check (char_length(title) between 2 and 80),
  question text not null check (char_length(question) between 5 and 300),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.interactive_poll_votes (
  poll_id text not null references public.interactive_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_key text not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.experiment_quizzes enable row level security;
alter table public.user_quiz_progress enable row level security;
alter table public.interactive_polls enable row level security;
alter table public.interactive_poll_votes enable row level security;

revoke all on public.experiment_quizzes from anon, authenticated;
revoke all on public.user_quiz_progress from anon, authenticated;
revoke all on public.interactive_polls from anon, authenticated;
revoke all on public.interactive_poll_votes from anon, authenticated;

insert into public.experiment_quizzes (id, title, prompt, options, correct_option_key, reward_key, reward_label, sort_order)
values
  ('director-inception', '감독의 블록', '영화 《인셉션》을 연출한 감독은 누구일까요?', '[{"key":"nolan","label":"크리스토퍼 놀란"},{"key":"villeneuve","label":"드니 빌뇌브"},{"key":"fincher","label":"데이비드 핀처"}]', 'nolan', 'red-director-block', '시네마 레드 블록', 1),
  ('parasite-award', '수상의 블록', '영화 《기생충》이 2019년 칸 영화제에서 받은 최고상은 무엇일까요?', '[{"key":"palme","label":"황금종려상"},{"key":"lion","label":"황금사자상"},{"key":"bear","label":"황금곰상"}]', 'palme', 'gold-festival-block', '페스티벌 골드 블록', 2),
  ('animation-spirit', '상상의 블록', '《센과 치히로의 행방불명》을 만든 애니메이션 스튜디오는 어디일까요?', '[{"key":"ghibli","label":"스튜디오 지브리"},{"key":"pixar","label":"픽사"},{"key":"aardman","label":"아드만"}]', 'ghibli', 'blue-imagination-block', '이매지네이션 블루 블록', 3)
on conflict (id) do update set title = excluded.title, prompt = excluded.prompt, options = excluded.options,
  correct_option_key = excluded.correct_option_key, reward_key = excluded.reward_key, reward_label = excluded.reward_label,
  active = true, sort_order = excluded.sort_order;

insert into public.interactive_polls (id, title, question, options, sort_order)
values ('next-community-theme', '이번 주 한 표', '다음 FLICK 홈에서 더 보고 싶은 영화 기록은 무엇인가요?', '[{"key":"comfort","label":"마음이 편안해지는 영화"},{"key":"twist","label":"반전이 강한 영화"},{"key":"visual","label":"미장센이 뛰어난 영화"},{"key":"classic","label":"다시 보는 고전 영화"}]', 1)
on conflict (id) do update set title = excluded.title, question = excluded.question, options = excluded.options, active = true, sort_order = excluded.sort_order;

create or replace function public.list_experiment_quizzes()
returns table (
  quiz_id text,
  title text,
  prompt text,
  options jsonb,
  reward_key text,
  reward_label text,
  attempt_count integer,
  unlocked boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return query
  select quizzes.id, quizzes.title, quizzes.prompt, quizzes.options, quizzes.reward_key, quizzes.reward_label,
         coalesce(progress.attempt_count, 0), coalesce(progress.unlocked, false)
  from public.experiment_quizzes quizzes
  left join public.user_quiz_progress progress on progress.quiz_id = quizzes.id and progress.user_id = auth.uid()
  where quizzes.active
  order by quizzes.sort_order, quizzes.id;
end;
$$;

create or replace function public.answer_experiment_quiz(p_quiz_id text, p_option_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.experiment_quizzes%rowtype;
  v_progress public.user_quiz_progress%rowtype;
  v_correct boolean;
  v_next_attempt integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_quiz from public.experiment_quizzes where id = p_quiz_id and active;
  if not found then raise exception 'quiz_not_found'; end if;
  if not exists (select 1 from jsonb_array_elements(v_quiz.options) option where option ->> 'key' = p_option_key) then raise exception 'invalid_quiz_option'; end if;

  insert into public.user_quiz_progress (user_id, quiz_id) values (auth.uid(), p_quiz_id)
  on conflict (user_id, quiz_id) do nothing;
  select * into v_progress from public.user_quiz_progress where user_id = auth.uid() and quiz_id = p_quiz_id for update;

  if v_progress.unlocked then
    return jsonb_build_object('correct', true, 'unlocked', true, 'locked', false, 'attempt_count', v_progress.attempt_count, 'attempts_remaining', greatest(0, 3 - v_progress.attempt_count), 'reward_key', v_quiz.reward_key, 'reward_label', v_quiz.reward_label);
  end if;
  if v_progress.attempt_count >= 3 then
    return jsonb_build_object('correct', false, 'unlocked', false, 'locked', true, 'attempt_count', v_progress.attempt_count, 'attempts_remaining', 0);
  end if;

  v_correct := p_option_key = v_quiz.correct_option_key;
  v_next_attempt := v_progress.attempt_count + 1;
  update public.user_quiz_progress
  set attempt_count = v_next_attempt, unlocked = v_correct,
      unlocked_at = case when v_correct then now() else unlocked_at end, updated_at = now()
  where user_id = auth.uid() and quiz_id = p_quiz_id;

  return jsonb_build_object('correct', v_correct, 'unlocked', v_correct, 'locked', not v_correct and v_next_attempt >= 3,
    'attempt_count', v_next_attempt, 'attempts_remaining', greatest(0, 3 - v_next_attempt),
    'reward_key', case when v_correct then v_quiz.reward_key else null end,
    'reward_label', case when v_correct then v_quiz.reward_label else null end);
end;
$$;

create or replace function public.list_interactive_polls()
returns table (
  poll_id text,
  title text,
  question text,
  results jsonb,
  total_votes bigint,
  my_option text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return query
  select polls.id, polls.title, polls.question,
         (select jsonb_agg(jsonb_build_object('key', option ->> 'key', 'label', option ->> 'label',
                    'count', (select count(*) from public.interactive_poll_votes votes where votes.poll_id = polls.id and votes.option_key = option ->> 'key'))
                  order by option_index)
          from jsonb_array_elements(polls.options) with ordinality values_with_order(option, option_index)),
         (select count(*) from public.interactive_poll_votes votes where votes.poll_id = polls.id),
         (select votes.option_key from public.interactive_poll_votes votes where votes.poll_id = polls.id and votes.user_id = auth.uid())
  from public.interactive_polls polls
  where polls.active
  order by polls.sort_order, polls.id;
end;
$$;

create or replace function public.vote_interactive_poll(p_poll_id text, p_option_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_options jsonb;
  v_existing text;
  v_accepted boolean := false;
  v_row_count integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select options into v_options from public.interactive_polls where id = p_poll_id and active;
  if v_options is null then raise exception 'poll_not_found'; end if;
  if not exists (select 1 from jsonb_array_elements(v_options) option where option ->> 'key' = p_option_key) then raise exception 'invalid_poll_option'; end if;

  insert into public.interactive_poll_votes (poll_id, user_id, option_key)
  values (p_poll_id, auth.uid(), p_option_key)
  on conflict (poll_id, user_id) do nothing;
  get diagnostics v_row_count = row_count;
  v_accepted := v_row_count > 0;
  select option_key into v_existing from public.interactive_poll_votes where poll_id = p_poll_id and user_id = auth.uid();

  return jsonb_build_object('accepted', v_accepted, 'option_key', v_existing,
    'total_votes', (select count(*) from public.interactive_poll_votes where poll_id = p_poll_id));
end;
$$;

revoke all on function public.list_experiment_quizzes() from public;
revoke all on function public.answer_experiment_quiz(text, text) from public;
revoke all on function public.list_interactive_polls() from public;
revoke all on function public.vote_interactive_poll(text, text) from public;
grant execute on function public.list_experiment_quizzes() to authenticated;
grant execute on function public.answer_experiment_quiz(text, text) to authenticated;
grant execute on function public.list_interactive_polls() to authenticated;
grant execute on function public.vote_interactive_poll(text, text) to authenticated;

comment on table public.experiment_quizzes is 'Fixed beta movie quiz content; correct answers never leave server RPCs.';
comment on table public.user_quiz_progress is 'Per-user three-attempt limit and hidden-block unlock state.';
comment on table public.interactive_poll_votes is 'First authenticated response per user and poll; duplicate votes are rejected.';

-- Rollback: export aggregate poll counts if needed, then drop the four experiment tables and related RPCs.
