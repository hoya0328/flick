import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { MovieCard } from '@/components/movie-card';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { discoverMovies, type DiscoveryResult, recommendationReason } from '@/features/discovery/movies';
import { tasteKeywords } from '@/features/onboarding/keywords';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [emotionKeyword, setEmotionKeyword] = useState<string | null>(null);

  const search = useCallback(async (nextQuery = query, keywordIds = emotionKeyword ? [emotionKeyword] : []) => {
    setStatus('loading');
    try {
      setResult(await discoverMovies(nextQuery, keywordIds));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [emotionKeyword, query]);

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
      <View style={styles.emotionSection}>
        <Text style={styles.sectionTitle}>지금 원하는 감정으로 고르기</Text>
        <Text style={styles.help}>한 가지 분위기를 선택하면 그 이유와 함께 영화를 추천해요.</Text>
        <View style={styles.chips}>
          {tasteKeywords.map((keyword) => <Pressable accessibilityRole="button" accessibilityState={{ selected: emotionKeyword === keyword.id }} key={keyword.id} onPress={() => { setEmotionKeyword(keyword.id); setQuery(''); void search('', [keyword.id]); }} style={[styles.chip, emotionKeyword === keyword.id && styles.chipSelected]}><Text style={[styles.chipText, emotionKeyword === keyword.id && styles.chipTextSelected]}>{keyword.label}</Text></Pressable>)}
        </View>
        {emotionKeyword ? <Button label="감정 선택 해제" onPress={() => { setEmotionKeyword(null); void search('', []); }} variant="ghost" /> : null}
      </View>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="영화 제목 검색"
          autoCapitalize="none"
          onChangeText={(value) => { setQuery(value); if (value.trim()) setEmotionKeyword(null); }}
          onSubmitEditing={() => void search(query, [])}
          placeholder="제목을 입력해 주세요"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
        <Button label="검색" onPress={() => void search(query, [])} style={styles.button} />
      </View>

      {result?.notice ? <StateNotice message={result.notice} title="캐시 모드" tone="warning" /> : null}
      {status === 'loading' ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>영화를 찾고 있어요.</Text></View> : null}
      {status === 'error' ? <StateNotice message="네트워크를 확인하고 다시 시도해 주세요." title="검색하지 못했어요" tone="danger" /> : null}
      {status === 'error' ? <Button label="다시 검색" onPress={() => void search()} variant="secondary" /> : null}
      {status === 'ready' && !result?.movies.length ? <StateNotice message="다른 제목이나 원제 일부로 검색해 보세요." title="검색 결과가 없어요" /> : null}

      {status === 'ready' && result?.movies.length ? (
        <View style={styles.results}>
          <Text style={styles.count}>{query.trim() ? `'${query.trim()}' 검색 결과` : emotionKeyword ? '선택한 감정의 추천' : '추천 검색 목록'} · {result.movies.length}편</Text>
          {result.movies.map((movie) => <MovieCard key={movie.id} movie={movie} reason={emotionKeyword ? recommendationReason(movie, [emotionKeyword]) : undefined} />)}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emotionSection: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text },
  help: { ...typography.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textMuted },
  chipTextSelected: { color: colors.surface, fontWeight: '700' },
  searchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, color: colors.text, flex: 1, minHeight: 52, paddingHorizontal: spacing.lg },
  button: { minHeight: 52, paddingHorizontal: spacing.lg },
  loading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', padding: spacing.xl },
  loadingText: { ...typography.body, color: colors.textMuted },
  results: { gap: spacing.md },
  count: { ...typography.label, color: colors.textMuted },
});
