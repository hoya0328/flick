import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { homeFont } from '@/components/home-ui';
import { PosterArt } from '@/components/poster-art';
import { discoverMovies, getMovie, type Movie } from '@/features/discovery/movies';
import { aiOperationMessage } from '@/features/reviews/ai-operations';
import { generateLightDraft } from '@/features/reviews/light-draft-service';
import { changeLightQuestion, filmAspects, lightLabels, newLightForm, ratingMessage, respondToLight } from '@/features/reviews/light-flow';
import { RatingControl } from '@/features/reviews/rating-control';
import { isValidWatchedAt, reviewCompletionIssue, todayDate, type ReviewForm } from '@/features/reviews/review-logic';
import { clearLocalReviewBackup, getDraftForMovie, getReview, loadLocalReviewBackup, saveLocalReviewBackup, saveReview } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';

type Step = 'search' | 'confirm' | 'rating' | 'questions' | 'loading' | 'summary';
const chipColors = ['#AF5DED', '#12B5DB', '#F3B600', '#FF566B', '#0E9C87', '#64748B'];
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function Action({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.action, secondary && s.secondary, disabled && s.disabled]}><Text style={[s.actionText, secondary && s.secondaryText]}>{label}</Text></Pressable>;
}
function Tag({ label, index = 0, onRemove }: { label: string; index?: number; onRemove?: () => void }) {
  return <View style={[s.tag, { backgroundColor: chipColors[index % chipColors.length] }]}><Text style={s.tagText}>{label}</Text>{onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={`${label} 삭제`} hitSlop={8} onPress={onRemove} style={s.tagRemove}><Text style={s.tagX}>×</Text></Pressable> : null}</View>;
}
function LoadingMark() {
  const [turn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => { if (!active || reduced) return; animation = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' })); animation.start(); });
    return () => { active = false; animation?.stop(); };
  }, [turn]);
  // Original Figma 2:1081 geometry, rendered natively without a screenshot.
  return <Animated.View accessibilityLabel="키워드 정리 중" style={{ width: 94, height: 94, transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
    {[[0, 40.7, 27.134, 12.598, '0deg'], [40.7, 40.7, 53.299, 12.598, '0deg'], [56.65, 9.01, 13.419, 26.837, '45deg'], [9.21, 56.45, 13.419, 26.837, '45deg'], [9.21, 9.01, 13.419, 26.837, '-45deg'], [47.16, 46.97, 13.419, 40.256, '-45deg'], [40.7, 0, 13.567, 27.134, '0deg'], [40.7, 40.7, 13.567, 53.299, '0deg']].map(([left, top, width, height, rotate], index) => <View key={index} style={{ position: 'absolute', left: Number(left), top: Number(top), width: Number(width), height: Number(height), borderRadius: 2, backgroundColor: '#F8233C', transform: [{ rotate: String(rotate) as `${number}deg` }] }} />)}
  </Animated.View>;
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
      setBusy(true);
      void discoverMovies(query).then((result) => { if (active) { setResults(result.movies); setMessage(result.notice ?? ''); } }).catch(() => { if (active) setError('검색하지 못했어요. 검색어를 다시 입력해 주세요.'); }).finally(() => { if (active) setBusy(false); });
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
        <Pressable accessibilityRole="button" accessibilityLabel="이전 단계" onPress={back} style={s.iconButton}><Image source={require('../../assets/figma-review/back.png')} style={{ width: 10, height: 20, transform: [{ rotate: '180deg' }] }} /></Pressable>
        <Text style={s.headerTitle}>{step === 'search' ? '영화 검색' : step === 'confirm' ? '영화 확인' : '가볍게 기록하기'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="기록 안내와 초안 저장" onPress={() => setInfo(true)} style={s.iconButton}><Image source={require('../../assets/figma-review/info.png')} style={{ width: 24, height: 24 }} /></Pressable>
      </View>
      <ScrollView ref={scroll} style={s.scroll} contentContainerStyle={[s.content, step === 'questions' && s.questionContent]} keyboardShouldPersistTaps="handled">
        {initializing ? <ActivityIndicator color="#F8233C" /> : null}
        {step === 'search' ? <>
          <TextInput accessibilityLabel="기록할 영화 검색" placeholder="영화 제목으로 검색해 보세요" value={query} onChangeText={setQuery} style={s.searchInput} returnKeyType="search" />
          <Text style={s.muted}>기록하고 싶은 영화를 선택해 주세요.</Text>
          {busy ? <ActivityIndicator color="#F8233C" /> : null}
          {!busy && results.length === 0 ? <Text style={s.muted}>검색 결과가 없어요. 다른 제목으로 검색해 주세요.</Text> : null}
          {results.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.title} 선택`} disabled={busy} onPress={() => void selectMovie(item)} style={s.result}><PosterArt compact movie={item} style={{ width: 48, height: 70, borderRadius: 5 }} /><View style={s.flex}><Text style={s.resultTitle}>{item.title}</Text><Text style={s.muted}>{item.releaseDate?.slice(0, 4)} · {item.genres.slice(0, 2).join(', ')}</Text></View><Text style={s.resultArrow}>›</Text></Pressable>)}
        </> : null}
        {step === 'confirm' && movie && form ? <View style={s.confirm}>
          <PosterArt movie={movie} style={{ width: 201, height: 287, borderRadius: 8, alignSelf: 'center' }} />
          <Text style={s.movieTitle}>{movie.title}</Text><Text style={s.centerMuted}>{directorYear}</Text>
          <Text numberOfLines={expanded ? undefined : 3} style={s.overview}>{movie.overview || '등록된 줄거리 정보가 없어요.'}</Text>
          {movie.overview.length > 110 ? <Pressable accessibilityRole="button" onPress={() => setExpanded((value) => !value)}><Text style={s.link}>{expanded ? '접기' : '더보기'}</Text></Pressable> : null}
          <TextInput accessibilityLabel="영화 감상일 YYYY-MM-DD" value={form.watchedAt} maxLength={10} onChangeText={(watchedAt) => update((current) => ({ ...current, watchedAt }))} style={s.dateInput} />
          <Text style={s.centerMuted}>영화를 감상하신 날짜를 확인해 주세요</Text>
        </View> : null}
        {step === 'rating' && form && movie ? <View style={s.ratingPage}>
          <PosterArt compact movie={movie} style={{ width: 77, height: 111, borderRadius: 8, alignSelf: 'center' }} />
          <Text style={s.movieTitle}>{movie.title}</Text><Text style={s.centerMuted}>{directorYear}</Text>
          <Text style={s.ratingHeading}>이 영화 어땠나요?</Text>
          <RatingControl value={form.rating} onChange={(rating) => update((current) => ({ ...current, rating }))} />
          <Text accessibilityLiveRegion="polite" style={s.ratingCaption}>{ratingMessage(form.rating)}</Text>
          <Text style={s.ratingValue}>{form.rating ? `${form.rating.toFixed(1)} / 5` : '0.5점씩 조절할 수 있어요'}</Text>
          <Text style={[s.ratingHeading, { marginTop: 55, marginBottom: 20 }]}>이 영화 어떤 점이 좋았나요?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.aspectRow}>{filmAspects.map((aspect) => <Pressable accessibilityRole="button" accessibilityState={{ selected: form.lightFlow?.aspects.includes(aspect) }} key={aspect} onPress={() => update((current) => ({ ...current, lightFlow: { ...current.lightFlow!, aspects: current.lightFlow!.aspects.includes(aspect) ? current.lightFlow!.aspects.filter((word) => word !== aspect) : [...current.lightFlow!.aspects, aspect] } }))} style={[s.aspect, form.lightFlow?.aspects.includes(aspect) && s.aspectSelected]}><Text style={[s.aspectText, form.lightFlow?.aspects.includes(aspect) && s.white]}>{aspect}</Text></Pressable>)}</ScrollView>
          <Text style={[s.centerMuted, { marginTop: 22 }]}>선택한 키워드에 따라 리뷰의 톤이 결정됩니다</Text>
        </View> : null}
        {step === 'questions' && question && form ? <>
          <View accessibilityRole="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={questionIndex + 1} accessibilityLabel="질문 진행" accessibilityValue={{ min: 0, max: 5, now: questionIndex + 1 }} style={s.progressTrack}><View style={[s.progressFill, { width: `${(questionIndex + 1) * 20}%` }]} /></View>
          <View style={s.questionPanel}>
            <Text numberOfLines={1} style={s.questionMovie}>{movie?.title} {directorYear ? `· ${directorYear}` : ''}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={form.lightFlow?.changed.includes(question.key) ? '질문 변경 완료' : '질문 변경 1회'} accessibilityState={{ disabled: form.lightFlow?.changed.includes(question.key) }} disabled={form.lightFlow?.changed.includes(question.key)} onPress={() => update((current) => changeLightQuestion(current, questionIndex))} style={[s.replaceQuestion, form.lightFlow?.changed.includes(question.key) && s.disabled]}><Text style={s.replaceGlyph}>↻</Text></Pressable>
            <Text style={s.qNumber}>Q{questionIndex + 1}</Text><Text style={s.questionText}>{question.text.replace(/^「.*?」\s*/, '')}</Text>
          </View>
          <View style={s.selectedTray}>{selected.length ? selected.map((id, index) => <Tag key={id} label={question.options.find((item) => item.id === id)?.label ?? ''} index={index} onRemove={() => toggleTag(id)} />) : <Text style={s.trayPlaceholder}>지금 떠오르는 느낌을 골라주세요</Text>}</View>
          <Text style={s.blockHelp}>최대 3개의 블럭을 선택해 표현해보세요!</Text>
          <View style={s.wordRows}>{Array.from({ length: 4 }, (_, row) => <ScrollView key={row} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wordRow}>{question.options.filter((_, index) => index % 4 === row).map((option) => { const order = selected.indexOf(option.id); return <Pressable accessibilityRole="button" accessibilityLabel={`느낌 ${option.label}`} accessibilityState={{ selected: order >= 0 }} key={option.id} onPress={() => toggleTag(option.id)} style={[s.word, order >= 0 && { backgroundColor: chipColors[order % chipColors.length] }]}><Text style={[s.wordText, order >= 0 && s.white]}>{option.label}</Text>{order >= 0 ? <Text style={s.order}>{order + 1}</Text> : null}</Pressable>; })}</ScrollView>)}</View>
          {customOpen ? <View style={s.customRow}><TextInput ref={customInput} autoFocus accessibilityLabel="직접 입력한 느낌" placeholder="느낌을 30자 이내로 입력" maxLength={30} value={custom} onChangeText={setCustom} onSubmitEditing={addCustom} style={s.customInput} /><Pressable accessibilityRole="button" onPress={addCustom}><Text style={s.link}>추가</Text></Pressable></View> : <Pressable accessibilityRole="button" onPress={() => setCustomOpen(true)} style={s.customLink}><Text style={s.customLinkText}>직접 입력</Text></Pressable>}
          {questionIndex === 4 && storageMode === 'supabase' ? <Pressable accessibilityRole="checkbox" aria-checked={consented} accessibilityState={{ checked: consented }} onPress={() => setConsented((value) => !value)} style={s.consent}><Text style={s.checkbox}>{consented ? '☑' : '□'}</Text><Text style={s.consentText}>질문·키워드를 무료 Gemini로 보내 초안을 만드는 데 동의해요. Google의 서비스 개선에 사용될 수 있어요. 개인정보·민감정보는 입력하지 마세요. (선택)</Text></Pressable> : null}
        </> : null}
        {step === 'summary' && form && movie ? <>
          <View style={s.movieCard}><PosterArt compact movie={movie} style={{ width: 60, height: 85, borderRadius: 5 }} /><View style={s.flex}><Text style={s.resultTitle}>{movie.title}</Text><Text style={s.muted}>{directorYear}</Text><Text style={s.smallStars}>{'★'.repeat(Math.floor(form.rating ?? 0))}{form.rating && form.rating % 1 ? '½' : ''} <Text style={s.muted}>{form.rating?.toFixed(1)}</Text></Text></View><Pressable accessibilityRole="button" accessibilityLabel="별점 수정" onPress={() => setStep('rating')}><Text style={s.link}>수정</Text></Pressable></View>
          <View style={s.card}><View style={s.titleRow}><Text style={s.cardTitle}>대표 키워드</Text><Text style={s.aiBadge}>{form.lightFlow?.draftSource === 'gemini' ? 'AI 추천' : '내 키워드'}</Text></View><Text style={s.cardCaption}>내 감상을 잘 나타내는 대표 키워드예요.{"\n"}직접 추가하거나 빼서 최대 5개까지 선택해 주세요.</Text><View style={s.tagWrap}>{representatives.map((word, index) => <Tag key={word} label={word} index={index} onRemove={() => toggleRepresentative(word)} />)}<Pressable accessibilityRole="button" accessibilityLabel="대표 키워드 추가" onPress={() => { setPicker(true); setError(''); }} style={s.addTag}><Text style={s.addText}>+ 추가</Text></Pressable></View></View>
          <View style={s.card}><Text style={s.cardTitle}>내 키워드 기록</Text>{form.questions.map((item, index) => <View key={item.key} style={s.summaryQuestion}><Pressable accessibilityRole="button" accessibilityLabel={`Q${index + 1} 답변 수정`} onPress={() => { setQuestionIndex(index); setStep('questions'); }}><Text style={s.summaryQuestionLabel}>Q{index + 1}. {item.text.replace(/^「.*?」\s*/, '')}</Text></Pressable><View style={s.tagWrap}>{(form.questionTags[item.key] ?? []).map((id, tagIndex) => <Tag key={id} label={item.options.find((option) => option.id === id)?.label ?? ''} index={index + tagIndex} />)}{form.lightFlow?.responses[item.key] === 'skipped' ? <Text style={s.muted}>건너뛴 질문</Text> : null}</View></View>)}</View>
          <View style={s.editor}><TextInput ref={bodyInput} accessibilityLabel="나의 영화 리뷰" multiline maxLength={500} textAlignVertical="top" placeholder="선택한 키워드를 바탕으로 나의 감상을 직접 작성해 보세요." value={form.body} onChangeText={(body) => update((current) => ({ ...current, body }))} style={s.bodyInput} /><Text style={s.counter}>{form.body.length}/500</Text></View>
          <View style={s.editActions}><Pressable accessibilityRole="button" onPress={() => { bodyInput.current?.focus(); }}><Text style={s.link}>직접 작성</Text></Pressable>{aiDraft && form.body !== aiDraft ? <Pressable accessibilityRole="button" onPress={() => { setReplaceAction('apply'); setReplacePrompt(true); }}><Text style={s.link}>AI 초안 다시 사용</Text></Pressable> : null}</View>
          {storageMode === 'supabase' && labels.length ? <View><Pressable accessibilityRole="checkbox" aria-checked={consented} accessibilityState={{ checked: consented }} onPress={() => setConsented((value) => !value)} style={s.consent}><Text style={s.checkbox}>{consented ? '☑' : '□'}</Text><Text style={s.consentText}>질문·키워드를 무료 Gemini 테스트 처리에 전달하는 데 동의해요.</Text></Pressable><Action label="키워드로 AI 초안 생성" secondary disabled={busy} onPress={() => { if (!consented) { setError('AI 처리 안내에 먼저 동의해 주세요.'); return; } if (form.body.trim()) { setReplaceAction('generate'); setReplacePrompt(true); } else void summarize(form); }} /></View> : null}
          <Text style={s.disclaimer}>AI가 작성한 초안에는 부정확하거나 내 의도와 다른 표현이 있을 수 있어요. 개인정보·민감정보를 입력하지 마세요. 무료 Gemini 입력은 Google의 서비스 개선에 사용될 수 있습니다. 최종 내용과 공개 여부를 확인한 뒤 작성 완료를 눌러 주세요.</Text>
          <View style={s.privacyRow}><Text style={s.muted}>공개 범위</Text>{(['private', 'public'] as const).map((visibility) => <Pressable key={visibility} accessibilityRole="radio" aria-checked={form.visibility === visibility} accessibilityState={{ checked: form.visibility === visibility }} onPress={() => update((current) => ({ ...current, visibility }))} style={[s.privacyChip, form.visibility === visibility && s.privacySelected]}><Text style={form.visibility === visibility ? s.link : s.muted}>{visibility === 'private' ? '나만 보기' : '전체 공개'}</Text></Pressable>)}</View>
          <Pressable accessibilityRole="checkbox" aria-checked={form.spoiler} accessibilityState={{ checked: form.spoiler }} onPress={() => update((current) => ({ ...current, spoiler: !current.spoiler }))}><Text style={s.muted}>{form.spoiler ? '☑' : '□'} 스포일러가 포함되어 있어요</Text></Pressable>
          <Action label={busy ? '저장 중...' : '작성 완료'} onPress={() => void persist(true)} disabled={busy} />
        </> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      </ScrollView>
      {step !== 'summary' && step !== 'search' && form && !initializing ? <View style={s.footerShell}>{error ? <Text accessibilityRole="alert" style={s.footerError}>{error}</Text> : null}<View style={s.footer}>
        {step === 'confirm' ? <><Action label="✓ 이 영화가 맞아요" onPress={() => { if (!isValidWatchedAt(form.watchedAt, todayDate())) { setError('감상일은 오늘 또는 이전 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.'); return; } setStep('rating'); }} /><Action secondary label="이 영화가 아니에요" onPress={() => setStep('search')} /></> : step === 'rating' ? <Action label="다음" onPress={() => { if (!form.rating) { setError('별을 밀어서 별점을 선택해 주세요.'); return; } setQuestionIndex(0); setStep('questions'); }} /> : <><Action label="다음" onPress={() => nextQuestion(false)} /><Action secondary label="건너뛰기" onPress={() => nextQuestion(true)} /></>}
      </View></View> : null}
    </>}
    <Modal transparent visible={picker || info || replacePrompt} animationType="fade" onRequestClose={() => { setPicker(false); setInfo(false); setReplacePrompt(false); }}><View style={s.modalOverlay}><View accessibilityViewIsModal style={s.dialog}>
      <Pressable accessibilityRole="button" accessibilityLabel="안내 닫기" onPress={() => { setPicker(false); setInfo(false); setReplacePrompt(false); }} style={s.dialogClose}><Text style={s.dialogCloseText}>×</Text></Pressable>
      {picker ? <><Text style={s.cardTitle}>대표 키워드 <Text style={s.aiBadge}>최대 5개</Text></Text><View style={s.tagWrap}>{representatives.map((word, index) => <Tag key={word} label={word} index={index} onRemove={() => toggleRepresentative(word)} />)}</View><Text style={s.muted}>추가할 키워드를 선택하세요.</Text><ScrollView style={{ maxHeight: 240 }}><View style={s.tagWrap}>{labels.map((word) => <Pressable key={word} accessibilityRole="button" accessibilityState={{ selected: representatives.includes(word) }} onPress={() => toggleRepresentative(word)} style={[s.word, representatives.includes(word) && s.privacySelected]}><Text style={s.wordText}>{word}</Text></Pressable>)}</View></ScrollView>{error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}<Action label="선택 완료" onPress={() => { setPicker(false); setError(''); }} /></> : info ? <><Text style={s.cardTitle}>가볍게 기록하기</Text><Text style={s.helpText}>5개의 질문에 느낌 블럭을 최대 3개씩 남길 수 있어요. 질문 변경은 질문마다 한 번만 가능하며, 변경하면 해당 답변이 지워져요. 건너뛴 질문은 AI 요약에서 제외돼요.{"\n\n"}작성 중 내용은 이 기기에 임시 보관돼요. 다른 기기에서 이어 쓰려면 초안을 저장해 주세요. 집중 기록 화면은 기존 방식으로 이용할 수 있어요.</Text>{form ? <Action label={busy ? '저장 중...' : '초안 저장'} disabled={busy} onPress={() => void persist(false)} /> : null}<Action label="홈으로" secondary onPress={() => { setInfo(false); router.replace('/'); }} /></> : <><Text style={s.cardTitle}>현재 감상을 AI 초안으로 바꿀까요?</Text><Text style={s.helpText}>직접 수정한 내용은 교체됩니다. 그대로 두려면 취소해 주세요.</Text><Action label="AI 초안으로 교체" onPress={() => { setReplacePrompt(false); if (replaceAction === 'apply' && aiDraft) update((current) => ({ ...current, body: aiDraft, lightFlow: { ...current.lightFlow!, draftSource: 'gemini' } })); else if (form) void summarize(form, true); }} /><Action label="취소" secondary onPress={() => setReplacePrompt(false)} /></>}
    </View></View></Modal>
  </KeyboardAvoidingView></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'white' }, frame: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }, flex: { flex: 1 },
  header: { minHeight: 66, paddingTop: 15, paddingBottom: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { fontFamily: homeFont, fontSize: 20, fontWeight: '700', color: '#17191C' }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footerShell: { backgroundColor: 'white' }, footerError: { fontFamily: homeFont, color: '#E51B3A', fontSize: 12, lineHeight: 18, paddingHorizontal: 24, paddingTop: 8 },
  scroll: { flex: 1 }, content: { paddingHorizontal: 21, paddingTop: 20, paddingBottom: 26, gap: 20 }, questionContent: { flexGrow: 1, paddingTop: 8, gap: 0 },
  action: { flex: 1, minHeight: 53, borderRadius: 28, paddingHorizontal: 15, paddingVertical: 14, backgroundColor: '#F8233C', justifyContent: 'center', alignItems: 'center' }, actionText: { fontFamily: homeFont, color: 'white', fontSize: 18, fontWeight: '600' }, secondary: { backgroundColor: '#F5F7FA' }, secondaryText: { color: '#99A1AF' }, disabled: { opacity: 0.45 }, white: { color: 'white' }, footer: { flexDirection: 'row', gap: 8, paddingHorizontal: 21, paddingTop: 12, paddingBottom: 20, backgroundColor: 'white' },
  searchInput: { minHeight: 50, backgroundColor: '#F5F6F8', borderRadius: 10, paddingHorizontal: 17, fontFamily: homeFont, fontSize: 14, color: '#17191C' }, muted: { fontFamily: homeFont, fontSize: 12, lineHeight: 18, color: '#99A1AF' }, result: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 84, paddingVertical: 6 }, resultTitle: { fontFamily: homeFont, fontSize: 16, fontWeight: '700', lineHeight: 22, color: '#17191C' }, resultArrow: { fontSize: 28, color: '#9CA3AF' },
  confirm: { paddingTop: 10, gap: 10 }, movieTitle: { fontFamily: homeFont, fontSize: 20, fontWeight: '700', color: '#17191C', textAlign: 'center', marginTop: 10 }, centerMuted: { fontFamily: homeFont, fontSize: 12, lineHeight: 19, color: '#99A1AF', textAlign: 'center' }, overview: { fontFamily: homeFont, fontSize: 13, lineHeight: 21, color: '#6B7280', marginTop: 14 }, link: { fontFamily: homeFont, fontSize: 12, fontWeight: '600', color: '#F8233C' }, dateInput: { fontFamily: homeFont, fontSize: 23, fontWeight: '700', textAlign: 'center', color: '#17191C', borderRadius: 28, backgroundColor: '#F8F9FB', padding: 13, marginHorizontal: 23, marginTop: 26 },
  ratingPage: { paddingTop: 5 }, ratingHeading: { fontFamily: homeFont, fontSize: 23, fontWeight: '700', color: '#F8233C', textAlign: 'center', marginTop: 45, marginBottom: 22 }, ratingCaption: { fontFamily: homeFont, fontSize: 14, fontWeight: '500', color: '#17191C', textAlign: 'center', marginTop: 13 }, ratingValue: { fontFamily: homeFont, fontSize: 11, color: '#99A1AF', textAlign: 'center', marginTop: 7 }, aspectRow: { gap: 10, paddingVertical: 4 }, aspect: { height: 36, borderRadius: 20, backgroundColor: '#F3F4F6', paddingHorizontal: 17, justifyContent: 'center' }, aspectSelected: { backgroundColor: '#F8233C' }, aspectText: { fontFamily: homeFont, color: '#99A1AF', fontSize: 14 },
  progressTrack: { height: 16, backgroundColor: '#F3F4F6', borderRadius: 8, overflow: 'hidden', marginBottom: 17 }, progressFill: { height: '100%', borderRadius: 8, backgroundColor: '#F8233C' }, questionPanel: { backgroundColor: '#FF2345', borderRadius: 20, minHeight: 132, paddingTop: 17, paddingBottom: 20, paddingHorizontal: 18, boxShadow: '0px 5px 22px rgba(248,35,60,0.12)' }, questionMovie: { fontFamily: homeFont, color: '#FFE7EB', fontSize: 11, paddingRight: 28 }, replaceQuestion: { position: 'absolute', top: 6, right: 5, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, replaceGlyph: { fontSize: 27, color: 'white' }, qNumber: { fontFamily: homeFont, fontSize: 20, fontWeight: '700', color: 'white', textAlign: 'center', marginTop: 8 }, questionText: { fontFamily: homeFont, fontSize: 19, lineHeight: 26, fontWeight: '700', color: 'white', textAlign: 'center', marginTop: 4 },
  selectedTray: { marginTop: 49, minHeight: 59, borderRadius: 30, backgroundColor: '#F4F7FB', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 12 }, trayPlaceholder: { fontFamily: homeFont, fontSize: 12, color: '#CBD1DB' }, blockHelp: { fontFamily: homeFont, fontSize: 12, color: '#99A1AF', textAlign: 'center', marginTop: 19 }, wordRows: { gap: 12, marginTop: 55, marginHorizontal: -21 }, wordRow: { gap: 8, paddingHorizontal: 21, paddingTop: 6 }, word: { minHeight: 36, borderRadius: 22, paddingHorizontal: 17, paddingVertical: 9, backgroundColor: '#F5F6F8', justifyContent: 'center' }, wordText: { fontFamily: homeFont, fontSize: 14, color: '#9CA3AF' }, order: { position: 'absolute', right: -3, top: -6, backgroundColor: '#F8233C', color: 'white', fontFamily: homeFont, fontSize: 10, textAlign: 'center', width: 17, height: 17, lineHeight: 17, borderRadius: 9 }, customLink: { alignSelf: 'center', marginTop: 40, padding: 10 }, customLinkText: { color: '#99A1AF', fontFamily: homeFont, fontSize: 13, textDecorationLine: 'underline' }, customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 25 }, customInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#D1D5DB', padding: 10, fontFamily: homeFont, fontSize: 14 },
  tag: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6, position: 'relative' }, tagText: { fontFamily: homeFont, fontSize: 12, color: 'white', fontWeight: '600' }, tagRemove: { position: 'absolute', top: -7, right: -7, width: 22, height: 22, backgroundColor: 'white', borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, tagX: { fontSize: 17, color: '#99A1AF', lineHeight: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 }, loadingTitle: { marginTop: 27, color: '#17191C', fontSize: 20, fontWeight: '700', fontFamily: homeFont }, loadingCaption: { color: '#99A1AF', fontSize: 14, fontFamily: homeFont, marginTop: 15 },
movieCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, minHeight: 121, padding: 18, flexDirection: 'row', gap: 20, alignItems: 'center' }, smallStars: { color: '#F8233C', fontSize: 17, marginTop: 8 }, card: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, padding: 21, gap: 15 }, titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, cardTitle: { fontFamily: homeFont, fontSize: 16, fontWeight: '700', color: '#17191C' }, aiBadge: { fontFamily: homeFont, fontSize: 10, color: 'white', backgroundColor: '#F8233C', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' }, cardCaption: { fontFamily: homeFont, color: '#99A1AF', fontSize: 12, lineHeight: 20 }, tagWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingTop: 4 }, addTag: { borderRadius: 20, backgroundColor: '#F5F6F8', paddingHorizontal: 13, paddingVertical: 7 }, addText: { fontFamily: homeFont, color: '#99A1AF', fontSize: 12 }, summaryQuestion: { gap: 8, marginTop: 7 }, summaryQuestionLabel: { fontFamily: homeFont, fontSize: 12, color: '#99A1AF', lineHeight: 18 }, editor: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, minHeight: 345, padding: 18 }, bodyInput: { minHeight: 280, fontFamily: homeFont, color: '#4B5563', fontSize: 14, lineHeight: 24 }, counter: { textAlign: 'right', fontFamily: homeFont, fontSize: 11, color: '#99A1AF', marginTop: 10 }, editActions: { flexDirection: 'row', justifyContent: 'space-between' }, disclaimer: { fontFamily: homeFont, fontSize: 10, lineHeight: 16, color: '#99A1AF', paddingHorizontal: 7 }, privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, privacyChip: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' }, privacySelected: { borderColor: '#F8233C', borderWidth: 1, backgroundColor: '#FFF1F3' }, consent: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingVertical: 12 }, checkbox: { color: '#F8233C', fontSize: 21 }, consentText: { flex: 1, fontFamily: homeFont, fontSize: 11, lineHeight: 18, color: '#99A1AF' },
  message: { color: '#7B8493', backgroundColor: '#F7F8FA', padding: 12, borderRadius: 10, fontFamily: homeFont, fontSize: 12, lineHeight: 20 }, error: { fontFamily: homeFont, fontSize: 12, color: '#E51B3A', lineHeight: 19, paddingTop: 8, paddingBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: '#0005', alignItems: 'center', justifyContent: 'center', padding: 21 }, dialog: { backgroundColor: 'white', width: '100%', maxWidth: 420, borderRadius: 20, padding: 24, paddingTop: 33, gap: 20 }, dialogClose: { position: 'absolute', right: 7, top: 2, width: 44, height: 35, alignItems: 'center', justifyContent: 'center' }, dialogCloseText: { color: '#99A1AF', fontSize: 25 }, helpText: { fontFamily: homeFont, color: '#6B7280', fontSize: 13, lineHeight: 22 },
});
