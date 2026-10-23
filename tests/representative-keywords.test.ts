import { describe, expect, it } from 'vitest';
import { mergeRepresentativeKeywords, normalizeRepresentativeKeywords } from '../src/features/reviews/representative-keywords';

describe('saved representative keywords in review cards', () => {
  it('keeps the user-selected order and never substitutes Light or answer tags', () => {
    expect(normalizeRepresentativeKeywords(['색채', '잔상', '몽환적인'])).toEqual(['색채', '잔상', '몽환적인']);
    expect(normalizeRepresentativeKeywords([])).toEqual([]);
    expect(normalizeRepresentativeKeywords(undefined)).toEqual([]);
  });
  it('sanitizes malformed metadata, removes duplicates and caps five', () => {
    expect(normalizeRepresentativeKeywords([' 색채 ', null, 5, '', '잔상', '색채', 'a', 'b', 'c', 'd'])).toEqual(['색채', '잔상', 'a', 'b', 'c']);
    expect(normalizeRepresentativeKeywords({ representativeKeywords: ['wrong-shape'] })).toEqual([]);
    expect(normalizeRepresentativeKeywords(['x'.repeat(31)])).toEqual([]);
  });
  it('joins by review ID, not server return order or movie ID', () => {
    const reviews = [{ reviewId: 'r1', movieId: 'same-movie' }, { reviewId: 'r2', movieId: 'same-movie' }, { reviewId: 'r3', movieId: 'other' }];
    const result = mergeRepresentativeKeywords(reviews, [{ id: 'r2', representative_keywords: ['따스한'] }, { id: 'r1', representative_keywords: ['묵직한', '잔상'] }]);
    expect(result.map((review) => review.representativeKeywords)).toEqual([['묵직한', '잔상'], ['따스한'], []]);
    expect(reviews[0]).not.toHaveProperty('representativeKeywords');
  });
  it('preserves a user-deleted empty selection across feed reloads', () => {
    expect(mergeRepresentativeKeywords([{ reviewId: 'r1' }], [{ id: 'r1', representative_keywords: [] }])[0]?.representativeKeywords).toEqual([]);
  });
});
