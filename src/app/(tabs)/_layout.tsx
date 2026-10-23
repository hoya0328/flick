import { Redirect, Tabs, useLocalSearchParams, usePathname } from 'expo-router';
import { Image, ImageBackground, StyleSheet, View } from 'react-native';

import { LoadingScreen } from '@/components/loading-screen';
import { useSession } from '@/features/session/session-provider';
import { safeSharedReviewPath } from '@/features/reviews/review-logic';
import { homeAssets } from '@/features/home/design-assets';
import { homeTheme } from '@/components/home-ui';

function TabGlyph({ name, focused }: { name: 'home' | 'search' | 'feed' | 'profile'; focused: boolean }) {
  return <Image source={homeAssets[name]} resizeMode="contain" tintColor={focused ? homeTheme.accent : '#99A1AF'} style={styles.glyph} />;
}

export default function TabLayout() {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ reviewId?: string }>();
  const reviewIdParam = Array.isArray(params.reviewId) ? params.reviewId[0] : params.reviewId;
  const legacyReturnTo = pathname.endsWith('/record') && reviewIdParam ? safeSharedReviewPath(`/review/${reviewIdParam}`) : undefined;
  const { mode, onboardingComplete, status } = useSession();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error') return <Redirect href="/" />;
  if (mode === 'none') return <Redirect href={legacyReturnTo ? { pathname: '/welcome', params: { returnTo: legacyReturnTo } } : '/welcome'} />;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: homeTheme.accent,
        tabBarInactiveTintColor: '#99A1AF',
        tabBarLabelStyle: styles.label,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: styles.bar,
      }}>
      <Tabs.Screen name="index" options={{ tabBarAccessibilityLabel: '홈', tabBarIcon: ({ focused }) => <TabGlyph focused={focused} name="home" />, title: '홈' }} />
      <Tabs.Screen name="search" options={{ tabBarAccessibilityLabel: '탐색', tabBarIcon: ({ focused }) => <TabGlyph focused={focused} name="search" />, title: '탐색' }} />
      <Tabs.Screen
        name="record"
        options={{
          tabBarIcon: () => <View style={styles.recordCircle}><ImageBackground source={homeAssets.recordCircle} style={styles.recordBackground}><Image resizeMode="contain" source={homeAssets.recordSymbol} style={styles.recordSymbol} /></ImageBackground></View>,
          tabBarItemStyle: styles.recordItem,
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: '새 감상 기록 작성',
          title: '기록',
        }}
      />
      <Tabs.Screen name="feed" options={{ tabBarAccessibilityLabel: '피드', tabBarIcon: ({ focused }) => <TabGlyph focused={focused} name="feed" />, title: '피드' }} />
      <Tabs.Screen name="profile" options={{ tabBarAccessibilityLabel: '마이', tabBarIcon: ({ focused }) => <TabGlyph focused={focused} name="profile" />, title: '마이' }} />
      <Tabs.Screen name="archive" options={{ href: null, title: '보관함' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#F9FAFB', borderTopWidth: 0, borderRadius: 10, height: 89, paddingBottom: 24, paddingTop: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  label: { fontSize: 9.5, fontWeight: '500', marginTop: 1 },
  glyph: { width: 21, height: 21 },
  recordItem: { overflow: 'visible' },
  recordCircle: { position: 'absolute', top: -33, alignItems: 'center', justifyContent: 'center', height: 76.8, width: 76.8 },
  recordBackground: { alignItems: 'center', justifyContent: 'center', height: 76.8, width: 76.8 },
  recordSymbol: { width: 40, height: 40 },
});
