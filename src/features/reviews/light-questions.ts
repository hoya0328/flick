import type { Movie } from '@/features/discovery/discovery-logic';
import type { LightQuestion, LightTagOption, ReviewForm } from '@/features/reviews/review-logic';

const options = (...labels: string[]): LightTagOption[] => labels.map((label, index) => ({ id: `t${index + 1}`, label }));

const atmosphere = options('몰입되는', '몽환적인', '따뜻한', '긴장되는', '유쾌한', '쓸쓸한', '강렬한', '잔잔한', '낯선', '편안한');
const direction = options('섬세한', '대담한', '절제된', '리드미컬한', '느린', '실험적인', '안정적인', '아쉬운');
const character = options('공감되는', '설득력 있는', '매력적인', '복잡한', '답답한', '인상적인', '낯선', '아쉬운');
const sensory = options('미장센', '색감', '촬영', '사운드', '음악', '편집', '공간감', '특별함 없음');
const aftertaste = options('다시 보고 싶은', '오래 남는', '생각이 깊어지는', '위로가 되는', '추천하고 싶은', '한 번이면 충분한', '여운이 긴', '혼란스러운');

function includesGenre(movie: Movie, words: string[]): boolean {
  const source = movie.genres.join(' ').toLocaleLowerCase('ko-KR');
  return words.some((word) => source.includes(word));
}

function genreQuestion(movie: Movie): { text: string; tags: LightTagOption[]; rule: string } {
  const genre = movie.genres[0] ?? '이 영화';
  if (includesGenre(movie, ['액션', '스릴러', '범죄', '공포', 'action', 'thriller', 'crime', 'horror'])) {
    return { text: `${genre} 장르의 긴장과 속도감은 어떻게 다가왔나요?`, tags: options('긴장감 있는', '속도감 있는', '예측 불가', '강렬한', '통쾌한', '잔혹한', '피로한', '밋밋한'), rule: 'genre-tension' };
  }
  if (includesGenre(movie, ['로맨스', '멜로', '드라마', 'romance', 'drama'])) {
    return { text: `${genre} 장르의 감정과 관계는 얼마나 마음에 와닿았나요?`, tags: options('공감되는', '애틋한', '따뜻한', '먹먹한', '현실적인', '섬세한', '답답한', '과한'), rule: 'genre-emotion' };
  }
  if (includesGenre(movie, ['코미디', 'comedy'])) {
    return { text: `${genre} 장르의 유머와 리듬은 취향에 잘 맞았나요?`, tags: options('유쾌한', '재치 있는', '엉뚱한', '편안한', '과장된', '어색한', '예측 가능한', '웃음이 적은'), rule: 'genre-comedy' };
  }
  if (includesGenre(movie, ['sf', '판타지', '모험', '애니메이션', 'science fiction', 'fantasy', 'adventure', 'animation'])) {
    return { text: `${genre} 장르의 세계와 상상력은 얼마나 매력적이었나요?`, tags: options('세계관이 좋은', '상상력 있는', '경이로운', '독창적인', '복잡한', '친숙한', '몰입되는', '설명이 부족한'), rule: 'genre-world' };
  }
  return { text: `${genre} 장르의 매력이 가장 잘 드러난 부분은 무엇이었나요?`, tags: options('이야기', '인물', '연출', '영상', '음악', '분위기', '신선함', '아쉬움'), rule: 'genre-general' };
}

export function buildLightQuestions(movie: Movie): LightQuestion[] {
  const genre = genreQuestion(movie);
  const directorName = movie.details?.directorNames[0];
  const cast = movie.details?.cast[0];
  const characterName = cast?.character ? ` ‘${cast.character}’` : '';

  return [
    { key: 'movie_atmosphere', text: `《${movie.title}》만의 가장 독특한 분위기를 표현한다면?`, sourceRule: 'title-atmosphere-v1', options: atmosphere },
    { key: 'genre_signature', text: genre.text, sourceRule: `${genre.rule}-v1`, options: genre.tags },
    { key: 'direction', text: directorName ? `${directorName} 감독의 연출에서 가장 인상 깊었던 결은 무엇인가요?` : '장면의 흐름과 연출은 어떤 인상을 남겼나요?', sourceRule: directorName ? 'director-name-v1' : 'direction-fallback-v1', options: direction },
    { key: 'character', text: cast ? `${cast.name}의${characterName} 인물과 연기는 어떻게 다가왔나요?` : '영상과 음악 중 가장 인상적인 감각은 무엇이었나요?', sourceRule: cast ? 'lead-cast-v1' : 'sensory-fallback-v1', options: cast ? character : sensory },
    { key: 'aftertaste', text: `《${movie.title}》을 다시 떠올릴 때 가장 먼저 남는 감정은?`, sourceRule: 'title-aftertaste-v1', options: aftertaste },
  ].map((question, index) => ({ ...question, key: `${index + 1}_${question.key}` }));
}

export function ensureLightQuestions(form: ReviewForm, movie: Movie | null, fallbackTitle = '선택한 영화'): ReviewForm {
  if (form.questions.length === 5) return form;
  const source: Movie = movie ?? {
    id: form.movieId, provider: 'tmdb', providerId: '', title: fallbackTitle, originalTitle: null, overview: '', posterPath: null,
    releaseDate: null, runtime: null, genres: [], recommendationKeywords: [], voteAverage: null, details: null,
    detailsSource: null, detailsStatus: 'summary', detailsFetchedAt: null,
  };
  return { ...form, questions: buildLightQuestions(source) };
}

export function selectedLightTagLabels(form: ReviewForm, questionKey: string): string[] {
  const question = form.questions.find((item) => item.key === questionKey);
  const selected = new Set(form.questionTags[questionKey] ?? []);
  return question?.options.filter((option) => selected.has(option.id)).map((option) => option.label) ?? [];
}
