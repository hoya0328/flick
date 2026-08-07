import { describe, expect, it } from 'vitest';

import { ensureCoreQuestions, fallbackCoreQuestion, updateCoreAnswer } from '../src/features/reviews/core-questions';
import { emptyReviewForm } from '../src/features/reviews/review-logic';

describe('Core linked questions', () => {
  it('starts with one deterministic movie question', () => {
    const form = ensureCoreQuestions({ ...emptyReviewForm('movie-1'), mode: 'core' }, null, '듄: 파트 2');
    expect(form.questions).toHaveLength(1);
    expect(form.questions[0]?.text).toContain('듄: 파트 2');
    expect(form.questions[0]?.key).toBe('core_q1');
  });

  it('provides a five-step fallback without an API call', () => {
    expect(fallbackCoreQuestion(1, '테스트 영화').key).toBe('core_q2');
    expect(fallbackCoreQuestion(4, '테스트 영화').text).toContain('오래 기억');
  });

  it('removes downstream questions when an earlier answer changes', () => {
    const questions = Array.from({ length: 3 }, (_, index) => fallbackCoreQuestion(index, '테스트 영화'));
    const form = { ...emptyReviewForm('movie-1'), mode: 'core' as const, questions, answers: { core_q1: '기존 첫 답변입니다 충분히 길게 작성합니다.', core_q2: '두 번째 답변입니다 충분히 길게 작성합니다.', core_q3: '세 번째 답변입니다 충분히 길게 작성합니다.' } };
    const updated = updateCoreAnswer(form, 0, '수정된 첫 답변입니다 충분히 길게 다시 작성합니다.');
    expect(updated.questions).toHaveLength(1);
    expect(updated.answers.core_q2).toBeUndefined();
  });
});
