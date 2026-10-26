import { useEffect, useState } from 'react';
import { Image, View, Text, type StyleProp, type ViewStyle } from 'react-native';
import { supabase } from '@/lib/supabase';
import { pickCorePhoto } from './core-photo-picker';

export async function addCorePhoto(): Promise<string|null> {
  if (!supabase) throw new Error('사진 추가는 실제 계정 로그인 후 사용할 수 있어요.');
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) throw new Error('로그인 상태를 확인해 주세요.');
  const blob = await pickCorePhoto();
  if (!blob) return null;
  const path = `${auth.user.id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage.from('core-photos').upload(path,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'30'});
  if (uploadError) throw new Error('사진을 저장하지 못했어요. 무료 테스트 저장 한도(계정당 16장)에 도달했거나 연결이 끊겼어요. 기존 기록은 보존돼요.');
  return path;
}
export function CorePhoto({ path, style, label='매거진 사진' }: { path:string; style?:StyleProp<ViewStyle>; label?:string }) {
  const [result,setResult]=useState<{path:string;uri:string|null}|null>(null);
  const uri=result?.path===path?result.uri:null;
  useEffect(()=>{
    let active=true;
    const refresh=()=>{ if(supabase) void supabase.storage.from('core-photos').createSignedUrl(path,60).then(({data,error})=>{if(active)setResult({path,uri:!error ? data?.signedUrl ?? null : null});}).catch(()=>{if(active)setResult({path,uri:null});}); };
    refresh(); const timer=setInterval(refresh,45000);
    return()=>{active=false;clearInterval(timer);};
  },[path]);
  return <View style={[{backgroundColor:'#D1D5DC',overflow:'hidden'},style]}>{uri ? <Image accessibilityLabel={label} source={{uri}} resizeMode="cover" style={{width:'100%',height:'100%'}} onError={()=>setResult({path,uri:null})} /> : <Text style={{color:'#64748B',fontSize:12,padding:12}}>사진을 불러오는 중이거나 접근할 수 없어요</Text>}</View>;
}
