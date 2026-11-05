import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BackHandler } from 'react-native';
import { introPage, type IntroMode } from '@/features/onboarding/intro-model';
import { IntroScreen } from '@/features/onboarding/intro-screen';
import { useSession } from '@/features/session/session-provider';
import { safeCommunityPath } from '@/features/community/social-service';

const subscribe = () => () => {};
const client = () => true;
const server = () => false;
export default function Intro() {
  const params = useLocalSearchParams<{ page?: string; returnTo?: string }>();
  const hydrated = useSyncExternalStore(subscribe, client, server);
  const page = hydrated ? introPage(params.page) : 1;
  const returnTo = safeCommunityPath(params.returnTo);
  const { finishIntro } = useSession();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page === 1 || lock.current) return false;
      router.setParams({ page: String(page - 1) });
      return true;
    });
    return () => listener.remove();
  }, [page]);
  async function finish(mode?: IntroMode) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await finishIntro(returnTo ? undefined : mode);
      router.replace(returnTo ? { pathname: '/', params: { returnTo } } : '/');
    } catch {
      if (mounted.current) setError('소개 설정을 저장하지 못했어요. 선택은 유지되니 다시 눌러 주세요.');
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return <IntroScreen key={page} page={page} busy={busy} error={error} onNext={() => router.setParams({ page: String(Math.min(4, page + 1)) })} onSkip={() => void finish()} onChoose={mode => void finish(mode)} />;
}
