import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { DesignVector } from '@/components/design-vector';
import { useExploreData } from '@/features/discovery/explore-data';
import { defaultExploreFilters, exploreTags, filterMovies, keywordIdsFor, niches, normalizeRatio, preferenceKeywords, recommendMix, situations, type ExploreFilters } from '@/features/discovery/explore-model';
import { ExploreButton, ExploreChips, ExploreFilterDialog, ExploreFrame, ExploreMessage, ExploreMovieRow, ui } from '@/features/discovery/explore-ui';
import { useDiscoveryRatio } from '@/features/discovery/use-discovery-ratio';
import { useSession } from '@/features/session/session-provider';
const subscribe = () => () => {}, client = () => true, server = () => false;
export default function ExploreListRoute() {
  const { status, mode, onboardingComplete } = useSession();
  if (status === 'loading') return <ExploreFrame><ActivityIndicator color="#F8233C" /></ExploreFrame>;
  if (mode === 'none' || status === 'error') return <Redirect href="/welcome" />;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  return <ExploreList />;
}
function ExploreList() {
  const raw = useLocalSearchParams<{ query?: string; tag?: string; situation?: string; niche?: string; ratio?: string; section?: string; genre?: string; rating?: string; sort?: string }>();
  const hydrated = useSyncExternalStore(subscribe, client, server), params = hydrated ? raw : {};
  const value = (entry: unknown) => typeof entry === 'string' ? entry.slice(0, 120) : '';
  const linkedQuery = value(params.query), linkedTag = value(params.tag);
  const situation = situations.find(item => item.id === value(params.situation)), niche = niches.find(item => item.id === value(params.niche));
  const { selectedKeywords } = useSession(), data = useExploreData(linkedQuery), { ratio: storedRatio } = useDiscoveryRatio();
  const ratio = params.ratio ? normalizeRatio(params.ratio) : storedRatio;
  const [query, setQuery] = useState(''), [searchText, setSearchText] = useState(''), [tag, setTag] = useState(''), [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<ExploreFilters>(defaultExploreFilters);
  useEffect(() => { const timer = setTimeout(() => { setQuery(linkedQuery); setSearchText(linkedQuery); setTag(linkedTag); }, 0); return () => clearTimeout(timer); }, [linkedQuery, linkedTag]);
  const genreParam = value(params.genre), ratingParam = value(params.rating), sortParam = value(params.sort);
  useEffect(() => { const timer = setTimeout(() => setFilters({ genre: genreParam, rating: ratingParam === '4' ? '4' : 'all', sort: sortParam === 'rating' || sortParam === 'recent' ? sortParam : 'recommend' }), 0); return () => clearTimeout(timer); }, [genreParam, ratingParam, sortParam]);
  const preferences = useMemo(() => preferenceKeywords(data.records, selectedKeywords), [data.records, selectedKeywords]);
  const ids: string[] = situation ? [...situation.tags] : niche ? [...niche.tags] : tag ? keywordIdsFor(tag) : preferences.ids;
  const candidate = situation || niche ? data.movies.filter(movie => movie.recommendationKeywords.some(id => ids.includes(id))) : data.movies;
  const movies = filterMovies(recommendMix(candidate, ids, situation || niche ? 0 : ratio, candidate.length), query, tag, filters);
  const title = situation?.title || niche?.title || (query ? '영화 검색 결과' : '내 키워드가 골라준 영화');
  const activeFilters = Boolean(filters.genre || filters.rating !== 'all' || filters.sort !== 'recommend');
  return <ExploreFrame standalone><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 81, paddingBottom: 36 }}>
    <View style={[ui.row, { paddingHorizontal: 15, minHeight: 44, marginBottom: 15 }]}><Pressable accessibilityRole="button" accessibilityLabel="탐색으로 돌아가기" onPress={() => router.canGoBack() ? router.back() : router.replace('/search')} style={{ padding: 8 }}><DesignVector name="exploreBack" width={12.5663} style={{ transform: [{ rotate: '180deg' }] }} /></Pressable><Text accessibilityRole="header" numberOfLines={1} style={[ui.heading, { flex: 1, textAlign: 'center' }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="영화 필터 열기" accessibilityState={{ selected: activeFilters }} onPress={() => setShowFilter(true)} style={{ padding: 8 }}><DesignVector name="exploreFilter" width={22} style={{ transform: [{ rotate: '-90deg' }] }} /></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 21 }}><ExploreChips values={[...exploreTags]} active={tag} onPress={value => { const next = tag === value ? '' : value; setTag(next); router.setParams({ tag: next }); }} /></ScrollView>
    <View style={{ marginHorizontal: 21, marginTop: 25, backgroundColor: '#FFF5F6', borderRadius: 20, minHeight: 176, padding: 17, gap: 12 }}><Text style={[ui.title, { fontWeight: '700' }]}>{tag ? `'${tag}'으로 추천한 이유` : situation || niche ? '이렇게 영화를 골랐어요' : '내 키워드로 추천한 이유'}</Text><ExploreChips values={['키워드 연결', `취향 확장 ${situation || niche ? 0 : ratio}%`]} small /><Text style={[ui.body, { fontSize: 13, lineHeight: 21.125 }]}>{situation?.description || (niche ? `${niche.labels.join(' · ')}의 감상 방향을 장르·키워드로 연결했어요.` : `${preferences.fromReviews ? '최근 완료 기록' : '선택한 취향'}의 '${preferences.labels.slice(0, 3).join(' · ')}'와 연결했어요. 낯선 영화 ${ratio}%를 목표로 섞으며, 현재 후보 수에 따라 실제 비율은 달라져요.`)}</Text></View>
    {params.section === 'situations' ? <View style={{ padding: 21 }}><ExploreChips values={situations.map(item => item.title)} onPress={label => router.setParams({ situation: situations.find(item => item.title === label)?.id, section: '' })} /></View> : null}
    {params.section === 'niche' ? <View style={{ padding: 21 }}><ExploreChips values={niches.map(item => item.title)} onPress={label => router.setParams({ niche: niches.find(item => item.title === label)?.id, section: '' })} /></View> : null}
    <View style={{ paddingHorizontal: 21, marginTop: 20 }}>
      {linkedQuery || searchText ? <><View style={[ui.row, { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingLeft: 10 }]}><TextInput accessibilityLabel="영화 목록 검색" placeholder="제목·키워드·소개 속 단어" maxLength={120} value={searchText} onChangeText={setSearchText} onSubmitEditing={() => { setQuery(searchText); router.setParams({ query: searchText }); }} style={[ui.body, { flex: 1, minWidth: 0, height: 44 }]} returnKeyType="search" /><Pressable accessibilityRole="button" accessibilityLabel="목록 검색 실행" onPress={() => { setQuery(searchText); router.setParams({ query: searchText }); }} style={{ padding: 12 }}><DesignVector name="exploreSearch" width={17} /></Pressable></View><Text style={[ui.small, { marginTop: 10 }]}>키워드·기분·장면은 저장된 소개의 단어와 키워드로 검색해요.</Text></> : null}
      {data.status === 'loading' ? <View style={{ padding: 30 }}><ActivityIndicator color="#F8233C" /><Text style={ui.small}>영화를 찾고 있어요.</Text></View> : <Text style={[ui.small, { marginTop: linkedQuery ? 18 : 0 }]}>현재 후보 {candidate.length}편 중 {movies.length}편 · TMDB 평점 5점 환산</Text>}
      {data.notice ? <Text style={[ui.small, { marginTop: 8 }]}>{data.notice}</Text> : null}
      {activeFilters || tag ? <Pressable accessibilityRole="button" onPress={() => { setFilters(defaultExploreFilters); setTag(''); router.setParams({ genre: '', rating: '', sort: '', tag: '' }); }} style={{ paddingVertical: 10 }}><Text style={[ui.small, { color: '#F8233C' }]}>키워드·필터 초기화</Text></Pressable> : null}
      {data.status === 'ready' ? movies.map(movie => <ExploreMovieRow key={movie.id} movie={movie} ids={ids} />) : null}
    </View>
    {data.status === 'error' ? <ExploreMessage title="검색하지 못했어요" onRetry={data.reload}>네트워크를 확인하고 다시 시도해 주세요.</ExploreMessage> : data.status === 'ready' && !movies.length ? <ExploreMessage title="조건에 맞는 영화가 없어요">다른 단어나 키워드를 선택해 보세요.</ExploreMessage> : null}
    {data.status === 'ready' && !movies.length ? <View style={{ padding: 21 }}><ExploreButton label="검색·필터 모두 초기화" secondary onPress={() => { setSearchText(''); setQuery(''); setTag(''); setFilters(defaultExploreFilters); router.setParams({ query: '', tag: '', situation: '', niche: '', genre: '', rating: '', sort: '' }); }} /></View> : null}
  </ScrollView>{showFilter ? <ExploreFilterDialog filters={filters} genres={[...new Set(data.movies.flatMap(movie => movie.genres))]} onApply={next => { setFilters(next); router.setParams({ ...next }); }} onClose={() => setShowFilter(false)} /> : null}</ExploreFrame>;
}
