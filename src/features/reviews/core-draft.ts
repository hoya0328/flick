import type { ReviewForm } from '@/features/reviews/review-logic';

export type CoreReviewDraft = { keywords: string[]; draft: string };

export function isCoreDraftReady(form: Pick<ReviewForm, 'questions' | 'answers'>): boolean {
  return form.questions.length === 5
    && form.questions.every((question) => (form.answers[question.key]?.trim().length ?? 0) >= 20);
}

export function normalizeCoreReviewDraft(value: unknown): CoreReviewDraft | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { keywords?: unknown; draft?: unknown };
  const keywords = Array.isArray(candidate.keywords)
    ? [...new Set(candidate.keywords
      .filter((keyword): keyword is string => typeof keyword === 'string')
      .map((keyword) => keyword.trim().slice(0, 40))
      .filter(Boolean))].slice(0, 5)
    : [];
  const draft = typeof candidate.draft === 'string' ? candidate.draft.trim().slice(0, 1200) : '';
  if (keywords.length < 3 || draft.length < 250) return null;
  return { keywords, draft };
}
