import type { DiscoveryRankings } from '@/features/discovery/discovery-insights';
import type { Movie } from '@/features/discovery/movies';

// Old snapshots must never be presented as this week's rankings after a project resume.
export function hasCurrentRankings(rankings: DiscoveryRankings | null, now = Date.now()): rankings is DiscoveryRankings {
  if (!rankings?.sufficient) return false;
  const periodEnd = Date.parse(rankings.periodEnd);
  return Number.isFinite(periodEnd) && periodEnd <= now + 60_000 && now - periodEnd <= 7 * 86400_000;
}

export function movieRating(movie: Pick<Movie, 'voteAverage'>): string {
  return movie.voteAverage === null ? '평점 없음' : (movie.voteAverage / 2).toFixed(1);
}

export function keywordRows<T>(keywords: T[]): [T[], T[]] {
  const split = Math.ceil(keywords.length / 2);
  return [keywords.slice(0, split), keywords.slice(split)];
}
