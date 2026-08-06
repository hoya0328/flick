import { useCallback, useMemo, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PosterArt } from '@/components/poster-art';
import type { Movie } from '@/features/discovery/movies';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type PosterPreferenceDeckProps = {
  movies: Movie[];
  onLike: (movie: Movie) => void;
};

export function PosterPreferenceDeck({ movies, onLike }: PosterPreferenceDeckProps) {
  const [index, setIndex] = useState(0);
  const [position] = useState(() => new Animated.ValueXY());
  const movie = movies[index % Math.max(movies.length, 1)];

  const decide = useCallback((liked: boolean) => {
    if (liked && movie) onLike(movie);
    Animated.timing(position, { duration: 160, toValue: { x: liked ? 420 : -420, y: 0 }, useNativeDriver: true }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setIndex((current) => current + 1);
    });
  }, [movie, onLike, position]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 8,
    onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) > 70) decide(gesture.dx > 0);
      else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    },
  }), [decide, position]);

  if (!movie) return null;

  const rotate = position.x.interpolate({ inputRange: [-220, 0, 220], outputRange: ['-7deg', '0deg', '7deg'] });

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FLICK 실험</Text>
        <Text style={styles.title}>포스터를 넘겨 취향을 알려주세요</Text>
        <Text style={styles.body}>왼쪽은 넘기기, 오른쪽은 보고 싶어요. 버튼으로도 선택할 수 있어요.</Text>
      </View>
      <Animated.View {...panResponder.panHandlers} style={[styles.posterWrap, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}>
        <PosterArt movie={movie} />
        <View style={styles.caption}>
          <Text style={styles.movieTitle}>{movie.title}</Text>
          <Text style={styles.counter}>{(index % movies.length) + 1} / {movies.length}</Text>
        </View>
      </Animated.View>
      <View style={styles.actions}>
        <Button label="← 넘기기" onPress={() => decide(false)} style={styles.action} variant="secondary" />
        <Button label="끌려요 →" onPress={() => decide(true)} style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.lg, overflow: 'hidden', padding: spacing.lg },
  header: { gap: spacing.xs },
  eyebrow: { ...typography.label, color: colors.primary },
  title: { ...typography.heading, color: colors.text },
  body: { ...typography.caption, color: colors.textMuted },
  posterWrap: { alignSelf: 'center', maxWidth: 280, width: '78%' },
  caption: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm },
  movieTitle: { ...typography.label, color: colors.text, flex: 1 },
  counter: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1, minHeight: 46, paddingHorizontal: spacing.sm },
});
