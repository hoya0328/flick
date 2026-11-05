import { type Href, router, useLocalSearchParams } from 'expo-router';
import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { DesignVector } from '@/components/design-vector';
import { listPublicReviewFeed, trackProductEvent, type PublicReviewCard } from '@/features/community/community-service';
import { useExploreData } from '@/features/discovery/explore-data';
import { appreciationPoints, exploreReason, movieTags, preferenceKeywords, relatedMovies } from '@/features/discovery/explore-model';
import { ExploreButton, ExploreChips, ExploreDialog, ExploreFrame, ExploreMessage, ExploreMovieRow, ExplorePoster, ExploreSection as BaseExploreSection, MovieRating, ui, useExploreWidth } from '@/features/discovery/explore-ui';
import { getDemoMovie, getMovie, getWatchlistMovieIds, setWantToWatch, yearOf, type Movie } from '@/features/discovery/movies';
import { useRecordingLauncher } from '@/features/reviews/recording-launcher';
import { CorePhoto } from '@/features/reviews/core-photo';
import { useSession } from '@/features/session/session-provider';

const ExploreSection = (props: ComponentProps<typeof BaseExploreSection>) => <BaseExploreSection {...props} headingSize={18} />;

export default function MovieDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>(), movieId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { mode, email, selectedKeywords, status: sessionStatus } = useSession(), launch = useRecordingLauncher(), width = useExploreWidth(), scale = width / 402;
  const data = useExploreData(), generation = useRef(0), actionLock = useRef(false);
  const [movie, setMovie] = useState<Movie | null>(null), [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [wanted, setWanted] = useState(false), [saving, setSaving] = useState(false), [refreshing, setRefreshing] = useState(false), [message, setMessage] = useState('');
  const ownerKey = `${mode}:${email ?? ''}`;
  const [loadedFor, setLoadedFor] = useState('');
  const [reviews, setReviews] = useState<PublicReviewCard[]>([]), [communityError, setCommunityError] = useState(false);
  const [dialog, setDialog] = useState<'about' | 'points' | 'keywords' | 'reviews' | 'magazines' | 'details' | null>(null);
  const preferences = preferenceKeywords(data.records, selectedKeywords);
  const load = useCallback(async (force = false) => {
    const request = ++generation.current;
    if (!force) { setStatus('loading'); setMovie(null); setWanted(false); setLoadedFor(ownerKey); }
    try {
      const [next, ids] = await Promise.all([mode === 'demo' ? Promise.resolve(getDemoMovie(movieId)) : getMovie(movieId, force), mode === 'supabase' ? getWatchlistMovieIds() : Promise.resolve([])]);
      if (request !== generation.current) return;
      setMovie(next); setWanted(ids.includes(movieId)); setStatus(next ? 'ready' : 'error');
      if (force) setMessage(next?.detailsSource === 'tmdb' ? 'TMDB 최신 정보를 확인했어요.' : '최신 연결이 어려워 저장된 정보를 유지해요.');
    } catch { if (request === generation.current) { if (!force) setStatus('error'); setMessage('정보를 받지 못했어요. 다시 시도해 주세요.'); } }
    finally { if (request === generation.current) setRefreshing(false); }
  }, [mode, movieId, ownerKey]);
  const invalidateLoads = useCallback(() => { generation.current++; }, []);
  useEffect(() => { if (sessionStatus !== 'ready') return; const timer = setTimeout(() => { setMessage(''); void load(); }, 0); return () => { clearTimeout(timer); invalidateLoads(); }; }, [invalidateLoads, load, sessionStatus]);
  useEffect(() => {
    let active = true; const timer = setTimeout(() => {
      setReviews([]); setCommunityError(false);
      if (mode === 'supabase') void listPublicReviewFeed(null, null, 50).then(items => { if (active) setReviews(items.filter(item => item.movieId === movieId)); }).catch(() => { if (active) setCommunityError(true); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [email, mode, movieId]);
  async function toggleWanted() {
    if (!movie || actionLock.current) return;
    if (mode !== 'supabase' || movie.detailsSource === 'demo') { setMessage('실제 계정과 영화 서버 연결 후 보고 싶어요를 저장할 수 있어요.'); return; }
    actionLock.current = true; setSaving(true);
    const request = generation.current;
    try { await setWantToWatch(movie.id, !wanted); if (request === generation.current) { setWanted(!wanted); setMessage(wanted ? '보고 싶어요에서 삭제했어요.' : '보고 싶어요에 저장했어요.'); } }
    catch { if (request === generation.current) setMessage('저장하지 못했어요. 다시 눌러 주세요.'); }
    finally { actionLock.current = false; setSaving(false); }
  }
  function record() {
    if (!movie) return;
    if (mode === 'none') { router.push('/welcome'); return; }
    if (mode === 'supabase' && movie.detailsSource === 'demo') { setMessage('예시 영화는 실제 계정에 저장할 수 없어요. 서버 연결 후 다시 시도해 주세요.'); return; }
    if (mode === 'supabase') void trackProductEvent('record_start', 'movie', movie.id, { surface: 'movie_detail', source: 'movie' });
    launch({ movieId: movie.id, title: movie.title });
  }
  if (status === 'loading' || loadedFor !== ownerKey) return <ExploreFrame standalone><View style={{ padding: 40, gap: 12 }}><ActivityIndicator color="#F8233C" /><Text style={ui.body}>영화 정보를 불러오고 있어요.</Text></View></ExploreFrame>;
  if (!movie || status === 'error') return <ExploreFrame standalone><View style={{ paddingTop: 90 }}><ExploreMessage title="영화를 찾지 못했어요" onRetry={() => void load()}>검색에서 다른 영화를 선택해 주세요.</ExploreMessage><View style={{ padding: 21 }}><ExploreButton label="영화 검색" onPress={() => router.replace('/search')} /></View></View></ExploreFrame>;
  const related = relatedMovies(data.movies, movie, 8), light = reviews.filter(item => item.mode === 'light'), core = reviews.filter(item => item.mode === 'core'), points = appreciationPoints(movie), tags = movieTags(movie);
  const openReview = (review: PublicReviewCard) => router.push({ pathname: '/review/[id]', params: { id: review.reviewId } });
  const reviewRail = (items: PublicReviewCard[], magazine: boolean) => <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 21, gap: 8 }}>{items.length ? items.slice(0, 6).map(item => <Pressable accessibilityRole="button" accessibilityLabel={`${item.authorDisplayName}님의 ${magazine ? '매거진' : '리뷰'} 보기`} onPress={() => openReview(item)} key={item.reviewId} style={[styles.review, { width: magazine ? 239 : Math.min(281, width - 42) }]}>
    {magazine ? item.coreCover ? <CorePhoto path={item.coreCover} label="매거진 표지" style={{ height: 119, width: 239 }} /> : <View style={{ height: 119, backgroundColor: '#F3F4F6', justifyContent: 'center', padding: 16 }}><Text style={ui.small}>{item.movieTitle}</Text></View> : null}
    <View style={{ padding: magazine ? 10 : 18, gap: 8 }}><View style={ui.row}><View style={styles.avatar}><Text style={[ui.small, { color: '#F8233C' }]}>{item.authorDisplayName.slice(0, 1)}</Text></View><View style={{ flex: 1 }}><Text style={[ui.title, { fontSize: 13 }]} numberOfLines={1}>{item.authorDisplayName}</Text>{!magazine ? <Text style={ui.small}>★ {item.rating?.toFixed(1) ?? '—'} / 5</Text> : null}</View></View><Text style={ui.body} numberOfLines={magazine ? 1 : 2}>{item.spoiler ? '스포일러 포함 · 상세에서 확인' : item.oneLine || item.bodyExcerpt || '키워드로 남긴 감상'}</Text>{!item.spoiler ? <ExploreChips values={item.representativeKeywords?.slice(0, 4) ?? []} small /> : null}{!magazine ? <View style={ui.row}><DesignVector name="exploreHeart" width={14.6667} /><Text style={ui.small}>{item.likeCount}</Text><DesignVector name="exploreComment" width={14.0053} /><Text style={ui.small}>{item.commentCount}</Text></View> : null}</View>
  </Pressable>) : <View style={[ui.message, { marginHorizontal: 0, width: Math.min(360, width - 42) }]}><Text style={ui.body}>{mode !== 'supabase' ? '실제 계정에서 공개된 감상을 볼 수 있어요.' : communityError ? '공개된 감상을 불러오지 못했어요.' : '최근 공개 기록에서 이 영화의 감상을 아직 찾지 못했어요.'}</Text></View>}</ScrollView>;
  return <ExploreFrame standalone><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
    <View style={{ height: 409 * scale, overflow: 'hidden', backgroundColor: '#352A26' }}>
      {movie.posterPath ? <Image accessible={false} source={{ uri: `https://image.tmdb.org/t/p/w500${movie.posterPath}` }} blurRadius={40} style={{ position: 'absolute', left: -20, top: -20, width: width + 60, height: 440 * scale, opacity: .55 }} /> : null}
      <Svg width={width} height={409 * scale} style={StyleSheet.absoluteFill}><Defs><LinearGradient id="movie-fade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#000000" stopOpacity=".1" /><Stop offset=".8" stopColor="#000000" stopOpacity=".25" /><Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#movie-fade)" /></Svg>
      <View style={{ marginTop: 93 * scale, marginHorizontal: 21 * scale, height: 22.5 * scale }}><DesignVector name="exploreDetailToolbar" width={359.066 * scale} /><View style={[StyleSheet.absoluteFill, ui.row, { justifyContent: 'space-between' }]}><Pressable accessibilityRole="button" accessibilityLabel="영화 목록으로 돌아가기" onPress={() => router.canGoBack() ? router.back() : router.replace('/search')} style={{ width: 40, minHeight: 44, marginTop: -10 }} /><View style={ui.row}><Pressable accessibilityRole="button" accessibilityLabel={wanted ? '보고 싶어요 취소' : '보고 싶어요 저장'} accessibilityState={{ selected: wanted, disabled: saving }} disabled={saving} onPress={() => void toggleWanted()} style={{ width: 33, minHeight: 44, marginTop: -10 }}>{wanted ? <Text style={{ color: '#FFFFFF' }}>✓</Text> : null}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="영화 공유" onPress={() => { void Share.share({ message: `${movie.title} · FLICK\nhttps://flick-film-journal--beta.expo.app/movie/${encodeURIComponent(movie.id)}` }).catch(() => setMessage('공유를 지원하지 않는 환경이에요. 영화 제목으로 검색해 주세요.')); }} style={{ width: 33, minHeight: 44, marginTop: -10 }} /></View></View></View>
      <View style={{ flexDirection: 'row', gap: 27 * scale, marginHorizontal: 21 * scale, marginTop: 39.5 * scale }}><ExplorePoster movie={movie} width={140 * scale} height={200 * scale} /><View style={{ flex: 1, minWidth: 0, paddingTop: 10 * scale, gap: 8 * scale }}><Text numberOfLines={2} style={{ ...ui.title, color: '#FFFFFF', fontSize: 30 * scale, lineHeight: 33 * scale }}>{movie.title}</Text><Text numberOfLines={2} style={[ui.small, { color: '#FFFFFF', fontSize: 13 * scale, lineHeight: 15 * scale }]}>{movie.originalTitle ?? ''}</Text><View style={{ marginTop: 10 * scale }}><Text style={[ui.small, { color: '#FFFFFF', fontSize: 12 * scale }]}>{yearOf(movie)} · {movie.runtime ? `${movie.runtime}분` : '상영시간 미상'}</Text><Text style={[ui.small, { color: '#FFFFFF', fontSize: 12 * scale }]} numberOfLines={2}>{movie.genres.join(' / ')}</Text></View><MovieRating movie={movie} light /></View></View>
    </View>
    <View style={{ paddingHorizontal: 21, marginTop: 24, flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><ExploreButton label="리뷰 작성하기" onPress={record} /></View><View style={{ flex: 1 }}><ExploreButton label={wanted ? '✓ 보고 싶어요' : '보고 싶어요'} icon={wanted ? undefined : 'exploreAdd'} secondary busy={saving} onPress={() => void toggleWanted()} /></View></View>
    {message ? <Text accessibilityRole="alert" style={[ui.caption, { marginTop: 14 }]}>{message}</Text> : null}
    <View style={{ marginHorizontal: 21, marginTop: 34, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, padding: 17, gap: 12 }}><Text style={[ui.title, { fontWeight: '700' }]}>이 영화가 추천된 이유</Text><Text style={[ui.body, { fontSize: 13 }]}>{exploreReason(movie, preferences.ids)}</Text><ExploreChips values={tags.slice(0, 4)} active={tags[0]} small /><Text style={[ui.small, { fontSize: 10 }]}>TMDB 평점 5점 환산 · FLICK 사용자 평점과는 달라요.</Text></View>
    <ExploreSection title="한눈에 보는 키워드" onMore={() => setDialog('keywords')} style={{ marginTop: 32 }}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 21 }}><ExploreChips values={tags} onPress={tag => router.push(`/explore-list?tag=${encodeURIComponent(tag)}` as Href)} /></ScrollView></ExploreSection>
    <ExploreSection title="작품 소개" onMore={() => setDialog('about')} style={{ marginTop: 34 }}><Text style={[ui.body, { paddingHorizontal: 21 }]} numberOfLines={2}>{movie.overview || '작품 소개 정보가 아직 없어요.'}</Text></ExploreSection>
    <ExploreSection title="감상 포인트" onMore={() => setDialog('points')} style={{ marginTop: 28 }}><View style={styles.points}>{points.map((point, i) => <View style={[ui.row, { alignItems: 'flex-start', gap: 12 }]} key={point}><View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}><DesignVector name="explorePoint" width={24} style={StyleSheet.absoluteFill} /><Text style={{ ...ui.small, color: '#FFFFFF', fontWeight: '600' }}>{i + 1}</Text></View><Text style={[ui.body, { flex: 1 }]}>{point}</Text></View>)}</View><Text style={ui.caption}>장르·키워드 기반 감상 가이드 · 영화 내용에 대한 AI 분석은 아니에요.</Text></ExploreSection>
    <ExploreSection title="플리커 리뷰" onMore={() => setDialog('reviews')} style={{ marginTop: 33 }}>{reviewRail(light, false)}</ExploreSection>
    <ExploreSection title="플리커 매거진" onMore={() => setDialog('magazines')} style={{ marginTop: 33 }}>{reviewRail(core, true)}</ExploreSection>
    <ExploreSection title="이 영화가 좋았다면" onMore={() => setDialog('keywords')} style={{ marginTop: 33 }}><View style={{ paddingHorizontal: 21, gap: 12 }}>{related.slice(0, 3).map(item => <ExploreMovieRow key={item.id} movie={item} ids={movie.recommendationKeywords} compact />)}{!related.length ? <Text style={ui.body}>비슷한 영화 정보를 아직 불러오지 못했어요.</Text> : null}</View></ExploreSection>
    <View style={{ padding: 21, gap: 12 }}><ExploreButton label="내 컬렉션에 담기" secondary onPress={() => mode === 'supabase' && movie.detailsSource !== 'demo' ? router.push(`/collections?movieId=${encodeURIComponent(movie.id)}&title=${encodeURIComponent(movie.title)}` as Href) : setMessage('실제 계정과 영화 서버 연결 후 컬렉션에 담을 수 있어요.')} /><ExploreButton label="감독·출연·한국 OTT 정보" secondary onPress={() => setDialog('details')} /><Text style={ui.small}>영화 데이터: TMDB · OTT: JustWatch</Text></View>
  </ScrollView>{dialog ? <ExploreDialog title={{ about: '작품 소개', points: '감상 포인트', keywords: '키워드·연관 영화', reviews: '플리커 리뷰', magazines: '플리커 매거진', details: '영화 상세 정보' }[dialog]} onClose={() => setDialog(null)}><View style={{ gap: 14, paddingVertical: 10 }}>{dialog === 'about' ? <Text style={ui.body}>{movie.overview || '작품 소개가 없어요.'}</Text> : dialog === 'points' ? <><Text style={ui.small}>장르·키워드 기반 가이드예요. 작품의 사실을 새로 생성하지 않아요.</Text>{points.map(point => <Text key={point} style={ui.body}>{point}</Text>)}</> : dialog === 'keywords' ? <><ExploreChips values={tags} />{related.map(item => <ExploreMovieRow movie={item} ids={movie.recommendationKeywords} key={item.id} compact />)}</> : dialog === 'reviews' || dialog === 'magazines' ? <><Text style={ui.small}>최근 공개 완료 기록 최대50개 중 이 영화에 해당하는 감상이에요. 전체 기록 수가 아니에요.</Text>{(dialog === 'reviews' ? light : core).map(item => <ExploreButton key={item.reviewId} label={`${item.authorDisplayName}님의 기록`} secondary onPress={() => { setDialog(null); openReview(item); }} />)}{!(dialog === 'reviews' ? light : core).length ? <Text style={ui.body}>표시할 공개 감상이 없어요.</Text> : null}</> : <><Text style={ui.body}>감독 · {movie.details?.directorNames.join(', ') || '정보 없음'}</Text><Text style={ui.body}>출연 · {movie.details?.cast.slice(0, 6).map(person => person.name).join(', ') || '정보 없음'}</Text><Text style={ui.body}>제작사 · {movie.details?.productionCompanies.join(', ') || '정보 없음'}</Text><Text style={ui.body}>한국 OTT · {movie.details ? [...new Set([...movie.details.watchProviders.stream, ...movie.details.watchProviders.rent, ...movie.details.watchProviders.buy])].join(', ') || '제공 정보 없음' : '상세 정보 수집 대기'}</Text><Text style={ui.small}>OTT 제공 여부·구독/대여 조건은 제공처에서 다시 확인해 주세요.</Text><ExploreButton label="상세 정보 다시 확인" secondary busy={refreshing} onPress={() => { setRefreshing(true); void load(true); }} /><ExploreButton label="데이터 출처와 크레딧" secondary onPress={() => { setDialog(null); router.push('/credits'); }} /></>}</View></ExploreDialog> : null}</ExploreFrame>;
}
const styles = StyleSheet.create({ points: { marginHorizontal: 21, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, padding: 16, gap: 12 }, review: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF', minHeight: 187 }, avatar: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#FFF5F6', alignItems: 'center', justifyContent: 'center' } });
