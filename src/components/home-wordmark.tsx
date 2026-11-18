import { router } from 'expo-router';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { DesignVector } from './design-vector';

// The artwork stays 116.4 × 22; the larger control does not scale the SVG.
export function HomeWordmark({ style, onPress }: { style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel="FLICK 글씨 · 홈으로"
    onPress={onPress ?? (() => router.navigate('/'))}
    style={[styles.button, style]}
    testID="home-wordmark"
  >
    <DesignVector name="wordmark" width={116.4} height={22} />
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { width: 116.4, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
