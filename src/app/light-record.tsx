import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DesignVector } from '@/components/design-vector';
import { homeFont } from '@/components/home-ui';
import { PosterArt } from '@/components/poster-art';
import { discoverMovies, getMovie, type Movie } from '@/features/discovery/movies';
import { aiOperationMessage } from '@/features/reviews/ai-operations';
import { generateLightDraft } from '@/features/reviews/light-draft-service';
import { LoadingMark } from '@/features/reviews/loading-mark';
import { changeLightQuestion, filmAspects, lightLabels, newLightForm, ratingMessage, respondToLight } from '@/features/reviews/light-flow';
import { RatingControl } from '@/features/reviews/rating-control';
import { isValidWatchedAt, reviewCompletionIssue, todayDate, type ReviewForm } from '@/features/reviews/review-logic';
import { clearLocalReviewBackup, getDraftForMovie, getReview, loadLocalReviewBackup, saveLocalReviewBackup, saveReview } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';

type Step = 'search' | 'confirm' | 'rating' | 'questions' | 'loading' | 'summary';
const chipColors = ['#C02AEE', '#008CFF', '#FFAA00', '#F8233C', '#1E222A', '#0E9C87'];
// Original Figma 2:1320 positions; each row remains independently scrollable.
const wordGeometry = [{"x":-180,"y":62.75,"width":76,"label":"몽환적인"},{"x":506,"y":154.75,"width":76,"label":"소용돌이"},{"x":52,"y":62.75,"width":76,"label":"매끄러운"},{"x":284,"y":62.75,"width":76,"label":"낭만적인"},{"x":-90,"y":108.75,"width":53,"label":"거친"},{"x":-178,"y":154.75,"width":53,"label":"온도"},{"x":66,"y":154.75,"width":53,"label":"여백"},{"x":-117,"y":154.75,"width":53,"label":"잔상"},{"x":127,"y":154.75,"width":53,"label":"질감"},{"x":-56,"y":154.75,"width":53,"label":"리듬"},{"x":188,"y":154.75,"width":53,"label":"궤도"},{"x":310,"y":154.75,"width":53,"label":"파편"},{"x":371,"y":154.75,"width":53,"label":"심연"},{"x":5,"y":154.75,"width":53,"label":"색채"},{"x":249,"y":154.75,"width":53,"label":"침묵"},{"x":-16,"y":16.75,"width":66,"label":"서늘한"},{"x":280,"y":16.75,"width":66,"label":"강렬한"},{"x":-90,"y":16.75,"width":66,"label":"따스한"},{"x":-96,"y":62.75,"width":66,"label":"적막한"},{"x":136,"y":62.75,"width":66,"label":"건조한"},{"x":368,"y":62.75,"width":66,"label":"기괴한"},{"x":-29,"y":108.75,"width":66,"label":"아련한"},{"x":267,"y":108.75,"width":66,"label":"잔잔한"},{"x":-22,"y":62.75,"width":66,"label":"눈부신"},{"x":210,"y":62.75,"width":66,"label":"날것의"},{"x":-164,"y":108.75,"width":66,"label":"섬뜩한"},{"x":442,"y":62.75,"width":66,"label":"쓸쓸한"},{"x":45,"y":108.75,"width":66,"label":"경쾌한"},{"x":341,"y":108.75,"width":66,"label":"공허한"},{"x":516,"y":62.75,"width":66,"label":"포근한"},{"x":119,"y":108.75,"width":66,"label":"촘촘한"},{"x":415,"y":108.75,"width":66,"label":"끈적한"},{"x":432,"y":154.75,"width":66,"label":"세계관"},{"x":193,"y":108.75,"width":66,"label":"헐거운"},{"x":-164,"y":16.75,"width":66,"label":"잿빛의"},{"x":58,"y":16.75,"width":66,"label":"꿉꿉한"},{"x":354,"y":16.75,"width":66,"label":"투명한"},{"x":132,"y":16.75,"width":66,"label":"유쾌한"},{"x":428,"y":16.75,"width":66,"label":"빛바랜"},{"x":489,"y":108.75,"width":76,"label":"부유하는"},{"label":"묵직한","x":206,"y":16.75,"width":66},{"label":"창백한","x":502,"y":16.75,"width":66}];

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function CheckBoxMark({ checked }: { checked: boolean }) {
  return <View style={{ width: 18, height: 18, borderWidth: 1.5, borderColor: '#F8233C', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>{checked ? <DesignVector name="check" width={12} height={10} tint="#F8233C" /> : null}</View>;
}
function Action({ label, onPress, secondary = false, disabled = false, compact = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; compact?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.action, secondary && s.secondary, disabled && s.disabled]}>{label.startsWith('✓ ') ? <DesignVector name="check" width={15} height={13} /> : null}<Text style={[s.actionText, compact && { fontSize: 16, letterSpacing: -0.16 }, secondary && s.secondaryText]}>{label.startsWith('✓ ') ? label.slice(2) : label}</Text></Pressable>;
}
function Tag({ label, index = 0, onRemove }: { label: string; index?: number; onRemove?: () => void }) {
  return <View style={[s.tag, { backgroundColor: chipColors[index % chipColors.length] }]}><Text style={s.tagText}>{label}</Text>{onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={`${label} 삭제`} hitSlop={8} onPress={onRemove} style={s.tagRemove}><DesignVector name="tagClose" width={10} height={10} /></Pressable> : null}</View>;
}

export default function LightRecordScreen() {
  const params = useLocalSearchParams<{ movieId?: string; reviewId?: string }>();
  const session = useSession();
  const storageMode = session.mode === 'supabase' ? 'supabase' : 'demo';
  const [step, setStep] = useState<Step>('search');
  const [movie, setMovie] = useState<Movie | null>(null);
  const [form, setForm] = useState<ReviewForm | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [custom, setCustom] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [info, setInfo] = useState(false);
  const [consented, setConsented] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiDraft, setAiDraft] = useState('');
  const [replacePrompt, setReplacePrompt] = useState(false);
  const [replaceAction, setReplaceAction] = useState<'apply' | 'generate'>('generate');
  const [expanded, setExpanded] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const wordRails = useRef<(ScrollView | null)[]>([]);
  const customInput = useRef<TextInput>(null);
  const bodyInput = useRef<TextInput>(null);
  const generation = useRef(0);
  const busyRef = useRef(false);
  const initializedKey = useRef('');
  const backupQueue = useRef(Promise.resolve());

  const update = useCallback((apply: (current: ReviewForm) => ReviewForm) => {
    setForm((current) => current ? apply(current) : current); setError('');
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    const frame = requestAnimationFrame(() => { setCustom(''); setCustomOpen(false); });
    return () => cancelAnimationFrame(frame);
  }, [step, questionIndex]);
  useEffect(() => () => { generation.current += 1; }, []);

  useEffect(() => {
    if (!form || !movie) return;
    // Serialize local writes so a slow older write cannot replace the newest edit.
    backupQueue.current = backupQueue.current.catch(() => {}).then(() => saveLocalReviewBackup(form, reviewId, movie.title)).catch(() => { setMessage('이 기기에 임시 저장하지 못했어요. 나가기 전 초안 저장을 눌러 주세요.'); });
  }, [form, movie, reviewId]);

  useEffect(() => {
    if (session.status !== 'ready' || session.mode === 'none') return;
    const movieId = one(params.movieId);
    const recordId = one(params.reviewId);
    const key = `${storageMode}:${recordId ?? movieId ?? ''}`;
    if ((!movieId && !recordId) || initializedKey.current === key) return;
    initializedKey.current = key;
    let active = true;
    setInitializing(true);
    void (async () => {
      try {
        const record = recordId ? await getReview(recordId, storageMode) : await getDraftForMovie(movieId!, storageMode);
        if (recordId && !record) throw new Error('본인의 기록만 수정할 수 있어요.');
        const id = record?.movieId ?? movieId!;
        const [nextMovie, backup] = await Promise.all([getMovie(id), loadLocalReviewBackup(id)]);
        if (!active) return;
        if (!nextMovie) throw new Error('영화를 불러오지 못했어요. 다시 시도해 주세요.');
        const restored = backup?.form?.lightFlow?.version === 1 && (!recordId || backup.reviewId === recordId) ? backup.form : record?.lightFlow?.version === 1 ? record : null;
        if (record && !restored) { router.replace({ pathname: '/(tabs)/record', params: { reviewId: record.id } }); return; }
        const nextForm = restored ?? newLightForm(nextMovie);
        setMovie(nextMovie); setForm(nextForm); setReviewId(record?.id ?? backup?.reviewId ?? null);
        if (restored) {
          const pending = nextForm.questions.findIndex((question) => !nextForm.lightFlow?.responses[question.key]);
          setQuestionIndex(Math.max(0, pending)); setStep(pending < 0 ? 'summary' : nextForm.rating ? 'questions' : 'rating');
          setMessage('작성 중이던 기록을 이어서 불러왔어요.');
        } else setStep('confirm');
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : '기록을 불러오지 못했어요.'); }
      finally { if (active) setInitializing(false); }
    })();
    return () => { active = false; };
  }, [params.movieId, params.reviewId, session.status, session.mode, storageMode]);

  useEffect(() => {
    if (step !== 'search' || session.mode === 'none') return;
    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      void discoverMovies(query).then((result) => { if (active) { setResults(result.movies); setMessage(result.notice ?? ''); } }).catch(() => { if (active) setError('검색하지 못했어요. 검색어를 다시 입력해 주세요.'); }).finally(() => { if (active) setSearching(false); });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [query, session.mode, step]);

  if (session.status === 'loading') return <SafeAreaView style={s.safe}><ActivityIndicator /></SafeAreaView>;
  if (session.mode === 'none') return <Redirect href="/welcome" />;
  if (!session.onboardingComplete) return <Redirect href="/onboarding" />;

  const question = form?.questions[questionIndex];
  const selected = question && form ? form.questionTags[question.key] ?? [] : [];
  const labels = form ? lightLabels(form) : [];
  const representatives = form?.lightFlow?.representativeKeywords ?? [];
  const directorYear = movie ? [movie.details?.directorNames.join(', '), movie.releaseDate?.slice(0, 4)].filter(Boolean).join(' · ') : '';

  async function selectMovie(nextMovie: Movie) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const record = await getDraftForMovie(nextMovie.id, storageMode);
      if (record) { router.setParams({ movieId: nextMovie.id, reviewId: record.id }); return; }
      setMovie(nextMovie); setForm(newLightForm(nextMovie)); setReviewId(null); setMessage(''); setStep('confirm');
      initializedKey.current = `${storageMode}:${nextMovie.id}`;
      router.setParams({ movieId: nextMovie.id });
    } catch { setError('기존 초안을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setBusy(false); busyRef.current = false; }
  }
  function toggleTag(id: string) {
    if (!form || !question) return;
    if (!selected.includes(id) && selected.length >= 3) { setError('한 질문에는 최대 3개의 블럭을 선택할 수 있어요.'); return; }
    update((current) => ({ ...current, questionTags: { ...current.questionTags, [question.key]: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id] } }));
  }
  function addCustom() {
    const word = custom.trim();
    if (!form || !question) return;
    if (!word || word.length > 30) { setError('느낌 키워드를 1~30자로 입력해 주세요.'); customInput.current?.focus(); return; }
    if (selected.length >= 3) { setError('선택한 블럭을 하나 뺀 뒤 추가해 주세요.'); return; }
    const existing = question.options.find((option) => option.label === word);
    const id = existing?.id ?? `custom_${Date.now()}`;
    update((current) => ({ ...current, questions: current.questions.map((item) => item.key === question.key && !existing ? { ...item, options: [...item.options, { id, label: word }] } : item), questionTags: { ...current.questionTags, [question.key]: [...new Set([...selected, id])] } }));
    setCustom(''); setCustomOpen(false);
  }
  async function summarize(nextForm: ReviewForm, force = false) {
    if (busyRef.current) return;
    if (nextForm.body.trim() && !force) { setStep('summary'); return; }
    const available = lightLabels(nextForm);
    if (!available.length || !consented || storageMode === 'demo') {
      setStep('loading'); setProgress(25);
      const token = ++generation.current;
      // No invented AI result: only organize the user's own existing tags locally.
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (token !== generation.current) return;
      setForm({ ...nextForm, lightFlow: { ...nextForm.lightFlow!, representativeKeywords: available.slice(0, 5), draftSource: storageMode === 'demo' ? 'demo' : 'manual' } });
      setProgress(100); setStep('summary');
      setMessage(!available.length ? '질문을 모두 건너뛰었어요. 감상을 직접 작성해 주세요.' : storageMode === 'demo' ? '데모에서는 선택한 키워드만 정리해요. AI 초안은 실제 계정 로그인 후 사용할 수 있어요.' : 'AI를 사용하지 않고 키워드만 정리했어요. 감상을 직접 작성할 수 있어요.');
      return;
    }
    busyRef.current = true; setBusy(true); setStep('loading'); setProgress(12); setError(''); setReplacePrompt(false);
    const token = ++generation.current;
    const start = Date.now();
    const timer = setInterval(() => setProgress(Math.min(92, 15 + Math.floor((Date.now() - start) / 180))), 200);
    try {
      const result = await generateLightDraft(nextForm);
      if (token !== generation.current) return;
      setAiDraft(result.draft);
      setForm({ ...nextForm, body: result.draft, lightFlow: { ...nextForm.lightFlow!, representativeKeywords: result.keywords, draftSource: 'gemini' } });
      setMessage('AI 초안을 작성했어요. 내 감상과 맞는지 확인하고 자유롭게 고쳐 주세요.');
    } catch (caught) {
      if (token !== generation.current) return;
      setForm({ ...nextForm, lightFlow: { ...nextForm.lightFlow!, representativeKeywords: available.slice(0, 5), draftSource: 'manual' } });
      setMessage(aiOperationMessage(caught));
    } finally {
      clearInterval(timer); busyRef.current = false;
      if (token === generation.current) { setProgress(100); setBusy(false); setStep('summary'); }
    }
  }
  function nextQuestion(skip: boolean) {
    if (!form || !question) return;
    if (!skip && !selected.length) { setError('느낌 블럭을 1개 이상 선택하거나 건너뛰기를 눌러 주세요.'); return; }
    setError('');
    const nextForm = respondToLight(form, questionIndex, skip);
    setForm(nextForm);
    if (questionIndex === 4) void summarize(nextForm); else setQuestionIndex((index) => index + 1);
  }
  async function persist(complete: boolean) {
    if (!form || !movie || busyRef.current) return;
    const issue = complete ? reviewCompletionIssue(form) : null;
    if (issue) {
      setError(issue.message);
      if (issue.field === 'rating' || issue.field === 'watchedAt') setStep(issue.field === 'rating' ? 'rating' : 'confirm');
      else if (form.questions.some((item) => !form.lightFlow?.responses[item.key])) { setQuestionIndex(Math.max(0, form.questions.findIndex((item) => !form.lightFlow?.responses[item.key]))); setStep('questions'); }
      else { bodyInput.current?.focus(); scroll.current?.scrollToEnd({ animated: true }); }
      return;
    }
    busyRef.current = true; setBusy(true); setError('');
    try {
      await backupQueue.current;
      const id = await saveReview(form, reviewId, complete, storageMode, movie.title);
      if (!complete) setReviewId(id);
      if (complete) { await clearLocalReviewBackup(form.movieId); router.replace('/(tabs)/archive'); }
      else { setMessage('초안을 저장했어요. 기록 목록에서 이어서 작성할 수 있어요.'); setInfo(false); }
    } catch (caught) { setError(`${caught instanceof Error ? caught.message : '서버에 저장하지 못했어요.'} 작성 내용은 화면에 남아 있어요. 다시 시도해 주세요.`); }
    finally { setBusy(false); busyRef.current = false; }
  }
  function back() {
    if (step === 'loading') return;
    setError('');
    if (step === 'summary') { setQuestionIndex(4); setStep('questions'); }
    else if (step === 'questions') { if (questionIndex) setQuestionIndex((index) => index - 1); else setStep('rating'); }
    else if (step === 'rating') setStep('confirm');
    else if (step === 'confirm') setStep('search');
    else if (router.canGoBack()) router.back(); else router.replace('/');
  }
  function toggleRepresentative(word: string) {
    if (!form?.lightFlow) return;
    if (!representatives.includes(word) && representatives.length >= 5) { setError('대표 키워드는 최대 5개예요. 하나를 뺀 뒤 추가해 주세요.'); return; }
    update((current) => ({ ...current, lightFlow: { ...current.lightFlow!, representativeKeywords: representatives.includes(word) ? representatives.filter((item) => item !== word) : [...representatives, word] } }));
  }

  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}><KeyboardAvoidingView style={s.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {step === 'loading' ? <View style={s.loading}><LoadingMark /><Text style={s.loadingTitle}>키워드를 정리하는 중입니다</Text><Text accessibilityLiveRegion="polite" style={s.loadingCaption}>잠시만 기다려주세요... {progress}%</Text></View> : <>
      <View style={s.header}>
        {step !== 'confirm' ? <Pressable accessibilityRole="button" accessibilityLabel="이전 단계" onPress={back} style={[s.iconButton, s.backButton]}><DesignVector name="back" /></Pressable> : null}
        {step !== 'confirm' ? <Text style={s.headerTitle}>{step === 'search' ? '영화 검색' : '가볍게 기록하기'}</Text> : null}
        {step !== 'search' ? <Pressable accessibilityRole="button" accessibilityLabel={step === 'confirm' ? '영화 선택 취소' : '기록 안내와 초안 저장'} onPress={() => step === 'confirm' ? back() : setInfo(true)} style={[s.iconButton, s.infoButton]}><DesignVector name={step === 'confirm' ? 'cancel' : 'info'} /></Pressable> : null}
      </View>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} style={s.scroll} contentContainerStyle={[s.content, step === 'questions' && s.questionContent, step === 'search' && s.searchContent, step === 'rating' && s.ratingContent, step === 'confirm' && s.confirmContent]} keyboardShouldPersistTaps="handled">
        {initializing ? <ActivityIndicator color="#F8233C" /> : null}
        {step === 'search' ? <>
          <View style={s.searchBar}><DesignVector name="searchInput" style={s.searchGlyph} /><TextInput accessibilityLabel="기록할 영화 검색" placeholder="영화 제목으로 검색해 보세요" value={query} onChangeText={setQuery} style={s.searchInput} returnKeyType="search" /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="티켓 스캔 안내" onPress={() => setMessage('티켓 스캔은 준비 중이에요. 지금은 영화 제목으로 검색해 주세요.')} style={s.scanCard}><DesignVector name="scan" /><View style={s.flex}><Text style={s.scanTitle}><Text style={s.linkAccent}>티켓</Text> 스캔</Text><Text style={s.scanCaption}>티켓을 스캔하여 더욱 빠르게 기록을 남겨보세요.</Text></View></Pressable>
          <Text style={s.searchHint}>영화 제목을 검색해 기록을 시작할 수 있어요</Text>
          {searching || busy ? <ActivityIndicator color="#F8233C" /> : null}
          {!searching && !busy && results.length === 0 ? <Text style={s.muted}>검색 결과가 없어요. 다른 제목으로 검색해 주세요.</Text> : null}
          {results.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.title} 선택`} disabled={busy} onPress={() => void selectMovie(item)} style={s.result}><PosterArt compact movie={item} style={{ width: 48, height: 70, borderRadius: 5 }} /><View style={s.flex}><Text style={s.resultTitle}>{item.title}</Text><Text style={s.muted}>{item.releaseDate?.slice(0, 4)} · {item.genres.slice(0, 2).join(', ')}</Text></View><DesignVector name="chevron" width={7} /></Pressable>)}
        </> : null}
        {step === 'confirm' && movie && form ? <View style={s.confirm}>
          <PosterArt movie={movie} style={{ width: 201, height: 287, borderRadius: 8, alignSelf: 'center' }} />
          <Text style={s.movieTitle}>{movie.title}</Text><Text style={s.director}>{directorYear}</Text>
          <Text numberOfLines={expanded ? undefined : 3} style={s.overview}>{movie.overview || '등록된 줄거리 정보가 없어요.'}</Text>
          {movie.overview.length > 110 ? <Pressable accessibilityRole="button" onPress={() => setExpanded((value) => !value)}><Text style={s.link}>{expanded ? '접기' : '더보기'}</Text></Pressable> : null}
          <TextInput accessibilityLabel="영화 감상일 YYYY-MM-DD" value={form.watchedAt} maxLength={10} onChangeText={(watchedAt) => update((current) => ({ ...current, watchedAt }))} style={s.dateInput} />
          <Text style={s.centerMuted}>영화를 감상하신 날짜를 확인해 주세요</Text>
        </View> : null}
        {step === 'rating' && form && movie ? <View style={s.ratingPage}>
          <PosterArt compact movie={movie} style={{ width: 77, height: 111, borderRadius: 8, alignSelf: 'center' }} />
          <Text style={[s.movieTitle, { marginTop: 10 }]}>{movie.title}</Text><Text style={s.director}>{directorYear}</Text>
          <Text style={s.ratingHeading}>이 영화 어땠나요?</Text>
          <RatingControl value={form.rating} onChange={(rating) => update((current) => ({ ...current, rating }))} />
          <Text accessibilityLiveRegion="polite" style={s.ratingCaption}>{ratingMessage(form.rating)}</Text>

          <Text style={[s.ratingHeading, { marginTop: 60, marginBottom: 25 }]}>이 영화 어떤 점이 좋았나요?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.aspectRow}>{filmAspects.map((aspect) => <Pressable accessibilityRole="button" accessibilityState={{ selected: form.lightFlow?.aspects.includes(aspect) }} key={aspect} onPress={() => update((current) => ({ ...current, lightFlow: { ...current.lightFlow!, aspects: current.lightFlow!.aspects.includes(aspect) ? current.lightFlow!.aspects.filter((word) => word !== aspect) : [...current.lightFlow!.aspects, aspect] } }))} style={[s.aspect, form.lightFlow?.aspects.includes(aspect) && s.aspectSelected]}><Text style={[s.aspectText, form.lightFlow?.aspects.includes(aspect) && s.white]}>{aspect}</Text></Pressable>)}</ScrollView>
          <Text style={[s.centerMuted, { marginTop: 16, lineHeight: 33 }]}>선택한 키워드에 따라 리뷰의 톤이 결정됩니다</Text>
          <View style={{ marginTop: 52 }}><Action label="다음" onPress={() => { if (!form.rating) { setError('별을 밀어서 별점을 선택해 주세요.'); return; } setQuestionIndex(0); setStep('questions'); }} /></View>
        </View> : null}
        {step === 'questions' && question && form ? <>
          <View accessibilityRole="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={questionIndex + 1} accessibilityLabel="질문 진행" accessibilityValue={{ min: 0, max: 5, now: questionIndex + 1 }} style={s.progressTrack}><View style={[s.progressFill, { width: `${(questionIndex + 1) * 20}%` }]} /></View>
          <View style={s.questionPanel}>
            <Text numberOfLines={1} style={s.questionMovie}>{movie?.title} {directorYear ? `· ${directorYear}` : ''}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={form.lightFlow?.changed.includes(question.key) ? '질문 변경 완료' : '질문 변경 1회'} accessibilityState={{ disabled: form.lightFlow?.changed.includes(question.key) }} disabled={form.lightFlow?.changed.includes(question.key)} onPress={() => update((current) => changeLightQuestion(current, questionIndex))} style={[s.replaceQuestion, form.lightFlow?.changed.includes(question.key) && s.disabled]}><DesignVector name="replaceQuestion" /></Pressable>
            <Text style={s.questionText}>Q{questionIndex + 1}.{'\n'}{question.text.replace(/^「.*?」\s*/, '')}</Text>
          </View>
          <View style={s.selectedTray}>{selected.length ? selected.map((id, index) => <Tag key={id} label={question.options.find((item) => item.id === id)?.label ?? ''} index={index} onRemove={() => toggleTag(id)} />) : <Text style={s.trayPlaceholder}>지금 떠오르는 느낌을 골라주세요</Text>}</View>
          <Text style={s.blockHelp}>최대 3개의 블럭을 선택해 표현해보세요!</Text>
          <View style={s.wordRows}>{Array.from({ length: 4 }, (_, row) => {
            const geometry = wordGeometry.filter((item) => item.y === 16.75 + row * 46);
            const rowOptions = geometry.flatMap((item) => { const option = question.options.find((option) => option.label === item.label); return option ? [{ ...option, x: item.x + 180, width: item.width }] : []; });
            if (row === 3) question.options.filter((option) => !wordGeometry.some((item) => item.label === option.label)).forEach((option, index) => rowOptions.push({ ...option, x: 780 + index * 140, width: Math.max(76, option.label.length * 15 + 26) }));
            return <ScrollView ref={(node) => { wordRails.current[row] = node; }} onLayout={() => wordRails.current[row]?.scrollTo({ x: 180, animated: false })} key={row} horizontal contentOffset={{ x: 180, y: 0 }} showsHorizontalScrollIndicator={false} style={s.wordViewport}><View style={{ width: Math.max(762, ...rowOptions.map((option) => option.x + option.width)), height: 42 }}>{rowOptions.map((option) => { const order = selected.indexOf(option.id); return <Pressable accessibilityRole="button" accessibilityLabel={`느낌 ${option.label}`} accessibilityState={{ selected: order >= 0 }} key={option.id} onPress={() => toggleTag(option.id)} style={[s.word, { position: 'absolute', left: option.x, top: 6, width: option.width }, order >= 0 && { backgroundColor: chipColors[order % chipColors.length] }]}><Text style={[s.wordText, order >= 0 && s.white]}>{option.label}</Text>{order >= 0 ? <Text style={s.order}>{order + 1}</Text> : null}</Pressable>; })}</View></ScrollView>;
          })}</View>
          {customOpen ? <View style={s.customRow}><TextInput ref={customInput} autoFocus accessibilityLabel="직접 입력한 느낌" placeholder="느낌을 30자 이내로 입력" maxLength={30} value={custom} onChangeText={setCustom} onSubmitEditing={addCustom} style={s.customInput} /><Pressable accessibilityRole="button" onPress={addCustom}><Text style={s.link}>추가</Text></Pressable></View> : <Pressable accessibilityRole="button" onPress={() => setCustomOpen(true)} style={s.customLink}><Text style={s.customLinkText}>직접 입력</Text></Pressable>}
          {questionIndex === 4 && storageMode === 'supabase' ? <Pressable accessibilityRole="checkbox" aria-checked={consented} accessibilityState={{ checked: consented }} onPress={() => setConsented((value) => !value)} style={s.consent}><CheckBoxMark checked={consented} /><Text style={s.consentText}>질문·키워드를 무료 Gemini로 보내 초안을 만드는 데 동의해요. Google의 서비스 개선에 사용될 수 있어요. 개인정보·민감정보는 입력하지 마세요. (선택)</Text></Pressable> : null}
        </> : null}
        {step === 'summary' && form && movie ? <>
          <Pressable accessibilityRole="button" accessibilityLabel="영화 별점 수정" onPress={() => setStep('rating')} style={s.movieCard}><PosterArt compact movie={movie} style={{ width: 60, height: 85, borderRadius: 5 }} /><View style={s.flex}><Text style={s.resultTitle}>{movie.title}</Text><Text style={s.muted}>{directorYear}</Text><View style={s.summaryStars}><View style={{ width: 92, height: 20 }}><View style={{ width: `${(form.rating ?? 0) / 5 * 100}%`, height: 20, overflow: 'hidden' }}><View style={{ width: 92, flexDirection: 'row', gap: 3 }}>{Array.from({ length: 5 }, (_, index) => <DesignVector key={index} name="summaryStar" width={15} height={15} />)}</View></View></View><Text style={s.summaryScore}>{form.rating?.toFixed(1)}</Text></View></View></Pressable>
          <View style={[s.card, s.keywordCard]}><View style={s.titleRow}><Text style={s.cardTitle}>대표 키워드</Text><Text style={s.aiBadge}>{form.lightFlow?.draftSource === 'gemini' ? 'AI 추천' : '내 키워드'}</Text></View><Text style={s.cardCaption}>내 감상을 잘 나타내는 대표 키워드예요.{"\n"}직접 추가하거나 빼서 최대 5개까지 선택해 주세요.</Text><View style={s.tagWrap}>{representatives.map((word, index) => <Tag key={word} label={word} index={index} onRemove={() => toggleRepresentative(word)} />)}<Pressable accessibilityRole="button" accessibilityLabel="대표 키워드 추가" onPress={() => { setPicker(true); setError(''); }} style={s.addTag}><Text style={s.addText}>+ 추가</Text></Pressable></View></View>
          <View style={[s.card, s.recordCard]}><Text style={s.cardTitle}>내 키워드 기록</Text><View style={s.questionRecords}>{form.questions.map((item, index) => <View key={item.key} style={[s.summaryQuestion, index === 4 && { minHeight: 70 }]}><Pressable accessibilityRole="button" accessibilityLabel={`Q${index + 1} 답변 수정`} onPress={() => { setQuestionIndex(index); setStep('questions'); }}><Text style={s.summaryQuestionLabel}>Q{index + 1}. {item.text.replace(/^「.*?」\s*/, '')}</Text></Pressable><View style={[s.tagWrap, { marginTop: 8.5 }]}>{(form.questionTags[item.key] ?? []).map((id, tagIndex) => <Tag key={id} label={item.options.find((option) => option.id === id)?.label ?? ''} index={index + tagIndex} />)}{form.lightFlow?.responses[item.key] === 'skipped' ? <Text style={s.muted}>건너뛴 질문</Text> : null}</View></View>)}</View></View>
          <View style={s.editorGroup}><View style={s.editor}><TextInput ref={bodyInput} accessibilityLabel="나의 영화 리뷰" multiline maxLength={500} textAlignVertical="top" placeholder="선택한 키워드를 바탕으로 나의 감상을 직접 작성해 보세요." value={form.body} onChangeText={(body) => update((current) => ({ ...current, body }))} style={s.bodyInput} /></View><Text style={s.counter}>{form.body.length}/500</Text></View>
          <View style={s.editActions}><Pressable accessibilityRole="button" onPress={() => { bodyInput.current?.focus(); }}><Text style={s.link}>직접 작성</Text></Pressable>{aiDraft && form.body !== aiDraft ? <Pressable accessibilityRole="button" onPress={() => { setReplaceAction('apply'); setReplacePrompt(true); }}><Text style={s.link}>AI 초안 다시 사용</Text></Pressable> : null}</View>
          {storageMode === 'supabase' && labels.length ? <View><Pressable accessibilityRole="checkbox" aria-checked={consented} accessibilityState={{ checked: consented }} onPress={() => setConsented((value) => !value)} style={s.consent}><CheckBoxMark checked={consented} /><Text style={s.consentText}>질문·키워드를 무료 Gemini 테스트 처리에 전달하는 데 동의해요.</Text></Pressable><Action label="키워드로 AI 초안 생성" secondary disabled={busy} onPress={() => { if (!consented) { setError('AI 처리 안내에 먼저 동의해 주세요.'); return; } if (form.body.trim()) { setReplaceAction('generate'); setReplacePrompt(true); } else void summarize(form); }} /></View> : null}
          <Text style={s.disclaimer}>AI가 작성한 초안에는 부정확하거나 내 의도와 다른 표현이 있을 수 있어요. 개인정보·민감정보를 입력하지 마세요. 무료 Gemini 입력은 Google의 서비스 개선에 사용될 수 있습니다. 최종 내용과 공개 여부를 확인한 뒤 작성 완료를 눌러 주세요.</Text>
          <View style={s.privacyRow}><Text style={s.muted}>공개 범위</Text>{(['private', 'public'] as const).map((visibility) => <Pressable key={visibility} accessibilityRole="radio" aria-checked={form.visibility === visibility} accessibilityState={{ checked: form.visibility === visibility }} onPress={() => update((current) => ({ ...current, visibility }))} style={[s.privacyChip, form.visibility === visibility && s.privacySelected]}><Text style={form.visibility === visibility ? s.link : s.muted}>{visibility === 'private' ? '나만 보기' : '전체 공개'}</Text></Pressable>)}</View>
          <Pressable accessibilityRole="checkbox" aria-checked={form.spoiler} accessibilityState={{ checked: form.spoiler }} onPress={() => update((current) => ({ ...current, spoiler: !current.spoiler }))}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><CheckBoxMark checked={form.spoiler} /><Text style={s.muted}>스포일러가 포함되어 있어요</Text></View></Pressable>
          <Action label={busy ? '저장 중...' : '작성 완료'} onPress={() => void persist(true)} disabled={busy} />
        </> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      </ScrollView>
      {step !== 'summary' && step !== 'search' && step !== 'rating' && form && !initializing ? <View style={s.footerShell}>{error ? <Text accessibilityRole="alert" style={s.footerError}>{error}</Text> : null}<View style={s.footer}>
        {step === 'confirm' ? <><Action compact label="✓ 이 영화가 맞아요" onPress={() => { if (!isValidWatchedAt(form.watchedAt, todayDate())) { setError('감상일은 오늘 또는 이전 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.'); return; } setStep('rating'); }} /><Action compact secondary label="이 영화가 아니에요" onPress={() => setStep('search')} /></> : <><Action label="다음" onPress={() => nextQuestion(false)} /><Action secondary label="건너뛰기" onPress={() => nextQuestion(true)} /></>}
      </View></View> : null}
    </>}
    <Modal transparent visible={picker || info || replacePrompt} animationType="fade" onRequestClose={() => { setPicker(false); setInfo(false); setReplacePrompt(false); }}><View style={s.modalOverlay}><View accessibilityViewIsModal style={s.dialog}>
      <Pressable accessibilityRole="button" accessibilityLabel="안내 닫기" onPress={() => { setPicker(false); setInfo(false); setReplacePrompt(false); }} style={s.dialogClose}><DesignVector name="cancel" width={16} height={16} /></Pressable>
      {picker ? <><Text style={s.cardTitle}>대표 키워드 <Text style={s.aiBadge}>최대 5개</Text></Text><View style={s.tagWrap}>{representatives.map((word, index) => <Tag key={word} label={word} index={index} onRemove={() => toggleRepresentative(word)} />)}</View><Text style={s.muted}>추가할 키워드를 선택하세요.</Text><ScrollView style={{ maxHeight: 240 }}><View style={s.tagWrap}>{labels.map((word) => <Pressable key={word} accessibilityRole="button" accessibilityState={{ selected: representatives.includes(word) }} onPress={() => toggleRepresentative(word)} style={[s.word, representatives.includes(word) && s.privacySelected]}><Text style={s.wordText}>{word}</Text></Pressable>)}</View></ScrollView>{error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}<Action label="선택 완료" onPress={() => { setPicker(false); setError(''); }} /></> : info ? <><Text style={s.cardTitle}>가볍게 기록하기</Text><Text style={s.helpText}>5개의 질문에 느낌 블럭을 최대 3개씩 남길 수 있어요. 질문 변경은 질문마다 한 번만 가능하며, 변경하면 해당 답변이 지워져요. 건너뛴 질문은 AI 요약에서 제외돼요.{"\n\n"}작성 중 내용은 이 기기에 임시 보관돼요. 다른 기기에서 이어 쓰려면 초안을 저장해 주세요. 집중 기록 화면은 기존 방식으로 이용할 수 있어요.</Text>{form ? <Action label={busy ? '저장 중...' : '초안 저장'} disabled={busy} onPress={() => void persist(false)} /> : null}<Action label="홈으로" secondary onPress={() => { setInfo(false); router.replace('/'); }} /></> : <><Text style={s.cardTitle}>현재 감상을 AI 초안으로 바꿀까요?</Text><Text style={s.helpText}>직접 수정한 내용은 교체됩니다. 그대로 두려면 취소해 주세요.</Text><Action label="AI 초안으로 교체" onPress={() => { setReplacePrompt(false); if (replaceAction === 'apply' && aiDraft) update((current) => ({ ...current, body: aiDraft, lightFlow: { ...current.lightFlow!, draftSource: 'gemini' } })); else if (form) void summarize(form, true); }} /><Action label="취소" secondary onPress={() => setReplacePrompt(false)} /></>}
    </View></View></Modal>
  </KeyboardAvoidingView></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'white' }, frame: { flex: 1, width: '100%', maxWidth: 402, alignSelf: 'center' }, flex: { flex: 1 },
  header: { height: 74, position: 'relative', flexShrink: 0 }, headerTitle: { position: 'absolute', left: 55, right: 54, top: 24, fontFamily: homeFont, fontSize: 20, lineHeight: 33, letterSpacing: -0.2, textAlign: 'center', fontWeight: '700', color: '#000000' }, iconButton: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, backButton: { left: 5.5, top: 19.5 }, infoButton: { right: 14, top: 19 },
  footerShell: { backgroundColor: 'white' }, footerError: { fontFamily: homeFont, color: '#E51B3A', fontSize: 12, lineHeight: 18, paddingHorizontal: 24, paddingTop: 8 },
  scroll: { flex: 1 }, content: { paddingHorizontal: 21, paddingTop: 15, paddingBottom: 26, gap: 21 }, questionContent: { flexGrow: 1, paddingTop: 0, gap: 0 },
  action: { flex: 1, minHeight: 53, borderRadius: 28, flexDirection: 'row', gap: 7, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#F8233C', justifyContent: 'center', alignItems: 'center' }, actionText: { fontFamily: homeFont, color: 'white', fontSize: 18, lineHeight: 33, letterSpacing: -0.18, fontWeight: '600' }, secondary: { backgroundColor: '#F9FAFB' }, secondaryText: { color: '#99A1AF' }, disabled: { opacity: 0.45 }, white: { color: 'white' }, footer: { flexDirection: 'row', gap: 9.65, paddingHorizontal: 21, paddingTop: 12, paddingBottom: 21, backgroundColor: 'white' },
  searchContent: { paddingTop: 5, gap: 0 }, searchBar: { height: 50, backgroundColor: '#F3F4F6', borderRadius: 10, justifyContent: 'center' }, searchGlyph: { position: 'absolute', left: 17 }, searchInput: { height: 50, paddingLeft: 44, paddingRight: 17, fontFamily: homeFont, fontSize: 15, color: '#17191C' }, scanCard: { marginTop: 28, height: 91, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 21, flexDirection: 'row', alignItems: 'center', gap: 22 }, scanTitle: { fontFamily: homeFont, fontSize: 20, lineHeight: 33, fontWeight: '700', letterSpacing: -0.2 }, linkAccent: { color: '#F8233C' }, scanCaption: { fontFamily: homeFont, fontSize: 13, fontWeight: '500', lineHeight: 18, letterSpacing: -0.13, color: '#8A8A8A' }, searchHint: { fontFamily: homeFont, color: '#8A8A8A', fontSize: 13, lineHeight: 33, textAlign: 'center', marginTop: 2, marginBottom: 20 }, muted: { fontFamily: homeFont, fontSize: 12, lineHeight: 18, color: '#99A1AF' }, result: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 84, paddingVertical: 6 }, resultTitle: { fontFamily: homeFont, fontSize: 16, fontWeight: '700', lineHeight: 22, color: '#17191C' }, resultArrow: { fontSize: 28, color: '#9CA3AF' },
  confirmContent: { paddingTop: 7 }, confirm: { gap: 0 }, movieTitle: { fontFamily: homeFont, fontSize: 20, fontWeight: '700', color: '#17191C', textAlign: 'center', lineHeight: 33, letterSpacing: -0.2, marginTop: 19 }, director: { fontFamily: homeFont, fontSize: 13, lineHeight: 33, letterSpacing: -0.13, color: '#8A8A8A', textAlign: 'center', marginTop: -6 }, centerMuted: { fontFamily: homeFont, fontSize: 13, lineHeight: 19, letterSpacing: -0.13, color: '#99A1AF', textAlign: 'center' }, overview: { fontFamily: homeFont, fontSize: 13, lineHeight: 16, minHeight: 64, letterSpacing: -0.13, color: '#8A8A8A', marginTop: 4 }, link: { fontFamily: homeFont, fontSize: 12, fontWeight: '600', color: '#F8233C' }, dateInput: { fontFamily: homeFont, fontSize: 32, letterSpacing: -0.32, fontWeight: '700', textAlign: 'center', color: '#17191C', borderRadius: 28, backgroundColor: '#F8F9FB', height: 53, padding: 10, marginHorizontal: 23, marginTop: 48, marginBottom: 11 },
  ratingContent: { paddingTop: 28, paddingBottom: 101 }, ratingPage: { paddingTop: 0 }, ratingHeading: { fontFamily: homeFont, fontSize: 20, lineHeight: 37, letterSpacing: -0.2, fontWeight: '700', color: '#F8233C', textAlign: 'center', marginTop: 36, marginBottom: 30 }, ratingCaption: { fontFamily: homeFont, fontSize: 18, lineHeight: 33, letterSpacing: -0.18, fontWeight: '600', color: '#17191C', textAlign: 'center', marginTop: 21 }, ratingValue: { fontFamily: homeFont, fontSize: 11, color: '#99A1AF', textAlign: 'center', marginTop: 7 }, aspectRow: { gap: 10, paddingVertical: 0 }, aspect: { height: 36, borderRadius: 20, backgroundColor: '#F3F4F6', paddingHorizontal: 17, justifyContent: 'center' }, aspectSelected: { backgroundColor: '#F8233C' }, aspectText: { fontFamily: homeFont, color: '#BBC1CB', fontSize: 15, lineHeight: 18, fontWeight: '500' },
  progressTrack: { height: 16, backgroundColor: '#F2F6FA', borderRadius: 8, overflow: 'hidden', marginBottom: 17 }, progressFill: { height: '100%', borderRadius: 8, backgroundColor: '#F8233C' }, questionPanel: { backgroundColor: '#FF2345', borderRadius: 20, minHeight: 132, paddingTop: 18.5, paddingBottom: 27, paddingHorizontal: 3, boxShadow: '0px 5px 22px rgba(248,35,60,0.12)' }, questionMovie: { fontFamily: homeFont, color: '#FFB4B4', fontSize: 13, fontWeight: '600', lineHeight: 16, letterSpacing: -0.65, marginHorizontal: 15, paddingRight: 26 }, replaceQuestion: { position: 'absolute', top: 2, right: 4, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, replaceGlyph: { fontSize: 27, color: 'white' }, qNumber: { fontFamily: homeFont, fontSize: 20, fontWeight: '700', color: 'white', textAlign: 'center', marginTop: 8 }, questionText: { fontFamily: homeFont, fontSize: 20, lineHeight: 24, letterSpacing: -0.2, fontWeight: '700', color: 'white', textAlign: 'center', marginTop: -1.5 },
  selectedTray: { marginTop: 56, marginHorizontal: 3, minHeight: 59, borderRadius: 30, backgroundColor: '#F2F6FA', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', padding: 11.5, gap: 8 }, trayPlaceholder: { fontFamily: homeFont, fontSize: 13, color: '#CBD1DB' }, blockHelp: { fontFamily: homeFont, fontSize: 13, lineHeight: 33, color: '#99A1AF', textAlign: 'center', marginTop: 10 }, wordRows: { gap: 4, marginTop: 51.75, marginHorizontal: -21 }, wordViewport: { height: 42, flexGrow: 0 }, wordRow: { gap: 8, paddingHorizontal: 21, paddingTop: 6 }, word: { minHeight: 36, borderRadius: 22, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#F5F6F8', justifyContent: 'center' }, wordText: { fontFamily: homeFont, fontSize: 15, lineHeight: 18, letterSpacing: -0.75, color: '#BBC1CB' }, order: { position: 'absolute', right: -3, top: -6, backgroundColor: '#F8233C', color: 'white', fontFamily: homeFont, fontSize: 10, textAlign: 'center', width: 17, height: 17, lineHeight: 17, borderRadius: 9 }, customLink: { alignSelf: 'center', marginTop: 20.25, height: 33, justifyContent: 'center' }, customLinkText: { color: '#99A1AF', fontFamily: homeFont, fontSize: 13, lineHeight: 33, textDecorationLine: 'underline' }, customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 25 }, customInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#D1D5DB', padding: 10, fontFamily: homeFont, fontSize: 14 },
  tag: { borderRadius: 20, minHeight: 36, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, tagText: { fontFamily: homeFont, fontSize: 15, lineHeight: 18, color: 'white', fontWeight: '500' }, tagRemove: { width: 14, height: 28, alignItems: 'center', justifyContent: 'center' }, tagX: { fontSize: 17, color: '#99A1AF', lineHeight: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 28 }, loadingTitle: { marginTop: 25, color: '#17191C', fontSize: 20, lineHeight: 33, letterSpacing: -0.2, fontWeight: '700', fontFamily: homeFont }, loadingCaption: { color: '#99A1AF', fontSize: 14, lineHeight: 17, letterSpacing: -0.7, fontWeight: '500', fontFamily: homeFont, marginTop: 6 },
movieCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, minHeight: 121, padding: 17, flexDirection: 'row', gap: 19, alignItems: 'center' }, summaryStars: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }, summaryScore: { color: '#F8233C', fontFamily: homeFont, fontSize: 13, lineHeight: 19.5, fontWeight: '600' }, card: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, padding: 17, paddingTop: 12, gap: 4 }, keywordCard: { minHeight: 198 }, recordCard: { minHeight: 469 }, questionRecords: { marginTop: 4 }, titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, cardTitle: { fontFamily: homeFont, fontSize: 16, lineHeight: 24, fontWeight: '700', color: '#17191C' }, aiBadge: { fontFamily: homeFont, fontSize: 10, color: 'white', backgroundColor: '#F8233C', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' }, cardCaption: { fontFamily: homeFont, color: '#99A1AF', fontSize: 15, lineHeight: 18, letterSpacing: -0.75, fontWeight: '500' }, tagWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 0, marginTop: 14 }, addTag: { borderRadius: 20, backgroundColor: '#F5F6F8', paddingHorizontal: 13, minHeight: 36, justifyContent: 'center' }, addText: { fontFamily: homeFont, color: '#BBC1CB', fontSize: 15, lineHeight: 18 }, summaryQuestion: { minHeight: 84 }, summaryQuestionLabel: { fontFamily: homeFont, fontSize: 15, fontWeight: '500', letterSpacing: -0.75, color: '#99A1AF', lineHeight: 19.5 }, editorGroup: { gap: 4 }, editor: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, minHeight: 345, paddingHorizontal: 17, paddingTop: 19, paddingBottom: 17 }, bodyInput: { minHeight: 307, fontFamily: homeFont, color: '#99A1AF', fontSize: 15, fontWeight: '500', letterSpacing: -0.75, lineHeight: 20 }, counter: { textAlign: 'right', fontFamily: homeFont, fontSize: 13, lineHeight: 20, letterSpacing: -0.65, fontWeight: '600', color: '#99A1AF' }, editActions: { flexDirection: 'row', justifyContent: 'space-between' }, disclaimer: { fontFamily: homeFont, fontSize: 12, letterSpacing: -0.6, lineHeight: 16, color: '#99A1AF', paddingHorizontal: 7 }, privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, privacyChip: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' }, privacySelected: { borderColor: '#F8233C', borderWidth: 1, backgroundColor: '#FFF1F3' }, consent: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingVertical: 12 }, checkbox: { color: '#F8233C', fontSize: 21 }, consentText: { flex: 1, fontFamily: homeFont, fontSize: 11, lineHeight: 18, color: '#99A1AF' },
  message: { color: '#7B8493', backgroundColor: '#F7F8FA', padding: 12, borderRadius: 10, fontFamily: homeFont, fontSize: 12, lineHeight: 20 }, error: { fontFamily: homeFont, fontSize: 12, color: '#E51B3A', lineHeight: 19, paddingTop: 8, paddingBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: '#0005', alignItems: 'center', justifyContent: 'center', padding: 21 }, dialog: { backgroundColor: 'white', width: '100%', maxWidth: 360, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 17, padding: 24, paddingTop: 33, gap: 20 }, dialogClose: { position: 'absolute', right: 7, top: 2, width: 44, height: 35, alignItems: 'center', justifyContent: 'center' }, dialogCloseText: { color: '#99A1AF', fontSize: 25 }, helpText: { fontFamily: homeFont, color: '#6B7280', fontSize: 13, lineHeight: 22 },
});
