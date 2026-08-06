import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/features/session/session-provider';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <View style={styles.app}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ animation: 'fade', contentStyle: styles.content, headerShown: false }} />
        </View>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { backgroundColor: colors.background, flex: 1 },
  content: { backgroundColor: colors.background },
});
