import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { MovieCard } from '@/components/movie-card';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { getMovieCollection, removeMovieFromCollection, setMovieCollectionSaved, type CollectionDetail } from '@/features/community/collections-service';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function CollectionDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const collectionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { mode, status: sessionStatus } = useSession();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  const load = useCallback(async () => {
    if (!collectionId || mode !== 'supabase') return;
    setStatus('loading');
    try { const result = await getMovieCollection(collectionId); setCollection(result); setStatus(result ? 'ready' : 'missing'); }
    catch { setStatus('error'); }
  }, [collectionId, mode]);

  useEffect(() => { if (sessionStatus !== 'ready') return; const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load, sessionStatus]);

  async function toggleSave() {
    if (!collection) return;
    setBusy(true); setNotice(null);
    try { await setMovieCollectionSaved(collection.collectionId, !collection.viewerSaved); await load(); }
    catch (error) { setNotice({ title: '저장을 반영하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); }
    finally { setBusy(false); }
  }

  async function removeMovie(movieId: string) {
    if (!collection) return;
    setBusy(true); setNotice(null);
    try { await removeMovieFromCollection(collection.collectionId, movieId); await load(); setNotice({ title: '컬렉션에서 제외했어요', message: '영화와 감상 기록 원본은 삭제되지 않았습니다.', tone: 'success' }); }
    catch (error) { setNotice({ title: '영화를 제외하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); }
    finally { setBusy(false); }
  }

  if (sessionStatus !== 'ready' || (mode === 'supabase' && status === 'loading')) return <Screen><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (mode !== 'supabase') return <Screen eyebrow="사용자 컬렉션" title="로그인 후 볼 수 있어요"><StateNotice message="공개 컬렉션도 이메일 계정 사용자에게만 제공됩니다." title="로그인이 필요해요" tone="warning" /><Button label="로그인하기" onPress={() => router.replace('/welcome')} /></Screen>;
  if (status === 'error') return <Screen eyebrow="사용자 컬렉션" title="불러오지 못했어요"><StateNotice message="연결을 확인하고 다시 시도해 주세요." title="조회 오류" tone="danger" /><Button label="다시 시도" onPress={() => void load()} /></Screen>;
  if (status === 'missing' || !collection) return <Screen eyebrow="사용자 컬렉션" title="볼 수 없는 컬렉션이에요"><StateNotice message="작성자가 비공개로 바꾸거나 삭제했을 수 있어요." title="접근할 수 없음" tone="warning" /><Button label="홈으로" onPress={() => router.replace('/')} /></Screen>;

  return (
    <Screen eyebrow={collection.isMine ? '내 컬렉션' : `${collection.authorDisplayName}의 컬렉션`} title={collection.title}>
      {notice ? <StateNotice {...notice} /> : null}
      <View style={styles.summary}>
        <Text style={styles.description}>{collection.description || '좋아하는 영화를 한곳에 모은 컬렉션이에요.'}</Text>
        <Text style={styles.meta}>{collection.visibility === 'public' ? '전체 공개' : '나만 보기'} · 영화 {collection.movieCount}편 · 저장 {collection.saveCount}</Text>
        {collection.isMine ? <Button label="영화 추가" onPress={() => router.push(`/collection-picker?collectionId=${encodeURIComponent(collection.collectionId)}` as Href)} variant="secondary" /> : <Button disabled={busy} label={collection.viewerSaved ? '컬렉션 저장 취소' : '컬렉션 저장'} loading={busy} onPress={() => void toggleSave()} />}
      </View>
      {!collection.movies.length ? <Text style={styles.empty}>아직 담긴 영화가 없어요.</Text> : collection.movies.map((movie) => <View key={movie.id} style={styles.movie}><MovieCard movie={movie} />{collection.isMine ? <Button disabled={busy} label="컬렉션에서 제외" onPress={() => void removeMovie(movie.id)} variant="ghost" /> : null}</View>)}
      {collection.isMine ? <Button label="컬렉션 정보 수정" onPress={() => router.push('/collections' as Href)} variant="secondary" /> : null}
      <Button label="홈으로" onPress={() => router.replace('/')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.xl },
  description: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  empty: { ...typography.body, backgroundColor: colors.surface, borderRadius: radii.md, color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
  movie: { gap: spacing.xs },
});
