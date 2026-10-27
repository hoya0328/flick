import { supabase } from '@/lib/supabase';
import { validateTasteSignals,type TasteTurn } from '../../../supabase/functions/_shared/taste-schema';
import { readAiOperationError } from '../reviews/ai-operations';
import type { ReviewRecord } from '../reviews/reviews';
import type { CachedTaste } from './taste-engine';
const listeners=new Set<()=>void>();
export function subscribeTasteUpdates(callback:()=>void){listeners.add(callback);return()=>{listeners.delete(callback);};}
export async function analyzeSavedTaste(reviewId:string){
  try{
    if(!supabase)return;
    const {data,error}=await supabase.rpc('get_my_taste_source',{p_review_id:reviewId});
    if(error||data?.consent!==true)return;
    await analyzeTasteReview(reviewId);listeners.forEach(callback=>callback());
  }catch{/* Saved reviews never depend on optional analysis. */}
}

export function normalizeTasteState(raw:unknown,records:ReviewRecord[]):{consent:boolean;analyses:CachedTaste[]}{
  if(!raw||typeof raw!=='object')throw new Error('invalid_analysis_state');
  const state=raw as Record<string,unknown>;
  if(typeof state.consent!=='boolean'||!Array.isArray(state.analyses))throw new Error('invalid_analysis_state');
  if(!state.consent)return {consent:false,analyses:[]};
  const analyses:CachedTaste[]=[];
  for(const value of state.analyses){
    if(!value||typeof value!=='object')continue;
    const row=value as Record<string,unknown>,record=records.find(r=>r.id===row.reviewId&&r.status==='completed'&&r.mode==='core');
    const source=row.source as {reviewId?:unknown;movieId?:unknown;movieTitle?:unknown;turns?:unknown}|null;
    if(!record||!source||source.reviewId!==record.id||source.movieId!==record.movieId||source.movieTitle!==record.movie.title||!Array.isArray(source.turns))continue;
    const turns:TasteTurn[]=record.questions.filter(q=>!!record.answers[q.key]?.trim()).map(q=>({key:q.key,question:q.text,answer:record.answers[q.key]!.trim()}));
    const fromServer=source.turns.map(t=>t&&typeof t==='object'?{key:t.key,question:t.question,answer:t.answer}:null);
    if(JSON.stringify(turns)!==JSON.stringify(fromServer)||typeof row.analyzedAt!=='string')continue;
    try{analyses.push({reviewId:record.id,signals:validateTasteSignals(row.signals,turns),analyzedAt:row.analyzedAt});}catch{/* Ignore malformed or stale analysis, not the review. */}
  }
  return {consent:true,analyses};
}
export async function loadTasteState(records:ReviewRecord[],mode:'demo'|'supabase'){
  if(mode==='demo')return {consent:false,analyses:[] as CachedTaste[]};
  if(!supabase)throw new Error('analysis_unavailable');
  const {data,error}=await supabase.rpc('get_my_taste_analysis_state');
  if(error)throw new Error('분석 저장 상태를 불러오지 못했어요. 기록은 변경되지 않았습니다.');
  return normalizeTasteState(data,records);
}
export async function tasteFreeStatus(mode:'demo'|'supabase'){
  if(mode==='demo')return {freeAvailable:false,verifiedUntil:null as string|null};
  if(!supabase)throw new Error('analysis_unavailable');
  const {data,error}=await supabase.functions.invoke('analyze-taste-review',{body:{action:'status'},timeout:12000});
  if(error)throw new Error('무료 AI 연결 상태를 확인하지 못했어요. 키워드 분석은 계속 사용할 수 있어요.');
  return {freeAvailable:data?.freeAvailable===true,verifiedUntil:typeof data?.verifiedUntil==='string'?data.verifiedUntil:null};
}
export async function setTasteConsent(value:boolean){
  if(!supabase)throw new Error('로그인 후 이용해 주세요.');
  const {error}=await supabase.rpc('set_my_taste_consent',{p_consent:value});
  if(error)throw new Error('동의를 변경하지 못했어요. 기존 기록은 그대로 유지됩니다.');
}
export async function analyzeTasteReview(reviewId:string){
  if(!supabase)throw new Error('analysis_unavailable');
  const {data,error}=await supabase.functions.invoke('analyze-taste-review',{body:{reviewId},timeout:45000});
  if(error)throw await readAiOperationError(error,data);
  return data;
}
export function tasteAnalysisMessage(error:unknown){
  const code=error&&typeof error==='object'&&'code'in error?error.code:null;
  const known:Record<string,string>={free_tier_not_verified:'무료 등급 확인 기간이 만료됐거나 무료 연결이 준비되지 않아 호출하지 않았어요. 유료 전환은 하지 않습니다.',
    daily_limit:'오늘의 취향 AI 분석 5회를 사용했어요. 키워드 분석은 계속 사용할 수 있어요.',project_daily_limit:'서비스 전체 무료 분석 한도에 도달했어요. 내일 다시 시도해 주세요.',burst_limit:'1분에 최대 2개까지 분석할 수 있어요. 잠시 뒤 다시 시도해 주세요.',analysis_busy:'같은 기록을 분석 중이에요. 잠시 뒤 새로고침해 주세요.',free_tier_limit:'Gemini 무료 제공량에 도달했어요. 유료 모델로 전환하지 않으며 기존 결과는 유지합니다.',
    sensitive_input:'이메일·전화번호 등 개인정보로 보이는 내용이 있어 전송하지 않았어요.',consent_required:'Core 원문 분석에 별도로 동의해야 합니다.',source_changed:'분석 중 원문이나 동의가 변경돼 결과를 적용하지 않았어요. 다시 시도해 주세요.',unsafe_output:'원문 근거를 검증할 수 없어 AI 결과를 사용하지 않았어요.'};
  return typeof code==='string'&&known[code]?known[code]:error instanceof Error&&!code?error.message:'AI 분석을 완료하지 못했어요. 기록 저장과 키워드 분석은 계속 사용할 수 있어요.';
}
