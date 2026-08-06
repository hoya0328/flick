import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

const keywordGenres: Record<string, number[]> = {
  immersive: [878, 53], romantic: [10749], warm: [18, 10751], moving: [18], witty: [35],
  tense: [53, 80], mysterious: [9648], comforting: [10751, 35], thoughtful: [18, 99],
  refreshing: [35, 12], unusual: [14, 878], nostalgic: [18, 10749],
};

const genreNames: Record<number, string> = {
  12: '모험', 14: '판타지', 16: '애니메이션', 18: '드라마', 27: '공포', 28: '액션',
  35: '코미디', 36: '역사', 37: '서부', 53: '스릴러', 80: '범죄', 99: '다큐멘터리',
  878: 'SF', 9648: '미스터리', 10402: '음악', 10749: '로맨스', 10751: '가족',
  10752: '전쟁', 10770: 'TV 영화',
};

type RequestBody = {
  action: 'search' | 'recommend' | 'detail';
  force?: boolean;
  query?: string;
  keywordIds?: string[];
  providerId?: string;
};

type TmdbMovie = {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  genres?: Array<{ id: number; name: string }>;
  genre_ids?: number[];
  [key: string]: unknown;
};

type ServerConfig = {
  anonKey: string;
  authorization: string;
  serviceRole: string;
  supabaseUrl: string;
};

function normalize(movie: TmdbMovie, keywordIds: string[] = [], metadata: Record<string, unknown> = {}) {
  const genres = movie.genres?.map((genre) => genre.name)
    ?? movie.genre_ids?.map((id) => genreNames[id]).filter((name): name is string => Boolean(name))
    ?? [];
  return {
    provider: 'tmdb',
    provider_id: String(movie.id),
    title: movie.title,
    original_title: movie.original_title ?? null,
    overview: movie.overview ?? '',
    poster_path: movie.poster_path ?? null,
    release_date: movie.release_date || null,
    runtime: movie.runtime ?? null,
    genres,
    recommendation_keywords: keywordIds,
    vote_average: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : null,
    metadata: { ...metadata, genre_ids: movie.genre_ids ?? movie.genres?.map((genre) => genre.id) ?? [] },
    cached_at: new Date().toISOString(),
    is_active: true,
    last_seen_at: new Date().toISOString(),
  };
}

function sectionState(value: unknown): 'complete' | 'source_empty' {
  if (Array.isArray(value)) return value.length ? 'complete' : 'source_empty';
  if (value && typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>);
    return values.some((item) => Array.isArray(item) ? item.length > 0 : Boolean(item)) ? 'complete' : 'source_empty';
  }
  return value ? 'complete' : 'source_empty';
}

function detailRecord(movieId: string, movie: TmdbMovie) {
  const watchProviders = movie['watch/providers'] ?? { results: {} };
  const productionCompanies = movie.production_companies ?? [];
  const productionCountries = movie.production_countries ?? [];
  const spokenLanguages = movie.spoken_languages ?? [];
  const completeness = {
    alternativeTitles: sectionState(movie.alternative_titles),
    base: 'complete',
    credits: sectionState(movie.credits),
    externalIds: sectionState(movie.external_ids),
    images: sectionState(movie.images),
    keywords: sectionState(movie.keywords),
    productionCompanies: sectionState(productionCompanies),
    productionCountries: sectionState(productionCountries),
    recommendations: sectionState(movie.recommendations),
    releaseDates: sectionState(movie.release_dates),
    similarMovies: sectionState(movie.similar),
    spokenLanguages: sectionState(spokenLanguages),
    translations: sectionState(movie.translations),
    videos: sectionState(movie.videos),
    watchProviders: sectionState((watchProviders as { results?: unknown }).results),
  };
  return {
    movie_id: movieId,
    tagline: movie.tagline ?? null,
    backdrop_path: movie.backdrop_path ?? null,
    publication_status: movie.status ?? null,
    original_language: movie.original_language ?? null,
    homepage: movie.homepage ?? null,
    imdb_id: movie.imdb_id ?? null,
    budget: typeof movie.budget === 'number' ? movie.budget : null,
    revenue: typeof movie.revenue === 'number' ? movie.revenue : null,
    belongs_to_collection: movie.belongs_to_collection ?? null,
    production_companies: productionCompanies,
    production_countries: productionCountries,
    spoken_languages: spokenLanguages,
    credits: movie.credits ?? { cast: [], crew: [] },
    images: movie.images ?? { backdrops: [], logos: [], posters: [] },
    videos: movie.videos ?? { results: [] },
    keywords: movie.keywords ?? { keywords: [] },
    alternative_titles: movie.alternative_titles ?? { titles: [] },
    translations: movie.translations ?? { translations: [] },
    release_dates: movie.release_dates ?? { results: [] },
    external_ids: movie.external_ids ?? {},
    watch_providers: watchProviders,
    recommendations: movie.recommendations ?? { results: [] },
    similar_movies: movie.similar ?? { results: [] },
    completeness,
    provider_payload: movie,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    last_error: null,
  };
}

