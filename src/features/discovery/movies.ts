import { supabase } from '@/lib/supabase';
import { type Movie, type MovieDetails, rankMovies } from '@/features/discovery/discovery-logic';

export { type Movie, rankMovies, recommendationReason, yearOf } from '@/features/discovery/discovery-logic';

export type DiscoveryResult = {
  movies: Movie[];
  source: 'tmdb' | 'cache' | 'demo';
  notice: string | null;
};

type MovieRow = {
  id: string;
  provider: string;
  provider_id: string;
  title: string;
  original_title: string | null;
  overview: string;
  poster_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: string[] | null;
  recommendation_keywords: string[] | null;
  vote_average: number | string | null;
  details_status?: Movie['detailsStatus'] | null;
  details_fetched_at?: string | null;
};

type MovieDetailsRow = {
  tagline: string | null;
  publication_status: string | null;
  original_language: string | null;
  production_companies: unknown;
  production_countries: unknown;
  credits: unknown;
  images: unknown;
  videos: unknown;
  keywords: unknown;
  watch_providers: unknown;
  completeness: Record<string, 'complete' | 'source_empty'> | null;
  fetched_at: string;
};

const demoMovieDefaults = { details: null, detailsFetchedAt: null, detailsSource: 'demo', detailsStatus: 'summary' } as const;

const demoMovies: Movie[] = [
  { ...demoMovieDefaults, id: '10000000-0000-4000-8000-000000000001', provider: 'tmdb', providerId: '27205', title: '인셉션', originalTitle: 'Inception', overview: '타인의 꿈에 들어가 생각을 훔치는 특수 보안 요원이 마지막 임무에서 생각을 심는 불가능한 도전에 나선다.', posterPath: null, releaseDate: '2010-07-15', runtime: 148, genres: ['SF', '스릴러'], recommendationKeywords: ['immersive', 'thoughtful', 'tense', 'mysterious'], voteAverage: 8.4 },
  { ...demoMovieDefaults, id: '10000000-0000-4000-8000-000000000002', provider: 'tmdb', providerId: '313369', title: '라라랜드', originalTitle: 'La La Land', overview: '꿈을 좇는 재즈 피아니스트와 배우 지망생이 사랑과 선택의 순간을 함께 통과한다.', posterPath: null, releaseDate: '2016-12-09', runtime: 129, genres: ['로맨스', '드라마'], recommendationKeywords: ['romantic', 'moving', 'nostalgic'], voteAverage: 7.9 },
  { ...demoMovieDefaults, id: '10000000-0000-4000-8000-000000000003', provider: 'tmdb', providerId: '452166', title: '리틀 포레스트', originalTitle: 'Little Forest', overview: '도시 생활에 지친 혜원이 고향으로 돌아와 사계절의 음식과 오래된 관계 속에서 자신을 회복한다.', posterPath: null, releaseDate: '2018-02-28', runtime: 103, genres: ['드라마'], recommendationKeywords: ['warm', 'comforting', 'nostalgic'], voteAverage: 7.7 },
  { ...demoMovieDefaults, id: '10000000-0000-4000-8000-000000000004', provider: 'tmdb', providerId: '496243', title: '기생충', originalTitle: 'Parasite', overview: '서로 다른 환경에 사는 두 가족이 예상하지 못한 방식으로 얽히며 균열이 시작된다.', posterPath: null, releaseDate: '2019-05-30', runtime: 132, genres: ['드라마', '스릴러'], recommendationKeywords: ['tense', 'thoughtful', 'unusual'], voteAverage: 8.5 },
  { ...demoMovieDefaults, id: '10000000-0000-4000-8000-000000000005', provider: 'tmdb', providerId: '666277', title: '패스트 라이브즈', originalTitle: 'Past Lives', overview: '어린 시절 헤어진 두 사람이 오랜 시간이 지나 뉴욕에서 다시 만나 삶의 인연과 선택을 돌아본다.', posterPath: null, releaseDate: '2023-06-02', runtime: 106, genres: ['드라마', '로맨스'], recommendationKeywords: ['romantic', 'thoughtful', 'nostalgic'], voteAverage: 7.8 },
  { ...demoMovieDefaults, id: '10000000-0000-4000-8000-000000000006', provider: 'tmdb', providerId: '120467', title: '그랜드 부다페스트 호텔', originalTitle: 'The Grand Budapest Hotel', overview: '전설적인 호텔 지배인과 로비 보이가 그림 도난과 유산 분쟁에 휘말리는 기묘하고 우아한 모험.', posterPath: null, releaseDate: '2014-02-26', runtime: 100, genres: ['코미디', '모험'], recommendationKeywords: ['witty', 'mysterious', 'unusual'], voteAverage: 8.0 },
  { ...demoMovieDefaults, id: '10000000-0000-4000-8000-000000000007', provider: 'tmdb', providerId: '244786', title: '위플래쉬', originalTitle: 'Whiplash', overview: '최고의 드러머를 꿈꾸는 학생이 완벽을 강요하는 지휘자와 극한의 긴장 속에서 맞선다.', posterPath: null, releaseDate: '2014-10-10', runtime: 107, genres: ['드라마', '음악'], recommendationKeywords: ['immersive', 'tense', 'thoughtful'], voteAverage: 8.4 },
  { ...demoMovieDefaults, id: '10000000-0000-4000-8000-000000000008', provider: 'tmdb', providerId: '545611', title: '에브리씽 에브리웨어 올 앳 원스', originalTitle: 'Everything Everywhere All at Once', overview: '평범한 세탁소 주인이 다중 우주를 넘나들며 가족과 삶의 의미를 다시 선택한다.', posterPath: null, releaseDate: '2022-03-24', runtime: 140, genres: ['SF', '코미디'], recommendationKeywords: ['unusual', 'moving', 'witty', 'thoughtful'], voteAverage: 7.7 },
];

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(recordOf) : [];
}

