import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { generateCoreReviewDraft } from '@/features/reviews/core-draft-service';
import { isCoreDraftReady } from '@/features/reviews/core-draft';
import type { ReviewForm } from '@/features/reviews/review-logic';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type Props = {
  form: ReviewForm;
  onChange: (update: (current: ReviewForm) => ReviewForm) => void;
  sessionMode: 'demo' | 'supabase';
};

export function CoreReviewDraftPanel({ form, onChange, sessionMode }: Props) {
  const [consented, setConsented] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [lastAppliedDraft, setLastAppliedDraft] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const ready = isCoreDraftReady(form);

  async function createDraft(forceReplace = false) {
    if (!ready) {
      setMessage('Core 질문 5개에 각각 20자 이상 답하면 AI 초안을 만들 수 있어요.');
      return;
    }
    if (sessionMode !== 'supabase') {
      setMessage('AI 초안은 실제 계정으로 로그인한 테스트 환경에서 사용할 수 있어요.');
      return;
    }
    if (!consented) {
      setMessage('무료 Gemini 테스트 처리 안내에 동의해 주세요.');
      return;
    }
    const hasEditedBody = Boolean(form.body.trim()) && form.body.trim() !== lastAppliedDraft.trim();
    if (hasEditedBody && !forceReplace) {
      setConfirmReplace(true);
      setMessage('현재 자유 감상을 보존하려면 취소하고, AI 초안으로 바꾸려면 교체를 선택해 주세요.');
      return;
    }

    setConfirmReplace(false);
    setGenerating(true);
    setMessage('다섯 답변의 표현을 살려 리뷰 초안을 정리하고 있어요.');
    try {
      const result = await generateCoreReviewDraft(form, sessionMode);
      setKeywords(result.keywords);
      setLastAppliedDraft(result.draft);
      onChange((current) => ({ ...current, body: result.draft }));
      setMessage('AI 초안을 자유 감상에 채웠어요. 내 문장처럼 수정한 뒤 저장해 주세요.');
    } catch {
      setMessage('Gemini가 응답하지 않았어요. 기존 답변과 자유 감상은 그대로 보존했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <Text style={styles.title}>AI 리뷰 초안 · 테스트</Text>
          <Text style={styles.help}>Q1~Q5를 요약해 약 500~800자 초안을 만들고 아래 자유 감상에 채워요.</Text>
        </View>
        <Text style={[styles.status, ready && styles.statusReady]}>{ready ? '준비 완료' : 'Q5 필요'}</Text>
      </View>

      {keywords.length ? (
        <View style={styles.keywords}>
          {keywords.map((keyword) => <Text key={keyword} style={styles.keyword}>#{keyword}</Text>)}
        </View>
      ) : null}

      {sessionMode === 'supabase' ? (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consented }} onPress={() => setConsented((value) => !value)} style={styles.consentRow}>
          <View style={[styles.checkbox, consented && styles.checkboxSelected]}><Text style={styles.checkmark}>{consented ? '✓' : ''}</Text></View>
          <Text style={styles.consentText}>질문 5개와 답변을 무료 Gemini 테스트 처리에 전달해 리뷰 초안을 만드는 데 동의해요.</Text>
        </Pressable>
      ) : null}
      <Text style={styles.privacy}>개인정보·민감정보를 입력하지 마세요. AI 초안은 자동 게시되지 않으며 최종 수정과 저장은 사용자가 결정해요.</Text>

      {confirmReplace ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>현재 자유 감상을 AI 초안으로 교체할까요?</Text>
          <View style={styles.actions}>
            <Button label="취소" onPress={() => { setConfirmReplace(false); setMessage('기존 자유 감상을 유지했어요.'); }} style={styles.action} variant="ghost" />
            <Button label="AI 초안으로 교체" loading={generating} onPress={() => void createDraft(true)} style={styles.action} variant="secondary" />
          </View>
        </View>
      ) : (
        <Button disabled={!ready || sessionMode !== 'supabase'} label={lastAppliedDraft ? 'AI 초안 다시 만들기' : 'AI 리뷰 초안 만들기'} loading={generating} onPress={() => void createDraft()} />
      )}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  headingRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  flex: { flex: 1 },
  title: { ...typography.label, color: colors.text },
  help: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  status: { ...typography.caption, backgroundColor: colors.warningSoft, borderRadius: radii.pill, color: colors.warning, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  statusReady: { backgroundColor: colors.successSoft, color: colors.success },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  keyword: { ...typography.caption, backgroundColor: colors.primarySoft, borderRadius: radii.pill, color: colors.primary, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  consentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.surface, fontWeight: '800' },
  consentText: { ...typography.caption, color: colors.text, flex: 1 },
  privacy: { ...typography.caption, color: colors.warning },
  message: { ...typography.caption, color: colors.primary },
  confirmBox: { backgroundColor: colors.warningSoft, borderRadius: radii.md, gap: spacing.sm, padding: spacing.md },
  confirmText: { ...typography.label, color: colors.warning },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
