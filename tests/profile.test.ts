import { describe,expect,it } from 'vitest';
import { millisecondsToLocalMidnight,normalizeSavedPage,mergeSavedPage,profileCalendar,profileSummary } from '../src/features/profile/profile-model';
import { emptyReviewForm } from '../src/features/reviews/review-logic';
import type { ReviewRecord } from '../src/features/reviews/reviews';

const id='00000000-0000-4000-8000-000000000001';
function record(patch:Partial<ReviewRecord>={}):ReviewRecord {
  return {...emptyReviewForm('movie-1'),id:'review-1',status:'completed',rating:4,watchedAt:'2026-10-27',createdAt:'2026-10-27T01:00:00Z',updatedAt:'2026-10-27T01:00:00Z',movie:{id:'movie-1',title:'테스트 영화',originalTitle:null,posterPath:null,releaseDate:null},...patch};
}
describe('own profile summary and calendar',()=>{
  it('counts unique completed movies, not drafts or duplicate viewings',()=>{
    const summary=profileSummary([record(),record({id:'second',rating:5}),record({id:'draft',status:'draft',movieId:'other',rating:1})],'2026-10-27');
    expect(summary.watchedMovies).toBe(1);expect(summary.report.total).toBe(2);expect(summary.report.averageRating).toBe(4.5);
  });
  it('deduplicates keywords within one review and computes actual aspect percentages',()=>{
    const lightFlow={version:1 as const,responses:{},changed:[],aspects:['연기','연기','미장센'],representativeKeywords:['따뜻한','긴 여운'],draftSource:'manual' as const};
    const summary=profileSummary([record({keywordIds:['warm'],lightFlow}),record({id:'second',lightFlow:{...lightFlow,aspects:['연기']}})],'2026-10-27');
    expect(summary.keywords.find(k=>k.label==='따뜻한')?.count).toBe(2);expect(summary.dominant).toEqual({label:'연기',percent:67});
    expect(profileSummary([],'2026-10-27').dominant).toBeNull();
  });
  it('uses four to six actual month rows and newest same-day poster, excluding drafts',()=>{
    expect(profileCalendar('2026-02',[])).toHaveLength(28);
    expect(profileCalendar('2026-08',[])).toHaveLength(42);
    const day=profileCalendar('2026-10',[record(),record({id:'latest',updatedAt:'2026-10-27T02:00:00Z'}),record({id:'draft',status:'draft'})]).find(d=>d.date==='2026-10-27');
    expect(day?.completedCount).toBe(2);expect(day?.reviews.map(r=>r.id)).toEqual(['latest','review-1']);
  });
  it('schedules the next local midnight instead of a fixed 24-hour refresh',()=>{
    expect(millisecondsToLocalMidnight(new Date(2026,9,27,23,59,59,900))).toBe(100);
    expect(millisecondsToLocalMidnight(new Date(2026,9,27,0,0))).toBe(86400000);
  });
});
describe('saved-content boundary',()=>{
  it('rejects malformed pages and filters unknown records or unsafe media paths',()=>{
    expect(()=>normalizeSavedPage(null)).toThrow();expect(()=>normalizeSavedPage({items:'wrong'})).toThrow();
    const page=normalizeSavedPage({total:3,items:[null,{id,kind:'admin'}, {id,kind:'movie',title:'영화',posterPath:'https://evil.test/image',coverPath:'../other.jpg'}]});
    expect(page.items).toHaveLength(1);expect(page.items[0]?.posterPath).toBeNull();expect(page.items[0]?.coverPath).toBeNull();
  });
  it('does not expose a spoiler excerpt and preserves original content identifiers',()=>{
    const page=normalizeSavedPage({total:1,items:[{id,kind:'review',title:'영화',spoiler:true,bodyExcerpt:'스포일러',posterPath:'/poster.jpg',coverPath:`${id}/${id}.jpg`,keywords:['따뜻한'],rating:'4.5'}]});
    expect(page.items[0]).toMatchObject({id,bodyExcerpt:'',rating:4.5,posterPath:'/poster.jpg',keywords:['따뜻한']});
  });
  it('merges overlapping pages without duplicate cards',()=>{
    const first=normalizeSavedPage({total:2,items:[{id,kind:'movie',title:'전'}]});
    const next=normalizeSavedPage({total:1,items:[{id,kind:'movie',title:'갱신'}]});
    expect(mergeSavedPage(first,next)).toMatchObject({total:1,items:[{title:'갱신'}]});
  });
});
