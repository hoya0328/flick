import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { canCompleteOnboarding } from '@/features/onboarding/keywords';

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
  startDemo: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  completeOnboarding: (keywordIds: string[]) => Promise<void>;
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

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionContextValue['status']>('loading');
  const [mode, setMode] = useState<SessionMode>('none');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const applySupabaseSession = useCallback((session: Session | null) => {
    if (session) setMode('supabase');
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
        applySupabaseSession(data.session);
      }

      setStatus('ready');
    } catch {
      setError('저장된 취향 정보를 불러오지 못했어요. 다시 시도해 주세요.');
      setStatus('error');
    }
  }, [applySupabaseSession]);

  useEffect(() => {
    const hydrateTimer = setTimeout(() => void hydrate(), 0);
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => applySupabaseSession(session)).data
      .subscription;

    return () => {
      clearTimeout(hydrateTimer);
      subscription?.unsubscribe();
    };
  }, [applySupabaseSession, hydrate]);

  const startDemo = useCallback(async () => {
    await AsyncStorage.setItem(DEMO_SESSION_KEY, 'active');
    setMode('demo');
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error('Supabase 환경변수를 연결하면 이메일 로그인을 사용할 수 있어요.');
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    if (authError) throw authError;
  }, []);

  const completeOnboarding = useCallback(
    async (keywordIds: string[]) => {
      if (!canCompleteOnboarding(keywordIds)) {
        throw new Error('취향 키워드는 3개에서 5개까지 선택해 주세요.');
      }

      if (supabase && mode === 'supabase') {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: userId, onboarding_at: new Date().toISOString() });
          if (profileError) throw profileError;

          const { error: clearError } = await supabase.from('user_keywords').delete().eq('user_id', userId);
          if (clearError) throw clearError;

          const { error: keywordError } = await supabase.from('user_keywords').insert(
            keywordIds.map((keywordId, index) => ({
              keyword_id: keywordId,
              user_id: userId,
              weight: keywordIds.length - index,
            })),
          );
          if (keywordError) throw keywordError;
        }
      }

      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(keywordIds));
      setSelectedKeywords(keywordIds);
    },
    [mode],
  );

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setSelectedKeywords([]);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      backendConfigured: isSupabaseConfigured,
      completeOnboarding,
      error,
      mode,
      onboardingComplete: canCompleteOnboarding(selectedKeywords),
      resetOnboarding,
      retry: hydrate,
      selectedKeywords,
      sendMagicLink,
      startDemo,
      status,
    }),
    [completeOnboarding, error, hydrate, mode, resetOnboarding, selectedKeywords, sendMagicLink, startDemo, status],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
