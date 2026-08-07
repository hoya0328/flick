export type ReviewMode = 'light' | 'core';
export type ReviewStatus = 'draft' | 'completed';
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
  answers: Record<string, string>;
  keywordIds: string[];
  questions: LightQuestion[];
  questionTags: Record<string, string[]>;
};

export type ReviewPrompt = { key: string; label: string; placeholder: string };

export const corePrompts: ReviewPrompt[] = [
  { key: 'direction', label: '연출', placeholder: '장면 전환, 리듬, 감독의 선택을 어떻게 느꼈나요?' },
  { key: 'visual', label: '영상과 미장센', placeholder: '색, 구도, 공간, 인상적인 이미지에 대해 적어보세요.' },
  { key: 'story', label: '이야기와 주제', placeholder: '서사와 영화가 던진 질문을 기록해보세요.' },
  { key: 'character', label: '인물과 연기', placeholder: '마음에 남은 인물과 관계, 연기를 적어보세요.' },
  { key: 'sound', label: '음악과 사운드', placeholder: '음악과 소리가 감상에 어떤 영향을 줬나요?' },
];

export function todayDate(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function emptyReviewForm(movieId: string): ReviewForm {
  return { movieId, mode: 'light', watchedAt: todayDate(), rating: null, body: '', oneLine: '', spoiler: false, answers: {}, keywordIds: [], questions: [], questionTags: {} };
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

  const answers = Object.values(form.answers).map((answer) => answer.trim()).filter(Boolean);
  if (form.mode === 'light') {
    if (form.questions.length !== 5) return '영화별 질문을 불러온 뒤 다시 시도해 주세요.';
    const answeredQuestions = form.questions.filter((question) => (form.questionTags[question.key]?.length ?? 0) > 0).length;
    if (answeredQuestions < 3) return '영화별 질문 5개 중 최소 3개에 느낌 태그를 선택해 주세요.';
  } else {
    const substantialAnswers = answers.filter((answer) => answer.length >= 20).length;
    if (form.body.trim().length < 100 && substantialAnswers < 2) return '자유 감상을 100자 이상 쓰거나, 두 개 이상의 항목을 충분히 기록해 주세요.';
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
