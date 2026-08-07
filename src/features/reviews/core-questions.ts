import type { Movie } from '@/features/discovery/discovery-logic';
import type { LightQuestion, ReviewForm } from '@/features/reviews/review-logic';

export const CORE_QUESTION_LIMIT = 5;

export function initialCoreQuestion(movie: Movie | null, fallbackTitle = '선택한 영화'): LightQuestion {
  const title = movie?.title || fallbackTitle;
  const director = movie?.details?.directorNames[0];
  const genre = movie?.genres[0];
  const context = director ? `${director} 감독의 연출을 포함해` : genre ? `${genre} 영화로서` : '영화 전체를 돌아보며';
  return {
    key: 'core_q1',
    text: `「${title}」을 ${context} 가장 강하게 기억하게 만든 장면이나 감정은 무엇이었나요?`,
    sourceRule: 'core-seed-metadata-v1',
    options: [],
  };
}

export function ensureCoreQuestions(form: ReviewForm, movie: Movie | null, fallbackTitle = '선택한 영화'): ReviewForm {
  const existing = form.questions.filter((question) => question.key.startsWith('core_q')).slice(0, CORE_QUESTION_LIMIT);
  return { ...form, questions: existing.length ? existing : [initialCoreQuestion(movie, fallbackTitle)] };
}

export function fallbackCoreQuestion(index: number, movieTitle: string): LightQuestion {
  const texts = [
    `「${movieTitle}」에서 가장 강하게 기억에 남은 장면이나 감정은 무엇이었나요?`,
    `방금 답한 감정을 만들어 낸 「${movieTitle}」의 연출이나 구체적인 장면은 무엇이었나요?`,
    `그 장면에서 인물의 선택이나 관계는 당신의 해석에 어떤 영향을 주었나요?`,
    `지금까지의 답을 바탕으로 「${movieTitle}」이 말하려는 핵심 주제를 어떻게 받아들였나요?`,
    `앞선 생각을 모두 모았을 때, 이 영화를 오래 기억하게 될 이유를 한 가지로 정리한다면 무엇인가요?`,
  ];
  return { key: `core_q${index + 1}`, text: texts[index] ?? texts[4]!, sourceRule: 'core-fallback-v1', options: [] };
}

export function updateCoreAnswer(form: ReviewForm, index: number, answer: string): ReviewForm {
  const keptQuestions = form.questions.slice(0, index + 1);
  const removedKeys = new Set(form.questions.slice(index + 1).map((question) => question.key));
  return {
    ...form,
    questions: keptQuestions,
    answers: Object.fromEntries(Object.entries({ ...form.answers, [keptQuestions[index]!.key]: answer }).filter(([key]) => !removedKeys.has(key))),
  };
}
