import { describe,expect,it } from 'vitest';
import { buildTwelveTaste,filmRatingWeight,filmRecencyWeight,TASTE_IDS,type CachedTaste,type TasteId } from '../src/features/reports/taste-engine';
import { keywordWeights,unclassifiedKeywords } from '../src/features/reports/taste-taxonomy';
import { validateTasteSignals,sensitiveTasteInput } from '../supabase/functions/_shared/taste-schema';
import { emptyReviewForm } from '../src/features/reviews/review-logic';
import { feelingWords,filmAspects } from '../src/features/reviews/light-flow';
import { buildLightQuestions } from '../src/features/reviews/light-questions';
import { tasteKeywords } from '../src/features/onboarding/keywords';
import type { ReviewRecord } from '../src/features/reviews/reviews';

function review(patch:Partial<ReviewRecord>={}):ReviewRecord{
  return {...emptyReviewForm('movie-1'),id:'r1',status:'completed',watchedAt:'2026-10-27',rating:4,createdAt:'2026-10-27T01:00:00Z',updatedAt:'2026-10-27T01:00:00Z',movie:{id:'movie-1',title:'영화',posterPath:null,originalTitle:null,releaseDate:null},...patch};
}
function light(word:string,key='light_q2',patch:Partial<ReviewRecord>={}){return review({questions:[{key,text:'사용자 질문',sourceRule:'figma-light-v1',options:[{id:'tag',label:word}]}],questionTags:{[key]:['tag']},...patch});}
const report=(records:ReviewRecord[],analyses:CachedTaste[]=[])=>buildTwelveTaste(records,analyses,'2026-10-27');
const movies=(word:string,n:number)=>Array.from({length:n},(_,i)=>light(word,'light_q2',{id:`r${i}`,movieId:`m${i}`}));
const fixtures:Record<TasteId,string>={scene:'미장센',afterglow:'여운',music:'음악',interpretation:'상징',character:'인물',narrative:'서사',immersion:'몰입감',comfort:'위로',aftereffect:'후유증',nostalgia:'추억',everyday:'일상',novelty:'실험적'};
describe('12-type deterministic scoring',()=>{
  it.each(TASTE_IDS)('%s has an independent, grounded classification path',id=>{const r=report(movies(fixtures[id],3));expect(r.primary).toBe(id);expect(r.status).toBe('provisional');});
  it('has reviewed every built-in Light/onboarding option, not only the 12 example labels',()=>{
    const movie:Parameters<typeof buildLightQuestions>[0]={id:'m',title:'영화',genres:[],details:null,provider:'tmdb',providerId:'1',originalTitle:null,overview:'',posterPath:null,releaseDate:null,runtime:null,recommendationKeywords:[],voteAverage:null,detailsSource:null,detailsStatus:'summary',detailsFetchedAt:null};
    const genres=['액션','로맨스','코미디','SF','다큐멘터리'];
    const old=genres.flatMap(g=>buildLightQuestions({...movie,genres:[g]}).flatMap(q=>q.options.map(o=>o.label)));
    for(const word of [...feelingWords,...filmAspects,...tasteKeywords.map(k=>k.label),...old])expect(!!keywordWeights[word]||unclassifiedKeywords.has(word),word).toBe(true);
  });
  it('never infers nostalgia from the misleading legacy nostalgic ID',()=>{const r=report([review({keywordIds:['nostalgic']})]);expect(r.scores.nostalgia).toBe(0);expect(r.scores.afterglow).toBeGreaterThan(0);});
  it('does not interpret a negative Q3 as preference or count skipped answers',()=>{
    expect(report([light('위로','light_q3')]).scores.comfort).toBe(0);
    const flow={version:1 as const,responses:{light_q2:'skipped' as const},changed:[],aspects:[],representativeKeywords:[],draftSource:'manual' as const};
    expect(report([light('미장센','light_q2',{lightFlow:flow})]).validFilms).toBe(0);
  });
  it('does not guess types from unmapped labels, drafts, magazines or generated Core keywords',()=>{
    const r=report([light('사용자가 만든 미등록 표현'),review({id:'draft',status:'draft',keywordIds:['warm']}),review({id:'core',mode:'core',body:'영상미가 아름다운 AI 매거진'})]);
    expect(r.validFilms).toBe(0);expect(r.primary).toBeNull();expect(r.unmapped).toContain('사용자가 만든 미등록 표현');
  });
  it('deduplicates repeated same-film keywords and latest reviews by mode',()=>{
    const once=light('미장센');const twice={...once,questions:[...once.questions,{...once.questions[0]!,key:'light_q4'}],questionTags:{light_q2:['tag'],light_q4:['tag']}};
    expect(report([twice]).scores).toEqual(report([once]).scores);
    const r=report([once,light('음악','light_q2',{id:'r2',updatedAt:'2026-10-27T02:00:00Z'})]);
    expect(r.totalMovies).toBe(1);expect(r.primary).toBeNull();expect(r.scores.music).toBe(1);expect(r.scores.scene).toBe(0);expect(r.topKeywords).toEqual([{label:'음악',count:1}]);
  });
  it('combines valid Light/Core 40:60 without counting a film twice; missing AI is not a zero vector',()=>{
    const core=review({id:'core',mode:'core'}),cache:CachedTaste={reviewId:'core',analyzedAt:'now',signals:[{type:'music',strength:1,stance:'positive',evidence:'음악이 좋았다',questionKey:'q1'}]};
    const r=report([light('미장센'),core],[cache]);expect(r.totalMovies).toBe(1);expect(r.scores.scene).toBeCloseTo(.4);expect(r.scores.music).toBeCloseTo(.6);
    expect(report([light('미장센'),core]).scores.scene).toBe(1);
  });
  it('uses the strongest same-direction Core signal instead of rewarding repeated sentences',()=>{
    const signal={type:'scene' as const,strength:.4,stance:'positive' as const,evidence:'색감이 좋았다',questionKey:'q1'};
    const r=report([review({id:'core',mode:'core'})],[{reviewId:'core',analyzedAt:'now',signals:[signal,{...signal,evidence:'색감이 훌륭했다'}]}]);expect(r.scores.scene).toBeCloseTo(.4);
  });
  it('requires 3 valid films for provisional and 8 plus positive support for a representative',()=>{
    expect(report(movies('음악',2)).status).toBe('insufficient');expect(report(movies('음악',7)).status).toBe('provisional');
    expect(report(movies('음악',8)).status).toBe('representative');
    const mixed=[...movies('음악',4),...movies('미장센',4).map((r,i)=>({...r,id:`s${i}`,movieId:`s${i}`}))];expect(report(mixed).status).toBe('mixed');
    expect(report(Array.from({length:8},(_,i)=>light('음악','light_q1',{id:`r${i}`,movieId:`m${i}`}))).status).toBe('mixed');
  });
  it('ignores non-evidential films for confidence thresholds and recalculates after edit/delete',()=>{
    const records=[...movies('음악',2),...Array.from({length:6},(_,i)=>light('미등록','light_q2',{id:`x${i}`,movieId:`x${i}`}))];expect(report(records).status).toBe('insufficient');
    const initial=movies('음악',3);expect(report(initial).primary).toBe('music');expect(report(initial.slice(1)).primary).toBeNull();
    expect(report(initial.map(r=>({...r,...light('미장센'),id:r.id,movieId:r.movieId}))).primary).toBe('scene');
  });
  it('keeps rating/recency influence bounded, same-film histogram unique and wishlist weight zero',()=>{
    expect(filmRatingWeight(5,.5)).toBe(1.1);expect(filmRatingWeight(.5,5)).toBe(.9);expect(filmRatingWeight(null,4)).toBe(1);
    expect(filmRecencyWeight('2025-10-27','2026-10-27')).toBeCloseTo(.9);expect(filmRecencyWeight('2026-10-27','2026-10-27')).toBe(1);
    const r=report([light('미장센'),light('음악','light_q2',{id:'r2',rating:4.5,updatedAt:'2026-10-27T02:00:00Z'})]);expect(r.ratingCounts[4.5]).toBe(1);expect(r.ratingCounts[4]).toBe(0);expect(r.wishlistWeight).toBe(0);
  });
});
describe('server evidence boundary',()=>{
  const turns=[{key:'q1',question:'영화는 어땠나요?',answer:'음악은 좋았지만 서사는 별로였다. 불쾌해서 다시 보고 싶지 않다.'}];
  const signal={type:'music',strength:.9,stance:'positive',questionKey:'q1',evidence:'음악은 좋았지만'};
  it('accepts grounded positive/negative evidence but discards invented quotes and wrong keys',()=>{
    const valid=validateTasteSignals([signal,{...signal,type:'narrative',stance:'negative',evidence:'서사는 별로였다'},{...signal,evidence:'영상미가 아름다웠다'},{...signal,questionKey:'foreign'},{...signal,type:'admin'},{...signal,strength:2},{...signal,strength:NaN}],turns);
    expect(valid.map(s=>[s.type,s.stance])).toEqual([['music','positive'],['narrative','negative']]);
  });
  it('does not use a disliked unpleasant experience as positive aftereffect evidence',()=>{
    const r=report([review({id:'core',mode:'core'})],[{reviewId:'core',analyzedAt:'now',signals:validateTasteSignals([{...signal,type:'aftereffect',stance:'negative',evidence:'불쾌해서 다시 보고 싶지 않다'}],turns)}]);expect(r.scores.aftereffect).toBe(0);
    const positiveTurns=[{key:'q1',question:'감상은?',answer:'불쾌했지만 강렬한 경험이라 좋았다'}];
    const signals=validateTasteSignals([{...signal,type:'aftereffect',evidence:positiveTurns[0]!.answer}],positiveTurns);expect(signals[0]?.stance).toBe('positive');
  });
  it('requires answer-origin evidence, removes exact duplicates and blocks obvious sensitive input',()=>{
    expect(validateTasteSignals([{...signal,evidence:'영화는 어땠나요?'}],turns)).toEqual([]);
    expect(validateTasteSignals([signal,signal],turns)).toHaveLength(1);
    expect(sensitiveTasteInput([{key:'q',question:'감상',answer:'tester@example.com'}])).toBe(true);
    expect(sensitiveTasteInput(turns)).toBe(false);
  });
});
