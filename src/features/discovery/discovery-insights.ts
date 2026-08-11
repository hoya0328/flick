import { type Movie } from '@/features/discovery/movies';
import { supabase } from '@/lib/supabase';

export type DiscoveryMovieRank = { rank: number; movieId: string; title: string; posterPath: string | null; score: number };
export type DiscoveryKeywordRank = { rank: number; key: string; label: string; score: number };
export type DiscoveryRankings = {
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  sampleSize: number;
  sufficient: boolean;
  refreshedAt: string | null;
  movies: DiscoveryMovieRank[];
  keywords: DiscoveryKeywordRank[];
};

export type EditorialKind = 'niche' | 'expert';
export type EditorialStatus = 'draft' | 'published';
export type EditorialCuration = {
  curationId: string;
  kind: EditorialKind;
  title: string;
  description: string;
  curatorName: string;
  sourceUrl: string;
  rightsConfirmed: boolean;
  status: EditorialStatus;
  movieCount: number;
  posterPaths: string[];
  publishedAt: string | null;
  updatedAt: string | null;
};
export type EditorialCurationItem = { movie: Movie; note: string };
export type EditorialCurationDetail = EditorialCuration & { items: EditorialCurationItem[] };

function client() {
  if (!supabase) throw new Error('발견 서버가 연결되지 않았어요.');
  return supabase;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function insightError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('admin_required')) return new Error('관리자 권한이 필요해요.');
  if (message.includes('add_movies_before_publish')) return new Error('영화를 한 편 이상 추가한 뒤 공개해 주세요.');
  if (message.includes('expert_rights_required')) return new Error('전문가 이름·출처 URL·콘텐츠 권한 확인이 모두 필요해요.');
  if (message.includes('invalid_curation_title')) return new Error('큐레이션 제목을 2~80자로 입력해 주세요.');
  if (message.includes('curation_not_found')) return new Error('큐레이션을 찾을 수 없어요.');
  if (message.includes('curation_full')) return new Error('큐레이션에는 영화를 최대 30편까지 담을 수 있어요.');
  return new Error(message || '발견 요청을 처리하지 못했어요.');
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function curationFromRow(row: Record<string, unknown>, admin = false): EditorialCuration {
  return {
    curationId: String(row.curation_id),
    kind: row.kind === 'expert' ? 'expert' : 'niche',
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    curatorName: String(row.curator_name ?? ''),
    sourceUrl: String(row.source_url ?? ''),
    rightsConfirmed: Boolean(row.rights_confirmed),
    status: admin && row.status !== 'published' ? 'draft' : 'published',
    movieCount: numberValue(row.movie_count),
    posterPaths: Array.isArray(row.poster_paths) ? row.poster_paths.filter((value): value is string => typeof value === 'string') : [],
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export async function getDiscoveryRankings(): Promise<DiscoveryRankings> {
  const { data, error } = await client().rpc('get_discovery_rankings');
  if (error) throw insightError(error);
  const row = recordOf(data);
  return {
    periodDays: numberValue(row.period_days) || 7,
    periodStart: String(row.period_start ?? ''),
    periodEnd: String(row.period_end ?? ''),
    sampleSize: numberValue(row.sample_size),
    sufficient: Boolean(row.sufficient),
    refreshedAt: typeof row.refreshed_at === 'string' ? row.refreshed_at : null,
    movies: (Array.isArray(row.movies) ? row.movies : []).map(recordOf).map((item) => ({ rank: numberValue(item.rank), movieId: String(item.movie_id), title: String(item.title), posterPath: typeof item.poster_path === 'string' ? item.poster_path : null, score: numberValue(item.score) })),
    keywords: (Array.isArray(row.keywords) ? row.keywords : []).map(recordOf).map((item) => ({ rank: numberValue(item.rank), key: String(item.key), label: String(item.label), score: numberValue(item.score) })),
  };
}

export async function refreshDiscoveryRankings(periodDays = 7, minimumReviews = 5) {
  const { data, error } = await client().rpc('admin_refresh_discovery_rankings', { p_period_days: periodDays, p_min_reviews: minimumReviews });
  if (error) throw insightError(error);
  return String(data);
}

export async function listPublishedCurations(limit = 10): Promise<EditorialCuration[]> {
  const { data, error } = await client().rpc('list_published_curations', { p_limit: limit });
  if (error) throw insightError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => curationFromRow(row));
}

export async function getPublishedCuration(curationId: string): Promise<EditorialCurationDetail | null> {
  const [{ data, error }, { data: itemData, error: itemError }] = await Promise.all([
    client().rpc('get_published_curation', { p_curation_id: curationId }),
    client().rpc('list_published_curation_items', { p_curation_id: curationId }),
  ]);
  if (error) throw insightError(error);
  if (itemError) throw insightError(itemError);
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) return null;
  const items: EditorialCurationItem[] = ((itemData ?? []) as Record<string, unknown>[]).map((item) => ({
    note: String(item.note ?? ''),
    movie: {
      id: String(item.movie_id), provider: 'tmdb', providerId: '', title: String(item.title ?? ''),
      originalTitle: typeof item.original_title === 'string' ? item.original_title : null,
      overview: String(item.overview ?? ''), posterPath: typeof item.poster_path === 'string' ? item.poster_path : null,
      releaseDate: typeof item.release_date === 'string' ? item.release_date : null,
      runtime: item.runtime === null ? null : numberValue(item.runtime),
      genres: Array.isArray(item.genres) ? item.genres.filter((value): value is string => typeof value === 'string') : [],
      recommendationKeywords: Array.isArray(item.recommendation_keywords) ? item.recommendation_keywords.filter((value): value is string => typeof value === 'string') : [],
      voteAverage: item.vote_average === null ? null : numberValue(item.vote_average),
      details: null, detailsSource: 'cache', detailsStatus: 'summary', detailsFetchedAt: null,
    },
  }));
  return { ...curationFromRow({ ...row, movie_count: items.length }), items };
}

