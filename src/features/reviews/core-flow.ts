import type { Movie } from '@/features/discovery/movies';
import { initialCoreQuestion } from './core-questions';
import { emptyReviewForm, type LightQuestion, type ReviewForm } from './review-logic';
import { CORE_MAGAZINE_LIMIT, magazineBody, type CoreFlowState, type MagazineBlock } from './core-magazine-logic';

export { magazineText, magazineBody, coreFlowIssue, type MagazineBlock, type CoreFlowState } from './core-magazine-logic';
export const coreTurns = (form: ReviewForm) => form.questions.filter((q) => (form.answers[q.key]?.trim().length ?? 0) >= 10).map((q) => ({ question: q.text, answer: form.answers[q.key]!.trim() }));
export function newCoreForm(movie: Movie): ReviewForm {
  const first = initialCoreQuestion(movie);
  first.text = `「${movie.title}」에서 가장 강하게 기억에 남은 장면이나 감정은 무엇이었나요?`;
  return { ...emptyReviewForm(movie.id), mode: 'core', questions: [first], coreFlow: { version: 1, changed: [], feedback: {}, nextQuestions: {}, stage: 'question', index: 0, title: '', blocks: [], cover: null, keywords: [], source: 'manual' } };
}
export function blockFromText(text: string, id = 'p1'): MagazineBlock { return { id, text, bold: false, italic: false, size: 15, kind: 'paragraph' }; }
export function updateMagazine(form: ReviewForm, flow: CoreFlowState): ReviewForm {
  return { ...form, coreFlow: flow, oneLine: flow.title, body: magazineBody(flow) };
}
export function replaceCoreQuestion(form: ReviewForm, index: number, question: LightQuestion): ReviewForm {
  const flow = form.coreFlow;
  const old = form.questions[index];
  if (!flow || !old || flow.changed.includes(old.key)) return form;
  // Reset only after explicit user confirmation; future dependent turns must not
  // survive a changed premise. Old question-change flags remain consumed.
  const keep = new Set(form.questions.slice(0, index).map((q) => q.key));
  return { ...form, questions: [...form.questions.slice(0, index), { ...question, key: old.key }], answers: Object.fromEntries(Object.entries(form.answers).filter(([key]) => keep.has(key))), coreFlow: { ...flow, changed: [...flow.changed, old.key], feedback: Object.fromEntries(Object.entries(flow.feedback).filter(([key]) => keep.has(key))), nextQuestions: Object.fromEntries(Object.entries(flow.nextQuestions).filter(([key]) => keep.has(key))), stage: 'question', index } };
}
export function manualMagazine(form: ReviewForm, title: string): ReviewForm {
  const flow = form.coreFlow!;
  const safeTitle = `${title}에 남긴 나의 감상`.slice(0, 80);
  const available = CORE_MAGAZINE_LIMIT - safeTitle.length - 2;
  const text = coreTurns(form).map((turn) => turn.answer).join('\n\n').slice(0, available);
  return updateMagazine(form, { ...flow, stage: 'summary', title: safeTitle, blocks: [blockFromText(text)], source: 'manual', keywords: [] });
}
