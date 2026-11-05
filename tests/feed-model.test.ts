import { describe, expect, it } from 'vitest';
import { decodeFeedDraft, draftIssue, lockedBlockIssue, normalizeBlocks, pollPercentages, timeAgo, type FeedDraft, type FeedPost } from '../src/features/community/feed-model';
const movieId = '20000000-0000-4000-8000-000000000001';
const draft: FeedDraft = { body: '본문', photos: [], visibility: 'private', blocks: [] };
describe('Figma feed data and validation boundaries', () => {
  it('canonicalizes blocks without trusting client movie metadata', () => {
    expect(normalizeBlocks([{ type: 'movie', movieId, title: 'forged' }, { type: 'poll', options: [' A ', 'B'] }, { type: 'question', prompt: ' 질문 ' }])).toEqual([{ type: 'movie', movieId }, { type: 'poll', options: ['A', 'B'] }, { type: 'question', prompt: '질문' }]);
  });
  it.each([null, {}, [{ type: 'movie', movieId: 'fake' }], [{ type: 'question', prompt: '' }], [{ type: 'question', prompt: 'a'.repeat(121) }], [{ type: 'poll', options: ['A', 'a'] }], [{ type: 'poll', options: ['a'] }], [{ type: 'poll', options: ['a', 2] }], [{ type: 'video' }], [{ type: 'question', prompt: 'a' }, { type: 'question', prompt: 'b' }]])('rejects invalid or duplicate blocks: %j', value => { expect(() => normalizeBlocks(value)).toThrow(); });
  it('returns the first missing field and requires explicit public confirmation', () => {
    expect(draftIssue({ ...draft, body: '' }, false)?.field).toBe('body');
    expect(draftIssue({ ...draft, blocks: [{ type: 'poll', options: ['', ''] }] }, false)?.field).toBe('blocks');
    expect(draftIssue({ ...draft, visibility: 'public' }, false)?.field).toBe('visibility');
    expect(draftIssue({ ...draft, visibility: 'public' }, true)).toBeNull();
    expect(draftIssue({ ...draft, photos: Array(6).fill('x') }, true)?.field).toBe('blocks');
  });
  it('restores unfinished drafts but strips unknown data', () => {
    const value = { ...draft, blocks: [{ type: 'movie', movieId: '' }, { type: 'poll', options: ['', ''] }, { type: 'question', prompt: '' }], token: 'not-a-field' };
    expect(decodeFeedDraft(JSON.stringify(value))).toEqual({ ...draft, blocks: value.blocks });
  });
  it.each([{ ...draft, blocks: [null] }, { ...draft, blocks: [{ type: 'poll', options: 'not-array' }] }, { ...draft, photos: [null] }, { ...draft, visibility: 'friends' }, { ...draft, blocks: [{ type: 'movie', movieId: '<script>' }] }])('rejects damaged drafts instead of crashing the editor', value => { expect(() => decodeFeedDraft(JSON.stringify(value))).toThrow(); });
  it('freezes participated poll/question but permits body editing', () => {
    const blocks = [{ type: 'poll' as const, options: ['A', 'B'] }, { type: 'question' as const, prompt: 'Q' }];
    const old = { blocks, poll: { total: 1 }, question: { count: 1 } } as FeedPost;
    expect(lockedBlockIssue(old, blocks)).toBeNull();
    expect(lockedBlockIssue(old, [])).toContain('참여');
    expect(lockedBlockIssue(old, [blocks[0]!, { type: 'question', prompt: 'changed' }])).toContain('참여');
  });
  it('allocates exact, nonnegative percentages without a rounding overflow', () => {
    expect(pollPercentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(pollPercentages([0, 0])).toEqual([0, 0]);
    expect(pollPercentages([-1, NaN, Infinity, 1])).toEqual([0, 0, 0, 100]);
    for (const counts of [[1, 6, 7], [5, 1, 3, 2, 1], [500, 1]]) expect(pollPercentages(counts).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it('handles future and invalid timestamps safely', () => { expect(timeAgo('invalid')).toBe('날짜 미상'); expect(timeAgo('2026-11-05', Date.parse('2026-11-04'))).toBe('방금 전'); });
});
