import { supabase } from '@/lib/supabase';
import { readAiOperationError } from './ai-operations';
import { lightLabels, normalizeLightDraft } from './light-flow';
import type { ReviewForm } from './review-logic';

export async function generateLightDraft(form: ReviewForm) {
  if (!supabase) throw new Error('supabase_session_required');
  const turns = form.questions.map((question) => ({ question: question.text, answer: (form.questionTags[question.key] ?? []).map((id) => question.options.find((option) => option.id === id)?.label ?? '').filter(Boolean).join(', ') }));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let response;
  try {
    response = await supabase.functions.invoke('generate-core-review-draft', { signal: controller.signal, body: { mode: 'light', consent: true, movieId: form.movieId, turns, keywords: lightLabels(form), aspects: form.lightFlow?.aspects ?? [] } });
  } finally { clearTimeout(timer); }
  const { data, error } = response;
  if (error) throw await readAiOperationError(error, data);
  const draft = normalizeLightDraft(data, lightLabels(form));
  if (!draft) throw new Error('invalid_draft');
  return draft;
}
