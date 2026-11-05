import { type Href,Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { IntroSplash } from '@/features/onboarding/intro-screen';
import { introEntryTarget } from '@/features/onboarding/intro-model';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { useSession } from '@/features/session/session-provider';
import { safeCommunityPath } from '@/features/community/social-service';

export default function IndexScreen() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = safeCommunityPath(returnToParam);
  const { error, mode, onboardingComplete, introSeen, introIntent, retry, status } = useSession();
  const [splashComplete, setSplashComplete] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setSplashComplete(true), 650); return () => clearTimeout(timer); }, []);

  if (status === 'loading' || !splashComplete) return <IntroSplash />;

  if (status === 'error') {
    return (
      <Screen title="취향 정보를 불러오지 못했어요" scroll={false}>
        <StateNotice message={error ?? '잠시 후 다시 시도해 주세요.'} title="불러오기 오류" tone="danger" />
        <Button label="다시 시도" onPress={() => void retry()} />
      </Screen>
    );
  }

  const target = introEntryTarget({ mode, onboardingComplete, introSeen, intent: introIntent, hasSharedLink: Boolean(returnTo) });
  if (target === 'intro') return <Redirect href={'/intro' as Href} />;
  if (target === 'welcome') return <Redirect href={returnTo ? { pathname: '/welcome', params: { returnTo } } : '/welcome'} />;
  if (target === 'shared' && returnTo) return <Redirect href={returnTo as Href} />;
  if (target === 'light' || target === 'core') return <Redirect href={target === 'light' ? '/light-record' : '/core-record'} />;
  if (!onboardingComplete && returnTo) return <Redirect href={{pathname:'/onboarding',params:{returnTo}}}/>;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
