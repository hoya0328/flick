import { getKeywordLabels } from '../onboarding/keywords';
import type { ReviewRecord } from '../reviews/reviews';

export type ReportReview = Pick<ReviewRecord, 'id' | 'mode' | 'watchedAt' | 'rating' | 'status' | 'keywordIds' | 'questions' | 'questionTags'>;
export type CalendarCell = { date: string; day: number; inMonth: boolean; completedCount: number };
export type TasteReport = {
  total: number;
  thisMonth: number;
  averageRating: number | null;
  modeCounts: { light: number; core: number };
  ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>;
  topEmotions: { label: string; count: number }[];
  secondRecordReached: boolean;
};

function selectedTagLabels(review: ReportReview): string[] {
  const lightLabels = review.questions.flatMap((question) => {
    const selected = new Set(review.questionTags[question.key] ?? []);
    return question.options.filter((option) => selected.has(option.id)).map((option) => option.label);
  });
  return [...lightLabels, ...getKeywordLabels(review.keywordIds)];
}

export function buildTasteReport(records: ReportReview[], today = new Date().toISOString().slice(0, 10)): TasteReport {
  const completed = records.filter((record) => record.status === 'completed');
  const ratings = completed.flatMap((record) => record.rating === null ? [] : [record.rating]);
  const emotionCounts = new Map<string, number>();
  completed.flatMap(selectedTagLabels).forEach((label) => emotionCounts.set(label, (emotionCounts.get(label) ?? 0) + 1));
  const ratingCounts: TasteReport['ratingCounts'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((rating) => { if (Number.isInteger(rating) && rating >= 1 && rating <= 5) ratingCounts[rating as 1 | 2 | 3 | 4 | 5] += 1; });

  return {
    total: completed.length,
    thisMonth: completed.filter((record) => record.watchedAt.startsWith(today.slice(0, 7))).length,
    averageRating: ratings.length ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10 : null,
    modeCounts: {
      light: completed.filter((record) => record.mode === 'light').length,
      core: completed.filter((record) => record.mode === 'core').length,
    },
    ratingCounts,
    topEmotions: [...emotionCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko-KR')).slice(0, 3).map(([label, count]) => ({ label, count })),
    secondRecordReached: completed.length >= 2,
  };
}

export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year!, monthNumber! - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthCalendar(month: string, records: ReportReview[]): CalendarCell[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year!, monthNumber! - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const counts = records.filter((record) => record.status === 'completed').reduce<Map<string, number>>((result, record) => {
    result.set(record.watchedAt, (result.get(record.watchedAt) ?? 0) + 1);
    return result;
  }, new Map());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const value = date.toISOString().slice(0, 10);
    return { date: value, day: date.getUTCDate(), inMonth: value.startsWith(month), completedCount: counts.get(value) ?? 0 };
  });
}

export function reportShareText(report: TasteReport): string {
  const emotions = report.topEmotions.length ? report.topEmotions.map((item) => item.label).join(' · ') : '아직 발견 중';
  return `나의 FLICK 취향 리포트\n완료 기록 ${report.total}편 · 평균 별점 ${report.averageRating ?? '-'}\n감정 TOP 3: ${emotions}`;
}
