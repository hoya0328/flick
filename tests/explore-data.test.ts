import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/features/discovery/movies', () => ({ discoverDemoMovies: vi.fn(), discoverMovies: vi.fn() }));
vi.mock('../src/features/discovery/discovery-insights', () => ({ listPublishedCurations: vi.fn() }));
vi.mock('../src/features/community/collections-service', () => ({ listPublicCollections: vi.fn() }));
vi.mock('../src/features/reviews/reviews', () => ({ listReviews: vi.fn() }));
vi.mock('../src/features/session/session-provider', () => ({ useSession: vi.fn() }));
import { exploreCatalog } from '../src/features/discovery/explore-data';
import { discoverDemoMovies, discoverMovies } from '../src/features/discovery/movies';
import type { Movie } from '../src/features/discovery/discovery-logic';
const movie = { id: 'live-id' } as Movie;
beforeEach(() => vi.resetAllMocks());
describe('explore bounded data boundary', () => {
  it('keeps demo entirely local and never invokes the live catalog', async () => {
    vi.mocked(discoverDemoMovies).mockReturnValue({ movies: [movie], source: 'demo', notice: null });
    expect((await exploreCatalog('제목', ['warm'], 'demo')).source).toBe('demo');
    expect(discoverMovies).not.toHaveBeenCalled();
  });
  it('deduplicates broad and targeted results with at most two existing requests', async () => {
    vi.mocked(discoverMovies).mockResolvedValue({ movies: [movie], source: 'tmdb', notice: null });
    expect((await exploreCatalog('제목', ['warm'], 'supabase')).movies).toEqual([movie]);
    expect(discoverMovies).toHaveBeenCalledTimes(2);
    expect(discoverMovies).toHaveBeenCalledWith('제목', []);
  });
  it('does not mix example UUIDs into a real catalog', async () => {
    vi.mocked(discoverMovies).mockResolvedValueOnce({ movies: [movie], source: 'cache', notice: null }).mockResolvedValueOnce({ movies: [{ ...movie, id: 'example' }], source: 'demo', notice: null });
    const result = await exploreCatalog('', ['warm'], 'supabase');
    expect(result.movies).toEqual([movie]);
    expect(result.source).toBe('cache');
  });
  it('recovers partial failure and reports a complete failure', async () => {
    vi.mocked(discoverMovies).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ movies: [movie], source: 'cache', notice: null });
    expect((await exploreCatalog('', ['warm'], 'supabase')).movies).toEqual([movie]);
    vi.mocked(discoverMovies).mockRejectedValue(new Error('offline'));
    await expect(exploreCatalog('', [], 'supabase')).rejects.toThrow('불러오지 못했어요');
  });
  it('clearly labels an entirely example fallback for a real account', async () => {
    vi.mocked(discoverMovies).mockResolvedValue({ movies: [movie], source: 'demo', notice: null });
    expect((await exploreCatalog('', [], 'supabase')).notice).toContain('실제 기록 저장은 서버 복구 후');
  });
});
