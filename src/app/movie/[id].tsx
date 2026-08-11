import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PosterArt } from '@/components/poster-art';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { trackProductEvent } from '@/features/community/community-service';
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
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (force = false): Promise<Movie | null> => {
    if (!movieId) return null;
    if (!force) setStatus('loading');
    try {
      const [nextMovie, ids] = await Promise.all([getMovie(movieId, force), getWatchlistMovieIds()]);
      setMovie(nextMovie);
      setWanted(ids.includes(movieId));
      setStatus(nextMovie ? 'ready' : 'error');
      return nextMovie;
    } catch {
      if (!force) setStatus('error');
      return null;
    }
  }, [movieId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(false), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const refreshDetails = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const refreshedMovie = await load(true);
      if (refreshedMovie?.detailsSource === 'tmdb') {
        setMessage('TMDB의 최신 상세 정보를 다시 확인했어요.');
      } else if (refreshedMovie?.details) {
        setMessage('TMDB 최신 확인에 실패해 저장된 상세 정보를 유지했어요.');
      } else {
        setMessage('상세 정보를 받지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setRefreshing(false);
    }
  };

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

  const startRecord = () => {
    void trackProductEvent('record_start', 'movie', movie?.id ?? null, { surface: 'movie_detail', source: 'movie' });
    if (movie) router.push({ pathname: '/(tabs)/record', params: { movieId: movie.id, title: movie.title } });
  };

  if (status === 'loading') return <Screen><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (status === 'error' || !movie) return <Screen title="영화를 찾지 못했어요"><StateNotice message="검색 화면으로 돌아가 다른 영화를 선택해 주세요." title="상세 정보 없음" tone="danger" /><Button label="뒤로 가기" onPress={() => router.back()} /></Screen>;

  const details = movie.details;
  const unavailableSections = details
    ? Object.values(details.completeness).filter((value) => value === 'source_empty').length
    : 0;
  const providerNames = details
    ? [...details.watchProviders.stream, ...details.watchProviders.rent, ...details.watchProviders.buy]
    : [];

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
        {details?.tagline ? <Text style={styles.tagline}>“{details.tagline}”</Text> : null}
        <Text style={styles.overview}>{movie.overview || '소개 정보가 아직 없어요.'}</Text>
      </View>
      {details ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>감독과 주요 출연</Text>
            <Text style={styles.detailLine}>감독 · {details.directorNames.join(', ') || 'TMDB 원본 정보 없음'}</Text>
            <Text style={styles.detailLine}>출연 · {details.cast.slice(0, 6).map((person) => person.name).join(', ') || 'TMDB 원본 정보 없음'}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제작 정보</Text>
            <Text style={styles.detailLine}>제작사 · {details.productionCompanies.join(', ') || 'TMDB 원본 정보 없음'}</Text>
            <Text style={styles.detailLine}>제작 국가 · {details.productionCountries.join(', ') || 'TMDB 원본 정보 없음'}</Text>
            <Text style={styles.detailLine}>키워드 · {details.keywords.slice(0, 8).join(', ') || 'TMDB 원본 정보 없음'}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>한국 OTT</Text>
            <Text style={styles.detailLine}>{providerNames.length ? [...new Set(providerNames)].join(', ') : '현재 한국 제공 정보가 없어요.'}</Text>
            <Text style={styles.sourceLine}>OTT 정보 제공: JustWatch · TMDB</Text>
          </View>
          <StateNotice
            message={`${new Date(details.fetchedAt).toLocaleDateString('ko-KR')} 확인 · 이미지 ${details.imageCount}개 · 영상 ${details.videoCount}개${unavailableSections ? ` · TMDB 원본이 비어 있는 항목 ${unavailableSections}개` : ''}`}
            title={movie.detailsSource === 'tmdb' ? '상세 정보 최신화 완료' : '저장된 상세 정보'}
            tone={unavailableSections ? 'warning' : 'success'}
          />
        </>
      ) : (
        <StateNotice message="기본 영화 정보는 유지됩니다. 다시 확인하면 TMDB 상세 항목을 재수집합니다." title="상세 정보 수집 대기" tone="warning" />
      )}
      <Button label="상세 정보 다시 확인" loading={refreshing} onPress={() => void refreshDetails()} variant="secondary" />
      {message ? <StateNotice message={message} title={message.includes('TMDB') ? '상세 정보' : '보고 싶어요'} tone={message.includes('저장했어요') || message.includes('TMDB') ? 'success' : 'info'} /> : null}
      <Button label={wanted ? '✓ 보고 싶어요에 저장됨' : '+ 보고 싶어요'} loading={saving} onPress={() => void toggleWatchlist()} variant={wanted ? 'secondary' : 'primary'} />
      <Button label="내 컬렉션에 담기" onPress={() => router.push(`/collections?movieId=${encodeURIComponent(movie.id)}&title=${encodeURIComponent(movie.title)}` as Href)} variant="secondary" />
      <Button label="이 영화 감상 기록하기" onPress={startRecord} variant="secondary" />
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
  tagline: { ...typography.body, color: colors.text, fontWeight: '700' },
  overview: { ...typography.body, color: colors.textMuted },
  detailLine: { ...typography.body, color: colors.textMuted },
  sourceLine: { ...typography.caption, color: colors.textMuted },
});
