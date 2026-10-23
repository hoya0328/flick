import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), select: vi.fn(), ids: vi.fn(), visibility: vi.fn(), completed: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
import { listPublicReviewFeed } from '../src/features/community/community-service';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ in: mocks.ids });
  mocks.ids.mockReturnValue({ eq: mocks.visibility });
  mocks.visibility.mockReturnValue({ eq: mocks.completed });
  mocks.completed.mockResolvedValue({ data: [{ id: 'r2', representative_keywords: ['잔상', '색채'] }, { id: 'r1', representative_keywords: ['아련한'] }], error: null });
  mocks.rpc.mockResolvedValue({ data: [{ review_id: 'r1', mode: 'light', movie_id: 'm1', watched_at: '2026-10-23', rating: 4.5 }, { review_id: 'r2', mode: 'light', movie_id: 'm2', watched_at: '2026-10-23', rating: 5 }], error: null });
});

describe('public feed representative keyword integration', () => {
  it('loads saved selections with one batch and retains feed order', async () => {
    const cards = await listPublicReviewFeed('light');
    expect(cards.map((card) => card.representativeKeywords)).toEqual([['아련한'], ['잔상', '색채']]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('reviews');
    expect(mocks.ids).toHaveBeenCalledWith('id', ['r1', 'r2']);
    expect(mocks.select).toHaveBeenCalledWith('id,representative_keywords:light_flow->representativeKeywords');
    expect(mocks.visibility).toHaveBeenCalledWith('visibility', 'public');
    expect(mocks.completed).toHaveBeenCalledWith('status', 'completed');
  });
  it('does not query all reviews when the feed is empty', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    expect(await listPublicReviewFeed()).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('keeps an empty selection empty rather than inventing a Light keyword', async () => {
    mocks.completed.mockResolvedValue({ data: [{ id: 'r1', representative_keywords: [] }], error: null });
    expect((await listPublicReviewFeed())[0]?.representativeKeywords).toEqual([]);
  });
  it('reports metadata read failures rather than presenting fake keywords', async () => {
    mocks.completed.mockResolvedValue({ data: null, error: new Error('network failed') });
    await expect(listPublicReviewFeed()).rejects.toThrow('network failed');
  });
});
