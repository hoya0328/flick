import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { getMovie, type Movie } from '@/features/discovery/movies';
import { tasteKeywords } from '@/features/onboarding/keywords';
import { CoreQuestionnaire } from '@/features/reviews/core-questionnaire';
import { ensureCoreQuestions } from '@/features/reviews/core-questions';
import { LightQuestionnaire } from '@/features/reviews/light-questionnaire';
import { ensureLightQuestions } from '@/features/reviews/light-questions';
import { emptyReviewForm, reviewCompletionError, reviewExcerpt, type ReviewForm, type ReviewMode, type ReviewStatus, type ReviewVisibility } from '@/features/reviews/review-logic';
import { clearLocalReviewBackup, deleteReview, getDraftForMovie, getReview, listReviews, loadLocalReviewBackup, saveLocalReviewBackup, saveReview, type ReviewRecord } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function ensureModeQuestions(form: ReviewForm, movie: Movie | null, title: string): ReviewForm {
  return form.mode === 'core' ? ensureCoreQuestions(form, movie, title) : ensureLightQuestions(form, movie, title);
}

export default function RecordScreen() {
  const params = useLocalSearchParams<{ movieId?: string; reviewId?: string; title?: string }>();
  const movieIdParam = one(params.movieId);
  const reviewIdParam = one(params.reviewId);
  const titleParam = one(params.title);
  const { mode: sessionMode } = useSession();
  const storageMode = sessionMode === 'supabase' ? 'supabase' : 'demo';
  const [form, setForm] = useState<ReviewForm | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [recordStatus, setRecordStatus] = useState<ReviewStatus>('draft');
  const [movieTitle, setMovieTitle] = useState('');
  const [movie, setMovie] = useState<Movie | null>(null);
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [autosave, setAutosave] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger' | 'warning'; title: string; message: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const revision = useRef(0);

  const loadList = useCallback(async () => {
    setRecords(await listReviews(storageMode));
  }, [storageMode]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      setLoading(true);
      setNotice(null);
      try {
        if (reviewIdParam) {
          const record = await getReview(reviewIdParam, storageMode);
          if (!record) throw new Error('기록을 찾을 수 없어요.');
          const [backup, movie] = await Promise.all([loadLocalReviewBackup(record.movieId), getMovie(record.movieId)]);
          if (!active) return;
          setMovie(movie);
          setForm(ensureModeQuestions(backup?.form ?? record, movie, record.movie.title));
          setReviewId(backup?.reviewId ?? record.id);
          setRecordStatus(record.status);
          setMovieTitle(backup?.movieTitle || record.movie.title);
          setDirty(false);
          if (backup) setAutosave('기기에 남아 있던 수정 내용을 복구했어요.');
        } else if (movieIdParam) {
          const [draft, backup, movie] = await Promise.all([
            getDraftForMovie(movieIdParam, storageMode),
            loadLocalReviewBackup(movieIdParam),
            getMovie(movieIdParam),
          ]);
          if (!active) return;
          setMovie(movie);
          setForm(ensureModeQuestions(backup?.form ?? draft ?? emptyReviewForm(movieIdParam), movie, backup?.movieTitle || draft?.movie.title || titleParam || '선택한 영화'));
          setReviewId(backup?.reviewId ?? draft?.id ?? null);
          setRecordStatus(draft?.status ?? 'draft');
          setMovieTitle(backup?.movieTitle || draft?.movie.title || titleParam || movie?.title || '선택한 영화');
          setDirty(false);
          setAutosave(backup ? '기기에 남아 있던 초안을 복구했어요.' : draft ? '서버에 저장된 초안을 불러왔어요.' : '');
        } else {
          setForm(null);
          setMovie(null);
          setReviewId(null);
          setMovieTitle('');
          await loadList();
        }
      } catch (error) {
        if (active) setNotice({ tone: 'danger', title: '기록을 불러오지 못했어요', message: error instanceof Error ? error.message : '잠시 뒤 다시 시도해 주세요.' });
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, [loadList, movieIdParam, reviewIdParam, storageMode, titleParam]);

  const change = useCallback((update: (current: ReviewForm) => ReviewForm) => {
    revision.current += 1;
    setForm((current) => current ? update(current) : current);
    setDirty(true);
    setAutosave('저장 중…');
    setNotice(null);
  }, []);

  function switchMode(mode: ReviewMode) {
    if (!form || form.mode === mode) return;
    const hasProgress = Object.values(form.answers).some((answer) => answer.trim()) || Object.values(form.questionTags).some((tags) => tags.length);
    if (hasProgress) {
      setNotice({ tone: 'warning', title: '기록 방식은 그대로 유지해 주세요', message: '이미 작성한 질문 기록을 보호하기 위해 내용이 있는 상태에서는 Light와 Core를 바꿀 수 없어요.' });
      return;
    }
    change((current) => {
      const changed = { ...current, mode, questions: [], answers: {}, questionTags: {} };
      return mode === 'core' ? ensureCoreQuestions(changed, movie, movieTitle) : ensureLightQuestions(changed, movie, movieTitle);
    });
  }

  useEffect(() => {
    if (!form || !dirty || loading) return;
    const currentRevision = revision.current;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          await saveLocalReviewBackup(form, reviewId, movieTitle);
          if (recordStatus === 'draft') {
            const savedId = await saveReview(form, reviewId, false, storageMode, movieTitle);
            setReviewId(savedId);
          }
          if (revision.current === currentRevision) {
            setDirty(false);
            setAutosave(recordStatus === 'draft' ? '초안이 자동 저장됐어요.' : '수정 내용이 기기에 임시 저장됐어요.');
          }
        } catch (error) {
          const detail = error instanceof Error ? ` (${error.message})` : '';
          setAutosave(`서버 저장에 실패했지만 이 기기에 초안을 보관했어요.${detail}`);
        }
      })();
    }, 900);
    return () => clearTimeout(timer);
  }, [dirty, form, loading, movieTitle, recordStatus, reviewId, storageMode]);

  async function persist(complete: boolean) {
    if (!form) return;
    if (complete) {
      const validation = reviewCompletionError(form);
      if (validation) {
        setNotice({ tone: 'warning', title: '조금만 더 기록해 주세요', message: validation });
        return;
      }
    }
    setSaving(true);
    setNotice(null);
    try {
      if (!complete && recordStatus === 'completed') {
        await saveLocalReviewBackup(form, reviewId, movieTitle);
        setDirty(false);
        setAutosave('수정 내용을 이 기기에 임시 보관했어요.');
        setNotice({ tone: 'success', title: '수정 내용을 임시 보관했어요', message: '기존 완료 기록은 유지되며, 수정 완료를 누르면 서버에 반영돼요.' });
        return;
      }
      const savedId = await saveReview(form, reviewId, complete, storageMode, movieTitle);
      setReviewId(savedId);
      setRecordStatus(complete ? 'completed' : 'draft');
      setDirty(false);
      await clearLocalReviewBackup(form.movieId);
      setAutosave(complete ? '' : '초안을 저장했어요.');
      setNotice({ tone: 'success', title: complete ? '감상 기록을 남겼어요' : '초안을 저장했어요', message: complete ? '기록 탭에서 언제든 다시 읽고 수정할 수 있어요.' : '다음에 이어서 작성할 수 있어요.' });
      if (complete) setTimeout(() => router.replace('/(tabs)/record'), 500);
    } catch (error) {
      await saveLocalReviewBackup(form, reviewId, movieTitle);
      setNotice({ tone: 'danger', title: '서버에 저장하지 못했어요', message: `${error instanceof Error ? error.message : '잠시 뒤 다시 시도해 주세요.'} 작성 내용은 이 기기에 보관했어요.` });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(id: string) {
    setSaving(true);
    try {
      const target = records.find((record) => record.id === id);
      await deleteReview(id, storageMode);
      if (target) await clearLocalReviewBackup(target.movieId);
      setPendingDelete(null);
      await loadList();
      setNotice({ tone: 'success', title: '기록을 삭제했어요', message: '선택한 기록과 연결된 질문·태그·답변이 함께 삭제됐어요.' });
    } catch (error) {
      setNotice({ tone: 'danger', title: '삭제하지 못했어요', message: error instanceof Error ? error.message : '잠시 뒤 다시 시도해 주세요.' });
    } finally { setSaving(false); }
  }

  if (loading) return <Screen title="감상 기록"><ActivityIndicator color={colors.primary} size="large" /></Screen>;

  if (!form) {
    return (
      <Screen eyebrow="나의 FLICK" title="감상 기록">
        {notice ? <StateNotice {...notice} /> : null}
        <Text style={styles.intro}>별점과 감정을 가볍게 남기거나, 영화의 요소를 깊이 기록해 보세요.</Text>
        <Button label="새 기록 시작하기" onPress={() => router.push('/(tabs)/search')} />
        {!records.length ? <StateNotice title="아직 기록이 없어요" message="영화를 선택하면 Light 또는 Core 모드로 첫 기록을 시작할 수 있어요." /> : null}
        {records.map((record) => (
          <View key={record.id} style={styles.recordCard}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{record.movie.title}</Text>
                <Text style={styles.meta}>{record.watchedAt} · {record.mode === 'light' ? 'Light' : 'Core'} · {record.rating ? `★ ${record.rating}` : '별점 미정'} · {record.visibility === 'public' ? '전체 공개' : '나만 보기'}</Text>
              </View>
              <Text style={[styles.status, record.status === 'completed' && styles.statusComplete]}>{record.status === 'completed' ? '완료' : '초안'}</Text>
            </View>
            <Text numberOfLines={2} style={styles.excerpt}>{reviewExcerpt(record)}</Text>
            {pendingDelete === record.id ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>이 기록을 영구 삭제할까요?</Text>
                <View style={styles.actions}><Button label="취소" onPress={() => setPendingDelete(null)} style={styles.action} variant="ghost" /><Button label="삭제" loading={saving} onPress={() => void confirmDelete(record.id)} style={styles.action} variant="secondary" /></View>
              </View>
            ) : (
              <View style={styles.actions}><Button label="열기·수정" onPress={() => router.push({ pathname: '/(tabs)/record', params: { movieId: record.movieId, reviewId: record.id, title: record.movie.title } })} style={styles.action} variant="secondary" /><Button label="삭제" onPress={() => setPendingDelete(record.id)} style={styles.action} variant="ghost" /></View>
            )}
          </View>
        ))}
      </Screen>
    );
  }

  return (
    <Screen eyebrow="감상 기록" title={movieTitle}>
      <View style={styles.selected}><Text style={styles.label}>{recordStatus === 'completed' ? '완료된 기록 수정' : reviewId ? '작성 중인 초안' : '새 기록'}</Text><Text style={styles.autosave}>{autosave || '입력 내용은 자동으로 임시 저장돼요.'}</Text></View>
      {notice ? <StateNotice {...notice} /> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기록 방식</Text>
        <View style={styles.actions}>{(['light', 'core'] as ReviewMode[]).map((item) => <Pressable accessibilityRole="button" key={item} onPress={() => switchMode(item)} style={[styles.mode, form.mode === item && styles.modeSelected]}><Text style={[styles.modeTitle, form.mode === item && styles.modeTitleSelected]}>{item === 'light' ? 'Light' : 'Core'}</Text><Text style={styles.modeCaption}>{item === 'light' ? '감정 중심, 빠르게' : '답변을 따라 깊이 있게'}</Text></Pressable>)}</View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>감상일</Text>
        <TextInput accessibilityLabel="감상일" maxLength={10} onChangeText={(watchedAt) => change((current) => ({ ...current, watchedAt }))} placeholder="YYYY-MM-DD" style={styles.input} value={form.watchedAt} />
        <Text style={styles.help}>예: 2026-08-07 · 미래 날짜는 저장할 수 없어요.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>별점</Text>
        <View style={styles.ratingRow}>{[1, 2, 3, 4, 5].map((rating) => <Pressable accessibilityLabel={`${rating}점`} accessibilityRole="button" key={rating} onPress={() => change((current) => ({ ...current, rating }))} style={[styles.rating, form.rating === rating && styles.ratingSelected]}><Text style={[styles.ratingText, form.rating === rating && styles.ratingTextSelected]}>★ {rating}</Text></Pressable>)}</View>
      </View>

      {form.mode === 'light' ? (
        <>
          <LightQuestionnaire form={form} onChange={change} />
          <View style={styles.section}><Text style={styles.sectionTitle}>한 줄 기록 · 선택</Text><TextInput maxLength={280} onChangeText={(oneLine) => change((current) => ({ ...current, oneLine }))} placeholder="선택한 느낌을 내 문장으로 남겨보세요." placeholderTextColor={colors.textMuted} style={styles.input} value={form.oneLine} /><Text style={styles.counter}>{form.oneLine.length}/280</Text></View>
        </>
      ) : (
        <>
          <CoreQuestionnaire form={form} movieTitle={movieTitle} onChange={change} sessionMode={storageMode} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>감정 키워드</Text>
            <View style={styles.chips}>{tasteKeywords.map((keyword) => { const selected = form.keywordIds.includes(keyword.id); return <Pressable accessibilityRole="button" key={keyword.id} onPress={() => change((current) => ({ ...current, keywordIds: selected ? current.keywordIds.filter((id) => id !== keyword.id) : [...current.keywordIds, keyword.id] }))} style={[styles.chip, selected && styles.chipSelected]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{keyword.label}</Text></Pressable>; })}</View>
          </View>
          <View style={styles.section}><Text style={styles.sectionTitle}>자유 감상</Text><TextInput maxLength={10000} multiline onChangeText={(body) => change((current) => ({ ...current, body }))} placeholder="질문에 담지 못한 생각을 자유롭게 기록해 보세요." placeholderTextColor={colors.textMuted} style={[styles.input, styles.longTextarea]} textAlignVertical="top" value={form.body} /><Text style={styles.counter}>{form.body.length}/10,000</Text></View>
        </>
      )}

      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.spoiler }} onPress={() => change((current) => ({ ...current, spoiler: !current.spoiler }))} style={styles.checkRow}><View style={[styles.checkbox, form.spoiler && styles.checkboxSelected]}><Text style={styles.checkmark}>{form.spoiler ? '✓' : ''}</Text></View><Text style={styles.checkLabel}>스포일러가 포함된 기록이에요</Text></Pressable>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>공개 범위</Text>
        <View style={styles.actions}>{([['private', '나만 보기'], ['public', '전체 공개']] as [ReviewVisibility, string][]).map(([value, label]) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: form.visibility === value }} key={value} onPress={() => change((current) => ({ ...current, visibility: value }))} style={[styles.visibility, form.visibility === value && styles.visibilitySelected]}><Text style={[styles.modeTitle, form.visibility === value && styles.modeTitleSelected]}>{label}</Text><Text style={styles.modeCaption}>{value === 'private' ? '내 계정에서만 확인' : '완료 후 Flick 사용자에게 공개'}</Text></Pressable>)}</View>
        <Text style={styles.help}>초안은 선택한 범위와 관계없이 항상 나만 볼 수 있어요.</Text>
      </View>
      <Button label={recordStatus === 'completed' ? '수정 완료' : '기록 완료'} loading={saving} onPress={() => void persist(true)} />
      <Button label={recordStatus === 'completed' ? '수정 내용 임시 보관' : '초안으로 저장'} loading={saving} onPress={() => void persist(false)} variant="secondary" />
      <Button label="기록 목록으로" onPress={() => router.replace('/(tabs)/record')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { ...typography.body, color: colors.textMuted },
  selected: { backgroundColor: colors.primarySoft, borderRadius: radii.md, gap: spacing.xs, padding: spacing.lg },
  label: { ...typography.label, color: colors.primary },
  autosave: { ...typography.caption, color: colors.textMuted },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text },
  input: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 50, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  textarea: { minHeight: 112 }, longTextarea: { minHeight: 190 },
  help: { ...typography.caption, color: colors.textMuted }, counter: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: spacing.sm }, action: { flex: 1 }, flex: { flex: 1 },
  mode: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flex: 1, gap: spacing.xs, minHeight: 82, padding: spacing.md },
  modeSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  visibility: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flex: 1, gap: spacing.xs, minHeight: 72, padding: spacing.md },
  visibilitySelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  modeTitle: { ...typography.label, color: colors.text }, modeTitleSelected: { color: colors.primary }, modeCaption: { ...typography.caption, color: colors.textMuted },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rating: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  ratingSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, ratingText: { ...typography.label, color: colors.textMuted }, ratingTextSelected: { color: colors.surface },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, chipText: { ...typography.caption, color: colors.textMuted }, chipTextSelected: { color: colors.primary, fontWeight: '700' },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 }, checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, checkmark: { color: colors.surface, fontWeight: '800' }, checkLabel: { ...typography.body, color: colors.text },
  recordCard: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  rowBetween: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }, cardTitle: { ...typography.heading, color: colors.text }, meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs }, excerpt: { ...typography.body, color: colors.text },
  status: { ...typography.caption, backgroundColor: colors.warningSoft, borderRadius: radii.pill, color: colors.warning, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, statusComplete: { backgroundColor: colors.successSoft, color: colors.success },
  confirmBox: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, gap: spacing.sm, padding: spacing.md }, confirmText: { ...typography.label, color: colors.danger },
});
