import { type Movie } from '@/features/discovery/movies';
import { supabase } from '@/lib/supabase';

export type CollectionVisibility = 'private' | 'public';

export type CollectionSummary = {
  collectionId: string;
  authorDisplayName: string;
  title: string;
  description: string;
  visibility: CollectionVisibility;
  movieCount: number;
  saveCount: number;
  viewerSaved: boolean;
  posterPaths: string[];
  updatedAt: string;
};

export type CollectionDetail = CollectionSummary & {
  ownerUserId: string;
  isMine: boolean;
  movies: Movie[];
};

function client() {
  if (!supabase) throw new Error('컬렉션 서버가 연결되지 않았어요.');
  return supabase;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function collectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('authentication_required')) return new Error('로그인 후 사용할 수 있어요.');
  if (message.includes('invalid_collection_title')) return new Error('컬렉션 이름을 2~60자로 입력해 주세요.');
  if (message.includes('invalid_collection_description')) return new Error('소개는 500자 이하로 입력해 주세요.');
  if (message.includes('collection_not_found')) return new Error('컬렉션을 찾을 수 없거나 수정 권한이 없어요.');
  if (message.includes('collection_full')) return new Error('한 컬렉션에는 영화를 최대 100편까지 담을 수 있어요.');
  if (message.includes('movie_not_found')) return new Error('영화 정보를 찾을 수 없어요.');
  return new Error(message || '컬렉션 요청을 처리하지 못했어요.');
}

function summaryFromRow(row: Record<string, unknown>, mine = false): CollectionSummary {
  return {
    collectionId: String(row.collection_id),
    authorDisplayName: String(row.author_display_name ?? (mine ? '나' : 'FLICK 사용자')),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    visibility: row.visibility === 'public' ? 'public' : 'private',
    movieCount: numberValue(row.movie_count),
    saveCount: numberValue(row.save_count),
    viewerSaved: Boolean(row.viewer_saved),
    posterPaths: Array.isArray(row.poster_paths) ? row.poster_paths.filter((value): value is string => typeof value === 'string') : [],
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function listPublicCollections(limit = 12): Promise<CollectionSummary[]> {
  const { data, error } = await client().rpc('list_public_collections', { p_limit: limit });
  if (error) throw collectionError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({ ...summaryFromRow(row), visibility: 'public' }));
}

export async function listMyCollections(): Promise<CollectionSummary[]> {
  const { data, error } = await client().rpc('list_my_collections');
  if (error) throw collectionError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => summaryFromRow(row, true));
}

export async function listSavedCollections(): Promise<CollectionSummary[]> {
  const { data, error } = await client().rpc('list_saved_collections');
  if (error) throw collectionError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({ ...summaryFromRow(row), visibility: 'public', viewerSaved: true }));
}

export async function getMovieCollection(collectionId: string): Promise<CollectionDetail | null> {
  const [{ data, error }, { data: itemData, error: itemError }] = await Promise.all([
    client().rpc('get_movie_collection', { p_collection_id: collectionId }),
    client().rpc('list_movie_collection_items', { p_collection_id: collectionId }),
  ]);
  if (error) throw collectionError(error);
  if (itemError) throw collectionError(itemError);
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) return null;
  const movies: Movie[] = ((itemData ?? []) as Record<string, unknown>[]).map((item) => ({
    id: String(item.movie_id),
    provider: 'tmdb',
    providerId: '',
    title: String(item.title ?? '영화 정보 없음'),
    originalTitle: typeof item.original_title === 'string' ? item.original_title : null,
    overview: String(item.overview ?? ''),
    posterPath: typeof item.poster_path === 'string' ? item.poster_path : null,
    releaseDate: typeof item.release_date === 'string' ? item.release_date : null,
    runtime: item.runtime === null ? null : numberValue(item.runtime),
    genres: Array.isArray(item.genres) ? item.genres.filter((value): value is string => typeof value === 'string') : [],
    recommendationKeywords: Array.isArray(item.recommendation_keywords) ? item.recommendation_keywords.filter((value): value is string => typeof value === 'string') : [],
    voteAverage: item.vote_average === null ? null : numberValue(item.vote_average),
    details: null,
    detailsSource: 'cache',
    detailsStatus: 'summary',
    detailsFetchedAt: null,
  }));
  return {
    ...summaryFromRow({ ...row, movie_count: movies.length, poster_paths: movies.flatMap((movie) => movie.posterPath ? [movie.posterPath] : []).slice(0, 4) }),
    ownerUserId: String(row.owner_user_id),
    isMine: Boolean(row.is_mine),
    movies,
  };
}

export async function saveMovieCollection(input: { collectionId?: string | null; title: string; description: string; visibility: CollectionVisibility }) {
  const { data, error } = await client().rpc('save_movie_collection', {
    p_collection_id: input.collectionId ?? null,
    p_title: input.title,
    p_description: input.description,
    p_visibility: input.visibility,
  });
  if (error) throw collectionError(error);
  return String(data);
}

export async function deleteMovieCollection(collectionId: string) {
  const { error } = await client().rpc('delete_movie_collection', { p_collection_id: collectionId });
  if (error) throw collectionError(error);
}

export async function addMovieToCollection(collectionId: string, movieId: string) {
  const { error } = await client().rpc('add_movie_to_collection', { p_collection_id: collectionId, p_movie_id: movieId });
  if (error) throw collectionError(error);
}

export async function removeMovieFromCollection(collectionId: string, movieId: string) {
  const { error } = await client().rpc('remove_movie_from_collection', { p_collection_id: collectionId, p_movie_id: movieId });
  if (error) throw collectionError(error);
}

export async function setMovieCollectionSaved(collectionId: string, active: boolean) {
  const { error } = await client().rpc('set_movie_collection_saved', { p_collection_id: collectionId, p_active: active });
  if (error) throw collectionError(error);
}
