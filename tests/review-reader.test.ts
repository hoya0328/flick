/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyReviewForm } from '../src/features/reviews/review-logic';
import { canReadCompletedReview, lightReaderRows, readerKeywords, reviewEditDestination, reviewReadDestination, validReaderId } from '../src/features/reviews/review-reader-model';
import type { ReviewRecord } from '../src/features/reviews/reviews';

const mocks = vi.hoisted(() => ({ getReview: vi.fn(), getPublicReview: vi.fn() }));
vi.mock('../src/features/reviews/reviews', () => mocks);
import { getReadableReview } from '../src/features/reviews/review-reader-service';

const id = 'e9e7874e-8098-4192-8229-8e45f9674d95';
function record(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    ...emptyReviewForm('movie-1'), id, status: 'completed', createdAt: '2026-11-19T00:00:00Z', updatedAt: '2026-11-19T00:00:00Z',
    body: '내가 작성한 감상을 그대로 읽습니다.', rating: 4.5,
    movie: { id: 'movie-1', title: '테스트 영화', originalTitle: null, releaseDate: '2026-01-01', posterPath: null }, ...overrides,
  };
}
beforeEach(() => { vi.clearAllMocks(); mocks.getReview.mockResolvedValue(null); mocks.getPublicReview.mockResolvedValue(null); });

describe('completed review reading and editing destinations', () => {
  it('opens completed records for reading and keeps drafts in the editor', () => {
    expect(reviewReadDestination(record())).toEqual({ pathname: '/review/[id]', params: { id } });
    expect(reviewReadDestination(record({ status: 'draft' }))).toEqual({ pathname: '/(tabs)/record', params: { reviewId: id } });
    expect(canReadCompletedReview(record())).toBe(true);
    expect(canReadCompletedReview(record({ status: 'draft' }))).toBe(false);
    expect(canReadCompletedReview(null)).toBe(false);
  });
  it('uses the existing flow-specific editor only after an explicit edit action', () => {
    const lightFlow = { version: 1 as const, responses: {}, changed: [], aspects: [], representativeKeywords: [], draftSource: 'manual' as const };
    expect(reviewEditDestination(record({ lightFlow })).pathname).toBe('/light-record');
    expect(reviewEditDestination(record()).pathname).toBe('/(tabs)/record');
    const coreFlow = { version: 1 as const, changed: [], feedback: {}, nextQuestions: {}, stage: 'summary' as const, index: 0, title: '제목', blocks: [], cover: null, keywords: [], source: 'manual' as const };
    expect(reviewEditDestination(record({ mode: 'core', coreFlow })).pathname).toBe('/core-record');
  });
  it('accepts demo record paths locally, never as a Supabase or auth-return shortcut', () => {
    expect(validReaderId(id, 'supabase')).toBe(true);
    expect(validReaderId('demo-123456', 'demo')).toBe(true);
    expect(validReaderId('demo-123456', 'supabase')).toBe(false);
    for (const value of [undefined, '', '../archive', 'demo-1/../../welcome', 'https://example.com', `${id}?other=1`]) expect(validReaderId(value, 'demo')).toBe(false);
  });
});

describe('saved content, without invented or skipped answers', () => {
  it('retains question numbering, selected tag order and custom labels', () => {
    const saved = record({ questions: [1, 2, 3].map(n => ({ key: `light_q${n}`, text: `질문 ${n}`, sourceRule: 'test', options: [{ id: 'a', label: '여운' }, { id: 'b', label: '직접 입력한 느낌' }] })), questionTags: { light_q1: ['b', 'a'], light_q2: ['a'] }, answers: { light_q3: ' 예전 자유 답변 ' }, lightFlow: { version: 1, responses: { light_q1: 'answered', light_q2: 'skipped', light_q3: 'answered' }, changed: [], aspects: [], representativeKeywords: [' 여운 ', '여운', '직접 입력한 느낌'], draftSource: 'manual' } });
    expect(lightReaderRows(saved)).toEqual([
      { key: 'light_q1', number: 1, question: '질문 1', labels: ['직접 입력한 느낌', '여운'], answer: '' },
      { key: 'light_q3', number: 3, question: '질문 3', labels: [], answer: '예전 자유 답변' },
    ]);
    expect(readerKeywords(saved)).toEqual(['여운', '직접 입력한 느낌']);
    expect(readerKeywords(record())).toEqual([]);
    expect(lightReaderRows(record())).toEqual([]);
  });
});

