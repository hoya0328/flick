import { buildMonthCalendar, buildTasteReport } from '../reports/taste-report';
import { getKeywordLabels } from '../onboarding/keywords';
import type { ReviewRecord } from '@/features/reviews/reviews';

export type SavedKind='movies'|'reviews'|'magazines'|'collections';
export type SavedItem={id:string;kind:'movie'|'review'|'magazine'|'curation'|'collection';title:string;subtitle:string;movieTitle:string;movieId:string;posterPath:string|null;coverPath:string|null;authorName:string;spoiler:boolean;bodyExcerpt:string;rating:number|null;watchedAt:string;savedAt:string;keywords:string[];likeCount:number;commentCount:number};
export type SavedPage={items:SavedItem[];total:number};
const text=(value:unknown)=>typeof value==='string'?value:'';
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&/^\d+(\.\d+)?$/.test(value)?Number(value):0;
export const isPhotoPath=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/.test(value);
export function normalizeSavedPage(value:unknown):SavedPage {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('저장함 응답을 확인할 수 없어요.');
  const page=value as Record<string,unknown>;
  if(!Array.isArray(page.items))throw new Error('저장함 응답을 확인할 수 없어요.');
  const items=page.items.flatMap((raw):SavedItem[]=>{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return [];
    const item=raw as Record<string,unknown>;
    if(!/^[0-9a-f-]{36}$/i.test(text(item.id))||typeof item.kind!=='string'||!['movie','review','magazine','curation','collection'].includes(item.kind))return [];
    return [{id:text(item.id),kind:item.kind as SavedItem['kind'],title:text(item.title),subtitle:text(item.subtitle),movieTitle:text(item.movieTitle),movieId:text(item.movieId),
      posterPath:/^\/[\w.-]+$/.test(text(item.posterPath))?text(item.posterPath):null,coverPath:isPhotoPath(item.coverPath)?item.coverPath:null,
      authorName:text(item.authorName),spoiler:item.spoiler===true,bodyExcerpt:item.spoiler===true?'':text(item.bodyExcerpt),rating:item.rating===null||item.rating===undefined?null:number(item.rating),
      watchedAt:text(item.watchedAt),savedAt:text(item.savedAt),keywords:Array.isArray(item.keywords)?item.keywords.filter((x):x is string=>typeof x==='string'&&x.length<=40).slice(0,5):[],likeCount:number(item.likeCount),commentCount:number(item.commentCount)}];
  });
  return {items,total:Math.max(items.length,number(page.total))};
}
export function mergeSavedPage(previous:SavedPage,next:SavedPage):SavedPage {
  const byId=new Map(previous.items.map(item=>[`${item.kind}:${item.id}`,item]));
  next.items.forEach(item=>byId.set(`${item.kind}:${item.id}`,item));
  return {items:[...byId.values()],total:next.total};
}
export function profileSummary(records:ReviewRecord[],today:string){
  const complete=records.filter(r=>r.status==='completed');
  const keywords=new Map<string,number>(),aspects=new Map<string,number>();
  for(const record of complete){
    const tags=record.questions.flatMap(q=>q.options.filter(o=>(record.questionTags[q.key]??[]).includes(o.id)).map(o=>o.label));
    const words=[...getKeywordLabels(record.keywordIds),...tags,...(record.lightFlow?.representativeKeywords??[]),...(record.coreFlow?.keywords??[])];
    [...new Set(words)].filter(Boolean).forEach(word=>keywords.set(word,(keywords.get(word)??0)+1));
    [...new Set(record.lightFlow?.aspects??[])].forEach(aspect=>aspects.set(aspect,(aspects.get(aspect)??0)+1));
  }
  const sort=(a:[string,number],b:[string,number])=>b[1]-a[1]||a[0].localeCompare(b[0],'ko-KR');
  const points=[...aspects].sort(sort),total=points.reduce((n,item)=>n+item[1],0);
  return {report:buildTasteReport(records,today),watchedMovies:new Set(complete.map(r=>r.movieId)).size,keywords:[...keywords].sort(sort).slice(0,3).map(([label,count])=>({label,count})),
    aspects:points.slice(0,3).map(([label])=>label),dominant:points[0]?{label:points[0][0],percent:Math.round(points[0][1]/total*100)}:null};
}
export function profileCalendar(month:string,records:ReviewRecord[]){
  const [year,m]=month.split('-').map(Number);
  const rows=Math.ceil((new Date(year!,m!-1,1).getDay()+new Date(year!,m!,0).getDate())/7);
  return buildMonthCalendar(month,records).slice(0,rows*7).map(day=>{
    const reviews=records.filter(r=>r.status==='completed'&&r.watchedAt===day.date).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    return {...day,reviews};
  });
}
export function millisecondsToLocalMidnight(now=new Date()){
  const next=new Date(now);next.setHours(24,0,0,0);return Math.max(1,next.getTime()-now.getTime());
}
