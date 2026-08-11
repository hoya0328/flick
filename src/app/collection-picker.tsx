import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { MovieCard } from '@/components/movie-card';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { addMovieToCollection } from '@/features/community/collections-service';
import { discoverMovies, type Movie } from '@/features/discovery/movies';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function CollectionPickerScreen() {
  const params = useLocalSearchParams<{ collectionId?: string; movieId?: string; title?: string }>();
  const collectionId = Array.isArray(params.collectionId) ? params.collectionId[0] : params.collectionId;
  const initialMovieId = Array.isArray(params.movieId) ? params.movieId[0] : params.movieId;
  const initialTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>(() => initialMovieId && initialTitle ? [{ id: initialMovieId, provider: 'tmdb', providerId: '', title: initialTitle, originalTitle: null, overview: '', posterPath: null, releaseDate: null, runtime: null, genres: [], recommendationKeywords: [], voteAverage: null, details: null, detailsSource: 'cache', detailsStatus: 'summary', detailsFetchedAt: null }] : []);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'warning' } | null>(null);

  async function search() {
    if (!query.trim()) { setNotice({ title: '영화 제목을 입력해 주세요', message: '찾고 싶은 영화 제목을 한 글자 이상 입력해야 합니다.', tone: 'warning' }); return; }
    setLoading(true); setNotice(null);
    try { setMovies((await discoverMovies(query)).movies); }
    catch { setNotice({ title: '영화를 찾지 못했어요', message: '연결을 확인한 뒤 다시 검색해 주세요.', tone: 'danger' }); }
    finally { setLoading(false); }
  }

  async function add(movie: Movie) {
    if (!collectionId) return;
    setBusyId(movie.id); setNotice(null);
    try {
      await addMovieToCollection(collectionId, movie.id);
      setNotice({ title: '컬렉션에 담았어요', message: `${movie.title}을(를) 추가했습니다. 같은 영화는 한 번만 담깁니다.`, tone: 'success' });
    } catch (error) {
      setNotice({ title: '영화를 담지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' });
    } finally { setBusyId(null); }
  }

  if (!collectionId) return <Screen eyebrow="컬렉션 편집" title="컬렉션을 찾을 수 없어요"><StateNotice message="내 컬렉션에서 다시 영화 추가를 선택해 주세요." title="잘못된 접근" tone="warning" /><Button label="내 컬렉션으로" onPress={() => router.replace('/collections' as Href)} /></Screen>;

  return (
    <Screen eyebrow="컬렉션 편집" title="영화 추가">
      {notice ? <StateNotice {...notice} /> : null}
      <View style={styles.searchRow}>
        <TextInput accessibilityLabel="추가할 영화 검색" onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder="영화 제목 검색" placeholderTextColor={colors.textMuted} returnKeyType="search" style={styles.input} value={query} />
        <Button disabled={loading} label="검색" onPress={() => void search()} style={styles.searchButton} />
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!movies.length && !loading ? <Text style={styles.help}>영화를 검색한 뒤 ‘담기’를 선택하세요. 최대 100편까지 담을 수 있어요.</Text> : null}
      {movies.map((movie) => <View key={movie.id} style={styles.result}><MovieCard movie={movie} /><Button disabled={busyId === movie.id} label="이 컬렉션에 담기" loading={busyId === movie.id} onPress={() => void add(movie)} variant="secondary" /></View>)}
      <Button label="컬렉션 보기" onPress={() => router.replace(`/collection/${collectionId}` as Href)} />
      <Button label="내 컬렉션 목록" onPress={() => router.replace('/collections' as Href)} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, color: colors.text, flex: 1, minHeight: 52, paddingHorizontal: spacing.lg },
  searchButton: { minHeight: 52, paddingHorizontal: spacing.lg },
  help: { ...typography.body, backgroundColor: colors.surface, borderRadius: radii.md, color: colors.textMuted, padding: spacing.xl },
  result: { gap: spacing.sm },
});
