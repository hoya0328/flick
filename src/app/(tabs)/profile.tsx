import { router,useFocusEffect } from 'expo-router';
import { useCallback,useRef,useState } from 'react';
import { ActivityIndicator,Modal,Pressable,ScrollView,Share,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DesignVector } from '@/components/design-vector';
import { HomeInfoDialog,homeFont } from '@/components/home-ui';
import { listMyCollections } from '@/features/community/collections-service';
import { shiftMonth } from '@/features/reports/taste-report';
import { listReviews,type ReviewRecord } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';
import { profileCalendar,profileSummary } from '@/features/profile/profile-model';
import { getMyProfileDetails,type ProfileDetails } from '@/features/profile/profile-service';
import { ProfileAvatar,ProfileHeader,ProfileEditIcon,ProfileShareIcon,ProfilePoster,TasteRing,p } from '@/features/profile/profile-ui';
import { SavedContent } from '@/features/profile/saved-content';
import { useCurrentDate } from '@/features/profile/use-current-date';
import { useTwelveTaste } from '@/features/reports/use-twelve-taste';
import { tasteTypes } from '@/features/reports/taste-engine';
import { getCommunityState,publicCommunityUrl,type CommunityState } from '@/features/community/social-service';
import { SocialPosts } from '@/features/community/social-ui';

