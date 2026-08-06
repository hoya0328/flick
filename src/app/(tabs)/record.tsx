import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function RecordScreen() {
  const params = useLocalSearchParams<{ movieId?: string; title?: string }>();
  const title = Array.isArray(params.title) ? params.title[0] : params.title;

  return (
    <Screen eyebrow="감상 영화 선택" title="어떤 영화를 기록할까요?">
      {title ? (
        <View style={styles.selected}>
          <Text style={styles.label}>선택한 영화</Text>
          <Text style={styles.title}>{title}</Text>
          <StateNotice message="영화 선택은 저장됐습니다. 별점과 Light/Core 기록은 3단계에서 이어집니다." title="기록 준비 완료" tone="success" />
        </View>
      ) : (
        <StateNotice message="탐색에서 영화를 선택하면 이곳에서 기록을 시작할 수 있어요." title="먼저 영화를 골라주세요" />
      )}
      <Button label="영화 탐색하기" onPress={() => router.push('/(tabs)/search')} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  selected: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.xl },
  label: { ...typography.label, color: colors.primary },
  title: { ...typography.title, color: colors.text },
});
