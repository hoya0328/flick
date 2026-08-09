import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { validatePassword, validatePasswordConfirmation } from '@/features/session/account-logic';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function ResetPasswordScreen() {
  const { mode, updatePassword } = useSession();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const handleUpdate = async () => {
    const validation = validatePassword(password) ?? validatePasswordConfirmation(password, confirmation);
    if (validation) {
      setMessage({ tone: 'danger', text: validation.message });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await updatePassword(password);
      setMessage({ tone: 'success', text: '새 비밀번호를 저장했습니다. 이제 이메일과 비밀번호로 로그인할 수 있어요.' });
    } catch (caught) {
      setMessage({ tone: 'danger', text: caught instanceof Error ? caught.message : '비밀번호를 변경하지 못했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen eyebrow="계정 복구" title="새 비밀번호 설정">
        <Text style={styles.body}>영문과 숫자를 포함해 8~72자로 입력해 주세요.</Text>
        {message ? <StateNotice message={message.text} title={message.tone === 'success' ? '변경 완료' : '변경할 수 없어요'} tone={message.tone} /> : null}
        {mode !== 'supabase' ? <StateNotice message="이메일에서 받은 최신 비밀번호 설정 링크로 다시 들어와 주세요." title="링크 확인이 필요해요" tone="warning" /> : null}
        <View style={styles.field}>
          <Text style={styles.label}>새 비밀번호</Text>
          <TextInput accessibilityLabel="새 비밀번호" autoCapitalize="none" autoComplete="new-password" editable={!busy && mode === 'supabase'} onChangeText={setPassword} placeholder="영문·숫자를 포함한 8자 이상" placeholderTextColor={colors.textMuted} secureTextEntry style={styles.input} value={password} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>새 비밀번호 확인</Text>
          <TextInput accessibilityLabel="새 비밀번호 확인" autoCapitalize="none" autoComplete="new-password" editable={!busy && mode === 'supabase'} onChangeText={setConfirmation} onSubmitEditing={() => void handleUpdate()} placeholder="비밀번호 다시 입력" placeholderTextColor={colors.textMuted} returnKeyType="done" secureTextEntry style={styles.input} value={confirmation} />
        </View>
        <Button disabled={mode !== 'supabase'} label="새 비밀번호 저장" loading={busy} onPress={() => void handleUpdate()} />
        {message?.tone === 'success' ? <Button label="서비스로 이동" onPress={() => router.replace('/')} variant="secondary" /> : <Button label="로그인으로 돌아가기" onPress={() => router.replace('/welcome')} variant="ghost" />}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { ...typography.body, color: colors.textMuted },
  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.text },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 52, paddingHorizontal: spacing.lg },
});
