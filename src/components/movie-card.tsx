import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PosterArt } from '@/components/poster-art';
import { type Movie, yearOf } from '@/features/discovery/movies';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type MovieCardProps = {
  movie: Movie;
  reason?: string;
};

export function MovieCard({ movie, reason }: MovieCardProps) {
  return (
    <Pressable
      accessibilityHint="영화 상세 화면을 엽니다"
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/movie/[id]', params: { id: movie.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <PosterArt compact movie={movie} />
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={styles.title}>{movie.title}</Text>
          <Text style={styles.rating}>{movie.voteAverage ? `★ ${movie.voteAverage.toFixed(1)}` : '평점 없음'}</Text>
        </View>
        <Text style={styles.meta}>{yearOf(movie)} · {movie.genres.slice(0, 2).join(' · ')}</Text>
        {reason ? <Text numberOfLines={2} style={styles.reason}>{reason}</Text> : null}
        <Text numberOfLines={2} style={styles.overview}>{movie.overview || '줄거리 정보가 아직 없어요.'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.lg, padding: spacing.md },
  pressed: { backgroundColor: colors.primarySoft, transform: [{ scale: 0.995 }] },
  copy: { flex: 1, gap: spacing.sm, paddingVertical: spacing.xs },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  title: { ...typography.heading, color: colors.text, flex: 1 },
  rating: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  meta: { ...typography.caption, color: colors.textMuted },
  reason: { ...typography.label, color: colors.primary },
  overview: { ...typography.caption, color: colors.textMuted },
});
