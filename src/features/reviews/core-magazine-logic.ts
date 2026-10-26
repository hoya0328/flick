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

const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const strings=(value:unknown,max:number,length:number):value is string[]=>Array.isArray(value)&&value.length<=max&&value.every(item=>typeof item==='string'&&item.length<=length);
const photoPath=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/.test(value);
// Public reads are untrusted even when the record owner bypasses the save RPC.
// Reject malformed JSON instead of crashing a reader's magazine screen.
export function normalizeCoreFlow(value:unknown):CoreFlowState|undefined {
  if(!object(value)||value.version!==1||!strings(value.changed,5,7)||!value.changed.every(k=>/^core_q[1-5]$/.test(k))
    ||!object(value.feedback)||!object(value.nextQuestions)||!strings(value.keywords,5,40)
    ||typeof value.title!=='string'||value.title.length>80||(typeof value.source!=='string'||!['manual','gemini'].includes(value.source))
    ||(typeof value.stage!=='string'||!['question','feedback','summary'].includes(value.stage))||!Number.isInteger(value.index)||Number(value.index)<0||Number(value.index)>4
    ||!Array.isArray(value.blocks)||value.blocks.length>20||(value.cover!==null&&!photoPath(value.cover)))return undefined;
  const blocks:MagazineBlock[]=[];
  for(const b of value.blocks){
    if(!object(b)||typeof b.id!=='string'||!b.id||b.id.length>80||blocks.some(x=>x.id===b.id)||typeof b.text!=='string'||b.text.length>1000
      ||typeof b.bold!=='boolean'||typeof b.italic!=='boolean'||typeof b.size!=='number'||![15,18,20].includes(b.size)
      ||(typeof b.kind!=='string'||!['paragraph','list','quote'].includes(b.kind))||(b.photo!==undefined&&!photoPath(b.photo)))return undefined;
    blocks.push({id:b.id,text:b.text,bold:b.bold,italic:b.italic,size:b.size as MagazineBlock['size'],kind:b.kind as MagazineBlock['kind'],...(b.photo?{photo:b.photo as string}:{})});
  }
  const feedback:CoreFlowState['feedback']={};
  for(const [key,item] of Object.entries(value.feedback)){
    if(!/^core_q[1-5]$/.test(key)||!object(item)||typeof item.text!=='string'||item.text.length>700||(typeof item.source!=='string'||!['gemini','manual'].includes(item.source)))return undefined;
    feedback[key]={text:item.text,source:item.source as 'gemini'|'manual'};
  }
  const nextQuestions:CoreFlowState['nextQuestions']={};
  for(const [key,item] of Object.entries(value.nextQuestions)){
    if(!/^core_q[1-5]$/.test(key)||!object(item)||typeof item.key!=='string'||!/^core_q[1-5]$/.test(item.key)||typeof item.text!=='string'||item.text.length>400||typeof item.sourceRule!=='string'||item.sourceRule.length>120)return undefined;
    nextQuestions[key]={key:item.key,text:item.text,sourceRule:item.sourceRule,options:[]};
  }
  const flow:CoreFlowState={version:1,changed:[...value.changed],feedback,nextQuestions,stage:value.stage as CoreFlowState['stage'],index:Number(value.index),title:value.title,blocks,cover:value.cover as string|null,keywords:[...value.keywords],source:value.source as CoreFlowState['source']};
  return magazineText(flow).length<=1000?flow:undefined;
}

export function coreFlowIssue(form: ReviewForm): string | null {
  const flow = form.coreFlow;
  if (!flow || form.questions.length < 1 || form.questions.length > 5) return '질문과 답변을 먼저 작성해 주세요.';
  if (!form.questions.every((q) => (form.answers[q.key]?.trim().length ?? 0) >= 10 && (form.answers[q.key]?.length ?? 0) <= 1000)) return '각 질문에 답변을 10~1,000자로 작성해 주세요.';
  if (!flow.title.trim() || !magazineBody(flow)) return '매거진 제목과 본문을 입력해야 합니다.';
  if (flow.title.length > 80 || magazineText(flow).length > CORE_MAGAZINE_LIMIT) return '제목은 80자, 제목과 본문 합계는 1,000자 이내로 작성해 주세요.';
  if (form.body !== magazineBody(flow) || form.oneLine !== flow.title) return '편집한 내용을 다시 확인해 주세요.';
  return null;
}
