import { normalizeRepresentativeKeywords } from './representative-keywords';
import type { ReviewRecord } from './reviews';
import { safeSharedReviewPath } from './review-logic';

export function validReaderId(id: string | undefined, mode: 'none' | 'demo' | 'supabase') {
  return Boolean(id && (safeSharedReviewPath(`/review/${id}`) || (mode === 'demo' && /^demo-[A-Za-z0-9_-]{1,80}$/.test(id))));
}

export function reviewReadDestination(record: Pick<ReviewRecord, 'id' | 'status'>) {
  return record.status === 'completed'
    ? { pathname: '/review' as const, params: { id: record.id } }
    : { pathname: '/(tabs)/record' as const, params: { reviewId: record.id } };
}

export function reviewEditDestination(record: Pick<ReviewRecord, 'id' | 'mode' | 'lightFlow' | 'coreFlow'>) {
  const pathname = record.coreFlow?.version === 1 ? '/core-record' : record.lightFlow?.version === 1 ? '/light-record' : '/(tabs)/record';
  return { pathname, params: { reviewId: record.id } } as const;
}

export function lightReaderRows(record: ReviewRecord) {
  return record.questions.flatMap((question, index) => {
    if (record.lightFlow?.responses[question.key] === 'skipped') return [];
    const selected = record.questionTags[question.key] ?? [];
    const labels = selected.flatMap(id => {
      const option = question.options.find(item => item.id === id);
      return option ? [option.label] : [];
    });
    const answer = record.answers[question.key]?.trim() ?? '';
    if (!labels.length && !answer) return [];
    return [{ key: question.key, number: index + 1, question: question.text.replace(/^「.*?」\s*/, ''), labels, answer }];
  });
}

export function readerKeywords(record: ReviewRecord) {
  return normalizeRepresentativeKeywords(record.lightFlow?.representativeKeywords);
}

export function canReadCompletedReview(record: ReviewRecord | null): record is ReviewRecord & { status: 'completed' } {
  return record?.status === 'completed';
}
