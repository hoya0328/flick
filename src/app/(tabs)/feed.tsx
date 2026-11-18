import { type Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { DesignVector } from '@/components/design-vector';
import { ExploreButton, ExploreDialog, ExploreFrame, ExploreMessage } from '@/features/discovery/explore-ui';
import FeedLibrary from '@/features/community/feed-library';
import { createFeedApi } from '@/features/community/feed-service';
import { FeedPostCard, f } from '@/features/community/feed-ui';
import { FeedOverlays } from '@/features/community/feed-overlays';
import type { FeedPost } from '@/features/community/feed-model';
import { mergeById } from '@/features/community/social-service';
import { ProfileAvatar } from '@/features/profile/profile-ui';
import { useSession } from '@/features/session/session-provider';
const librarySections = ['light', 'core', 'rankings', 'curations', 'collections'];
export default function FeedScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>(), session = useSession();
  if (typeof section === 'string' && librarySections.includes(section)) return <FeedLibrary />;
  return <Timeline key={`${session.mode}:${session.email ?? ''}`} scope={section === 'mine' || section === 'saved' || section === 'following' ? section : 'public'} />;
}
function Timeline({ scope }: { scope: 'public' | 'following' | 'mine' | 'saved' }) {
  const following = scope === 'following', mine = scope === 'mine', saved = scope === 'saved';
  const session = useSession(), api = useMemo(() => createFeedApi(session.mode === 'supabase' ? 'supabase' : 'demo'), [session.mode]);
  const [posts, setPosts] = useState<FeedPost[]>([]), [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading'), [busy, setBusy] = useState(false), [more, setMore] = useState(false), [message, setMessage] = useState(''), [available, setAvailable] = useState(false);
  const [selected, setSelected] = useState<FeedPost | null>(null), [kind, setKind] = useState<'menu' | 'photos' | 'question' | null>(null), [search, setSearch] = useState(false), [query, setQuery] = useState(''), [extras, setExtras] = useState(false);
  const generation = useRef(0), lock = useRef(false), offset = useRef(0);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const load = useCallback(async (reset = true) => {
    const token = generation.current;
    setBusy(true); if (reset) setStatus('loading');
    try { const rows = await api.list(scope, reset ? 0 : offset.current); const enabled = await api.available(); if (token !== generation.current) return; setPosts(old => reset ? rows : mergeById(old, rows)); offset.current = reset ? rows.length : offset.current + rows.length; setMore(rows.length === 20); setAvailable(enabled); setStatus('ready'); }
    catch (caught) { if (token === generation.current) { setStatus('error'); setMessage(caught instanceof Error ? caught.message : '피드를 불러오지 못했어요.'); } }
    finally { if (token === generation.current) setBusy(false); }
  }, [api, scope]);
  useFocusEffect(useCallback(() => { invalidate(); const timer = setTimeout(() => void load(), 0); return () => { clearTimeout(timer); invalidate(); }; }, [invalidate, load]));
  async function act(task: () => Promise<unknown>) { if (lock.current) return; lock.current = true; setBusy(true); setMessage(''); const token = generation.current; try { await task(); if (token === generation.current) await load(); } catch (caught) { if (token === generation.current) setMessage(caught instanceof Error ? caught.message : '요청하지 못했어요.'); } finally { lock.current = false; if (token === generation.current) setBusy(false); } }
  const shown = posts.filter(post => `${post.body} ${post.movie?.title ?? ''}`.toLocaleLowerCase('ko-KR').includes(query.toLocaleLowerCase('ko-KR')));
  if (scope === 'public') shown.sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount) || b.createdAt.localeCompare(a.createdAt));
  const overlay = (post: FeedPost, next: typeof kind) => { setSelected(post); setKind(next); };
  return <ExploreFrame><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 36 }}>
    <View style={{ marginTop: 90, marginHorizontal: 21, height: 30, flexDirection: 'row', alignItems: 'center' }}><DesignVector name="symbol" width={29} height={28} /><View style={{ position: 'absolute', left: '50%', transform: [{ translateX: -58.2 }] }}><DesignVector name="wordmark" width={116.4} height={22} /></View><View style={[f.row, { marginLeft: 'auto', gap: 12 }]}><Pressable accessibilityRole="button" accessibilityLabel="피드 검색" onPress={() => setSearch(value => !value)} hitSlop={8}><DesignVector name="feedSearch" width={22} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="다른 피드 콘텐츠와 메시지 안내" onPress={() => setExtras(true)} hitSlop={8}><DesignVector name="feedSend" width={27.2424} /></Pressable></View></View>
    <View style={{ flexDirection: 'row', marginTop: 24, height: 43, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>{['인기', '팔로우'].map((label, index) => <Pressable key={label} accessibilityRole="tab" aria-selected={!mine && !saved && following === Boolean(index)} accessibilityState={{ selected: !mine && !saved && following === Boolean(index) }} onPress={() => router.setParams({ section: index ? 'following' : 'daily' })} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderBottomWidth: !mine && !saved && following === Boolean(index) ? 2 : 0, borderBottomColor: '#F8233C' }}><Text style={[f.small, { color: !mine && !saved && following === Boolean(index) ? '#000000' : '#99A1AF', fontSize: 13 }]}>{label}</Text></Pressable>)}</View>
    {search ? <View style={{ padding: 21, gap: 8 }}><TextInput placeholderTextColor="#99A1AF" accessibilityLabel="피드 검색어" value={query} onChangeText={setQuery} maxLength={100} style={f.input} placeholder="게시물·영화 검색" /></View> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="새 게시물 작성" onPress={() => router.push('/post-edit' as Href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 21, paddingTop: 20, paddingBottom: 19, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}><ProfileAvatar size={41} path={null} name={session.nickname ?? '나'} /><View style={{ flex: 1, borderRadius: 25, minHeight: 45, backgroundColor: '#F9FAFB', justifyContent: 'center', paddingHorizontal: 14 }}><Text style={f.small}>무슨 생각을 하고 계신가요?</Text></View></Pressable>
    {session.mode === 'demo' ? <Text style={{ ...f.small, paddingHorizontal: 21, paddingTop: 10 }}>데모</Text> : !available && status === 'ready' ? <Text style={{ ...f.small, padding: 21 }}>일부 기능을 준비 중이에요.</Text> : null}
    {mine || saved ? <Text style={{ ...f.small, paddingHorizontal: 21, paddingTop: 12 }}>{mine ? '내 게시물' : '저장한 게시물'}</Text> : null}
    {message ? <Text accessibilityRole="alert" style={{ ...f.error, padding: 21 }}>{message}</Text> : null}
    {status === 'loading' ? <ActivityIndicator color="#F8233C" style={{ margin: 25 }} /> : null}
    {shown.map(post => <FeedPostCard key={post.id} post={post} api={api} act={task => void act(task)} busy={busy} onMenu={post => overlay(post, 'menu')} onQuestion={post => overlay(post, 'question')} onPhotos={post => overlay(post, 'photos')} />)}
    {status === 'ready' && !shown.length ? <ExploreMessage title={following ? '팔로우한 플리커의 글이 없어요' : '표시할 게시물이 없어요'}>다른 플리커를 찾거나 첫 이야기를 남겨보세요.</ExploreMessage> : null}
    {status === 'error' ? <ExploreMessage title="피드를 불러오지 못했어요" onRetry={() => void load()}>입력과 기존 계정은 유지됩니다. 연결 후 다시 시도해 주세요.</ExploreMessage> : null}
    {more ? <View style={{ padding: 21 }}><ExploreButton label="게시물 더 불러오기" secondary busy={busy} onPress={() => void load(false)} /></View> : null}
  </ScrollView><FeedOverlays key={`${selected?.id}:${kind}`} selected={selected} kind={kind} api={api} close={() => { setSelected(null); setKind(null); }} act={task => void act(task)} />{extras ? <ExploreDialog title="다른 콘텐츠" onClose={() => setExtras(false)}><View style={{ gap: 10, paddingVertical: 10 }}><ExploreButton label="내 게시물" secondary onPress={() => { setExtras(false); router.setParams({ section: 'mine' }); }} /><ExploreButton label="저장한 게시물" secondary onPress={() => { setExtras(false); router.setParams({ section: 'saved' }); }} />{['Light 리뷰', 'Core 매거진', '주간 랭킹', '큐레이션', '컬렉션'].map((label, index) => <ExploreButton key={label} label={label} secondary onPress={() => { setExtras(false); router.setParams({ section: librarySections[index]! }); }} />)}<ExploreButton label="플리커 찾기" secondary onPress={() => { setExtras(false); router.push('/people' as Href); }} /><ExploreButton label="내 피드 휴지통" secondary onPress={() => { setExtras(false); router.push('/post-trash' as Href); }} /></View></ExploreDialog> : null}</ExploreFrame>;
}
