import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { DesignVector } from '@/components/design-vector';
import { ExploreButton, ExploreFrame, ExploreMessage } from '@/features/discovery/explore-ui';
import { createFeedApi } from '@/features/community/feed-service';
import { FeedPostCard, FeedIconButton, f } from '@/features/community/feed-ui';
import { FeedOverlays } from '@/features/community/feed-overlays';
import { timeAgo, UUID, type FeedComment, type FeedPost } from '@/features/community/feed-model';
import { mergeById, safeCommunityPath } from '@/features/community/social-service';
import { ProfileAvatar } from '@/features/profile/profile-ui';
import { useSession } from '@/features/session/session-provider';
export default function PostDetailRoute() {
  const session = useSession(), params = useLocalSearchParams<{ id?: string }>(), id = typeof params.id === 'string' ? params.id : '';
  if (session.status === 'loading') return <ExploreFrame><ActivityIndicator color="#F8233C" /></ExploreFrame>;
  if (session.mode === 'none' || session.status === 'error') return <Redirect href={{ pathname: '/welcome', params: { returnTo: safeCommunityPath(`/post/${id}`) ?? '' } }} />;
  if (!session.onboardingComplete) return <Redirect href="/onboarding" />;
  return <Detail key={`${session.mode}:${session.email}:${id}`} id={id} />;
}
function Detail({ id }: { id: string }) {
  const session = useSession(), api = useMemo(() => createFeedApi(session.mode === 'supabase' ? 'supabase' : 'demo'), [session.mode]);
  const [post, setPost] = useState<FeedPost | null>(null), [comments, setComments] = useState<FeedComment[]>([]), [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [message, setMessage] = useState(''), [more, setMore] = useState(false);
  const [body, setBody] = useState(''), [reply, setReply] = useState<FeedComment | null>(null), [kind, setKind] = useState<'menu' | 'question' | 'photos' | null>(null), [inputIssue, setInputIssue] = useState('');
  const generation = useRef(0), lock = useRef(false), offset = useRef(0), input = useRef<TextInput>(null);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const load = useCallback(async () => {
    const token = generation.current; setBusy(true);
    try { if (!UUID.test(id)) throw new Error('잘못된 게시물 주소예요.'); const rows = await api.list('detail', 0, id); const nextComments = rows[0] ? await api.comments(id) : []; if (token !== generation.current) return; setPost(rows[0] ?? null); setComments(nextComments); offset.current = nextComments.filter(item => !item.parentId).length; setMore(offset.current === 30); setReady(true); }
    catch (caught) { if (token === generation.current) setMessage(caught instanceof Error ? caught.message : '게시물을 불러오지 못했어요.'); }
    finally { if (token === generation.current) setBusy(false); }
  }, [api, id]);
  useFocusEffect(useCallback(() => { invalidate(); const timer = setTimeout(() => void load(), 0); return () => { clearTimeout(timer); invalidate(); }; }, [invalidate, load]));
  async function act(task: () => Promise<unknown>) {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage(''); const token = generation.current;
    try { await task(); if (token === generation.current) await load(); }
    catch (caught) { if (token === generation.current) setMessage(caught instanceof Error ? caught.message : '처리하지 못했어요.'); }
    finally { lock.current = false; if (token === generation.current) setBusy(false); }
  }
  async function comment() { if (!body.trim() || body.trim().length > 500) { setInputIssue('댓글을 1~500자로 입력해야 합니다.'); input.current?.focus(); return; } await act(async () => { await api.comment(id, body, reply?.id ?? null); setBody(''); setReply(null); setInputIssue(''); }); }
  async function loadMore() { if (lock.current) return; lock.current = true; setBusy(true); const token = generation.current; try { const rows = await api.comments(id, offset.current); if (token === generation.current) { setComments(old => mergeById(old, rows)); const roots = rows.filter(item => !item.parentId).length; offset.current += roots; setMore(roots === 30); } } catch { if (token === generation.current) setMessage('댓글을 더 불러오지 못했어요.'); } finally { lock.current = false; if (token === generation.current) setBusy(false); } }
  const commentCard = (item: FeedComment) => <View key={item.id} style={{ paddingVertical: 12, marginLeft: item.parentId ? 36 : 0, gap: 8 }}><View style={f.row}><Pressable accessibilityRole="button" accessibilityLabel={`${item.name} 댓글 작성자 프로필`} disabled={item.removed || !item.authorProfileId || api.mode === 'demo'} onPress={() => { if (item.authorProfileId) router.push({ pathname: '/people/[id]', params: { id: item.authorProfileId } }); }} style={[f.row, { flexShrink: 1 }]}><ProfileAvatar size={29} path={item.removed ? null : item.avatar ?? null} name={item.removed ? '삭제' : item.name} /><Text style={[f.name, { fontSize: 15, flexShrink: 1 }]}>{item.removed ? '삭제된 댓글' : item.name}</Text></Pressable><Text style={f.small}>{timeAgo(item.createdAt)}</Text>{item.isPostAuthor && !item.removed ? <Text style={{ ...f.small, color: '#F8233C', fontSize: 11 }}>작성자</Text> : null}{item.isMine && !item.removed ? <Pressable accessibilityRole="button" accessibilityLabel="내 댓글 삭제" disabled={busy} onPress={() => void act(() => api.removeComment(item.id))} style={{ marginLeft: 'auto', padding: 4 }}><Text style={f.small}>삭제</Text></Pressable> : null}</View><Text style={f.text}>{item.removed ? '작성자가 삭제한 댓글이에요.' : item.body}</Text>{!item.removed ? <View style={f.row}><FeedIconButton icon="feedLike" label={`댓글 공감 ${item.likeCount ?? 0}`} active={item.viewerLiked} disabled={busy || post?.visibility !== 'public'} onPress={() => void act(() => api.likeComment(item.id, !item.viewerLiked))}><Text style={f.small}>{item.likeCount ?? 0}</Text></FeedIconButton>{!item.parentId ? <Pressable accessibilityRole="button" disabled={busy || post?.visibility !== 'public'} onPress={() => { setReply(item); setInputIssue(''); input.current?.focus(); }}><Text style={[f.small, { textDecorationLine: 'underline' }]}>답글 달기</Text></Pressable> : null}</View> : null}</View>;
  return <ExploreFrame><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 22 }}>
    <View style={{ marginTop: 81, height: 44, paddingHorizontal: 21, flexDirection: 'row', alignItems: 'center', marginBottom: 19 }}><Pressable accessibilityRole="button" accessibilityLabel="피드로 돌아가기" onPress={() => router.replace('/feed')} hitSlop={10}><DesignVector name="exploreBack" width={12.5663} style={{ transform: [{ rotate: '180deg' }] }} /></Pressable><Text accessibilityRole="header" style={{ ...f.name, flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', marginRight: 12 }}>피드</Text></View>
    {message ? <Text accessibilityRole="alert" style={{ ...f.error, paddingHorizontal: 21, marginBottom: 15 }}>{message}</Text> : null}
    {!ready ? <ExploreMessage title={message ? '게시물을 불러오지 못했어요' : '게시물을 불러오는 중이에요'} onRetry={() => void load()}>{message || '잠시만 기다려 주세요.'}</ExploreMessage> : !post ? <ExploreMessage title="게시물을 볼 수 없어요">비공개·삭제되었거나 접근 권한이 없는 글이에요.</ExploreMessage> : <><FeedPostCard post={post} api={api} act={task => void act(task)} onMenu={() => setKind('menu')} onQuestion={() => setKind('question')} onPhotos={() => setKind('photos')} detail busy={busy} onComment={() => input.current?.focus()} />
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 21, paddingVertical: 14 }}><Text accessibilityRole="header" style={{ ...f.name, fontSize: 20, fontWeight: '700' }}>댓글 {post.commentCount}</Text></View><View style={{ paddingHorizontal: 21 }}>{comments.filter(item => !item.parentId).map(root => <View key={root.id}>{commentCard(root)}{comments.filter(item => item.parentId === root.id).map(commentCard)}</View>)}{more ? <ExploreButton label="댓글 더 보기" secondary busy={busy} onPress={() => void loadMore()} /> : null}</View></>}
  </ScrollView>{post?.visibility === 'public' ? <View style={{ padding: 16, paddingTop: 8, backgroundColor: '#FFFFFF', gap: 5 }}>{reply ? <View style={f.row}><Text style={[f.small, { flex: 1 }]}>{reply.name}님에게 답글</Text><Pressable accessibilityRole="button" onPress={() => setReply(null)}><Text style={f.small}>답글 취소</Text></Pressable></View> : null}<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 24, paddingHorizontal: 8 }}><ProfileAvatar size={29} path={null} name={session.nickname ?? '나'} /><TextInput ref={input} placeholderTextColor="#99A1AF" accessibilityLabel={reply ? '답글 작성' : '댓글 작성'} placeholder={reply ? '답글 작성하기' : '댓글 작성하기'} value={body} onChangeText={setBody} maxLength={500} multiline style={{ ...f.text, flex: 1, minHeight: 41, maxHeight: 100, paddingVertical: 9 }} /><Pressable accessibilityRole="button" accessibilityLabel="댓글 등록" disabled={busy} onPress={() => void comment()} style={{ paddingHorizontal: 8, minHeight: 41, justifyContent: 'center' }}><Text style={{ ...f.small, color: '#F8233C' }}>등록</Text></Pressable></View>{inputIssue ? <Text accessibilityRole="alert" style={f.error}>{inputIssue}</Text> : null}</View> : null}
    <FeedOverlays key={`${post?.id}:${kind}`} selected={post} kind={kind} api={api} close={() => setKind(null)} act={task => void act(task)} />
  </ExploreFrame>;
}
