import { Redirect, Tabs, useLocalSearchParams, usePathname } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { LoadingScreen } from '@/components/loading-screen';
import { useSession } from '@/features/session/session-provider';
import { safeSharedReviewPath } from '@/features/reviews/review-logic';
import { DesignVector } from '@/components/design-vector';
import { homeFont, homeTheme } from '@/components/home-ui';
import { useRecordingLauncher } from '@/features/reviews/recording-launcher';

function TabGlyph({ name, focused }: { name: 'home' | 'search' | 'feed' | 'profile'; focused: boolean }) {
  return <DesignVector name={name} width={21} height={21} tint={focused ? homeTheme.accent : '#99A1AF'} />;
}

export default function TabLayout() {
  const launchRecording = useRecordingLauncher();
  const canvasWidth = Math.min(useWindowDimensions().width, 402);
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
      <Tabs.Screen name="index" options={{ tabBarItemStyle: { transform: [{ translateX: canvasWidth * 0.0202 }] }, tabBarAccessibilityLabel: '홈', tabBarIcon: ({ focused }) => <TabGlyph focused={focused} name="home" />, title: '홈' }} />
      <Tabs.Screen name="search" options={{ tabBarItemStyle: { transform: [{ translateX: canvasWidth * -0.0107 }] }, tabBarAccessibilityLabel: '탐색', tabBarIcon: ({ focused }) => <TabGlyph focused={focused} name="search" />, title: '탐색' }} />
      <Tabs.Screen
        name="record"
        listeners={{ tabPress: (event) => { event.preventDefault(); launchRecording(); } }}
        options={{
          tabBarIcon: () => <View style={styles.recordCircle}><DesignVector name="recordCircle" width={76.8} height={76.8} style={StyleSheet.absoluteFill} /><DesignVector name="recordSymbol" width={40} height={40} /></View>,
          tabBarItemStyle: styles.recordItem,
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: '새 감상 기록 작성',
          title: '기록',
        }}
      />
      <Tabs.Screen name="feed" options={{ tabBarItemStyle: { transform: [{ translateX: canvasWidth * 0.0048 }] }, tabBarAccessibilityLabel: '피드', tabBarIcon: ({ focused }) => <TabGlyph focused={focused} name="feed" />, title: '피드' }} />
      <Tabs.Screen name="profile" options={{ tabBarItemStyle: { transform: [{ translateX: canvasWidth * -0.0261 }] }, tabBarAccessibilityLabel: '마이', tabBarIcon: ({ focused }) => <TabGlyph focused={focused} name="profile" />, title: '마이' }} />
      <Tabs.Screen name="archive" options={{ href: null, title: '보관함' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#F9FAFB', borderTopWidth: 0, borderRadius: 10, height: 89, paddingBottom: 24, paddingTop: 14, maxWidth: 402, width: '100%', alignSelf: 'center' },
  label: { fontFamily: homeFont, fontSize: 9.5, lineHeight: 22, height: 14.29, fontWeight: '500', marginTop: -5 },
  glyph: { width: 21, height: 21 },
  recordItem: { overflow: 'visible' },
  recordCircle: { position: 'absolute', top: -31.2, alignItems: 'center', justifyContent: 'center', height: 76.8, width: 76.8 },
  recordBackground: { alignItems: 'center', justifyContent: 'center', height: 76.8, width: 76.8 },
  recordSymbol: { width: 40, height: 40 },
});
