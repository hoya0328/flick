import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { buildMonthCalendar, buildTasteReport, reportShareText, shiftMonth } from '@/features/reports/taste-report';
import { publicReviewPath, todayDate } from '@/features/reviews/review-logic';
import { listReviews, type ReviewRecord } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';
import { recordClientIssue } from '@/lib/observability';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export default function ArchiveScreen() {
  const { mode } = useSession();
  const storageMode = mode === 'supabase' ? 'supabase' : 'demo';
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [month, setMonth] = useState(todayDate().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'light' | 'core'>('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setRecords(await listReviews(storageMode));
      setStatus('ready');
    } catch (error) {
      void recordClientIssue('archive.load', error);
      setStatus('error');
    }
  }, [storageMode]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const report = useMemo(() => buildTasteReport(records, todayDate()), [records]);
  const calendar = useMemo(() => buildMonthCalendar(month, records), [month, records]);
  const drafts = records.filter((record) => record.status === 'draft');
  const visibleRecords = records.filter((record) => record.status === 'completed'
    && (selectedDate ? record.watchedAt === selectedDate : record.watchedAt.startsWith(month))
    && (filter === 'all' || record.mode === filter));
  const monthTitle = `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;
  const maxRatingCount = Math.max(1, ...Object.values(report.ratingCounts));

  async function shareReport() {
    try {
      await Share.share({ message: `${reportShareText(report)}\n${Linking.createURL('/archive')}`, title: '나의 FLICK 취향 리포트' });
      setMessage('공유 화면을 열었어요. 전송 여부는 사용자가 결정합니다.');
    } catch { setMessage('이 기기에서는 공유 화면을 열지 못했어요.'); }
  }

  async function shareRecord(record: ReviewRecord) {
    const url = Linking.createURL(publicReviewPath(record.id));
    try {
      await Share.share({ message: `${record.movie.title} 감상 기록\n${url}`, title: `${record.movie.title} · FLICK` });
      setMessage('공개 기록 링크의 공유 화면을 열었어요.');
    } catch { setMessage('이 기기에서는 공유 화면을 열지 못했어요.'); }
  }

  if (status === 'loading') return <Screen eyebrow="나의 FLICK" title="아카이브"><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.muted}>기록과 취향을 정리하고 있어요.</Text></Screen>;
  if (status === 'error') return <Screen eyebrow="나의 FLICK" title="아카이브"><StateNotice message="기록은 변경되지 않았어요. 연결을 확인하고 다시 시도해 주세요." title="아카이브를 불러오지 못했어요" tone="danger" /><Button label="다시 시도" onPress={() => void load()} variant="secondary" /></Screen>;

  return (
    <Screen eyebrow="나의 FLICK" title="영화 아카이브">
      {message ? <StateNotice message={message} title="공유" tone="success" /> : null}
      {drafts.length ? <StateNotice message={`작성 중인 기록 ${drafts.length}개가 안전하게 보관되어 있어요. 기록 탭에서 이어 쓸 수 있습니다.`} title="이어 쓸 기록이 있어요" tone="warning" /> : null}

      <View style={styles.kpiRow}>
        <View style={styles.kpi}><Text style={styles.kpiValue}>{report.total}</Text><Text style={styles.kpiLabel}>완료 기록</Text></View>
        <View style={styles.kpi}><Text style={styles.kpiValue}>{report.thisMonth}</Text><Text style={styles.kpiLabel}>이번 달</Text></View>
        <View style={styles.kpi}><Text style={styles.kpiValue}>{report.averageRating ?? '-'}</Text><Text style={styles.kpiLabel}>평균 별점</Text></View>
      </View>

      {!report.total ? <StateNotice message="첫 기록을 완료하면 캘린더와 감정·별점 리포트가 자동으로 만들어져요." title="아직 완성된 기록이 없어요" /> : null}
      {report.total === 1 ? <StateNotice message="한 편만 더 기록하면 첫 취향 비교가 열립니다." title="두 번째 기록까지 1편" tone="warning" /> : null}

      <View style={styles.section}>
        <View style={styles.headingRow}>
          <Button label="이전 달" onPress={() => { setMonth(shiftMonth(month, -1)); setSelectedDate(null); }} style={styles.monthButton} variant="ghost" />
          <Text accessibilityRole="header" style={styles.sectionTitle}>{monthTitle}</Text>
          <Button label="다음 달" onPress={() => { setMonth(shiftMonth(month, 1)); setSelectedDate(null); }} style={styles.monthButton} variant="ghost" />
        </View>
        <View style={styles.calendarRow}>{weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
        <View style={styles.calendarRow}>
          {calendar.map((day) => {
            const selected = selectedDate === day.date;
            return (
              <Pressable accessibilityLabel={`${day.date}, 완료 기록 ${day.completedCount}개`} accessibilityRole="button" accessibilityState={{ selected, disabled: !day.inMonth }} disabled={!day.inMonth} key={day.date} onPress={() => setSelectedDate(selected ? null : day.date)} style={[styles.dayCell, selected && styles.daySelected]}>
                <Text style={[styles.dayText, !day.inMonth && styles.dayOutside, selected && styles.dayTextSelected]}>{day.day}</Text>
                {day.completedCount ? <View style={[styles.dot, selected && styles.dotSelected]}><Text style={[styles.dotText, selected && styles.dotTextSelected]}>{day.completedCount}</Text></View> : null}
              </Pressable>
            );
          })}
        </View>
        {selectedDate ? <Button label="선택한 날짜 해제" onPress={() => setSelectedDate(null)} variant="ghost" /> : null}
      </View>

      <View style={styles.section}>
        <View style={styles.headingRow}><Text accessibilityRole="header" style={styles.sectionTitle}>나의 취향 리포트</Text><Button disabled={!report.total} label="리포트 공유" onPress={() => void shareReport()} style={styles.shareButton} variant="secondary" /></View>
        <Text style={styles.label}>감정 TOP 3</Text>
        <View style={styles.chips}>{report.topEmotions.length ? report.topEmotions.map((item) => <View key={item.label} style={styles.chip}><Text style={styles.chipText}>{item.label} · {item.count}</Text></View>) : <Text style={styles.muted}>감정 태그가 쌓이면 표시됩니다.</Text>}</View>
        <Text style={styles.label}>기록 방식</Text>
        <Text style={styles.body}>Light {report.modeCounts.light}편 · Core {report.modeCounts.core}편</Text>
        <Text style={styles.label}>별점 분포</Text>
        {[5, 4, 3, 2, 1].map((rating) => { const count = report.ratingCounts[rating as 1 | 2 | 3 | 4 | 5]; return <View accessibilityLabel={`${rating}점 ${count}편`} key={rating} style={styles.barRow}><Text style={styles.barLabel}>★ {rating}</Text><View style={styles.barTrack}><View style={[styles.barFill, { width: `${(count / maxRatingCount) * 100}%` }]} /></View><Text style={styles.barCount}>{count}</Text></View>; })}
      </View>

      <View style={styles.section}>
        <View style={styles.headingRow}><Text accessibilityRole="header" style={styles.sectionTitle}>{selectedDate ? `${selectedDate} 기록` : `${monthTitle} 기록`}</Text><View style={styles.filters}>{(['all', 'light', 'core'] as const).map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === item }} key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterSelected]}><Text style={[styles.filterText, filter === item && styles.filterTextSelected]}>{item === 'all' ? '전체' : item === 'light' ? 'Light' : 'Core'}</Text></Pressable>)}</View></View>
        {!visibleRecords.length ? <Text style={styles.muted}>이 기간에 조건과 맞는 완료 기록이 없어요.</Text> : visibleRecords.map((record) => (
          <View key={record.id} style={styles.recordCard}>
            <View style={styles.flex}><Text style={styles.cardTitle}>{record.movie.title}</Text><Text style={styles.muted}>{record.watchedAt} · {record.mode === 'light' ? 'Light' : 'Core'} · ★ {record.rating}</Text></View>
            <View style={styles.cardActions}><Button label="기록 열기" onPress={() => router.push({ pathname: '/(tabs)/record', params: { movieId: record.movieId, reviewId: record.id, title: record.movie.title } })} style={styles.action} variant="secondary" />{mode === 'supabase' && record.visibility === 'public' ? <Button label="공개 링크 공유" onPress={() => void shareRecord(record)} style={styles.action} variant="ghost" /> : null}</View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { ...typography.caption, color: colors.textMuted }, body: { ...typography.body, color: colors.text }, label: { ...typography.label, color: colors.textMuted },
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg }, sectionTitle: { ...typography.heading, color: colors.text },
  headingRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' }, flex: { flex: 1 },
  kpiRow: { flexDirection: 'row', gap: spacing.sm }, kpi: { alignItems: 'center', backgroundColor: colors.text, borderRadius: radii.md, flex: 1, gap: spacing.xs, padding: spacing.lg }, kpiValue: { ...typography.title, color: colors.surface }, kpiLabel: { ...typography.caption, color: colors.border, textAlign: 'center' },
  monthButton: { minHeight: 44, minWidth: 74, paddingHorizontal: spacing.sm }, shareButton: { minHeight: 44 },
  calendarRow: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { ...typography.caption, color: colors.textMuted, textAlign: 'center', width: '14.2857%' },
  dayCell: { alignItems: 'center', borderRadius: radii.sm, gap: 2, justifyContent: 'center', minHeight: 48, paddingVertical: spacing.xs, width: '14.2857%' }, daySelected: { backgroundColor: colors.primary }, dayText: { ...typography.label, color: colors.text }, dayOutside: { color: colors.border }, dayTextSelected: { color: colors.surface },
  dot: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.pill, minWidth: 18, paddingHorizontal: 5 }, dotSelected: { backgroundColor: colors.surface }, dotText: { color: colors.primary, fontSize: 10, fontWeight: '800' }, dotTextSelected: { color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, chip: { backgroundColor: colors.primarySoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipText: { ...typography.label, color: colors.primary },
  barRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, barLabel: { ...typography.caption, color: colors.textMuted, width: 30 }, barTrack: { backgroundColor: colors.border, borderRadius: radii.pill, flex: 1, height: 10, overflow: 'hidden' }, barFill: { backgroundColor: colors.primary, borderRadius: radii.pill, height: 10 }, barCount: { ...typography.caption, color: colors.text, textAlign: 'right', width: 18 },
  filters: { flexDirection: 'row', gap: spacing.xs }, filter: { borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, minHeight: 36, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, filterText: { ...typography.caption, color: colors.textMuted }, filterTextSelected: { color: colors.surface, fontWeight: '700' },
  recordCard: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: spacing.md, padding: spacing.md }, cardTitle: { ...typography.heading, color: colors.text }, cardActions: { flexDirection: 'row', gap: spacing.sm }, action: { flex: 1 },
});