function providerNames(value: unknown, key: string): string[] {
  const results = recordOf(recordOf(value).results);
  const koreanProviders = recordOf(results.KR);
  return arrayOfRecords(koreanProviders[key])
    .map((provider) => typeof provider.provider_name === 'string' ? provider.provider_name : '')
    .filter(Boolean);
}

function fromDetailsRow(row: MovieDetailsRow | null | undefined): MovieDetails | null {
  if (!row) return null;
  const credits = recordOf(row.credits);
  const images = recordOf(row.images);
  const videos = recordOf(row.videos);
  const keywords = recordOf(row.keywords);
  return {
    tagline: row.tagline,
    publicationStatus: row.publication_status,
    originalLanguage: row.original_language,
    directorNames: arrayOfRecords(credits.crew)
      .filter((person) => person.job === 'Director')
      .map((person) => typeof person.name === 'string' ? person.name : '')
      .filter(Boolean),
    cast: arrayOfRecords(credits.cast).slice(0, 12).map((person) => ({
      name: typeof person.name === 'string' ? person.name : '이름 미상',
      character: typeof person.character === 'string' && person.character ? person.character : null,
    })),
    productionCompanies: arrayOfRecords(row.production_companies)
      .map((company) => typeof company.name === 'string' ? company.name : '')
      .filter(Boolean),
    productionCountries: arrayOfRecords(row.production_countries)
      .map((country) => typeof country.name === 'string' ? country.name : '')
      .filter(Boolean),
    keywords: arrayOfRecords(keywords.keywords)
      .map((keyword) => typeof keyword.name === 'string' ? keyword.name : '')
      .filter(Boolean),
    imageCount: arrayOfRecords(images.posters).length + arrayOfRecords(images.backdrops).length + arrayOfRecords(images.logos).length,
    videoCount: arrayOfRecords(videos.results).length,
    watchProviders: {
      stream: [...new Set([
        ...providerNames(row.watch_providers, 'flatrate'),
        ...providerNames(row.watch_providers, 'free'),
        ...providerNames(row.watch_providers, 'ads'),
      ])],
      rent: providerNames(row.watch_providers, 'rent'),
      buy: providerNames(row.watch_providers, 'buy'),
    },
    completeness: row.completeness ?? {},
    fetchedAt: row.fetched_at,
  };
}

