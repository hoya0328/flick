import { describe, expect, it } from 'vitest';

import { emojiQuizQuestions } from '../src/features/experiments/emoji-quiz-data';
import { clampEmojiQuizCount, createEmojiQuizSession, isEmojiQuizAnswerCorrect, normalizeMovieAnswer } from '../src/features/experiments/emoji-quiz-game';

describe('emoji movie quiz', () => {
  it('ships exactly 100 unique questions', () => {
    expect(emojiQuizQuestions).toHaveLength(100);
    expect(new Set(emojiQuizQuestions.map((question) => question.id)).size).toBe(100);
    expect(new Set(emojiQuizQuestions.map((question) => question.title)).size).toBe(100);
  });

  it('avoids emoji known to render as blank boxes on older Windows browsers', () => {
    const unsupported = ['🪨', '🪄', '🪞', '🪱', '🪤', '🪖', '🪦', '🫰', '🫏', '🪽', '🧸', '🧬', '🧱', '🧭', '🦾', '🦝', '🧵', '🧪', '🧽', '🐈‍⬛'];
    const allClues = emojiQuizQuestions.map((question) => question.emoji).join(' ');
    unsupported.forEach((emoji) => expect(allClues).not.toContain(emoji));
  });

  it('accepts spacing, punctuation and declared aliases only', () => {
    const question = emojiQuizQuestions.find((item) => item.id === 'q006')!;
    expect(normalizeMovieAnswer(' 어벤져스: 엔드게임 ')).toBe('어벤져스엔드게임');
    expect(isEmojiQuizAnswerCorrect(question, '엔드게임')).toBe(true);
    expect(isEmojiQuizAnswerCorrect(question, '어벤져스 인피니티 워')).toBe(false);
    expect(isEmojiQuizAnswerCorrect(question, '')).toBe(false);
  });

  it('clamps custom counts and never repeats a question', () => {
    expect(clampEmojiQuizCount(0)).toBe(1);
    expect(clampEmojiQuizCount(101)).toBe(100);
    const session = createEmojiQuizSession(30, () => 0.42);
    expect(session).toHaveLength(30);
    expect(new Set(session.map((question) => question.id)).size).toBe(30);
  });
});
