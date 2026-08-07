import { fallbackCoreQuestion } from '@/features/reviews/core-questions';
import type { LightQuestion, ReviewForm } from '@/features/reviews/review-logic';
import { supabase } from '@/lib/supabase';

export type CoreQuestionResult = { question: LightQuestion; source: 'gemini' | 'fallback'; notice: string };

export async function generateNextCoreQuestion(form: ReviewForm, movieTitle: string, sessionMode: 'demo' | 'supabase'): Promise<CoreQuestionResult> {
  const index = form.questions.length;
  const fallback = fallbackCoreQuestion(index, movieTitle);
  if (sessionMode !== 'supabase' || !supabase) {
    return { question: fallback, source: 'fallback', notice: '데모 모드에서는 비용 없는 기본 연계 질문을 사용해요.' };
  }

  try {
    const turns = form.questions.map((question) => ({ question: question.text, answer: form.answers[question.key]?.trim() ?? '' }));
    const { data, error } = await supabase.functions.invoke('generate-core-question', { body: { movieId: form.movieId, turns } });
    if (error || typeof data?.question !== 'string' || data.question.trim().length < 10) throw new Error('generation_failed');
    return {
      question: { key: `core_q${index + 1}`, text: data.question.trim(), sourceRule: 'core-gemini-free-v1', options: [] },
      source: 'gemini',
      notice: '무료 Gemini 테스트 질문을 생성했어요.',
    };
  } catch {
    return { question: fallback, source: 'fallback', notice: 'Gemini가 응답하지 않아 영화 기반 기본 질문으로 이어갈게요.' };
  }
}