type ProfileTab='calendar'|'feed'|'saved';
const weekdays=['일','월','화','수','목','금','토'];
export default function ProfileScreen(){
  const identity=useSession();
  return <MyProfile key={`${identity.mode}:${identity.email??''}`}/>;
}
function MyProfile(){
  const session=useSession(),mode=session.mode==='supabase'?'supabase':'demo';
  const width=Math.min(useWindowDimensions().width,402);
  const today=useCurrentDate();
  const [tab,setTab]=useState<ProfileTab>('calendar');
  const [chosenMonth,setMonth]=useState<string|null>(null),[selectedDate,setSelectedDate]=useState<string|null>(null);
  const month=chosenMonth??today.slice(0,7);
  const [details,setDetails]=useState<ProfileDetails|null>(null),[records,setRecords]=useState<ReviewRecord[]|null>(null),[collectionCount,setCollectionCount]=useState<number|null>(null);
  const [busy,setBusy]=useState(false),[errors,setErrors]=useState<string[]>([]);
  const [community,setCommunity]=useState<CommunityState|null>(null);
  const [info,setInfo]=useState<{title:string;body:string}|null>(null),[shareOpen,setShareOpen]=useState(false);
  const scroll=useRef<ScrollView>(null);
  const request=useRef(0);
  const load=useCallback(()=>{
    const token=++request.current;setBusy(true);setErrors([]);
    void Promise.allSettled([getMyProfileDetails(mode),listReviews(mode),mode==='supabase'?listMyCollections():Promise.resolve([]),mode==='supabase'?getCommunityState():Promise.resolve(null)]).then(([meta,reviews,collections,social])=>{
      if(token!==request.current)return;
      const failed:string[]=[];
      if(meta.status==='fulfilled')setDetails(meta.value);else failed.push('프로필');
      if(reviews.status==='fulfilled')setRecords(reviews.value);else failed.push('기록');
      if(collections.status==='fulfilled')setCollectionCount(collections.value.length);else failed.push('컬렉션');
      if(social.status==='fulfilled')setCommunity(social.value);else failed.push('팔로우·알림');
      setErrors(failed);setBusy(false);
    });
  },[mode]);
  useFocusEffect(useCallback(()=>{load();return()=>{request.current++;};},[load]));
  const summary=profileSummary(records??[],today),calendar=profileCalendar(month,records??[]);
  const taste=useTwelveTaste(records,mode).report;
  const selected=(records??[]).filter(record=>record.status==='completed'&&record.watchedAt===selectedDate);
  const name=details?.displayName??session.nickname??(mode==='demo'?'FLICK 사용자':'프로필 불러오는 중');
  const show=(title:string,body:string)=>setInfo({title,body});
  const shareText=`${name}님의 FLICK\n영화의 여운을 나만의 기록으로 남기고 있어요.\n${community?.publicProfile?publicCommunityUrl(`/people/${community.userId}`):'https://flick-film-journal--beta.expo.app/welcome'}`;
  async function share(){
    try{await Share.share({message:shareText,title:'FLICK 프로필 소개'});setShareOpen(false);}
    catch{show('공유 안내','이 브라우저에서는 공유 창을 지원하지 않아요. 아래 소개 글을 선택해 복사할 수 있어요.');}
  }
  function selectTab(next:ProfileTab){setTab(next);setSelectedDate(null);}
  return <SafeAreaView style={s.safe} edges={['top']}><ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <ProfileHeader onHome={()=>router.push('/')} onSettings={()=>router.push('/account-settings')} onInfo={()=>router.push('/notifications')}/>
    <View style={s.identity}>
      <ProfileAvatar path={details?.avatarPath??null} name={name}/>
      <View style={s.identityText}><Text numberOfLines={1} style={p.title}>{name}</Text><Text numberOfLines={1} style={[p.body,{marginTop:6}]}>{details?.bio||(mode==='demo'?'나만의 영화 기록을 시작해 보세요':'소개를 입력해 나를 표현해 보세요')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="내 팔로워와 팔로잉 보기" onPress={()=>router.push('/connections')} style={s.follow}><Text style={s.followText}>팔로워 <Text style={s.followValue}>{community?.followers??'—'}</Text></Text><Text style={s.followText}>팔로잉 <Text style={s.followValue}>{community?.following??'—'}</Text></Text></Pressable></View>
    </View>
    <View style={s.actions}><Pressable accessibilityRole="button" onPress={()=>router.push('/profile-edit')} style={[p.action,s.action]}><ProfileEditIcon/><Text style={p.actionText}>프로필 편집</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setShareOpen(true)} style={[p.action,s.action]}><ProfileShareIcon/><Text style={p.actionText}>프로필 공유</Text></Pressable></View>
    <View style={s.stats}>
      {[{label:'본 영화',value:records===null||errors.includes('기록')?'—':summary.watchedMovies,action:()=>router.push('/archive')},{label:'리뷰',value:records===null||errors.includes('기록')?'—':summary.report.total,action:()=>router.push('/archive')},{label:'컬렉션',value:errors.includes('컬렉션')?'—':collectionCount??'—',action:()=>router.push('/collections')}].map((item,index)=><Pressable key={item.label} accessibilityRole="button" accessibilityLabel={`${item.label} ${item.value}`} onPress={item.action} style={s.stat}><Text style={s.statNumber}>{item.value}</Text><Text style={s.statLabel}>{item.label}</Text>{index<2?<View style={s.statDivider}/>:null}</Pressable>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="나의 12가지 취향 리포트 보기" onPress={()=>router.push('/taste-insights')} style={s.taste}>
      <Text style={s.tasteHeader}>나의 취향 리포트</Text><DesignVector name="chevron" width={6} height={12} style={{position:'absolute',right:18,top:24}}/>
      <Text numberOfLines={1} style={s.tasteTitle}>{taste.headline}</Text><Text numberOfLines={1} style={s.tasteCaption}>{taste.status==='insufficient'?'유효한 영화 3편부터 임시 유형을 제시해요':`유효한 근거 ${taste.validFilms}편 · ${taste.status==='representative'?'대표 유형':taste.status==='mixed'?(taste.reason==='close_scores'?'두 유형이 비슷해요':'긍정 근거 보강 중'):'임시 분석'}`}</Text>
      <Text style={s.keywordLabel}>자주 남긴 키워드</Text><View style={s.keywords}>{taste.topKeywords.length?taste.topKeywords.slice(0,3).map(word=><View style={s.chip} key={word.label}><Text numberOfLines={1} style={s.chipText}>{word.label}</Text></View>):<Text style={s.noKeywords}>기록이 쌓이면 키워드가 보여요</Text>}</View>
      <Text style={s.pointLabel}>감상 포인트</Text><Text numberOfLines={1} style={[s.pointText,{maxWidth:Math.max(110,width-177)}]}>{taste.topPoints.map(point=>point.label).join(' > ')||'선택한 감상 요소가 아직 없어요'}</Text><Text numberOfLines={1} style={[s.foot,{maxWidth:Math.max(110,width-177)}]}>{errors.includes('기록')?'마지막 조회 기준 · 새로고침 필요':records===null?'기록 확인 중':`${taste.totalMovies}편 영화 · 평균 ★${taste.meanRating??'—'}`}</Text>
      <View style={s.ring}><TasteRing point={taste.primary?{label:tasteTypes[taste.primary].name,percent:Math.round(taste.share[taste.primary])}:null}/></View>
    </Pressable>
    {busy?<ActivityIndicator accessibilityLabel="내 프로필 불러오는 중" color="#F8233C" style={{paddingTop:8}}/>:null}
    {errors.length?<View style={[p.empty,{marginTop:12}]}><Text style={p.error}>{errors.join('·')} 정보를 불러오지 못했어요. 기존 기록은 변경되지 않았습니다.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={load}><Text style={p.link}>다시 시도</Text></Pressable></View>:null}
    <View accessibilityRole="tablist" style={s.tabs}>{([{key:'calendar',label:'캘린더'},{key:'feed',label:'내 피드'},{key:'saved',label:'보관함'}] as const).map(item=><Pressable key={item.key} accessibilityRole="tab" accessibilityState={{selected:tab===item.key}} onPress={()=>selectTab(item.key)} style={[s.tab,tab===item.key&&s.tabActive]}><Text style={[s.tabText,tab===item.key&&s.tabTextActive]}>{item.label}</Text></Pressable>)}</View>
    {tab==='calendar'?<View style={s.calendar}>
      <View style={s.monthRow}><View style={s.monthControls}><Pressable accessibilityRole="button" accessibilityLabel="캘린더 이전 달" onPress={()=>{setMonth(shiftMonth(month,-1));setSelectedDate(null);}} style={s.monthArrow}><DesignVector name="profileMonthLeft" style={{transform:[{rotate:'-90deg'}]}}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="캘린더 이번 달로 이동" onPress={()=>setMonth(null)} style={s.monthLabel}><Text style={s.monthText}>{Number(month.slice(5))}월</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="캘린더 다음 달" hitSlop={8} onPress={()=>{setMonth(shiftMonth(month,1));setSelectedDate(null);}} style={[s.monthArrow,{width:28}]}><DesignVector name="profileMonthRight" style={{transform:[{rotate:'90deg'}]}}/></Pressable></View><Text style={s.year}>{month.slice(0,4)}년</Text><Pressable accessibilityRole="button" onPress={()=>{setMonth(null);setSelectedDate(today);}} style={s.todayButton}><Text style={p.link}>오늘</Text></Pressable></View>
      <View style={s.weekdays}>{weekdays.map(day=><Text key={day} style={s.weekday}>{day}</Text>)}</View>
      <View style={s.calendarGrid}>{calendar.map(day=><Pressable key={day.date} accessibilityRole="button" accessibilityLabel={`${day.date}, 완료 기록 ${day.completedCount}개${day.date===today?', 오늘':''}`} accessibilityState={{disabled:!day.inMonth,selected:selectedDate===day.date}} disabled={!day.inMonth} onPress={()=>setSelectedDate(day.date)} style={s.dayCell}>
        {day.inMonth?<><Text style={[s.dayNumber,day.date===today&&{color:'#F8233C'}]}>{day.day}</Text>{day.reviews[0]?<View style={s.dayPoster}><ProfilePoster path={day.reviews[0].movie.posterPath} title={day.reviews[0].movie.title}/>{day.completedCount>1?<View accessibilityLabel={`${day.completedCount}개 기록`} style={s.posterBadge}><DesignVector name="profilePosterBadge" width={17.4} height={17.4} style={StyleSheet.absoluteFill}/><Text style={s.badgeText}>{day.completedCount>99?'99+':day.completedCount}</Text></View>:null}</View>:null}</>:null}
      </Pressable>)}</View>
      {records!==null&&!summary.report.total?<View style={[p.empty,{marginTop:12}]}><Text style={p.body}>완료한 기록이 아직 없어요. 첫 감상을 기록하면 감상일에 영화 포스터가 나타나요.</Text><Pressable accessibilityRole="button" onPress={()=>router.push('/archive')}><Text style={p.link}>작성 중인 기록 확인</Text></Pressable></View>:null}
      <Pressable accessibilityRole="button" onPress={()=>router.push('/archive')} style={{alignSelf:'center',padding:16}}><Text style={p.link}>Light·Core·초안 전체 관리</Text></Pressable>
    </View>:tab==='feed'?<SocialPosts scope="mine"/>:<SavedContent mode={mode} width={width} onInfo={show}/>}
  </ScrollView>
  <Modal visible={selectedDate!==null} transparent animationType="slide" onRequestClose={()=>setSelectedDate(null)}><View style={s.scrim}><Pressable accessibilityRole="button" accessibilityLabel="날짜별 기록 닫기" style={StyleSheet.absoluteFill} onPress={()=>setSelectedDate(null)}/><View accessibilityViewIsModal style={s.sheet}><View style={s.sheetHeading}><Text style={p.title}>{selectedDate} 기록</Text><Pressable accessibilityRole="button" accessibilityLabel="날짜별 기록 창 닫기" onPress={()=>setSelectedDate(null)} style={s.close}><DesignVector name="cancel"/></Pressable></View><ScrollView contentContainerStyle={{paddingBottom:24}}>{!selected.length?<Text style={p.body}>이 날짜에 완료한 기록이 없어요.</Text>:selected.map(record=><Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`${record.movie.title} ${record.mode==='light'?'Light':'Core'} 기록 열기`} onPress={()=>{setSelectedDate(null);router.push({pathname:'/(tabs)/record',params:{reviewId:record.id}});}} style={s.recordRow}><ProfilePoster path={record.movie.posterPath} title={record.movie.title} width={44} height={63}/><View style={{flex:1}}><Text numberOfLines={1} style={s.recordTitle}>{record.movie.title}</Text><Text style={p.body}>{record.mode==='light'?'Light':'Core'} · ★{record.rating??'—'} · {record.visibility==='public'?'전체 공개':'나만 보기'}</Text></View><DesignVector name="chevron" width={6}/></Pressable>)}</ScrollView></View></View></Modal>
  <Modal visible={shareOpen} transparent animationType="fade" onRequestClose={()=>setShareOpen(false)}><View style={s.shareScrim}><View accessibilityViewIsModal style={s.shareDialog}><Text style={p.title}>프로필 소개 공유</Text><Text style={p.body}>{community?.publicProfile?'공개 프로필 링크를 공유해요. 로그인한 회원에게 공개한 콘텐츠만 보입니다.':'현재 프로필은 비공개입니다. 아래는 서비스 소개 링크이며, 공개 프로필 링크는 공개 설정 후 공유할 수 있어요.'}</Text><Text selectable style={s.shareText}>{shareText}</Text><Pressable accessibilityRole="button" onPress={()=>{setShareOpen(false);router.push('/community-settings');}} style={p.action}><Text style={p.actionText}>공개 설정</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>void share()} style={p.action}><ProfileShareIcon/><Text style={p.actionText}>공유 화면 열기</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setShareOpen(false)} style={p.action}><Text style={p.actionText}>닫기</Text></Pressable></View></View></Modal>
  <HomeInfoDialog info={info} onClose={()=>setInfo(null)}/>
  </SafeAreaView>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#FFF'},content:{width:'100%',maxWidth:402,alignSelf:'center',paddingBottom:24},
  identity:{marginTop:22,marginHorizontal:21,height:84,flexDirection:'row',gap:17},identityText:{flex:1,minWidth:0},follow:{flexDirection:'row',gap:8,alignItems:'center',marginTop:4,minHeight:20},followText:{fontFamily:homeFont,fontSize:13,lineHeight:19.5,color:'#4A5565'},followValue:{fontWeight:'600',color:'#000'},preparing:{fontFamily:homeFont,fontSize:10,color:'#99A1AF'},
  actions:{marginTop:30,marginHorizontal:21,flexDirection:'row',gap:19},action:{flex:1},
  stats:{marginTop:23,height:79,borderTopWidth:1,borderBottomWidth:1,borderColor:'#F3F4F6',paddingHorizontal:21,flexDirection:'row'},stat:{flex:1,paddingTop:11,alignItems:'center'},statNumber:{fontFamily:homeFont,fontSize:20,lineHeight:30,fontWeight:'700',color:'#0A0A0A'},statLabel:{fontFamily:homeFont,fontSize:12,lineHeight:18,color:'#4A5565',marginTop:3.5},statDivider:{position:'absolute',right:0,top:26.25,height:20,width:1,backgroundColor:'#D1D5DC'},
  taste:{marginTop:23,marginHorizontal:21,height:285,borderWidth:1,borderColor:'#D1D5DC',borderRadius:20,paddingHorizontal:16,paddingTop:15},tasteHeader:{fontFamily:homeFont,fontSize:16,lineHeight:24,fontWeight:'700',color:'#0A0A0A'},tasteTitle:{fontFamily:homeFont,fontSize:18,lineHeight:27,fontWeight:'700',color:'#0A0A0A',marginTop:12},tasteCaption:{fontFamily:homeFont,fontSize:13,lineHeight:19.5,color:'#4A5565',marginTop:4},keywordLabel:{fontFamily:homeFont,fontSize:12,lineHeight:18,color:'#6A7282',marginTop:19.5},keywords:{flexDirection:'row',gap:5,marginTop:12,minHeight:22},chip:{backgroundColor:'#F3F4F6',paddingHorizontal:12,borderRadius:20,height:22,justifyContent:'center',maxWidth:106,flexShrink:1,minWidth:0},chipText:{fontFamily:homeFont,fontSize:12,lineHeight:18,fontWeight:'500',color:'#364153'},noKeywords:{fontFamily:homeFont,fontSize:12,lineHeight:22,color:'#99A1AF'},pointLabel:{fontFamily:homeFont,fontSize:12,lineHeight:18,color:'#6A7282',marginTop:22},pointText:{fontFamily:homeFont,fontSize:13,lineHeight:19.5,fontWeight:'500',color:'#1E2939',marginTop:8,maxWidth:225},foot:{fontFamily:homeFont,fontSize:11,lineHeight:16.5,color:'#6A7282',marginTop:8.5,maxWidth:225},ring:{position:'absolute',right:21,top:193},
  tabs:{marginTop:13,height:43,borderBottomWidth:2,borderBottomColor:'#F3F4F6',flexDirection:'row'},tab:{flex:1,alignItems:'center',justifyContent:'center',height:43},tabActive:{borderBottomWidth:2,borderBottomColor:'#F8233C'},tabText:{fontFamily:homeFont,fontSize:15,lineHeight:22.5,fontWeight:'500',color:'#99A1AF'},tabTextActive:{color:'#000'},
  calendar:{paddingBottom:20},monthRow:{marginTop:12,height:56,flexDirection:'row',alignItems:'center'},monthControls:{marginLeft:16,flexDirection:'row',alignItems:'center'},monthArrow:{width:44,height:44,alignItems:'center',justifyContent:'center'},monthLabel:{width:40,height:44,alignItems:'center',justifyContent:'center'},monthText:{fontFamily:homeFont,fontSize:20,lineHeight:36,fontWeight:'700',textDecorationLine:'underline',color:'#000',letterSpacing:-.2},year:{marginLeft:'auto',fontFamily:homeFont,fontSize:13,color:'#6A7282'},todayButton:{paddingHorizontal:16,minHeight:44,justifyContent:'center'},weekdays:{marginTop:13,paddingHorizontal:6,flexDirection:'row'},weekday:{width:'14.285714%',textAlign:'center',fontFamily:homeFont,fontSize:15,lineHeight:23,fontWeight:'500',color:'#6A7282'},calendarGrid:{paddingHorizontal:6,marginTop:27,flexDirection:'row',flexWrap:'wrap'},dayCell:{width:'14.285714%',height:77,alignItems:'center',paddingTop:10},dayNumber:{fontFamily:homeFont,fontSize:20,lineHeight:22.5,fontWeight:'600',color:'#6A7282'},dayPoster:{position:'absolute',top:36},posterBadge:{position:'absolute',right:-9,top:-5,width:17.4,height:17.4,alignItems:'center',justifyContent:'center'},badgeText:{fontFamily:homeFont,fontSize:10,lineHeight:12,fontWeight:'700',color:'#FFF',paddingBottom:2},
  scrim:{flex:1,backgroundColor:'#0005',justifyContent:'flex-end',alignItems:'center'},sheet:{width:'100%',maxWidth:402,maxHeight:'70%',minHeight:180,backgroundColor:'#FFF',borderTopLeftRadius:23,borderTopRightRadius:23,padding:21,paddingBottom:30},sheetHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingBottom:16},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},recordRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12},recordTitle:{fontFamily:homeFont,fontSize:15,lineHeight:23,fontWeight:'600',color:'#0A0A0A'},
  shareScrim:{flex:1,backgroundColor:'#0005',alignItems:'center',justifyContent:'center',padding:21},shareDialog:{width:'100%',maxWidth:360,padding:22,borderRadius:18,backgroundColor:'#FFF',gap:16},shareText:{fontFamily:homeFont,fontSize:13,lineHeight:21,color:'#364153',backgroundColor:'#F9FAFB',padding:12,borderRadius:8}
});
