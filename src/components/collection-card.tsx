import { type Href, router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { type CollectionSummary } from '@/features/community/collections-service';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <Pressable
      accessibilityHint="영화 컬렉션 상세 화면을 엽니다"
      accessibilityRole="button"
      onPress={() => router.push(`/collection/${collection.collectionId}` as Href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.posters}>
        {collection.posterPaths.length ? collection.posterPaths.slice(0, 3).map((path, index) => (
          <Image key={`${path}-${index}`} resizeMode="cover" source={{ uri: `https://image.tmdb.org/t/p/w342${path}` }} style={styles.poster} />
        )) : <View style={[styles.poster, styles.fallback]}><Text style={styles.fallbackText}>FLICK</Text></View>}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.title}>{collection.title}</Text>
        <Text style={styles.meta}>{collection.authorDisplayName} · 영화 {collection.movieCount}편 · 저장 {collection.saveCount}</Text>
        {collection.description ? <Text numberOfLines={2} style={styles.description}>{collection.description}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  pressed: { opacity: 0.75 },
  posters: { backgroundColor: '#29252E', flexDirection: 'row', height: 132 },
  poster: { flex: 1, height: 132 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { ...typography.heading, color: colors.surface, letterSpacing: 2 },
  copy: { gap: spacing.xs, padding: spacing.lg },
  title: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  description: { ...typography.caption, color: colors.textMuted },
});
