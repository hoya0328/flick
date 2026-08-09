import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import {
  validateEmail,
  validateNickname,
  validatePassword,
  validatePasswordConfirmation,
} from '@/features/session/account-logic';
import { useSession } from '@/features/session/session-provider';
import { safeSharedReviewPath } from '@/features/reviews/review-logic';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type AuthMode = 'signIn' | 'signUp';

export default function WelcomeScreen() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = safeSharedReviewPath(returnToParam);
  const { backendConfigured, sendPasswordReset, signIn, signUp, startDemo } = useSession();
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const enterService = () => {
    router.replace(returnTo ? { pathname: '/', params: { returnTo } } : '/');
  };

  const switchMode = (nextMode: AuthMode) => {
    setAuthMode(nextMode);
    setPassword('');
    setPasswordConfirm('');
    setMessage(null);
  };

  const handleDemo = async () => {
    setBusy(true);
    try {
      await startDemo();
      router.replace('/onboarding');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    const validation = authMode === 'signUp'
      ? validateNickname(nickname) ?? validateEmail(email) ?? validatePassword(password) ?? validatePasswordConfirmation(password, passwordConfirm)
      : validateEmail(email) ?? (!password ? { field: 'password' as const, message: '비밀번호를 입력해야 합니다.' } : null);
    if (validation) {
      setMessage({ tone: 'danger', text: validation.message });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      if (authMode === 'signUp') {
        const result = await signUp(email, password, nickname);
        if (result.confirmationRequired) {
          setMessage({ tone: 'success', text: '가입 확인 메일을 보냈습니다. 메일에서 한 번만 확인한 뒤 비밀번호로 로그인해 주세요.' });
          setAuthMode('signIn');
          setPassword('');
          setPasswordConfirm('');
        } else {
          enterService();
        }
      } else {
        await signIn(email, password);
        enterService();
      }
    } catch (caught) {
      setMessage({ tone: 'danger', text: caught instanceof Error ? caught.message : '계정 요청을 처리하지 못했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    const validation = validateEmail(email);
    if (validation) {
      setMessage({ tone: 'danger', text: validation.message });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await sendPasswordReset(email);
      setMessage({ tone: 'success', text: '비밀번호 설정 링크를 이메일로 보냈습니다. 기존 Magic Link 계정도 이 링크로 비밀번호를 만들 수 있습니다.' });
    } catch (caught) {
      setMessage({ tone: 'danger', text: caught instanceof Error ? caught.message : '재설정 메일을 보내지 못했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen>
        <View style={styles.hero}>
          <BrandMark />
          <View style={styles.copy}>
            <Text style={styles.title}>영화 감상,{`\n`}어떻게 남겨야 할지{`\n`}막막했다면?</Text>
            <Text style={styles.body}>{returnTo ? '공유받은 기록은 로그인한 뒤 읽을 수 있어요.' : '내 계정에 취향과 감상을 안전하게 쌓아 보세요.'}</Text>
          </View>
        </View>

        <View accessibilityRole="tablist" style={styles.tabs}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: authMode === 'signIn' }} onPress={() => switchMode('signIn')} style={[styles.tab, authMode === 'signIn' && styles.activeTab]}>
            <Text style={[styles.tabText, authMode === 'signIn' && styles.activeTabText]}>로그인</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: authMode === 'signUp' }} onPress={() => switchMode('signUp')} style={[styles.tab, authMode === 'signUp' && styles.activeTab]}>
            <Text style={[styles.tabText, authMode === 'signUp' && styles.activeTabText]}>회원가입</Text>
          </Pressable>
        </View>

        {message ? <StateNotice message={message.text} title={message.tone === 'success' ? '확인해 주세요' : '진행할 수 없어요'} tone={message.tone} /> : null}

        <View style={styles.form}>
          {authMode === 'signUp' ? (
            <View style={styles.field}>
              <Text style={styles.label}>닉네임</Text>
              <TextInput accessibilityLabel="닉네임" autoCapitalize="none" autoComplete="nickname" editable={!busy} maxLength={20} onChangeText={setNickname} placeholder="2~20자" placeholderTextColor={colors.textMuted} returnKeyType="next" style={styles.input} value={nickname} />
              <Text style={styles.helper}>글자, 숫자, 공백, ., _, -를 사용할 수 있어요.</Text>
            </View>
          ) : null}
          <View style={styles.field}>
            <Text style={styles.label}>이메일</Text>
            <TextInput accessibilityLabel="이메일" autoCapitalize="none" autoComplete="email" editable={!busy} inputMode="email" onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textMuted} returnKeyType="next" style={styles.input} value={email} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput accessibilityLabel="비밀번호" autoCapitalize="none" autoComplete={authMode === 'signUp' ? 'new-password' : 'current-password'} editable={!busy} onChangeText={setPassword} onSubmitEditing={authMode === 'signIn' ? () => void handleSubmit() : undefined} placeholder={authMode === 'signUp' ? '영문·숫자를 포함한 8자 이상' : '비밀번호'} placeholderTextColor={colors.textMuted} returnKeyType={authMode === 'signIn' ? 'done' : 'next'} secureTextEntry style={styles.input} value={password} />
          </View>
          {authMode === 'signUp' ? (
            <View style={styles.field}>
              <Text style={styles.label}>비밀번호 확인</Text>
              <TextInput accessibilityLabel="비밀번호 확인" autoCapitalize="none" autoComplete="new-password" editable={!busy} onChangeText={setPasswordConfirm} onSubmitEditing={() => void handleSubmit()} placeholder="비밀번호 다시 입력" placeholderTextColor={colors.textMuted} returnKeyType="done" secureTextEntry style={styles.input} value={passwordConfirm} />
            </View>
          ) : null}
          <Button disabled={!backendConfigured} label={authMode === 'signUp' ? 'FLICK 회원가입' : '로그인'} loading={busy} onPress={() => void handleSubmit()} />
          {authMode === 'signIn' ? <Button label="비밀번호를 잊었거나 처음 설정하나요?" onPress={() => void handlePasswordReset()} variant="ghost" /> : null}
        </View>

        {!backendConfigured ? <Text style={styles.backendWarning}>계정 서버 설정이 없어 현재 회원가입과 로그인을 사용할 수 없습니다.</Text> : null}
        {!returnTo ? (
          <View style={styles.demoArea}>
            <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerText}>또는</Text><View style={styles.divider} /></View>
            <Button label="가입 없이 데모로 둘러보기" loading={busy} onPress={() => void handleDemo()} variant="secondary" />
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { gap: spacing.xxl, paddingBottom: spacing.md },
  copy: { gap: spacing.md },
  title: { ...typography.display, color: colors.text },
  body: { ...typography.body, color: colors.textMuted, maxWidth: 430 },
  tabs: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', padding: 4 },
  tab: { alignItems: 'center', borderRadius: radii.pill, flex: 1, minHeight: 44, justifyContent: 'center' },
  activeTab: { backgroundColor: colors.primary },
  tabText: { ...typography.label, color: colors.textMuted },
  activeTabText: { color: colors.surface },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.text },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 52, paddingHorizontal: spacing.lg },
  helper: { ...typography.caption, color: colors.textMuted },
  backendWarning: { ...typography.caption, color: colors.danger, textAlign: 'center' },
  demoArea: { gap: spacing.md },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { ...typography.caption, color: colors.textMuted },
});
