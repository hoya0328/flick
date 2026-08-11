import { type Href, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { CollectionCard } from '@/components/collection-card';
import { DiscoveryRankingsView } from '@/components/discovery-rankings';
import { EditorialCurationCard } from '@/components/editorial-curation-card';
import { MovieCard } from '@/components/movie-card';
import { PosterPreferenceDeck } from '@/components/poster-preference-deck';
import { PublicReviewCard } from '@/components/public-review-card';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { listPublicCollections, type CollectionSummary } from '@/features/community/collections-service';
import { listPublicReviewFeed, setReviewLiked, setReviewSaved, type PublicReviewCard as ReviewCard } from '@/features/community/community-service';
import { discoverMovies, type DiscoveryResult, recommendationReason, setWantToWatch } from '@/features/discovery/movies';
import { getDiscoveryRankings, listPublishedCurations, type DiscoveryRankings, type EditorialCuration } from '@/features/discovery/discovery-insights';
import { getKeywordLabels } from '@/features/onboarding/keywords';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  const { mode, selectedKeywords } = useSession();
  const labels = getKeywordLabels(selectedKeywords);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [communityStatus, setCommunityStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [lightReviews, setLightReviews] = useState<ReviewCard[]>([]);
  const [coreReviews, setCoreReviews] = useState<ReviewCard[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [rankings, setRankings] = useState<DiscoveryRankings | null>(null);
  const [curations, setCurations] = useState<EditorialCuration[]>([]);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setResult(await discoverMovies('', selectedKeywords));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [selectedKeywords]);

  const loadCommunity = useCallback(async () => {
    if (mode !== 'supabase') { setCommunityStatus('idle'); return; }
    setCommunityStatus('loading');
    try {
      const [light, core, publicCollections, discoveryRankings, publishedCurations] = await Promise.all([
        listPublicReviewFeed('light', null, 4),
        listPublicReviewFeed('core', null, 4),
        listPublicCollections(4),
        getDiscoveryRankings(),
        listPublishedCurations(4),
      ]);
      setLightReviews(light);
      setCoreReviews(core);
      setCollections(publicCollections);
      setRankings(discoveryRankings);
      setCurations(publishedCurations);
      setCommunityStatus('ready');
    } catch {
      setCommunityStatus('error');
    }
  }, [mode]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => void loadCommunity(), 0);
    return () => clearTimeout(timer);
  }, [loadCommunity]);

  const handleLike = async (movieId: string) => {
    if (mode !== 'supabase') {
      setActionMessage('보고 싶어요 저장은 이메일 계정으로 로그인하면 사용할 수 있어요.');
      return;
    }
    try {
      await setWantToWatch(movieId, true);
      setActionMessage('보고 싶어요에 저장했어요.');
    } catch {
      setActionMessage('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const toggleReviewLike = async (review: ReviewCard) => {
    setBusyReviewId(review.reviewId);
    try {
      await setReviewLiked(review.reviewId, !review.viewerLiked);
      await loadCommunity();
    } catch {
      setActionMessage('공감을 반영하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusyReviewId(null); }
  };

  const toggleReviewSave = async (review: ReviewCard) => {
    setBusyReviewId(review.reviewId);
    try {
      await setReviewSaved(review.reviewId, !review.viewerSaved);
      await loadCommunity();
    } catch {
      setActionMessage('기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusyReviewId(null); }
  };

  return (
    <Screen>
      <BrandMark compact />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>오늘의 취향 발견</Text>
        <Text style={styles.title}>지금 마음에 가까운 영화를 골라보세요</Text>
        <View style={styles.chips}>
          {labels.map((label) => <View key={label} style={styles.chip}><Text style={styles.chipText}>{label}</Text></View>)}
        </View>
      </View>

      {result?.notice ? <StateNotice message={result.notice} title="안정적인 영화 목록" tone="warning" /> : null}
      {actionMessage ? <StateNotice message={actionMessage} title="보고 싶어요" tone={actionMessage.includes('저장했어요') ? 'success' : 'info'} /> : null}

      {mode === 'supabase' ? (
        <View style={styles.community}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>다른 사람의 영화 기록</Text>
            <Text style={styles.sectionBody}>짧은 감상부터 깊은 기록까지, 공개된 글만 모았어요.</Text>
          </View>
          {communityStatus === 'loading' ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>새 기록을 불러오고 있어요.</Text></View> : null}
          {communityStatus === 'error' ? <StateNotice message="영화 추천은 계속 볼 수 있어요. 공개 기록만 다시 불러와 주세요." title="커뮤니티를 불러오지 못했어요" tone="warning" /> : null}
          {communityStatus === 'error' ? <Button label="커뮤니티 다시 불러오기" onPress={() => void loadCommunity()} variant="secondary" /> : null}
          {communityStatus === 'ready' ? <>
            <View style={styles.feedHeader}><Text style={styles.feedTitle}>최근 7일 FLICK 랭킹</Text><Text style={styles.feedCaption}>WEEKLY</Text></View>
            {rankings ? <DiscoveryRankingsView rankings={rankings} /> : null}
            <View style={styles.feedHeader}><Text style={styles.feedTitle}>상황별 편집 큐레이션</Text><Text style={styles.feedCaption}>FLICK EDIT</Text></View>
            {!curations.length ? <Text style={styles.empty}>출처와 선정 이유가 확인된 큐레이션을 준비하고 있어요.</Text> : curations.map((curation) => <EditorialCurationCard curation={curation} key={curation.curationId} />)}
            <View style={styles.feedHeader}><Text style={styles.feedTitle}>가볍게 기록한 리뷰</Text><Text style={styles.feedCaption}>LIGHT</Text></View>
            {!lightReviews.length ? <Text style={styles.empty}>첫 공개 Light 리뷰를 남겨보세요.</Text> : lightReviews.map((review) => <PublicReviewCard busy={busyReviewId === review.reviewId} key={review.reviewId} onLike={(item) => void toggleReviewLike(item)} onSave={(item) => void toggleReviewSave(item)} review={review} />)}
            <View style={styles.feedHeader}><Text style={styles.feedTitle}>집중 기록 매거진</Text><Text style={styles.feedCaption}>CORE</Text></View>
            {!coreReviews.length ? <Text style={styles.empty}>깊이 쓴 Core 기록이 공개되면 이곳에 실려요.</Text> : coreReviews.map((review) => <PublicReviewCard busy={busyReviewId === review.reviewId} key={review.reviewId} onLike={(item) => void toggleReviewLike(item)} onSave={(item) => void toggleReviewSave(item)} review={review} />)}
            <View style={styles.feedHeader}><Text style={styles.feedTitle}>사용자 영화 컬렉션</Text><Text style={styles.feedCaption}>COLLECTION</Text></View>
            {!collections.length ? <Text style={styles.empty}>아직 공개된 컬렉션이 없어요. 첫 영화 묶음을 만들어보세요.</Text> : collections.map((collection) => <CollectionCard collection={collection} key={collection.collectionId} />)}
            <Button label="내 컬렉션 만들기·관리" onPress={() => router.push('/collections' as Href)} variant="secondary" />
            <Button label="FLICK 영화 취향 실험실" onPress={() => router.push('/experiments' as Href)} variant="secondary" />
          </> : null}
        </View>
      ) : <StateNotice message="공개 리뷰와 컬렉션은 이메일 계정으로 로그인하면 볼 수 있어요." title="커뮤니티 미리보기" tone="info" />}

      {status === 'loading' ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>취향과 맞는 영화를 고르고 있어요.</Text></View> : null}
      {status === 'error' ? <StateNotice message="저장된 목록도 불러오지 못했어요." title="영화를 불러올 수 없어요" tone="danger" /> : null}
      {status === 'error' ? <Button label="다시 시도" onPress={() => void load()} variant="secondary" /> : null}

      {status === 'ready' && result?.movies.length ? (
        <>
          <PosterPreferenceDeck movies={result.movies.slice(0, 5)} onLike={(movie) => void handleLike(movie.id)} />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>취향 키워드 추천</Text>
            <Text style={styles.sectionBody}>선택한 키워드와 가까운 순서예요.</Text>
          </View>
          <View style={styles.list}>
            {result.movies.map((movie) => <MovieCard key={movie.id} movie={movie} reason={recommendationReason(movie, selectedKeywords)} />)}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, paddingTop: spacing.lg },
  eyebrow: { ...typography.label, color: colors.primary },
  title: { ...typography.title, color: colors.text, maxWidth: 430 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipText: { ...typography.label, color: colors.surface },
  loading: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.xxl },
  loadingText: { ...typography.body, color: colors.textMuted },
  sectionHeader: { gap: spacing.xs, marginTop: spacing.md },
  sectionTitle: { ...typography.heading, color: colors.text },
  sectionBody: { ...typography.caption, color: colors.textMuted },
  list: { gap: spacing.md },
  community: { gap: spacing.md },
  feedHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  feedTitle: { ...typography.heading, color: colors.text },
  feedCaption: { ...typography.caption, color: colors.primary, fontWeight: '800', letterSpacing: 1 },
  empty: { ...typography.caption, backgroundColor: colors.surface, borderRadius: radii.md, color: colors.textMuted, padding: spacing.lg },
});
