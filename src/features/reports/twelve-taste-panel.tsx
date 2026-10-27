import { ActivityIndicator,Pressable,StyleSheet,Text,View } from 'react-native';
import { Button } from '@/components/button';
import { DesignVector } from '@/components/design-vector';
import type { ReviewRecord } from '../reviews/reviews';
import { tasteTypes } from './taste-engine';
import { useTwelveTaste } from './use-twelve-taste';
import { colors,radii,spacing,typography } from '@/theme/tokens';

function Words({items}:{items:{label:string;count:number}[]}){return items.length?<View style={s.chips}>{items.map(item=><View key={item.label} style={[s.chip,{maxWidth:'100%'}]}><Text numberOfLines={2} style={s.chipText}>{item.label} · {item.count}편</Text></View>)}</View>:<Text style={s.muted}>표시할 기록이 아직 없어요.</Text>;}
export function TwelveTastePanel({records,mode}:{records:ReviewRecord[];mode:'demo'|'supabase'}){
  const taste=useTwelveTaste(records,mode),r=taste.report;
  const statusLabel={insufficient:'데이터 부족',provisional:'임시 유형',mixed:r.reason==='close_scores'?'두 유형이 비슷해요':'긍정 근거를 더 모으는 중',representative:'대표 유형'}[r.status];
  return <View style={s.wrap}>
    <View style={s.dark}>
      <Text style={s.kicker}>12 TASTE TYPES · {statusLabel}</Text><Text accessibilityRole="header" style={s.darkTitle}>{r.headline}</Text>
      <Text style={s.darkBody}>{r.primary?tasteTypes[r.primary].summary:'서로 다른 영화 3편 이상의 유효한 감상 근거가 필요해요. 기록 수만으로 유형을 정하지 않습니다.'}</Text>
      {r.primary?<Text style={s.darkBody}>{tasteTypes[r.primary].description}</Text>:null}
      {r.secondary?<Text style={s.darkEvidence}>함께 나타나는 성향 · {tasteTypes[r.secondary].name}</Text>:null}
      <Text style={s.darkEvidence}>완료 영화 {r.totalMovies}편 · 분석 가능 {r.validFilms}편 · Core 의미 분석 {r.deepFilms}편</Text>
      {r.status==='mixed'?<Text style={s.darkBody}>8편 이상이어도 1·2위 차이 6%p 또는 1위의 긍정 근거 4편 기준을 충족하지 않으면 하나로 확정하지 않아요.</Text>:null}
    </View>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>12가지 취향의 상대 비중</Text><Text style={s.muted}>이 비중은 기록 속 근거의 상대적인 구성이지, 유형에 속할 확률이나 정확도가 아닙니다.</Text>
      {r.ranking.map(id=><View key={id} style={s.row}><View style={s.rowHeader}><Text style={s.label}>{tasteTypes[id].name}</Text><Text style={s.muted}>{r.validFilms&&r.ranking.some(t=>r.share[t]>0)?`${r.share[id].toFixed(1)}%`:'—'} · 긍정 근거 {r.support[id]}편</Text></View><View style={s.track}><View style={[s.fill,{width:`${r.share[id]}%`}]}/></View></View>)}
    </View>
    <View style={s.card}><Text accessibilityRole="header" style={s.heading}>자주 선택한 키워드 TOP 5</Text><Words items={r.topKeywords}/><Text style={s.muted}>동일 영화에서는 한 번만 집계해요. 감상 표현의 빈도이며 모두 선호라는 뜻은 아니에요.</Text></View>
    <View style={s.card}><Text accessibilityRole="header" style={s.heading}>직접 선택한 감상 포인트 TOP 3</Text>{r.topPoints.length?r.topPoints.map(p=><Text key={p.label} style={s.body}>{p.label} · {p.count}편 · {p.percent.toFixed(1)}%</Text>):<Text style={s.muted}>Light에서 ‘어떤 점이 좋았나요?’를 선택하면 표시돼요.</Text>}<Text style={s.muted}>Light의 실제 선택 항목을 기준으로 집계합니다.</Text></View>
    <View style={s.card}><Text accessibilityRole="header" style={s.heading}>별점별 감상 표현</Text><Text style={s.label}>높은 별점 영화 · 4점 이상</Text><Words items={r.highKeywords}/><Text style={s.label}>낮은 별점 영화 · 2.5점 이하</Text><Words items={r.lowKeywords}/></View>
    <View style={s.card}><Text accessibilityRole="header" style={s.heading}>별점 분포</Text><Text style={s.body}>평균 ★{r.meanRating??'—'} · 평가 영화 {Object.values(r.ratingCounts).reduce((a,b)=>a+b,0)}편</Text><Text style={s.muted}>가장 많이 준 별점 · {r.modalRatings.length?r.modalRatings.map(v=>`★${v}`).join(' · '):'아직 없어요'}</Text>{Object.entries(r.ratingCounts).sort(([a],[b])=>Number(b)-Number(a)).map(([rating,count])=><View key={rating} style={s.rowHeader}><Text style={s.body}>★ {Number(rating).toFixed(1)}</Text><Text style={s.muted}>{count}편</Text></View>)}<Text style={s.muted}>같은 영화는 가장 최근 감상일의 완료 기록으로 한 번만 계산해요.</Text></View>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>Core 원문 의미 분석 · 무료 테스트</Text>
      <Text style={s.body}>키워드 계산만으로도 리포트를 사용할 수 있어요. 원문 분석에 별도로 동의하면 완료한 Core의 영화 제목·질문·직접 쓴 답변만 Google Gemini에 전송합니다. AI 코멘트·매거진 본문은 보내지 않아요.</Text>
      <Text style={s.muted}>무료 입력은 Google 서비스 개선에 사용될 수 있어요. 개인정보·민감정보는 입력하지 마세요. 동의 철회 시 저장된 AI 분석만 삭제하며 원본 리뷰는 유지합니다.</Text>
      <Text style={s.muted}>계정당 5개/일·2개/분, 서비스 전체 30개/일. 무료 한도·연결 실패 시 유료로 전환하지 않아요.</Text>
      {mode==='demo'?<Text style={s.muted}>데모에서는 원문을 외부로 전송하지 않아요. 실제 계정 로그인 후 선택적으로 사용할 수 있어요.</Text>:<>
        {!taste.freeAvailable?<Text style={s.muted}>무료 연결 확인이 필요해 신규 AI 분석은 대기 중입니다. 기존 키워드 결과는 계속 표시해요.</Text>:<Text style={s.muted}>무료 등급 확인 유효 기한 · {taste.verifiedUntil?.slice(0,10)}</Text>}
        <Pressable accessibilityRole="checkbox" aria-checked={taste.consent} accessibilityLabel="Core 원문을 무료 Gemini로 분석하는 데 동의해요 (선택)" accessibilityState={{checked:taste.consent,disabled:taste.busy||!taste.loaded||(!taste.consent&&!taste.freeAvailable)}} disabled={taste.busy||!taste.loaded||(!taste.consent&&!taste.freeAvailable)} onPress={()=>void taste.toggleConsent(!taste.consent)} style={[s.consent,{flexDirection:'row',gap:10,alignItems:'center'}]}><View style={{width:20,height:20,borderWidth:1,borderColor:colors.primary,borderRadius:4,alignItems:'center',justifyContent:'center',backgroundColor:taste.consent?colors.primary:'transparent'}}>{taste.consent?<DesignVector name="check" width={12} height={10}/>:null}</View><Text style={[s.body,{flex:1}]}>Core 원문을 무료 Gemini로 분석하는 데 동의해요 (선택)</Text></Pressable>
        <Button label={taste.busy?'분석 처리 중…':`미분석 Core 한 개 분석 (${r.pendingCore}편 대기)`} disabled={!taste.consent||!taste.freeAvailable||taste.busy||r.pendingCore===0} onPress={()=>void taste.analyzeNext()} variant="secondary"/>
        <Text style={s.muted}>동의 후 새 Core 완료 저장 시 자동 분석을 시도합니다. 과거 기록은 무료 한도를 보호하기 위해 한 개씩 처리해요. 분석이 끝나도 근거가 없으면 분류하지 않습니다.</Text>
      </>}
      {taste.busy?<ActivityIndicator accessibilityLabel="취향 원문 분석 처리 중" color={colors.primary}/>:null}
      {taste.error?<Text accessibilityRole="alert" style={s.error}>{taste.error}</Text>:null}{taste.message?<Text accessibilityLiveRegion="polite" style={s.muted}>{taste.message}</Text>:null}
      <Button label="분석 상태 새로고침" disabled={taste.busy} onPress={taste.reload} variant="ghost"/>
    </View>
    <View style={s.card}><Text style={s.heading}>분석 기준과 준비 중 기능</Text><Text style={s.muted}>Light·Core가 모두 분석 가능하면 40:60으로 합산하고, 별점·최신성·자료 품질을 작게 보정해요. 미매핑 표현 {r.unmapped.length}개는 유형에 임의로 넣지 않습니다.</Text><Text style={s.muted}>보고 싶은 영화는 저장 이유가 없어 유형에 반영하지 않아요. 직접 수정한 매거진 문장만 구분하는 기능·유료 AI/검색/대량 분석 연동은 제공하지 않습니다.</Text><Text style={s.muted}>버전 {r.version} · 3~7편은 임시, 8편부터 추가 근거 기준을 충족하면 대표 유형을 제시합니다. 통계적으로 검증된 성격 검사가 아닙니다.</Text></View>
  </View>;
}
const s=StyleSheet.create({wrap:{gap:spacing.lg},card:{backgroundColor:colors.surface,borderRadius:radii.lg,padding:spacing.lg,gap:spacing.md},heading:{...typography.heading,color:colors.text},body:{...typography.body,color:colors.text},muted:{...typography.caption,color:colors.textMuted},label:{...typography.label,color:colors.text},dark:{backgroundColor:colors.text,borderRadius:radii.lg,padding:spacing.xxl,gap:spacing.sm},kicker:{...typography.caption,color:'#FF9CAA',fontWeight:'800'},darkTitle:{...typography.title,color:colors.surface},darkBody:{...typography.body,color:colors.border},darkEvidence:{...typography.caption,color:'#FFCAD2'},row:{gap:spacing.xs},rowHeader:{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'},track:{height:8,borderRadius:10,backgroundColor:colors.border,overflow:'hidden'},fill:{height:8,borderRadius:10,backgroundColor:colors.primary},chips:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},chip:{backgroundColor:colors.primarySoft,borderRadius:radii.pill,paddingHorizontal:spacing.md,paddingVertical:spacing.sm},chipText:{...typography.label,color:colors.primary},consent:{minHeight:44,paddingVertical:8},error:{...typography.caption,color:'#C50022'}});
