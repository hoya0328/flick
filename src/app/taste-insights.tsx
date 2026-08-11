import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { MovieCard } from '@/components/movie-card';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { discoverMovies, type Movie } from '@/features/discovery/movies';
import { buildTastePersonalization } from '@/features/reports/taste-personalization';
import { listReviews, type ReviewRecord } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const preferenceKey = 'flick.stage5.personalization-enabled';

export default function TasteInsightsScreen() {
  const { mode, selectedKeywords } = useSession();
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [contrastMovies, setContrastMovies] = useState<Movie[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const insights = useMemo(() => buildTastePersonalization(records, selectedKeywords), [records, selectedKeywords]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [stored, reviews] = await Promise.all([
        AsyncStorage.getItem(preferenceKey),
        listReviews(mode === 'supabase' ? 'supabase' : 'demo'),
      ]);
      const nextInsights = buildTastePersonalization(reviews, selectedKeywords);
      const result = nextInsights.contrastKeyword ? await discoverMovies('', [nextInsights.contrastKeyword.id]) : null;
      const watched = new Set(reviews.map((review) => review.movieId));
      setEnabled(stored !== 'false');
      setRecords(reviews);
      setContrastMovies((result?.movies ?? []).filter((movie) => !watched.has(movie.id)).slice(0, 3));
      setStatus('ready');
    } catch { setStatus('error'); }
  }, [mode, selectedKeywords]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function setPersonalization(next: boolean) {
    setEnabled(next);
    await AsyncStorage.setItem(preferenceKey, String(next));
  }

  if (status === 'loading') return <Screen eyebrow="5D · 나의 취향" title="취향 인사이트"><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>기록 속 반복 신호를 정리하고 있어요.</Text></Screen>;
  if (status === 'error') return <Screen eyebrow="5D · 나의 취향" title="취향 인사이트"><StateNotice message="기록은 변경되지 않았어요. 연결을 확인하고 다시 시도해 주세요." title="인사이트를 만들지 못했어요" tone="danger" /><Button label="다시 시도" onPress={() => void load()} /></Screen>;

  return (
    <Screen eyebrow="5D · 설명 가능한 개인화" title="나의 영화 취향 인사이트">
      <View style={styles.controlCard}>
        <Text style={styles.body}>리뷰 본문을 AI에 보내지 않고, 완료 기록의 키워드·선택 태그·별점·Light/Core 사용량만 계산합니다.</Text>
        <Button label={enabled ? '개인화 결과 숨기기' : '개인화 결과 다시 보기'} onPress={() => void setPersonalization(!enabled)} variant="secondary" />
      </View>

      {!enabled ? <StateNotice message="취향 유형과 추천을 숨겼어요. 기록과 선택값은 삭제되지 않으며 언제든 다시 볼 수 있어요." title="개인화를 사용하지 않고 있어요" tone="warning" /> : null}

      {enabled ? <>
        <View style={styles.darkCard}>
          <Text style={styles.kicker}>TASTE TYPE</Text>
          {insights.tasteType ? <><Text style={styles.darkTitle}>{insights.tasteType.name}</Text><Text style={styles.darkBody}>{insights.tasteType.summary}</Text><Text style={styles.darkEvidence}>근거 · {insights.tasteType.evidence.join(' · ')}</Text></> : <><Text style={styles.darkTitle}>아직 발견 중</Text><Text style={styles.darkBody}>완료 기록 {insights.minimumRequired}편부터 유형을 제시해요. 지금 {insights.completedCount}편이어서 {insights.minimumRequired - insights.completedCount}편이 더 필요합니다.</Text></>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>리뷰 방식별 감상 초점</Text>
          <Text style={styles.muted}>각 막대는 기록에서 직접 선택한 태그의 횟수입니다.</Text>
          {insights.signalInsights.map((item) => {
            const maximum = Math.max(1, ...insights.signalInsights.map((signal) => signal.value));
            return <View key={item.label} style={styles.signal}><View style={styles.signalHeader}><Text style={styles.label}>{item.label}</Text><Text style={styles.muted}>{item.value}회</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${(item.value / maximum) * 100}%` }]} /></View><Text style={styles.muted}>{item.description}</Text></View>;
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>반복해서 선택한 감상 패턴</Text>
          {insights.topPatterns.length ? <View style={styles.chips}>{insights.topPatterns.map((item) => <View key={item.label} style={styles.chip}><Text style={styles.chipText}>{item.label} · {item.count}</Text></View>)}</View> : <Text style={styles.muted}>질문 태그와 감정 키워드를 선택하면 패턴이 표시됩니다.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>다시보기 추천</Text>
          <Text style={styles.muted}>별점 4점 이상 기록을 현재 취향과의 겹침·감상 시점으로 정렬했어요.</Text>
          {insights.rewatch.length ? insights.rewatch.map((item) => <View key={item.reviewId} style={styles.rewatch}><View style={styles.flex}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.muted}>{item.reason}</Text></View><Button label="영화 보기" onPress={() => router.push(`/movie/${item.movieId}` as Href)} variant="ghost" /></View>) : <Text style={styles.muted}>별점 4점 이상의 완료 기록이 생기면 다시 볼 영화를 제안해요.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>취향 밖 한 걸음</Text>
          <Text style={styles.body}>{insights.contrastKeyword ? `${insights.contrastKeyword.label} · ${insights.contrastKeyword.reason}` : '현재 선택과 겹치지 않는 취향 축을 찾지 못했어요.'}</Text>
          {contrastMovies.map((movie) => <MovieCard key={movie.id} movie={movie} reason={`${insights.contrastKeyword?.label ?? '새로운'} 방향으로 취향을 넓혀보세요`} />)}
        </View>
      </> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { ...typography.caption, color: colors.textMuted }, body: { ...typography.body, color: colors.text }, label: { ...typography.label, color: colors.text }, flex: { flex: 1 },
  controlCard: { backgroundColor: colors.primarySoft, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  darkCard: { backgroundColor: colors.text, borderRadius: radii.lg, gap: spacing.sm, padding: spacing.xxl }, kicker: { ...typography.caption, color: '#FF9CAA', fontWeight: '800', letterSpacing: 1 }, darkTitle: { ...typography.title, color: colors.surface }, darkBody: { ...typography.body, color: colors.border }, darkEvidence: { ...typography.caption, color: '#FFCAD2' },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg }, sectionTitle: { ...typography.heading, color: colors.text },
  signal: { gap: spacing.xs }, signalHeader: { flexDirection: 'row', justifyContent: 'space-between' }, track: { backgroundColor: colors.border, borderRadius: radii.pill, height: 10, overflow: 'hidden' }, fill: { backgroundColor: colors.primary, borderRadius: radii.pill, height: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, chip: { backgroundColor: colors.primarySoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipText: { ...typography.label, color: colors.primary },
  rewatch: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md }, cardTitle: { ...typography.heading, color: colors.text },
});
