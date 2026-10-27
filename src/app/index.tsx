import { type Href,Redirect, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { LoadingScreen } from '@/components/loading-screen';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { useSession } from '@/features/session/session-provider';
import { safeCommunityPath } from '@/features/community/social-service';

export default function IndexScreen() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = safeCommunityPath(returnToParam);
  const { error, mode, onboardingComplete, retry, status } = useSession();

  if (status === 'loading') return <LoadingScreen />;

  if (status === 'error') {
    return (
      <Screen title="취향 정보를 불러오지 못했어요" scroll={false}>
        <StateNotice message={error ?? '잠시 후 다시 시도해 주세요.'} title="불러오기 오류" tone="danger" />
        <Button label="다시 시도" onPress={() => void retry()} />
      </Screen>
    );
  }

  if (mode === 'none') return <Redirect href={returnTo ? { pathname: '/welcome', params: { returnTo } } : '/welcome'} />;
  if (mode === 'supabase' && returnTo && onboardingComplete) return <Redirect href={returnTo as Href} />;
  if (!onboardingComplete && returnTo) return <Redirect href={{pathname:'/onboarding',params:{returnTo}}}/>;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
