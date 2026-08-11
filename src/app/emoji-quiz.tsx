import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { createEmojiQuizSession, EMOJI_QUIZ_MAX, isEmojiQuizAnswerCorrect } from '@/features/experiments/emoji-quiz-game';
import type { EmojiQuizQuestion } from '@/features/experiments/emoji-quiz-data';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const BEST_SCORE_KEY = 'flick.emoji-quiz.best-scores';
const presets = [10, 30, 50] as const;
type Phase = 'setup' | 'playing' | 'result';
type AnswerResult = { correct: boolean; title: string };

export default function EmojiQuizScreen() {
  const inputRef = useRef<TextInput>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedCount, setSelectedCount] = useState<number | 'custom'>(10);
  const [customCount, setCustomCount] = useState('20');
  const [questions, setQuestions] = useState<EmojiQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [bestScores, setBestScores] = useState<Record<string, number>>({});

  useEffect(() => {
    AsyncStorage.getItem(BEST_SCORE_KEY)
      .then((value) => { if (value) setBestScores(JSON.parse(value) as Record<string, number>); })
      .catch(() => setBestScores({}));
  }, []);

  const total = questions.length;
  const current = questions[index];
  const best = bestScores[String(total || (selectedCount === 'custom' ? customCount : selectedCount))] ?? 0;
  const progress = total ? Math.round(((index + 1) / total) * 100) : 0;
  const accuracy = total ? Math.round((score / total) * 100) : 0;
  const countLabel = selectedCount === 'custom' ? '직접 설정' : `${selectedCount}문제`;

  const validCustomCount = useMemo(() => {
    const parsed = Number(customCount);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= EMOJI_QUIZ_MAX ? parsed : null;
  }, [customCount]);

  function startGame(requestedCount?: number) {
    const count = requestedCount ?? (selectedCount === 'custom' ? validCustomCount : selectedCount);
    if (!count) {
      setNotice(`문제 수를 1~${EMOJI_QUIZ_MAX} 사이로 입력해 주세요.`);
      return;
    }
    setQuestions(createEmojiQuizSession(count));
    setIndex(0);
    setAnswer('');
    setAnswerResult(null);
    setScore(0);
    setNotice(null);
    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  function submitAnswer() {
    if (!current || answerResult) return;
    if (!answer.trim()) {
      setNotice('영화 제목을 입력해야 정답을 확인할 수 있어요.');
      inputRef.current?.focus();
      return;
    }
    const correct = isEmojiQuizAnswerCorrect(current, answer);
    if (correct) setScore((value) => value + 1);
    setAnswerResult({ correct, title: current.title });
    setNotice(null);
  }

  async function moveNext() {
    if (!answerResult) return;
    if (index < total - 1) {
      setIndex((value) => value + 1);
      setAnswer('');
      setAnswerResult(null);
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }
    const finalScore = score;
    const updated = { ...bestScores, [String(total)]: Math.max(bestScores[String(total)] ?? 0, finalScore) };
    setBestScores(updated);
    setPhase('result');
    try { await AsyncStorage.setItem(BEST_SCORE_KEY, JSON.stringify(updated)); } catch { /* 점수 저장 실패가 결과 확인을 막지 않는다. */ }
  }

  if (phase === 'setup') {
    return (
      <Screen eyebrow="MINI GAME · 100 MOVIES" title="이모지로 영화 맞히기">
        <View style={styles.emojiHero}><Text accessibilityLabel="팝콘, 영화, 생각, 정답" style={styles.heroEmoji}>🍿 🎬 🤔 💡</Text><Text style={styles.heroText}>이모지 힌트를 보고 영화 제목을 입력해 보세요. 같은 게임 안에서는 문제가 겹치지 않아요.</Text></View>
        {notice ? <StateNotice message={notice} title="문제 수를 확인해 주세요" tone="warning" /> : null}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>몇 문제에 도전할까요?</Text>
          <View style={styles.countGrid}>
            {presets.map((count) => <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedCount === count }} key={count} onPress={() => { setSelectedCount(count); setNotice(null); }} style={[styles.countChip, selectedCount === count && styles.countChipSelected]}><Text style={[styles.countText, selectedCount === count && styles.countTextSelected]}>{count}</Text><Text style={[styles.countUnit, selectedCount === count && styles.countTextSelected]}>문제</Text></Pressable>)}
            <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedCount === 'custom' }} onPress={() => { setSelectedCount('custom'); setNotice(null); }} style={[styles.countChip, selectedCount === 'custom' && styles.countChipSelected]}><Text style={[styles.countText, selectedCount === 'custom' && styles.countTextSelected]}>직접</Text><Text style={[styles.countUnit, selectedCount === 'custom' && styles.countTextSelected]}>설정</Text></Pressable>
          </View>
          {selectedCount === 'custom' ? <View style={styles.customRow}><TextInput accessibilityLabel="직접 설정할 문제 수" keyboardType="number-pad" maxLength={3} onChangeText={setCustomCount} placeholder="1~100" placeholderTextColor={colors.textMuted} style={styles.customInput} value={customCount} /><Text style={styles.customHint}>1~100문제</Text></View> : null}
          <Text style={styles.bestText}>{countLabel} 최고 기록 {best}점</Text>
        </View>
        <Button label={`${selectedCount === 'custom' ? validCustomCount ?? '?' : selectedCount}문제 시작하기`} onPress={() => startGame()} />
      </Screen>
    );
  }

  if (phase === 'result') {
    return (
      <Screen eyebrow="MINI GAME · RESULT" title="게임 결과">
        <View style={styles.resultCard}><Text style={styles.resultEmoji}>{accuracy >= 80 ? '🏆' : accuracy >= 50 ? '🎬' : '🍿'}</Text><Text style={styles.resultScore}>{score} / {total}</Text><Text style={styles.resultAccuracy}>정답률 {accuracy}%</Text><Text style={styles.bestText}>{total}문제 최고 기록 {bestScores[String(total)] ?? score}점</Text></View>
        <Button label="같은 문제 수로 다시 하기" onPress={() => startGame(total)} />
        <Button label="문제 수 다시 고르기" onPress={() => { setPhase('setup'); setNotice(null); }} variant="secondary" />
      </Screen>
    );
  }

  return (
    <Screen eyebrow="MINI GAME · EMOJI MOVIE" title="영화 제목을 맞혀보세요">
      <View style={styles.progressHeader}><Text style={styles.progressText}>{index + 1} / {total}</Text><Text style={styles.scoreText}>정답 {score}</Text></View>
      <View accessibilityLabel={`진행률 ${progress}%`} style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
      {notice ? <StateNotice message={notice} title="답을 입력해 주세요" tone="warning" /> : null}
      {current ? <View style={styles.quizCard}>
        <Text style={styles.questionLabel}>이 영화는 무엇일까요?</Text>
        <Text accessibilityLabel={`영화 이모지 힌트 ${current.emoji}`} style={styles.quizEmoji}>{current.emoji}</Text>
        <TextInput accessibilityLabel="영화 제목 정답" autoCapitalize="none" autoCorrect={false} editable={!answerResult} onChangeText={setAnswer} onSubmitEditing={submitAnswer} placeholder="영화 제목 입력" placeholderTextColor={colors.textMuted} ref={inputRef} returnKeyType="done" style={[styles.answerInput, answerResult && styles.answerInputDisabled]} value={answer} />
        {answerResult ? <View accessibilityLiveRegion="polite" style={[styles.answerNotice, answerResult.correct ? styles.answerCorrect : styles.answerWrong]}><Text style={styles.answerIcon}>{answerResult.correct ? '정답! 🎉' : '아쉬워요 🍿'}</Text><Text style={styles.answerTitle}>정답은 {answerResult.title}</Text></View> : null}
        {answerResult ? <Button label={index === total - 1 ? '결과 보기' : '다음 문제'} onPress={() => void moveNext()} /> : <Button label="정답 확인" onPress={submitAnswer} />}
      </View> : null}
      <Button label="문제 수 선택으로 돌아가기" onPress={() => { setPhase('setup'); setNotice(null); }} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emojiHero: { backgroundColor: colors.text, borderRadius: radii.lg, gap: spacing.md, padding: spacing.xl },
  heroEmoji: { fontSize: 34, letterSpacing: 4, textAlign: 'center' },
  heroText: { ...typography.body, color: colors.surface, textAlign: 'center' },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.lg, padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text },
  countGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  countChip: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexBasis: '22%', flexGrow: 1, justifyContent: 'center', minHeight: 70, padding: spacing.sm },
  countChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  countText: { ...typography.heading, color: colors.text },
  countUnit: { ...typography.caption, color: colors.textMuted },
  countTextSelected: { color: colors.surface },
  customRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  customInput: { ...typography.heading, backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, flex: 1, minHeight: 52, paddingHorizontal: spacing.lg },
  customHint: { ...typography.caption, color: colors.textMuted },
  bestText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { ...typography.label, color: colors.text },
  scoreText: { ...typography.label, color: colors.primary },
  progressTrack: { backgroundColor: colors.border, borderRadius: radii.pill, height: 8, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.primary, height: '100%' },
  quizCard: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.lg, padding: spacing.xl },
  questionLabel: { ...typography.label, color: colors.textMuted, textAlign: 'center' },
  quizEmoji: { fontSize: 44, letterSpacing: 5, lineHeight: 64, minHeight: 72, textAlign: 'center' },
  answerInput: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 56, paddingHorizontal: spacing.lg },
  answerInputDisabled: { opacity: 0.7 },
  answerNotice: { borderRadius: radii.md, gap: spacing.xs, padding: spacing.lg },
  answerCorrect: { backgroundColor: colors.successSoft },
  answerWrong: { backgroundColor: colors.warningSoft },
  answerIcon: { ...typography.heading, color: colors.text, textAlign: 'center' },
  answerTitle: { ...typography.body, color: colors.text, textAlign: 'center' },
  resultCard: { alignItems: 'center', backgroundColor: colors.text, borderRadius: radii.lg, gap: spacing.sm, padding: spacing.xxxl },
  resultEmoji: { fontSize: 52 },
  resultScore: { ...typography.display, color: colors.surface },
  resultAccuracy: { ...typography.heading, color: colors.primarySoft },
});
