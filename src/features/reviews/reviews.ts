import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { emptyReviewForm, type ReviewForm, type ReviewMode, type ReviewStatus } from '@/features/reviews/review-logic';

export type ReviewRecord = ReviewForm & {
  id: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  movie: { id: string; title: string; originalTitle: string | null; posterPath: string | null; releaseDate: string | null };
};

type ReviewRow = {
  id: string; movie_id: string; mode: ReviewMode; watched_at: string; rating: number | string | null;
  body: string; one_line: string; spoiler: boolean; status: ReviewStatus; created_at: string; updated_at: string;
  movies: ReviewRecord['movie'] | ReviewRecord['movie'][] | null;
  review_answers: { question_key: string; answer: string }[] | null;
  review_keywords: { keyword_id: string }[] | null;
};

const DRAFT_PREFIX = 'flick.stage3.review-draft.';
const DEMO_RECORDS_KEY = 'flick.stage3.demo-reviews';
const reviewSelect = 'id,movie_id,mode,watched_at,rating,body,one_line,spoiler,status,created_at,updated_at,movies(id,title,original_title,poster_path,release_date),review_answers(question_key,answer),review_keywords(keyword_id)';

function normalizedMovie(value: ReviewRow['movies'], movieId: string): ReviewRecord['movie'] {
  const row = Array.isArray(value) ? value[0] : value;
  return row ? { id: row.id, title: row.title, originalTitle: row.originalTitle ?? (row as unknown as { original_title?: string | null }).original_title ?? null, posterPath: row.posterPath ?? (row as unknown as { poster_path?: string | null }).poster_path ?? null, releaseDate: row.releaseDate ?? (row as unknown as { release_date?: string | null }).release_date ?? null } : { id: movieId, title: '영화 정보 없음', originalTitle: null, posterPath: null, releaseDate: null };
}

function fromRow(row: ReviewRow): ReviewRecord {
  return {
    id: row.id, movieId: row.movie_id, mode: row.mode, watchedAt: row.watched_at,
    rating: row.rating === null ? null : Number(row.rating), body: row.body, oneLine: row.one_line,
    spoiler: row.spoiler, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
    answers: Object.fromEntries((row.review_answers ?? []).map((item) => [item.question_key, item.answer])),
    keywordIds: (row.review_keywords ?? []).map((item) => item.keyword_id), movie: normalizedMovie(row.movies, row.movie_id),
  };
}

async function demoRecords(): Promise<ReviewRecord[]> {
  const stored = await AsyncStorage.getItem(DEMO_RECORDS_KEY);
  if (!stored) return [];
  try { return JSON.parse(stored) as ReviewRecord[]; } catch { return []; }
}

export async function listReviews(sessionMode: 'demo' | 'supabase'): Promise<ReviewRecord[]> {
  if (sessionMode === 'demo') return (await demoRecords()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!supabase) throw new Error('기록 서버가 연결되지 않았어요.');
  const { data, error } = await supabase.from('reviews').select(reviewSelect).order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ReviewRow[]).map(fromRow);
}

export async function getReview(reviewId: string, sessionMode: 'demo' | 'supabase'): Promise<ReviewRecord | null> {
  if (sessionMode === 'demo') return (await demoRecords()).find((record) => record.id === reviewId) ?? null;
  if (!supabase) return null;
  const { data, error } = await supabase.from('reviews').select(reviewSelect).eq('id', reviewId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as unknown as ReviewRow) : null;
}

export async function getDraftForMovie(movieId: string, sessionMode: 'demo' | 'supabase'): Promise<ReviewRecord | null> {
  if (sessionMode === 'demo') return (await demoRecords()).find((record) => record.movieId === movieId && record.status === 'draft') ?? null;
  if (!supabase) return null;
  const { data, error } = await supabase.from('reviews').select(reviewSelect).eq('movie_id', movieId).eq('status', 'draft').maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as unknown as ReviewRow) : null;
}

export async function saveReview(form: ReviewForm, reviewId: string | null, complete: boolean, sessionMode: 'demo' | 'supabase', movieTitle: string): Promise<string> {
  if (sessionMode === 'demo') {
    const records = await demoRecords();
    const existingIndex = reviewId ? records.findIndex((record) => record.id === reviewId) : records.findIndex((record) => record.movieId === form.movieId && record.status === 'draft');
    const now = new Date().toISOString();
    const existing = existingIndex >= 0 ? records[existingIndex] : null;
    const id = existing?.id ?? `demo-${Date.now()}`;
    const record: ReviewRecord = { ...form, id, status: complete ? 'completed' : 'draft', createdAt: existing?.createdAt ?? now, updatedAt: now, movie: existing?.movie ?? { id: form.movieId, title: movieTitle, originalTitle: null, posterPath: null, releaseDate: null } };
    if (existingIndex >= 0) records[existingIndex] = record; else records.push(record);
    await AsyncStorage.setItem(DEMO_RECORDS_KEY, JSON.stringify(records));
    return id;
  }
  if (!supabase) throw new Error('기록 서버가 연결되지 않았어요.');
  const { data, error } = await supabase.rpc('save_review_record', {
    p_movie_id: form.movieId, p_mode: form.mode, p_watched_at: form.watchedAt, p_rating: form.rating,
    p_body: form.body, p_one_line: form.oneLine, p_spoiler: form.spoiler, p_answers: form.answers,
    p_keyword_ids: form.keywordIds, p_complete: complete, p_review_id: reviewId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function deleteReview(reviewId: string, sessionMode: 'demo' | 'supabase'): Promise<void> {
  if (sessionMode === 'demo') {
    await AsyncStorage.setItem(DEMO_RECORDS_KEY, JSON.stringify((await demoRecords()).filter((record) => record.id !== reviewId)));
    return;
  }
  if (!supabase) throw new Error('기록 서버가 연결되지 않았어요.');
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw new Error(error.message);
}

export async function saveLocalReviewBackup(form: ReviewForm, reviewId: string | null, movieTitle: string): Promise<void> {
  await AsyncStorage.setItem(`${DRAFT_PREFIX}${form.movieId}`, JSON.stringify({ form, reviewId, movieTitle, savedAt: new Date().toISOString() }));
}

export async function loadLocalReviewBackup(movieId: string): Promise<{ form: ReviewForm; reviewId: string | null; movieTitle: string } | null> {
  const stored = await AsyncStorage.getItem(`${DRAFT_PREFIX}${movieId}`);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as { form?: ReviewForm; reviewId?: string | null; movieTitle?: string };
    return parsed.form?.movieId === movieId ? { form: { ...emptyReviewForm(movieId), ...parsed.form }, reviewId: parsed.reviewId ?? null, movieTitle: parsed.movieTitle ?? '' } : null;
  } catch { return null; }
}

export async function clearLocalReviewBackup(movieId: string): Promise<void> {
  await AsyncStorage.removeItem(`${DRAFT_PREFIX}${movieId}`);
}
