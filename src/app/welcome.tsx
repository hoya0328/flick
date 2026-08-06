import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function WelcomeScreen() {
  const { backendConfigured, sendMagicLink, startDemo } = useSession();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const handleDemo = async () => {
    setBusy(true);
    try {
      await startDemo();
      router.replace('/onboarding');
    } finally {
      setBusy(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim() || !email.includes('@')) {
      setMessage({ tone: 'danger', text: '로그인 링크를 받을 이메일을 확인해 주세요.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await sendMagicLink(email.trim());
      setMessage({ tone: 'success', text: '이메일로 로그인 링크를 보냈어요.' });
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : '로그인 링크를 보내지 못했어요.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen scroll={false}>
        <View style={styles.hero}>
          <BrandMark />
          <View style={styles.copy}>
            <Text style={styles.title}>영화 감상,{`\n`}어떻게 남겨야 할지{`\n`}막막했다면?</Text>
            <Text style={styles.body}>감정 키워드로 가볍게 시작하고, 필요할 때 깊이 있게 기록해 보세요.</Text>
          </View>
        </View>

        {message ? <StateNotice message={message.text} title={message.tone === 'success' ? '확인해 주세요' : '진행할 수 없어요'} tone={message.tone} /> : null}

        <View style={styles.actions}>
          <Button label="데모로 시작하기" loading={busy} onPress={() => void handleDemo()} />
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.divider} />
          </View>
          <TextInput
            accessibilityLabel="이메일"
            autoCapitalize="none"
            autoComplete="email"
            editable={!busy}
            inputMode="email"
            onChangeText={setEmail}
            onSubmitEditing={() => void handleMagicLink()}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            style={styles.input}
            value={email}
          />
          <Button label="이메일 로그인 링크 받기" onPress={() => void handleMagicLink()} variant="secondary" />
          {!backendConfigured ? (
            <Text style={styles.helper}>현재는 안전한 데모 모드입니다. Supabase 환경변수를 연결하면 이메일 로그인이 활성화됩니다.</Text>
          ) : null}
          <Button disabled label="Apple로 계속하기 · 출시 단계에서 연결" onPress={() => undefined} variant="ghost" />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flex: 1, gap: spacing.xxxl, justifyContent: 'center', paddingVertical: spacing.xxl },
  copy: { gap: spacing.lg },
  title: { ...typography.display, color: colors.text },
  body: { ...typography.body, color: colors.textMuted, maxWidth: 430 },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { ...typography.caption, color: colors.textMuted },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  helper: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
