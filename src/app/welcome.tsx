import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthAction, AuthBrand, AuthField, AuthTextButton, authStyles as s } from '@/features/session/auth-ui';
import { validateEmail, type AccountField, type AccountValidation } from '@/features/session/account-logic';
import { authDesign, validateAuthForm, type AuthMode } from '@/features/session/welcome-model';
import { useSession } from '@/features/session/session-provider';
import { safeCommunityPath } from '@/features/community/social-service';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = safeCommunityPath(Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo);
  const { backendConfigured, sendPasswordReset, signIn, signUp } = useSession();
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<AccountValidation>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const scroll = useRef<ScrollView>(null), lock = useRef(false), formTop = useRef(0);
  const nicknameInput = useRef<TextInput>(null), emailInput = useRef<TextInput>(null), passwordInput = useRef<TextInput>(null), confirmInput = useRef<TextInput>(null);
  const fieldY = useRef<Partial<Record<AccountField, number>>>({});
  const inputs = { nickname: nicknameInput, email: emailInput, password: passwordInput, passwordConfirm: confirmInput };

  function showValidation(issue: NonNullable<AccountValidation>) {
    setFieldError(issue); setMessage(null);
    requestAnimationFrame(() => {
      scroll.current?.scrollTo({ y: Math.max(0, formTop.current + (fieldY.current[issue.field] ?? 0) - 24), animated: true });
      inputs[issue.field].current?.focus();
    });
  }
  function clearField(field: AccountField) {
    setFieldError(current => current?.field === field ? null : current);
    setMessage(null);
  }
  function showMessage(next: {tone: 'success' | 'danger'; text: string}) {
    setMessage(next);
    requestAnimationFrame(() => scroll.current?.scrollTo({y: Math.max(0, formTop.current - 24), animated: true}));
  }
  function switchMode(nextMode: AuthMode) {
    if (lock.current) return;
    setAuthMode(nextMode); setPassword(''); setPasswordConfirm(''); setFieldError(null); setMessage(null);
    scroll.current?.scrollTo({y: 0, animated: false});
  }
  function enterService() { router.replace(returnTo ? { pathname: '/', params: { returnTo } } : '/'); }

  async function handleSubmit() {
    if (lock.current || !backendConfigured) return;
    const issue = validateAuthForm(authMode, {nickname, email, password, passwordConfirm});
    if (issue) { showValidation(issue); return; }
    lock.current = true; setBusy(true); setFieldError(null); setMessage(null);
    try {
      if (authMode === 'signUp') {
        const result = await signUp(email, password, nickname);
        if (result.confirmationRequired) {
          showMessage({tone: 'success', text: '가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.'});
          setAuthMode('signIn'); setPassword(''); setPasswordConfirm('');
        } else enterService();
      } else { await signIn(email, password); enterService(); }
    } catch (caught) { showMessage({tone: 'danger', text: caught instanceof Error ? caught.message : '계정 요청을 처리하지 못했습니다.'}); }
    finally { lock.current = false; setBusy(false); }
  }
  async function handlePasswordReset() {
    if (lock.current || !backendConfigured) return;
    const issue = validateEmail(email);
    if (issue) { showValidation(issue); return; }
    lock.current = true; setBusy(true); setFieldError(null); setMessage(null);
    try {
      await sendPasswordReset(email);
      showMessage({tone: 'success', text: '비밀번호 설정 링크를 이메일로 보냈습니다. 메일에서 새 비밀번호를 설정해 주세요.'});
    } catch (caught) { showMessage({tone: 'danger', text: caught instanceof Error ? caught.message : '재설정 메일을 보내지 못했습니다.'}); }
    finally { lock.current = false; setBusy(false); }
  }
  const errorFor = (field: AccountField) => fieldError?.field === field ? fieldError.message : undefined;

  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={s.safe}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.safe}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View testID="auth-frame" style={[s.frame, {minHeight: Math.max(0, authDesign.baseHeight - insets.top - insets.bottom), paddingBottom: Math.max(0, 72 - insets.bottom)}]}>
          <AuthBrand topInset={insets.top} />
          <View onLayout={event => {formTop.current = event.nativeEvent.layout.y;}} style={s.form}>
            {message ? <View accessibilityLiveRegion="polite" style={[s.notice, message.tone === 'success' && s.success]}><Text accessibilityRole={message.tone === 'danger' ? 'alert' : undefined} style={[s.noticeText, message.tone === 'success' && s.successText]}>{message.text}</Text></View> : null}
            {authMode === 'signUp' ? <AuthField label="닉네임" inputRef={nicknameInput} error={errorFor('nickname')} onLayout={event=>{fieldY.current.nickname=event.nativeEvent.layout.y;}} autoCapitalize="none" autoCorrect={false} autoComplete="nickname" editable={!busy} maxLength={20} value={nickname} onChangeText={value=>{setNickname(value); clearField('nickname');}} placeholder="닉네임 입력 (2~20자)" returnKeyType="next" onSubmitEditing={()=>emailInput.current?.focus()} /> : null}
            <AuthField label="이메일" inputRef={emailInput} error={errorFor('email')} onLayout={event=>{fieldY.current.email=event.nativeEvent.layout.y;}} autoCapitalize="none" autoCorrect={false} autoComplete="email" inputMode="email" editable={!busy} maxLength={254} value={email} onChangeText={value=>{setEmail(value); clearField('email');}} placeholder="이메일 아이디 입력" returnKeyType="next" onSubmitEditing={()=>passwordInput.current?.focus()} />
            <AuthField label="비밀번호" inputRef={passwordInput} error={errorFor('password')} onLayout={event=>{fieldY.current.password=event.nativeEvent.layout.y;}} autoCapitalize="none" autoCorrect={false} autoComplete={authMode === 'signUp' ? 'new-password' : 'current-password'} editable={!busy} value={password} onChangeText={value=>{setPassword(value); clearField('password');}} placeholder="비밀번호 입력" secureTextEntry returnKeyType={authMode === 'signUp' ? 'next' : 'done'} onSubmitEditing={authMode === 'signUp' ? ()=>confirmInput.current?.focus() : ()=>void handleSubmit()} />
            {authMode === 'signUp' ? <AuthField label="비밀번호 확인" inputRef={confirmInput} error={errorFor('passwordConfirm')} onLayout={event=>{fieldY.current.passwordConfirm=event.nativeEvent.layout.y;}} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} value={passwordConfirm} onChangeText={value=>{setPasswordConfirm(value); clearField('passwordConfirm');}} placeholder="비밀번호 다시 입력" secureTextEntry returnKeyType="done" onSubmitEditing={()=>void handleSubmit()} /> : null}
            {!backendConfigured ? <View style={s.notice}><Text accessibilityRole="alert" style={s.noticeText}>계정 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.</Text></View> : null}
            <AuthAction label={authMode === 'signUp' ? '회원가입' : '로그인'} busy={busy} disabled={!backendConfigured} onPress={()=>void handleSubmit()} />
          </View>
          {authMode === 'signIn' ? <View style={s.links}>
            <AuthTextButton disabled={busy || !backendConfigured} onPress={()=>void handlePasswordReset()}>비밀번호 찾기</AuthTextButton>
            <View style={s.linkDivider} />
            <AuthTextButton disabled={busy} label="회원가입 화면 열기" onPress={()=>switchMode('signUp')}>회원가입</AuthTextButton>
          </View> : <View style={s.links}><AuthTextButton disabled={busy} label="로그인 화면으로 돌아가기" onPress={()=>switchMode('signIn')}>로그인으로 돌아가기</AuthTextButton></View>}
          <View style={s.guest}>
            <View style={s.guestCaption}><Text style={s.guestCaptionText}>전시 체험용으로 가입 없이 시작</Text></View>
            <AuthAction label="게스트로 로그인" secondary disabled={busy} onPress={()=>router.push('/exhibition')} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
