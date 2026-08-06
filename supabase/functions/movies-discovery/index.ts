import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'jsr:@supabase/server@^1';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

const keywordGenres: Record<string, number[]> = {
  immersive: [878, 53], romantic: [10749], warm: [18, 10751], moving: [18], witty: [35],
  tense: [53, 80], mysterious: [9648], comforting: [10751, 35], thoughtful: [18, 99],
  refreshing: [35, 12], unusual: [14, 878], nostalgic: [18, 10749],
};

type RequestBody = { action: 'search' | 'recommend' | 'detail'; query?: string; keywordIds?: string[]; providerId?: string };
type TmdbMovie = { id: number; title: string; original_title?: string; overview?: string; poster_path?: string | null; release_date?: string; runtime?: number; vote_average?: number; genres?: Array<{ name: string }>; genre_ids?: number[] };

function normalize(movie: TmdbMovie, keywordIds: string[] = []) {
  return {
    provider: 'tmdb', provider_id: String(movie.id), title: movie.title, original_title: movie.original_title ?? null,
    overview: movie.overview ?? '', poster_path: movie.poster_path ?? null, release_date: movie.release_date || null,
    runtime: movie.runtime ?? null, genres: movie.genres?.map((genre) => genre.name) ?? [],
    recommendation_keywords: keywordIds, vote_average: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : null,
    metadata: { genre_ids: movie.genre_ids ?? [] }, cached_at: new Date().toISOString(),
  };
}

const authenticatedHandler = withSupabase({ auth: 'user' }, async (request, { supabase }) => {
  const body = (await request.json()) as RequestBody;
  const keywordIds = body.keywordIds?.slice(0, 5) ?? [];

  const cached = async () => {
    let query = supabase.from('movies').select('*').order('vote_average', { ascending: false }).limit(20);
    if (body.action === 'detail' && body.providerId) query = query.eq('provider_id', body.providerId);
    if (body.action === 'search' && body.query) query = query.ilike('title', `%${body.query.trim()}%`);
    if (body.action === 'recommend' && keywordIds.length) query = query.overlaps('recommendation_keywords', keywordIds);
    const { data } = await query;
    return data ?? [];
  };

  try {
    const tmdbToken = Deno.env.get('TMDB_API_TOKEN');
    if (!tmdbToken) throw new Error('provider_unavailable');
    const params = new URLSearchParams({ language: 'ko-KR', include_adult: 'false' });
    let endpoint = '';
    if (body.action === 'search' && body.query?.trim()) {
      endpoint = '/search/movie';
      params.set('query', body.query.trim());
    } else if (body.action === 'detail' && body.providerId) endpoint = `/movie/${body.providerId}`;
    else {
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
    const payload = await response.json();
    const rawMovies: TmdbMovie[] = Array.isArray(payload.results) ? payload.results : [payload];
    const normalized = rawMovies.slice(0, 20).map((movie) => normalize(movie, keywordIds));

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRole) throw new Error('server_configuration');
    const cacheResponse = await fetch(`${supabaseUrl}/rest/v1/movies?on_conflict=provider,provider_id&select=*`, {
      method: 'POST',
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(normalized),
    });
    if (!cacheResponse.ok) throw new Error('cache_write_failed');
    const movies = await cacheResponse.json();
    return Response.json({ movies, source: 'tmdb' }, { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=900' } });
  } catch (error) {
    const movies = await cached();
    const code = error instanceof Error ? error.message : 'provider_unavailable';
    return Response.json({ movies, source: 'cache', code }, { status: movies.length ? 200 : 503, headers: corsHeaders });
  }
});

export default {
  fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    return authenticatedHandler(request);
  },
};
