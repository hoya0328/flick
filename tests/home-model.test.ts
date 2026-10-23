import { describe, expect, it } from 'vitest';

import { hasCurrentRankings, keywordRows, movieRating } from '../src/features/home/home-model';
import type { DiscoveryRankings } from '../src/features/discovery/discovery-insights';

const now = Date.parse('2026-10-23T05:00:00Z');
const rankings: DiscoveryRankings = { periodDays: 7, periodStart: '2026-10-16T05:00:00Z', periodEnd: '2026-10-23T04:00:00Z', sampleSize: 6, sufficient: true, refreshedAt: '2026-10-23T04:00:00Z', movies: [], keywords: [] };

describe('home ranking presentation', () => {
  it('does not label stale, invalid, future or insufficient snapshots as this week', () => {
    expect(hasCurrentRankings(rankings, now)).toBe(true);
    expect(hasCurrentRankings({ ...rankings, sufficient: false }, now)).toBe(false);
    expect(hasCurrentRankings({ ...rankings, periodEnd: '2026-08-11T00:00:00Z' }, now)).toBe(false);
    expect(hasCurrentRankings({ ...rankings, periodEnd: 'invalid' }, now)).toBe(false);
    expect(hasCurrentRankings({ ...rankings, periodEnd: '2027-01-01T00:00:00Z' }, now)).toBe(false);
    expect(hasCurrentRankings(null, now)).toBe(false);
  });

  it('keeps every keyword exactly once and in rank order across the two rows', () => {
    const input = ['first', 'second', 'third', 'fourth', 'fifth'];
    const rows = keywordRows(input);
    expect(rows.map((row) => row.length)).toEqual([3, 2]);
    expect(rows.flat()).toEqual(input);
    expect(keywordRows([])).toEqual([[], []]);
  });

  it('converts TMDB ten-point ratings to five stars without fabricating missing ratings', () => {
    expect(movieRating({ voteAverage: 7.8 })).toBe('3.9');
    expect(movieRating({ voteAverage: 0 })).toBe('0.0');
    expect(movieRating({ voteAverage: null })).toBe('평점 없음');
  });
});
