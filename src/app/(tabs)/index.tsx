import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { getKeywordLabels } from '@/features/onboarding/keywords';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  const { selectedKeywords } = useSession();
  const labels = getKeywordLabels(selectedKeywords);

  return (
    <Screen>
      <BrandMark compact />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>당신의 첫 취향</Text>
        <Text style={styles.title}>오늘은 어떤 영화가 끌리나요?</Text>
        <View style={styles.chips}>
          {labels.map((label) => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <StateNotice message="2단계에서 키워드 기반 영화와 추천 이유가 이곳에 나타납니다." title="영화 발견 준비 중" />

      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>✦</Text>
        <Text style={styles.emptyTitle}>아직 남긴 기록이 없어요</Text>
        <Text style={styles.emptyBody}>첫 영화 기록은 3단계에서 연결됩니다. 지금은 온보딩과 앱 기반을 확인할 수 있어요.</Text>
        <Button disabled label="첫 기록 시작하기 · 3단계" onPress={() => undefined} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, paddingTop: spacing.lg },
  eyebrow: { ...typography.label, color: colors.primary },
  title: { ...typography.title, color: colors.text, maxWidth: 430 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipText: { ...typography.label, color: colors.surface },
  emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.xxl },
  emptyIcon: { color: colors.primary, fontSize: 36 },
  emptyTitle: { ...typography.heading, color: colors.text },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
