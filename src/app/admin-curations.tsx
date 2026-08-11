import { type Href, Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { MovieCard } from '@/components/movie-card';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { getMyAdminAccess, type AdminAccess } from '@/features/admin/admin-service';
import {
  addAdminCurationMovie,
  deleteAdminCuration,
  listAdminCurationItems,
  listAdminCurations,
  refreshDiscoveryRankings,
  removeAdminCurationMovie,
  saveAdminCuration,
  type EditorialCuration,
  type EditorialCurationItem,
  type EditorialKind,
  type EditorialStatus,
} from '@/features/discovery/discovery-insights';
import { discoverMovies, type Movie } from '@/features/discovery/movies';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function AdminCurationsScreen() {
  const { mode, status: sessionStatus } = useSession();
  const [access, setAccess] = useState<AdminAccess | null | undefined>(undefined);
  const [curations, setCurations] = useState<EditorialCuration[]>([]);
  const [items, setItems] = useState<EditorialCurationItem[]>([]);
  const [curationId, setCurationId] = useState<string | null>(null);
  const [kind, setKind] = useState<EditorialKind>('niche');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [curatorName, setCuratorName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [curationStatus, setCurationStatus] = useState<EditorialStatus>('draft');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [movieNote, setMovieNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'warning' } | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const nextAccess = await getMyAdminAccess(); setAccess(nextAccess);
      setCurations(nextAccess ? await listAdminCurations() : []);
    } catch (error) { setNotice({ title: '편집 큐레이션을 불러오지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { if (sessionStatus === 'ready' && mode === 'supabase') void Promise.resolve().then(load); }, [load, mode, sessionStatus]);

  function resetForm() {
    setCurationId(null); setKind('niche'); setTitle(''); setDescription(''); setCuratorName(''); setSourceUrl('');
    setRightsConfirmed(false); setCurationStatus('draft'); setItems([]); setSearchResults([]); setMovieNote(''); setPendingDelete(false);
  }

  async function selectCuration(curation: EditorialCuration) {
    setCurationId(curation.curationId); setKind(curation.kind); setTitle(curation.title); setDescription(curation.description);
    setCuratorName(curation.curatorName); setSourceUrl(curation.sourceUrl); setRightsConfirmed(curation.rightsConfirmed);
    setCurationStatus(curation.status); setItems(await listAdminCurationItems(curation.curationId)); setPendingDelete(false); setNotice(null);
  }

  async function save(nextStatus: EditorialStatus = curationStatus) {
    if (title.trim().length < 2) { setNotice({ title: '제목을 확인해 주세요', message: '큐레이션 제목을 2자 이상 입력해야 합니다.', tone: 'warning' }); return; }
    setBusy(true); setNotice(null);
    try {
      const id = await saveAdminCuration({ curationId: curationId ?? '', kind, title, description, curatorName, sourceUrl, rightsConfirmed, status: nextStatus });
      setCurationId(id); setCurationStatus(curationId ? nextStatus : 'draft'); await load();
      setNotice({ title: nextStatus === 'published' ? '큐레이션을 공개했어요' : '큐레이션 초안을 저장했어요', message: curationId ? '홈과 상세 화면에 상태가 반영됩니다.' : '이제 영화를 추가한 뒤 공개할 수 있어요.', tone: 'success' });
    } catch (error) { setNotice({ title: '큐레이션을 저장하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); setBusy(false); }
  }

  async function searchMovies() {
    if (!query.trim()) return;
    setBusy(true);
    try { setSearchResults((await discoverMovies(query)).movies.slice(0, 8)); }
    catch { setNotice({ title: '영화를 찾지 못했어요', message: '연결을 확인하고 다시 검색해 주세요.', tone: 'danger' }); }
    finally { setBusy(false); }
  }

  async function addMovie(movie: Movie) {
    if (!curationId) return;
    setBusy(true);
    try { await addAdminCurationMovie(curationId, movie.id, movieNote); setItems(await listAdminCurationItems(curationId)); setMovieNote(''); await load(); setNotice({ title: '영화를 추가했어요', message: '같은 영화는 중복되지 않고 선정 이유만 갱신됩니다.', tone: 'success' }); }
    catch (error) { setNotice({ title: '영화를 추가하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); }
    finally { setBusy(false); }
  }

  async function removeMovie(movieId: string) {
    if (!curationId) return;
    setBusy(true);
    try { await removeAdminCurationMovie(curationId, movieId); setItems(await listAdminCurationItems(curationId)); setCurationStatus('draft'); await load(); setNotice({ title: '영화를 제외했어요', message: '안전을 위해 공개 상태도 초안으로 전환했습니다.', tone: 'success' }); }
    catch (error) { setNotice({ title: '영화를 제외하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); }
    finally { setBusy(false); }
  }

  async function removeCuration() {
    if (!curationId) return;
    if (!pendingDelete) { setPendingDelete(true); return; }
    setBusy(true);
    try { await deleteAdminCuration(curationId); resetForm(); await load(); setNotice({ title: '큐레이션을 삭제했어요', message: '연결된 편집 목록만 삭제되며 영화 원본은 유지됩니다.', tone: 'success' }); }
    catch (error) { setNotice({ title: '큐레이션을 삭제하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); setBusy(false); }
  }

  async function refreshRankings() {
    setBusy(true);
    try { await refreshDiscoveryRankings(7, 5); setNotice({ title: '최근 7일 랭킹을 갱신했어요', message: '공개 완료 기록이 5편 미만이면 순위 대신 데이터 부족 안내를 유지합니다.', tone: 'success' }); }
    catch (error) { setNotice({ title: '랭킹을 갱신하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); }
    finally { setBusy(false); }
  }

  if (sessionStatus === 'loading') return <Screen><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (mode !== 'supabase') return <Redirect href="/welcome" />;
  if (access === undefined) return <Screen><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (!access) return <Screen eyebrow="FLICK EDIT" title="접근할 수 없습니다"><StateNotice message="서버에서 확인된 super_admin만 편집할 수 있어요." title="관리자 권한 필요" tone="danger" /></Screen>;

  return (
    <Screen eyebrow="FLICK EDIT" title="랭킹과 편집 큐레이션">
      {notice ? <StateNotice {...notice} /> : null}
      <Button label="최근 7일 랭킹 지금 갱신" loading={busy} onPress={() => void refreshRankings()} variant="secondary" />

      <View style={styles.section}>
        <View style={styles.header}><Text style={styles.heading}>큐레이션 목록</Text><Button label="새 초안" onPress={resetForm} style={styles.smallButton} variant="ghost" /></View>
        {!curations.length ? <Text style={styles.help}>아직 만든 큐레이션이 없습니다.</Text> : curations.map((curation) => <Pressable accessibilityRole="button" key={curation.curationId} onPress={() => void selectCuration(curation)} style={[styles.listItem, curationId === curation.curationId && styles.listItemSelected]}><Text style={styles.cardTitle}>{curation.title}</Text><Text style={styles.help}>{curation.kind === 'expert' ? '전문가 시점' : '니치'} · {curation.status === 'published' ? '공개' : '초안'} · 영화 {curation.movieCount}편</Text></Pressable>)}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>{curationId ? '큐레이션 수정' : '새 큐레이션 초안'}</Text>
        <View style={styles.kindRow}>{(['niche', 'expert'] as const).map((value) => <Pressable accessibilityRole="button" accessibilityState={{ selected: kind === value }} key={value} onPress={() => setKind(value)} style={[styles.kind, kind === value && styles.kindSelected]}><Text style={[styles.kindText, kind === value && styles.kindTextSelected]}>{value === 'niche' ? '니치 큐레이션' : '전문가 시점'}</Text></Pressable>)}</View>
        <TextInput accessibilityLabel="큐레이션 제목" maxLength={80} onChangeText={setTitle} placeholder="구체적인 상황과 관점이 드러나는 제목" placeholderTextColor={colors.textMuted} style={styles.input} value={title} />
        <TextInput accessibilityLabel="큐레이션 설명" maxLength={1000} multiline onChangeText={setDescription} placeholder="선정 기준과 추천 이유" placeholderTextColor={colors.textMuted} style={[styles.input, styles.longInput]} value={description} />
        {kind === 'expert' ? <>
          <TextInput accessibilityLabel="전문가 또는 작성자 이름" maxLength={80} onChangeText={setCuratorName} placeholder="실제 작성자·전문가 이름" placeholderTextColor={colors.textMuted} style={styles.input} value={curatorName} />
          <TextInput accessibilityLabel="원문 출처 URL" autoCapitalize="none" onChangeText={setSourceUrl} placeholder="https://로 시작하는 원문·출처" placeholderTextColor={colors.textMuted} style={styles.input} value={sourceUrl} />
          <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.cardTitle}>게시 권한 확인</Text><Text style={styles.help}>작성자·출처·서비스 게시 권한을 실제로 확인한 경우에만 켭니다.</Text></View><Switch accessibilityLabel="게시 권한 확인" onValueChange={setRightsConfirmed} value={rightsConfirmed} /></View>
        </> : null}
        <Button label={curationId ? '내용 저장' : '초안 만들기'} loading={busy} onPress={() => void save('draft')} />
        {curationId ? <View style={styles.actionRow}><Button label={curationStatus === 'published' ? '비공개 초안으로 전환' : '검토 후 공개'} onPress={() => void save(curationStatus === 'published' ? 'draft' : 'published')} style={styles.action} variant="secondary" /><Button label={pendingDelete ? '영구 삭제 확인' : '큐레이션 삭제'} onPress={() => void removeCuration()} style={styles.action} variant="ghost" /></View> : null}
      </View>

      {curationId ? <View style={styles.section}>
        <Text style={styles.heading}>영화와 선정 이유</Text>
        {items.map((item) => <View key={item.movie.id} style={styles.movieItem}><MovieCard movie={item.movie} />{item.note ? <Text style={styles.note}>{item.note}</Text> : null}<Button label="이 영화 제외" onPress={() => void removeMovie(item.movie.id)} variant="ghost" /></View>)}
        <TextInput accessibilityLabel="영화 선정 이유" maxLength={500} multiline onChangeText={setMovieNote} placeholder="검색 결과에서 추가할 영화의 선정 이유" placeholderTextColor={colors.textMuted} style={[styles.input, styles.noteInput]} value={movieNote} />
        <View style={styles.searchRow}><TextInput accessibilityLabel="큐레이션 영화 검색" onChangeText={setQuery} onSubmitEditing={() => void searchMovies()} placeholder="영화 제목" placeholderTextColor={colors.textMuted} style={styles.searchInput} value={query} /><Button label="검색" onPress={() => void searchMovies()} style={styles.searchButton} /></View>
        {searchResults.map((movie) => <View key={movie.id} style={styles.movieItem}><MovieCard movie={movie} /><Button label="이 영화 추가" onPress={() => void addMovie(movie)} variant="secondary" /></View>)}
      </View> : null}
      <Button label="Super Admin 콘솔" onPress={() => router.replace('/admin' as Href)} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heading: { ...typography.heading, color: colors.text },
  smallButton: { minHeight: 40, paddingHorizontal: spacing.md },
  listItem: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  listItemSelected: { borderColor: colors.primary, borderWidth: 2 },
  cardTitle: { ...typography.label, color: colors.text },
  help: { ...typography.caption, color: colors.textMuted },
  kindRow: { flexDirection: 'row', gap: spacing.sm },
  kind: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flex: 1, minHeight: 44, justifyContent: 'center' },
  kindSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindText: { ...typography.label, color: colors.textMuted },
  kindTextSelected: { color: colors.surface },
  input: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 52, padding: spacing.md },
  longInput: { minHeight: 120, textAlignVertical: 'top' },
  noteInput: { minHeight: 88, textAlignVertical: 'top' },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  switchCopy: { flex: 1, gap: spacing.xs },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
  movieItem: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, paddingTop: spacing.md },
  note: { ...typography.body, backgroundColor: colors.primarySoft, borderRadius: radii.md, color: colors.text, padding: spacing.md },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInput: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, color: colors.text, flex: 1, minHeight: 52, paddingHorizontal: spacing.lg },
  searchButton: { minHeight: 52, paddingHorizontal: spacing.lg },
});
