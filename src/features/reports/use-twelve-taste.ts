import { useFocusEffect } from 'expo-router';
import { useCallback,useEffect,useRef,useState } from 'react';
import type { ReviewRecord } from '../reviews/reviews';
import { todayDate } from '../reviews/review-logic';
import { buildTwelveTaste,type CachedTaste } from './taste-engine';
import { analyzeTasteReview,loadTasteState,setTasteConsent,subscribeTasteUpdates,tasteAnalysisMessage,tasteFreeStatus } from './taste-service';

export function useTwelveTaste(records:ReviewRecord[]|null,mode:'demo'|'supabase'){
  const [analyses,setAnalyses]=useState<CachedTaste[]>([]),[consent,setConsent]=useState(false),[free,setFree]=useState(false),[loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [verifiedUntil,setUntil]=useState<string|null>(null);
  const generation=useRef(0),lock=useRef(false);
  const load=useCallback(()=>{
    if(records===null)return;
    const token=++generation.current;
    void Promise.allSettled([loadTasteState(records,mode),tasteFreeStatus(mode)]).then(([state,status])=>{
      if(token!==generation.current)return;
      const errors:string[]=[];
      if(state.status==='fulfilled'){setAnalyses(state.value.analyses);setConsent(state.value.consent);}else{setAnalyses([]);errors.push('저장된 AI 분석을 불러오지 못했어요. 키워드 기반 결과만 표시합니다.');}
      if(status.status==='fulfilled'){setFree(status.value.freeAvailable);setUntil(status.value.verifiedUntil);}else{setFree(false);errors.push('무료 AI 연결 확인에 실패했어요. 잠시 뒤 새로고침해 주세요.');}
      setLoaded(true);setError(errors.join(' '));
    });
  },[mode,records]);
  useFocusEffect(useCallback(()=>{load();return()=>{generation.current++;};},[load]));
  useEffect(()=>subscribeTasteUpdates(load),[load]);
  const report=buildTwelveTaste(records??[],analyses,todayDate());
  async function toggleConsent(value:boolean){
    if(lock.current||mode==='demo'||(value&&!free))return;
    lock.current=true;setBusy(true);setError('');setMessage('');const token=generation.current;
    try{await setTasteConsent(value);if(token===generation.current){setConsent(value);if(!value)setAnalyses([]);setMessage(value?'Core 원문 분석에 동의했어요. 미분석 기록을 한 개씩 분석할 수 있어요. 이후 Core 완료 저장 시에는 자동 분석을 시도합니다.':'AI 분석 동의를 철회하고 저장된 AI 분석만 삭제했어요. 원본 리뷰는 유지됩니다.');}}
    catch(e){if(token===generation.current)setError(tasteAnalysisMessage(e));}
    finally{lock.current=false;setBusy(false);}
  }
  async function analyzeNext(){
    if(lock.current||!consent||!free||mode==='demo')return;
    const latest=new Map<string,ReviewRecord>();
    for(const r of [...(records??[])].filter(r=>r.mode==='core'&&r.status==='completed').sort((a,b)=>b.watchedAt.localeCompare(a.watchedAt)||b.updatedAt.localeCompare(a.updatedAt)||b.id.localeCompare(a.id)))if(!latest.has(r.movieId))latest.set(r.movieId,r);
    const next=[...latest.values()].find(r=>!analyses.some(a=>a.reviewId===r.id));
    if(!next){setMessage('현재 분석할 Core 기록이 없어요.');return;}
    lock.current=true;setBusy(true);setError('');setMessage('');const token=generation.current;
    try{await analyzeTasteReview(next.id);const state=await loadTasteState(records??[],mode);if(token===generation.current){setAnalyses(state.analyses);setConsent(state.consent);setMessage('Core 기록 한 개의 분석을 확인했어요. 근거가 없으면 해당 기록은 유형 점수에 넣지 않습니다.');}}
    catch(e){if(token===generation.current)setError(tasteAnalysisMessage(e));}
    finally{lock.current=false;setBusy(false);}
  }
  return {report,consent,freeAvailable:free,loaded,busy,error,message,verifiedUntil,reload:load,toggleConsent,analyzeNext};
}
