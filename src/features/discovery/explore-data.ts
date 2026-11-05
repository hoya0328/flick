import { useCallback, useEffect, useRef, useState } from 'react';
import { discoverDemoMovies, discoverMovies, type DiscoveryResult, type Movie } from './movies';
import { listPublishedCurations, type EditorialCuration } from './discovery-insights';
import { listPublicCollections, type CollectionSummary } from '../community/collections-service';
import { listReviews, type ReviewRecord } from '../reviews/reviews';
import { useSession } from '../session/session-provider';

export async function exploreCatalog(query: string, selected: string[], mode: 'none' | 'demo' | 'supabase'): Promise<DiscoveryResult> {
  if (mode !== 'supabase') return discoverDemoMovies('', selected);
  const results = await Promise.allSettled([
    discoverMovies('', []),
    ...(query.trim() || selected.length ? [discoverMovies(query.trim(), query.trim() ? [] : selected)] : []),
  ]);
  const usable = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  if (!usable.length) throw new Error('영화 정보를 불러오지 못했어요.');
  const source = usable.some(item => item.source === 'tmdb') ? 'tmdb' : usable.some(item => item.source === 'cache') ? 'cache' : 'demo';
  // Never mix example UUIDs into a real account's working movie catalog.
  const live = source === 'demo' ? usable : usable.filter(item => item.source !== 'demo');
  return { movies: [...new Map(live.flatMap(item => item.movies).map(movie => [movie.id, movie])).values()], source, notice: source === 'demo' ? '서버 연결이 어려워 예시 영화를 표시해요. 실제 기록 저장은 서버 복구 후 사용할 수 있어요.' : source === 'cache' ? '저장된 영화 정보를 표시하고 있어요.' : null };
}
type ExploreData = { movies: Movie[]; source: DiscoveryResult['source']; notice: string | null; records: ReviewRecord[]; curations: EditorialCuration[]; collections: CollectionSummary[] };
const empty: ExploreData = { movies: [], source: 'demo', notice: null, records: [], curations: [], collections: [] };
export function useExploreData(query = '') {
  const { mode, email, selectedKeywords, status: sessionStatus } = useSession();
  const [data, setData] = useState<ExploreData>(empty), [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [secondaryError, setSecondaryError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadedFor, setLoadedFor] = useState('');
  const ownerKey = `${mode}:${email ?? ''}`;
  const generation = useRef(0), selectedKey = selectedKeywords.join(',');
  useEffect(() => {
    const request = ++generation.current;
    if (sessionStatus !== 'ready' || mode === 'none') return;
    let active = true;
    const timer = setTimeout(() => {
      setStatus('loading'); setSecondaryError(false); setData(empty);
      void Promise.allSettled([
        exploreCatalog(query, selectedKey ? selectedKey.split(',') : [], mode),
        listReviews(mode),
        mode === 'supabase' ? listPublishedCurations(12) : Promise.resolve([] as EditorialCuration[]),
        mode === 'supabase' ? listPublicCollections(12) : Promise.resolve([] as CollectionSummary[]),
      ]).then(([catalog, records, curations, collections]) => {
        if (!active || generation.current !== request) return;
        setLoadedFor(ownerKey);
        setData({ movies: catalog.status === 'fulfilled' ? catalog.value.movies : [], source: catalog.status === 'fulfilled' ? catalog.value.source : 'demo', notice: catalog.status === 'fulfilled' ? catalog.value.notice : null, records: records.status === 'fulfilled' ? records.value : [], curations: curations.status === 'fulfilled' ? curations.value : [], collections: collections.status === 'fulfilled' ? collections.value : [] });
        setSecondaryError([records, curations, collections].some(result => result.status === 'rejected'));
        setStatus(catalog.status === 'fulfilled' ? 'ready' : 'error');
      });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [attempt, mode, ownerKey, query, selectedKey, sessionStatus]);
  const reload = useCallback(() => setAttempt(value => value + 1), []);
  // A new account or signed-out render must never reuse a previous viewer's signals.
  const matchesViewer = loadedFor === ownerKey && mode !== 'none' && sessionStatus === 'ready';
  return { ...(matchesViewer ? data : empty), status: matchesViewer ? status : 'loading' as const, secondaryError: matchesViewer && secondaryError, reload };
}