export async function listAdminCurations(): Promise<EditorialCuration[]> {
  const { data, error } = await client().rpc('admin_list_editorial_curations');
  if (error) throw insightError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => curationFromRow(row, true));
}

export async function listAdminCurationItems(curationId: string): Promise<EditorialCurationItem[]> {
  const { data, error } = await client().rpc('admin_list_editorial_curation_items', { p_curation_id: curationId });
  if (error) throw insightError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((item) => ({
    note: String(item.note ?? ''),
    movie: {
      id: String(item.movie_id), provider: 'tmdb', providerId: '', title: String(item.title ?? ''),
      originalTitle: typeof item.original_title === 'string' ? item.original_title : null,
      overview: String(item.overview ?? ''), posterPath: typeof item.poster_path === 'string' ? item.poster_path : null,
      releaseDate: typeof item.release_date === 'string' ? item.release_date : null,
      runtime: item.runtime === null ? null : numberValue(item.runtime),
      genres: Array.isArray(item.genres) ? item.genres.filter((value): value is string => typeof value === 'string') : [],
      recommendationKeywords: Array.isArray(item.recommendation_keywords) ? item.recommendation_keywords.filter((value): value is string => typeof value === 'string') : [],
      voteAverage: item.vote_average === null ? null : numberValue(item.vote_average),
      details: null, detailsSource: 'cache', detailsStatus: 'summary', detailsFetchedAt: null,
    },
  }));
}

export async function saveAdminCuration(input: Omit<EditorialCuration, 'movieCount' | 'posterPaths' | 'publishedAt' | 'updatedAt'>) {
  const { data, error } = await client().rpc('admin_save_editorial_curation', {
    p_curation_id: input.curationId || null,
    p_kind: input.kind,
    p_title: input.title,
    p_description: input.description,
    p_curator_name: input.curatorName,
    p_source_url: input.sourceUrl,
    p_rights_confirmed: input.rightsConfirmed,
    p_status: input.status,
  });
  if (error) throw insightError(error);
  return String(data);
}

export async function addAdminCurationMovie(curationId: string, movieId: string, note = '') {
  const { error } = await client().rpc('admin_add_editorial_curation_movie', { p_curation_id: curationId, p_movie_id: movieId, p_note: note });
  if (error) throw insightError(error);
}

export async function removeAdminCurationMovie(curationId: string, movieId: string) {
  const { error } = await client().rpc('admin_remove_editorial_curation_movie', { p_curation_id: curationId, p_movie_id: movieId });
  if (error) throw insightError(error);
}

export async function deleteAdminCuration(curationId: string) {
  const { error } = await client().rpc('admin_delete_editorial_curation', { p_curation_id: curationId });
  if (error) throw insightError(error);
}
