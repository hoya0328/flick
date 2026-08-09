import { describe, expect, it } from 'vitest';

import { emptyReviewForm, isValidWatchedAt, publicReviewPath, reviewCompletionError, reviewCompletionIssue, reviewExcerpt, safeSharedReviewPath } from '../src/features/reviews/review-logic';

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

  it('identifies the section that should receive completion guidance', () => {
    const empty = { ...emptyReviewForm('movie-1'), watchedAt: '2026-08-07' };
    expect(reviewCompletionIssue(empty)?.field).toBe('rating');

    const questions = Array.from({ length: 5 }, (_, index) => ({ key: `q${index + 1}`, text: `질문 ${index + 1}`, sourceRule: 'test', options: [] }));
    const missingTags = { ...empty, rating: 4, questions };
    expect(reviewCompletionIssue(missingTags)).toMatchObject({ field: 'questions' });
  });

  it('requires depth for a Core record', () => {
    const questions = Array.from({ length: 5 }, (_, index) => ({ key: `core_q${index + 1}`, text: `Core 질문 ${index + 1}`, sourceRule: 'test', options: [] }));
    const form = { ...emptyReviewForm('movie-1'), mode: 'core' as const, watchedAt: '2026-08-07', rating: 5, questions };
    expect(reviewCompletionError(form)).toContain('각각 20자');
    expect(reviewCompletionError({ ...form, answers: Object.fromEntries(questions.map((question) => [question.key, '장면의 구도와 인물의 선택이 주제를 선명하게 보여주었다.'])) })).toBeNull();
  });

  it('defaults every review to private visibility', () => {
    expect(emptyReviewForm('movie-1').visibility).toBe('private');
  });

  it('only accepts a UUID-based internal public review return path', () => {
    const id = 'e9e7874e-8098-4192-8229-8e45f9674d95';
    expect(publicReviewPath(id)).toBe(`/review/${id}`);
    expect(safeSharedReviewPath(`/review/${id}`)).toBe(`/review/${id}`);
    expect(safeSharedReviewPath('/record?reviewId=friend')).toBeUndefined();
    expect(safeSharedReviewPath('https://evil.example')).toBeUndefined();
  });

  it('uses the first meaningful field for list previews', () => {
    expect(reviewExcerpt({ oneLine: '', body: '', answers: { story: '기억에 남은 이야기' }, questions: [], questionTags: {} })).toBe('기억에 남은 이야기');
  });
});
