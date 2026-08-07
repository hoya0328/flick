import { normalizeCoreReviewDraft, type CoreReviewDraft } from '@/features/reviews/core-draft';
import { readAiOperationError } from '@/features/reviews/ai-operations';
import type { ReviewForm } from '@/features/reviews/review-logic';
import { supabase } from '@/lib/supabase';

export async function generateCoreReviewDraft(
  form: ReviewForm,
  sessionMode: 'demo' | 'supabase',
): Promise<CoreReviewDraft> {
  if (sessionMode !== 'supabase' || !supabase) throw new Error('supabase_session_required');

  const turns = form.questions.map((question) => ({
    question: question.text,
    answer: form.answers[question.key]?.trim() ?? '',
  }));
  const { data, error } = await supabase.functions.invoke('generate-core-review-draft', {
    body: { movieId: form.movieId, turns },
  });
  if (error) throw await readAiOperationError(error, data);
  const result = normalizeCoreReviewDraft(data);
  if (!result) throw new Error('invalid_draft');
  return result;
}
