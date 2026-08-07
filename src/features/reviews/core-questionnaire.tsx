import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { generateNextCoreQuestion } from '@/features/reviews/core-question-service';
import { CORE_QUESTION_LIMIT, updateCoreAnswer } from '@/features/reviews/core-questions';
import type { ReviewForm } from '@/features/reviews/review-logic';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type Props = {
  form: ReviewForm;
  movieTitle: string;
  onChange: (update: (current: ReviewForm) => ReviewForm) => void;
  sessionMode: 'demo' | 'supabase';
};

export function CoreQuestionnaire({ form, movieTitle, onChange, sessionMode }: Props) {
  const [activeIndex, setActiveIndex] = useState(Math.max(0, form.questions.findIndex((question) => !(form.answers[question.key]?.trim()))));
  const [showSummary, setShowSummary] = useState(form.questions.length === CORE_QUESTION_LIMIT && form.questions.every((question) => (form.answers[question.key]?.trim().length ?? 0) >= 20));
  const [consented, setConsented] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const visibleIndex = Math.min(activeIndex, Math.max(0, form.questions.length - 1));
  const question = form.questions[visibleIndex];
  if (!question) return null;
  const answer = form.answers[question.key] ?? '';
  const completeAnswers = form.questions.filter((item) => (form.answers[item.key]?.trim().length ?? 0) >= 20).length;
  const isLastQuestion = visibleIndex === CORE_QUESTION_LIMIT - 1;

  function updateAnswer(value: string) {
    const removesFollowups = form.questions.length > visibleIndex + 1;
    onChange((current) => updateCoreAnswer(current, visibleIndex, value));
    if (removesFollowups) setMessage('앞선 답변을 수정해 이후 연계 질문을 다시 만들게요.');
  }

  async function continueQuestions() {
    if (answer.trim().length < 20) {
      setMessage('다음 질문으로 이어가려면 현재 답변을 20자 이상 작성해 주세요.');
      return;
    }
    if (isLastQuestion) {
      setShowSummary(true);
      return;
    }
    if (form.questions[visibleIndex + 1]) {
      setActiveIndex(visibleIndex + 1);
      setMessage('');
      return;
    }
    if (sessionMode === 'supabase' && !consented) {
      setMessage('무료 Gemini 테스트 안내에 동의한 뒤 연계 질문을 생성해 주세요.');
      return;
    }

    setGenerating(true);
    setMessage('답변과 영화 정보를 바탕으로 다음 질문을 만들고 있어요.');
    const result = await generateNextCoreQuestion(form, movieTitle, sessionMode);
    onChange((current) => ({ ...current, questions: [...current.questions, result.question] }));
    setActiveIndex((index) => index + 1);
    setMessage(result.notice);
    setGenerating(false);
  }

  if (showSummary) {
    return (
      <View style={styles.section}>
        <View style={styles.headingRow}>
          <View style={styles.flex}><Text style={styles.sectionTitle}>Core 질문 기록</Text><Text style={styles.help}>질문을 누르면 답변을 수정하고 이후 질문을 다시 생성할 수 있어요.</Text></View>
          <Text style={styles.count}>{completeAnswers}/5 완료</Text>
        </View>
        {form.questions.map((item, index) => (
          <Pressable accessibilityRole="button" key={item.key} onPress={() => { setActiveIndex(index); setShowSummary(false); }} style={styles.summary}>
            <Text style={styles.summaryQuestion}>Q{index + 1}. {item.text}</Text>
            <Text numberOfLines={3} style={styles.summaryAnswer}>{form.answers[item.key] || '답변 없음'}</Text>
          </Pressable>
        ))}
        <Button label="마지막 답변 다시 보기" onPress={() => { setActiveIndex(form.questions.length - 1); setShowSummary(false); }} variant="secondary" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
          <View style={styles.flex}><Text style={styles.eyebrow}>Core 연계 질문 {visibleIndex + 1} / 5</Text><Text style={styles.help}>앞선 답변을 바탕으로 다음 질문이 달라져요.</Text></View>
        <Text style={styles.count}>{completeAnswers}/5 완료</Text>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((visibleIndex + 1) / CORE_QUESTION_LIMIT) * 100}%` }]} /></View>
      <View style={styles.questionCard}>
        <Text style={styles.questionNumber}>Q{visibleIndex + 1}.</Text>
        <Text style={styles.questionText}>{question.text}</Text>
        <Text style={styles.source}>{question.sourceRule.includes('gemini') ? 'Gemini 연계 질문' : question.sourceRule.includes('fallback') ? '기본 연계 질문' : '영화 정보 기반 질문'}</Text>
      </View>
      <TextInput
        accessibilityLabel={`Core 질문 ${visibleIndex + 1} 답변`}
        maxLength={1200}
        multiline
        onChangeText={updateAnswer}
        placeholder="장면과 이유를 구체적으로 적어보세요."
        placeholderTextColor={colors.textMuted}
        style={styles.textarea}
        textAlignVertical="top"
        value={answer}
      />
      <Text style={styles.counter}>{answer.length}/1,200 · 다음 질문 생성 기준 20자</Text>

      {sessionMode === 'supabase' && visibleIndex < CORE_QUESTION_LIMIT - 1 ? (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consented }} onPress={() => setConsented((value) => !value)} style={styles.consentRow}>
          <View style={[styles.checkbox, consented && styles.checkboxSelected]}><Text style={styles.checkmark}>{consented ? '✓' : ''}</Text></View>
          <Text style={styles.consentText}>만 18세 이상이며, 개인정보를 제외한 답변이 무료 Gemini 테스트 처리에 전달되는 것에 동의해요.</Text>
        </Pressable>
      ) : null}
      <Text style={styles.privacy}>이메일·사용자 ID는 전송하지 않아요. 무료 티어 입력은 Google 제품 개선에 사용될 수 있으므로 개인정보나 민감정보를 적지 마세요.</Text>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
      <View style={styles.actions}>
        <Button disabled={visibleIndex === 0 || generating} label="이전" onPress={() => { setActiveIndex(Math.max(0, visibleIndex - 1)); setMessage(''); }} style={styles.action} variant="ghost" />
        <Button label={isLastQuestion ? '질문 기록 확인' : form.questions[visibleIndex + 1] ? '다음 질문' : '연계 질문 생성'} loading={generating} onPress={() => void continueQuestions()} style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  headingRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  flex: { flex: 1 },
  sectionTitle: { ...typography.heading, color: colors.text },
  eyebrow: { ...typography.label, color: colors.primary },
  help: { ...typography.caption, color: colors.textMuted },
  count: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  progressTrack: { backgroundColor: colors.border, borderRadius: radii.pill, height: 7, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.primary, borderRadius: radii.pill, height: 7 },
  questionCard: { alignItems: 'center', backgroundColor: colors.text, borderRadius: radii.lg, gap: spacing.sm, minHeight: 170, justifyContent: 'center', padding: spacing.xl },
  questionNumber: { ...typography.heading, color: colors.primary },
  questionText: { ...typography.heading, color: colors.surface, textAlign: 'center' },
  source: { ...typography.caption, color: colors.border },
  textarea: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 150, padding: spacing.lg },
  counter: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  consentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.surface, fontWeight: '800' },
  consentText: { ...typography.caption, color: colors.text, flex: 1 },
  privacy: { ...typography.caption, color: colors.warning },
  message: { ...typography.caption, color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  summary: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  summaryQuestion: { ...typography.label, color: colors.text },
  summaryAnswer: { ...typography.caption, color: colors.textMuted },
});
