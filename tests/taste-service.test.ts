import { beforeEach,describe,expect,it,vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),invoke:vi.fn()}));
vi.mock('../src/lib/supabase',()=>({supabase:{rpc:mocks.rpc,functions:{invoke:mocks.invoke}}}));
import { normalizeTasteState,loadTasteState,analyzeSavedTaste,subscribeTasteUpdates,tasteAnalysisMessage } from '../src/features/reports/taste-service';
import { freeTasteEnabled } from '../supabase/functions/_shared/taste-schema';
import type { ReviewRecord } from '../src/features/reviews/reviews';
import { emptyReviewForm } from '../src/features/reviews/review-logic';
import { AiOperationError } from '../src/features/reviews/ai-operations';

const record:ReviewRecord={...emptyReviewForm('m'),id:'r',mode:'core',status:'completed',createdAt:'now',updatedAt:'now',questions:[{key:'q1',text:'감상은?',sourceRule:'test',options:[]}],answers:{q1:'영상미와 색감이 좋았다'},movie:{id:'m',title:'영화',posterPath:null,originalTitle:null,releaseDate:null}};
const cached={reviewId:'r',analyzedAt:'now',source:{reviewId:'r',movieId:'m',movieTitle:'영화',turns:[{key:'q1',question:'감상은?',answer:'영상미와 색감이 좋았다'}]},signals:[{type:'scene',strength:.9,stance:'positive',questionKey:'q1',evidence:'영상미와 색감이 좋았다'}]};
beforeEach(()=>{vi.resetAllMocks();mocks.rpc.mockResolvedValue({data:{consent:true},error:null});});
describe('private analysis cache and save isolation',()=>{
  it('accepts current user-origin evidence and ignores changed sources or withdrawn consent',()=>{
    expect(normalizeTasteState({consent:true,analyses:[cached]},[record]).analyses).toHaveLength(1);
    expect(normalizeTasteState({consent:true,analyses:[cached]},[{...record,answers:{q1:'현재 내용으로 수정했다'}}]).analyses).toEqual([]);
    expect(normalizeTasteState({consent:true,analyses:[cached]},[]).analyses).toEqual([]);
    expect(normalizeTasteState({consent:false,analyses:[cached]},[record]).analyses).toEqual([]);
    expect(normalizeTasteState({consent:true,analyses:[cached]},[{...record,status:'draft'}]).analyses).toEqual([]);
  });
  it('rating and generated magazine changes do not change evidence origin',()=>{
    expect(normalizeTasteState({consent:true,analyses:[cached]},[{...record,rating:.5,body:'변경된 AI 매거진'}]).analyses).toHaveLength(1);
  });
  it('does not invoke any server or AI in demo mode',async()=>{
    expect(await loadTasteState([record],'demo')).toEqual({consent:false,analyses:[]});expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('does not invoke the AI function when the owner has not opted in',async()=>{
    mocks.rpc.mockResolvedValueOnce({data:{consent:false},error:null});await analyzeSavedTaste('r');expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('AI failure never rejects a completed save; success notifies mounted reports',async()=>{
    const update=vi.fn(),unsubscribe=subscribeTasteUpdates(update);
    mocks.invoke.mockResolvedValueOnce({data:{code:'daily_limit'},error:new Error('429')});
    await expect(analyzeSavedTaste('r')).resolves.toBeUndefined();expect(update).not.toHaveBeenCalled();
    mocks.invoke.mockResolvedValueOnce({data:{analyzed:true},error:null});await analyzeSavedTaste('r');expect(update).toHaveBeenCalledOnce();unsubscribe();
  });
  it('provides a free-cap error instead of a paid upgrade or empty success',()=>{
    expect(tasteAnalysisMessage(new AiOperationError('project_daily_limit'))).toContain('무료');
    expect(tasteAnalysisMessage(new AiOperationError('free_tier_limit'))).toContain('유료 모델로 전환하지');
  });
});
describe('fail-closed free-only capability',()=>{
  const now=Date.parse('2026-10-27T12:00:00Z'),settings={hasKey:true,model:'gemini-3.5-flash-lite',verified:'true',until:'2026-11-03T12:00:00Z'};
  it('permits only recently verified approved free models',()=>{
    expect(freeTasteEnabled(settings,now)).toBe(true);
    for(const change of [{verified:'false'},{verified:undefined},{hasKey:false},{model:'paid-model'},{until:'invalid'},{until:'2026-10-26T00:00:00Z'},{until:'2030-01-01T00:00:00Z'}])expect(freeTasteEnabled({...settings,...change},now)).toBe(false);
  });
});
