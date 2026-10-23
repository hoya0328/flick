export type ReviewMode = 'light' | 'core';
export type ReviewStatus = 'draft' | 'completed';
export type ReviewVisibility = 'private' | 'public';
export type LightTagOption = { id: string; label: string };
export type LightQuestion = { key: string; text: string; sourceRule: string; options: LightTagOption[] };
export type LightFlowState = {
  version: 1;
  responses: Record<string, 'answered' | 'skipped'>;
  changed: string[];
  aspects: string[];
  representativeKeywords: string[];
  draftSource: 'gemini' | 'manual' | 'demo';
};

export type ReviewForm = {
  movieId: string;
  mode: ReviewMode;
  watchedAt: string;
  rating: number | null;
  body: string;
  oneLine: string;
  spoiler: boolean;
  visibility: ReviewVisibility;
  answers: Record<string, string>;
  keywordIds: string[];
  questions: LightQuestion[];
  questionTags: Record<string, string[]>;
  lightFlow?: LightFlowState;
};

export type ReviewPrompt = { key: string; label: string; placeholder: string };
export type ReviewCompletionField = 'watchedAt' | 'rating' | 'questions';
export type ReviewCompletionIssue = { field: ReviewCompletionField; message: string };

export function todayDate(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function emptyReviewForm(movieId: string): ReviewForm {
  return { movieId, mode: 'light', watchedAt: todayDate(), rating: null, body: '', oneLine: '', spoiler: false, visibility: 'private', answers: {}, keywordIds: [], questions: [], questionTags: {} };
}

export function publicReviewPath(reviewId: string): `/review/${string}` {
  return `/review/${encodeURIComponent(reviewId)}`;
}

export function safeSharedReviewPath(value: string | undefined): `/review/${string}` | undefined {
  if (!value) return undefined;
  const match = value.match(/^\/review\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
  return match?.[1] ? publicReviewPath(match[1]) : undefined;
}

export function shouldWaitForPublicReview(
  sessionStatus: 'loading' | 'ready' | 'error',
  sessionMode: 'none' | 'demo' | 'supabase',
  hasValidPath: boolean,
  reviewStatus: 'loading' | 'ready' | 'missing' | 'error',
): boolean {
  return sessionStatus === 'loading' || (sessionMode === 'supabase' && hasValidPath && reviewStatus === 'loading');
}

export function isValidWatchedAt(value: string, today = todayDate()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function reviewCompletionIssue(form: ReviewForm): ReviewCompletionIssue | null {
  if (!isValidWatchedAt(form.watchedAt)) return { field: 'watchedAt', message: '감상일은 오늘 또는 이전 날짜를 YYYY-MM-DD 형식으로 입력해야 합니다.' };
  if (form.rating === null || !Number.isInteger(form.rating * 2) || form.rating < 0.5 || form.rating > 5) return { field: 'rating', message: '별점은 0.5~5점 사이에서 선택해야 합니다.' };

  if (form.mode === 'light') {
    if (form.questions.length !== 5) return { field: 'questions', message: 'Light 영화별 질문 5개를 모두 불러와야 합니다.' };
    if (form.lightFlow?.version === 1) {
      const complete = form.questions.every((question) => {
        const response = form.lightFlow?.responses[question.key];
        const tags = form.questionTags[question.key] ?? [];
        return response === 'skipped' ? tags.length === 0 : response === 'answered' && tags.length >= 1 && tags.length <= 3 && tags.every((id) => question.options.some((option) => option.id === id));
      });
      if (!complete) return { field: 'questions', message: '질문 5개에 답변하거나 건너뛰기를 선택해 주세요.' };
      if (!Object.values(form.questionTags).some((tags) => tags.length) && !form.body.trim()) return { field: 'questions', message: '모든 질문을 건너뛰었다면 감상을 직접 작성해 주세요.' };
      return null;
    }
    const answeredQuestions = form.questions.filter((question) => (form.questionTags[question.key]?.length ?? 0) > 0).length;
    if (answeredQuestions < 3) return { field: 'questions', message: 'Light 질문 5개 중 최소 3개에 느낌 태그를 선택해야 합니다.' };
  } else {
    if (form.questions.length !== 5) return { field: 'questions', message: 'Core 연계 질문을 Q5까지 생성하고 각 질문에 답해야 합니다.' };
    const substantialAnswers = form.questions.filter((question) => (form.answers[question.key]?.trim().length ?? 0) >= 20).length;
    if (substantialAnswers !== 5) return { field: 'questions', message: 'Core 질문 Q1~Q5에 각각 20자 이상 작성해야 합니다.' };
  }
  return null;
}

export function reviewCompletionError(form: ReviewForm): string | null {
  return reviewCompletionIssue(form)?.message ?? null;
}

export function reviewExcerpt(form: Pick<ReviewForm, 'oneLine' | 'body' | 'answers' | 'questions' | 'questionTags'>): string {
  const selectedLabels = form.questions.flatMap((question) => {
    const selected = new Set(form.questionTags[question.key] ?? []);
    return question.options.filter((option) => selected.has(option.id)).map((option) => option.label);
  });
  return form.oneLine.trim() || form.body.trim() || selectedLabels.slice(0, 4).join(' · ') || Object.values(form.answers).find((answer) => answer.trim())?.trim() || '아직 내용이 없는 초안';
}
