import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Href, Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { DesignVector, type DesignVectorName } from '@/components/design-vector';
import { ExploreButton, ExploreDialog, ExploreFrame, ExplorePoster } from '@/features/discovery/explore-ui';
import { exploreCatalog } from '@/features/discovery/explore-data';
import { filterMovies, defaultExploreFilters } from '@/features/discovery/explore-model';
import type { Movie } from '@/features/discovery/movies';
import { createFeedApi } from '@/features/community/feed-service';
import { decodeFeedDraft, draftIssue, lockedBlockIssue, normalizeBlocks, UUID, type FeedBlock, type FeedDraft, type FeedPost } from '@/features/community/feed-model';
import { f, FeedPhoto } from '@/features/community/feed-ui';
import { ProfileAvatar } from '@/features/profile/profile-ui';
import { addCorePhoto } from '@/features/reviews/core-photo';
import { pickCorePhoto } from '@/features/reviews/core-photo-picker';
import { useSession } from '@/features/session/session-provider';
const blank: FeedDraft = { body: '', photos: [], visibility: 'private', blocks: [] };
export default function PostEditorRoute() {
  const session = useSession(), params = useLocalSearchParams<{ id?: string }>();
  if (session.status === 'loading') return <ExploreFrame><ActivityIndicator color="#F8233C" /></ExploreFrame>;
  if (session.mode === 'none' || session.status === 'error') return <Redirect href="/welcome" />;
  if (!session.onboardingComplete) return <Redirect href="/onboarding" />;
  return <Editor key={`${session.mode}:${session.email}:${params.id ?? ''}`} id={typeof params.id === 'string' ? params.id : undefined} />;
}
function Editor({ id }: { id?: string }) {
  const session = useSession(), mode = session.mode === 'supabase' ? 'supabase' : 'demo', api = useMemo(() => createFeedApi(mode), [mode]);
  const key = `flick.feed.draft.v3.${mode}.${encodeURIComponent(session.email ?? 'demo')}.${id ?? 'new'}`;
  const [draft, setDraft] = useState<FeedDraft>(blank), [original, setOriginal] = useState<FeedPost | null>(null), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [issue, setIssue] = useState<ReturnType<typeof draftIssue>>(null), [confirmed, setConfirmed] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false), [exit, setExit] = useState(false), [query, setQuery] = useState(''), [movies, setMovies] = useState<Movie[]>([]), [searching, setSearching] = useState(false);
  const bodyInput = useRef<TextInput>(null), scroll = useRef<ScrollView>(null), positions = useRef<Record<string, number>>({}), active = useRef(true), lock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let valid = true;
    void (async () => {
      try {
        if (id) { if (!UUID.test(id)) throw new Error('잘못된 게시물 주소예요.'); const post = (await api.list('detail', 0, id))[0]; if (!post?.isMine) throw new Error('본인의 게시물만 수정할 수 있어요.'); if (valid) { setOriginal(post); setDraft({ body: post.body, photos: post.photos, visibility: post.visibility, blocks: normalizeBlocks(post.blocks ?? []) }); setConfirmed(post.visibility === 'public'); } }
        else { const raw = await AsyncStorage.getItem(key); if (raw) { try { const saved = decodeFeedDraft(raw); if (valid) { setDraft(saved); setMessage('이 계정의 로컬 초안을 복원했어요. 공개 범위는 다시 확인해 주세요.'); } } catch { if (valid) setMessage('저장된 초안을 읽지 못했어요. 원본 초안은 지우지 않았으며 새 글을 작성할 수 있어요.'); } } }
        if (valid) setReady(true);
      } catch (caught) { if (valid) setMessage(caught instanceof Error ? caught.message : '작성 정보를 불러오지 못했어요.'); }
    })(); return () => { valid = false; };
  }, [api, id, key]);
  async function submit() {
    if (!ready || lock.current) return;
    const nextIssue = draftIssue(draft, confirmed), frozen = original ? lockedBlockIssue(original, draft.blocks) : null;
    if (nextIssue || frozen) { const result = nextIssue ?? { field: 'blocks' as const, message: frozen! }; setIssue(result); setMessage(result.message); scroll.current?.scrollTo({ y: Math.max(0, (positions.current[result.field] ?? 0) - 18), animated: true }); if (result.field === 'body') bodyInput.current?.focus(); return; }
    lock.current = true; setBusy(true); setMessage('');
    try { const result = await api.save(id ?? null, draft); await AsyncStorage.removeItem(key).catch(() => undefined); if (active.current) router.replace(`/post/${result}` as Href); }
    catch (caught) { if (active.current) setMessage(caught instanceof Error ? caught.message : '게시하지 못했어요. 입력은 유지됩니다.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  function add(type: FeedBlock['type']) { if (draft.blocks.some(block => block.type === type)) return; setDraft(value => ({ ...value, blocks: [...value.blocks, type === 'movie' ? { type, movieId: '' } : type === 'poll' ? { type, options: ['', ''] } : { type, prompt: '' }] })); }
  function blockAt(index: number, block: FeedBlock) { if (issue?.field === 'blocks') { setIssue(null); setMessage(''); } setDraft(value => ({ ...value, blocks: value.blocks.map((old, i) => i === index ? block : old) })); }
  async function photo() {
    if (lock.current) return; if (draft.photos.length >= 5) { setMessage('사진은 최대5장까지 추가할 수 있어요.'); return; }
    lock.current = true; setBusy(true);
    try { let path: string | null; if (mode === 'demo') { const blob = await pickCorePhoto(); path = blob ? await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); }) : null; } else path = await addCorePhoto(); if (active.current && path) setDraft(value => ({ ...value, photos: [...value.photos, path!] })); }
    catch (caught) { if (active.current) setMessage(caught instanceof Error ? caught.message : '사진을 추가하지 못했어요.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  async function searchMovies() { if (searching) return; setSearching(true); try { const result = await exploreCatalog(query, [], mode); if (active.current) setMovies(filterMovies(result.movies, query, '', defaultExploreFilters).slice(0, 2)); } catch { if (active.current) setMessage('영화 검색을 다시 시도해 주세요.'); } finally { if (active.current) setSearching(false); } }
  return <ExploreFrame><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#999999', paddingTop: 62 }}><View style={{ flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 23, borderTopRightRadius: 23, overflow: 'hidden' }}>
    <View style={{ height: 58, paddingHorizontal: 21, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Pressable accessibilityRole="button" accessibilityLabel="작성 창 닫기" disabled={busy} onPress={() => setExit(true)} hitSlop={12}><DesignVector name="feedClose" width={14} /></Pressable><Text accessibilityRole="header" style={[f.name, { position: 'absolute', left: 60, right: 60, textAlign: 'center', fontSize: 17, fontWeight: '700' }]}>{id ? '게시물 수정' : '새 게시물'}</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !ready }} disabled={busy || !ready} onPress={() => void submit()} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[f.name, { color: draft.body.trim() ? '#F8233C' : '#D1D5DB' }]}>{busy ? '저장 중' : '게시'}</Text></Pressable></View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingLeft: 21, paddingRight: 22, paddingBottom: 20 }}>
      <View onLayout={event => { positions.current.visibility = event.nativeEvent.layout.y; }} style={{ flexDirection: 'row', gap: 8, paddingTop: 24 }}><ProfileAvatar size={41} path={null} name={session.nickname ?? '나'} /><View><Text style={f.name}>{session.nickname ?? (mode === 'demo' ? '나 · 데모' : 'FLICK 사용자')}</Text><Pressable accessibilityRole="button" accessibilityLabel="게시물 공개 범위 선택" onPress={() => setVisibilityOpen(true)} style={f.row}><DesignVector name="feedGlobe" width={12.8333} /><Text style={f.small}>{draft.visibility === 'private' ? '나만 보기' : '전체 공개'} ▾</Text></Pressable></View></View>
      {issue?.field === 'visibility' ? <Text style={f.error}>{issue.message}</Text> : null}
      {ready ? <><View onLayout={event => { positions.current.body = event.nativeEvent.layout.y; }}><TextInput ref={bodyInput} accessibilityLabel="게시물 본문" placeholder="무슨 생각을 하고 계신가요?" placeholderTextColor="#99A1AF" multiline maxLength={2000} editable={!busy} value={draft.body} onChangeText={body => { setDraft(value => ({ ...value, body })); if (issue?.field === 'body') { setIssue(null); setMessage(''); } }} style={{ ...f.text, minHeight: 165, paddingTop: 15, textAlignVertical: 'top' }} />{issue?.field === 'body' ? <Text style={f.error}>{issue.message}</Text> : null}</View>
      <View onLayout={event => { positions.current.blocks = event.nativeEvent.layout.y; }} style={{ gap: 12, marginTop: 16 }}>{draft.blocks.map((block, index) => <View key={block.type} style={{ borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DC', backgroundColor: '#F9FAFB', paddingHorizontal: 13, paddingTop: 13, paddingBottom: 12, gap: block.type === 'movie' ? 11.5 : block.type === 'poll' ? 7 : 8 }}><View style={f.row}><Text style={[f.small, { color: '#4A5565', fontSize: 13, lineHeight: 19.5, fontWeight: '600', flex: 1 }]}>{block.type === 'movie' ? '영화 태그' : block.type === 'poll' ? '투표' : '질문'}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${block.type === 'movie' ? '영화' : block.type === 'poll' ? '투표' : '질문'} 첨부 제거`} disabled={busy} onPress={() => setDraft(value => ({ ...value, blocks: value.blocks.filter((_, i) => i !== index) }))} hitSlop={10}><DesignVector name="feedBlockClose" width={11.6667} /></Pressable></View>
        {block.type === 'movie' ? <><View style={f.row}><TextInput placeholderTextColor="#99A1AF" accessibilityLabel="첨부 영화 제목" value={query} onChangeText={setQuery} style={[f.input, { flex: 1, minWidth: 0 }]} placeholder="제목을 입력하세요" onSubmitEditing={() => void searchMovies()} /><Pressable accessibilityRole="button" accessibilityLabel="첨부 영화 검색" disabled={searching} onPress={() => void searchMovies()}><Text style={f.small}>{searching ? '검색 중' : '검색'}</Text></Pressable></View>{block.movieId ? <Text style={f.small}>선택: {movies.find(movie => movie.id === block.movieId)?.title || original?.movie?.title || '영화 선택 완료'}</Text> : null}{movies.map(movie => <Pressable accessibilityRole="button" accessibilityLabel={`${movie.title} 첨부 선택`} accessibilityState={{ selected: movie.id === block.movieId }} key={movie.id} onPress={() => blockAt(index, { type: 'movie', movieId: movie.id })} style={f.row}><ExplorePoster movie={movie} width={45} height={66} radius={5} /><View style={{ flex: 1 }}><Text style={f.name}>{movie.title}</Text><Text style={f.small}>{movie.releaseDate?.slice(0, 4) || '연도 미상'}</Text></View></Pressable>)}</> : block.type === 'poll' ? <>{block.options.map((option, optionIndex) => <View style={f.row} key={optionIndex}><TextInput placeholderTextColor="#99A1AF" accessibilityLabel={`투표 선택지 ${optionIndex + 1}`} value={option} onChangeText={text => blockAt(index, { type: 'poll', options: block.options.map((old, i) => i === optionIndex ? text : old) })} maxLength={80} style={[f.input, { flex: 1 }]} placeholder={`선택지 ${optionIndex + 1}`} /><Pressable accessibilityRole="button" accessibilityLabel={`선택지 ${optionIndex + 1} 제거`} onPress={() => { if (block.options.length <= 2) setMessage('투표 선택지는 최소2개가 필요해요.'); else blockAt(index, { type: 'poll', options: block.options.filter((_, i) => i !== optionIndex) }); }} hitSlop={10}><DesignVector name="feedOptionRemove" width={9.66667} /></Pressable></View>)}<Pressable accessibilityRole="button" disabled={block.options.length >= 5} onPress={() => blockAt(index, { type: 'poll', options: [...block.options, ''] })}><Text style={{ ...f.small, color: '#F8233C', fontSize: 11, lineHeight: 16.5 }}>+ 선택지 추가</Text></Pressable></> : <><TextInput placeholderTextColor="#99A1AF" accessibilityLabel="익명 질문 내용" maxLength={120} value={block.prompt} onChangeText={prompt => blockAt(index, { type: 'question', prompt })} style={f.input} placeholder="질문을 입력하세요 (예: 무엇이든 물어보세요)" /></>}
      </View>)}{issue?.field === 'blocks' ? <Text style={f.error}>{issue.message}</Text> : null}{draft.photos.map((path, index) => <View key={index}><FeedPhoto path={path} style={{ width: '100%', height: 180, borderRadius: 10 }} /><Pressable accessibilityRole="button" onPress={() => setDraft(value => ({ ...value, photos: value.photos.filter((_, i) => i !== index) }))}><Text style={f.small}>사진 {index + 1} 제거</Text></Pressable></View>)}</View></> : <ActivityIndicator color="#F8233C" style={{ margin: 30 }} />}
      {message ? <Text accessibilityRole="alert" style={[f.error, { marginTop: 14 }]}>{message}</Text> : null}{mode === 'demo' ? <Text style={[f.small, { marginTop: 16 }]}>데모 · 이 기기에 저장</Text> : null}
    </ScrollView><View style={f.toolbar}>
      <AttachmentButton label="사진" icon="feedPhoto" disabled={busy || !ready} onPress={() => void photo()} />
      <AttachmentButton label="비디오" icon="feedVideo" disabled={busy || !ready} onPress={() => setMessage('비디오 업로드는 준비 중이에요.')} />
      <AttachmentButton label="영화" icon="feedMovie" disabled={busy || !ready} onPress={() => { add('movie'); void searchMovies(); }} />
      <AttachmentButton label="투표" icon="feedPoll" disabled={busy || !ready} onPress={() => add('poll')} />
      <AttachmentButton label="질문" icon="feedQuestion" disabled={busy || !ready} onPress={() => add('question')} />
    </View>
  </View></KeyboardAvoidingView>
  {visibilityOpen ? <ExploreDialog title="공개 범위" onClose={() => setVisibilityOpen(false)}><View style={{ gap: 14, paddingVertical: 10 }}><ExploreButton label="나만 보기" secondary onPress={() => { setDraft(value => ({ ...value, visibility: 'private' })); setConfirmed(false); setVisibilityOpen(false); }} /><Text style={f.small}>전체 공개 글은 로그인한 다른 사용자가 볼 수 있고 참여할 수 있어요.</Text><ExploreButton label="확인했어요 · 전체 공개" onPress={() => { setDraft(value => ({ ...value, visibility: 'public' })); setConfirmed(true); setVisibilityOpen(false); }} /></View></ExploreDialog> : null}
  {exit ? <ExploreDialog title="작성을 그만할까요?" onClose={() => setExit(false)}><View style={{ gap: 12, paddingVertical: 10 }}><ExploreButton label="초안 저장 후 나가기" secondary onPress={() => { void AsyncStorage.setItem(key, JSON.stringify(draft)).then(() => router.replace('/feed')).catch(() => setMessage('초안을 저장하지 못했어요. 창을 닫지 말고 다시 시도해 주세요.')); }} /><ExploreButton label="저장하지 않고 나가기" secondary onPress={() => { void AsyncStorage.removeItem(key).then(() => router.replace('/feed')).catch(() => { setExit(false); setMessage('로컬 초안을 지우지 못했어요. 다시 시도해 주세요.'); }); }} /><ExploreButton label="계속 작성" onPress={() => setExit(false)} /></View></ExploreDialog> : null}
  </ExploreFrame>;
}
function AttachmentButton({ label, icon, disabled, onPress }: { label: string; icon: DesignVectorName; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label} 추가`} onPress={onPress} disabled={disabled} style={{ alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 42, minHeight: 48 }}><DesignVector name={icon} width={icon === 'feedQuestion' ? 18.3333 : icon === 'feedVideo' ? 18.3337 : 16.6667} /><Text style={[f.small, { fontSize: 10, lineHeight: 15 }]}>{label}</Text></Pressable>;
}