function userHeaders(config: ServerConfig) {
  return { apikey: config.anonKey, Authorization: config.authorization };
}

function serviceHeaders(config: ServerConfig, prefer?: string) {
  return {
    apikey: config.serviceRole,
    Authorization: `Bearer ${config.serviceRole}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function readCachedMovies(body: RequestBody, keywordIds: string[], config: ServerConfig) {
  const params = new URLSearchParams({ select: '*', order: 'vote_average.desc', limit: '20' });
  if (body.action === 'detail' && body.providerId) params.set('provider_id', `eq.${body.providerId}`);
  if (body.action === 'search' && body.query?.trim()) params.set('title', `ilike.*${body.query.trim()}*`);
  if (body.action === 'recommend' && keywordIds.length) {
    params.set('recommendation_keywords', `ov.{${keywordIds.join(',')}}`);
  }
  const response = await fetch(`${config.supabaseUrl}/rest/v1/movies?${params}`, {
    headers: userHeaders(config),
  });
  return response.ok ? await response.json() : [];
}

async function readCachedDetails(movieId: string, config: ServerConfig) {
  const params = new URLSearchParams({ select: '*', movie_id: `eq.${movieId}`, limit: '1' });
  const response = await fetch(`${config.supabaseUrl}/rest/v1/movie_details?${params}`, {
    headers: userHeaders(config),
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return rows[0] ?? null;
}

async function cacheSummaries(movies: TmdbMovie[], keywordIds: string[], config: ServerConfig) {
  const normalized = movies.slice(0, 20).map((movie) => normalize(movie, keywordIds));
  if (!normalized.length) return [];
  const insertResponse = await fetch(`${config.supabaseUrl}/rest/v1/movies?on_conflict=provider,provider_id`, {
    method: 'POST',
    headers: serviceHeaders(config, 'resolution=ignore-duplicates,return=minimal'),
    body: JSON.stringify(normalized),
  });
  if (!insertResponse.ok) throw new Error('cache_write_failed');

  const ids = normalized.map((movie) => movie.provider_id).join(',');
  const params = new URLSearchParams({ select: '*', provider: 'eq.tmdb', provider_id: `in.(${ids})` });
  const response = await fetch(`${config.supabaseUrl}/rest/v1/movies?${params}`, {
    headers: serviceHeaders(config),
  });
  if (!response.ok) throw new Error('cache_read_failed');
  return await response.json();
}

async function cacheCompleteMovie(movie: TmdbMovie, existing: Record<string, unknown> | null, config: ServerConfig) {
  const metadata = existing?.metadata && typeof existing.metadata === 'object'
    ? existing.metadata as Record<string, unknown>
    : {};
  const recommendationKeywords = Array.isArray(existing?.recommendation_keywords)
    ? existing.recommendation_keywords as string[]
    : [];
  const normalized = normalize(movie, recommendationKeywords, metadata);
  const movieResponse = await fetch(
    `${config.supabaseUrl}/rest/v1/movies?on_conflict=provider,provider_id&select=*`,
    {
      method: 'POST',
      headers: serviceHeaders(config, 'resolution=merge-duplicates,return=representation'),
      body: JSON.stringify(normalized),
    },
  );
  if (!movieResponse.ok) throw new Error('cache_write_failed');
  const movieRows = await movieResponse.json();
  const movieRow = movieRows[0];
  if (!movieRow?.id) throw new Error('cache_write_failed');

  const detailsStatus = movie.runtime && normalized.genres.length && movie.overview
    ? 'complete'
    : 'source_incomplete';
  const detail = detailRecord(movieRow.id, movie);
  const detailResponse = await fetch(`${config.supabaseUrl}/rest/v1/movie_details?on_conflict=movie_id&select=*`, {
    method: 'POST',
    headers: serviceHeaders(config, 'resolution=merge-duplicates,return=representation'),
    body: JSON.stringify(detail),
  });
  if (!detailResponse.ok) throw new Error('detail_cache_write_failed');
  const detailRows = await detailResponse.json();

  const statusResponse = await fetch(`${config.supabaseUrl}/rest/v1/movies?id=eq.${movieRow.id}`, {
    method: 'PATCH',
    headers: serviceHeaders(config),
    body: JSON.stringify({
      details_fetched_at: detail.fetched_at,
      details_status: detailsStatus,
      last_seen_at: new Date().toISOString(),
    }),
  });
  if (!statusResponse.ok) throw new Error('detail_status_write_failed');

  return { details: detailRows[0] ?? detail, movie: { ...movieRow, details_fetched_at: detail.fetched_at, details_status: detailsStatus } };
}

async function handler(request: Request) {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRole) {
    return Response.json({ code: 'server_configuration' }, { status: 500, headers: corsHeaders });
  }
  if (!authorization) {
    return Response.json({ code: 'authentication_required' }, { status: 401, headers: corsHeaders });
  }

  const config = { anonKey, authorization, serviceRole, supabaseUrl };
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: userHeaders(config) });
  if (!userResponse.ok) {
    return Response.json({ code: 'invalid_session' }, { status: 401, headers: corsHeaders });
  }

  const body = (await request.json()) as RequestBody;
  if (!['search', 'recommend', 'detail'].includes(body.action)) {
    return Response.json({ code: 'invalid_action' }, { status: 400, headers: corsHeaders });
  }
  const keywordIds = body.keywordIds?.slice(0, 5) ?? [];
  const cachedMovies = await readCachedMovies(body, keywordIds, config);

  if (body.action === 'detail' && cachedMovies[0]?.id && !body.force) {
    const details = await readCachedDetails(cachedMovies[0].id, config);
    if (details?.expires_at && new Date(details.expires_at).getTime() > Date.now()) {
      return Response.json({ details, movies: cachedMovies, source: 'cache' }, { headers: corsHeaders });
    }
  }

  try {
    const tmdbToken = Deno.env.get('TMDB_API_TOKEN');
    if (!tmdbToken) throw new Error('provider_unavailable');

    const params = new URLSearchParams({ language: 'ko-KR', include_adult: 'false' });
    let endpoint = '';
    if (body.action === 'search' && body.query?.trim()) {
      endpoint = '/search/movie';
      params.set('query', body.query.trim());
    } else if (body.action === 'detail' && body.providerId) {
      endpoint = `/movie/${body.providerId}`;
      params.set('append_to_response', [
        'alternative_titles', 'credits', 'external_ids', 'images', 'keywords', 'recommendations',
        'release_dates', 'similar', 'translations', 'videos', 'watch/providers',
      ].join(','));
      params.set('include_image_language', 'ko,en,null');
    } else {
      endpoint = '/discover/movie';
      const genres = [...new Set(keywordIds.flatMap((id) => keywordGenres[id] ?? []))].slice(0, 4);
      if (genres.length) params.set('with_genres', genres.join('|'));
      params.set('sort_by', 'vote_average.desc');
      params.set('vote_count.gte', '500');
    }

    const response = await fetch(`https://api.themoviedb.org/3${endpoint}?${params}`, {
      headers: { accept: 'application/json', Authorization: `Bearer ${tmdbToken}` },
    });
    if (!response.ok) throw new Error(response.status === 429 ? 'rate_limited' : 'provider_unavailable');

    const payload = await response.json() as TmdbMovie & { results?: TmdbMovie[] };
    if (body.action === 'detail') {
      const cached = cachedMovies[0] ?? null;
      const complete = await cacheCompleteMovie(payload, cached, config);
      return Response.json(
        { details: complete.details, movies: [complete.movie], source: 'tmdb' },
        { headers: { ...corsHeaders, 'Cache-Control': 'private, max-age=300' } },
      );
    }

    const rows = await cacheSummaries(payload.results ?? [], keywordIds, config);
    return Response.json(
      { movies: rows, source: 'tmdb' },
      { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=900' } },
    );
  } catch (error) {
    const details = cachedMovies[0]?.id ? await readCachedDetails(cachedMovies[0].id, config) : null;
    const code = error instanceof Error ? error.message : 'provider_unavailable';
    if (body.action === 'detail' && cachedMovies[0]?.id) {
      if (details) {
        await fetch(`${config.supabaseUrl}/rest/v1/movie_details?movie_id=eq.${cachedMovies[0].id}`, {
          method: 'PATCH',
          headers: serviceHeaders(config),
          body: JSON.stringify({ last_error: code }),
        });
      } else {
        await fetch(`${config.supabaseUrl}/rest/v1/movies?id=eq.${cachedMovies[0].id}`, {
          method: 'PATCH',
          headers: serviceHeaders(config),
          body: JSON.stringify({ details_status: 'failed' }),
        });
      }
    }
    return Response.json(
      { details, movies: cachedMovies, source: 'cache', code },
      { status: cachedMovies.length ? 200 : 503, headers: corsHeaders },
    );
  }
}

export default { fetch: handler };
