import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { CollectionCard } from '@/components/collection-card';
import { DiscoveryRankingsView } from '@/components/discovery-rankings';
import { EditorialCurationCard } from '@/components/editorial-curation-card';
import { PublicReviewCard } from '@/components/public-review-card';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { listPublicCollections, type CollectionSummary } from '@/features/community/collections-service';
import { listPublicReviewFeed, setReviewLiked, setReviewSaved, type PublicReviewCard as ReviewCard } from '@/features/community/community-service';
import { getDiscoveryRankings, listPublishedCurations, type DiscoveryRankings, type EditorialCuration } from '@/features/discovery/discovery-insights';
import { hasCurrentRankings } from '@/features/home/home-model';
import { useSession } from '@/features/session/session-provider';
import { colors, spacing, typography } from '@/theme/tokens';

const sections = [{ id: 'light', label: 'Light 리뷰' }, { id: 'core', label: 'Core 매거진' }, { id: 'rankings', label: '주간 랭킹' }, { id: 'curations', label: '큐레이션' }, { id: 'collections', label: '컬렉션' }] as const;
type Section = typeof sections[number]['id'];
function sectionValue(value: unknown): Section { return sections.some((section) => section.id === value) ? value as Section : 'light'; }

export default function FeedScreen() {
  const { section: sectionParam } = useLocalSearchParams<{ section?: string }>();
  const section = sectionValue(sectionParam);
  const { mode } = useSession();
  const [reviews, setReviews] = useState<ReviewCard[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [rankings, setRankings] = useState<DiscoveryRankings | null>(null);
  const [curations, setCurations] = useState<EditorialCuration[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (mode !== 'supabase') return;
    setStatus('loading');
    try {
      if (section === 'light' || section === 'core') setReviews(await listPublicReviewFeed(section, null, 20));
      else if (section === 'collections') setCollections(await listPublicCollections(20));
      else if (section === 'rankings') setRankings(await getDiscoveryRankings());
      else setCurations(await listPublishedCurations(20));
      setStatus('ready');
    } catch { setStatus('error'); }
  }, [mode, section]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const toggleReviewLike = async (review: ReviewCard) => {
    if (busyReviewId) return;
    setBusyReviewId(review.reviewId);
    try { await setReviewLiked(review.reviewId, !review.viewerLiked); await load(); }
    catch { setMessage('공감하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setBusyReviewId(null); }
  };
  const toggleReviewSave = async (review: ReviewCard) => {
    if (busyReviewId) return;
    setBusyReviewId(review.reviewId);
    try { await setReviewSaved(review.reviewId, !review.viewerSaved); await load(); }
    catch { setMessage('저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setBusyReviewId(null); }
  };

  return <Screen eyebrow="FLICK COMMUNITY" title="플리커의 영화 이야기">
    <View style={styles.filters}>{sections.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item.id === section }} key={item.id} onPress={() => router.setParams({ section: item.id })} style={[styles.filter, section === item.id && styles.selected]}><Text style={[styles.filterText, section === item.id && styles.selectedText]}>{item.label}</Text></Pressable>)}</View>
    <Button label="내 기록과 보고 싶어요 보관함" onPress={() => router.push('/archive' as Href)} variant="secondary" />
    {mode !== 'supabase' ? <><StateNotice title="로그인 후 함께 나눠요" message="실제 공개 리뷰와 컬렉션은 이메일 계정으로 로그인하면 볼 수 있어요. 데모 예시는 커뮤니티 데이터에 반영되지 않습니다." /><Button label="로그인하기" onPress={() => router.push('/welcome')} /></> : <>
      {message ? <StateNotice title="확인해 주세요" message={message} /> : null}
      {status === 'loading' ? <ActivityIndicator color={colors.primary} /> : null}
      {status === 'error' ? <><StateNotice title="피드를 불러오지 못했어요" message="잠시 후 다시 시도해 주세요." tone="warning" /><Button label="다시 불러오기" onPress={() => void load()} /></> : null}
      {status === 'ready' && (section === 'light' || section === 'core') ? <><Text style={styles.heading}>{section === 'light' ? '가볍게 기록한 리뷰' : '집중 기록 매거진'}</Text>{reviews.length ? reviews.map((review) => <PublicReviewCard review={review} key={review.reviewId} busy={Boolean(busyReviewId)} onLike={(item) => void toggleReviewLike(item)} onSave={(item) => void toggleReviewSave(item)} />) : <StateNotice title="첫 공개 기록을 기다리고 있어요" message="나만 보기는 이곳에 표시되지 않아요. 기록할 때 전체 공개를 선택하면 함께 감상을 나눌 수 있어요." />}</> : null}
      {status === 'ready' && section === 'rankings' ? hasCurrentRankings(rankings) ? <DiscoveryRankingsView rankings={rankings} /> : <StateNotice title="이번 주 랭킹을 준비하고 있어요" message="최근 7일 공개 완료 기록이 5편 이상 모이고 운영 집계를 갱신하면 순위가 표시돼요. 오래된 집계는 이번 주 순위로 표시하지 않습니다." /> : null}
      {status === 'ready' && section === 'curations' ? <><Text style={styles.heading}>상황별 편집 큐레이션</Text>{curations.length ? curations.map((curation) => <EditorialCurationCard curation={curation} key={curation.curationId} />) : <StateNotice title="큐레이션 준비 중" message="선정 이유와 출처·게시 권한을 확인한 콘텐츠만 공개합니다." />}</> : null}
      {status === 'ready' && section === 'collections' ? <>{collections.length ? collections.map((collection) => <CollectionCard collection={collection} key={collection.collectionId} />) : <StateNotice title="공개 컬렉션이 없어요" message="좋아하는 영화를 묶어 첫 컬렉션을 만들어 보세요." />}<Button label="내 컬렉션 만들기·관리" onPress={() => router.push('/collections' as Href)} variant="secondary" /></> : null}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: { minHeight: 40, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, justifyContent: 'center' },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.caption, color: colors.textMuted },
  selectedText: { color: colors.surface },
  heading: { ...typography.heading, color: colors.text },
});
