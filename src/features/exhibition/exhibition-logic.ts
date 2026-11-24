import type { Movie } from '@/features/discovery/discovery-logic';
import { normalizeBackupForm } from '@/features/reviews/review-backup';
import type { ReviewForm } from '@/features/reviews/review-logic';

export type ExhibitionStatus = { open: boolean; aiAvailable: boolean; closesAt: string; verifiedUntil: string; dailyRemaining: number; minuteRemaining: number; guestRemaining: number };
export type Guest = { user_id: string; expires_at: string; adult_confirmed: boolean; ai_consent: boolean };
export const guestStorageKey = (id: string) => `flick.exhibition.form.${id}`;
export const guestSessionActive = (g: Guest | null, now = Date.now()) => Boolean(g && Date.parse(g.expires_at) > now);
export const guestAiAllowed = (g: Guest | null, now = Date.now()) => Boolean(g?.adult_confirmed && g.ai_consent && guestSessionActive(g, now));
export function guestResponses(form: ReviewForm) {
  return form.questions.map(q => ({ question: q.text, answer: form.mode === 'core' ? form.answers[q.key]?.trim() ?? '' : q.options.filter(o => form.questionTags[q.key]?.includes(o.id)).map(o => o.label).join(', ') }));
}
export function guestKeywords(form: ReviewForm) { return form.mode === 'light' ? form.lightFlow?.representativeKeywords ?? [] : form.coreFlow?.keywords ?? []; }
export function withGuestKeywords(form: ReviewForm, value: string): ReviewForm {
  const words = [...new Set(value.split(',').map(x => x.trim()).filter(Boolean))].slice(0, 5).map(x => x.slice(0, 40));
  return form.mode === 'light' ? { ...form, lightFlow: { ...form.lightFlow!, representativeKeywords: words } } : { ...form, coreFlow: { ...form.coreFlow!, keywords: words } };
}
export function restoreGuestForm(raw: string | null): { movie: Movie; form: ReviewForm; index: number; summary: boolean } | null {
  try {
    const v = JSON.parse(raw ?? 'null');
    if (!v || !v.movie || typeof v.movie.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(v.movie.id) || typeof v.movie.title !== 'string' || v.movie.title.length > 300 || !Number.isInteger(v.index) || v.index < 0 || v.index > 4 || typeof v.summary !== 'boolean') return null;
    const form = normalizeBackupForm(v.form, v.movie.id);
    if (!form || form.visibility !== 'private' || !form.questions[v.index] || form.body.length > 1000 || Object.values(form.answers).some(x => x.length > 1000)) return null;
    if (form.mode === 'light' ? !form.lightFlow || form.questions.length !== 5 : !form.coreFlow || form.questions.some(q => !/^core_q[1-5]$/.test(q.key))) return null;
    return { movie: v.movie, form, index: v.index, summary: v.summary };
  } catch { return null; }
}
export function exhibitionMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? '');
  if (/signup.*limit|rate.*limit|over_request/i.test(message)) return '체험 접속이 잠시 많아요. 잠시 뒤 다시 시도하거나 안내 직원에게 문의해 주세요.';
  if (/closed|expired/i.test(message)) return '전시 체험 시간이 종료됐어요. 작성 내용은 이 기기에 남아 있어요. 아래에서 복사해 보관해 주세요.';
  if (/23505|duplicate/i.test(message)) return '이미 저장한 체험 기록이 있어요. 새로고침해 저장 결과를 확인해 주세요.';
  if (/anonymous.*disabled/i.test(message)) return '게스트 접속 준비 중이에요. 잠시 뒤 다시 시도해 주세요.';
  if (/exhibition_admission_required/i.test(message)) return '이전 체험 세션으로는 입장할 수 없어요. 체험을 종료한 뒤 다시 시작해 주세요.';
  return '연결하지 못했어요. 작성 내용은 유지됩니다. 인터넷을 확인하고 다시 시도해 주세요.';
}
