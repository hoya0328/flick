import { describe, expect, it } from 'vitest';

import { type Movie, rankMovies, recommendationReason, yearOf } from '../src/features/discovery/discovery-logic';

const baseMovie: Movie = {
  id: 'movie-1', provider: 'tmdb', providerId: '1', title: '테스트 영화', originalTitle: null,
  overview: '', posterPath: null, releaseDate: '2024-05-01', runtime: 100, genres: ['드라마'],
  recommendationKeywords: ['warm'], voteAverage: 7.5,
  details: null, detailsSource: null, detailsStatus: 'summary', detailsFetchedAt: null,
};

describe('movie discovery helpers', () => {
  it('prioritizes keyword matches over rating alone', () => {
    const highRated = { ...baseMovie, id: 'movie-2', recommendationKeywords: [], voteAverage: 9.5 };
    expect(rankMovies([highRated, baseMovie], ['warm'])[0]?.id).toBe('movie-1');
  });

  it('explains a recommendation with the user keyword language', () => {
    expect(recommendationReason(baseMovie, ['warm'])).toContain('따뜻한');
  });

  it('formats a stable release year fallback', () => {
    expect(yearOf(baseMovie)).toBe('2024');
    expect(yearOf({ ...baseMovie, releaseDate: null })).toBe('연도 미상');
  });
});
