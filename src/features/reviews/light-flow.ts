import type { Movie } from '@/features/discovery/movies';
import { emptyReviewForm, type ReviewForm } from './review-logic';

export const ratingMessages = [
  '나랑은 조금 안 맞아요', '조금 낯설게 느껴졌어요', '기대가 컸던 만큼 아쉬움이 남아요',
  '한 번 본 걸로 충분할 것 같아요', '나쁘진 않은데 2%가 부족해요', '은근히 계속 생각나요',
  '남들에게 추천해주고 싶어요', '완전 내 취향이에요', '여운이 가시질 않아요', '드디어 인생 영화를 만났어요',
] as const;
export const filmAspects = ['연출', '사운드트랙', '미장센', '연기', '각본', '촬영 기법', '시각 효과'];
export const feelingWords = ['몽환적인', '소용돌이', '매끄러운', '낭만적인', '거친', '온도', '여백', '잔상', '질감', '리듬', '궤도', '파편', '심연', '색채', '침묵', '서늘한', '강렬한', '따스한', '적막한', '건조한', '기괴한', '아련한', '잔잔한', '눈부신', '날것의', '섬뜩한', '쓸쓸한', '경쾌한', '공허한', '포근한', '촘촘한', '끈적한', '세계관', '헐거운', '잿빛의', '꿉꿉한', '투명한', '유쾌한', '빛바랜', '묵직한', '창백한', '부유하는'];
const questionPairs = [
  ['이 영화가 가진 독보적인 분위기를 블럭으로 표현한다면?', '이 영화의 색채와 공기를 한마디로 남긴다면?'],
  ['이 영화의 가장 강력한 무기는 무엇이었나요?', '이 영화를 특별하게 만든 순간의 느낌은?'],
  ['몰입을 방해해 아쉬웠던 부분은 무엇인가요?', '조금 다르게 표현되었으면 하는 부분의 느낌은?'],
  ['가장 인상 깊게 남은 감정은 무엇인가요?', '엔딩 뒤에도 마음에 남아 있는 감정은?'],
  ['이 영화를 다시 보고 싶은 때는 언제인가요?', '이 영화가 떠오를 것 같은 하루의 분위기는?'],
];

export function ratingAtPosition(x: number, width: number): number {
  return Math.max(0.5, Math.min(5, Math.ceil(Math.max(0, x) / Math.max(1, width) * 10) / 2));
}
export function ratingMessage(rating: number | null): string {
  return rating ? ratingMessages[Math.round(rating * 2) - 1] ?? '' : '별을 밀어서 나의 별점을 남겨주세요';
}
export function newLightForm(movie: Movie): ReviewForm {
  return {
    ...emptyReviewForm(movie.id),
    questions: questionPairs.map(([text], index) => ({ key: `light_q${index + 1}`, text: `「${movie.title}」 ${text}`, sourceRule: 'figma-light-v1', options: feelingWords.map((label, i) => ({ id: `feeling_${i}`, label })) })),
    lightFlow: { version: 1, responses: {}, changed: [], aspects: [], representativeKeywords: [], draftSource: 'manual' },
  };
}
export function changeLightQuestion(form: ReviewForm, index: number): ReviewForm {
  const question = form.questions[index];
  if (!question || !form.lightFlow || form.lightFlow.changed.includes(question.key)) return form;
  const responses = { ...form.lightFlow.responses };
  delete responses[question.key];
  const questionTags = { ...form.questionTags, [question.key]: [] };
  return { ...form, questionTags, questions: form.questions.map((item, i) => i === index ? { ...item, text: questionPairs[index]![1]!, sourceRule: 'figma-light-v1-alternate' } : item), lightFlow: { ...form.lightFlow, changed: [...form.lightFlow.changed, question.key], responses } };
}
export function respondToLight(form: ReviewForm, index: number, skip: boolean): ReviewForm {
  const question = form.questions[index];
  if (!question || !form.lightFlow) return form;
  const selected = form.questionTags[question.key] ?? [];
  if (!skip && selected.length === 0) return form;
  return { ...form, questionTags: { ...form.questionTags, [question.key]: skip ? [] : selected }, lightFlow: { ...form.lightFlow, responses: { ...form.lightFlow.responses, [question.key]: skip ? 'skipped' : 'answered' } } };
}
export function lightLabels(form: ReviewForm): string[] {
  return [...new Set(form.questions.flatMap((question) => (form.questionTags[question.key] ?? []).flatMap((id) => question.options.find((option) => option.id === id)?.label ?? [])))];
}
export function normalizeLightDraft(value: unknown, allowed: string[]): { keywords: string[]; draft: string } | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as { keywords?: unknown; draft?: unknown };
  const keywords = Array.isArray(result.keywords) ? [...new Set(result.keywords.filter((word): word is string => typeof word === 'string' && allowed.includes(word)))].slice(0, 5) : [];
  const draft = typeof result.draft === 'string' ? result.draft.trim().slice(0, 500) : '';
  return keywords.length && draft ? { keywords, draft } : null;
}
