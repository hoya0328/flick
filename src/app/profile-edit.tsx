import { Redirect,router } from 'expo-router';
import { useEffect,useRef,useState } from 'react';
import { ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DesignVector } from '@/components/design-vector';
import { homeFont } from '@/components/home-ui';
import { ProfileAvatar,p } from '@/features/profile/profile-ui';
import { getMyProfileDetails,saveMyProfileDetails,type ProfileDetails } from '@/features/profile/profile-service';
import { addCorePhoto } from '@/features/reviews/core-photo';
import { validateNickname } from '@/features/session/account-logic';
import { useSession } from '@/features/session/session-provider';

export default function ProfileEditScreen(){const identity=useSession();return <ProfileEditor key={`${identity.mode}:${identity.email??''}`}/>;}
function ProfileEditor(){
  const session=useSession(),mode=session.mode==='supabase'?'supabase':'demo';
  const [form,setForm]=useState<ProfileDetails|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[loadKey,setLoadKey]=useState(0);
  const [error,setError]=useState(''),[field,setField]=useState<'name'|'bio'|null>(null);
  const nameInput=useRef<TextInput>(null),bioInput=useRef<TextInput>(null),scroll=useRef<ScrollView>(null),active=useRef(false),lock=useRef(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    if(session.status!=='ready'||session.mode==='none')return;
    let valid=true;
    void getMyProfileDetails(mode).then(value=>{if(valid){setForm(value);setError('');}}).catch(()=>{if(valid)setError('프로필을 불러오지 못했어요. 기존 정보는 변경되지 않았습니다.');}).finally(()=>{if(valid)setLoading(false);});
    return()=>{valid=false;};
  },[mode,session.status,session.mode,loadKey]);
  function update(patch:Partial<ProfileDetails>){if(lock.current)return;setForm(current=>current?{...current,...patch}:current);setError('');setField(null);}
  async function save(){
    if(!form||lock.current)return;
    const issue=validateNickname(form.displayName);
    if(issue){setError(issue.message);setField('name');scroll.current?.scrollTo({y:150,animated:true});nameInput.current?.focus();return;}
    if(form.bio.length>80){setError('소개는 80자 이내로 입력해야 합니다.');setField('bio');bioInput.current?.focus();return;}
    lock.current=true;setBusy(true);setError('');setField(null);
    try{await saveMyProfileDetails(form,mode);if(mode==='supabase')await session.retry();if(active.current)router.replace('/profile');}
    catch(caught){if(active.current)setError(caught instanceof Error?caught.message:'저장하지 못했어요. 작성 내용은 그대로 유지돼요.');}
    finally{lock.current=false;if(active.current)setBusy(false);}
  }
  async function photo(){
    if(lock.current)return;if(mode==='demo'){setError('프로필 사진 업로드는 실제 계정 로그인 후 사용할 수 있어요.');return;}
    lock.current=true;setBusy(true);setError('');
    try{const path=await addCorePhoto();if(path&&active.current)setForm(current=>current?{...current,avatarPath:path}:current);}
    catch(caught){if(active.current)setError(caught instanceof Error?caught.message:'사진을 추가하지 못했어요.');}
    finally{lock.current=false;if(active.current)setBusy(false);}
  }
  if(session.status==='loading')return <SafeAreaView style={s.safe}><ActivityIndicator/></SafeAreaView>;
  if(session.mode==='none')return <Redirect href="/welcome"/>;
  return <SafeAreaView style={s.safe} edges={['top','bottom']}><KeyboardAvoidingView style={s.frame} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="프로필 편집 취소" disabled={busy} onPress={()=>router.replace('/profile')} style={s.back}><DesignVector name="back"/></Pressable><Text style={s.headerTitle}>프로필 편집</Text><Pressable accessibilityRole="button" disabled={busy||!form} onPress={()=>void save()} style={s.save}><Text style={s.saveText}>저장</Text></Pressable></View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {loading?<ActivityIndicator color="#F8233C"/>:null}
      {form?<>
        <View style={s.avatar}><ProfileAvatar path={form.avatarPath} name={form.displayName}/><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void photo()}><Text style={[p.link,{padding:12}]}>프로필 사진 {form.avatarPath?'변경':'추가'}</Text></Pressable>{form.avatarPath?<Pressable accessibilityRole="button" disabled={busy} onPress={()=>update({avatarPath:null})}><Text style={p.body}>기본 프로필로 변경</Text></Pressable>:null}</View>
        <View style={s.field}><Text style={s.label}>닉네임</Text><TextInput ref={nameInput} accessibilityLabel="프로필 닉네임" placeholder="2~20자" value={form.displayName} editable={!busy} maxLength={20} onChangeText={displayName=>update({displayName})} style={[s.input,field==='name'&&s.invalid]} autoComplete="nickname" autoCapitalize="none"/>{field==='name'?<Text accessibilityRole="alert" style={p.error}>{error}</Text>:<Text style={s.help}>글자·숫자·공백·마침표·밑줄·하이픈을 사용할 수 있어요.</Text>}</View>
        <View style={s.field}><Text style={s.label}>소개</Text><TextInput ref={bioInput} accessibilityLabel="프로필 소개" placeholder="나를 소개하는 한 줄을 남겨 주세요" value={form.bio} editable={!busy} multiline maxLength={80} onChangeText={bio=>update({bio})} style={[s.input,s.bio,field==='bio'&&s.invalid]}/><Text style={s.counter}>{form.bio.length}/80</Text>{field==='bio'?<Text accessibilityRole="alert" style={p.error}>{error}</Text>:null}</View>
        <Text style={s.help}>사진은 현재 모바일 웹에서 선택할 수 있어요. 기존 무료 저장소의 계정 누적 16장 한도를 공유합니다. 저장해야 프로필에 반영돼요. 프로필 공개를 켠 경우 닉네임·소개·사진이 로그인한 회원에게 보입니다.</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={()=>router.push('/community-settings')} style={p.action}><Text style={p.actionText}>공개 프로필 설정 확인</Text></Pressable>
      </>:null}
      {error&&!field?<Text accessibilityRole="alert" style={p.error}>{error}</Text>:null}
      {!form&&!loading?<Pressable accessibilityRole="button" onPress={()=>{setLoading(true);setLoadKey(n=>n+1);}} style={p.action}><Text style={p.actionText}>다시 시도</Text></Pressable>:null}
      {busy?<ActivityIndicator color="#F8233C"/>:null}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFF'},frame:{width:'100%',maxWidth:402,flex:1,alignSelf:'center'},header:{height:74,alignItems:'center',justifyContent:'center'},back:{position:'absolute',left:6,top:19,width:44,height:44,alignItems:'center',justifyContent:'center'},headerTitle:{fontFamily:homeFont,fontSize:20,lineHeight:33,fontWeight:'700',color:'#000'},save:{position:'absolute',right:21,top:25,borderRadius:20,paddingHorizontal:12,paddingVertical:4,backgroundColor:'#F8233C',minWidth:53,alignItems:'center'},saveText:{fontFamily:homeFont,fontSize:15,lineHeight:23,fontWeight:'600',color:'#FFF'},content:{padding:21,gap:26,paddingBottom:40},avatar:{alignItems:'center',gap:2},field:{gap:8},label:{fontFamily:homeFont,fontSize:15,lineHeight:23,fontWeight:'600',color:'#0A0A0A'},input:{fontFamily:homeFont,fontSize:15,lineHeight:23,color:'#364153',borderWidth:1,borderColor:'#D1D5DC',borderRadius:10,minHeight:48,paddingHorizontal:14,paddingVertical:12},bio:{minHeight:100,textAlignVertical:'top'},help:{fontFamily:homeFont,fontSize:12,lineHeight:19,color:'#6A7282'},counter:{fontFamily:homeFont,fontSize:12,lineHeight:18,textAlign:'right',color:'#99A1AF'},invalid:{borderColor:'#F8233C'}});
