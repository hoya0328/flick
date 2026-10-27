import { STANCE,TASTE_IDS,type Stance,type TasteId,type TasteSignal } from '../../../supabase/functions/_shared/taste-schema';
import { getKeywordLabels } from '../onboarding/keywords';
import type { ReviewRecord } from '../reviews/reviews';
import { tasteTypes,weightsFor } from './taste-taxonomy';
export { TASTE_IDS,tasteTypes };
export type { TasteId,TasteSignal };
export const TASTE_VERSION='taste-12-v1';
export type Scores=Record<TasteId,number>;
export type CachedTaste={reviewId:string;signals:TasteSignal[];analyzedAt:string};
export const zeroScores=():Scores=>Object.fromEntries(TASTE_IDS.map(id=>[id,0])) as Scores;
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
type Signal={type:TasteId;strength:number;stance:Stance;word:string};
const negativeLabels=new Set(['아쉬운','아쉬움','답답한','피로한','밋밋한','과한','어색한','웃음이 적은','설명이 부족한','한 번이면 충분한']);
function questionStance(key:string,rule:string,label:string):Stance {
  if(rule.startsWith('figma-light-v1'))return key==='light_q3'?'negative':key==='light_q2'?'positive':'neutral';
  if(negativeLabels.has(label))return 'negative';
  if(rule==='title-aftertaste-v1'&&['다시 보고 싶은','오래 남는','생각이 깊어지는','위로가 되는','추천하고 싶은','여운이 긴'].includes(label))return 'positive';
  return 'neutral';
}
export function selectedTasteWords(record:ReviewRecord):string[]{
  const tags=record.questions.flatMap(q=>q.options.filter(o=>(record.questionTags[q.key]??[]).includes(o.id)).map(o=>o.label));
  // Core-generated keywords and AI magazines are deliberately NOT user-origin evidence.
  return [...new Set([...getKeywordLabels(record.keywordIds),...tags,...(record.lightFlow?.representativeKeywords??[])])];
}
function quickSignals(record:ReviewRecord):Signal[]{
  const signals:Signal[]=[];
  const add=(word:string,stance:Stance)=>{for(const [type,strength]of Object.entries(weightsFor(word)??{}))signals.push({type:type as TasteId,strength,stance,word});};
  for(const q of record.questions){
    if(record.lightFlow?.responses[q.key]==='skipped')continue;
    for(const option of q.options)if((record.questionTags[q.key]??[]).includes(option.id))add(option.label,questionStance(q.key,q.sourceRule,option.label));
  }
  for(const aspect of record.lightFlow?.aspects??[])add(aspect,'positive');
  const answered=new Set(record.questions.flatMap(q=>q.options.filter(o=>(record.questionTags[q.key]??[]).includes(o.id)).map(o=>o.label)));
  for(const word of [...getKeywordLabels(record.keywordIds),...(record.lightFlow?.representativeKeywords??[])])if(!answered.has(word))add(word,'neutral');
  const unique=new Map<string,Signal>();
  for(const s of signals){
    const key=`${s.type}:${s.word}`,previous=unique.get(key);
    if(!previous){unique.set(key,s);continue;}
    const opposite=(previous.stance==='positive'&&s.stance==='negative')||(previous.stance==='negative'&&s.stance==='positive');
    const stance:Stance=opposite||previous.stance==='mixed'||s.stance==='mixed'?'mixed':previous.stance==='neutral'?s.stance:previous.stance;
    unique.set(key,{...s,stance,strength:Math.max(previous.strength,s.strength)});
  }
  return [...unique.values()];
}
function scored(signals:{type:TasteId;strength:number;stance:Stance}[],deep=false){
  const scores=zeroScores(),positive=new Set<TasteId>();
  const source=deep?[...signals.reduce((m,s)=>{const key=`${s.type}:${s.stance}`;if((m.get(key)?.strength??0)<s.strength)m.set(key,s);return m;},new Map<string,typeof signals[number]>()).values()]:signals;
  for(const s of source){scores[s.type]+=s.strength*STANCE[s.stance];if(s.stance==='positive'||s.stance==='mixed')positive.add(s.type);}
  TASTE_IDS.forEach(id=>{scores[id]=clamp(scores[id]);});
  return {scores,positive,hasEvidence:source.length>0};
}
export function filmRatingWeight(rating:number|null,mean:number|null){return rating===null||mean===null?1:clamp(1+.05*(rating-mean),.9,1.1);}
export function filmRecencyWeight(watchedAt:string,today:string){const days=Math.max(0,(Date.parse(today)-Date.parse(watchedAt))/86400000);return .8+.2*Math.exp(-Math.LN2*(Number.isFinite(days)?days:0)/365);}
export function buildTwelveTaste(records:ReviewRecord[],analyses:CachedTaste[]=[],today=new Date().toISOString().slice(0,10)){
  const groups=new Map<string,{light?:ReviewRecord;core?:ReviewRecord}>();
  const complete=records.filter(r=>r.status==='completed').sort((a,b)=>b.watchedAt.localeCompare(a.watchedAt)||b.updatedAt.localeCompare(a.updatedAt)||b.id.localeCompare(a.id));
  for(const r of complete){const group=groups.get(r.movieId)??{};group[r.mode]??=r;groups.set(r.movieId,group);}
  const films=[...groups.values()].map(group=>({group,latest:[group.light,group.core].filter((r):r is ReviewRecord=>!!r).sort((a,b)=>b.watchedAt.localeCompare(a.watchedAt)||b.updatedAt.localeCompare(a.updatedAt)||b.id.localeCompare(a.id))[0]!}));
  const ratings=films.flatMap(f=>f.latest.rating===null?[]:[f.latest.rating]);
  const mean=ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null;
  const scores=zeroScores(),support=zeroScores(),wordCounts=new Map<string,number>(),unmapped=new Set<string>(),high=new Map<string,number>(),low=new Map<string,number>(),points=new Map<string,number>();
  const ratingCounts:Record<number,number>=Object.fromEntries(Array.from({length:10},(_,i)=>[(i+1)/2,0]));
  let denominator=0,validFilms=0,deepFilms=0,pendingCore=0;
  for(const {group,latest}of films){
    const words=[...new Set([group.light,group.core].flatMap(r=>r?selectedTasteWords(r):[]))];
    for(const word of words){wordCounts.set(word,(wordCounts.get(word)??0)+1);if(!weightsFor(word))unmapped.add(word);if((latest.rating??0)>=4)high.set(word,(high.get(word)??0)+1);else if(latest.rating!==null&&latest.rating<=2.5)low.set(word,(low.get(word)??0)+1);}
    for(const aspect of new Set(group.light?.lightFlow?.aspects??[]))points.set(aspect,(points.get(aspect)??0)+1);
    if(latest.rating!==null&&Object.hasOwn(ratingCounts,latest.rating))ratingCounts[latest.rating]=(ratingCounts[latest.rating]??0)+1;
    const quick=group.light?scored(quickSignals(group.light)):null;
    const cache=group.core?analyses.find(a=>a.reviewId===group.core!.id):undefined;
    if(group.core&&!cache)pendingCore++;
    const deep=cache?scored(cache.signals,true):null;
    // Legacy Core explicitly selected keywords can be a limited fallback, never magazine text.
    const fallback=!quick?.hasEvidence&&group.core?scored(quickSignals(group.core)):null;
    const q=quick?.hasEvidence?quick:fallback?.hasEvidence?fallback:null,d=deep?.hasEvidence?deep:null;
    if(!q&&!d)continue;
    validFilms++;if(d)deepFilms++;
    const quality=d ? 1 : group.light?.lightFlow?.version===1 ? .8 : .55;
    const weight=quality*filmRecencyWeight(latest.watchedAt,today)*filmRatingWeight(latest.rating,mean);
    denominator+=weight;
    for(const id of TASTE_IDS){
      const value=q&&d ? .4*q.scores[id]+.6*d.scores[id] : d?d.scores[id]:q!.scores[id];
      scores[id]+=weight*value;
      if(value>0&&(q?.positive.has(id)||d?.positive.has(id)))support[id]++;
    }
  }
  if(denominator)TASTE_IDS.forEach(id=>{scores[id]/=denominator;});
  const total=TASTE_IDS.reduce((n,id)=>n+scores[id],0);
  const share=zeroScores();if(total)TASTE_IDS.forEach(id=>{share[id]=scores[id]/total*100;});
  const ranking=[...TASTE_IDS].sort((a,b)=>share[b]-share[a]||TASTE_IDS.indexOf(a)-TASTE_IDS.indexOf(b));
  const first=ranking[0]!,second=ranking[1]!;
  const status:'insufficient'|'provisional'|'mixed'|'representative'=validFilms<3||!total?'insufficient':validFilms<8?'provisional':share[first]-share[second]>=6&&support[first]>=4?'representative':'mixed';
  const reason=status==='mixed'?(share[first]-share[second]<6?'close_scores':'few_positive_films'):status;
  const primary=status==='insufficient'?null:first,secondary=primary&&share[second]>0?second:null;
  const ordered=(m:Map<string,number>)=>[...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko-KR')).map(([label,count])=>({label,count}));
  const pointTotal=[...points.values()].reduce((a,b)=>a+b,0);
  const topPoints=ordered(points).slice(0,3).map(p=>({...p,percent:pointTotal?p.count/pointTotal*100:0}));
  return {version:TASTE_VERSION,primary,secondary,status,reason,scores,share,support,ranking,validFilms,totalMovies:films.length,deepFilms,pendingCore,
    meanRating:mean===null?null:Math.round(mean*10)/10,ratingCounts,modalRatings:ratings.length?Object.entries(ratingCounts).filter(([,v])=>v===Math.max(...Object.values(ratingCounts))).map(([k])=>Number(k)):[],
    topKeywords:ordered(wordCounts).slice(0,5),highKeywords:ordered(high).slice(0,5),lowKeywords:ordered(low).slice(0,5),topPoints,unmapped:[...unmapped],wishlistWeight:0,
    headline:primary?reason==='close_scores'&&secondary?`${tasteTypes[primary].name} · ${tasteTypes[secondary].name}`:`${tasteTypes[primary].name}${status==='provisional'?' · 임시 유형':reason==='few_positive_films'?' · 근거 보강 중':''}`:'아직 취향을 발견하는 중',
  };
}
export type TwelveTaste=ReturnType<typeof buildTwelveTaste>;
