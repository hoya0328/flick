import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { selectedLightTagLabels } from '@/features/reviews/light-questions';
import type { ReviewForm } from '@/features/reviews/review-logic';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type Props = {
  form: ReviewForm;
  onChange: (update: (current: ReviewForm) => ReviewForm) => void;
};

export function LightQuestionnaire({ form, onChange }: Props) {
  const firstUnanswered = useMemo(() => Math.max(0, form.questions.findIndex((question) => !(form.questionTags[question.key]?.length))), [form.questionTags, form.questions]);
  const [activeIndex, setActiveIndex] = useState(firstUnanswered);
  const [showSummary, setShowSummary] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');

  const question = form.questions[activeIndex];
  if (!question) {
    return <View style={styles.section}><Text style={styles.sectionTitle}>영화별 질문을 준비하고 있어요</Text><Text style={styles.help}>영화 정보를 불러오지 못하면 기본 질문으로 다시 시도할 수 있어요.</Text></View>;
  }

  const questionKey = question.key;
  const selectedIds = form.questionTags[questionKey] ?? [];
  const answeredCount = form.questions.filter((item) => (form.questionTags[item.key]?.length ?? 0) > 0).length;
  const isLast = activeIndex === form.questions.length - 1;

  function toggleTag(tagId: string) {
    setLimitMessage('');
    if (!selectedIds.includes(tagId) && selectedIds.length >= 3) {
      setLimitMessage('질문마다 최대 3개까지 선택할 수 있어요.');
      return;
    }
    onChange((current) => {
      const currentIds = current.questionTags[questionKey] ?? [];
      const selected = currentIds.includes(tagId);
      return {
        ...current,
        questionTags: {
          ...current.questionTags,
          [questionKey]: selected ? currentIds.filter((id) => id !== tagId) : [...currentIds, tagId],
        },
      };
    });
  }

  if (showSummary) {
    return (
      <View style={styles.section}>
        <View style={styles.headingRow}><View><Text style={styles.sectionTitle}>내 태그 기록</Text><Text style={styles.help}>질문을 누르면 선택 내용을 다시 바꿀 수 있어요.</Text></View><Text style={styles.count}>{answeredCount}/5 답변</Text></View>
        {form.questions.map((item, index) => {
          const labels = selectedLightTagLabels(form, item.key);
          return (
            <Pressable accessibilityRole="button" key={item.key} onPress={() => { setActiveIndex(index); setShowSummary(false); }} style={styles.summary}>
              <Text style={styles.summaryQuestion}>Q{index + 1}. {item.text}</Text>
              <Text style={[styles.summaryTags, !labels.length && styles.summaryEmpty]}>{labels.length ? labels.join(' · ') : '건너뜀'}</Text>
            </Pressable>
          );
        })}
        <Button label="질문 이어서 답하기" onPress={() => { setActiveIndex(firstUnanswered); setShowSummary(false); }} variant="secondary" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
        <View style={styles.headingRow}>
          <View><Text style={styles.eyebrow}>영화별 질문 {activeIndex + 1} / {form.questions.length}</Text><Text style={styles.help}>AI 없이 영화 정보로 구성했어요 · 질문당 최대 3개</Text></View>
          <Text style={styles.count}>{answeredCount}/5 답변</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((activeIndex + 1) / form.questions.length) * 100}%` }]} /></View>
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Q{activeIndex + 1}.</Text>
          <Text style={styles.questionText}>{question.text}</Text>
        </View>

        <View style={styles.selectedTray}>
          {selectedIds.length ? selectedLightTagLabels(form, questionKey).map((label) => <View key={label} style={styles.selectedTag}><Text style={styles.selectedTagText}>{label}</Text></View>) : <Text style={styles.emptySelection}>아래에서 지금 느낌과 가까운 태그를 골라주세요.</Text>}
        </View>
        <View style={styles.tags}>
          {question.options.map((option) => {
            const selected = selectedIds.includes(option.id);
            return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} key={option.id} onPress={() => toggleTag(option.id)} style={[styles.tag, selected && styles.tagSelected]}><Text style={[styles.tagText, selected && styles.tagTextSelected]}>{option.label}</Text></Pressable>;
          })}
        </View>
        {limitMessage ? <Text accessibilityLiveRegion="polite" style={styles.limit}>{limitMessage}</Text> : null}
        <View style={styles.actions}>
          <Button disabled={activeIndex === 0} label="이전" onPress={() => { setLimitMessage(''); setActiveIndex((index) => Math.max(0, index - 1)); }} style={styles.action} variant="ghost" />
          <Button label={isLast ? '태그 기록 확인' : selectedIds.length ? '다음' : '건너뛰기'} onPress={() => { setLimitMessage(''); if (isLast) setShowSummary(true); else setActiveIndex((index) => index + 1); }} style={styles.action} variant={selectedIds.length ? 'primary' : 'secondary'} />
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text },
  headingRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  eyebrow: { ...typography.label, color: colors.primary },
  help: { ...typography.caption, color: colors.textMuted },
  count: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  progressTrack: { backgroundColor: colors.border, borderRadius: radii.pill, height: 7, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.primary, borderRadius: radii.pill, height: 7 },
  questionCard: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.lg, gap: spacing.xs, minHeight: 150, justifyContent: 'center', padding: spacing.xl },
  questionNumber: { ...typography.heading, color: colors.surface },
  questionText: { ...typography.heading, color: colors.surface, textAlign: 'center' },
  selectedTray: { alignItems: 'center', backgroundColor: colors.background, borderRadius: radii.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, minHeight: 58, padding: spacing.md },
  selectedTag: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  selectedTagText: { ...typography.label, color: colors.primary },
  emptySelection: { ...typography.caption, color: colors.textMuted, textAlign: 'center', width: '100%' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tagSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { ...typography.caption, color: colors.textMuted },
  tagTextSelected: { color: colors.surface, fontWeight: '700' },
  limit: { ...typography.caption, color: colors.warning },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  summary: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  summaryQuestion: { ...typography.label, color: colors.text },
  summaryTags: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  summaryEmpty: { color: colors.textMuted, fontWeight: '400' },
});
