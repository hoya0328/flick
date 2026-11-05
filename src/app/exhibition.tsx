import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { Movie } from '@/features/discovery/discovery-logic';
import { RatingControl } from '@/features/reviews/rating-control';
import { newCoreForm } from '@/features/reviews/core-flow';
import { fallbackCoreQuestion } from '@/features/reviews/core-questions';
import { changeLightQuestion, lightLabels, newLightForm, normalizeLightDraft, ratingMessage, respondToLight } from '@/features/reviews/light-flow';
import type { ReviewForm, ReviewMode } from '@/features/reviews/review-logic';
import { AiOperationError, aiOperationMessage } from '@/features/reviews/ai-operations';
import { exhibitionMessage, guestAiAllowed, guestKeywords, guestStorageKey, restoreGuestForm, withGuestKeywords, type Guest, type ExhibitionStatus } from '@/features/exhibition/exhibition-logic';
import { endGuest, enterExhibition, exhibitionMovies, exhibitionStatus, guestAi, resumeGuest, saveGuestRecord } from '@/features/exhibition/exhibition-service';

export default function ExhibitionScreen() {
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ExhibitionStatus | null>(null), [guest, setGuest] = useState<Guest | null>(null);
  const [adult, setAdult] = useState(false), [consent, setConsent] = useState(false), [privacy, setPrivacy] = useState(false);
  const [mode, setMode] = useState<ReviewMode>('light'), [movies, setMovies] = useState<Movie[]>([]), [search, setSearch] = useState('');
  const [movie, setMovie] = useState<Movie | null>(null), [form, setForm] = useState<ReviewForm | null>(null);
  const [index, setIndex] = useState(0), [summary, setSummary] = useState(false), [saved, setSaved] = useState(false), [confirmEnd, setConfirmEnd] = useState(false);
  const [keywordText, setKeywordText] = useState('');
  const [notice, setNotice] = useState(''), [wait, setWait] = useState(0), [backupWarning, setBackupWarning] = useState(false);
  const lock = useRef(false), mounted = useRef(true), scroll = useRef<ScrollView>(null);
  const ai = guestAiAllowed(guest) && status?.aiAvailable === true;
  const refreshStatus = async () => { const s = await exhibitionStatus(); if (mounted.current) setStatus(s); };
  useEffect(() => {
    mounted.current = true;
    void (async () => {
      try {
        const [s, resumed] = await Promise.all([exhibitionStatus(), resumeGuest()]);
        if (!mounted.current) return;
        setStatus(s); setGuest(resumed.guest);
        if (resumed.saved) { setForm({ ...newLightForm({ id: '', title: '' } as Movie), body: resumed.saved.body }); setSaved(true); }
        else if (resumed.guest) {
          const restored = restoreGuestForm(await AsyncStorage.getItem(guestStorageKey(resumed.guest.user_id)));
          if (!mounted.current) return;
          if (restored) { setMovie(restored.movie); setForm(restored.form); setIndex(restored.index); setSummary(restored.summary); setKeywordText(guestKeywords(restored.form).join(', ')); }
          else { const list = await exhibitionMovies(''); if (mounted.current) setMovies(list); }
        }
      } catch (error) { if (mounted.current) setNotice(exhibitionMessage(error)); }
      finally { if (mounted.current) setReady(true); }
    })();
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!ready || !guest || !movie || !form || saved) return;
    const timer = setTimeout(() => { void AsyncStorage.setItem(guestStorageKey(guest.user_id), JSON.stringify({ movie, form, index, summary })).catch(() => { if (mounted.current) setBackupWarning(true); }); }, 200);
    return () => clearTimeout(timer);
  }, [ready, guest, movie, form, index, summary, saved]);
  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait(n => Math.max(0, n - 1)), 1000); return () => clearTimeout(t); }, [wait]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice('');
    try { await action(); } catch (error) { if (mounted.current) { setNotice(exhibitionMessage(error)); scroll.current?.scrollTo({ y: 0, animated: true }); } }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const top = () => scroll.current?.scrollTo({ y: 0, animated: true });
  const handleAiError = (error: unknown) => {
    setNotice(`${aiOperationMessage(error)} AI 없이도 계속할 수 있어요.`);
    scroll.current?.scrollTo({ y: 0, animated: true });
    if (error instanceof AiOperationError && error.quota?.retryAfterSeconds) setWait(Math.min(86400, error.quota.retryAfterSeconds));
  };
  const start = () => void run(async () => {
    if (!privacy) { setNotice('비공개 저장·기기 세션 안내를 확인해 주세요.'); return; }
    const g = await enterExhibition(adult, consent); if (!mounted.current) return;
    setGuest(g); const list = await exhibitionMovies(''); if (!mounted.current) return;
    setMovies(list); await refreshStatus(); top();
  });
  const choose = (m: Movie) => { setMovie(m); setForm(mode === 'light' ? newLightForm(m) : newCoreForm(m)); setKeywordText(''); setIndex(0); setSummary(false); setNotice(''); top(); };
  const next = (skip = false, useAi = true) => void run(async () => {
    if (!form || !movie) return;
    if (!form.rating) { setNotice('별점을 먼저 선택해 주세요.'); top(); return; }
    let nextForm = form;
    if (form.mode === 'light') {
      nextForm = respondToLight(form, index, skip);
      if (!nextForm.lightFlow?.responses[form.questions[index]!.key]) { setNotice('느낌 태그를 1~3개 선택하거나 건너뛰기를 눌러 주세요.'); return; }
    } else {
      if ((form.answers[form.questions[index]!.key]?.trim().length ?? 0) < 10) { setNotice('답변을 10자 이상 입력해 주세요.'); return; }
      let question = fallbackCoreQuestion(index + 1, movie.title);
      if (useAi && ai && !wait) {
        try {
          const result = await guestAi(form, 'feedback');
          if (!mounted.current) return;
          if (typeof result.feedback !== 'string' || result.feedback.trim().length < 20) throw new Error('invalid_feedback');
          if (index < 4 && (typeof result.question !== 'string' || result.question.trim().length < 10)) throw new Error('invalid_question');
          if (index < 4) question = { ...question, text: result.question!.trim().slice(0, 400), sourceRule: 'gemini-exhibition' };
          nextForm = { ...form, coreFlow: { ...form.coreFlow!, feedback: { ...form.coreFlow!.feedback, [form.questions[index]!.key]: { text: result.feedback.slice(0, 700), source: 'gemini' } } } };
        } catch (error) { if (mounted.current) handleAiError(error); return; }
        finally { void refreshStatus().catch(() => {}); }
      }
      if (index < 4) nextForm = { ...nextForm, questions: [...nextForm.questions, question], coreFlow: { ...nextForm.coreFlow!, index: index + 1 } };
    }
    if (!mounted.current) return;
    if (index === 4) { setSummary(true); const words = nextForm.mode === 'light' ? lightLabels(nextForm).slice(0, 5).join(', ') : ''; setKeywordText(words); nextForm = withGuestKeywords({ ...nextForm, body: nextForm.mode === 'light' ? lightLabels(nextForm).join(' · ') : Object.values(nextForm.answers).join('\n\n').slice(0, 1000) }, words); }
    else setIndex(index + 1);
    setForm(nextForm); top();
  });
  const draft = () => void run(async () => {
    if (!form || !ai || wait) return;
    try {
      const result = await guestAi(form, 'draft'); if (!mounted.current) return;
      if (form.mode === 'light') {
        const value = normalizeLightDraft(result, lightLabels(form)); if (!value) throw new Error('invalid_draft');
        setKeywordText(value.keywords.join(', '));
        setForm({ ...form, body: value.draft, lightFlow: { ...form.lightFlow!, representativeKeywords: value.keywords, draftSource: 'gemini' } });
      } else {
        if (typeof result.draft !== 'string' || !result.draft.trim() || result.draft.length > 1000) throw new Error('invalid_draft');
        setKeywordText((result.keywords ?? []).filter(x => typeof x === 'string').slice(0, 5).join(', '));
        setForm({ ...form, body: result.draft, coreFlow: { ...form.coreFlow!, keywords: (result.keywords ?? []).filter(x => typeof x === 'string' && x.length <= 40).slice(0, 5), source: 'gemini' } });
      }
      setNotice('AI 초안을 검토하고 원하는 대로 수정한 뒤 저장해 주세요.');
    } catch (error) { if (mounted.current) handleAiError(error); }
    finally { void refreshStatus().catch(() => {}); }
  });
  const save = () => void run(async () => {
    if (!form?.body.trim()) { setNotice('저장할 감상을 입력해 주세요.'); return; }
    if (!form.rating) { setNotice('별점을 선택해 주세요.'); return; }
    const finalForm = withGuestKeywords(form, keywordText);
    await saveGuestRecord(finalForm); if (mounted.current) { setForm(finalForm); setSaved(true); top(); }
  });
  const finish = () => void run(async () => {
    await endGuest(); if (guest) await AsyncStorage.removeItem(guestStorageKey(guest.user_id));
    if (!mounted.current) return;
    setGuest(null); setForm(null); setMovie(null); setSaved(false); setSummary(false); setConsent(false); setAdult(false); setPrivacy(false); setConfirmEnd(false); setMovies([]); setSearch(''); await refreshStatus(); top();
  });
  const setKeywords = (value: string) => {
    if (!form) return;
    setKeywordText(value); setForm(withGuestKeywords(form, value));
  };
  const q = form?.questions[index];
  return <Screen eyebrow="FLICK · EXHIBITION" title={saved ? '나의 영화 기록이 완성됐어요' : summary ? '기록을 마무리해 볼까요?' : guest ? '영화가 남긴 순간을 기록해요' : '한 편의 영화, 나만의 감상'} scrollViewRef={scroll}>
    <BrandMark compact />
    {!ready ? <Text style={s.body}>체험 준비 중…</Text> : <>
      {notice ? <Text accessibilityRole="alert" style={s.notice}>{notice}</Text> : null}
      {backupWarning ? <Text style={s.notice}>이 기기의 임시 저장 공간을 사용할 수 없어요. 페이지를 닫기 전에 내용을 복사해 주세요.</Text> : null}
      {status ? <Text style={s.caption}>전시 {status.open ? '운영 중' : '종료'} · 공유 AI 오늘 {status.dailyRemaining}회 / 이번 분 {status.minuteRemaining}회 남음{guest ? ` · 내 체험 ${status.guestRemaining}회` : ''}{wait ? ` · 재시도 ${wait}초 후` : ''}</Text> : <Button label="연결 다시 확인" onPress={() => void run(refreshStatus)} variant="secondary" loading={busy} />}
      {!guest ? <View style={s.card}>
        <Text style={s.body}>가입·이메일 없이 약 3분이면 가볍게 기록할 수 있어요. 집중 기록은 조금 더 여유 있게 체험해 주세요.</Text>
        <Text style={s.caption}>기기별 별도 계정으로 한 편을 비공개 저장합니다. 회원 계정과는 분리됩니다. 로그아웃·브라우저 데이터 삭제·기기 변경 시 복구할 수 없어요. 기록은 즉시 자동 삭제되지 않으며 전시 종료 후 운영자가 보관 기간을 검토합니다. 공용 기기는 다음 사람에게 넘기기 전에 반드시 체험을 종료해 주세요.</Text>
        <Check label="비공개 저장 및 기기 세션 안내를 확인했어요 (필수)" value={privacy} onChange={setPrivacy} disabled={busy} />
        <Check label="만 18세 이상입니다 (AI 사용 시 필수)" value={adult} onChange={v => { setAdult(v); if (!v) setConsent(false); }} disabled={busy} />
        <Text style={s.caption}>AI는 선택입니다. 영화 제목·질문·답변·키워드가 Google Gemini로 전송되며, 무료 입력은 서비스 개선 및 사람의 검토에 사용될 수 있어요. 개인정보·민감한 내용은 입력하지 마세요. 만 18세 미만은 AI 없이 체험해 주세요.</Text>
        <Check label="안내를 읽고 무료 AI 전송에 동의해요 (선택)" value={consent} onChange={setConsent} disabled={busy || !adult} />
        <Button label={consent ? '무료 AI 체험 시작' : 'AI 없이 체험 시작'} onPress={start} loading={busy} disabled={!status?.open} />
        <Button label="일반 회원 로그인으로 돌아가기" onPress={() => router.replace('/welcome')} variant="ghost" />
      </View> : saved ? <View style={s.card}>
        <Text style={s.body}>비공개로 저장했어요. 공개 게시나 회원 계정 이전은 지원하지 않습니다. 아래 감상을 길게 눌러 복사해 보관할 수 있어요.</Text>
        <Text selectable style={s.body}>{form?.body}</Text>
        <Text style={s.caption}>취향 리포트는 여러 편의 실제 기록이 필요한 별도 회원 기능입니다. 체험 한 편으로 결과를 만들어 보여주지는 않아요.</Text>
      </View> : !form ? <View style={s.card}>
        <View style={s.row}>{(['light', 'core'] as const).map(m => <Button key={m} label={m === 'light' ? '가볍게 기록' : '집중해서 기록'} variant={mode === m ? 'primary' : 'secondary'} disabled={busy} onPress={() => setMode(m)} />)}</View>
        <Text style={s.caption}>이미 감상한 영화를 선택해 주세요. 기존 영화 목록에서 검색하며 새 TMDB 호출은 하지 않아요.</Text>
        <TextInput accessibilityLabel="체험 영화 제목 검색" placeholder="영화 제목" value={search} onChangeText={setSearch} maxLength={80} editable={!busy} style={s.input} onSubmitEditing={() => void run(async () => setMovies(await exhibitionMovies(search)))} />
        <Button label="영화 검색" onPress={() => void run(async () => setMovies(await exhibitionMovies(search)))} loading={busy} variant="secondary" />
        {!movies.length ? <Text style={s.caption}>검색 결과가 없어요. 다른 제목으로 검색해 주세요.</Text> : movies.map(m => <Button key={m.id} label={`${m.title}${m.releaseDate ? ` · ${m.releaseDate.slice(0, 4)}` : ''}`} variant="secondary" disabled={busy} onPress={() => choose(m)} />)}
      </View> : <View style={s.card}>
        <Text style={s.heading}>{movie?.title} · {form.mode === 'light' ? '가볍게' : '집중'} 기록</Text>
        {!summary ? <>
          <RatingControl value={form.rating} onChange={rating => { if (!busy) setForm({ ...form, rating }); }} />
          <Text style={s.caption}>{ratingMessage(form.rating)}</Text><Text style={s.caption}>Q{index + 1} / 5{!ai ? ' · 비AI 질문' : ''}</Text>
          {index > 0 && form.coreFlow?.feedback[form.questions[index - 1]!.key] ? <Text style={s.feedback}>AI 코멘트: {form.coreFlow.feedback[form.questions[index - 1]!.key]!.text}</Text> : null}
          <Text style={s.heading}>{q?.text}</Text>
          {form.mode === 'light' ? <>
            <View style={s.row}>{q?.options.map(option => { const selected = form.questionTags[q.key]?.includes(option.id); return <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(selected), disabled: busy }} disabled={busy} onPress={() => { const ids = form.questionTags[q.key] ?? []; if (!selected && ids.length >= 3) { setNotice('느낌은 질문별 최대 3개까지 선택할 수 있어요.'); return; } setForm({ ...form, questionTags: { ...form.questionTags, [q.key]: selected ? ids.filter(id => id !== option.id) : [...ids, option.id] } }); setNotice(''); }} style={[s.chip, selected && s.selected]}><Text style={s.caption}>{option.label}</Text></Pressable>; })}</View>
            <Button label="질문 변경 · 질문별 1회" disabled={busy || form.lightFlow?.changed.includes(q?.key ?? '')} onPress={() => setForm(changeLightQuestion(form, index))} variant="ghost" />
            <Button label="건너뛰기" disabled={busy} onPress={() => next(true)} variant="ghost" />
          </> : <><TextInput accessibilityLabel={`Q${index + 1} 답변`} multiline maxLength={1000} placeholder="내가 느낀 점을 10자 이상 남겨 주세요" editable={!busy} style={[s.input, s.editor]} value={form.answers[q!.key] ?? ''} onChangeText={answer => setForm({ ...form, answers: { ...form.answers, [q!.key]: answer } })} /><Text style={s.caption}>{form.answers[q!.key]?.length ?? 0} / 1,000자 · 개인정보는 쓰지 마세요.</Text></>}
          <Button label={index === 4 ? '답변 완료 · 기록 종합' : '답변 완료 · 다음'} loading={busy} disabled={Boolean(wait && form.mode === 'core' && ai)} onPress={() => next()} />
          {form.mode === 'core' && ai ? <Button label="이번에는 AI 없이 계속" disabled={busy} variant="secondary" onPress={() => next(false, false)} /> : null}
        </> : <>
          <Text style={s.caption}>초안을 검토·수정한 후 비공개 저장해 주세요. AI 재생성은 기존 편집 내용을 덮어씁니다.</Text>
          {ai ? <Button label="AI로 리뷰 초안 만들기 · 내용 교체" onPress={draft} loading={busy} disabled={Boolean(wait) || (form.mode === 'light' && lightLabels(form).length === 0)} variant="secondary" /> : <Text style={s.caption}>직접 작성 모드 · AI를 호출하지 않아요.</Text>}
          {form.mode === 'light' && lightLabels(form).length === 0 ? <Text style={s.caption}>모든 질문을 건너뛰었어요. 감상을 직접 작성해 저장해 주세요.</Text> : null}
          <TextInput accessibilityLabel="대표 키워드 (쉼표로 구분, 최대 5개)" placeholder="대표 키워드 (쉼표로 구분, 최대 5개)" value={keywordText} onChangeText={setKeywords} editable={!busy} maxLength={204} style={s.input} />
          <TextInput accessibilityLabel="리뷰 본문" multiline maxLength={1000} value={form.body} editable={!busy} onChangeText={body => setForm({ ...form, body })} style={[s.input, s.editor]} /><Text style={s.caption}>{form.body.length} / 1,000자</Text>
          <Button label="검토 완료 · 나만 보기로 저장" onPress={save} loading={busy} />
          <Text style={s.caption}>내가 남긴 답변</Text>{form.questions.map(question => <Text key={question.key} selectable style={s.caption}>{question.text}{'\n'}{form.mode === 'core' ? form.answers[question.key] : question.options.filter(o => form.questionTags[question.key]?.includes(o.id)).map(o => o.label).join(' · ') || '건너뜀'}</Text>)}
        </>}
      </View>}
      {guest ? <View style={s.card}>
        {!saved ? <Text style={s.caption}>입력 중인 내용은 이 브라우저에 임시 보관돼요. 종료 전에 필요한 내용을 복사해 주세요.</Text> : null}
        {confirmEnd ? <><Text style={s.notice}>종료하면 이 기기의 체험 세션과 임시 초안을 지워요. 서버에 비공개 저장한 기록은 삭제되지 않지만 다시 접속할 수 없어요. 복사해 보관했나요?</Text><Button label="확인 · 체험 종료" loading={busy} onPress={finish} /><Button label="계속 보기" onPress={() => setConfirmEnd(false)} disabled={busy} variant="ghost" /></> : <Button label={saved ? '체험 종료 · 다음 방문객에게 넘기기' : '체험 그만하기'} disabled={busy} onPress={() => setConfirmEnd(true)} variant="ghost" />}
      </View> : null}
    </>}
  </Screen>;
}
function Check({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onChange(!value)} style={[s.check, value && s.selected, disabled && { opacity: .45 }]}><Text style={s.body}>{value ? '☑' : '□'} {label}</Text></Pressable>;
}
const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.lg }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heading: { ...typography.heading, color: colors.text }, body: { ...typography.body, color: colors.text }, caption: { ...typography.caption, color: colors.textMuted },
  notice: { ...typography.label, color: colors.danger, backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radii.sm }, feedback: { ...typography.body, color: colors.text, backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radii.sm },
  input: { ...typography.body, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, minHeight: 48, padding: spacing.md }, editor: { minHeight: 180, textAlignVertical: 'top' },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border }, selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, check: { minHeight: 48, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm },
});
