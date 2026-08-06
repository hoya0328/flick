import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { MovieCard } from '@/components/movie-card';
import { PosterPreferenceDeck } from '@/components/poster-preference-deck';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { discoverMovies, type DiscoveryResult, recommendationReason, setWantToWatch } from '@/features/discovery/movies';
import { getKeywordLabels } from '@/features/onboarding/keywords';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  const { mode, selectedKeywords } = useSession();
  const labels = getKeywordLabels(selectedKeywords);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
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

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

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
});
