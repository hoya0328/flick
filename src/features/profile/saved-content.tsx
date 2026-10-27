import { router,useFocusEffect } from 'expo-router';
import { useCallback,useRef,useState } from 'react';
import { ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { DesignVector } from '@/components/design-vector';
import { HomeReviewCard,HomeMagazineCard } from '@/components/home-content-cards';
import { homeFont } from '@/components/home-ui';
import type { PublicReviewCard } from '@/features/community/community-service';
import { CorePhoto } from '@/features/reviews/core-photo';
import { listMySavedContent } from './profile-service';
import { mergeSavedPage,type SavedItem,type SavedKind,type SavedPage } from './profile-model';
import { ProfilePoster,p } from './profile-ui';
import { SocialPosts } from '@/features/community/social-ui';

const labels:Record<SavedKind,string>={movies:'보관 영화',reviews:'스크랩한 리뷰',magazines:'스크랩한 매거진',collections:'스크랩한 컬렉션'};
function open(item:SavedItem){
  if(item.kind==='movie')router.push({pathname:'/movie/[id]',params:{id:item.id}});
  else if(item.kind==='curation')router.push({pathname:'/curation/[id]',params:{id:item.id}});
  else if(item.kind==='collection')router.push({pathname:'/collection/[id]',params:{id:item.id}});
  else router.push({pathname:'/review/[id]',params:{id:item.id}});
}
function reviewCard(item:SavedItem):PublicReviewCard{return {reviewId:item.id,authorDisplayName:item.authorName,movieId:item.movieId,movieTitle:item.movieTitle,posterPath:item.posterPath,mode:item.kind==='review'?'light':'core',watchedAt:item.watchedAt,rating:item.rating,oneLine:item.kind==='magazine'?item.title:'',bodyExcerpt:item.bodyExcerpt,spoiler:item.spoiler,updatedAt:item.savedAt,likeCount:item.likeCount,commentCount:item.commentCount,saveCount:0,viewerLiked:false,viewerSaved:true,representativeKeywords:item.keywords,coreCover:item.coverPath};}

function SavedSection({kind,mode,onInfo,width}:{kind:SavedKind;mode:'demo'|'supabase';onInfo:(title:string,body:string)=>void;width:number}){
  const [page,setPage]=useState<SavedPage|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[hasMore,setHasMore]=useState(false);
  const lock=useRef(false),offset=useRef(0),request=useRef(0),mounted=useRef(false);
  useFocusEffect(useCallback(()=>{
    mounted.current=true;const token=++request.current;setBusy(true);setError('');lock.current=true;
    void listMySavedContent(mode,kind).then(value=>{if(mounted.current&&token===request.current){setPage(value);offset.current=12;setHasMore(value.total>12);}}).catch(()=>{if(mounted.current&&token===request.current)setError('저장함을 불러오지 못했어요. 다시 시도해 주세요.');}).finally(()=>{if(mounted.current&&token===request.current){lock.current=false;setBusy(false);}});
    return()=>{mounted.current=false;request.current++;lock.current=false;};
  },[mode,kind]));
  async function loadMore(reset=false){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');const token=++request.current;
    try{const next=await listMySavedContent(mode,kind,reset?0:offset.current);if(mounted.current&&token===request.current){setPage(current=>reset||!current?next:mergeSavedPage(current,next));offset.current=reset?12:offset.current+12;setHasMore(offset.current<next.total);}}
    catch{if(mounted.current&&token===request.current)setError('불러오지 못했어요. 기존 목록은 유지됩니다.');}
    finally{if(mounted.current&&token===request.current){lock.current=false;setBusy(false);}}
  }
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.headingText}>{labels[kind]}</Text><Text style={s.count}>{page?.total??'—'}{kind==='movies'?'편':'개'}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${labels[kind]} 새로고침`} disabled={busy} onPress={()=>void loadMore(true)} style={{marginLeft:'auto',width:32,height:32,alignItems:'flex-end',justifyContent:'center'}}><DesignVector name="chevron" width={7}/></Pressable></View>
    {busy&&!page?<ActivityIndicator color="#F8233C"/>:null}
    {error?<View style={p.empty}><Text style={p.error}>{error}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void loadMore(true)}><Text style={p.link}>다시 시도</Text></Pressable></View>:null}
    {page&&!page.items.length?<View style={p.empty}><Text style={p.body}>{mode==='demo'?'계정으로 로그인하면 저장한 콘텐츠를 모아 볼 수 있어요.':'아직 보관한 콘텐츠가 없어요.'}</Text></View>:null}
    {page?.items.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>{page.items.map(item=>{
      if(item.kind==='movie')return <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 영화 보기`} key={item.id} onPress={()=>open(item)} style={{width:88}}><ProfilePoster path={item.posterPath} title={item.title} width={88} height={126} style={{borderRadius:10}}/><Text numberOfLines={2} style={s.movieTitle}>{item.title}</Text></Pressable>;
      if(item.kind==='review')return <HomeReviewCard key={item.id} readOnlyReactions review={reviewCard(item)} width={Math.min(width-42,359)} onPreview={title=>onInfo(title,'상세 화면에서 볼 수 있어요.')} onLike={()=>open(item)}/>;
      if(item.kind==='magazine')return <HomeMagazineCard key={item.id} review={reviewCard(item)} onPreview={title=>onInfo(title,'매거진 상세에서 확인해 주세요.')}/>;
      return <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} ${item.kind==='curation'?'매거진':'컬렉션'} 보기`} key={`${item.kind}:${item.id}`} onPress={()=>open(item)} style={{width:item.kind==='curation'?311:170}}>{item.coverPath?<CorePhoto path={item.coverPath} style={{height:112,borderRadius:15}}/>:<ProfilePoster path={item.posterPath} title={item.title} width={item.kind==='curation'?311:170} height={item.kind==='curation'?160:112} style={{borderRadius:15}}/>}<Text numberOfLines={1} style={s.title}>{item.title}</Text><Text numberOfLines={1} style={s.caption}>{item.authorName||item.subtitle}</Text></Pressable>;
    })}</ScrollView>:null}
    {page&&hasMore?<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void loadMore()} style={s.more}><Text style={p.link}>{busy?'불러오는 중…':'더 보기'}</Text></Pressable>:null}
  </View>;
}
export function SavedContent({mode,onInfo,width}:{mode:'demo'|'supabase';onInfo:(title:string,body:string)=>void;width:number}){
  return <View style={{paddingTop:24,paddingBottom:40}}>
    <SavedSection kind="movies" mode={mode} width={width} onInfo={onInfo}/>
    <SavedSection kind="reviews" mode={mode} width={width} onInfo={onInfo}/>
    <View style={s.section}><View style={s.heading}><Text accessibilityRole="header" style={s.headingText}>스크랩한 피드</Text></View><SocialPosts scope="saved"/></View>
    <SavedSection kind="magazines" mode={mode} width={width} onInfo={onInfo}/>
    <SavedSection kind="collections" mode={mode} width={width} onInfo={onInfo}/>
  </View>;
}
const s=StyleSheet.create({section:{marginBottom:34,gap:14},heading:{paddingHorizontal:21,flexDirection:'row',alignItems:'center',gap:7},headingText:{fontFamily:homeFont,fontSize:18,lineHeight:24,fontWeight:'600',color:'#0A0A0A',letterSpacing:-.18},count:{fontFamily:homeFont,fontSize:16,lineHeight:24,color:'#6A7282'},rail:{paddingHorizontal:21,gap:8,alignItems:'flex-start'},movieTitle:{fontFamily:homeFont,fontSize:12,lineHeight:22.5,fontWeight:'600',color:'#0A0A0A',marginTop:4},title:{fontFamily:homeFont,fontSize:15,lineHeight:22,fontWeight:'600',color:'#0A0A0A',marginTop:5},caption:{fontFamily:homeFont,fontSize:12,lineHeight:18,color:'#6A7282'},more:{marginHorizontal:21,minHeight:44,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'#E5E7EB',borderRadius:10}});
