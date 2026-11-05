import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useSession } from '@/features/session/session-provider';
import { safeCommunityPath } from '@/features/community/social-service';

export function IntroIntentConsumer() {
  const pathname = usePathname();
  const { introIntent, consumeIntroIntent } = useSession();
  useEffect(() => {
    if (introIntent && (pathname === `/${introIntent.mode}-record` || safeCommunityPath(pathname))) void consumeIntroIntent();
  }, [consumeIntroIntent, introIntent, pathname]);
  return null;
}
