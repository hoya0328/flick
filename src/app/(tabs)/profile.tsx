import { type Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { getMyAdminAccess } from '@/features/admin/admin-service';
import { validateNickname, validatePassword, validatePasswordConfirmation } from '@/features/session/account-logic';
import { getKeywordLabels } from '@/features/onboarding/keywords';
import { listReviews, type ReviewRecord } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';
import { readClientIssues, recordClientIssue } from '@/lib/observability';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function ProfileScreen() {
  const {
    backendConfigured,
    clearSession,
    deleteAccount,
    email,
    mode,
    nickname,
    resetOnboarding,
    selectedKeywords,
    updateNickname,
    updatePassword,
  } = useSession();
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [nicknameInput, setNicknameInput] = useState(nickname ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [editingPassword, setEditingPassword] = useState(false);
  const [adminAvailable, setAdminAvailable] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'warning' } | null>(null);

  useEffect(() => {
    let active = true;
    void listReviews(mode === 'supabase' ? 'supabase' : 'demo')
      .then((result) => { if (active) setRecords(result); })
      .catch((caught) => {
        void recordClientIssue('profile.export-load', caught);
        if (active) setNotice({ title: '데이터 확인이 필요해요', message: '내보낼 기록을 불러오지 못했습니다.', tone: 'warning' });
      });
    return () => { active = false; };
  }, [mode]);

  useEffect(() => {
    let active = true;
    if (mode === 'supabase') {
      void getMyAdminAccess().then((access) => { if (active) setAdminAvailable(Boolean(access)); }).catch(() => { if (active) setAdminAvailable(false); });
    }
    return () => { active = false; };
  }, [mode]);

  const handleNicknameUpdate = async () => {
    const validation = validateNickname(nicknameInput);
    if (validation) {
      setNotice({ title: '닉네임을 저장할 수 없어요', message: validation.message, tone: 'danger' });
      return;
    }
    setWorking(true);
    setNotice(null);
    try {
      await updateNickname(nicknameInput);
      setNotice({ title: '닉네임 변경 완료', message: '새 닉네임을 내 계정에 저장했습니다.', tone: 'success' });
    } catch (caught) {
      setNotice({ title: '닉네임을 저장할 수 없어요', message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.', tone: 'danger' });
    } finally {
      setWorking(false);
    }
  };

  const handlePasswordUpdate = async () => {
    const validation = validatePassword(newPassword) ?? validatePasswordConfirmation(newPassword, passwordConfirm);
    if (validation) {
      setNotice({ title: '비밀번호를 변경할 수 없어요', message: validation.message, tone: 'danger' });
      return;
    }
    setWorking(true);
    setNotice(null);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setPasswordConfirm('');
      setEditingPassword(false);
      setNotice({ title: '비밀번호 변경 완료', message: '다음 로그인부터 새 비밀번호를 사용해 주세요.', tone: 'success' });
    } catch (caught) {
      setNotice({ title: '비밀번호를 변경할 수 없어요', message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.', tone: 'danger' });
    } finally {
      setWorking(false);
    }
  };

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
    const payload = {
      exportedAt: new Date().toISOString(),
      account: { email, nickname },
      keywords: getKeywordLabels(selectedKeywords),
      reviews: records,
      recentDiagnostics: await readClientIssues(),
    };
    try {
      await Share.share({ message: JSON.stringify(payload, null, 2), title: 'FLICK 내 데이터' });
      setNotice({ title: '내보내기 화면을 열었어요', message: '저장하거나 전송할 위치는 사용자가 직접 결정합니다.', tone: 'success' });
    } catch {
      setNotice({ title: '내보내지 못했어요', message: '이 기기의 공유 기능을 사용할 수 없습니다.', tone: 'danger' });
    }
  };

  const handleDelete = async () => {
    setWorking(true);
    setNotice(null);
    try {
      await deleteAccount();
      router.replace('/welcome');
    } catch (caught) {
      void recordClientIssue('profile.account-delete', caught);
      setNotice({ title: '계정을 삭제하지 못했어요', message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.', tone: 'danger' });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen eyebrow="나의 FLICK" title="계정과 취향 설정">
      {notice ? <StateNotice {...notice} /> : null}

      {mode === 'supabase' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>내 계정</Text>
          <Text style={styles.label}>이메일</Text>
          <Text style={styles.valueSmall}>{email ?? '확인할 수 없음'}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput accessibilityLabel="닉네임" autoCapitalize="none" autoComplete="nickname" editable={!working} maxLength={20} onChangeText={setNicknameInput} placeholder="2~20자" placeholderTextColor={colors.textMuted} style={styles.input} value={nicknameInput} />
            <Text style={styles.help}>글자, 숫자, 공백, ., _, -를 사용할 수 있어요.</Text>
          </View>
          <Button label="닉네임 저장" loading={working} onPress={() => void handleNicknameUpdate()} variant="secondary" />
          {editingPassword ? (
            <View style={styles.passwordBox}>
              <Text style={styles.label}>새 비밀번호</Text>
              <TextInput accessibilityLabel="새 비밀번호" autoCapitalize="none" autoComplete="new-password" editable={!working} onChangeText={setNewPassword} placeholder="영문·숫자를 포함한 8자 이상" placeholderTextColor={colors.textMuted} secureTextEntry style={styles.input} value={newPassword} />
              <Text style={styles.label}>새 비밀번호 확인</Text>
              <TextInput accessibilityLabel="새 비밀번호 확인" autoCapitalize="none" autoComplete="new-password" editable={!working} onChangeText={setPasswordConfirm} onSubmitEditing={() => void handlePasswordUpdate()} placeholder="비밀번호 다시 입력" placeholderTextColor={colors.textMuted} returnKeyType="done" secureTextEntry style={styles.input} value={passwordConfirm} />
              <Button label="취소" onPress={() => setEditingPassword(false)} variant="ghost" />
              <Button label="새 비밀번호 저장" loading={working} onPress={() => void handlePasswordUpdate()} variant="secondary" />
            </View>
          ) : <Button label="비밀번호 변경" onPress={() => setEditingPassword(true)} variant="ghost" />}
        </View>
      ) : (
        <StateNotice message="데모 기록은 이 기기에만 저장됩니다. 계정으로 보관하려면 로그인해 주세요." title="데모 모드" tone="warning" />
      )}

      <Text style={styles.label}>선택한 키워드</Text>
      <Text style={styles.value}>{getKeywordLabels(selectedKeywords).join(' · ')}</Text>
      <StateNotice message={backendConfigured ? 'Supabase 계정·기록 서버가 연결되어 있습니다.' : '환경 변수 연결 전까지 기기 안의 데모 데이터만 사용합니다.'} title={mode === 'demo' ? '데모 모드' : '계정 모드'} tone={backendConfigured ? 'success' : 'warning'} />
      {adminAvailable ? <Button label="Super Admin 콘솔" onPress={() => router.push('/admin' as Href)} /> : null}
      <Button label="취향 키워드 다시 고르기" onPress={() => void handleReset()} variant="secondary" />
      <Button label="나의 아카이브와 리포트" onPress={() => router.push('/archive' as Href)} variant="secondary" />
      <Button label="취향 인사이트와 다시보기" onPress={() => router.push('/taste-insights' as Href)} variant="secondary" />
      <Button label="FLICK 영화 취향 실험실" onPress={() => router.push('/experiments' as Href)} variant="secondary" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>내 데이터 관리</Text>
        <Text style={styles.help}>삭제 전에 현재 계정 정보, 취향과 기록을 JSON 텍스트로 내보낼 수 있어요.</Text>
        <Button label="내 데이터 내보내기" onPress={() => void handleExport()} variant="secondary" />
        {pendingDelete ? (
          <View style={styles.dangerBox}>
            <Text style={styles.dangerTitle}>계정과 모든 데이터를 영구 삭제할까요?</Text>
            <Text style={styles.help}>기록, 질문, 태그, 보고서와 취향 설정을 삭제하면 복구할 수 없습니다.</Text>
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
  valueSmall: { ...typography.body, color: colors.text },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text },
  field: { gap: spacing.xs },
  input: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 52, paddingHorizontal: spacing.lg },
  help: { ...typography.caption, color: colors.textMuted },
  passwordBox: { backgroundColor: colors.background, borderRadius: radii.md, gap: spacing.md, padding: spacing.md },
  dangerBox: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, gap: spacing.md, padding: spacing.md },
  dangerTitle: { ...typography.label, color: colors.danger },
});
