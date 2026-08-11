import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { deleteMovieCollection, listMyCollections, listSavedCollections, saveMovieCollection, type CollectionSummary, type CollectionVisibility } from '@/features/community/collections-service';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function pickerHref(collectionId: string, movieId?: string, title?: string) {
  const movieParams = movieId ? `&movieId=${encodeURIComponent(movieId)}&title=${encodeURIComponent(title ?? '')}` : '';
  return `/collection-picker?collectionId=${encodeURIComponent(collectionId)}${movieParams}` as Href;
}

export default function CollectionsScreen() {
  const params = useLocalSearchParams<{ movieId?: string; title?: string }>();
  const incomingMovieId = Array.isArray(params.movieId) ? params.movieId[0] : params.movieId;
  const incomingTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  const { mode } = useSession();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [savedCollections, setSavedCollections] = useState<CollectionSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<CollectionVisibility>('private');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'warning' } | null>(null);

  const load = useCallback(async () => {
    if (mode !== 'supabase') { setStatus('ready'); return; }
    setStatus('loading');
    try {
      const [mine, saved] = await Promise.all([listMyCollections(), listSavedCollections()]);
      setCollections(mine); setSavedCollections(saved); setStatus('ready');
    }
    catch { setStatus('error'); }
  }, [mode]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  function resetForm() {
    setEditingId(null); setTitle(''); setDescription(''); setVisibility('private');
  }

  function edit(collection: CollectionSummary) {
    setEditingId(collection.collectionId);
    setTitle(collection.title);
    setDescription(collection.description);
    setVisibility(collection.visibility);
    setNotice(null);
  }

  async function save() {
    if (title.trim().length < 2) {
      setNotice({ title: '컬렉션 이름을 확인해 주세요', message: '컬렉션 이름을 2자 이상 입력해야 합니다.', tone: 'warning' });
      return;
    }
    setBusy(true); setNotice(null);
    try {
      const id = await saveMovieCollection({ collectionId: editingId, title, description, visibility });
      await load(); resetForm();
      setNotice({ title: editingId ? '컬렉션을 수정했어요' : '컬렉션을 만들었어요', message: '영화를 추가해 나만의 영화 묶음을 완성해 보세요.', tone: 'success' });
      if (!editingId) router.push(pickerHref(id, incomingMovieId, incomingTitle));
    } catch (error) {
      setNotice({ title: '컬렉션을 저장하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' });
    } finally { setBusy(false); }
  }

  async function remove(collectionId: string) {
    if (pendingDelete !== collectionId) { setPendingDelete(collectionId); return; }
    setBusy(true);
    try {
      await deleteMovieCollection(collectionId); await load(); setPendingDelete(null);
      if (editingId === collectionId) resetForm();
      setNotice({ title: '컬렉션을 삭제했어요', message: '컬렉션만 삭제되며 영화와 감상 기록은 그대로 유지됩니다.', tone: 'success' });
    } catch (error) {
      setNotice({ title: '컬렉션을 삭제하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' });
    } finally { setBusy(false); }
  }

  if (mode !== 'supabase') return <Screen eyebrow="나의 영화 묶음" title="컬렉션"><StateNotice message="컬렉션은 로그인 계정에 안전하게 저장됩니다." title="로그인이 필요해요" tone="warning" /><Button label="로그인하기" onPress={() => router.replace('/welcome')} /></Screen>;

  return (
    <Screen eyebrow="나의 영화 묶음" title="컬렉션">
      {notice ? <StateNotice {...notice} /> : null}
      {incomingMovieId ? <StateNotice message={`${incomingTitle ?? '선택한 영화'}을(를) 담을 컬렉션을 고르거나 새로 만들어 주세요.`} title="영화를 컬렉션에 담기" tone="success" /> : null}
      <View style={styles.form}>
        <Text style={styles.heading}>{editingId ? '컬렉션 수정' : '새 컬렉션 만들기'}</Text>
        <TextInput accessibilityLabel="컬렉션 이름" maxLength={60} onChangeText={setTitle} placeholder="예: 비 오는 날 다시 볼 영화" placeholderTextColor={colors.textMuted} style={styles.input} value={title} />
        <TextInput accessibilityLabel="컬렉션 소개" maxLength={500} multiline onChangeText={setDescription} placeholder="이 영화들을 함께 묶은 이유를 적어보세요." placeholderTextColor={colors.textMuted} style={[styles.input, styles.description]} value={description} />
        <Text style={styles.count}>{description.length}/500</Text>
        <View style={styles.visibilityRow}>
          {(['private', 'public'] as const).map((value) => <Pressable accessibilityRole="button" accessibilityState={{ selected: visibility === value }} key={value} onPress={() => setVisibility(value)} style={[styles.visibility, visibility === value && styles.visibilitySelected]}><Text style={[styles.visibilityText, visibility === value && styles.visibilityTextSelected]}>{value === 'private' ? '나만 보기' : '전체 공개'}</Text></Pressable>)}
        </View>
        <Text style={styles.help}>{visibility === 'public' ? '다른 사용자가 컬렉션을 보고 저장할 수 있어요.' : '나만 보고 수정할 수 있어요.'}</Text>
        <Button disabled={busy} label={editingId ? '수정 완료' : '만들고 영화 추가'} loading={busy} onPress={() => void save()} />
        {editingId ? <Button label="수정 취소" onPress={resetForm} variant="ghost" /> : null}
      </View>

      <View style={styles.sectionHeader}><Text style={styles.heading}>내 컬렉션</Text><Text style={styles.help}>{collections.length}개</Text></View>
      {status === 'loading' ? <ActivityIndicator color={colors.primary} /> : null}
      {status === 'error' ? <StateNotice message="연결을 확인한 뒤 다시 시도해 주세요." title="컬렉션을 불러오지 못했어요" tone="danger" /> : null}
      {status === 'error' ? <Button label="다시 불러오기" onPress={() => void load()} variant="secondary" /> : null}
      {status === 'ready' && !collections.length ? <Text style={styles.empty}>아직 만든 컬렉션이 없어요.</Text> : null}
      {collections.map((collection) => (
        <View key={collection.collectionId} style={styles.card}>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/collection/${collection.collectionId}` as Href)}>
            <Text style={styles.cardTitle}>{collection.title}</Text>
            <Text style={styles.help}>{collection.visibility === 'public' ? '전체 공개' : '나만 보기'} · 영화 {collection.movieCount}편 · 저장 {collection.saveCount}</Text>
            {collection.description ? <Text numberOfLines={2} style={styles.body}>{collection.description}</Text> : null}
          </Pressable>
          <View style={styles.actions}>
            <Button label={incomingMovieId ? '이 컬렉션에 담기' : '영화 추가'} onPress={() => router.push(pickerHref(collection.collectionId, incomingMovieId, incomingTitle))} style={styles.action} variant="secondary" />
            <Button label="수정" onPress={() => edit(collection)} style={styles.action} variant="ghost" />
            <Button disabled={busy} label={pendingDelete === collection.collectionId ? '삭제 확인' : '삭제'} onPress={() => void remove(collection.collectionId)} style={styles.action} variant="ghost" />
          </View>
        </View>
      ))}
      <View style={styles.sectionHeader}><Text style={styles.heading}>저장한 공개 컬렉션</Text><Text style={styles.help}>{savedCollections.length}개</Text></View>
      {status === 'ready' && !savedCollections.length ? <Text style={styles.empty}>다른 사용자의 공개 컬렉션을 저장하면 여기에 모여요.</Text> : null}
      {savedCollections.map((collection) => (
        <Pressable accessibilityRole="button" key={collection.collectionId} onPress={() => router.push(`/collection/${collection.collectionId}` as Href)} style={styles.card}>
          <Text style={styles.cardTitle}>{collection.title}</Text>
          <Text style={styles.help}>{collection.authorDisplayName} · 영화 {collection.movieCount}편 · 저장 {collection.saveCount}</Text>
          {collection.description ? <Text numberOfLines={2} style={styles.body}>{collection.description}</Text> : null}
        </Pressable>
      ))}
      <Button label="홈으로 돌아가기" onPress={() => router.replace('/')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  heading: { ...typography.heading, color: colors.text },
  input: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 52, padding: spacing.md },
  description: { minHeight: 104, textAlignVertical: 'top' },
  count: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  visibilityRow: { flexDirection: 'row', gap: spacing.sm },
  visibility: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flex: 1, minHeight: 44, justifyContent: 'center' },
  visibilitySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  visibilityText: { ...typography.label, color: colors.textMuted },
  visibilityTextSelected: { color: colors.surface },
  help: { ...typography.caption, color: colors.textMuted },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  empty: { ...typography.body, backgroundColor: colors.surface, borderRadius: radii.md, color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  cardTitle: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1, minHeight: 42, paddingHorizontal: spacing.md },
});
