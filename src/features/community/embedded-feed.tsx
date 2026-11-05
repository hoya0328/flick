import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ExploreButton } from '../discovery/explore-ui';
import { createFeedApi } from './feed-service';
import { FeedPostCard, f } from './feed-ui';
import { FeedOverlays } from './feed-overlays';
import { mergeById } from './social-service';
import type { FeedPost } from './feed-model';
export function EmbeddedFeed({ mode, scope }: { mode: 'demo' | 'supabase'; scope: 'mine' | 'saved' }) {
  const api = useMemo(() => createFeedApi(mode), [mode]);
  const [rows, setRows] = useState<FeedPost[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [more, setMore] = useState(false), [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<FeedPost | null>(null), [kind, setKind] = useState<'menu' | 'photos' | 'question' | null>(null);
  const generation = useRef(0), lock = useRef(false), offset = useRef(0);
  const load = useCallback(async (reset = true) => { const token = generation.current; setBusy(true); try { const next = await api.list(scope, reset ? 0 : offset.current); if (token !== generation.current) return; setRows(old => reset ? next : mergeById(old, next)); offset.current = reset ? next.length : offset.current + next.length; setMore(next.length === 20); setReady(true); setError(''); } catch (caught) { if (token === generation.current) setError(caught instanceof Error ? caught.message : '목록을 불러오지 못했어요.'); } finally { if (token === generation.current) setBusy(false); } }, [api, scope]);
  useFocusEffect(useCallback(() => { generation.current++; const timer = setTimeout(() => void load(), 0); return () => { clearTimeout(timer); generation.current++; }; }, [load]));
  async function act(task: () => Promise<unknown>) { if (lock.current) return; lock.current = true; setBusy(true); const token = generation.current; try { await task(); if (token === generation.current) await load(); } catch (caught) { if (token === generation.current) setError(caught instanceof Error ? caught.message : '처리하지 못했어요.'); } finally { lock.current = false; if (token === generation.current) setBusy(false); } }
  function overlay(post: FeedPost, value: typeof kind) { setSelected(post); setKind(value); }
  return <View>{mode === 'demo' ? <Text style={[f.small, { margin: 21 }]}>로컬 데모 · 이 브라우저의 글과 참여만 보여요.</Text> : null}{scope === 'mine' && ready && !rows.length ? <View style={{ padding: 21 }}><ExploreButton label="새 게시물 작성" secondary onPress={() => router.push('/post-edit')} /></View> : null}{error ? <View style={{ padding: 21, gap: 10 }}><Text accessibilityRole="alert" style={f.error}>{error}</Text><ExploreButton label="다시 불러오기" secondary busy={busy} onPress={() => void load()} /></View> : null}{busy ? <ActivityIndicator color="#F8233C" /> : null}{rows.map(post => <FeedPostCard key={post.id} post={post} api={api} busy={busy} act={task => void act(task)} onMenu={post => overlay(post, 'menu')} onQuestion={post => overlay(post, 'question')} onPhotos={post => overlay(post, 'photos')} />)}{ready && !rows.length ? <Text style={{ ...f.small, padding: 21 }}>{scope === 'mine' ? '아직 내 게시물이 없어요. 나만 보기 글도 여기에 모입니다.' : '아직 저장한 공개 게시물이 없어요.'}</Text> : null}{more ? <View style={{ padding: 21 }}><ExploreButton label="게시물 더 보기" secondary busy={busy} onPress={() => void load(false)} /></View> : null}<FeedOverlays key={`${selected?.id}:${kind}`} selected={selected} kind={kind} api={api} close={() => { setSelected(null); setKind(null); }} act={task => void act(task)} /></View>;
}
