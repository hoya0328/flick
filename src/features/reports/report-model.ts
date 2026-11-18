import type { ReviewRecord } from '../reviews/reviews';
import { selectedTasteWords, type TwelveTaste } from './taste-engine';
export function latestModeReviews(records: ReviewRecord[], mode?: 'light' | 'core') {
  const seen = new Set<string>();
  return [...records].filter(record => record.status === 'completed' && (!mode || record.mode === mode)).sort((a, b) => b.watchedAt.localeCompare(a.watchedAt) || b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id)).filter(record => { if (seen.has(record.movieId)) return false; seen.add(record.movieId); return true; });
}
const ordered = (counts: Map<string, number>) => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko-KR')).map(([label, count]) => ({ label, count }));
function selectedByQuestion(records: ReviewRecord[], key: string) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const words = new Set(record.questions.filter(question => question.key === key && question.sourceRule.startsWith('figma-light-v1') && record.lightFlow?.responses[question.key] !== 'skipped').flatMap(question => question.options.filter(option => (record.questionTags[question.key] ?? []).includes(option.id)).map(option => option.label)));
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return ordered(counts).slice(0, 3);
}
export const pointDescriptions: Record<string, string> = { '미장센': '색감과 구도를 감상 포인트로 선택했어요.', '연출': '영화의 표현 방식을 감상 포인트로 선택했어요.', '사운드트랙': '영화의 음악을 감상 포인트로 선택했어요.', '연기': '배우의 표현을 감상 포인트로 선택했어요.', '각본': '이야기의 구성을 감상 포인트로 선택했어요.', '촬영 기법': '카메라의 표현을 감상 포인트로 선택했어요.', '시각 효과': '시각적인 효과를 감상 포인트로 선택했어요.' };
const coreWords = ['장면', '색감', '구도', '여운', '인물', '관계', '감정', '음악', '상징', '의미', '결말', '서사', '연출', '일상'];
export function recordingInsights(records: ReviewRecord[]) {
  const light = latestModeReviews(records, 'light'), core = latestModeReviews(records, 'core');
  const likes = selectedByQuestion(light, 'light_q2'), emotions = selectedByQuestion(light, 'light_q4'), dislikes = selectedByQuestion(light, 'light_q3');
  const words = new Map<string, number>();
  for (const record of core) {
    // Neither generated feedback, magazine, nor Core AI keywords are user-origin evidence.
    const text = record.questions.map(question => record.answers[question.key] ?? '').join(' ').normalize('NFKC');
    for (const word of coreWords) if (text.includes(word)) words.set(word, (words.get(word) ?? 0) + 1);
  }
  const coreTop = ordered(words).slice(0, 3), join = (items: { label: string }[]) => items.map(item => item.label).join(' · ');
  return {
    lightFilms: light.length, coreFilms: core.length,
    lightSummary: light.length ? `가볍게 기록한 영화 ${light.length}편` : '아직 가볍게 기록한 영화가 없어요.',
    lightLines: [`좋았던 느낌: ${join(likes) || '—'}`, `자주 남긴 감정: ${join(emotions) || '—'}`, `아쉬웠던 점: ${join(dislikes) || '—'}`],
    coreSummary: core.length ? `집중 기록한 영화 ${core.length}편` : '아직 집중 기록한 영화가 없어요.',
    coreLines: coreTop.map(item => `‘${item.label}’ · ${item.count}편의 답변에서 언급`),
  };
}
export function ratingBars(report: Pick<TwelveTaste, 'ratingCounts'>) {
  const bars = Array.from({ length: 5 }, (_, index) => ({ label: (index + 1).toFixed(1), count: 0 }));
  for (const [rating, count] of Object.entries(report.ratingCounts)) { const value = Number(rating); if (Number.isFinite(value) && value >= .5 && value <= 5 && Number.isInteger(value * 2) && Number.isFinite(count) && count > 0) bars[Math.ceil(value) - 1]!.count += count; }
  const peak = Math.max(1, ...bars.map(bar => bar.count));
  return bars.map(bar => ({ ...bar, percent: bar.count / peak * 100 }));
}
export function reportShareText(name: string, report: TwelveTaste) {
  return `${name}님의 FLICK 취향 리포트\n${report.headline}\n완료 영화 ${report.totalMovies}편 · 유효한 근거 ${report.validFilms}편\n평균 별점 ${report.meanRating ?? '—'}\n키워드: ${report.topKeywords.map(item => item.label).join(' · ') || '아직 없어요'}\n나의 기록에서 계산한 참고 결과이며 성격 검사가 아니에요.`;
}
export function rewatchChoices(records: ReviewRecord[], selectedKeywords: string[], today: string) {
  return latestModeReviews(records).filter(record => (record.rating ?? 0) >= 4).map(record => {
    const overlap = record.keywordIds.filter(id => selectedKeywords.includes(id)).length;
    const days = Math.max(0, Math.floor((Date.parse(today) - Date.parse(record.watchedAt)) / 86400000)) || 0;
    return { record, score: record.rating! * 10 + overlap * 4 + Math.min(days, 365) / 90, days, keywords: selectedTasteWords(record).slice(0, 3), reason: overlap ? `현재 선택한 취향과 ${overlap}개 키워드가 겹쳐요. 예전 감상과 지금의 느낌을 비교해 보세요.` : `${days}일 전 ★${record.rating}로 남긴 영화예요. 지금의 느낌과 비교해 보세요.` };
  }).sort((a, b) => b.score - a.score || a.record.movie.title.localeCompare(b.record.movie.title, 'ko-KR')).slice(0, 3);
}
