import type { PropsWithChildren } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DesignVector } from '@/components/design-vector';
import { homeFont } from '@/components/home-ui';
import { ProfilePoster } from '@/features/profile/profile-ui';
import { CoreMagazine } from './core-magazine';
import { CorePhoto } from './core-photo';
import { lightReaderRows, readerKeywords } from './review-reader-model';
import type { ReviewRecord } from './reviews';

const palette = ['#C02AEE', '#00BC7D', '#FF3B44', '#1E222A', '#008CFF', '#FFAA00'];

function ReadKeywords({ words }: { words: string[] }) {
  return <View style={s.tags}>{words.map((word, index) => <View key={`${index}:${word}`} style={[s.tag, { backgroundColor: palette[index % palette.length] }]}><Text style={s.tagText}>{word}</Text></View>)}</View>;
}

function SpoilerBadge() {
  return <View accessibilityLabel="스포일러 포함" style={s.spoiler}><Text style={s.spoilerText}>스포일러 포함</Text><View style={s.spoilerCircle} /></View>;
}

export function ReviewReaderShell({ record, onBack, onEdit, children }: PropsWithChildren<{record: ReviewRecord; onBack: () => void; onEdit?: () => void}>) {
  return <SafeAreaView edges={['top','bottom']} style={s.safe}>
    <View style={s.frame}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="이전 화면" onPress={onBack} style={[s.icon, s.back]}><DesignVector name="back" /></Pressable>
        {record.mode === 'core' ? <Pressable accessibilityRole={onEdit ? 'button' : undefined} accessibilityLabel={onEdit ? '리뷰 공개 범위 수정 화면 열기' : undefined} disabled={!onEdit} onPress={onEdit} style={s.headerTitleRow}><Text style={s.headerTitle}>리뷰 · {record.visibility === 'public' ? '전체' : '나만'}</Text>{onEdit ? <DesignVector name="dateArrow" /> : null}</Pressable> : <Text style={[s.headerTitle, s.lightHeaderTitle]}>가볍게 기록하기</Text>}
        {onEdit ? <Pressable accessibilityRole="button" accessibilityLabel="내 리뷰 수정" onPress={onEdit} style={[s.icon, s.edit]}><DesignVector name="coreEdit" /></Pressable> : null}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
        {record.mode === 'light' ? <LightReadingContent record={record} /> : <CoreReadingContent record={record} />}
        {children}
      </ScrollView>
    </View>
  </SafeAreaView>;
}

function LightReadingContent({ record }: { record: ReviewRecord }) {
  const words = readerKeywords(record);
  const rows = lightReaderRows(record);
  return <View testID="light-review-reader" style={s.light}>
    <View style={s.movie}>
      <ProfilePoster path={record.movie.posterPath} title={record.movie.title} width={60} height={85} />
      <View style={s.movieInfo}><Text style={s.movieTitle}>{record.movie.title}</Text><Text style={s.movieMeta}>{[record.movie.originalTitle, record.movie.releaseDate?.slice(0,4)].filter(Boolean).join(' · ') || record.watchedAt}</Text>
        {record.rating !== null ? <View accessibilityLabel={`별점 ${record.rating}점`} style={s.rating}><View style={s.stars}>{Array.from({length:5},(_,i)=><View key={i} style={{width:14,height:13}}><DesignVector name="reviewStar" style={{opacity:.22}} /><View style={{position:'absolute',left:0,top:0,width:14*Math.max(0,Math.min(1,(record.rating??0)-i)),height:13,overflow:'hidden'}}><DesignVector name="reviewStar" /></View></View>)}</View><Text style={s.ratingValue}>{record.rating.toFixed(1)}</Text></View> : null}
      </View>
    </View>
    {record.spoiler ? <SpoilerBadge /> : null}
    {words.length ? <View accessibilityLabel="대표 키워드" style={s.panel}><Text style={s.sectionTitle}>대표 키워드</Text><ReadKeywords words={words} /></View> : null}
    {rows.length ? <View style={s.panel}><Text style={s.sectionTitle}>내 키워드 기록</Text>{rows.map(row => <View key={row.key} style={s.questionRow}><Text style={s.question}>Q{row.number}. {row.question}</Text>{row.labels.length ? <ReadKeywords words={row.labels} /> : row.answer ? <Text selectable style={s.answer}>{row.answer}</Text> : null}</View>)}</View> : null}
    {record.body.trim() || record.oneLine.trim() ? <View accessibilityLabel="작성한 리뷰" style={[s.panel, s.review]}>{record.oneLine.trim() && record.oneLine.trim() !== record.body.trim() ? <Text selectable style={s.oneLine}>{record.oneLine}</Text> : null}{record.body.trim() ? <Text selectable testID="readable-copy" style={s.body}>{record.body}</Text> : null}</View> : null}
  </View>;
}

