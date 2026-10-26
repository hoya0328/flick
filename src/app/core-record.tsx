import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DesignVector } from '@/components/design-vector';
import { homeFont } from '@/components/home-ui';
import { PosterArt } from '@/components/poster-art';
import { discoverMovies, getMovie, type Movie } from '@/features/discovery/movies';
import { aiOperationMessage } from '@/features/reviews/ai-operations';
import { CoreEditor } from '@/features/reviews/core-editor';
import { blockFromText, coreTurns, magazineText, manualMagazine, newCoreForm, replaceCoreQuestion, updateMagazine } from '@/features/reviews/core-flow';
import { requestCoreFeedback, requestCoreMagazine } from '@/features/reviews/core-flow-service';
import { CoreMagazine } from '@/features/reviews/core-magazine';
import { addCorePhoto, CorePhoto } from '@/features/reviews/core-photo';
import { fallbackCoreQuestion } from '@/features/reviews/core-questions';
import { startCoreSpeech } from '@/features/reviews/core-speech';
import { LoadingMark } from '@/features/reviews/loading-mark';
import { ratingMessage } from '@/features/reviews/light-flow';
import { RatingControl } from '@/features/reviews/rating-control';
import { isValidWatchedAt, reviewCompletionIssue, type ReviewForm } from '@/features/reviews/review-logic';
import { getDraftForMovie, getReview, saveReview } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';

type Step='search'|'confirm'|'rating'|'question'|'feedback'|'loading'|'summary'|'edit';
type Dialog='info'|'replace'|'privacy'|'leave'|null;
const one=(x:string|string[]|undefined)=>Array.isArray(x)?x[0]:x;
const disclaimer='본 서비스는 생성형 AI 기술을 활용하여 정보를 제공합니다. AI의 특성상 부정확하거나 편향된 정보가 포함될 수 있으며, 모든 결과물에 대한 최종 판단은 사용자 본인에게 있습니다.';
const placeholder='지금 머릿속에 가장 먼저 맴도는 단어나 느낌을 적어보세요!\n완벽한 문장이 아니어도 괜찮아요. (10자 이상)\n\n예시) 외롭다, 흔들리는 카메라, 파인애플 통조림, 유통기한\n예시) 사람은 엄청 많은데 왠지 쓸쓸하고 축축한 느낌\n\n물론, 남겨주시는 감상이 길어질수록 리뷰의 깊이와 해상도는 훨씬 더 정교해집니다.';
function Action({label,onPress,disabled=false,secondary=false}:{label:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}){return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={[s.action,secondary&&s.secondary,disabled&&{opacity:.45}]}><Text style={[s.actionText,secondary&&{color:'#99A1AF'}]}>{label}</Text></Pressable>;}

