import { getPublicReview, getReview } from './reviews';
import { canReadCompletedReview } from './review-reader-model';

// Owner lookup retains the existing server-side user_id/RLS filter. No new grants.
export async function getReadableReview(id: string, mode: 'demo' | 'supabase') {
  const own = await getReview(id, mode);
  if (canReadCompletedReview(own)) return { record: own, isOwner: true };
  if (own || mode === 'demo') return null;
  const shared = await getPublicReview(id);
  return canReadCompletedReview(shared) && shared.visibility === 'public' ? { record: shared, isOwner: false } : null;
}
