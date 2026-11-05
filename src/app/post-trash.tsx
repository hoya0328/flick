import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSession } from '@/features/session/session-provider';
import { createFeedApi } from '@/features/community/feed-service';
import type { FeedPost } from '@/features/community/feed-model';
import { ExploreButton, ExploreFrame } from '@/features/discovery/explore-ui';
import { f } from '@/features/community/feed-ui';
import { Screen } from "@/components/screen";
import {
  CommunityGate,
  BackButton,
  SocialPosts,
} from "@/features/community/social-ui";
import { p } from "@/features/profile/profile-ui";
export default function Trash() {
  const session = useSession();
  if (session.mode === 'demo') return <DemoTrash />;
  return (
    <CommunityGate>
      <Screen title="일상 기록 휴지통">
        <Text style={p.body}>
          최근 7일 동안 삭제한 내 글만 복원할 수 있어요. 복원할 때는 나만 보기로
          돌아갑니다. 운영자가 숨긴 글은 복원할 수 없어요.
        </Text>
        <SocialPosts scope="trash" />
        <BackButton />
      </Screen>
    </CommunityGate>
  );
}
function DemoTrash() {
  const api = useMemo(() => createFeedApi('demo'), []), active = useRef(true), lock = useRef(false);
  const [rows, setRows] = useState<FeedPost[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [more, setMore] = useState(false);
  async function load(offset = 0) { const next = await api.list('trash', offset); if (active.current) { setRows(old => offset ? [...old, ...next] : next); setMore(next.length === 20); } }
  useEffect(() => { active.current = true; void api.list('trash').then(next => { if (active.current) { setRows(next); setMore(next.length === 20); } }).catch(() => { if (active.current) setMessage('로컬 휴지통을 불러오지 못했어요.'); }); return () => { active.current = false; }; }, [api]);
  async function act(task: () => Promise<unknown>) { if (lock.current) return; lock.current = true; setBusy(true); try { await task(); } catch { if (active.current) setMessage('처리하지 못했어요. 다시 시도해 주세요.'); } finally { lock.current = false; if (active.current) setBusy(false); } }
  return <ExploreFrame><ScrollView contentContainerStyle={{ padding: 21, paddingTop: 70, gap: 16 }}><Text accessibilityRole="header" style={{ ...f.name, fontSize: 20 }}>로컬 데모 휴지통</Text><Text style={f.text}>최근7일 동안 삭제한 내 데모 글입니다. 복원하면 나만 보기로 돌아갑니다. 실제 계정·서버에는 영향을 주지 않아요.</Text>{message ? <Text accessibilityRole="alert" style={f.error}>{message}</Text> : null}{rows.map(post => <View key={post.id} style={{ gap: 10, backgroundColor: '#F9FAFB', padding: 14, borderRadius: 14 }}><Text style={f.text}>{post.body}</Text><ExploreButton label="나만 보기로 복원" secondary busy={busy} onPress={() => void act(async () => { await api.restore(post.id); await load(); })} /></View>)}{!rows.length ? <Text style={f.small}>휴지통이 비어 있어요.</Text> : null}{more ? <ExploreButton label="더 불러오기" secondary busy={busy} onPress={() => void act(() => load(rows.length))} /> : null}<ExploreButton label="다시 불러오기" secondary busy={busy} onPress={() => void act(() => load())} /><ExploreButton label="피드로 돌아가기" secondary onPress={() => router.replace('/feed')} /></ScrollView></ExploreFrame>;
}
