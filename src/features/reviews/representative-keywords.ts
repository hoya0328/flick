// Do not derive replacements: an empty array can be the user's explicit choice.
export function normalizeRepresentativeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((word): word is string => typeof word === 'string').map((word) => word.trim()).filter((word) => word.length > 0 && word.length <= 30))].slice(0, 5);
}

export function mergeRepresentativeKeywords<T extends { reviewId: string }>(
  reviews: T[],
  rows: { id: string; representative_keywords: unknown }[],
): (T & { representativeKeywords: string[] })[] {
  const byReview = new Map(rows.map((row) => [row.id, normalizeRepresentativeKeywords(row.representative_keywords)]));
  return reviews.map((review) => ({ ...review, representativeKeywords: byReview.get(review.reviewId) ?? [] }));
}
