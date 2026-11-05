import { normalizeCoreFlow } from './core-magazine-logic';
import { emptyReviewForm, normalizeLightFlow, type LightQuestion, type ReviewForm } from './review-logic';
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown, count: number, length: number): value is string[] => Array.isArray(value) && value.length <= count && value.every(item => typeof item === 'string' && item.length <= length);
export function normalizeBackupForm(value: unknown, movieId: string): ReviewForm | null {
  if (!object(value) || value.movieId !== movieId || !['light', 'core'].includes(String(value.mode)) || typeof value.watchedAt !== 'string' || value.watchedAt.length > 10 || (value.rating !== null && (typeof value.rating !== 'number' || !Number.isFinite(value.rating) || value.rating < .5 || value.rating > 5 || !Number.isInteger(value.rating * 2))) || typeof value.body !== 'string' || value.body.length > 20000 || typeof value.oneLine !== 'string' || value.oneLine.length > 1000 || typeof value.spoiler !== 'boolean' || !['private', 'public'].includes(String(value.visibility)) || !strings(value.keywordIds, 20, 80) || !object(value.answers) || !object(value.questionTags) || !Array.isArray(value.questions) || value.questions.length > 5) return null;
  const answers: Record<string, string> = {}, tags: Record<string, string[]> = {}, questions: LightQuestion[] = [];
  if (Object.keys(value.answers).length > 10 || Object.keys(value.questionTags).length > 10) return null;
  for (const [key, text] of Object.entries(value.answers)) { if (key.length > 40 || typeof text !== 'string' || text.length > 20000) return null; answers[key] = text; }
  for (const [key, list] of Object.entries(value.questionTags)) { if (key.length > 40 || !strings(list, 20, 80)) return null; tags[key] = [...list]; }
  for (const question of value.questions) {
    if (!object(question) || typeof question.key !== 'string' || !question.key || question.key.length > 40 || questions.some(old => old.key === question.key) || typeof question.text !== 'string' || question.text.length > 2000 || typeof question.sourceRule !== 'string' || question.sourceRule.length > 120 || !Array.isArray(question.options) || question.options.length > 100) return null;
    const options: LightQuestion['options'] = [];
    for (const option of question.options) { if (!object(option) || typeof option.id !== 'string' || option.id.length > 80 || typeof option.label !== 'string' || option.label.length > 80) return null; options.push({ id: option.id, label: option.label }); }
    questions.push({ key: question.key, text: question.text, sourceRule: question.sourceRule, options });
  }
  const lightFlow = normalizeLightFlow(value.lightFlow), coreFlow = normalizeCoreFlow(value.coreFlow);
  if ((value.lightFlow !== undefined && !lightFlow) || (value.coreFlow !== undefined && !coreFlow)) return null;
  return { ...emptyReviewForm(movieId), mode: value.mode as ReviewForm['mode'], watchedAt: value.watchedAt, rating: value.rating as number | null, body: value.body, oneLine: value.oneLine, spoiler: value.spoiler, visibility: value.visibility as ReviewForm['visibility'], keywordIds: [...value.keywordIds], answers, questions, questionTags: tags, ...(lightFlow ? { lightFlow } : {}), ...(coreFlow ? { coreFlow } : {}) };
}
