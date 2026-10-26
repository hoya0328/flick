import { supabase } from '@/lib/supabase';
import { readAiOperationError } from './ai-operations';
import { coreTurns } from './core-flow';
import type { ReviewForm } from './review-logic';

async function invoke(name: string, body: object) {
  if (!supabase) throw new Error('supabase_session_required');
  const { data, error } = await supabase.functions.invoke(name, { body, timeout: 35000 });
  if (error) throw await readAiOperationError(error, data);
  return data;
}
export async function requestCoreFeedback(form: ReviewForm, action: 'feedback' | 'replace') {
  const index = form.coreFlow!.index;
  const context = action === 'replace' ? { ...form, questions: form.questions.slice(0,index) } : form;
  const data = await invoke('generate-core-question', { mode: 'core-flow', action, consent: true, movieId: form.movieId, turns: coreTurns(context), question: form.questions[index]?.text });
  const question = typeof data?.question === 'string' ? data.question.trim().slice(0,400) : '';
  const feedback = typeof data?.feedback === 'string' ? data.feedback.trim().slice(0,700) : '';
  if ((action === 'replace' || form.questions.length < 5) && question.length < 10) throw new Error('invalid_question');
  if (action === 'feedback' && feedback.length < 20) throw new Error('invalid_feedback');
  return { question, feedback };
}
export async function requestCoreMagazine(form: ReviewForm): Promise<{title:string;draft:string;keywords:string[]}> {
  const data = await invoke('generate-core-review-draft', { mode: 'core-magazine', consent: true, movieId: form.movieId, turns: coreTurns(form) });
  const title: string = typeof data?.title === 'string' ? data.title.trim() : '';
  const draft: string = typeof data?.draft === 'string' ? data.draft.trim() : '';
  if (!title || title.length > 80 || !draft || title.length + draft.length + 2 > 1000) throw new Error('invalid_draft');
  const keywords: string[] = Array.isArray(data?.keywords) ? data.keywords.filter((x: unknown): x is string => typeof x === 'string' && x.length <= 40).slice(0,5) : [];
  return { title, draft, keywords };
}
