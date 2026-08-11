import { type Href, router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { type EditorialCuration } from '@/features/discovery/discovery-insights';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function EditorialCurationCard({ curation }: { curation: EditorialCuration }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/curation/${curation.curationId}` as Href)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.posters}>
        {curation.posterPaths.length ? curation.posterPaths.slice(0, 3).map((path, index) => <Image key={`${path}-${index}`} source={{ uri: `https://image.tmdb.org/t/p/w342${path}` }} style={styles.poster} />) : <View style={[styles.poster, styles.fallback]}><Text style={styles.fallbackText}>FLICK EDIT</Text></View>}
      </View>
      <View style={styles.copy}>
        <Text style={styles.badge}>{curation.kind === 'expert' ? 'EXPERT VIEW' : 'NICHE PICK'}</Text>
        <Text style={styles.title}>{curation.title}</Text>
        <Text numberOfLines={3} style={styles.description}>{curation.description}</Text>
        <Text style={styles.meta}>{curation.kind === 'expert' ? `${curation.curatorName} · ` : ''}영화 {curation.movieCount}편</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#202127', borderRadius: radii.lg, overflow: 'hidden' },
  pressed: { opacity: 0.76 },
  posters: { flexDirection: 'row', height: 150 },
  poster: { flex: 1, height: 150 },
  fallback: { alignItems: 'center', backgroundColor: '#332A38', justifyContent: 'center' },
  fallbackText: { ...typography.label, color: colors.surface, letterSpacing: 1.5 },
  copy: { gap: spacing.sm, padding: spacing.xl },
  badge: { ...typography.caption, color: '#FF9DAA', fontWeight: '800', letterSpacing: 1 },
  title: { ...typography.title, color: colors.surface },
  description: { ...typography.body, color: '#C7C8CD' },
  meta: { ...typography.caption, color: '#9FA2AA' },
});
