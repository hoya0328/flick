import type { LightQuestion, ReviewForm } from './review-logic';

export type MagazineBlock = { id: string; text: string; bold: boolean; italic: boolean; size: 15 | 18 | 20; kind: 'paragraph' | 'list' | 'quote'; photo?: string };
export type CoreFlowState = {
  version: 1;
  changed: string[];
  feedback: Record<string, { text: string; source: 'gemini' | 'manual' }>;
  nextQuestions: Record<string, LightQuestion>;
  stage: 'question' | 'feedback' | 'summary';
  index: number;
  title: string;
  blocks: MagazineBlock[];
  cover: string | null;
  keywords: string[];
  source: 'gemini' | 'manual';
};
export const CORE_MAGAZINE_LIMIT = 1000;
export const magazineText = (flow: Pick<CoreFlowState, 'title' | 'blocks'>) => [flow.title.trim(), ...flow.blocks.map((block) => block.text.trim()).filter(Boolean)].filter(Boolean).join('\n\n');
export const magazineBody = (flow: Pick<CoreFlowState, 'blocks'>) => flow.blocks.map((block) => block.text.trim()).filter(Boolean).join('\n\n');

export function coreFlowIssue(form: ReviewForm): string | null {
  const flow = form.coreFlow;
  if (!flow || form.questions.length < 1 || form.questions.length > 5) return '질문과 답변을 먼저 작성해 주세요.';
  if (!form.questions.every((q) => (form.answers[q.key]?.trim().length ?? 0) >= 10 && (form.answers[q.key]?.length ?? 0) <= 1000)) return '각 질문에 답변을 10~1,000자로 작성해 주세요.';
  if (!flow.title.trim() || !magazineBody(flow)) return '매거진 제목과 본문을 입력해야 합니다.';
  if (flow.title.length > 80 || magazineText(flow).length > CORE_MAGAZINE_LIMIT) return '제목은 80자, 제목과 본문 합계는 1,000자 이내로 작성해 주세요.';
  if (form.body !== magazineBody(flow) || form.oneLine !== flow.title) return '편집한 내용을 다시 확인해 주세요.';
  return null;
}
