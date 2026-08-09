import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/tokens';
import { LoadingScreen } from '@/components/loading-screen';
import { useSession } from '@/features/session/session-provider';

function TabGlyph({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={[styles.glyph, focused && styles.glyphFocused]}>{label}</Text>;
}

export default function TabLayout() {
  const { mode, onboardingComplete, status } = useSession();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error') return <Redirect href="/" />;
  if (mode === 'none') return <Redirect href="/welcome" />;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
      }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="⌂" />, title: '홈' }} />
      <Tabs.Screen name="search" options={{ tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="⌕" />, title: '탐색' }} />
      <Tabs.Screen
        name="record"
        options={{
          tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="✦" />,
          tabBarItemStyle: styles.recordItem,
          title: '기록',
        }}
      />
      <Tabs.Screen name="archive" options={{ tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="▦" />, title: '보관함' }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabGlyph focused={focused} label="●" />, title: '마이' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 70, paddingBottom: 8, paddingTop: 7 },
  label: { fontSize: 11, fontWeight: '700' },
  glyph: { color: colors.textMuted, fontSize: 22, lineHeight: 24 },
  glyphFocused: { color: colors.primary },
  recordItem: { backgroundColor: colors.primarySoft, borderRadius: 18, marginHorizontal: 6 },
});
