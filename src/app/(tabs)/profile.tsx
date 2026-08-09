import { type Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { getKeywordLabels } from '@/features/onboarding/keywords';
import { listReviews, type ReviewRecord } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';
import { readClientIssues, recordClientIssue } from '@/lib/observability';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function ProfileScreen() {
  const { backendConfigured, clearSession, deleteAccount, mode, resetOnboarding, selectedKeywords } = useSession();
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'warning' } | null>(null);

  useEffect(() => {
    let active = true;
    void listReviews(mode === 'supabase' ? 'supabase' : 'demo').then((result) => { if (active) setRecords(result); }).catch((error) => { void recordClientIssue('profile.export-load', error); if (active) setNotice({ title: '데이터 확인이 필요해요', message: '내보낼 기록을 불러오지 못했어요.', tone: 'warning' }); });
    return () => { active = false; };
  }, [mode]);

  const handleReset = async () => {
    await resetOnboarding();
    router.replace('/onboarding');
  };

  const handleClearSession = async () => {
    await clearSession();
    router.replace('/welcome');
  };

  const handleExport = async () => {
    setNotice(null);
    const payload = { exportedAt: new Date().toISOString(), keywords: getKeywordLabels(selectedKeywords), reviews: records, recentDiagnostics: await readClientIssues() };
    try {
      await Share.share({ message: JSON.stringify(payload, null, 2), title: 'FLICK 내 데이터' });
      setNotice({ title: '내보내기 화면을 열었어요', message: '저장하거나 전송할 위치는 사용자가 직접 결정합니다.', tone: 'success' });
    } catch { setNotice({ title: '내보내지 못했어요', message: '이 기기의 공유 기능을 사용할 수 없어요.', tone: 'danger' }); }
  };

  const handleDelete = async () => {
    setWorking(true);
    setNotice(null);
    try {
      await deleteAccount();
      router.replace('/welcome');
    } catch (error) {
      void recordClientIssue('profile.account-delete', error);
      setNotice({ title: '계정을 삭제하지 못했어요', message: error instanceof Error ? error.message : '잠시 뒤 다시 시도해 주세요.', tone: 'danger' });
    } finally { setWorking(false); }
  };

  return (
    <Screen eyebrow="나의 FLICK" title="취향 설정">
      {notice ? <StateNotice {...notice} /> : null}
      <Text style={styles.label}>선택한 키워드</Text>
      <Text style={styles.value}>{getKeywordLabels(selectedKeywords).join(' · ')}</Text>
      <StateNotice
        message={backendConfigured ? 'Supabase 연결이 준비됐습니다.' : '환경변수 연결 전까지 기기 안의 데모 데이터만 사용합니다.'}
        title={mode === 'demo' ? '데모 모드' : '계정 모드'}
        tone={backendConfigured ? 'success' : 'warning'}
      />
      <Button label="취향 키워드 다시 고르기" onPress={() => void handleReset()} variant="secondary" />
      <Button label="나의 아카이브와 리포트" onPress={() => router.push('/archive' as Href)} variant="secondary" />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>내 데이터 관리</Text>
        <Text style={styles.help}>삭제 전에 현재 취향 설정과 기록을 JSON 텍스트로 내보낼 수 있어요.</Text>
        <Button label="내 데이터 내보내기" onPress={() => void handleExport()} variant="secondary" />
        {pendingDelete ? (
          <View style={styles.dangerBox}>
            <Text style={styles.dangerTitle}>계정과 모든 데이터를 영구 삭제할까요?</Text>
            <Text style={styles.help}>기록·질문·태그·보고 싶어요·취향 설정이 삭제되며 복구할 수 없습니다.</Text>
            <Button label="취소" onPress={() => setPendingDelete(false)} variant="ghost" />
            <Button label="계정과 데이터 영구 삭제" loading={working} onPress={() => void handleDelete()} variant="secondary" />
          </View>
        ) : <Button label={mode === 'demo' ? '데모 데이터 전체 삭제' : '계정과 데이터 삭제'} onPress={() => setPendingDelete(true)} variant="ghost" />}
      </View>
      <Button label={mode === 'demo' ? '로그인 화면으로 돌아가기' : '로그아웃'} onPress={() => void handleClearSession()} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, color: colors.textMuted },
  value: { ...typography.heading, color: colors.text },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text },
  help: { ...typography.caption, color: colors.textMuted },
  dangerBox: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, gap: spacing.md, padding: spacing.md },
  dangerTitle: { ...typography.label, color: colors.danger },
});