export default function CoreRecordScreen(){
  const identity=useSession();
  // A demo form or another account's in-memory draft must never cross login.
  return <CoreRecordFlow key={`${identity.mode}:${identity.email??''}`}/>;
}
function CoreRecordFlow(){
  const params=useLocalSearchParams<{movieId?:string;reviewId?:string}>();
  const session=useSession();
  const storageMode=session.mode==='supabase'?'supabase':'demo';
  const [step,setStep]=useState<Step>('search');
  const [form,setForm]=useState<ReviewForm|null>(null);
  const [movie,setMovie]=useState<Movie|null>(null);
  const [reviewId,setReviewId]=useState<string|null>(null);
  const [wasCompleted,setWasCompleted]=useState(false);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<Movie[]>([]);
  const [busy,setBusy]=useState(false);
  const [initializing,setInitializing]=useState(false);
  const [searching,setSearching]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [dialog,setDialog]=useState<Dialog>(null);
  const [consent,setConsent]=useState(false);
  const [progress,setProgress]=useState(0);
  const [listening,setListening]=useState(false);
  const [editReturn,setEditReturn]=useState<Step>('summary');
  const scroll=useRef<ScrollView>(null);
  const answerInput=useRef<TextInput>(null);
  const active=useRef(true);
  const lock=useRef(false);
  const revision=useRef(0);
  const queue=useRef(Promise.resolve());
  const initialized=useRef('');
  const current=useRef(form);
  useEffect(()=>{current.current=form;},[form]);
  const stopSpeech=useRef<(()=>void)|null>(null);
  const speechRequest=useRef(0);
  const backupKey=(movieId:string,id:string|null)=>`flick.core.v1.${encodeURIComponent(session.email??storageMode)}.${movieId}.${id??'draft'}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Revision is a request counter, not a host element ref.
  useEffect(()=>{active.current=true;return()=>{active.current=false;revision.current++;stopSpeech.current?.();};},[]);
  useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false});},[step,form?.coreFlow?.index]);
  useEffect(()=>{speechRequest.current++;stopSpeech.current?.();stopSpeech.current=null;},[step,form?.coreFlow?.index]);
  useEffect(()=>{
    if(!form||!movie)return;
    const key=backupKey(form.movieId,reviewId);
    queue.current=queue.current.catch(()=>{}).then(()=>AsyncStorage.setItem(key,JSON.stringify({form,reviewId}))).catch(()=>{if(active.current)setNotice('기기 임시 저장에 실패했어요. 안내 메뉴에서 초안 저장을 눌러 주세요.');});
  // Identity changes remount via the auth boundary; never share another user's backup.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[form,movie,reviewId,session.email,storageMode]);
  useEffect(()=>{
    if(session.status!=='ready'||session.mode==='none')return;
    const id=one(params.reviewId),mid=one(params.movieId);
    const key=`${storageMode}:${session.email}:${id??mid??''}`;
    if((!id&&!mid)||initialized.current===key)return;
    initialized.current=key;let valid=true;setInitializing(true);setError('');
    void(async()=>{try{
      const record=id?await getReview(id,storageMode):await getDraftForMovie(mid!,storageMode);
      if(id&&!record)throw new Error('본인의 기록만 수정할 수 있어요.');
      if(record&&!record.coreFlow){router.replace({pathname:record.lightFlow?'/light-record':'/(tabs)/record',params:{reviewId:record.id}});return;}
      const nextMovie=await getMovie(record?.movieId??mid!);
      if(!nextMovie)throw new Error('영화를 불러오지 못했어요. 검색에서 다시 선택해 주세요.');
      const saved=await AsyncStorage.getItem(backupKey(nextMovie.id,record?.id??null));
      let restored:ReviewForm|undefined;
      try{const local=saved?JSON.parse(saved):null;if(local?.form?.coreFlow?.version===1&&local.form.movieId===nextMovie.id&&local.reviewId===(record?.id??null))restored=local.form;}catch{/* Server record remains available. */}
      if(!valid)return;
      const next=restored??record??newCoreForm(nextMovie);
      setMovie(nextMovie);setForm(next);setReviewId(record?.id??null);setWasCompleted(record?.status==='completed');
      setStep(record?.status==='completed'?'summary':restored||record?(!next.rating?'rating':next.coreFlow?.stage??'question'):'confirm');
      if(restored)setNotice('이 계정에서 작성하던 임시 기록을 복원했어요.');
    }catch(caught){if(valid)setError(caught instanceof Error?caught.message:'기록을 불러오지 못했어요.');}finally{if(valid)setInitializing(false);}})();
    return()=>{valid=false;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[params.movieId,params.reviewId,session.status,session.mode,session.email,storageMode]);
  useEffect(()=>{
    if(step!=='search'||session.mode==='none')return;
    let valid=true;const timer=setTimeout(()=>{setSearching(true);void discoverMovies(query).then((r)=>{if(valid)setResults(r.movies);}).catch(()=>{if(valid)setError('영화 검색에 실패했어요. 다시 시도해 주세요.');}).finally(()=>{if(valid)setSearching(false);});},300);
    return()=>{valid=false;clearTimeout(timer);};
  },[query,step,session.mode]);
  function update(apply:(f:ReviewForm)=>ReviewForm){if(lock.current)return;revision.current++;setForm(f=>f?apply(f):f);setError('');}
  function changeStep(next:Step){stopSpeech.current?.();setError('');setStep(next);}
  async function selectMovie(item:Movie){
    if(lock.current)return;lock.current=true;setBusy(true);
    try{const draft=await getDraftForMovie(item.id,storageMode);if(draft){router.setParams({movieId:item.id,reviewId:draft.id});return;}setMovie(item);setForm(newCoreForm(item));setReviewId(null);setWasCompleted(false);setNotice('');setStep('confirm');initialized.current=`${storageMode}:${session.email}:${item.id}`;router.setParams({movieId:item.id});}
    catch{setError('작성 중인 기록을 확인하지 못했어요. 다시 시도해 주세요.');}finally{lock.current=false;setBusy(false);}
  }
  function move(stage:'question'|'feedback'|'summary',next:ReviewForm){setForm({...next,coreFlow:{...next.coreFlow!,stage}});setStep(stage);}
  async function feedback(){
    if(!form||!movie||lock.current)return;
    const flow=form.coreFlow!,q=form.questions[flow.index]!;
    stopSpeech.current?.();
    if((form.answers[q.key]?.trim().length??0)<10){setError('이 질문의 감상을 10자 이상 입력해야 합니다.');answerInput.current?.focus();return;}
    lock.current=true;setBusy(true);setError('');setNotice('');const token=++revision.current;
    let text='지금 남긴 감상에서 가장 구체적인 장면이나 감정을 한 가지 골라 보세요. 그 장면의 연출, 인물의 선택과 연결해 생각하면 나만의 해석이 더 선명해질 수 있어요. 정답을 찾기보다 영화가 나에게 남긴 이유를 천천히 이어서 적어보세요.';
    let question=fallbackCoreQuestion(flow.index+1,movie.title);
    let source:'manual'|'gemini'='manual';
    try{if(consent&&storageMode==='supabase'){const r=await requestCoreFeedback(form,'feedback');text=r.feedback;question={key:`core_q${flow.index+2}`,text:r.question,sourceRule:'core-flow-gemini-v1',options:[]};source='gemini';}else setNotice(storageMode==='demo'?'데모에서는 AI를 호출하지 않고 기본 작성 가이드를 보여드려요.':'AI 동의 없이 기본 가이드와 질문으로 이어갈 수 있어요.');}
    catch(caught){setNotice(`${aiOperationMessage(caught)} 기본 작성 가이드로 계속할 수 있어요.`);}
    finally{if(active.current&&token===revision.current){move('feedback',{...form,coreFlow:{...flow,feedback:{...flow.feedback,[q.key]:{text,source}},nextQuestions:flow.index<4?{...flow.nextQuestions,[q.key]:question}:flow.nextQuestions}});}lock.current=false;if(active.current)setBusy(false);}
  }
  function continueQuestion(){if(!form)return;const f=form.coreFlow!,q=form.questions[f.index]!;const next=f.nextQuestions[q.key];if(!next||f.index>=4)return;move('question',{...form,questions:[...form.questions.slice(0,f.index+1),next],coreFlow:{...f,index:f.index+1}});}
  async function replaceQuestion(){
    if(!form||!movie||lock.current)return;const flow=form.coreFlow!,q=form.questions[flow.index]!;
    if(flow.changed.includes(q.key))return;
    setDialog(null);lock.current=true;setBusy(true);setError('');const token=++revision.current;
    let next={key:q.key,text:`「${movie.title}」${['의 첫인상과 마지막 인상은 어떻게 달랐나요?','에서 가장 마음이 쓰인 인물과 그 이유는 무엇인가요?','의 소리나 색채가 당신의 감정에 어떻게 작용했나요?','를 다르게 해석할 수 있는 장면이 있었나요?','를 다른 사람에게 한 문장으로 소개한다면 무엇을 남기고 싶나요?'][flow.index]}`,sourceRule:'core-flow-alternate-v1',options:[]};
    try{if(consent&&storageMode==='supabase'){const r=await requestCoreFeedback(form,'replace');next={...next,text:r.question,sourceRule:'core-flow-gemini-alternate-v1'};}}
    catch(caught){setNotice(`${aiOperationMessage(caught)} 다른 관점의 기본 질문을 제공해요.`);}
    finally{if(active.current&&token===revision.current){setForm(replaceCoreQuestion(form,flow.index,next));setStep('question');}lock.current=false;if(active.current)setBusy(false);}
  }
  async function summarize(){
    if(!form||!movie||lock.current)return;
    if(!coreTurns(form).length){setError('감상을 먼저 10자 이상 작성해 주세요.');return;}
    if(form.coreFlow!.blocks.length){move('summary',form);return;}
    lock.current=true;setBusy(true);setError('');setNotice('');setStep('loading');setProgress(8);const token=++revision.current;
    const timer=setInterval(()=>setProgress(p=>Math.min(94,p+Math.max(1,Math.round((96-p)/5)))),400);
    try{
      let next:ReviewForm;
      if(consent&&storageMode==='supabase'){const result=await requestCoreMagazine(form);next=updateMagazine(form,{...form.coreFlow!,stage:'summary',title:result.title,blocks:result.draft.split(/\n\s*\n/).filter(Boolean).map((p,i)=>blockFromText(p,`p${i}`)),keywords:result.keywords,source:'gemini'});}
      else{next=manualMagazine(form,movie.title);setNotice('AI 미사용 · 답변 원문을 모았어요. 제목과 본문을 직접 다듬고 저장해 주세요.');await new Promise(r=>setTimeout(r,500));}
      if(active.current&&token===revision.current){setProgress(100);move('summary',next);}
    }catch(caught){if(active.current&&token===revision.current){move('summary',manualMagazine(form,movie.title));setNotice(`${aiOperationMessage(caught)} 유료 대체 없이 답변 원문을 모았어요. 직접 편집해 주세요.`);}}
    finally{clearInterval(timer);lock.current=false;if(active.current)setBusy(false);}
  }
  async function persist(complete:boolean,leave=false){
    if(!form||!movie||lock.current)return;
    if(complete){const issue=reviewCompletionIssue(form);if(issue){setError(issue.message);if(issue.field==='rating')setStep('rating');else if(issue.field==='watchedAt')setStep('confirm');else{const missing=form.questions.findIndex(q=>(form.answers[q.key]?.trim().length??0)<10);if(missing>=0){setForm({...form,coreFlow:{...form.coreFlow!,index:missing,stage:'question'}});setStep('question');requestAnimationFrame(()=>answerInput.current?.focus());}else setStep('edit');}return;}}
    lock.current=true;setBusy(true);setError('');
    try{await queue.current;if(!complete&&wasCompleted){setDialog(null);setNotice('수정사항을 이 계정의 기기 임시 기록에 보관했어요. 기존 완료 기록은 기록 완료를 눌러야 변경됩니다.');if(leave)router.replace('/(tabs)/archive');return;}const id=await saveReview(form,reviewId,complete,storageMode,movie.title);await AsyncStorage.removeItem(backupKey(form.movieId,reviewId));setReviewId(id);setDialog(null);setNotice('초안을 서버에 저장했어요.');if(complete||leave){await AsyncStorage.removeItem(backupKey(form.movieId,id));router.replace('/(tabs)/archive');}}
    catch(caught){setError(`저장하지 못했어요. 기기 임시 기록은 유지돼요. ${caught instanceof Error?caught.message:''}`);}
    finally{lock.current=false;if(active.current)setBusy(false);}
  }
  async function photo(index:number|null){
    if(!form||lock.current)return;if(storageMode==='demo'){setNotice('사진 저장은 실제 계정에서 사용할 수 있어요. 데모는 사진을 업로드하지 않아요.');return;}
    if(index!==null&&!form.coreFlow!.blocks[index]?.photo&&form.coreFlow!.blocks.filter(b=>b.photo).length>=3){setError('본문 사진은 최대 3장까지 추가할 수 있어요.');return;}
    lock.current=true;setBusy(true);const token=++revision.current;
    try{const path=await addCorePhoto();if(path&&active.current&&token===revision.current){const flow=form.coreFlow!;setForm(updateMagazine(form,{...flow,cover:index===null?path:flow.cover,blocks:index===null?flow.blocks:flow.blocks.map((b,i)=>i===index?{...b,photo:path}:b)}));}}
    catch(caught){setError(caught instanceof Error?caught.message:'사진을 추가하지 못했어요.');}finally{lock.current=false;if(active.current)setBusy(false);}
  }
  async function microphone(){
    if(listening){speechRequest.current++;stopSpeech.current?.();stopSpeech.current=null;setListening(false);return;}
    if(lock.current)return;
    const speechToken=++speechRequest.current;
    try{setListening(true);const stop=await startCoreSpeech(text=>{const f=current.current;if(!f||!active.current)return;const q=f.questions[f.coreFlow!.index];if(q)setForm({...f,answers:{...f.answers,[q.key]:`${f.answers[q.key]??''} ${text}`.trim().slice(0,1000)}});},()=>{if(active.current&&speechToken===speechRequest.current)setListening(false);});if(!active.current||speechToken!==speechRequest.current){stop();return;}stopSpeech.current=stop;}
    catch(caught){setListening(false);setNotice(caught instanceof Error?caught.message:'기기 내 음성 입력을 사용할 수 없어요.');}
  }
  function back(){if(busy)return;if(step==='edit'){if(magazineText(form!.coreFlow!).length>1000){setError('제목과 본문을 합쳐 1,000자 이내로 줄여 주세요.');return;}changeStep(editReturn);}else if(step==='feedback')changeStep('question');else if(step==='rating')changeStep('confirm');else if(step==='confirm')changeStep('search');else if(form)setDialog('leave');else router.back();}

  if(session.status==='loading')return <SafeAreaView style={s.safe}><ActivityIndicator/></SafeAreaView>;
  if(session.mode==='none')return <Redirect href="/welcome"/>;
  if(!session.onboardingComplete)return <Redirect href="/onboarding"/>;
  const flow=form?.coreFlow,question=flow?form?.questions[flow.index]:null;
  const feedbackText=question?flow?.feedback[question.key]:null;
  const director=movie?[movie.details?.directorNames.join(', '),movie.releaseDate?.slice(0,4)].filter(Boolean).join(' · '):'';
  return <SafeAreaView style={s.safe} edges={['top','bottom']}><KeyboardAvoidingView style={s.frame} behavior={Platform.OS==='ios'?'padding':undefined}>
    {step==='loading'?<View style={s.loading}><LoadingMark label="매거진 생성 중"/><Text style={s.loadingTitle}>매거진을 생성하는 중입니다</Text><Text accessibilityLiveRegion="polite" style={s.loadingCaption}>잠시만 기다려주세요... {progress}%</Text></View>:<>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="이전 단계" disabled={busy} onPress={back} style={[s.icon,s.back]}><DesignVector name="back"/></Pressable>
        {step==='summary'?<Pressable accessibilityRole="button" accessibilityLabel="리뷰 공개 범위 선택" onPress={()=>setDialog('privacy')} style={s.headerCenter}><Text style={s.headerTitle}>리뷰 · {form?.visibility==='public'?'전체':'나만'}</Text><DesignVector name="dateArrow"/></Pressable>:<Text style={[s.headerTitle,s.headerCenter]}>{step==='search'?'영화 검색':step==='edit'?'수정하기':'집중해서 기록하기'}</Text>}
        {step==='edit'?<Pressable accessibilityRole="button" accessibilityLabel="매거진 수정 완료" disabled={busy} onPress={back} style={[s.icon,s.right,{width:65,right:11}]}><Text style={s.done}>완료</Text></Pressable>:<Pressable accessibilityRole="button" accessibilityLabel={step==='summary'?'매거진 편집':'기록 안내와 초안 저장'} disabled={busy} onPress={()=>{if(step==='summary'){setEditReturn('summary');changeStep('edit');}else setDialog('info');}} style={[s.icon,s.right]}><DesignVector name={step==='summary'?'coreEdit':'info'}/></Pressable>}
      </View>
      {initializing?<ActivityIndicator color="#F8233C"/>:null}
      {step==='edit'&&form&&flow?<CoreEditor flow={flow} onChange={f=>update(current=>updateMagazine(current,f))} onPhoto={i=>void photo(i)} busy={busy}/>:<ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{flex:1}} contentContainerStyle={step==='summary'?s.summaryContent:s.content}>
        {step==='search'?<><View style={s.search}><DesignVector name="searchInput"/><TextInput accessibilityLabel="기록할 영화 검색" placeholder="영화 제목으로 검색해 보세요" value={query} onChangeText={setQuery} style={s.searchInput}/></View><Text style={s.searchHint}>영화 제목을 검색해 기록을 시작할 수 있어요</Text>{searching?<ActivityIndicator color="#F8233C"/>:null}{!searching&&!results.length?<Text style={s.muted}>검색 결과가 없어요. 다른 제목으로 검색해 주세요.</Text>:null}{results.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.title} 선택`} disabled={busy} onPress={()=>void selectMovie(item)} style={s.result}><PosterArt compact movie={item} style={{width:48,height:70,borderRadius:5}}/><View style={{flex:1}}><Text style={s.resultTitle}>{item.title}</Text><Text style={s.muted}>{item.releaseDate?.slice(0,4)} · {item.genres.slice(0,2).join(', ')}</Text></View><DesignVector name="chevron" width={7}/></Pressable>)}</>:null}
        {step==='confirm'&&movie&&form?<View style={{paddingTop:7}}><PosterArt movie={movie} style={{width:201,height:287,borderRadius:8,alignSelf:'center'}}/><Text style={s.movieTitle}>{movie.title}</Text><Text style={s.director}>{director}</Text><Text numberOfLines={4} style={s.overview}>{movie.overview||'등록된 줄거리 정보가 없어요.'}</Text><TextInput accessibilityLabel="영화 감상일 YYYY-MM-DD" value={form.watchedAt} maxLength={10} editable={!busy} onChangeText={watchedAt=>update(f=>({...f,watchedAt}))} style={s.dateInput}/><Text style={s.searchHint}>영화를 감상하신 날짜를 확인해 주세요</Text></View>:null}
        {step==='rating'&&movie&&form?<View style={{paddingTop:28}}><PosterArt compact movie={movie} style={{width:77,height:111,borderRadius:8,alignSelf:'center'}}/><Text style={s.movieTitle}>{movie.title}</Text><Text style={s.director}>{director}</Text><Text style={s.ratingHeading}>이 영화 어땠나요?</Text><RatingControl value={form.rating} onChange={rating=>update(f=>({...f,rating}))}/><Text style={s.ratingCaption}>{ratingMessage(form.rating)}</Text><Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} aria-checked={consent} onPress={()=>setConsent(!consent)} style={s.consent}><View style={[s.checkbox,consent&&{backgroundColor:'#F8233C'}]}>{consent?<DesignVector name="check" width={12} height={10}/>:null}</View><Text style={s.consentText}>무료 Gemini로 영화 정보·질문·답변을 보내 코멘트와 매거진 초안을 만드는 데 동의해요. Google 서비스 개선에 사용될 수 있으니 개인정보·민감정보는 입력하지 마세요. 동의하지 않아도 직접 기록할 수 있어요. (선택)</Text></Pressable></View>:null}
        {(step==='question'||step==='feedback')&&form&&flow&&question?<>
          <View accessibilityRole="progressbar" accessibilityLabel="집중 기록 질문 진행" accessibilityValue={{min:0,max:5,now:flow.index+1}} style={s.progress}><View style={[s.progressFill,{width:`${(flow.index+1)*20}%`}]}/></View>
          <View style={[s.questionPanel,step==='feedback'&&s.feedbackPanel]}>
            <Text numberOfLines={1} style={s.metadata}>{movie?.title} {director?'· '+director:''}</Text>
            {step==='question'?<Pressable accessibilityRole="button" accessibilityLabel={flow.changed.includes(question.key)?'질문 변경 완료':'질문 변경 1회'} accessibilityState={{disabled:busy||flow.changed.includes(question.key)}} disabled={busy||flow.changed.includes(question.key)} onPress={()=>setDialog('replace')} style={[s.replace,flow.changed.includes(question.key)&&{opacity:.4}]}><DesignVector name="replaceQuestion"/></Pressable>:null}
            <Text style={s.questionText}><Text style={{fontWeight:'700'}}>Q{flow.index+1}.{'\n'}</Text>{question.text}</Text>
            {step==='feedback'?<><Text style={s.feedbackLabel}>{feedbackText?.source==='gemini'?'AI 코멘트':'기본 작성 가이드 · AI 미사용'}</Text><Text style={s.feedbackText}>{feedbackText?.text??'답변 작성을 마치고 작성 완료를 눌러 주세요.'}</Text></>:null}
          </View>
          {step==='question'?<><View style={[s.answerBox,error&&{borderColor:'#F8233C'}]}><TextInput ref={answerInput} accessibilityLabel={`Q${flow.index+1} 감상 답변`} value={form.answers[question.key]??''} placeholder={placeholder} placeholderTextColor="#99A1AF" multiline maxLength={1000} editable={!busy} textAlignVertical="top" onChangeText={answer=>update(f=>({...f,answers:{...f.answers,[question.key]:answer},coreFlow:{...f.coreFlow!,stage:'question',feedback:Object.fromEntries(Object.entries(f.coreFlow!.feedback).filter(([k])=>k!==question.key))}}))} style={s.answerInput}/><Pressable accessibilityRole="button" accessibilityLabel={listening?'음성 입력 중지':'무료 기기 내 음성 입력'} disabled={busy} onPress={()=>void microphone()} style={s.mic}><DesignVector name={listening?'coreMicActive':'coreMic'} width={37} height={37}/></Pressable></View><Text style={s.counter}>{form.answers[question.key]?.length??0}/1000</Text>{error?<Text accessibilityRole="alert" style={s.inlineError}>{error}</Text>:null}</>:null}
          <Text style={s.disclaimer}>{disclaimer}</Text>
        </>:null}
        {step==='summary'&&form&&flow?<>
          <View style={s.cover}>{flow.cover?<CorePhoto path={flow.cover} style={StyleSheet.absoluteFill} label="매거진 대표 사진"/>:null}<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void photo(null)} style={s.photoPill}><DesignVector name="corePhoto" width={20}/><Text style={s.photoLabel}>{flow.cover?'대표 사진 변경':'대표 사진 추가'}</Text></Pressable></View>
          <View style={s.summaryMeta}><Pressable accessibilityRole="checkbox" accessibilityState={{checked:form.spoiler}} aria-checked={form.spoiler} disabled={busy} onPress={()=>update(f=>({...f,spoiler:!f.spoiler}))} style={s.spoiler}><Text style={s.spoilerLabel}>스포일러 포함</Text><View style={[s.checkCircle,form.spoiler&&{backgroundColor:'#F8233C'}]}>{form.spoiler?<DesignVector name="check" width={10} height={8}/>:null}</View></Pressable>{flow.cover?<Pressable accessibilityRole="button" disabled={busy} onPress={()=>update(f=>updateMagazine(f,{...f.coreFlow!,cover:null}))}><Text style={s.muted}>대표 사진 빼기</Text></Pressable>:null}</View>
          <CoreMagazine flow={flow}/><Text style={[s.muted,{paddingHorizontal:39}]}>{flow.source==='gemini'?'AI가 정리한 초안 · 확인 후 저장해 주세요':'AI 미사용 · 나의 답변 원문 기반'} · {magazineText(flow).length}/1000자</Text>
          <Pressable accessibilityRole="button" onPress={()=>{setEditReturn('summary');changeStep('edit');}} style={{paddingHorizontal:39,paddingVertical:14}}><Text style={s.link}>제목·본문·사진 편집</Text></Pressable>
          <Text style={[s.disclaimer,{marginHorizontal:21}]}>{disclaimer}</Text>
        </>:null}
        {notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>:null}
      </ScrollView>}
      {busy?<ActivityIndicator color="#F8233C" style={{padding:6}}/>:null}
      {error&&step!=='question'?<Text accessibilityRole="alert" style={s.footerError}>{error}</Text>:null}
      {step!=='search'&&step!=='edit'?<View style={s.footer}>
        {step==='confirm'?<Action label="이 영화 기록하기" disabled={busy||initializing} onPress={()=>{if(!form||!isValidWatchedAt(form.watchedAt)){setError('감상일은 오늘 또는 이전 날짜로 YYYY-MM-DD 형식으로 입력해야 합니다.');return;}changeStep('rating');}}/>:null}
        {step==='rating'?<Action label="다음" disabled={busy} onPress={()=>{if(!form?.rating){setError('별점을 선택해야 합니다. 별을 밀어서 조절해 주세요.');return;}changeStep('question');}}/>:null}
        {step==='question'?<Action label="작성 완료" disabled={busy} onPress={()=>void feedback()}/>:null}
        {step==='feedback'?<>{(flow?.index??0)<4?<Action label="계속 작성하기" disabled={busy} onPress={continueQuestion}/>:null}<Action label={(flow?.index??0)<4?'그만하기':'매거진 만들기'} secondary={(flow?.index??0)<4} disabled={busy} onPress={()=>void summarize()}/></>:null}
        {step==='summary'?<Action label="기록 완료" disabled={busy} onPress={()=>void persist(true)}/>:null}
      </View>:null}
    </>}
    <Modal visible={dialog!==null} transparent animationType="fade" onRequestClose={()=>setDialog(null)}><View style={s.overlay}><View accessibilityViewIsModal style={s.dialog}>
      <Text style={s.dialogTitle}>{dialog==='replace'?'질문을 변경할까요?':dialog==='privacy'?'공개 범위':dialog==='leave'?'기록을 나갈까요?':'집중 기록 안내'}</Text>
      {dialog==='info'?<><Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} aria-checked={consent} disabled={busy} onPress={()=>setConsent(!consent)} style={[s.consent,{marginTop:0}]}><View style={[s.checkbox,consent&&{backgroundColor:'#F8233C'}]}>{consent?<DesignVector name="check" width={12} height={10}/>:null}</View><Text style={s.consentText}>영화 정보·질문·답변을 무료 Gemini로 보내 코멘트와 초안을 생성하는 데 동의해요. Google의 서비스 개선에 사용될 수 있어요. 개인정보·민감정보는 입력하지 마세요. (선택 · 언제든 해제 가능)</Text></Pressable><Text style={s.muted}>무료 사진 저장: 계정 누적 16장, 전체 160장. 대표 1장과 본문 3장까지. 기기에서 250KB 이하로 줄여 비공개 저장해요.</Text></>:null}
      {dialog==='privacy'?<><Text style={s.dialogText}>나만 보기가 기본입니다. 전체 공개는 로그인한 다른 사용자도 읽을 수 있어요.</Text>{(['private','public'] as const).map(visibility=><Action key={visibility} label={visibility==='private'?'나만 보기':'전체 공개'} secondary={form?.visibility!==visibility} onPress={()=>{update(f=>({...f,visibility}));setDialog(null);}}/>)}</>:<><Text style={s.dialogText}>{dialog==='replace'?'질문마다 한 번만 변경할 수 있어요. 현재 답변과 이후 연계 질문·답변은 초기화됩니다. 이미 만든 매거진은 보존돼요.':dialog==='leave'?'초안을 저장하면 다음에 이어서 작성할 수 있어요. 기기 임시 기록도 유지됩니다.':'질문은 최대 5개예요. 답변을 10자 이상 남기고 코멘트를 읽은 뒤 계속하거나 그만하기를 선택하세요. 그만하기는 현재 답변으로 1,000자 이내 매거진을 만듭니다. 유료 AI·음성·이미지 서비스는 연결하지 않아요.'}</Text>{dialog==='replace'?<Action label="질문 변경" disabled={busy} onPress={()=>void replaceQuestion()}/>:<Action label="초안 저장" disabled={busy||!form} onPress={()=>void persist(false,dialog==='leave')}/>}</>}
      <Action label="닫기" secondary disabled={busy} onPress={()=>setDialog(null)}/>
    </View></View></Modal>
  </KeyboardAvoidingView></SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#FFF'},frame:{flex:1,width:'100%',maxWidth:402,alignSelf:'center'},header:{height:74,flexShrink:0,position:'relative',backgroundColor:'#FFF'},headerCenter:{position:'absolute',left:55,right:55,top:24,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},headerTitle:{fontFamily:homeFont,fontSize:20,lineHeight:33,fontWeight:'700',color:'#000',letterSpacing:-.2,textAlign:'center'},icon:{position:'absolute',width:44,height:44,alignItems:'center',justifyContent:'center'},back:{left:5.5,top:19.5},right:{right:11,top:19},done:{fontFamily:homeFont,fontSize:15,fontWeight:'600',color:'#FFF',backgroundColor:'#F8233C',paddingHorizontal:11,paddingVertical:5,borderRadius:20},content:{paddingHorizontal:21,paddingBottom:22,flexGrow:1},summaryContent:{paddingBottom:20,backgroundColor:'#F9FAFB'},action:{flex:1,minHeight:53,backgroundColor:'#F8233C',borderRadius:26.5,alignItems:'center',justifyContent:'center',paddingHorizontal:12,paddingVertical:9},actionText:{fontFamily:homeFont,fontSize:18,fontWeight:'600',letterSpacing:-.18,lineHeight:33,color:'#FFF'},secondary:{backgroundColor:'#F9FAFB'},footer:{flexDirection:'row',gap:10,paddingHorizontal:21,paddingTop:12,paddingBottom:21,backgroundColor:'#FFF'},footerError:{paddingHorizontal:24,paddingVertical:8,fontFamily:homeFont,fontSize:12,lineHeight:18,color:'#E51B3A'},progress:{height:16,backgroundColor:'#F5F6F8',borderRadius:8,overflow:'hidden'},progressFill:{height:16,backgroundColor:'#F8233C',borderRadius:8},questionPanel:{marginTop:17,minHeight:131,borderRadius:20,backgroundColor:'#F8233C',paddingHorizontal:18,paddingTop:20,paddingBottom:20,boxShadow:'0px 3px 3px rgba(249,91,91,0.25)'},metadata:{fontFamily:homeFont,fontSize:13,lineHeight:20,letterSpacing:-.13,fontWeight:'600',color:'#FFB4B4',paddingRight:30},replace:{position:'absolute',right:8,top:1,width:44,height:44,alignItems:'center',justifyContent:'center'},questionText:{fontFamily:homeFont,fontSize:15,lineHeight:20,letterSpacing:-.75,fontWeight:'500',color:'#FFF',marginTop:13},answerBox:{marginTop:15,minHeight:345,borderRadius:20,borderWidth:2,borderColor:'#F0F0F0',paddingHorizontal:16,paddingTop:18,paddingBottom:60},answerInput:{fontFamily:homeFont,fontSize:15,lineHeight:20,letterSpacing:-.75,fontWeight:'500',color:'#364153',minHeight:260,padding:0},mic:{position:'absolute',right:16,bottom:10,width:44,height:44,alignItems:'center',justifyContent:'center'},counter:{textAlign:'right',fontFamily:homeFont,fontSize:13,lineHeight:20,letterSpacing:-.65,fontWeight:'600',color:'#BABABA',marginTop:4},inlineError:{fontFamily:homeFont,fontSize:12,lineHeight:18,color:'#E51B3A',marginTop:4},disclaimer:{fontFamily:homeFont,fontSize:12,lineHeight:14,letterSpacing:-.6,fontWeight:'500',color:'#BABABA',paddingHorizontal:7,marginTop:21},feedbackPanel:{minHeight:481,paddingBottom:30},feedbackLabel:{fontFamily:homeFont,fontSize:15,lineHeight:20,fontWeight:'700',color:'#FFB4B4',marginTop:35},feedbackText:{fontFamily:homeFont,fontSize:15,lineHeight:20,letterSpacing:-.75,color:'#FFF',fontWeight:'500',marginTop:16},loading:{flex:1,alignItems:'center',justifyContent:'center',paddingBottom:28},loadingTitle:{fontFamily:homeFont,fontSize:20,lineHeight:33,letterSpacing:-.2,fontWeight:'700',color:'#17191C',marginTop:25},loadingCaption:{fontFamily:homeFont,fontSize:14,lineHeight:17,letterSpacing:-.7,color:'#99A1AF',marginTop:6},search:{height:50,backgroundColor:'#F3F4F6',borderRadius:10,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:17,marginTop:5},searchInput:{fontFamily:homeFont,fontSize:15,color:'#17191C',flex:1,height:50},searchHint:{fontFamily:homeFont,color:'#8A8A8A',fontSize:13,lineHeight:19,textAlign:'center',marginVertical:12},result:{flexDirection:'row',alignItems:'center',gap:14,minHeight:84,paddingVertical:6},resultTitle:{fontFamily:homeFont,fontSize:16,fontWeight:'700',lineHeight:22,color:'#17191C'},muted:{fontFamily:homeFont,fontSize:12,lineHeight:18,color:'#99A1AF'},movieTitle:{fontFamily:homeFont,fontSize:20,fontWeight:'700',color:'#17191C',textAlign:'center',lineHeight:33,letterSpacing:-.2,marginTop:19},director:{fontFamily:homeFont,fontSize:13,lineHeight:33,letterSpacing:-.13,color:'#8A8A8A',textAlign:'center',marginTop:-6},overview:{fontFamily:homeFont,fontSize:13,lineHeight:16,minHeight:64,letterSpacing:-.13,color:'#8A8A8A',marginTop:4},dateInput:{fontFamily:homeFont,fontSize:30,letterSpacing:-.32,fontWeight:'700',textAlign:'center',color:'#17191C',borderRadius:28,backgroundColor:'#F8F9FB',height:53,padding:10,marginHorizontal:23,marginTop:40},ratingHeading:{fontFamily:homeFont,fontSize:20,lineHeight:37,fontWeight:'700',color:'#F8233C',textAlign:'center',marginTop:36,marginBottom:30},ratingCaption:{fontFamily:homeFont,fontSize:18,lineHeight:33,fontWeight:'600',textAlign:'center',marginTop:21,color:'#17191C'},consent:{flexDirection:'row',gap:10,alignItems:'center',marginTop:40,paddingVertical:12},checkbox:{width:18,height:18,borderRadius:3,borderWidth:1.5,borderColor:'#F8233C',alignItems:'center',justifyContent:'center'},consentText:{fontFamily:homeFont,fontSize:11,lineHeight:17,color:'#858B96',flex:1},cover:{height:259,backgroundColor:'#D1D5DC',alignItems:'center',justifyContent:'center'},photoPill:{backgroundColor:'#F8233C',borderRadius:26.5,paddingHorizontal:11,height:36,flexDirection:'row',alignItems:'center',gap:4},photoLabel:{fontFamily:homeFont,fontSize:15,fontWeight:'600',letterSpacing:-.15,color:'#FFF'},summaryMeta:{paddingHorizontal:39,paddingTop:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},spoiler:{borderWidth:.8,borderColor:'#CECECE',height:30,paddingHorizontal:8,borderRadius:6,flexDirection:'row',gap:6,alignItems:'center'},spoilerLabel:{fontFamily:homeFont,fontSize:13,color:'#8A8A8A',letterSpacing:-.13},checkCircle:{width:17,height:17,borderWidth:1,borderColor:'#CECECE',borderRadius:9,alignItems:'center',justifyContent:'center'},link:{fontFamily:homeFont,fontSize:13,color:'#F8233C'},notice:{fontFamily:homeFont,fontSize:12,lineHeight:18,color:'#7B8493',backgroundColor:'#F7F8FA',padding:12,borderRadius:10,marginTop:14,marginHorizontal:7},overlay:{flex:1,backgroundColor:'#0005',alignItems:'center',justifyContent:'center',padding:21},dialog:{width:'100%',maxWidth:360,padding:24,backgroundColor:'#FFF',borderRadius:17,gap:16},dialogTitle:{fontFamily:homeFont,fontSize:20,fontWeight:'700'},dialogText:{fontFamily:homeFont,fontSize:13,lineHeight:22,color:'#6B7280'}
});
