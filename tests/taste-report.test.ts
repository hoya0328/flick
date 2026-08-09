import { describe, expect, it } from 'vitest';

import { buildMonthCalendar, buildTasteReport, reportShareText, shiftMonth, type ReportReview } from '../src/features/reports/taste-report';

function record(update: Partial<ReportReview> = {}): ReportReview {
  return {
    id: 'review-1', mode: 'light', watchedAt: '2026-08-07', rating: 4, status: 'completed', keywordIds: ['warm'],
    questions: [{ key: 'q1', text: '질문', sourceRule: 'test', options: [{ id: 't1', label: '몰입되는' }] }],
    questionTags: { q1: ['t1'] }, ...update,
  };
}

describe('stage 4 archive report', () => {
  it('summarizes completed records without counting drafts', () => {
    const report = buildTasteReport([
      record(),
      record({ id: 'review-2', mode: 'core', watchedAt: '2026-08-08', rating: 5, keywordIds: ['warm', 'thoughtful'], questions: [], questionTags: {} }),
      record({ id: 'draft', status: 'draft', rating: 1 }),
    ], '2026-08-10');
    expect(report).toMatchObject({ total: 2, thisMonth: 2, averageRating: 4.5, modeCounts: { light: 1, core: 1 }, secondRecordReached: true });
    expect(report.topEmotions[0]).toEqual({ label: '따뜻한', count: 2 });
    expect(report.ratingCounts[1]).toBe(0);
  });

  it('builds a six-week calendar and counts same-day records', () => {
    const calendar = buildMonthCalendar('2026-08', [record(), record({ id: 'review-2' })]);
    expect(calendar).toHaveLength(42);
    expect(calendar.find((day) => day.date === '2026-08-07')?.completedCount).toBe(2);
    expect(calendar[0]?.date).toBe('2026-07-26');
  });

  it('moves between years and creates a compact share summary', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(reportShareText(buildTasteReport([record()], '2026-08-10'))).toContain('완료 기록 1편');
  });
});
