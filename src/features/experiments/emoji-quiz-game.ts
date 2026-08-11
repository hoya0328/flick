import { emojiQuizQuestions, type EmojiQuizQuestion } from './emoji-quiz-data';

export const EMOJI_QUIZ_MIN = 1;
export const EMOJI_QUIZ_MAX = emojiQuizQuestions.length;

export function normalizeMovieAnswer(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}]/gu, '');
}

export function isEmojiQuizAnswerCorrect(question: EmojiQuizQuestion, answer: string) {
  const normalized = normalizeMovieAnswer(answer);
  if (!normalized) return false;
  return [question.title, ...(question.aliases ?? [])].some((candidate) => normalizeMovieAnswer(candidate) === normalized);
}

export function clampEmojiQuizCount(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(EMOJI_QUIZ_MAX, Math.max(EMOJI_QUIZ_MIN, Math.floor(value)));
}

export function createEmojiQuizSession(count: number, random: () => number = Math.random) {
  const pool: EmojiQuizQuestion[] = [...emojiQuizQuestions];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const current = pool[index]!;
    pool[index] = pool[target]!;
    pool[target] = current;
  }
  return pool.slice(0, clampEmojiQuizCount(count));
}
