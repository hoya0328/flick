import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { MovieCard } from '@/components/movie-card';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import { getPublishedCuration, type EditorialCurationDetail } from '@/features/discovery/discovery-insights';
import { isEditorialSaved,setEditorialSaved } from '@/features/profile/profile-service';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function CurationDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const curationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { mode, status: sessionStatus } = useSession();
  const [curation, setCuration] = useState<EditorialCurationDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [saved,setSaved]=useState<boolean|null>(null),[saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
  const request=useRef(0),saveLock=useRef(false);

  const load = useCallback(async () => {
    if (!curationId || mode !== 'supabase') return;
    const token=++request.current;
    setStatus('loading');setSaved(null);setSaveError('');setSaving(false);saveLock.current=false;
    try {
      const result = await getPublishedCuration(curationId);if(token!==request.current)return;
      setCuration(result);setStatus(result ? 'ready' : 'missing');
      if(result){try{const value=await isEditorialSaved(curationId);if(token===request.current)setSaved(value);}catch{if(token===request.current)setSaveError('저장 상태를 확인하지 못했어요. 다시 확인해 주세요.');}}
    }
    catch { if(token===request.current)setStatus('error'); }
  }, [curationId, mode]);
  async function toggleSaved(){
    if(!curationId||saveLock.current||saved===null)return;
    const token=request.current,next=!saved;saveLock.current=true;setSaving(true);setSaveError('');
    try{await setEditorialSaved(curationId,next);if(token===request.current)setSaved(next);}
    catch{if(token===request.current)setSaveError('저장을 변경하지 못했어요. 다시 시도해 주세요.');}
    finally{if(token===request.current){saveLock.current=false;setSaving(false);}}
  }

  const cancelRequest=useCallback(()=>{request.current++;},[]);
  useEffect(() => { if (sessionStatus !== 'ready') return; const timer = setTimeout(() => void load(), 0); return () => {clearTimeout(timer);cancelRequest();}; }, [load, sessionStatus,cancelRequest]);

  if (sessionStatus !== 'ready' || (mode === 'supabase' && status === 'loading')) return <Screen><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (mode !== 'supabase') return <Screen eyebrow="FLICK EDIT" title="로그인 후 볼 수 있어요"><StateNotice message="편집 큐레이션은 FLICK 계정 사용자에게 출처와 함께 제공합니다." title="로그인이 필요해요" tone="warning" /><Button label="로그인하기" onPress={() => router.replace('/welcome')} /></Screen>;
  if (status === 'error') return <Screen eyebrow="FLICK EDIT" title="불러오지 못했어요"><StateNotice message="연결을 확인하고 다시 시도해 주세요." title="조회 오류" tone="danger" /><Button label="다시 시도" onPress={() => void load()} /></Screen>;
  if (status === 'missing' || !curation) return <Screen eyebrow="FLICK EDIT" title="볼 수 없는 큐레이션이에요"><StateNotice message="관리자가 비공개로 전환했거나 삭제했을 수 있어요." title="접근할 수 없음" tone="warning" /><Button label="홈으로" onPress={() => router.replace('/')} /></Screen>;

  return (
    <Screen eyebrow={curation.kind === 'expert' ? '전문가 시점 매거진' : '니치 큐레이션'} title={curation.title}>
      <View style={styles.intro}>
        <Button label={saved?'매거진 보관 해제':'매거진 보관하기'} disabled={saved===null||saving} onPress={()=>void toggleSaved()} variant="secondary"/>
        {saveError?<Text accessibilityRole="alert" style={styles.note}>{saveError}</Text>:null}
        {saved===null&&saveError?<Button label="저장 상태 다시 확인" onPress={()=>void load()} variant="ghost"/>:null}
        <Text style={styles.description}>{curation.description}</Text>
        {curation.kind === 'expert' ? <StateNotice message={`${curation.curatorName}의 관점으로 구성했으며, 관리자가 작성자·출처·게시 권한을 확인한 콘텐츠입니다.`} title="출처가 확인된 전문가 콘텐츠" tone="success" /> : <StateNotice message="대중적인 순위가 아니라 구체적인 상황과 분위기를 기준으로 관리자가 고른 목록입니다." title="선정 기준" tone="info" />}
        {curation.sourceUrl ? <Button label="원문·출처 확인" onPress={() => void Linking.openURL(curation.sourceUrl)} variant="secondary" /> : null}
      </View>
      {curation.items.map((item, index) => <View key={item.movie.id} style={styles.item}><Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text><MovieCard movie={item.movie} />{item.note ? <Text style={styles.note}>{item.note}</Text> : null}</View>)}
      {!curation.items.length ? <StateNotice message="공개할 영화 목록을 정리하고 있어요." title="목록 준비 중" /> : null}
      <Button label="홈으로" onPress={() => router.replace('/')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.lg, padding: spacing.xl },
  description: { ...typography.body, color: colors.text },
  item: { gap: spacing.sm },
  number: { ...typography.title, color: colors.primary },
  note: { ...typography.body, backgroundColor: colors.primarySoft, borderRadius: radii.md, color: colors.text, padding: spacing.lg },
});
