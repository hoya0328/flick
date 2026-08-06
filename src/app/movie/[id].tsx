import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PosterArt } from '@/components/poster-art';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { getMovie, getWatchlistMovieIds, type Movie, setWantToWatch, yearOf } from '@/features/discovery/movies';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function MovieDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const movieId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { mode } = useSession();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [wanted, setWanted] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!movieId) return;
    setStatus('loading');
    try {
      const [nextMovie, ids] = await Promise.all([getMovie(movieId), getWatchlistMovieIds()]);
      setMovie(nextMovie);
      setWanted(ids.includes(movieId));
      setStatus(nextMovie ? 'ready' : 'error');
    } catch {
      setStatus('error');
    }
  }, [movieId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const toggleWatchlist = async () => {
    if (!movie) return;
    if (mode !== 'supabase') {
      setMessage('보고 싶어요 저장은 이메일 계정에서 사용할 수 있어요.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await setWantToWatch(movie.id, !wanted);
      setWanted((current) => !current);
      setMessage(wanted ? '보고 싶어요에서 삭제했어요.' : '보고 싶어요에 저장했어요.');
    } catch {
      setMessage('저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return <Screen><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (status === 'error' || !movie) return <Screen title="영화를 찾지 못했어요"><StateNotice message="검색 화면으로 돌아가 다른 영화를 선택해 주세요." title="상세 정보 없음" tone="danger" /><Button label="뒤로 가기" onPress={() => router.back()} /></Screen>;

  return (
    <Screen>
      <Button label="← 뒤로" onPress={() => router.back()} style={styles.back} variant="ghost" />
      <PosterArt movie={movie} style={styles.poster} />
      <View style={styles.header}>
        <Text style={styles.title}>{movie.title}</Text>
        {movie.originalTitle ? <Text style={styles.original}>{movie.originalTitle}</Text> : null}
        <Text style={styles.meta}>{yearOf(movie)} · {movie.runtime ? `${movie.runtime}분 · ` : ''}{movie.genres.join(' · ')}</Text>
        <Text style={styles.rating}>{movie.voteAverage ? `★ ${movie.voteAverage.toFixed(1)} / 10` : '평점 정보 없음'}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>영화 소개</Text>
        <Text style={styles.overview}>{movie.overview || '소개 정보가 아직 없어요.'}</Text>
      </View>
      {message ? <StateNotice message={message} title="보고 싶어요" tone={message.includes('저장했어요') ? 'success' : 'info'} /> : null}
      <Button label={wanted ? '✓ 보고 싶어요에 저장됨' : '+ 보고 싶어요'} loading={saving} onPress={() => void toggleWatchlist()} variant={wanted ? 'secondary' : 'primary'} />
      <Button label="이 영화 감상 기록 준비" onPress={() => router.push({ pathname: '/(tabs)/record', params: { movieId: movie.id, title: movie.title } })} variant="secondary" />
      <Button label="데이터 출처와 크레딧" onPress={() => router.push('/credits')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: spacing.sm },
  poster: { alignSelf: 'center', maxWidth: 300 },
  header: { gap: spacing.xs },
  title: { ...typography.title, color: colors.text },
  original: { ...typography.body, color: colors.textMuted },
  meta: { ...typography.caption, color: colors.textMuted },
  rating: { ...typography.label, color: colors.warning },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.sm, padding: spacing.xl },
  sectionTitle: { ...typography.heading, color: colors.text },
  overview: { ...typography.body, color: colors.textMuted },
});
