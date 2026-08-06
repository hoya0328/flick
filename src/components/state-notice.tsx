import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

type StateNoticeProps = {
  title: string;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
};

export function StateNotice({ title, message, tone = 'info' }: StateNoticeProps) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.base, styles[tone]]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.md, gap: spacing.xs, padding: spacing.lg },
  info: { backgroundColor: colors.primarySoft },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.warningSoft },
  danger: { backgroundColor: colors.dangerSoft },
  title: { ...typography.label, color: colors.text },
  message: { ...typography.caption, color: colors.textMuted },
});