function CoreReadingContent({ record }: { record: ReviewRecord }) {
  const flow = record.coreFlow;
  return <View testID="core-review-reader" style={s.core}>
    {flow?.cover ? <CorePhoto path={flow.cover} label="매거진 대표 사진" style={s.cover} /> : null}
    {record.spoiler ? <View style={s.spoilerInset}><SpoilerBadge /></View> : null}
    {flow?.version === 1 ? <CoreMagazine flow={flow} reading /> : <View style={s.legacyArticle}>
      <Text selectable style={s.articleTitle}>{record.oneLine.trim() || record.movie.title}</Text>
      {record.body.split(/\n\s*\n/).filter(text=>text.trim()).map((text,index)=><Text selectable testID="readable-copy" key={index} style={s.articleParagraph}>{text}</Text>)}
    </View>}
  </View>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#FFF'},frame:{flex:1,width:'100%',maxWidth:402,alignSelf:'center'},scroll:{paddingBottom:34},
  header:{height:73,marginTop:Platform.OS==='web'?62:0,backgroundColor:'#FFF',position:'relative'},icon:{position:'absolute',top:19,width:44,height:44,alignItems:'center',justifyContent:'center'},back:{left:5.5},edit:{right:11},headerTitleRow:{position:'absolute',top:24,left:55,right:55,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,minHeight:33},headerTitle:{fontFamily:homeFont,fontSize:20,lineHeight:33,fontWeight:'700',letterSpacing:-.2,color:'#000'},lightHeaderTitle:{position:'absolute',top:24,left:55,right:55,textAlign:'center'},
  light:{paddingTop:16,paddingHorizontal:21,gap:21},movie:{borderWidth:1,borderColor:'#DDE1E8',borderRadius:17,paddingHorizontal:17,paddingVertical:17,flexDirection:'row',gap:19,minHeight:121,alignItems:'center'},movieInfo:{flex:1,minWidth:0},movieTitle:{fontFamily:homeFont,fontSize:17,lineHeight:23,fontWeight:'700',color:'#000'},movieMeta:{fontFamily:homeFont,fontSize:13,lineHeight:17,color:'#8A8A8A',marginTop:7},rating:{flexDirection:'row',alignItems:'center',gap:9,marginTop:10},stars:{flexDirection:'row',gap:4},ratingValue:{fontFamily:homeFont,fontSize:13,lineHeight:19.5,fontWeight:'600',color:'#F8233C'},
  panel:{borderRadius:17,borderWidth:1,borderColor:'#DDE1E8',paddingHorizontal:17,paddingTop:12,paddingBottom:20},sectionTitle:{fontFamily:homeFont,fontSize:16,lineHeight:24,fontWeight:'700',color:'#000'},tags:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12},tag:{minHeight:36,borderRadius:20,paddingHorizontal:12,paddingVertical:8,maxWidth:'100%',justifyContent:'center'},tagText:{fontFamily:homeFont,fontSize:15,lineHeight:20,color:'#FFF',fontWeight:'500'},questionRow:{marginTop:14},question:{fontFamily:homeFont,fontSize:15,lineHeight:20,letterSpacing:-.75,color:'#99A1AF'},answer:{fontFamily:homeFont,fontSize:15,lineHeight:20,color:'#364153',marginTop:8},review:{paddingTop:20,paddingBottom:24},body:{fontFamily:homeFont,fontSize:15,lineHeight:20,letterSpacing:-.75,fontWeight:'500',color:'#364153'},oneLine:{fontFamily:homeFont,fontSize:17,lineHeight:24,fontWeight:'600',color:'#000',marginBottom:16},
  core:{backgroundColor:'#F9FAFB'},cover:{width:'100%',aspectRatio:402/259},spoilerInset:{paddingHorizontal:39,paddingTop:15},spoiler:{alignSelf:'flex-start',height:32,borderWidth:1,borderColor:'#D9D9D9',borderRadius:6,paddingHorizontal:10,flexDirection:'row',gap:8,alignItems:'center',backgroundColor:'#FFF'},spoilerText:{fontFamily:homeFont,fontSize:13,color:'#8A8A8A'},spoilerCircle:{width:14,height:14,borderWidth:1,borderColor:'#8A8A8A',borderRadius:7},legacyArticle:{paddingHorizontal:39,paddingTop:20,paddingBottom:32},articleTitle:{fontFamily:homeFont,fontSize:20,lineHeight:26,fontWeight:'700',letterSpacing:-.75,color:'#000'},articleParagraph:{fontFamily:homeFont,fontSize:15,lineHeight:20,fontWeight:'500',letterSpacing:-.75,color:'#364153',marginTop:20},
});
