import { type Href, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { answerExperimentQuiz, listExperimentQuizzes, listInteractivePolls, voteInteractivePoll, type ExperimentQuiz, type InteractivePoll } from '@/features/experiments/experiments-service';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const blockColors: Record<string, string> = { 'red-director-block': '#F2233C', 'gold-festival-block': '#E0A11A', 'blue-imagination-block': '#4478E3' };

export default function ExperimentsScreen() {
  const { mode, status: sessionStatus } = useSession();
  const [quizzes, setQuizzes] = useState<ExperimentQuiz[]>([]);
  const [polls, setPolls] = useState<InteractivePoll[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'success' | 'warning' | 'danger' } | null>(null);

  const load = useCallback(async () => {
    if (mode !== 'supabase') { setStatus('ready'); return; }
    setStatus('loading');
    try {
      const [quizData, pollData] = await Promise.all([listExperimentQuizzes(), listInteractivePolls()]);
      setQuizzes(quizData); setPolls(pollData); setStatus('ready');
    } catch { setStatus('error'); }
  }, [mode]);

  useEffect(() => {
    if (sessionStatus !== 'ready') return;
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, sessionStatus]);

  async function answer(quiz: ExperimentQuiz, optionKey: string) {
    setBusyKey(`quiz:${quiz.quizId}`); setNotice(null);
    try {
      const result = await answerExperimentQuiz(quiz.quizId, optionKey);
      setNotice(result.correct
        ? { title: '히든 블록 해금', message: `${result.rewardLabel ?? quiz.rewardLabel}을(를) 얻었어요.`, tone: 'success' }
        : result.locked ? { title: '이번 블록 도전 종료', message: '세 번의 도전을 모두 사용했어요. 다음 실험을 기다려 주세요.', tone: 'warning' }
          : { title: '아직 정답이 아니에요', message: `남은 도전 ${result.attemptsRemaining}회. 다른 선택지를 생각해 보세요.`, tone: 'warning' });
      await load();
    } catch (error) { setNotice({ title: '답을 확인하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); }
    finally { setBusyKey(null); }
  }

  async function vote(poll: InteractivePoll, optionKey: string) {
    setBusyKey(`poll:${poll.pollId}`); setNotice(null);
    try {
      const result = await voteInteractivePoll(poll.pollId, optionKey);
      setNotice(result.accepted ? { title: '투표 완료', message: '첫 선택을 안전하게 기록했어요.', tone: 'success' } : { title: '이미 참여했어요', message: '중복 투표 대신 기존 첫 선택을 유지합니다.', tone: 'warning' });
      await load();
    } catch (error) { setNotice({ title: '투표하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' }); }
    finally { setBusyKey(null); }
  }

  if (sessionStatus === 'loading' || status === 'loading') return <Screen eyebrow="5E · FLICK LAB" title="참여형 실험"><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>해금 상태와 투표를 확인하고 있어요.</Text></Screen>;
  if (mode !== 'supabase') return <Screen eyebrow="5E · FLICK LAB" title="참여형 실험"><StateNotice message="정답·보상·중복 투표를 서버에서 안전하게 판정하기 위해 이메일 계정이 필요해요." title="로그인 후 참여할 수 있어요" tone="warning" /><Button label="로그인하기" onPress={() => router.push('/welcome' as Href)} /></Screen>;
  if (status === 'error') return <Screen eyebrow="5E · FLICK LAB" title="참여형 실험"><StateNotice message="참여 상태는 변경되지 않았어요." title="실험을 불러오지 못했어요" tone="danger" /><Button label="다시 시도" onPress={() => void load()} /></Screen>;

  const unlocked = quizzes.filter((quiz) => quiz.unlocked);
  return (
    <Screen eyebrow="5E · FLICK LAB" title="영화 취향 실험실">
      {notice ? <StateNotice {...notice} /> : null}
      <View style={styles.rewardSection}>
        <Text style={styles.sectionTitle}>나의 히든 블록</Text>
        <Text style={styles.muted}>정답은 서버에서만 판정하며 퀴즈마다 최대 3번 도전할 수 있어요.</Text>
        <View style={styles.blocks}>{unlocked.length ? unlocked.map((quiz) => <View accessibilityLabel={`${quiz.rewardLabel} 해금됨`} key={quiz.rewardKey} style={styles.blockWrap}><View style={[styles.block, { backgroundColor: blockColors[quiz.rewardKey] ?? colors.primary }]} /><Text style={styles.blockLabel}>{quiz.rewardLabel}</Text></View>) : <Text style={styles.muted}>퀴즈를 맞히면 이곳에 블록이 나타납니다.</Text>}</View>
      </View>

      <Text style={styles.sectionHeading}>히든 블록 퀴즈</Text>
      {quizzes.map((quiz) => {
        const locked = !quiz.unlocked && quiz.attemptCount >= 3;
        return <View key={quiz.quizId} style={styles.card}><View style={styles.titleRow}><Text style={styles.cardTitle}>{quiz.title}</Text><Text style={[styles.status, quiz.unlocked && styles.statusDone]}>{quiz.unlocked ? '해금 완료' : locked ? '도전 종료' : `${3 - quiz.attemptCount}회 남음`}</Text></View><Text style={styles.body}>{quiz.prompt}</Text><View style={styles.options}>{quiz.options.map((option) => <Pressable accessibilityRole="button" disabled={quiz.unlocked || locked || busyKey === `quiz:${quiz.quizId}`} key={option.key} onPress={() => void answer(quiz, option.key)} style={({ pressed }) => [styles.option, pressed && styles.optionPressed, (quiz.unlocked || locked) && styles.optionDisabled]}><Text style={styles.optionText}>{option.label}</Text></Pressable>)}</View></View>;
      })}

      <Text style={styles.sectionHeading}>한 가지 질문, 한 번의 선택</Text>
      {polls.map((poll) => <View key={poll.pollId} style={styles.card}><Text style={styles.cardTitle}>{poll.title}</Text><Text style={styles.body}>{poll.question}</Text><Text style={styles.muted}>총 {poll.totalVotes}명 참여 · 첫 선택만 반영됩니다.</Text><View style={styles.options}>{poll.results.map((option) => { const selected = poll.myOption === option.key; const percentage = poll.totalVotes ? Math.round(option.count / poll.totalVotes * 100) : 0; return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled: Boolean(poll.myOption) }} disabled={Boolean(poll.myOption) || busyKey === `poll:${poll.pollId}`} key={option.key} onPress={() => void vote(poll, option.key)} style={[styles.pollOption, selected && styles.pollSelected]}><View style={styles.flex}><Text style={[styles.optionText, selected && styles.pollSelectedText]}>{option.label}</Text>{poll.myOption ? <Text style={[styles.muted, selected && styles.pollSelectedText]}>{option.count}표 · {percentage}%</Text> : null}</View>{selected ? <Text style={styles.check}>✓</Text> : null}</Pressable>; })}</View></View>)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { ...typography.caption, color: colors.textMuted }, body: { ...typography.body, color: colors.text }, flex: { flex: 1 },
  rewardSection: { backgroundColor: colors.text, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg }, sectionTitle: { ...typography.heading, color: colors.surface }, sectionHeading: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  blocks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, blockWrap: { alignItems: 'center', gap: spacing.xs, width: 88 }, block: { borderRadius: radii.sm, height: 56, transform: [{ rotate: '-4deg' }], width: 56 }, blockLabel: { ...typography.caption, color: colors.surface, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg }, titleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }, cardTitle: { ...typography.heading, color: colors.text, flex: 1 }, status: { ...typography.caption, backgroundColor: colors.warningSoft, borderRadius: radii.pill, color: colors.warning, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, statusDone: { backgroundColor: colors.successSoft, color: colors.success },
  options: { gap: spacing.sm }, option: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, minHeight: 48, justifyContent: 'center', padding: spacing.md }, optionPressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, optionDisabled: { opacity: 0.55 }, optionText: { ...typography.label, color: colors.text },
  pollOption: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', minHeight: 56, padding: spacing.md }, pollSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, pollSelectedText: { color: colors.surface }, check: { ...typography.heading, color: colors.surface },
});
