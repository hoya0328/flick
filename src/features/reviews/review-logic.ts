export type ReviewMode = 'light' | 'core';
export type ReviewStatus = 'draft' | 'completed';
export type ReviewVisibility = 'private' | 'public';
export type LightTagOption = { id: string; label: string };
export type LightQuestion = { key: string; text: string; sourceRule: string; options: LightTagOption[] };

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
};

export type ReviewPrompt = { key: string; label: string; placeholder: string };

export function todayDate(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function emptyReviewForm(movieId: string): ReviewForm {
  return { movieId, mode: 'light', watchedAt: todayDate(), rating: null, body: '', oneLine: '', spoiler: false, visibility: 'private', answers: {}, keywordIds: [], questions: [], questionTags: {} };
}

export function isValidWatchedAt(value: string, today = todayDate()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function reviewCompletionError(form: ReviewForm): string | null {
  if (!isValidWatchedAt(form.watchedAt)) return '감상일을 오늘 이전의 올바른 날짜로 입력해 주세요.';
  if (form.rating === null || !Number.isInteger(form.rating) || form.rating < 1 || form.rating > 5) return '별점을 선택해 주세요.';

  if (form.mode === 'light') {
    if (form.questions.length !== 5) return '영화별 질문을 불러온 뒤 다시 시도해 주세요.';
    const answeredQuestions = form.questions.filter((question) => (form.questionTags[question.key]?.length ?? 0) > 0).length;
    if (answeredQuestions < 3) return '영화별 질문 5개 중 최소 3개에 느낌 태그를 선택해 주세요.';
  } else {
    if (form.questions.length !== 5) return 'Core 연계 질문 5개를 모두 받은 뒤 완료해 주세요.';
    const substantialAnswers = form.questions.filter((question) => (form.answers[question.key]?.trim().length ?? 0) >= 20).length;
    if (substantialAnswers !== 5) return 'Core 질문 5개에 각각 20자 이상 답해 주세요.';
  }
  return null;
}

export function reviewExcerpt(form: Pick<ReviewForm, 'oneLine' | 'body' | 'answers' | 'questions' | 'questionTags'>): string {
  const selectedLabels = form.questions.flatMap((question) => {
    const selected = new Set(form.questionTags[question.key] ?? []);
    return question.options.filter((option) => selected.has(option.id)).map((option) => option.label);
  });
  return form.oneLine.trim() || form.body.trim() || selectedLabels.slice(0, 4).join(' · ') || Object.values(form.answers).find((answer) => answer.trim())?.trim() || '아직 내용이 없는 초안';
}