describe('owner/private/public reading with existing services', () => {
  it('reads the owner’s completed private record without a public lookup', async () => {
    const saved = record({ visibility: 'private' }); mocks.getReview.mockResolvedValue(saved);
    expect(await getReadableReview(id, 'supabase')).toEqual({ record: saved, isOwner: true });
    expect(mocks.getReview).toHaveBeenCalledWith(id, 'supabase');
    expect(mocks.getPublicReview).not.toHaveBeenCalled();
  });
  it('allows a non-owner only through the existing completed-public query, without edit controls', async () => {
    const saved = record({ visibility: 'public' }); mocks.getPublicReview.mockResolvedValue(saved);
    expect(await getReadableReview(id, 'supabase')).toEqual({ record: saved, isOwner: false });
    expect(mocks.getPublicReview).toHaveBeenCalledWith(id);
  });
  it('does not present drafts or unavailable records as completed articles', async () => {
    mocks.getReview.mockResolvedValue(record({ status: 'draft' }));
    expect(await getReadableReview(id, 'supabase')).toBeNull(); expect(mocks.getPublicReview).not.toHaveBeenCalled();
    mocks.getReview.mockResolvedValue(null);
    expect(await getReadableReview(id, 'supabase')).toBeNull();
  });
  it('rejects a malformed shared result unless it is both completed and public', async () => {
    mocks.getPublicReview.mockResolvedValue(record({ visibility: 'private' }));
    expect(await getReadableReview(id, 'supabase')).toBeNull();
    mocks.getPublicReview.mockResolvedValue(record({ visibility: 'public', status: 'draft' }));
    expect(await getReadableReview(id, 'supabase')).toBeNull();
  });
  it('does not fall back from local demo storage to real account records', async () => {
    expect(await getReadableReview('demo-123', 'demo')).toBeNull(); expect(mocks.getPublicReview).not.toHaveBeenCalled();
    mocks.getReview.mockResolvedValue(record({ id: 'demo-123' }));
    expect((await getReadableReview('demo-123', 'demo'))?.isOwner).toBe(true);
  });
  it('does not hide lookup failures with an alternate record source', async () => {
    mocks.getReview.mockRejectedValue(new Error('offline'));
    await expect(getReadableReview(id, 'supabase')).rejects.toThrow('offline'); expect(mocks.getPublicReview).not.toHaveBeenCalled();
  });
});

describe('Figma red-box reader composition', () => {
  it('uses saved text, vector controls and responsive photo geometry, not editing controls', () => {
    const reader = readFileSync('src/features/reviews/review-reader.tsx', 'utf8');
    const page = readFileSync('src/app/review/[id].tsx', 'utf8');
    const magazine = readFileSync('src/features/reviews/core-magazine.tsx', 'utf8');
    expect(reader).not.toMatch(/TextInput|onChangeText|작성 완료|기록 완료|AI 추천|Google|Gemini|name="coreMic"/);
    expect(reader).toContain('maxWidth:402'); expect(reader).toContain('paddingHorizontal:21'); expect(reader).toContain('paddingHorizontal:39');
    expect(reader).toContain('aspectRatio:402/259'); expect(magazine).toContain('aspectRatio:323/184');
    expect(reader).toContain('record.body'); expect(reader).toContain('record.spoiler'); expect(reader).toContain('CoreMagazine flow={flow} reading');
    expect(reader).toContain('name="coreEdit"'); expect(reader).toContain('onEdit ?');
    expect(page).toContain('onEdit={isOwner ?'); expect(page).toContain('record.visibility === \'public\'');
    expect(magazine).toContain('block.bold'); expect(magazine).toContain('block.italic'); expect(magazine).toContain("block.kind==='list'"); expect(magazine).toContain('block.photo');
  });
  it('opens finished records for reading from archive, calendar and legacy list', () => {
    for (const file of ['archive', 'profile', 'record']) expect(readFileSync(`src/app/(tabs)/${file}.tsx`, 'utf8')).toContain('router.push(reviewReadDestination(record))');
    for (const file of ['light-record', 'core-record']) expect(readFileSync(`src/app/${file}.tsx`, 'utf8')).toMatch(/router.replace\(\{\s*pathname:\s*['"]\/review\/\[id\]['"]/);
  });
});
