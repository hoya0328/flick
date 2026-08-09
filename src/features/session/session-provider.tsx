import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { canCompleteOnboarding } from '@/features/onboarding/keywords';
import {
  accountErrorMessage,
  normalizeEmail,
  normalizeNickname,
  validateEmail,
  validateNickname,
  validatePassword,
} from '@/features/session/account-logic';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const DEMO_SESSION_KEY = 'flick.stage1.demo-session';
const ONBOARDING_KEY = 'flick.stage1.onboarding';

type SessionMode = 'none' | 'demo' | 'supabase';

type SessionContextValue = {
  status: 'loading' | 'ready' | 'error';
  mode: SessionMode;
  selectedKeywords: string[];
  onboardingComplete: boolean;
  error: string | null;
  backendConfigured: boolean;
  email: string | null;
  nickname: string | null;
  startDemo: () => Promise<void>;
  signUp: (email: string, password: string, nickname: string) => Promise<{ confirmationRequired: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  completeOnboarding: (keywordIds: string[]) => Promise<void>;
  clearSession: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  retry: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function normalizeStoredKeywords(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

async function clearLocalFlickData() {
  const keys = await AsyncStorage.getAllKeys();
  const flickKeys = keys.filter((key) => key.startsWith('flick.'));
  if (flickKeys.length) await AsyncStorage.multiRemove(flickKeys);
}

function requireBackend() {
  if (!supabase) throw new Error('계정 서버가 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  return supabase;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionContextValue['status']>('loading');
  const [mode, setMode] = useState<SessionMode>('none');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySupabaseSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setMode((current) => (current === 'demo' ? current : 'none'));
      setEmail(null);
      setNickname(null);
      return;
    }

    setMode('supabase');
    setEmail(session.user.email ?? null);
    setNickname(normalizeNickname(String(session.user.user_metadata.display_name ?? '')) || null);
    await AsyncStorage.removeItem(DEMO_SESSION_KEY);

    const client = requireBackend();
    const [profileResult, keywordResult] = await Promise.all([
      client.from('profiles').select('display_name, onboarding_at').eq('id', session.user.id).maybeSingle(),
      client.from('user_keywords').select('keyword_id').eq('user_id', session.user.id).order('weight', { ascending: false }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (keywordResult.error) throw keywordResult.error;

    const profileName = normalizeNickname(profileResult.data?.display_name ?? '');
    if (profileName) setNickname(profileName);

    const remoteKeywords = (keywordResult.data ?? []).map((row) => row.keyword_id);
    setSelectedKeywords(remoteKeywords);
    if (remoteKeywords.length) await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(remoteKeywords));
    else await AsyncStorage.removeItem(ONBOARDING_KEY);
  }, []);

  const hydrate = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const [demoSession, onboarding] = await Promise.all([
        AsyncStorage.getItem(DEMO_SESSION_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      setMode(demoSession === 'active' ? 'demo' : 'none');
      setSelectedKeywords(normalizeStoredKeywords(onboarding));

      if (supabase) {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (data.session) await applySupabaseSession(data.session);
      }

      setStatus('ready');
    } catch (caught) {
      setError(accountErrorMessage(caught));
      setStatus('error');
    }
  }, [applySupabaseSession]);

  useEffect(() => {
    const hydrateTimer = setTimeout(() => void hydrate(), 0);
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        void applySupabaseSession(session).catch((caught) => setError(accountErrorMessage(caught)));
      }, 0);
    }).data.subscription;

    return () => {
      clearTimeout(hydrateTimer);
      subscription?.unsubscribe();
    };
  }, [applySupabaseSession, hydrate]);

  const startDemo = useCallback(async () => {
    await AsyncStorage.setItem(DEMO_SESSION_KEY, 'active');
    setMode('demo');
    setNickname('데모 사용자');
    setEmail(null);
  }, []);

  const signUp = useCallback(async (emailInput: string, password: string, nicknameInput: string) => {
    const emailError = validateEmail(emailInput);
    const nicknameError = validateNickname(nicknameInput);
    const passwordError = validatePassword(password);
    if (nicknameError || emailError || passwordError) throw new Error((nicknameError ?? emailError ?? passwordError)?.message);

    const client = requireBackend();
    const cleanEmail = normalizeEmail(emailInput);
    const cleanNickname = normalizeNickname(nicknameInput);
    const { data, error: authError } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { display_name: cleanNickname },
        emailRedirectTo: Linking.createURL('/'),
      },
    });
    if (authError) throw new Error(accountErrorMessage(authError));
    if (data.session) await applySupabaseSession(data.session);
    return { confirmationRequired: !data.session };
  }, [applySupabaseSession]);

  const signIn = useCallback(async (emailInput: string, password: string) => {
    const emailError = validateEmail(emailInput);
    if (emailError) throw new Error(emailError.message);
    if (!password) throw new Error('비밀번호를 입력해야 합니다.');

    const client = requireBackend();
    const { data, error: authError } = await client.auth.signInWithPassword({
      email: normalizeEmail(emailInput),
      password,
    });
    if (authError) throw new Error(accountErrorMessage(authError));
    await applySupabaseSession(data.session);
  }, [applySupabaseSession]);

  const sendPasswordReset = useCallback(async (emailInput: string) => {
    const emailError = validateEmail(emailInput);
    if (emailError) throw new Error(emailError.message);
    const client = requireBackend();
    const { error: resetError } = await client.auth.resetPasswordForEmail(normalizeEmail(emailInput), {
      redirectTo: Linking.createURL('/reset-password'),
    });
    if (resetError) throw new Error(accountErrorMessage(resetError));
  }, []);

  const updateNickname = useCallback(async (nicknameInput: string) => {
    const nicknameError = validateNickname(nicknameInput);
    if (nicknameError) throw new Error(nicknameError.message);
    const cleanNickname = normalizeNickname(nicknameInput);
    const client = requireBackend();
    const { data } = await client.auth.getUser();
    if (!data.user) throw new Error('로그인 정보가 만료되었습니다. 다시 로그인해 주세요.');

    const { error: profileError } = await client.from('profiles').upsert({
      id: data.user.id,
      display_name: cleanNickname,
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw new Error(accountErrorMessage(profileError));
    const { error: metadataError } = await client.auth.updateUser({ data: { display_name: cleanNickname } });
    if (metadataError) throw new Error(accountErrorMessage(metadataError));
    setNickname(cleanNickname);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError.message);
    const client = requireBackend();
    const { error: passwordUpdateError } = await client.auth.updateUser({ password });
    if (passwordUpdateError) throw new Error(accountErrorMessage(passwordUpdateError));
  }, []);

  const completeOnboarding = useCallback(async (keywordIds: string[]) => {
    if (!canCompleteOnboarding(keywordIds)) throw new Error('취향 키워드는 3개에서 5개까지 선택해 주세요.');

    if (supabase && mode === 'supabase') {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from('profiles').upsert({ id: userId, onboarding_at: new Date().toISOString() });
        if (profileError) throw profileError;
        const { error: clearError } = await supabase.from('user_keywords').delete().eq('user_id', userId);
        if (clearError) throw clearError;
        const { error: keywordError } = await supabase.from('user_keywords').insert(keywordIds.map((keywordId, index) => ({
          keyword_id: keywordId,
          user_id: userId,
          weight: keywordIds.length - index,
        })));
        if (keywordError) throw keywordError;
      }
    }

    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(keywordIds));
    setSelectedKeywords(keywordIds);
  }, [mode]);

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setSelectedKeywords([]);
  }, []);

  const clearSession = useCallback(async () => {
    if (supabase && mode === 'supabase') {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    }
    await clearLocalFlickData();
    setMode('none');
    setSelectedKeywords([]);
    setNickname(null);
    setEmail(null);
  }, [mode]);

  const deleteAccount = useCallback(async () => {
    if (mode === 'supabase') {
      const client = requireBackend();
      const { error: deleteError } = await client.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
      if (deleteError) throw new Error('계정 삭제를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      await client.auth.signOut({ scope: 'local' });
    }
    await clearLocalFlickData();
    setMode('none');
    setSelectedKeywords([]);
    setNickname(null);
    setEmail(null);
    setError(null);
    setStatus('ready');
  }, [mode]);

  const value = useMemo<SessionContextValue>(() => ({
    backendConfigured: isSupabaseConfigured,
    clearSession,
    completeOnboarding,
    deleteAccount,
    email,
    error,
    mode,
    nickname,
    onboardingComplete: canCompleteOnboarding(selectedKeywords),
    resetOnboarding,
    retry: hydrate,
    selectedKeywords,
    sendPasswordReset,
    signIn,
    signUp,
    startDemo,
    status,
    updateNickname,
    updatePassword,
  }), [clearSession, completeOnboarding, deleteAccount, email, error, hydrate, mode, nickname, resetOnboarding, selectedKeywords, sendPasswordReset, signIn, signUp, startDemo, status, updateNickname, updatePassword]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
