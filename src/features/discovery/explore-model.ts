import type { Movie } from './discovery-logic';
import { getKeywordLabels, tasteKeywords } from '../onboarding/keywords';
import type { ReviewRecord } from '../reviews/reviews';

export const EXPLORE_RATIO_KEY = 'flick.explore.discovery-ratio.v1';
export const exploreTags = ['몽환적인', '경이', '우주', '사랑', '위로', 'SF', '미장센', '빛바랜', 'OST', '판타지'] as const;
export const situations = [
  { id: 'quiet', title: '혼자 조용히', description: '말수는 적고 여운은 긴 영화', tags: ['thoughtful', 'nostalgic'] },
  { id: 'walk', title: '엔딩 후 산책', description: '보고 나서 여운이 오래 남는 영화', tags: ['nostalgic', 'moving'] },
  { id: 'friends', title: '친구랑 실패 없이', description: '함께 즐기기 좋은 유쾌한 영화', tags: ['witty', 'refreshing'] },
] as const;
export const niches = [
  { id: 'rain', title: '비 온 뒤 산책하고 싶은 영화', tags: ['nostalgic', 'thoughtful'], labels: ['잔상', '여운', '감정'] },
  { id: 'silence', title: '대사는 적은데 마음은 시끄러운 영화', tags: ['thoughtful', 'moving'], labels: ['침묵', '감정'] },
  { id: 'unexpected', title: '이상하게 추천하기 어려운 좋은 영화', tags: ['unusual', 'mysterious'], labels: ['취향밖', '명작'] },
] as const;
const aliases: Record<string, string[]> = {
  몽환적인: ['mysterious', 'unusual'], 몽환: ['mysterious'], 경이: ['immersive'], 우주: ['immersive'],
  사랑: ['romantic'], 위로: ['comforting', 'warm'], SF: ['immersive'], 미장센: ['mysterious'],
  빛바랜: ['nostalgic'], OST: ['moving'], 판타지: ['unusual'], 여운: ['nostalgic'], 잔상: ['nostalgic'],
  기억: ['nostalgic', 'thoughtful'], 감정: ['moving'], 낭만: ['romantic'], 웃음: ['witty'], 긴장: ['tense'],
};
export function normalizeRatio(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') return 70;
  if (typeof value === 'string' && !value.trim()) return 70;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed / 10) * 10)) : 70;
}
export function keywordIdsFor(value: string): string[] {
  const text = value.trim().normalize('NFKC');
  const exact = tasteKeywords.find(tag => tag.id === text || tag.label === text);
  if (exact) return [exact.id];
  return [...new Set(Object.entries(aliases).filter(([label]) => text.toLocaleLowerCase('ko-KR').includes(label.toLocaleLowerCase('ko-KR'))).flatMap(([, ids]) => ids))];
}
export function preferenceKeywords(records: ReviewRecord[], selected: string[]): { ids: string[]; labels: string[]; fromReviews: boolean } {
  const latest = new Map<string, ReviewRecord>();
  records.filter(record => record.status === 'completed').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).forEach(record => {
    if (!latest.has(record.movieId)) latest.set(record.movieId, record);
  });
  const counts = new Map<string, number>();
  [...latest.values()].slice(0, 30).forEach(record => {
    const answerLabels = record.questions.flatMap(question => question.options.filter(option => record.questionTags[question.key]?.includes(option.id)).map(option => option.label));
    const representative = Array.isArray(record.lightFlow?.representativeKeywords) ? record.lightFlow.representativeKeywords.filter(label => typeof label === 'string' && label.trim()) : [];
    const labels = representative.length ? representative : [...getKeywordLabels(record.keywordIds), ...answerLabels];
    [...new Set(labels)].forEach(label => counts.set(label, (counts.get(label) ?? 0) + 1));
  });
  const labels = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko-KR')).slice(0, 5).map(([label]) => label);
  const ids = [...new Set(labels.flatMap(keywordIdsFor))];
  return { ids: ids.length ? ids : selected, labels: labels.length ? labels : getKeywordLabels(selected), fromReviews: labels.length > 0 };
}
export function movieTags(movie: Movie): string[] {
  return [...new Set([...getKeywordLabels(movie.recommendationKeywords), ...movie.genres])].slice(0, 5);
}
function overlap(movie: Movie, ids: string[]) { return movie.recommendationKeywords.filter(id => ids.includes(id)).length; }
export function ratingFive(movie: Pick<Movie, 'voteAverage'>): string {
  return movie.voteAverage !== null && Number.isFinite(movie.voteAverage) && movie.voteAverage >= 0 && movie.voteAverage <= 10 ? (movie.voteAverage / 2).toFixed(1) : '—';
}
export type ExploreFilters = { genre: string; rating: 'all' | '4'; sort: 'recommend' | 'rating' | 'recent' };
export const defaultExploreFilters: ExploreFilters = { genre: '', rating: 'all', sort: 'recommend' };
export function relatedMovies(movies: Movie[], source: Movie, limit = 3): Movie[] {
  return movies.filter(movie => movie.id !== source.id).sort((a, b) => {
    const score = (movie: Movie) => overlap(movie, source.recommendationKeywords) * 3 + movie.genres.filter(genre => source.genres.includes(genre)).length + (movie.voteAverage ?? 0) / 10;
    return score(b) - score(a) || a.id.localeCompare(b.id);
  }).slice(0, limit);
}
export function recommendMix(movies: Movie[], ids: string[], ratio: number, limit = 12): Movie[] {
  const unique = [...new Map(movies.map(movie => [movie.id, movie])).values()];
  const familiar = unique.filter(movie => overlap(movie, ids) > 0).sort((a, b) => overlap(b, ids) - overlap(a, ids) || (b.voteAverage ?? -1) - (a.voteAverage ?? -1) || a.id.localeCompare(b.id));
  const unfamiliar = unique.filter(movie => overlap(movie, ids) === 0).sort((a, b) => (b.voteAverage ?? -1) - (a.voteAverage ?? -1) || a.id.localeCompare(b.id));
  const result: Movie[] = [], seen = new Set<string>();
  const count = Math.min(Math.max(0, Math.floor(limit)), unique.length), expansion = normalizeRatio(ratio);
  for (let index = 0; index < count; index++) {
    // Evenly interleave an unfamiliar quota; gracefully fill from the other queue.
    const useNew = Math.round((index + 1) * expansion / 100) > Math.round(index * expansion / 100);
    const movie = (useNew ? unfamiliar.shift() ?? familiar.shift() : familiar.shift() ?? unfamiliar.shift());
    if (movie && !seen.has(movie.id)) { seen.add(movie.id); result.push(movie); }
  }
  return result;
}
export function filterMovies(movies: Movie[], query: string, tag: string, filters: ExploreFilters): Movie[] {
  const text = query.trim().toLocaleLowerCase('ko-KR'), ids = keywordIdsFor(text), tagIds = keywordIdsFor(tag);
  const results = movies.filter(movie => {
    const words = `${movie.title} ${movie.originalTitle ?? ''} ${movie.overview} ${movieTags(movie).join(' ')} ${movie.details?.keywords.join(' ') ?? ''}`.toLocaleLowerCase('ko-KR');
    const tagMatch = tag === 'SF' || tag === '판타지' ? movie.genres.includes(tag) : !tag || overlap(movie, tagIds) > 0 || words.includes(tag.toLocaleLowerCase('ko-KR'));
    return (!text || words.includes(text) || overlap(movie, ids) > 0) && tagMatch && (!filters.genre || movie.genres.includes(filters.genre)) && (filters.rating === 'all' || (movie.voteAverage !== null && movie.voteAverage >= 8));
  });
  if (filters.sort === 'rating') results.sort((a, b) => (b.voteAverage ?? -1) - (a.voteAverage ?? -1) || a.id.localeCompare(b.id));
  if (filters.sort === 'recent') results.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') || a.id.localeCompare(b.id));
  return results;
}
export function exploreReason(movie: Movie, ids: string[]): string {
  const labels = getKeywordLabels(movie.recommendationKeywords.filter(id => ids.includes(id))).slice(0, 2);
  return labels.length ? `${labels.join(' · ')} 키워드와 연결돼요.` : movie.genres.length ? `${movie.genres.slice(0, 2).join(' · ')} 장르로 감상의 폭을 넓혀보세요.` : '새로운 작품을 만나보세요.';
}
export function appreciationPoints(movie: Movie): string[] {
  const points: string[] = [];
  if (movie.details?.directorNames.length) points.push(`${movie.details.directorNames.slice(0, 2).join(' · ')} 감독이 이야기를 풀어내는 방식을 살펴보세요.`);
  if (movie.genres.includes('음악')) points.push('음악이 장면의 분위기와 어떻게 이어지는지 살펴보세요.');
  if (movie.genres.includes('스릴러')) points.push('긴장이 높아지는 순간과 인물의 선택을 따라가 보세요.');
  if (movie.genres.includes('로맨스')) points.push('인물 사이의 거리와 감정이 달라지는 순간을 살펴보세요.');
  if (movie.genres.includes('SF')) points.push('작품의 세계가 던지는 질문을 내 삶과 연결해 보세요.');
  if (movie.recommendationKeywords.includes('mysterious')) points.push('색감·구도·빛이 남기는 인상을 기록해 보세요.');
  if (movie.recommendationKeywords.includes('nostalgic')) points.push('엔딩 뒤에도 떠오르는 감정이나 장면을 골라보세요.');
  points.push('가장 기억에 남는 장면과 그 이유를 하나 골라보세요.', '처음과 끝에서 인물의 마음이 어떻게 변했는지 생각해 보세요.', '나만의 키워드로 감상을 남겨보세요.');
  return [...new Set(points)].slice(0, 3);
}
