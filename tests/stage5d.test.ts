import { describe, expect, it } from 'vitest';

import { buildTastePersonalization } from '../src/features/reports/taste-personalization';
import type { ReviewRecord } from '../src/features/reviews/reviews';

function record(id: string, mode: 'light' | 'core', keywordIds: string[], rating = 5): ReviewRecord {
  return {
    id, movieId: `movie-${id}`, mode, watchedAt: '2026-01-01', rating, body: '', oneLine: '', spoiler: false,
    visibility: 'private', status: 'completed', answers: {}, keywordIds, questions: [], questionTags: {},
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    movie: { id: `movie-${id}`, title: `영화 ${id}`, originalTitle: null, posterPath: null, releaseDate: null },
  };
}

describe('stage 5D deterministic personalization', () => {
  it('does not label a taste type before three completed reviews', () => {
    const result = buildTastePersonalization([record('1', 'light', ['warm'])], ['warm'], '2026-08-11');
    expect(result.tasteType).toBeNull();
    expect(result.minimumRequired - result.completedCount).toBe(2);
  });

  it('explains a type, rewatch, patterns, and a contrasting keyword without AI', () => {
    const result = buildTastePersonalization([
      record('1', 'core', ['thoughtful', 'nostalgic']),
      record('2', 'core', ['thoughtful']),
      record('3', 'light', ['warm'], 4),
    ], ['thoughtful', 'nostalgic'], '2026-08-11');
    expect(result.tasteType?.name).toBe('사유형 기록가');
    expect(result.rewatch).toHaveLength(3);
    expect(result.topPatterns[0]).toEqual({ label: '생각이 깊어지는', count: 2 });
    expect(result.contrastKeyword?.id).not.toBe('thoughtful');
  });
});
