import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { KeywordChip } from '@/components/keyword-chip';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import {
  canCompleteOnboarding,
  ONBOARDING_MAX_KEYWORDS,
  ONBOARDING_MIN_KEYWORDS,
  tasteKeywords,
  toggleKeyword,
} from '@/features/onboarding/keywords';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function OnboardingScreen() {
  const { completeOnboarding, mode, selectedKeywords, status } = useSession();
  const [selection, setSelection] = useState<string[]>(selectedKeywords);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canComplete = useMemo(() => canCompleteOnboarding(selection), [selection]);

  if (status === 'ready' && mode === 'none') return <Redirect href="/welcome" />;

  const handleComplete = async () => {
    if (!canComplete) return;
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding(selection);
      router.replace('/(tabs)');
    } catch {
      setError('취향 키워드를 저장하지 못했어요. 입력은 유지되니 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      eyebrow="1 / 1 · 첫 취향 설정"
      footer={<Button disabled={!canComplete} label="내 취향으로 시작하기" loading={busy} onPress={() => void handleComplete()} />}
      title="오늘 어떤 영화가 필요해요?">
      <Text style={styles.description}>
        지금 마음과 가까운 키워드를 {ONBOARDING_MIN_KEYWORDS}~{ONBOARDING_MAX_KEYWORDS}개 골라주세요. 추천과 기록에서 같은 언어로 사용할게요.
      </Text>

      <View accessibilityLabel="선택한 키워드 수" style={styles.counter}>
        <Text style={styles.counterText}>선택 {selection.length}</Text>
        <Text style={styles.counterLimit}>/ {ONBOARDING_MAX_KEYWORDS}</Text>
      </View>

      {error ? <StateNotice message={error} title="저장 오류" tone="danger" /> : null}

      <View style={styles.chips}>
        {tasteKeywords.map((keyword) => {
          const selected = selection.includes(keyword.id);
          const disabled = !selected && selection.length >= ONBOARDING_MAX_KEYWORDS;
          return (
            <KeywordChip
              disabled={disabled}
              key={keyword.id}
              label={keyword.label}
              onPress={() => setSelection((current) => toggleKeyword(current, keyword.id))}
              selected={selected}
            />
          );
        })}
      </View>

      {!canComplete ? (
        <StateNotice
          message={`앞으로 ${Math.max(0, ONBOARDING_MIN_KEYWORDS - selection.length)}개를 더 고르면 시작할 수 있어요.`}
          title="취향을 조금만 더 알려주세요"
        />
      ) : (
        <StateNotice message="언제든 마이 화면에서 다시 고를 수 있어요." title="준비됐어요" tone="success" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: { ...typography.body, color: colors.textMuted },
  counter: {
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  counterText: { ...typography.label, color: colors.primary },
  counterLimit: { ...typography.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
