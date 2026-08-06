import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native';

import type { Movie } from '@/features/discovery/movies';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const posterColors = ['#261C3B', '#163A46', '#4B252E', '#253A2E', '#3B2F1F', '#1E3152'];

type PosterArtProps = {
  movie: Movie;
  compact?: boolean;
  style?: StyleProp<ImageStyle>;
};

export function PosterArt({ movie, compact = false, style }: PosterArtProps) {
  const imageUrl = movie.posterPath ? `https://image.tmdb.org/t/p/w500${movie.posterPath}` : null;
  const colorIndex = movie.title.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) % posterColors.length;

  if (imageUrl) {
    return <Image accessibilityLabel={`${movie.title} 포스터`} resizeMode="cover" source={{ uri: imageUrl }} style={[styles.base, compact ? styles.compact : styles.large, style]} />;
  }

  return (
    <View accessibilityLabel={`${movie.title} 포스터 대체 이미지`} style={[styles.base, compact ? styles.compact : styles.large, { backgroundColor: posterColors[colorIndex] }, style]}>
      <Text numberOfLines={compact ? 3 : 4} style={[styles.title, compact && styles.compactTitle]}>{movie.title}</Text>
      <Text style={styles.mark}>FLICK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.md, justifyContent: 'space-between', overflow: 'hidden', padding: spacing.md },
  compact: { height: 132, width: 92 },
  large: { aspectRatio: 2 / 3, maxHeight: 430, width: '100%' },
  title: { ...typography.title, color: colors.surface, fontSize: 27, lineHeight: 33 },
  compactTitle: { ...typography.label, color: colors.surface, fontSize: 15, lineHeight: 20 },
  mark: { ...typography.caption, color: '#FFFFFFB8', fontWeight: '800', letterSpacing: 1.5 },
});
