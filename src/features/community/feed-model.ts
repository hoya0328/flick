import type { Movie } from '../discovery/movies';
import type { SocialPost, SocialComment } from './social-service';
export type FeedBlock = { type: 'movie'; movieId: string } | { type: 'poll'; options: string[] } | { type: 'question'; prompt: string };
export type FeedPost = SocialPost & { blocks?: FeedBlock[]; movie?: Movie | null; poll?: { options: string[]; counts: number[]; total: number; mine: number | null }; question?: { prompt: string; count: number; canAnswer: boolean; answered?: boolean }; viewerFollows?: boolean; demo?: boolean };
export type FeedComment = SocialComment & { parentId?: string | null; likeCount?: number; viewerLiked?: boolean; isPostAuthor?: boolean; removed?: boolean; avatar?: string | null };
export type AnonymousAnswer = { id: string; body: string; createdAt: string; isMine: boolean };
export type FeedDraft = { body: string; photos: string[]; visibility: 'private' | 'public'; blocks: FeedBlock[] };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Local drafts may contain unfinished blocks, but never arbitrary parsed objects.
export function decodeFeedDraft(raw: string): FeedDraft {
  const saved: unknown = JSON.parse(raw);
  if (!saved || typeof saved !== 'object') throw new Error('초안 형식을 확인하지 못했어요.');
  const value = saved as Record<string, unknown>;
  if (typeof value.body !== 'string' || value.body.length > 2000 || !Array.isArray(value.photos) || value.photos.length > 5 || !value.photos.every(path => typeof path === 'string' && path.length <= 12000000) || !['private', 'public'].includes(String(value.visibility)) || !Array.isArray(value.blocks) || value.blocks.length > 3) throw new Error('초안 형식을 확인하지 못했어요.');
  const seen = new Set<string>();
  const blocks: FeedBlock[] = value.blocks.map((block: unknown) => {
    if (!block || typeof block !== 'object') throw new Error('초안 첨부를 확인하지 못했어요.');
    const b = block as Record<string, unknown>;
    if (typeof b.type !== 'string' || seen.has(b.type)) throw new Error('초안 첨부를 확인하지 못했어요.');
    seen.add(b.type);
    if (b.type === 'movie' && typeof b.movieId === 'string' && (b.movieId === '' || UUID.test(b.movieId))) return { type: 'movie', movieId: b.movieId };
    if (b.type === 'question' && typeof b.prompt === 'string' && b.prompt.length <= 120) return { type: 'question', prompt: b.prompt };
    if (b.type === 'poll' && Array.isArray(b.options) && b.options.length >= 2 && b.options.length <= 5 && b.options.every(option => typeof option === 'string' && option.length <= 80)) return { type: 'poll', options: [...b.options] };
    throw new Error('초안 첨부를 확인하지 못했어요.');
  });
  return { body: value.body, photos: [...value.photos], visibility: value.visibility as FeedDraft['visibility'], blocks };
}
export function normalizeBlocks(value: unknown): FeedBlock[] {
  if (!Array.isArray(value) || value.length > 3) throw new Error('첨부 블록은 종류별 하나씩, 최대3개예요.');
  const seen = new Set<string>();
  return value.map(raw => {
    if (!raw || typeof raw !== 'object' || !('type' in raw) || typeof raw.type !== 'string' || seen.has(raw.type)) throw new Error('첨부 블록을 다시 확인해 주세요.');
    seen.add(raw.type);
    if (raw.type === 'movie' && typeof raw.movieId === 'string' && UUID.test(raw.movieId)) return { type: 'movie', movieId: raw.movieId };
    if (raw.type === 'question' && typeof raw.prompt === 'string' && raw.prompt.trim().length > 0 && raw.prompt.trim().length <= 120) return { type: 'question', prompt: raw.prompt.trim() };
    if (raw.type === 'poll' && Array.isArray(raw.options) && raw.options.length >= 2 && raw.options.length <= 5) {
      const options: string[] = raw.options.map((option: unknown) => typeof option === 'string' ? option.trim() : '');
      if (options.every(option => option.length >= 1 && option.length <= 80) && new Set(options.map(option => option.toLocaleLowerCase('ko-KR'))).size === options.length) return { type: 'poll', options };
    }
    throw new Error(raw.type === 'poll' ? '투표는 중복 없이 1~80자 선택지2~5개를 입력해야 합니다.' : raw.type === 'question' ? '질문은 1~120자로 입력해야 합니다.' : '영화를 검색해 선택해야 합니다.');
  });
}
export function draftIssue(draft: FeedDraft, confirmed: boolean): { field: 'body' | 'blocks' | 'visibility'; message: string } | null {
  if (!draft.body.trim() || draft.body.trim().length > 2000) return { field: 'body', message: '본문을 1~2,000자로 입력해야 합니다.' };
  if (draft.photos.length > 5) return { field: 'blocks', message: '사진은 최대5장까지 추가할 수 있어요.' };
  try { normalizeBlocks(draft.blocks); } catch (error) { return { field: 'blocks', message: error instanceof Error ? error.message : '첨부를 확인해 주세요.' }; }
  if (draft.visibility === 'public' && !confirmed) return { field: 'visibility', message: '전체 공개 범위에 동의해야 합니다.' };
  return null;
}
export function lockedBlockIssue(old: FeedPost, blocks: FeedBlock[]): string | null {
  for (const type of ['poll', 'question'] as const) {
    const count = type === 'poll' ? old.poll?.total : old.question?.count;
    if (count && JSON.stringify(old.blocks?.find(block => block.type === type)) !== JSON.stringify(blocks.find(block => block.type === type))) return '참여한 사람이 있어 투표·질문 내용을 변경하거나 제거할 수 없어요.';
  }
  return null;
}
export function pollPercentages(counts: number[]): number[] {
  const clean = counts.map(value => Number.isFinite(value) && value > 0 ? Math.floor(value) : 0), total = clean.reduce((sum, value) => sum + value, 0);
  if (!total) return clean.map(() => 0);
  const exact = clean.map(value => value / total * 100), result = exact.map(Math.floor);
  const order = exact.map((value, index) => ({ index, fraction: value - Math.floor(value) })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const remaining = 100 - result.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remaining; i++) result[order[i]!.index]!++;
  return result;
}
export function timeAgo(value: string, now = Date.now()): string {
  const time = Date.parse(value); if (!Number.isFinite(time)) return '날짜 미상';
  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  return minutes < 1 ? '방금 전' : minutes < 60 ? `${minutes}분 전` : minutes < 1440 ? `${Math.floor(minutes / 60)}시간 전` : new Date(time).toLocaleDateString('ko-KR');
}
