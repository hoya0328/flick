import { describe, expect, it } from 'vitest';

import { emptyReviewForm, isValidWatchedAt, reviewCompletionError, reviewExcerpt } from '../src/features/reviews/review-logic';

describe('stage 3A/3B review rules', () => {
  it('rejects impossible and future viewing dates', () => {
    expect(isValidWatchedAt('2026-02-30', '2026-08-07')).toBe(false);
    expect(isValidWatchedAt('2026-08-08', '2026-08-07')).toBe(false);
    expect(isValidWatchedAt('2026-08-07', '2026-08-07')).toBe(true);
  });

  it('completes a Light record after three movie questions have tagged answers', () => {
    const questions = Array.from({ length: 5 }, (_, index) => ({ key: `q${index + 1}`, text: `질문 ${index + 1}`, sourceRule: 'test', options: [{ id: 'warm', label: '따뜻한' }] }));
    const form = { ...emptyReviewForm('movie-1'), watchedAt: '2026-08-07', rating: 4, questions, questionTags: { q1: ['warm'], q2: ['warm'], q3: ['warm'] } };
    expect(reviewCompletionError(form)).toBeNull();
  });

  it('requires depth for a Core record', () => {
    const form = { ...emptyReviewForm('movie-1'), mode: 'core' as const, watchedAt: '2026-08-07', rating: 5 };
    expect(reviewCompletionError(form)).toContain('100자');
    expect(reviewCompletionError({ ...form, answers: { direction: '절제된 화면 전환이 감정의 리듬을 선명하게 만들었다.', visual: '좁은 공간의 구도와 대비되는 색감이 인물의 불안을 강화했다.' } })).toBeNull();
  });

  it('uses the first meaningful field for list previews', () => {
    expect(reviewExcerpt({ oneLine: '', body: '', answers: { story: '기억에 남은 이야기' }, questions: [], questionTags: {} })).toBe('기억에 남은 이야기');
  });
});
