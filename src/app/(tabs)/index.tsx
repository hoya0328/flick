import { type Href, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { HomeExpertCard, HomeMagazineCard, HomeReviewCard, previewKeywords, previewMovies } from '@/components/home-content-cards';
import { HomeIcon, HomeInfoDialog, HomePicture, HomeRail, HomeSection, homeFont, homeText, homeTheme } from '@/components/home-ui';
import { PosterPreferenceDeck } from '@/components/poster-preference-deck';
import { StateNotice } from '@/components/state-notice';
import { listPublicReviewFeed, setReviewLiked, type PublicReviewCard as ReviewCard } from '@/features/community/community-service';
import { discoverMovies, type DiscoveryResult, setWantToWatch } from '@/features/discovery/movies';
import { getDiscoveryRankings, listPublishedCurations, type DiscoveryRankings, type EditorialCuration } from '@/features/discovery/discovery-insights';
import { homeAssets } from '@/features/home/design-assets';
import { hasCurrentRankings, keywordRows, movieRating } from '@/features/home/home-model';
import { getKeywordLabels } from '@/features/onboarding/keywords';
import { useSession } from '@/features/session/session-provider';

export default function HomeScreen() {
  const { mode, selectedKeywords } = useSession();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 560);
  const reviewWidth = Math.min(contentWidth - 42, 359);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [communityStatus, setCommunityStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [lightReviews, setLightReviews] = useState<ReviewCard[]>([]);
  const [coreReviews, setCoreReviews] = useState<ReviewCard[]>([]);
  const [rankings, setRankings] = useState<DiscoveryRankings | null>(null);
  const [curations, setCurations] = useState<EditorialCuration[]>([]);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<{ title: string; body: string } | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setResult(await discoverMovies('', selectedKeywords));
      setStatus('ready');
    } catch { setStatus('error'); }
  }, [selectedKeywords]);

  const loadCommunity = useCallback(async () => {
    if (mode !== 'supabase') { setCommunityStatus('idle'); return; }
    setCommunityStatus('loading');
    const [light, core, discoveryRankings, publishedCurations] = await Promise.allSettled([
      listPublicReviewFeed('light', null, 6),
      listPublicReviewFeed('core', null, 6),
      getDiscoveryRankings(),
      listPublishedCurations(20),
    ]);
    if (light.status === 'fulfilled') setLightReviews(light.value);
    if (core.status === 'fulfilled') setCoreReviews(core.value);
    if (discoveryRankings.status === 'fulfilled') setRankings(discoveryRankings.value);
    if (publishedCurations.status === 'fulfilled') setCurations(publishedCurations.value);
    setCommunityStatus([light, core, discoveryRankings, publishedCurations].some((item) => item.status === 'rejected') ? 'error' : 'ready');
  }, [mode]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  useEffect(() => { const timer = setTimeout(() => void loadCommunity(), 0); return () => clearTimeout(timer); }, [loadCommunity]);

  const handleLike = async (movieId: string) => {
    if (mode !== 'supabase') {
      setInfo({ title: '보고 싶어요', body: '이메일 계정으로 로그인하면 마음에 드는 영화를 내 보관함에 저장할 수 있어요.' });
      return;
    }
    try {
      await setWantToWatch(movieId, true);
      setActionMessage('보고 싶어요에 저장했어요. 마이 → 나의 아카이브에서 확인할 수 있어요.');
    } catch { setActionMessage('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
  };

  const toggleReviewLike = async (review: ReviewCard) => {
    if (busyReviewId) return;
    setBusyReviewId(review.reviewId);
    try {
      await setReviewLiked(review.reviewId, !review.viewerLiked);
      const update = (items: ReviewCard[]) => items.map((item) => item.reviewId === review.reviewId ? { ...item, viewerLiked: !item.viewerLiked, likeCount: Math.max(0, item.likeCount + (item.viewerLiked ? -1 : 1)) } : item);
      setLightReviews(update);
      setCoreReviews(update);
    } catch { setActionMessage('공감을 반영하지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusyReviewId(null); }
  };

  const preview = (title: string) => setInfo({ title, body: '디자이너가 제공한 화면 구성 예시입니다. 실제 사용자의 리뷰나 게시가 승인된 전문가 원문이 아니므로 공감·댓글·저장에는 반영되지 않아요. 공개 콘텐츠가 등록되면 실제 기록으로 바뀝니다.' });
  const openFeed = (section: string) => router.push({ pathname: '/feed' as Href, params: { section } } as Href);
  const currentRankings = hasCurrentRankings(rankings);
  const rankedMovies = currentRankings ? rankings.movies.slice(0, 10) : [];
  const keywordItems = currentRankings ? rankings.keywords.slice(0, 10) : [];
  const recommendedMovies = result?.source === 'demo' ? [] : result?.movies.slice(0, 10) ?? [];
  const experts = curations.filter((curation) => curation.kind === 'expert');
  const rankCaption = mode === 'demo' ? '데모 · 집계 전에는 실제 주간 순위를 표시하지 않아요.' : result?.source === 'demo' ? '영화 서버 연결 대기 중 · 아래는 디자인 예시입니다.' : !currentRankings ? '주간 집계 준비 중 · 지금은 취향 추천을 보여드려요.' : undefined;

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.page} testID="figma-home">
        <View style={styles.header}>
          <Image accessibilityLabel="FLICK 심볼" source={homeAssets.symbol} style={styles.symbol} />
          <Image accessibilityLabel="FLICK" accessibilityRole="header" resizeMode="contain" source={homeAssets.wordmark} style={styles.wordmark} />
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="알림" onPress={() => setInfo({ title: '알림', body: '새 알림이 없습니다. 알림 수신 기능은 준비 중이에요.' })} style={styles.headerButton}><HomeIcon name="bell" width={23} height={25} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="메시지" onPress={() => setInfo({ title: '메시지', body: '메시지 기능은 준비 중이에요. 지금은 공개 리뷰의 댓글로 감상을 나눌 수 있어요.' })} style={styles.headerButton}><HomeIcon name="message" width={27} height={25} /></Pressable>
          </View>
        </View>

        <PosterPreferenceDeck movies={result?.source === 'demo' ? [] : result?.movies.slice(0, 5) ?? []} onLike={(movie) => void handleLike(movie.id)} />
        {status === 'loading' ? <View style={styles.loading}><ActivityIndicator color={homeTheme.accent} /><Text style={homeText.muted}>취향에 맞는 영화를 고르고 있어요.</Text></View> : null}
        {status === 'error' ? <View style={styles.notice}><StateNotice title="영화를 불러오지 못했어요" message="네트워크를 확인한 뒤 다시 시도해 주세요." tone="warning" /><Button label="영화 다시 불러오기" onPress={() => void load()} variant="secondary" /></View> : null}
        {actionMessage ? <Pressable accessibilityRole="button" accessibilityLabel="안내 닫기" onPress={() => setActionMessage(null)} style={styles.notice}><Text accessibilityLiveRegion="polite" style={homeText.body}>{actionMessage} ×</Text></Pressable> : null}

        <HomeSection title={<>이번 주 <Text style={homeText.accent}>플리커</Text> Top 10 영화</>} moreLabel="주간 영화 랭킹 더보기" onMore={() => openFeed('rankings')} caption={rankCaption}>
          <HomeRail label="이번 주 영화, 가로로 스크롤">
            {rankedMovies.length ? rankedMovies.map((movie) => <Pressable accessibilityRole="button" accessibilityLabel={`${movie.rank}위 ${movie.title}, 최근 공개 리뷰 ${movie.score}편`} key={movie.movieId} onPress={() => router.push(`/movie/${movie.movieId}` as Href)} style={styles.movieCard}>
              <HomePicture source={movie.posterPath ? { uri: `https://image.tmdb.org/t/p/w500${movie.posterPath}` } : null} label={movie.title} width={140} height={200} />
              <View style={styles.rank}><Text style={styles.rankText}>{movie.rank}</Text></View>
              <Text numberOfLines={1} style={homeText.title}>{movie.title}</Text>
              <Text style={homeText.muted}>공개 리뷰 {movie.score}편</Text>
            </Pressable>) : recommendedMovies.length ? recommendedMovies.map((movie) => <Pressable accessibilityRole="button" accessibilityLabel={`${movie.title} 영화 상세 보기`} key={movie.id} onPress={() => router.push(`/movie/${movie.id}` as Href)} style={styles.movieCard}>
              <HomePicture source={movie.posterPath ? { uri: `https://image.tmdb.org/t/p/w500${movie.posterPath}` } : null} label={movie.title} width={140} height={200} />
              <Text numberOfLines={1} style={homeText.title}>{movie.title}</Text>
              <View style={styles.rating}><HomeIcon name="star" width={18} /><Text style={homeText.body}>{movieRating(movie)}</Text></View>
              <View style={styles.movieTags}>{(getKeywordLabels(movie.recommendationKeywords).slice(0, 2).length ? getKeywordLabels(movie.recommendationKeywords).slice(0, 2) : movie.genres.slice(0, 2)).map((tag) => <View style={styles.movieTag} key={tag}><Text style={styles.movieTagText}>{tag}</Text></View>)}</View>
            </Pressable>) : previewMovies.map((movie) => <Pressable accessibilityRole="button" accessibilityLabel={`${movie.title} 디자인 예시, 검색`} key={movie.title} onPress={() => router.push({ pathname: '/search', params: { query: movie.title } })} style={styles.movieCard}>
              <HomePicture source={movie.image} label={movie.title} width={140} height={200} />
              <Text numberOfLines={1} style={homeText.title}>{movie.title}</Text>
              <View style={styles.rating}><HomeIcon name="star" width={18} /><Text style={homeText.body}>{movie.rating}</Text><Text style={styles.example}>예시</Text></View>
              <View style={styles.movieTags}>{movie.tags.map((tag) => <View style={styles.movieTag} key={tag}><Text style={styles.movieTagText}>{tag}</Text></View>)}</View>
            </Pressable>)}
          </HomeRail>
        </HomeSection>

        <HomeSection title={<>이번 주 <Text style={homeText.accent}>플리커</Text> 키워드</>} moreLabel="주간 키워드 더보기" onMore={() => openFeed('rankings')}>
          <HomeRail label="플리커 키워드 두 줄, 가로로 스크롤">
            <View style={styles.keywordRows}>{keywordRows(keywordItems.length ? keywordItems : previewKeywords.map((label) => ({ key: label, label, score: 0 }))).map((row, index) => <View key={index} style={styles.keywordRow}>{row.map((keyword, itemIndex) => <Pressable accessibilityRole="button" accessibilityLabel={`${keyword.label} 키워드 ${keywordItems.length ? keyword.score + '회 선택' : '디자인 예시'}`} key={keyword.key} onPress={() => setInfo({ title: keyword.label, body: keywordItems.length ? `최근 7일 공개 완료 기록에서 ${keyword.score}회 선택됐어요. 영화 탐색 화면에서 감정과 분위기에 맞는 영화를 찾아보세요.` : '주간 키워드를 집계할 공개 기록이 더 필요해요. 지금 보이는 키워드는 디자인 예시이며 사용 횟수는 만들지 않습니다.' })} style={[styles.keyword, index === 0 && styles.keywordPrimary]}><Text style={[styles.keywordLabel, index === 0 && styles.keywordLight]}>{keyword.label}</Text><Text style={[styles.keywordCount, index === 0 && styles.keywordLight]}>{keywordItems.length ? keyword.score.toLocaleString('ko-KR') : itemIndex === 0 ? '예시' : '—'}</Text></Pressable>)}</View>)}</View>
          </HomeRail>
        </HomeSection>

        {communityStatus === 'loading' ? <View style={styles.loading}><ActivityIndicator color={homeTheme.accent} /><Text style={homeText.muted}>공개된 기록을 불러오고 있어요.</Text></View> : null}
        {communityStatus === 'error' ? <View style={styles.notice}><Text style={homeText.muted}>일부 공개 콘텐츠를 불러오지 못했어요. 예시 카드는 별도로 표시합니다.</Text><Button label="공개 콘텐츠 다시 불러오기" onPress={() => void loadCommunity()} variant="secondary" /></View> : null}

        <HomeSection title={<>다른 <Text style={homeText.accent}>플리커</Text>들은 이렇게 봤어요</>} moreLabel="Light 리뷰 더보기" onMore={() => openFeed('light')}>
          <HomeRail label="가볍게 기록한 리뷰, 가로로 스크롤">
            {lightReviews.length ? lightReviews.map((review) => <HomeReviewCard review={review} width={reviewWidth} busy={Boolean(busyReviewId)} key={review.reviewId} onLike={(item) => void toggleReviewLike(item)} onPreview={preview} />) : <HomeReviewCard width={reviewWidth} onLike={(item) => void toggleReviewLike(item)} onPreview={preview} />}
          </HomeRail>
        </HomeSection>

        <HomeSection title={<>이번 주 <Text style={homeText.accent}>플리커</Text> 매거진</>} moreLabel="Core 매거진 더보기" onMore={() => openFeed('core')}>
          <HomeRail label="집중 기록 매거진, 가로로 스크롤">
            {coreReviews.length ? coreReviews.map((review) => <HomeMagazineCard review={review} key={review.reviewId} onPreview={preview} />) : <><HomeMagazineCard onPreview={preview} /><HomeMagazineCard alternate onPreview={preview} /></>}
          </HomeRail>
        </HomeSection>

        <HomeSection title="전문가의 시선에서 바라보기" onMore={() => openFeed('curations')}>
          <HomeRail label="전문가 매거진, 가로로 스크롤">
            {experts.length ? experts.map((curation) => <HomeExpertCard curation={curation} key={curation.curationId} onPreview={preview} />) : [0, 1, 2].map((index) => <HomeExpertCard exampleIndex={index} key={index} onPreview={preview} />)}
          </HomeRail>
        </HomeSection>

        <HomeSection title="쉬어가는 팝콘 타임">
          <View style={styles.gameWrap}>
            <View style={[styles.game, Platform.OS === 'web' && { backgroundImage: 'linear-gradient(0deg, #F8233C 55%, #B2192B 150%)' } as ViewStyle]}>
              <Text style={styles.gameText}>이모티콘으로 영화 맞추고{ '\n' }<Text style={styles.hiddenBlock}>히든 블록</Text> 수집하기</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="이모지로 영화 맞히기 플레이" onPress={() => router.push('/emoji-quiz' as Href)} style={styles.play}><Text style={styles.playText}>플레이</Text></Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/experiments' as Href)} style={styles.blockLink}><Text style={homeText.muted}>히든 블록 수집은 영화 취향 실험실에서 ›</Text></Pressable>
          </View>
        </HomeSection>
        <HomeInfoDialog info={info} onClose={() => setInfo(null)} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#FFFFFF', flex: 1 },
  scroll: { flexGrow: 1 },
  page: { alignSelf: 'center', backgroundColor: '#FFFFFF', maxWidth: 560, width: '100%', paddingTop: 28, paddingBottom: 40, overflow: 'hidden' },
  header: { marginHorizontal: 21, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  symbol: { width: 28, height: 28 },
  wordmark: { position: 'absolute', width: 116.4, height: 22, left: '50%', marginLeft: -58.2 },
  headerActions: { flexDirection: 'row', gap: 0 },
  headerButton: { minWidth: 36, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  notice: { marginHorizontal: 21, padding: 12, borderRadius: 12, backgroundColor: '#FFF5F6', gap: 8, marginTop: 12 },
  movieCard: { width: 140, gap: 5, position: 'relative' },
  rank: { position: 'absolute', left: 12, top: 12, width: 23, height: 23, borderRadius: 12, backgroundColor: homeTheme.accent, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#FFFFFF', fontFamily: homeFont, fontSize: 15, fontWeight: '700' },
  rating: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  example: { color: homeTheme.muted, fontSize: 10, marginLeft: 'auto' },
  movieTags: { flexDirection: 'row', gap: 4, minHeight: 23 },
  movieTag: { backgroundColor: homeTheme.subtle, borderRadius: 11.5, paddingHorizontal: 8, minHeight: 23, justifyContent: 'center', flexShrink: 1 },
  movieTagText: { color: '#6A7282', fontSize: 11, lineHeight: 17, fontFamily: homeFont },
  keywordRows: { gap: 8.5 },
  keywordRow: { flexDirection: 'row', gap: 8 },
  keyword: { borderColor: '#D9D9D9', borderWidth: 1, borderRadius: 18, minHeight: 35, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11 },
  keywordPrimary: { backgroundColor: homeTheme.accent, borderColor: homeTheme.accent },
  keywordLabel: { fontSize: 15, color: homeTheme.ink, fontFamily: homeFont, fontWeight: '500' },
  keywordCount: { fontSize: 13, color: '#888888', fontFamily: homeFont },
  keywordLight: { color: '#FFFFFF' },
  gameWrap: { marginHorizontal: 21, gap: 10 },
  game: { height: 188, backgroundColor: homeTheme.accent, borderRadius: 20, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 35, gap: 14 },
  gameText: { color: '#FFFFFF', fontFamily: homeFont, fontSize: 20, fontWeight: '600', lineHeight: 25, textAlign: 'center', letterSpacing: -0.2 },
  hiddenBlock: { color: '#730002', fontWeight: '700' },
  play: { backgroundColor: '#FFFFFF', minHeight: 37, minWidth: 114, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  playText: { color: '#000000', fontSize: 20, lineHeight: 25, fontWeight: '600', fontFamily: homeFont },
  blockLink: { alignItems: 'center', justifyContent: 'center', minHeight: 36 },
});
