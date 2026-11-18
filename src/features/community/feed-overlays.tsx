import { type Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ExploreButton, ExploreDialog } from '../discovery/explore-ui';
import type { AnonymousAnswer, FeedPost } from './feed-model';
import type { FeedApi } from './feed-service';
import { f, FeedPhoto } from './feed-ui';
import { reportPost } from './social-service';
export function FeedOverlays({ selected, kind, api, close, act }: { selected: FeedPost | null; kind: 'menu' | 'question' | 'photos' | null; api: FeedApi; close: () => void; act: (task: () => Promise<unknown>) => void }) {
  const [confirm, setConfirm] = useState(false), [body, setBody] = useState(''), [consent, setConsent] = useState(false), [answers, setAnswers] = useState<AnonymousAnswer[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false), [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('other');
  useEffect(() => { let active = true; const timer = setTimeout(() => { if (kind === 'question' && selected) void api.answers(selected.id).then(rows => { if (active) setAnswers(rows); }).catch(() => { if (active) setError('응답을 불러오지 못했어요.'); }); }, 0); return () => { active = false; clearTimeout(timer); }; }, [api, kind, selected]);
  if (!selected || !kind) return null;
  async function answer() {
    if (!consent) { setError('익명 응답의 저장 범위에 동의해야 합니다.'); return; }
    if (!body.trim() || body.trim().length > 500) { setError('응답을 1~500자로 입력해야 합니다.'); return; }
    if (busy) return; setBusy(true); setError('');
    try { await api.answer(selected!.id, body); setBody(''); setAnswers(await api.answers(selected!.id)); act(async () => undefined); } catch (caught) { setError(caught instanceof Error ? caught.message : '응답을 보내지 못했어요.'); } finally { setBusy(false); }
  }
  async function report() {
    if (!selected || busy) return;
    if (!body.trim()) { setError('신고 설명을 입력해야 합니다.'); return; }
    if (api.mode === 'demo') { setError('데모 신고 확인 · 실제 서버에는 전송하지 않았어요.'); return; }
    setBusy(true); setError('');
    try { await reportPost(selected.id, reason, body); setReporting(false); setBody(''); setError('신고가 접수됐어요.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '신고하지 못했어요. 입력은 유지됩니다.'); }
    finally { setBusy(false); }
  }
  return <ExploreDialog title={kind === 'menu' ? '게시물 메뉴' : kind === 'question' ? '익명 질문' : '게시물 사진'} onClose={close}><View style={{ gap: 14, paddingVertical: 10 }}>
    {kind === 'photos' ? selected.photos.map((path, index) => <FeedPhoto key={index} path={path} style={{ width: '100%', height: 300, borderRadius: 10 }} />) : kind === 'menu' ? <>
      {selected.isMine ? <><ExploreButton label="게시물 수정" secondary onPress={() => { close(); router.push(`/post-edit?id=${selected.id}` as Href); }} /><ExploreButton label={confirm ? '휴지통 이동 확인' : '게시물 삭제'} secondary onPress={() => { if (!confirm) setConfirm(true); else { act(() => api.remove(selected.id)); close(); } }} />{confirm ? <Text style={f.small}>7일 동안 내 피드 휴지통에서 비공개로 복원할 수 있어요. 데모는 로컬에서만 이동합니다.</Text> : null}</> : <><ExploreButton label="게시물 신고" secondary onPress={() => setReporting(true)} />{reporting ? <><Text style={f.small}>이유·설명을 적어 주세요. 개인정보를 추가하지 마세요.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[['spoiler', '스포일러'], ['harassment', '괴롭힘'], ['personal_info', '개인정보'], ['copyright', '저작권'], ['other', '기타']].map(([value, label]) => <Pressable key={value} accessibilityRole="radio" aria-checked={reason === value} disabled={busy} onPress={() => setReason(value!)} style={[f.chip, reason === value && { borderColor: '#F8233C' }]}><Text style={f.small}>{label}</Text></Pressable>)}</View><TextInput accessibilityLabel="신고 설명" maxLength={500} multiline value={body} onChangeText={setBody} style={f.input} /><ExploreButton label="신고 제출" secondary busy={busy} onPress={() => void report()} /></> : null}</>}
    </> : <><Text style={f.name}>{selected.question?.prompt}</Text><Text style={f.small}>게시자에게는 이름이 보이지 않지만 서비스 운영자는 계정을 식별할 수 있어요. 팔로워의 응답은 게시자와 응답자 본인만 볼 수 있어요. 한 글당 한 번만 응답할 수 있습니다.</Text>{answers.map(item => <View key={item.id} style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 8 }}><Text style={f.small}>{item.isMine ? '내 익명 응답' : '익명 응답'}</Text><Text style={f.text}>{item.body}</Text><Pressable accessibilityRole="button" onPress={() => { act(() => api.hideAnswer(item.id)); close(); }}><Text style={f.small}>응답 숨기기</Text></Pressable></View>)}{selected.question?.canAnswer && !answers.some(item => item.isMine) ? <><TextInput placeholderTextColor="#99A1AF" accessibilityLabel="익명 응답" placeholder="응답을 입력해 주세요" multiline maxLength={500} style={[f.input, { minHeight: 80 }]} value={body} onChangeText={setBody} /><Pressable accessibilityRole="checkbox" aria-checked={consent} accessibilityState={{ checked: consent }} onPress={() => setConsent(value => !value)} style={f.row}><Text style={f.small}>{consent ? '☑' : '☐'} 응답의 저장·공개 범위를 확인했어요</Text></Pressable><ExploreButton label="익명 응답 보내기" busy={busy} onPress={() => void answer()} /></> : !selected.isMine && !answers.length ? <Text style={f.small}>{selected.question?.answered ? '이미 응답한 질문이에요. 숨겨도 다시 응답할 수 없어요.' : '작성자를 팔로우한 뒤 응답할 수 있어요.'}</Text> : !answers.length ? <Text style={f.small}>아직 응답이 없어요.</Text> : null}</>}
    {error ? <Text accessibilityRole="alert" style={f.error}>{error}</Text> : null}
  </View></ExploreDialog>;
}
