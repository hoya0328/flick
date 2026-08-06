import { getKeywordLabels } from '../onboarding/keywords';

export type Movie = {
  id: string;
  provider: 'tmdb';
  providerId: string;
  title: string;
  originalTitle: string | null;
  overview: string;
  posterPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  genres: string[];
  recommendationKeywords: string[];
  voteAverage: number | null;
};

export function yearOf(movie: Movie): string {
  return movie.releaseDate?.slice(0, 4) ?? '연도 미상';
}

export function recommendationReason(movie: Movie, keywordIds: string[]): string {
  const matched = keywordIds.filter((id) => movie.recommendationKeywords.includes(id));
  const labels = getKeywordLabels(matched).slice(0, 2);
  return labels.length ? `${labels.join(' · ')} 취향과 잘 맞아요` : `${movie.genres.slice(0, 2).join(' · ')} 영화로 추천해요`;
}

export function rankMovies(movies: Movie[], keywordIds: string[]): Movie[] {
  return [...movies].sort((a, b) => {
    const score = (movie: Movie) => movie.recommendationKeywords.filter((id) => keywordIds.includes(id)).length * 10 + (movie.voteAverage ?? 0);
    return score(b) - score(a);
  });
}
