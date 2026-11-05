import { describe, expect, it } from 'vitest';
import { appreciationPoints, defaultExploreFilters, filterMovies, keywordIdsFor, normalizeRatio, preferenceKeywords, ratingFive, recommendMix, relatedMovies } from '../src/features/discovery/explore-model';
import type { Movie } from '../src/features/discovery/discovery-logic';
import type { ReviewRecord } from '../src/features/reviews/reviews';
const movie: Movie = { id: 'a', provider: 'tmdb', providerId: '1', title: '기억의 영화', originalTitle: 'Memory', overview: '도시에서 만나는 가족', posterPath: null, releaseDate: '2020-01-01', runtime: 90, genres: ['드라마'], recommendationKeywords: ['nostalgic'], voteAverage: 8, details: null, detailsSource: 'demo', detailsStatus: 'summary', detailsFetchedAt: null };
const newMovie: Movie = { ...movie, id: 'b', recommendationKeywords: ['unusual'], genres: ['SF'], voteAverage: 9, releaseDate: '2024-01-01' };
describe('explore recommendations and filters', () => {
  it.each([[undefined, 70], ['', 70], ['bad', 70], [Infinity, 70], [true, 70], [-20, 0], [125, 100], ['68', 70], [41, 40]])('normalizes ratio %s without unsafe values', (input, expected) => expect(normalizeRatio(input)).toBe(expected));
  it('maps designer words and existing keyword IDs without a paid semantic service', () => {
    expect(keywordIdsFor('몽환적인')).toEqual(['mysterious', 'unusual']);
    expect(keywordIdsFor('위로가 되는')).toEqual(['comforting']);
    expect(keywordIdsFor('nostalgic')).toEqual(['nostalgic']);
    expect(keywordIdsFor('알 수 없는 단어')).toEqual([]);
  });
  it('orders familiar and unfamiliar endpoints and never duplicates or mutates input', () => {
    const source = [newMovie, movie, movie];
    expect(recommendMix(source, ['nostalgic'], 0).map(item => item.id)).toEqual(['a', 'b']);
    expect(recommendMix(source, ['nostalgic'], 100).map(item => item.id)).toEqual(['b', 'a']);
    expect(source).toHaveLength(3);
  });
  it('interleaves the quota and gracefully fills a missing pool', () => {
    const pool = Array.from({ length: 20 }, (_, i) => ({ ...(i < 10 ? movie : newMovie), id: String(i) }));
    const mixed = recommendMix(pool, ['nostalgic'], 70, 10);
    expect(mixed.filter(item => item.recommendationKeywords.includes('unusual'))).toHaveLength(7);
    expect(new Set(mixed.map(item => item.id)).size).toBe(10);
    expect(recommendMix([movie], ['nostalgic'], 100)).toEqual([movie]);
    expect(recommendMix([], [], 0)).toEqual([]);
  });
  it('searches title, original title, synopsis, aliases and returns a real empty state', () => {
    expect(filterMovies([movie, newMovie], 'memory', '', defaultExploreFilters)).toHaveLength(2);
    expect(filterMovies([movie], '가족', '', defaultExploreFilters)).toHaveLength(1);
    expect(filterMovies([movie], '여운', '', defaultExploreFilters)).toHaveLength(1);
    expect(filterMovies([movie], '절대없는이름', '', defaultExploreFilters)).toEqual([]);
  });
  it('keeps genre chips strict and intersects rating and genre filters', () => {
    expect(filterMovies([movie, newMovie], '', 'SF', defaultExploreFilters)).toEqual([newMovie]);
    expect(filterMovies([{ ...movie, voteAverage: null }, newMovie], '', '', { genre: 'SF', rating: '4', sort: 'rating' })).toEqual([newMovie]);
    expect(filterMovies([movie], '', '', { ...defaultExploreFilters, genre: '음악' })).toEqual([]);
  });
  it('sorts by actual rating and date, treating unknown ratings as unknown', () => {
    expect(filterMovies([movie, newMovie], '', '', { ...defaultExploreFilters, sort: 'recent' })[0]?.id).toBe('b');
    expect(filterMovies([movie, newMovie], '', '', { ...defaultExploreFilters, sort: 'rating' })[0]?.id).toBe('b');
    expect(ratingFive(movie)).toBe('4.0');
    expect(ratingFive({ voteAverage: null })).toBe('—');
    expect(ratingFive({ voteAverage: Number.NaN })).toBe('—');
    expect(ratingFive({ voteAverage: 11 })).toBe('—');
  });
  it('excludes the current film and provides a bounded non-factual guide', () => {
    expect(relatedMovies([movie, newMovie], movie)).toEqual([newMovie]);
    expect(appreciationPoints(movie)).toHaveLength(3);
    expect(appreciationPoints(movie).every(point => /보세요/.test(point))).toBe(true);
  });
  it('deduplicates films and ignores drafts when collecting private preference signals', () => {
    const record = { movieId: 'a', status: 'completed', updatedAt: '2026-11-05', questions: [], questionTags: {}, keywordIds: ['nostalgic'], lightFlow: { representativeKeywords: ['여운'] } } as unknown as ReviewRecord;
    const result = preferenceKeywords([record, { ...record, status: 'draft' }, { ...record, updatedAt: '2026-01-01', keywordIds: ['warm'] }], ['warm']);
    expect(result).toEqual({ ids: ['nostalgic'], labels: ['여운'], fromReviews: true });
    expect(preferenceKeywords([], ['warm'])).toEqual({ ids: ['warm'], labels: ['따뜻한'], fromReviews: false });
    expect(preferenceKeywords([{ ...record, lightFlow: {} as ReviewRecord['lightFlow'] }], ['warm']).ids).toEqual(['nostalgic']);
  });
});
