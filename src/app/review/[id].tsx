import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { safeSharedReviewPath } from '@/features/reviews/review-logic';
import { getPublicReview, type ReviewRecord } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function PublicReviewScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const reviewId = Array.isArray(params.id) ? params.id[0] : params.id;
  const returnTo = safeSharedReviewPath(reviewId ? `/review/${reviewId}` : undefined);
  const { mode, status: sessionStatus } = useSession();
  const [record, setRecord] = useState<ReviewRecord | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    if (sessionStatus !== 'ready' || mode !== 'supabase' || !reviewId || !returnTo) return;
    let active = true;
    void getPublicReview(reviewId)
      .then((result) => {
        if (!active) return;
        setRecord(result);
        setStatus(result ? 'ready' : 'missing');
      })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [mode, returnTo, reviewId, sessionStatus]);

  const questionRows = useMemo(() => {
    if (!record) return [];
    return record.questions.map((question) => {
      const answer = record.answers[question.key]?.trim();
      const selected = new Set(record.questionTags[question.key] ?? []);
      const tags = question.options.filter((option) => selected.has(option.id)).map((option) => option.label);
      return { key: question.key, question: question.text, response: answer || tags.join(' · ') };
    }).filter((row) => row.response);
  }, [record]);

  if (sessionStatus === 'loading' || (returnTo && status === 'loading')) {
    return <Screen eyebrow="공개 기록" title="감상 기록"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  }

  if (mode !== 'supabase') {
    return (
      <Screen eyebrow="공개 기록" title="로그인 후 볼 수 있어요">
        <StateNotice message="공개 기록도 Flick 이메일 계정 사용자에게만 읽기를 허용합니다. 작성자 외에는 수정하거나 삭제할 수 없어요." title="계정 보호" tone="warning" />
        <Button label="이메일로 로그인" onPress={() => router.replace({ pathname: '/welcome', params: returnTo ? { returnTo } : {} })} />
      </Screen>
    );
  }

  if (status === 'error') {
    return <Screen eyebrow="공개 기록" title="기록을 불러오지 못했어요"><StateNotice message="연결을 확인한 뒤 다시 열어 주세요." title="조회 오류" tone="danger" /><Button label="FLICK 홈으로" onPress={() => router.replace('/')} /></Screen>;
  }

  if (status === 'missing' || !record) {
    return <Screen eyebrow="공개 기록" title="볼 수 없는 기록이에요"><StateNotice message="작성자가 비공개로 바꾸거나 삭제했을 수 있습니다. 공개가 완료된 기록만 볼 수 있어요." title="접근할 수 없음" tone="warning" /><Button label="FLICK 홈으로" onPress={() => router.replace('/')} /></Screen>;
  }

  return (
    <Screen eyebrow="공개 기록 · 읽기 전용" title={record.movie.title}>
      <StateNotice message="작성자만 보관함에서 수정·삭제할 수 있습니다." title="이 기록은 읽기 전용이에요" tone="success" />
      <View style={styles.summary}>
        <Text style={styles.meta}>{record.watchedAt} · {record.mode === 'light' ? 'Light' : 'Core'}</Text>
        <Text accessibilityLabel={`별점 ${record.rating}점`} style={styles.rating}>★ {record.rating} / 5</Text>
        {record.oneLine ? <Text style={styles.oneLine}>“{record.oneLine}”</Text> : null}
      </View>
      {record.spoiler ? <StateNotice message="아래 내용에 영화의 주요 장면이나 결말이 포함될 수 있어요." title="스포일러 주의" tone="warning" /> : null}
      {questionRows.map((row, index) => (
        <View key={row.key} style={styles.section}>
          <Text style={styles.question}>Q{index + 1}. {row.question}</Text>
          <Text style={styles.response}>{row.response}</Text>
        </View>
      ))}
      {record.body ? <View style={styles.section}><Text style={styles.sectionTitle}>자유 감상</Text><Text style={styles.response}>{record.body}</Text></View> : null}
      <Button label="FLICK 홈으로" onPress={() => router.replace('/')} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.sm, padding: spacing.xl },
  meta: { ...typography.caption, color: colors.textMuted },
  rating: { ...typography.heading, color: colors.warning },
  oneLine: { ...typography.heading, color: colors.text },
  section: { backgroundColor: colors.surface, borderRadius: radii.md, gap: spacing.sm, padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text },
  question: { ...typography.label, color: colors.text },
  response: { ...typography.body, color: colors.textMuted },
});
