/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { blockFromText, coreFlowIssue, coreTurns, magazineText, manualMagazine, newCoreForm, replaceCoreQuestion, updateMagazine } from '../src/features/reviews/core-flow';
import { fallbackCoreQuestion } from '../src/features/reviews/core-questions';
import { reviewCompletionIssue, type ReviewForm } from '../src/features/reviews/review-logic';
import type { Movie } from '../src/features/discovery/movies';

const movie={id:'m1',title:'테스트 영화',genres:['드라마'],details:null} as Movie;
const answered=():ReviewForm=>{const form=newCoreForm(movie);return {...form,rating:0.5,answers:{core_q1:'도시 속 고립된 인물의 선택이 오래 기억에 남았어요.'}};};
describe('Figma Core early finish and safe magazine',()=>{
  it('starts private with one contextual question and no invented result',()=>{
    const form=newCoreForm(movie);
    expect(form.visibility).toBe('private');expect(form.questions).toHaveLength(1);expect(form.questions[0]?.text).toContain(movie.title);
    expect(form.coreFlow?.blocks).toEqual([]);expect(coreTurns(form)).toEqual([]);
  });
  it('allows early completion after one answer, with a half-star and user-reviewed magazine',()=>{
    const form=manualMagazine(answered(),movie.title);
    expect(reviewCompletionIssue(form)).toBeNull();expect(form.body).toBe(form.answers.core_q1);
    expect(form.coreFlow?.source).toBe('manual');expect(form.coreFlow?.stage).toBe('summary');
    expect(form.coreFlow?.keywords).toEqual([]);expect(form.questions).toHaveLength(1);
  });
  it('supports five answers and limits original-text fallback to 1000 including title and spaces',()=>{
    const form=answered();form.questions=Array.from({length:5},(_,i)=>fallbackCoreQuestion(i,movie.title));
    form.answers=Object.fromEntries(form.questions.map(q=>[q.key,'감상'.repeat(500)]));
    const result=manualMagazine(form,movie.title);
    expect(coreTurns(result)).toHaveLength(5);expect(magazineText(result.coreFlow!).length).toBeLessThanOrEqual(1000);
    expect(reviewCompletionIssue(result)).toBeNull();
  });
  it('rejects short answers, unsynchronized bodies, empty articles and overlong magazines',()=>{
    const form=manualMagazine(answered(),movie.title);
    expect(coreFlowIssue({...form,answers:{core_q1:'짧음'}})).toContain('10~1,000');
    expect(coreFlowIssue({...form,body:'다른 내용'})).toContain('다시 확인');
    expect(coreFlowIssue(updateMagazine(form,{...form.coreFlow!,blocks:[blockFromText('')]}))).toContain('제목과 본문');
    expect(coreFlowIssue(updateMagazine(form,{...form.coreFlow!,blocks:[blockFromText('가'.repeat(1001))]}))).toContain('1,000');
  });
  it('consumes replacement once and removes only dependent turns, preserving existing edited magazine',()=>{
    let form=manualMagazine(answered(),movie.title);
    form={...form,questions:[...form.questions,fallbackCoreQuestion(1,movie.title)],answers:{...form.answers,core_q2:'두 번째 감상도 자세하게 남겨 보았습니다.'}};
    const changed=replaceCoreQuestion(form,0,{...form.questions[0]!,text:'다른 질문을 충분히 길게 제공해 주세요.'});
    expect(changed.coreFlow?.changed).toEqual(['core_q1']);expect(changed.questions).toHaveLength(1);expect(changed.answers).toEqual({});
    expect(changed.body).toBe(form.body);expect(replaceCoreQuestion(changed,0,form.questions[0]!)).toBe(changed);
  });
  it('keeps legacy Core completion contract intact',()=>{
    const form=answered();delete form.coreFlow;
    expect(reviewCompletionIssue(form)?.message).toContain('Q5');
  });
  it('renders safe structured blocks rather than HTML and constrains speech to local-only support',()=>{
    expect(readFileSync('src/features/reviews/core-magazine.tsx','utf8')).not.toContain('dangerouslySetInnerHTML');
    const speech=readFileSync('src/features/reviews/core-speech.web.ts','utf8');
    expect(speech).toContain('recognition.processLocally=true');expect(speech).toContain("!=='available'");
    expect(speech).not.toContain('processLocally=false');
  });
  it('requires verified free tier before new-mode AI calls and never adds paid fallbacks',()=>{
    for(const path of ['generate-core-question','generate-core-review-draft']){
      const source=readFileSync(`supabase/functions/${path}/index.ts`,'utf8');
      expect(source).toContain("Deno.env.get('CORE_FREE_AI_VERIFIED') !== 'true'");
      expect(source).toContain("geminiModel !== 'gemini-3.5-flash-lite'");
      expect(source).toContain('claimAi(');expect(source).not.toMatch(/gemini-pro|openai.com|texttospeech|speech.googleapis/);
    }
  });
});
