import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ stored: new Map<string, string>() }));
vi.mock('../src/lib/supabase', () => ({ supabase: null }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async (key: string) => mock.stored.get(key) ?? null, setItem: async (key: string, value: string) => { mock.stored.set(key, value); }, removeItem: async (key: string) => { mock.stored.delete(key); } } }));
import { normalizeBackupForm } from '../src/features/reviews/review-backup';
import { clearLocalReviewBackup, loadLocalReviewBackup, saveLocalReviewBackup, scopedReviewBackupKey } from '../src/features/reviews/reviews';
import { emptyReviewForm, normalizeLightFlow } from '../src/features/reviews/review-logic';
const A = { mode: 'supabase' as const, email: 'a@example.invalid' }, B = { mode: 'supabase' as const, email: 'b@example.invalid' }, D = { mode: 'demo' as const, email: null };
beforeEach(() => mock.stored.clear());
describe('account-scoped review backups', () => {
  it('separates demo, two accounts and normalized email case', () => { expect(new Set([A, B, D].map(who => scopedReviewBackupKey('movie', who))).size).toBe(3); expect(scopedReviewBackupKey('movie', { ...A, email: ' A@EXAMPLE.INVALID ' })).toBe(scopedReviewBackupKey('movie', A)); expect(() => scopedReviewBackupKey('movie', { ...A, email: null })).toThrow(); });
  it('loads/deletes only the current account backup', async () => { const form = emptyReviewForm('movie'); await saveLocalReviewBackup(form, null, 'A', A); await saveLocalReviewBackup({ ...form, body: 'B text' }, null, 'B', B); expect(await loadLocalReviewBackup('movie', D)).toBeNull(); expect((await loadLocalReviewBackup('movie', A))?.movieTitle).toBe('A'); await clearLocalReviewBackup('movie', A); expect((await loadLocalReviewBackup('movie', B))?.form.body).toBe('B text'); });
  it('preserves but never imports an unowned legacy backup', async () => { mock.stored.set('flick.stage3.review-draft.movie', JSON.stringify({ form: emptyReviewForm('movie') })); expect(await loadLocalReviewBackup('movie', A)).toBeNull(); expect(mock.stored.size).toBe(1); });
  it('ignores damaged JSON without overwriting it', async () => { const key = scopedReviewBackupKey('movie', A); mock.stored.set(key, 'broken'); expect(await loadLocalReviewBackup('movie', A)).toBeNull(); expect(mock.stored.get(key)).toBe('broken'); });
});
describe('defensive draft decoding', () => {
  it('accepts unfinished safe forms and strips unexpected fields', () => { const form = emptyReviewForm('movie'); expect(normalizeBackupForm({ ...form, userId: 'forged' }, 'movie')).toEqual(form); });
  it.each([null, { ...emptyReviewForm('movie'), questions: [null] }, { ...emptyReviewForm('movie'), answers: [] }, { ...emptyReviewForm('movie'), rating: NaN }, { ...emptyReviewForm('movie'), questionTags: { q: 1 } }, { ...emptyReviewForm('movie'), lightFlow: { version: 1 } }, { ...emptyReviewForm('movie'), coreFlow: { version: 1 } }])('rejects unsafe or damaged forms: %j', value => { expect(normalizeBackupForm(value, 'movie')).toBeNull(); });
  it('rejects malformed Light response state and preserves safe empty drafts', () => { expect(normalizeLightFlow({ version: 1, responses: null })).toBeUndefined(); expect(normalizeLightFlow({ version: 1, responses: { light_q1: 'unknown' }, changed: [], aspects: [], representativeKeywords: [], draftSource: 'manual' })).toBeUndefined(); expect(normalizeLightFlow({ version: 1, responses: {}, changed: [], aspects: [], representativeKeywords: [], draftSource: 'manual' })?.version).toBe(1); });
});
