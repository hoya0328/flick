import { createClient } from '@supabase/supabase-js';
import { authStorage } from '@/lib/auth-storage';
import { assertPublicSupabaseKey } from '@/lib/public-config';
import type { Movie } from '@/features/discovery/discovery-logic';
import { coreTurns } from '@/features/reviews/core-flow';
import { lightLabels } from '@/features/reviews/light-flow';
import { readAiOperationError } from '@/features/reviews/ai-operations';
import type { ReviewForm } from '@/features/reviews/review-logic';
import { guestKeywords, guestResponses, type Guest, type ExhibitionStatus } from './exhibition-logic';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
assertPublicSupabaseKey(key);
// Never share or replace the regular member session. No URL-token detection here.
export const exhibitionClient = url && key ? createClient(url, key, { auth: { storage: authStorage, storageKey: 'flick-exhibition-auth-v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;
async function rpc<T>(name: string, args = {}): Promise<T> {
  if (!exhibitionClient) throw new Error('not_configured');
  const { data, error } = await exhibitionClient.rpc(name, args);
  if (error) throw error;
  return data as T;
}
export const exhibitionStatus = () => rpc<ExhibitionStatus>('exhibition_status');
export async function resumeGuest(): Promise<{ guest: Guest | null; saved: { body: string; keywords: string[] } | null }> {
  if (!exhibitionClient) return { guest: null, saved: null };
  const { data: { session }, error } = await exhibitionClient.auth.getSession();
  if (error) throw error;
  if (!session) return { guest: null, saved: null };
  const [g, r] = await Promise.all([exhibitionClient.from('exhibition_guests').select('user_id,expires_at,adult_confirmed,ai_consent').eq('user_id', session.user.id).maybeSingle(), exhibitionClient.from('exhibition_records').select('body,keywords').eq('user_id', session.user.id).maybeSingle()]);
  if (g.error || r.error) throw g.error || r.error;
  return { guest: g.data as Guest | null, saved: r.data };
}
export async function enterExhibition(adult: boolean, ai: boolean): Promise<Guest> {
  if (!exhibitionClient) throw new Error('not_configured');
  const { data: { session } } = await exhibitionClient.auth.getSession();
  if (!session) { const { error } = await exhibitionClient.auth.signInAnonymously(); if (error) throw error; }
  return rpc<Guest>('join_exhibition', { p_adult: adult, p_ai: ai && adult });
}
export async function exhibitionMovies(search: string): Promise<Movie[]> {
  const rows = await rpc<{ id: string; title: string; original_title: string | null; overview: string; provider_id: string; poster_path: string | null; release_date: string | null; genres: string[] | null }[]>('exhibition_movies', { p_search: search.trim().slice(0, 80) });
  return rows.map(m => ({ id: m.id, provider: 'tmdb', providerId: m.provider_id, title: m.title, originalTitle: m.original_title, overview: m.overview, posterPath: m.poster_path, releaseDate: m.release_date, genres: m.genres ?? [], recommendationKeywords: [], runtime: null, voteAverage: null, details: null, detailsSource: 'cache', detailsStatus: 'summary', detailsFetchedAt: null }));
}
export async function guestAi(form: ReviewForm, action: 'feedback' | 'draft') {
  if (!exhibitionClient) throw new Error('not_configured');
  const body = action === 'feedback' ? { mode: 'core-flow', action, consent: true, movieId: form.movieId, turns: coreTurns(form), question: form.questions.at(-1)?.text }
    : form.mode === 'core' ? { mode: 'core-magazine', consent: true, movieId: form.movieId, turns: coreTurns(form) }
      : { mode: 'light', consent: true, movieId: form.movieId, turns: guestResponses(form), keywords: lightLabels(form), aspects: [] };
  const { data, error } = await exhibitionClient.functions.invoke(action === 'feedback' ? 'generate-core-question' : 'generate-core-review-draft', { body, timeout: 35000 });
  if (error) throw await readAiOperationError(error, data);
  return data as { question?: string; feedback?: string; title?: string; draft?: string; keywords?: string[] };
}
export const saveGuestRecord = (form: ReviewForm) => rpc<void>('save_exhibition_record', { p_movie: form.movieId, p_mode: form.mode, p_rating: form.rating, p_body: form.body, p_keywords: guestKeywords(form), p_responses: guestResponses(form) });
export async function endGuest() { if (exhibitionClient) { const { error } = await exhibitionClient.auth.signOut({ scope: 'local' }); if (error) throw error; } }
