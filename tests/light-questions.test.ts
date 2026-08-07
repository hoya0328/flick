import { describe, expect, it } from 'vitest';

import type { Movie } from '../src/features/discovery/discovery-logic';
import { buildLightQuestions } from '../src/features/reviews/light-questions';

const movie: Movie = {
  id: 'movie-1', provider: 'tmdb', providerId: '1', title: '테스트 영화', originalTitle: null,
  overview: '', posterPath: null, releaseDate: '2026-01-01', runtime: 120, genres: ['SF', '모험'],
  recommendationKeywords: [], voteAverage: 8, detailsSource: 'cache', detailsStatus: 'complete', detailsFetchedAt: null,
  details: {
    tagline: null, publicationStatus: 'Released', originalLanguage: 'ko', directorNames: ['김감독'],
    cast: [{ name: '이배우', character: '주인공' }], productionCompanies: [], productionCountries: ['대한민국'],
    keywords: [], imageCount: 1, videoCount: 0, watchProviders: { stream: [], rent: [], buy: [] }, completeness: {}, fetchedAt: '2026-01-01',
  },
};

describe('deterministic Light questions', () => {
  it('builds exactly five movie-aware questions without an AI call', () => {
    const questions = buildLightQuestions(movie);
    expect(questions).toHaveLength(5);
    expect(questions[0]?.text).toContain('테스트 영화');
    expect(questions[2]?.text).toContain('김감독');
    expect(questions[3]?.text).toContain('이배우');
    expect(questions.every((question) => question.options.length >= 8)).toBe(true);
  });

  it('changes the genre question and tags using the movie genre', () => {
    const romance = buildLightQuestions({ ...movie, genres: ['로맨스', '드라마'] });
    expect(romance[1]?.text).toContain('감정과 관계');
    expect(romance[1]?.options.map((option) => option.label)).toContain('애틋한');
  });
});
