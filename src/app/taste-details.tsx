import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { Screen } from '@/components/screen';
import { Button } from '@/components/button';
import { listReviews, type ReviewRecord } from '@/features/reviews/reviews';
import { TwelveTastePanel } from '@/features/reports/twelve-taste-panel';
import { useSession } from '@/features/session/session-provider';
export default function TasteDetailsRoute() { const session = useSession(); if (session.status === 'loading') return <Screen title="분석 기준"><ActivityIndicator /></Screen>; if (session.mode === 'none' || session.status === 'error') return <Redirect href="/welcome" />; if (!session.onboardingComplete) return <Redirect href="/onboarding" />; return <Details key={`${session.mode}:${session.email}`} mode={session.mode} />; }
function Details({ mode }: { mode: 'demo' | 'supabase' }) {
  const [records, setRecords] = useState<ReviewRecord[] | null>(null), [error, setError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => { const token = ++generation.current; try { const rows = await listReviews(mode); if (token === generation.current) { setRecords(rows); setError(''); } } catch { if (token === generation.current) setError('기록을 불러오지 못했어요. 원본은 변경하지 않았습니다.'); } }, [mode]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  return <Screen title="분석 기준 · 12가지 취향"><Button label="취향 리포트로 돌아가기" variant="secondary" onPress={() => router.replace('/taste-insights')} />{error ? <><Text accessibilityRole="alert">{error}</Text><Button label="다시 불러오기" onPress={() => void load()} /></> : null}{records ? <TwelveTastePanel records={records} mode={mode} /> : !error ? <ActivityIndicator color="#F8233C" /> : null}</Screen>;
}
