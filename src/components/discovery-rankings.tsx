import { type Href, router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { type DiscoveryRankings } from '@/features/discovery/discovery-insights';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function DiscoveryRankingsView({ rankings }: { rankings: DiscoveryRankings }) {
  if (!rankings.sufficient) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>순위를 만들 만큼 기록이 더 필요해요</Text>
        <Text style={styles.meta}>최근 {rankings.periodDays}일 공개 완료 기록 {rankings.sampleSize}편 · 최소 5편부터 순위를 보여드려요.</Text>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.movieList}>
        {rankings.movies.slice(0, 5).map((movie) => (
          <Pressable accessibilityRole="button" key={movie.movieId} onPress={() => router.push(`/movie/${movie.movieId}` as Href)} style={({ pressed }) => [styles.movieRow, pressed && styles.pressed]}>
            <Text style={styles.rank}>{movie.rank}</Text>
            {movie.posterPath ? <Image source={{ uri: `https://image.tmdb.org/t/p/w185${movie.posterPath}` }} style={styles.poster} /> : <View style={[styles.poster, styles.posterFallback]}><Text style={styles.posterText}>FLICK</Text></View>}
            <View style={styles.copy}><Text numberOfLines={2} style={styles.title}>{movie.title}</Text><Text style={styles.meta}>최근 공개 리뷰 {movie.score}편</Text></View>
          </Pressable>
        ))}
      </View>
      <View style={styles.keywordList}>
        {rankings.keywords.slice(0, 8).map((keyword) => <View key={keyword.key} style={styles.keyword}><Text style={styles.keywordRank}>{keyword.rank}</Text><Text style={styles.keywordLabel}>{keyword.label}</Text><Text style={styles.meta}>{keyword.score}회</Text></View>)}
      </View>
      <Text style={styles.explanation}>최근 {rankings.periodDays}일 동안 공개 완료된 기록만 집계하며, 같은 수치는 이름순으로 표시합니다. 마지막 집계 {rankings.refreshedAt ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(rankings.refreshedAt)) : '대기 중'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  empty: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text },
  movieList: { gap: spacing.sm },
  movieRow: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, flexDirection: 'row', gap: spacing.md, padding: spacing.sm },
  pressed: { opacity: 0.72 },
  rank: { ...typography.title, color: colors.primary, minWidth: 26, textAlign: 'center' },
  poster: { borderRadius: radii.sm, height: 76, width: 52 },
  posterFallback: { alignItems: 'center', backgroundColor: '#28232D', justifyContent: 'center' },
  posterText: { ...typography.caption, color: colors.surface, fontWeight: '800' },
  copy: { flex: 1, gap: spacing.xs },
  title: { ...typography.label, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  keywordList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  keyword: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.pill, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  keywordRank: { ...typography.label, color: colors.primary },
  keywordLabel: { ...typography.label, color: colors.text },
  explanation: { ...typography.caption, color: colors.textMuted },
});
