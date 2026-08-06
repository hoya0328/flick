import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { MovieCard } from '@/components/movie-card';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { discoverMovies, type DiscoveryResult } from '@/features/discovery/movies';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const search = useCallback(async (nextQuery = query) => {
    setStatus('loading');
    try {
      setResult(await discoverMovies(nextQuery));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        setResult(await discoverMovies(''));
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen eyebrow="영화 발견" title="어떤 영화를 찾고 있나요?">
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="영화 제목 검색"
          autoCapitalize="none"
          onChangeText={setQuery}
          onSubmitEditing={() => void search()}
          placeholder="제목을 입력해 주세요"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
        <Button label="검색" onPress={() => void search()} style={styles.button} />
      </View>

      {result?.notice ? <StateNotice message={result.notice} title="캐시 모드" tone="warning" /> : null}
      {status === 'loading' ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>영화를 찾고 있어요.</Text></View> : null}
      {status === 'error' ? <StateNotice message="네트워크를 확인하고 다시 시도해 주세요." title="검색하지 못했어요" tone="danger" /> : null}
      {status === 'error' ? <Button label="다시 검색" onPress={() => void search()} variant="secondary" /> : null}
      {status === 'ready' && !result?.movies.length ? <StateNotice message="다른 제목이나 원제 일부로 검색해 보세요." title="검색 결과가 없어요" /> : null}

      {status === 'ready' && result?.movies.length ? (
        <View style={styles.results}>
          <Text style={styles.count}>{query.trim() ? `'${query.trim()}' 검색 결과` : '추천 검색 목록'} · {result.movies.length}편</Text>
          {result.movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, color: colors.text, flex: 1, minHeight: 52, paddingHorizontal: spacing.lg },
  button: { minHeight: 52, paddingHorizontal: spacing.lg },
  loading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', padding: spacing.xl },
  loadingText: { ...typography.body, color: colors.textMuted },
  results: { gap: spacing.md },
  count: { ...typography.label, color: colors.textMuted },
});
