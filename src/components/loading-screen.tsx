import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { colors, spacing, typography } from '@/theme/tokens';

export function LoadingScreen() {
  return (
    <View accessibilityLabel="FLICK를 준비하는 중" style={styles.container}>
      <BrandMark />
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.text}>당신의 영화 취향을 불러오고 있어요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  text: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
