/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { guestAiAllowed, guestKeywords, guestResponses, guestSessionActive, guestStorageKey, restoreGuestForm, withGuestKeywords } from '../src/features/exhibition/exhibition-logic';
import { newLightForm, respondToLight } from '../src/features/reviews/light-flow';
import { newCoreForm } from '../src/features/reviews/core-flow';
import type { Movie } from '../src/features/discovery/discovery-logic';
const movie = { id:'10000000-0000-4000-8000-000000000001',title:'테스트',genres:[],details:null } as unknown as Movie;
describe('isolated free exhibition',()=>{
 it('recognizes expired and invalid sessions even without AI consent',()=>{
  const guest={user_id:'a',expires_at:new Date(2000).toISOString(),adult_confirmed:false,ai_consent:false};
  expect(guestSessionActive(guest,1999)).toBe(true);
  expect(guestSessionActive(guest,2000)).toBe(false);
  expect(guestSessionActive({...guest,expires_at:'invalid'},1000)).toBe(false);
  expect(guestSessionActive(null,1000)).toBe(false);
 });
 it('requires server enrollment, adult confirmation, consent and a live session for AI',()=>{
  const g={user_id:'a',expires_at:new Date(2000).toISOString(),adult_confirmed:true,ai_consent:true};
  expect(guestAiAllowed(g,1000)).toBe(true);expect(guestAiAllowed(g,2000)).toBe(false);
  expect(guestAiAllowed({...g,adult_confirmed:false},1000)).toBe(false);expect(guestAiAllowed({...g,ai_consent:false},1000)).toBe(false);expect(guestAiAllowed(null)).toBe(false);
 });
 it('keeps device backups scoped by UID, and rejects malformed/public restores',()=>{
  const form=newLightForm(movie), value={movie,form,index:0,summary:false};
  expect(guestStorageKey('a')).not.toBe(guestStorageKey('b'));
  expect(restoreGuestForm(JSON.stringify(value))?.form.visibility).toBe('private');
  for(const raw of ['{',JSON.stringify({...value,index:9}),JSON.stringify({...value,form:{...form,visibility:'public'}})])expect(restoreGuestForm(raw)).toBeNull();
 });
 it('preserves selected labels, skipped questions and editable representative keywords',()=>{
  let form=newLightForm(movie);form.questionTags.light_q1=['feeling_0'];form=respondToLight(form,0,false);form=respondToLight(form,1,true);
  expect(guestResponses(form)[0]?.answer).toBe('몽환적인');expect(guestResponses(form)[1]?.answer).toBe('');
  expect(guestKeywords(form)).toEqual([]);form.lightFlow!.representativeKeywords=['여운'];expect(guestKeywords(form)).toEqual(['여운']);
 });
 it('saves current edits without a blur race and allows removing every keyword',()=>{let form=withGuestKeywords(newLightForm(movie),'여운, 여운, 감동');expect(guestKeywords(form)).toEqual(['여운','감동']);form=withGuestKeywords(form,'');expect(guestKeywords(form)).toEqual([]);});
 it('does not invent Core answers or personal taste reports',()=>{const form=newCoreForm(movie);expect(guestResponses(form)[0]?.answer).toBe('');expect(guestKeywords(form)).toEqual([]);});
 it('uses a distinct auth storage and never the member singleton for guest writes',()=>{
  const text=readFileSync('src/features/exhibition/exhibition-service.ts','utf8');
  expect(text).toContain("storageKey: 'flick-exhibition-auth-v1'");expect(text).toContain('detectSessionInUrl: false');expect(text).not.toContain("from '@/lib/supabase'");expect(text).toContain('save_exhibition_record');
 });
 it('guards old definer RPC mutations, storage and server quotas, not just buttons',()=>{
  const sql=readFileSync('supabase/migrations/202611050002_exhibition.sql','utf8');
  expect(sql).toContain('auth.users where id=auth.uid() and is_anonymous');expect(sql).toContain('before insert or update or delete');expect(sql).toContain('as restrictive for all');expect(sql).toContain("'America/Los_Angeles'");expect(sql).toContain('pg_advisory_xact_lock');expect(sql).toContain('>=8');expect(sql).toContain('default 400');expect(sql).toContain('default 12');
 });
});
