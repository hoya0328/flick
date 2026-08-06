import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { getKeywordLabels } from '@/features/onboarding/keywords';
import { useSession } from '@/features/session/session-provider';
import { colors, typography } from '@/theme/tokens';

export default function ProfileScreen() {
  const { backendConfigured, mode, resetOnboarding, selectedKeywords } = useSession();

  const handleReset = async () => {
    await resetOnboarding();
    router.replace('/onboarding');
  };

  return (
    <Screen eyebrow="나의 FLICK" title="취향 설정">
      <Text style={styles.label}>선택한 키워드</Text>
      <Text style={styles.value}>{getKeywordLabels(selectedKeywords).join(' · ')}</Text>
      <StateNotice
        message={backendConfigured ? 'Supabase 연결이 준비됐습니다.' : '환경변수 연결 전까지 기기 안의 데모 데이터만 사용합니다.'}
        title={mode === 'demo' ? '데모 모드' : '계정 모드'}
        tone={backendConfigured ? 'success' : 'warning'}
      />
      <Button label="취향 키워드 다시 고르기" onPress={() => void handleReset()} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, color: colors.textMuted },
  value: { ...typography.heading, color: colors.text },
});
