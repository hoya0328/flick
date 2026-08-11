import { supabase } from '@/lib/supabase';

export type ExperimentOption = { key: string; label: string };
export type ExperimentQuiz = { quizId: string; title: string; prompt: string; options: ExperimentOption[]; rewardKey: string; rewardLabel: string; attemptCount: number; unlocked: boolean };
export type QuizAnswerResult = { correct: boolean; unlocked: boolean; locked: boolean; attemptCount: number; attemptsRemaining: number; rewardKey: string | null; rewardLabel: string | null };
export type PollResultOption = ExperimentOption & { count: number };
export type InteractivePoll = { pollId: string; title: string; question: string; results: PollResultOption[]; totalVotes: number; myOption: string | null };

function client() {
  if (!supabase) throw new Error('참여 서버가 연결되지 않았어요.');
  return supabase;
}

function rowOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function optionsOf(value: unknown): ExperimentOption[] {
  return Array.isArray(value) ? value.map(rowOf).flatMap((item) => typeof item.key === 'string' && typeof item.label === 'string' ? [{ key: item.key, label: item.label }] : []) : [];
}

function experimentError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('authentication_required')) return new Error('로그인이 필요해요.');
  if (message.includes('invalid_quiz_option') || message.includes('invalid_poll_option')) return new Error('선택지를 다시 확인해 주세요.');
  if (message.includes('quiz_not_found') || message.includes('poll_not_found')) return new Error('종료되었거나 찾을 수 없는 실험이에요.');
  return new Error(message || '참여 결과를 처리하지 못했어요.');
}

export async function listExperimentQuizzes(): Promise<ExperimentQuiz[]> {
  const { data, error } = await client().rpc('list_experiment_quizzes');
  if (error) throw experimentError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    quizId: String(row.quiz_id), title: String(row.title), prompt: String(row.prompt), options: optionsOf(row.options),
    rewardKey: String(row.reward_key), rewardLabel: String(row.reward_label), attemptCount: Number(row.attempt_count ?? 0), unlocked: Boolean(row.unlocked),
  }));
}

export async function answerExperimentQuiz(quizId: string, optionKey: string): Promise<QuizAnswerResult> {
  const { data, error } = await client().rpc('answer_experiment_quiz', { p_quiz_id: quizId, p_option_key: optionKey });
  if (error) throw experimentError(error);
  const row = rowOf(data);
  return { correct: Boolean(row.correct), unlocked: Boolean(row.unlocked), locked: Boolean(row.locked), attemptCount: Number(row.attempt_count ?? 0), attemptsRemaining: Number(row.attempts_remaining ?? 0), rewardKey: typeof row.reward_key === 'string' ? row.reward_key : null, rewardLabel: typeof row.reward_label === 'string' ? row.reward_label : null };
}

export async function listInteractivePolls(): Promise<InteractivePoll[]> {
  const { data, error } = await client().rpc('list_interactive_polls');
  if (error) throw experimentError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    pollId: String(row.poll_id), title: String(row.title), question: String(row.question), totalVotes: Number(row.total_votes ?? 0),
    myOption: typeof row.my_option === 'string' ? row.my_option : null,
    results: Array.isArray(row.results) ? row.results.map(rowOf).flatMap((item) => typeof item.key === 'string' && typeof item.label === 'string' ? [{ key: item.key, label: item.label, count: Number(item.count ?? 0) }] : []) : [],
  }));
}

export async function voteInteractivePoll(pollId: string, optionKey: string) {
  const { data, error } = await client().rpc('vote_interactive_poll', { p_poll_id: pollId, p_option_key: optionKey });
  if (error) throw experimentError(error);
  const row = rowOf(data);
  return { accepted: Boolean(row.accepted), optionKey: String(row.option_key ?? ''), totalVotes: Number(row.total_votes ?? 0) };
}
