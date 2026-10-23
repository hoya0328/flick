import { describe, expect, it } from 'vitest';
import { changeLightQuestion, lightLabels, newLightForm, normalizeLightDraft, ratingAtPosition, ratingMessage, respondToLight } from '../src/features/reviews/light-flow';
import { reviewCompletionIssue } from '../src/features/reviews/review-logic';
import type { Movie } from '../src/features/discovery/discovery-logic';

const movie = { id: '10000000-0000-4000-8000-000000000001', title: '인셉션' } as Movie;
describe('Figma Light review state', () => {
  it('creates exactly five snapshot questions, private by default', () => {
    const form = newLightForm(movie);
    expect(form.questions).toHaveLength(5);
    expect(form.questions.every((question) => question.text.includes(movie.title))).toBe(true);
    expect(form.visibility).toBe('private');
  });
  it('maps touch positions to clamped half stars and all ten exact messages', () => {
    expect(ratingAtPosition(-1, 100)).toBe(0.5);
    expect(ratingAtPosition(46, 100)).toBe(2.5);
    expect(ratingAtPosition(101, 100)).toBe(5);
    expect(ratingMessage(0.5)).toBe('나랑은 조금 안 맞아요');
    expect(ratingMessage(2.5)).toBe('나쁘진 않은데 2%가 부족해요');
    expect(ratingMessage(5)).toBe('드디어 인생 영화를 만났어요');
  });
  it('skips by removing selected tags, not just advancing the visible question', () => {
    const form = newLightForm(movie);
    form.questionTags.light_q1 = ['feeling_0'];
    const skipped = respondToLight(form, 0, true);
    expect(skipped.questionTags.light_q1).toEqual([]);
    expect(skipped.lightFlow?.responses.light_q1).toBe('skipped');
    expect(lightLabels(skipped)).toEqual([]);
  });
  it('does not mark an empty answer as completed', () => {
    const form = newLightForm(movie);
    expect(respondToLight(form, 0, false)).toBe(form);
  });
  it('permits one replacement per question and clears the old answer', () => {
    const form = newLightForm(movie);
    form.questionTags.light_q1 = ['feeling_0'];
    const answered = respondToLight(form, 0, false);
    const changed = changeLightQuestion(answered, 0);
    expect(changed.questions[0]?.text).not.toBe(form.questions[0]?.text);
    expect(changed.questionTags.light_q1).toEqual([]);
    expect(changed.lightFlow?.responses.light_q1).toBeUndefined();
    expect(changeLightQuestion(changed, 0)).toBe(changed);
    // Flags survive JSON storage and reload.
    const restored = JSON.parse(JSON.stringify(changed));
    expect(changeLightQuestion(restored, 0)).toBe(restored);
  });
  it('accepts explicit skips without the legacy three-answer trap', () => {
    let form = newLightForm(movie);
    form.rating = 0.5;
    form.questionTags.light_q1 = ['feeling_0'];
    form = respondToLight(form, 0, false);
    for (let i = 1; i < 5; i++) form = respondToLight(form, i, true);
    expect(reviewCompletionIssue(form)).toBeNull();
    form.rating = 0.6;
    expect(reviewCompletionIssue(form)?.field).toBe('rating');
  });
  it('requires manual content when every question is skipped', () => {
    let form = newLightForm(movie);
    form.rating = 4.5;
    for (let i = 0; i < 5; i++) form = respondToLight(form, i, true);
    expect(reviewCompletionIssue(form)?.message).toContain('직접 작성');
    expect(reviewCompletionIssue({ ...form, body: '다음에 다시 보고 싶다.' })).toBeNull();
  });
  it('rejects invalid selected IDs and unfinished questions', () => {
    let form = newLightForm(movie);
    form.rating = 4;
    expect(reviewCompletionIssue(form)?.field).toBe('questions');
    for (let i = 0; i < 5; i++) form = respondToLight(form, i, true);
    form = { ...form, questionTags: { light_q1: ['not-an-option'] }, lightFlow: { ...form.lightFlow!, responses: { ...form.lightFlow!.responses, light_q1: 'answered' } } };
    expect(reviewCompletionIssue(form)?.field).toBe('questions');
  });
  it('only accepts AI representatives actually present in user tags, max five', () => {
    const allowed = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(normalizeLightDraft({ keywords: ['a', 'a', 'invented', 'b', 'c', 'd', 'e', 'f'], draft: '내 감상' }, allowed)?.keywords).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(normalizeLightDraft({ keywords: ['invented'], draft: '내 감상' }, allowed)).toBeNull();
    expect(normalizeLightDraft({ keywords: ['a'], draft: 'x'.repeat(600) }, allowed)?.draft).toHaveLength(500);
  });
});
