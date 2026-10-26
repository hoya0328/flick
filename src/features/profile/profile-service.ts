import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { accountErrorMessage, normalizeNickname, validateNickname } from '@/features/session/account-logic';
import { isPhotoPath,normalizeSavedPage,type SavedKind,type SavedPage } from './profile-model';

export type ProfileDetails={displayName:string;bio:string;avatarPath:string|null};
const demoKey='flick.profile.v1.demo';
const empty:ProfileDetails={displayName:'FLICK 사용자',bio:'',avatarPath:null};
function details(value:unknown):ProfileDetails {
  if(!value||typeof value!=='object')return {...empty};
  const row=value as Record<string,unknown>;
  return {displayName:typeof row.display_name==='string'?row.display_name:typeof row.displayName==='string'?row.displayName:empty.displayName,bio:typeof row.bio==='string'?row.bio.slice(0,80):'',avatarPath:isPhotoPath(row.avatar_path)?row.avatar_path:isPhotoPath(row.avatarPath)?row.avatarPath:null};
}
export async function getMyProfileDetails(mode:'demo'|'supabase'):Promise<ProfileDetails>{
  if(mode==='demo'){const stored=await AsyncStorage.getItem(demoKey);try{return details(stored?JSON.parse(stored):null);}catch{return {...empty};}}
  if(!supabase)throw new Error('계정 서버가 연결되지 않았어요.');
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user)throw new Error('로그인 세션을 확인해 주세요.');
  const {data,error}=await supabase.from('profiles').select('display_name,bio,avatar_path').eq('id',auth.user.id).maybeSingle();
  if(error)throw new Error('프로필 정보를 불러오지 못했어요.');
  return details(data);
}
export async function saveMyProfileDetails(input:ProfileDetails,mode:'demo'|'supabase'){
  const issue=validateNickname(input.displayName);if(issue)throw new Error(issue.message);
  if(input.bio.length>80)throw new Error('소개는 80자 이내로 작성해야 합니다.');
  if(input.avatarPath!==null&&!isPhotoPath(input.avatarPath))throw new Error('프로필 사진을 다시 선택해 주세요.');
  const value={...input,displayName:normalizeNickname(input.displayName)};
  if(mode==='demo'){if(value.avatarPath)throw new Error('사진 업로드는 로그인 후 이용해 주세요.');await AsyncStorage.setItem(demoKey,JSON.stringify(value));return;}
  if(!supabase)throw new Error('계정 서버가 연결되지 않았어요.');
  const {error}=await supabase.rpc('save_my_profile',{p_name:value.displayName,p_bio:value.bio,p_avatar_path:value.avatarPath});
  if(error)throw new Error(accountErrorMessage(new Error(error.message)));
}
export async function listMySavedContent(mode:'demo'|'supabase',kind:SavedKind,offset=0):Promise<SavedPage>{
  if(mode==='demo')return {items:[],total:0};
  if(!supabase)throw new Error('저장함 서버가 연결되지 않았어요.');
  const {data,error}=await supabase.rpc('list_my_saved_content',{p_kind:kind,p_limit:12,p_offset:Math.max(0,offset)});
  if(error)throw new Error('저장한 콘텐츠를 불러오지 못했어요. 다시 시도해 주세요.');
  return normalizeSavedPage(data);
}
export async function isEditorialSaved(id:string){
  if(!supabase)throw new Error('로그인 후 사용할 수 있어요.');
  const {data,error}=await supabase.rpc('is_editorial_curation_saved',{p_curation_id:id});
  if(error)throw new Error('저장 상태를 불러오지 못했어요.');
  return data===true;
}
export async function setEditorialSaved(id:string,active:boolean){
  if(!supabase)throw new Error('로그인 후 사용할 수 있어요.');
  const {error}=await supabase.rpc('set_editorial_curation_saved',{p_curation_id:id,p_active:active});
  if(error)throw new Error('저장을 변경하지 못했어요. 공개 상태와 연결을 확인해 주세요.');
}
