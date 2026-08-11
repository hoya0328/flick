import { getKeywordLabels, tasteKeywords } from '../onboarding/keywords';
import type { ReviewRecord } from '../reviews/reviews';

export type TasteSignal = 'emotion' | 'atmosphere' | 'scene' | 'aftertaste';
export type TasteType = { name: string; summary: string; evidence: string[] };
export type RewatchRecommendation = { reviewId: string; movieId: string; title: string; watchedAt: string; rating: number; reason: string };
export type TastePersonalization = {
  completedCount: number;
  minimumRequired: number;
  tasteType: TasteType | null;
  signalCounts: Record<TasteSignal, number>;
  signalInsights: { label: string; value: number; description: string }[];
  topPatterns: { label: string; count: number }[];
  rewatch: RewatchRecommendation[];
  contrastKeyword: { id: string; label: string; reason: string } | null;
};

const minimumRecords = 3;
const contrastMap: Record<string, string> = {
  immersive: 'comforting', romantic: 'unusual', warm: 'tense', moving: 'witty', witty: 'thoughtful', tense: 'warm',
  mysterious: 'refreshing', comforting: 'tense', thoughtful: 'refreshing', refreshing: 'nostalgic', unusual: 'romantic', nostalgic: 'witty',
};

function labelsFor(record: ReviewRecord) {
  const tagLabels = record.questions.flatMap((question) => {
    const selected = new Set(record.questionTags[question.key] ?? []);
    return question.options.filter((option) => selected.has(option.id)).map((option) => option.label);
  });
  return [...getKeywordLabels(record.keywordIds), ...tagLabels];
}

function signalOf(label: string): TasteSignal {
  if (/여운|생각|의미|다시|오래|추천|질문/.test(label)) return 'aftertaste';
  if (/장면|연기|인물|캐릭터|관계|대사|음악|액션|연출/.test(label)) return 'scene';
  if (/미장센|색감|분위기|몰입|긴장|재치|산뜻|독특|리듬/.test(label)) return 'atmosphere';
  return 'emotion';
}

function typeFor(counts: Record<TasteSignal, number>, coreCount: number): TasteType {
  const scored = [
    { key: 'aftertaste' as const, score: counts.aftertaste + coreCount, name: '사유형 기록가', summary: '영화가 남긴 의미와 여운을 오래 이어 보는 편이에요.' },
    { key: 'scene' as const, score: counts.scene, name: '장면 탐험가', summary: '인물·장면·연출의 구체적인 순간을 중심으로 감상해요.' },
    { key: 'atmosphere' as const, score: counts.atmosphere, name: '분위기 수집가', summary: '리듬·미장센·긴장감처럼 영화의 공기를 민감하게 포착해요.' },
    { key: 'emotion' as const, score: counts.emotion, name: '감정 공감가', summary: '영화를 본 순간의 감정과 마음의 변화를 선명하게 남겨요.' },
  ].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko-KR'));
  const first = scored[0]!;
  return { name: first.name, summary: first.summary, evidence: [`${first.key} 신호 ${counts[first.key]}회`, `Core 기록 ${coreCount}편`] };
}

function contrastFor(selectedKeywords: string[]) {
  const preferred = selectedKeywords.map((id) => contrastMap[id]).find((id) => typeof id === 'string' && !selectedKeywords.includes(id));
  const keyword = tasteKeywords.find((item) => item.id === preferred) ?? tasteKeywords.find((item) => !selectedKeywords.includes(item.id));
  if (!keyword) return null;
  const current = getKeywordLabels(selectedKeywords).slice(0, 2).join(' · ') || '현재 취향';
  return {
    id: keyword.id,
    label: keyword.label,
    reason: `${current} 중심의 현재 취향에서 한 걸음 벗어나 감상 범위를 넓힐 수 있는 방향이에요.`,
  };
}

export function buildTastePersonalization(records: ReviewRecord[], selectedKeywords: string[], today = new Date().toISOString().slice(0, 10)): TastePersonalization {
  const completed = records.filter((record) => record.status === 'completed');
  const labelCounts = new Map<string, number>();
  const signalCounts: Record<TasteSignal, number> = { emotion: 0, atmosphere: 0, scene: 0, aftertaste: 0 };
  completed.flatMap(labelsFor).forEach((label) => {
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    signalCounts[signalOf(label)] += 1;
  });
  const signalInsights = [
    { label: '감정·공감', value: signalCounts.emotion, description: '마음의 변화와 정서 태그' },
    { label: '분위기·리듬', value: signalCounts.atmosphere, description: '몰입·미장센·긴장·리듬 신호' },
    { label: '장면·인물', value: signalCounts.scene, description: '연기·관계·대사·연출 신호' },
    { label: '여운·사유', value: signalCounts.aftertaste, description: '다시 생각난 의미와 잔상' },
  ];
  const rewatch = completed.filter((record) => (record.rating ?? 0) >= 4).map((record) => {
    const overlap = record.keywordIds.filter((id) => selectedKeywords.includes(id));
    const ageDays = Math.max(0, Math.floor((Date.parse(today) - Date.parse(record.watchedAt)) / 86400000));
    return {
      score: (record.rating ?? 0) * 10 + overlap.length * 4 + Math.min(ageDays, 365) / 90,
      value: {
        reviewId: record.id, movieId: record.movieId, title: record.movie.title, watchedAt: record.watchedAt, rating: record.rating ?? 0,
        reason: overlap.length ? `★ ${record.rating} · 지금 취향 ${getKeywordLabels(overlap).join(' · ')}과 다시 만나요.` : `★ ${record.rating} · ${ageDays}일 전의 감상을 지금 시선으로 비교해 보세요.`,
      },
    };
  }).sort((a, b) => b.score - a.score || a.value.title.localeCompare(b.value.title, 'ko-KR')).slice(0, 3).map((item) => item.value);

  return {
    completedCount: completed.length,
    minimumRequired: minimumRecords,
    tasteType: completed.length >= minimumRecords ? typeFor(signalCounts, completed.filter((record) => record.mode === 'core').length) : null,
    signalCounts,
    signalInsights,
    topPatterns: [...labelCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko-KR')).slice(0, 5).map(([label, count]) => ({ label, count })),
    rewatch,
    contrastKeyword: contrastFor(selectedKeywords),
  };
}