function fromRow(row: MovieRow, details: MovieDetailsRow | null = null, source: Movie['detailsSource'] = null): Movie {
  return {
    id: row.id,
    provider: 'tmdb',
    providerId: row.provider_id,
    title: row.title,
    originalTitle: row.original_title,
    overview: row.overview,
    posterPath: row.poster_path,
    releaseDate: row.release_date,
    runtime: row.runtime,
    genres: row.genres ?? [],
    recommendationKeywords: row.recommendation_keywords ?? [],
    voteAverage: row.vote_average === null ? null : Number(row.vote_average),
    details: fromDetailsRow(details),
    detailsSource: source,
    detailsStatus: row.details_status ?? 'summary',
    detailsFetchedAt: row.details_fetched_at ?? null,
  };
}

function localResult(query: string, keywordIds: string[]): DiscoveryResult {
  const normalized = query.trim().toLocaleLowerCase('ko-KR');
  const filtered = normalized
    ? demoMovies.filter((movie) => `${movie.title} ${movie.originalTitle ?? ''}`.toLocaleLowerCase('ko-KR').includes(normalized))
    : rankMovies(demoMovies, keywordIds);
  return { movies: filtered, source: 'demo', notice: '영화 서버 연결 전이라 검증용 캐시를 보여드려요.' };
}

async function cachedMovies(query: string, keywordIds: string[]): Promise<DiscoveryResult | null> {
  if (!supabase) return null;
  let request = supabase.from('movies').select('*').limit(20);
  if (query.trim()) request = request.ilike('title', `%${query.trim()}%`);
  else if (keywordIds.length) request = request.overlaps('recommendation_keywords', keywordIds);
  const { data, error } = await request;
  if (error || !data?.length) return null;
  return { movies: rankMovies((data as MovieRow[]).map((row) => fromRow(row)), keywordIds), source: 'cache', notice: '안정적으로 저장된 영화 캐시를 보여드려요.' };
}

export async function discoverMovies(query = '', keywordIds: string[] = []): Promise<DiscoveryResult> {
  if (supabase) {
    const action = query.trim() ? 'search' : 'recommend';
    const { data, error } = await supabase.functions.invoke('movies-discovery', {
      body: { action, keywordIds, query: query.trim() },
    });
    if (!error && Array.isArray(data?.movies) && data.movies.length) {
      return {
        movies: rankMovies((data.movies as MovieRow[]).map((row) => fromRow(row)), keywordIds),
        source: data.source === 'tmdb' ? 'tmdb' : 'cache',
        notice: data.source === 'tmdb' ? null : '외부 API 대신 저장된 영화 캐시를 보여드려요.',
      };
    }
    const cached = await cachedMovies(query, keywordIds);
    if (cached) return cached;
  }
  return localResult(query, keywordIds);
}

export async function getMovie(movieId: string, force = false): Promise<Movie | null> {
  if (supabase) {
    const { data: cachedMovie } = await supabase.from('movies').select('*').eq('id', movieId).maybeSingle();
    if (cachedMovie) {
      const row = cachedMovie as MovieRow;
      const { data, error } = await supabase.functions.invoke('movies-discovery', {
        body: { action: 'detail', force, providerId: row.provider_id },
      });
      if (!error && data?.movies?.[0]) {
        return fromRow(data.movies[0] as MovieRow, data.details as MovieDetailsRow | null, data.source === 'tmdb' ? 'tmdb' : 'cache');
      }

      const { data: cachedDetails } = await supabase.from('movie_details').select('*').eq('movie_id', movieId).maybeSingle();
      return fromRow(row, cachedDetails as MovieDetailsRow | null, cachedDetails ? 'cache' : null);
    }
  }
  return demoMovies.find((movie) => movie.id === movieId) ?? null;
}

export async function getWatchlistMovieIds(): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('watchlist').select('movie_id').eq('status', 'want_to_watch');
  return data?.map((row) => row.movie_id as string) ?? [];
}

export async function setWantToWatch(movieId: string, wanted: boolean): Promise<void> {
  if (!supabase) throw new Error('로그인한 계정에서 사용할 수 있어요.');
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) throw new Error('로그인 세션을 다시 확인해 주세요.');
  const request = wanted
    ? supabase.from('watchlist').upsert({ movie_id: movieId, status: 'want_to_watch', user_id: data.user.id, updated_at: new Date().toISOString() })
    : supabase.from('watchlist').delete().eq('user_id', data.user.id).eq('movie_id', movieId);
  const { error } = await request;
  if (error) throw error;
}

export const tmdbAttribution = 'This product uses the TMDB API but is not endorsed or certified by TMDB.';
