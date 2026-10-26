import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DesignVector } from '@/components/design-vector';
import { homeFont } from '@/components/home-ui';
import { blockFromText, magazineText, type CoreFlowState, type MagazineBlock } from './core-flow';
import { CorePhoto } from './core-photo';

export function CoreEditor({flow,onChange,onPhoto,busy}:{flow:CoreFlowState;onChange:(flow:CoreFlowState)=>void;onPhoto:(index:number)=>void;busy:boolean}) {
  const [selected,setSelected]=useState(0);
  const [more,setMore]=useState(false);
  const [heights,setHeights]=useState<Record<string,number>>({});
  const block=flow.blocks[selected];
  function editBlock(patch:Partial<MagazineBlock>) {onChange({...flow,blocks:flow.blocks.map((b,i)=>i===selected?{...b,...patch}:b)});}
  function addParagraph() {if(flow.blocks.length>=20)return;onChange({...flow,blocks:[...flow.blocks,blockFromText('',`p${Date.now()}`)]});setSelected(flow.blocks.length);}
  return <View style={{flex:1}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <TextInput accessibilityLabel="매거진 제목" placeholder="매거진 제목" value={flow.title} maxLength={80} onChangeText={(title)=>onChange({...flow,title})} style={s.title} multiline editable={!busy}/>
      <Text style={s.hint}>문단을 누르면 해당 문단의 서식을 바꿀 수 있어요.</Text>
      {flow.blocks.map((b,i)=><View key={b.id} style={[s.block,selected===i&&s.selected]}>
        <TextInput accessibilityLabel={`매거진 ${i+1}번째 문단`} placeholder="나의 감상을 작성해 주세요" value={b.text} onFocus={()=>setSelected(i)} multiline scrollEnabled={false} maxLength={1000} editable={!busy} onContentSizeChange={event=>{const height=Math.ceil(event.nativeEvent.contentSize.height);setHeights(current=>current[b.id]===height?current:{...current,[b.id]:height});}} onChangeText={(text)=>onChange({...flow,blocks:flow.blocks.map((item,j)=>j===i?{...item,text}:item)})} style={[s.text,{height:heights[b.id]??Math.max(70,Math.ceil(b.text.length/25)*22),fontSize:b.size,lineHeight:b.size===15?20:26,fontWeight:b.bold?'700':'500',fontStyle:b.italic?'italic':'normal'},b.kind==='quote'&&s.quote]}/>
        {b.kind==='list'?<Text style={s.hint}>목록 문단</Text>:null}
        {b.photo?<><CorePhoto path={b.photo} style={{height:184,marginTop:12}}/><Pressable accessibilityRole="button" disabled={busy} onPress={()=>onChange({...flow,blocks:flow.blocks.map((item,j)=>j===i?{...item,photo:undefined}:item)})}><Text style={s.link}>이 문단 사진 빼기</Text></Pressable></>:null}
        {flow.blocks.length>1?<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{onChange({...flow,blocks:flow.blocks.filter((_,j)=>j!==i)});setSelected(0);}}><Text style={s.hint}>문단 삭제</Text></Pressable>:null}
      </View>)}
      <Text accessibilityLiveRegion="polite" style={[s.count,magazineText(flow).length>1000&&{color:'#F8233C'}]}>{magazineText(flow).length}/1000자 · 제목 포함</Text>
      <Pressable accessibilityRole="button" disabled={busy||flow.blocks.length>=20} onPress={addParagraph}><Text style={s.link}>문단 추가</Text></Pressable>
    </ScrollView>
    {more?<View style={s.options}>{([15,18,20] as const).map((size)=><Pressable key={size} accessibilityRole="button" accessibilityState={{selected:block?.size===size}} onPress={()=>editBlock({size})} style={s.tool}><Text style={{fontSize:size}}>가</Text></Pressable>)}<Text style={s.hint}>글자 크기 · 선택한 문단에 적용</Text></View>:null}
    <View style={s.toolbar}>
      <Pressable accessibilityRole="button" accessibilityLabel="문단 굵게" accessibilityState={{selected:block?.bold}} disabled={busy} onPress={()=>editBlock({bold:!block?.bold})} style={[s.tool,block?.bold&&s.on]}><DesignVector name="coreBold"/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="문단 기울임" accessibilityState={{selected:block?.italic}} disabled={busy} onPress={()=>editBlock({italic:!block?.italic})} style={[s.tool,block?.italic&&s.on]}><DesignVector name="coreItalic"/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="목록 문단" accessibilityState={{selected:block?.kind==='list'}} disabled={busy} onPress={()=>editBlock({kind:block?.kind==='list'?'paragraph':'list'})} style={[s.tool,block?.kind==='list'&&s.on]}><DesignVector name="coreList"/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="인용 문단" accessibilityState={{selected:block?.kind==='quote'}} disabled={busy} onPress={()=>editBlock({kind:block?.kind==='quote'?'paragraph':'quote'})} style={[s.tool,block?.kind==='quote'&&s.on]}><DesignVector name="coreQuote"/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="글자 크기 선택" disabled={busy} onPress={()=>setMore(!more)} style={s.tool}><DesignVector name="more" width={17} height={17}/></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>onPhoto(selected)} style={s.photo}><DesignVector name="corePhoto" width={20}/><Text style={s.photoText}>사진 추가</Text></Pressable>
    </View>
  </View>;
}
const s=StyleSheet.create({content:{paddingHorizontal:35,paddingTop:20,paddingBottom:32},title:{fontFamily:homeFont,fontSize:20,fontWeight:'700',lineHeight:26,letterSpacing:-.75,color:'#000',padding:4},hint:{fontFamily:homeFont,fontSize:11,color:'#858B96',lineHeight:17,marginVertical:5},block:{borderWidth:1,borderColor:'transparent',padding:3,marginVertical:8,borderRadius:4},selected:{borderColor:'#F0D4D9'},text:{fontFamily:homeFont,minHeight:55,letterSpacing:-.75,color:'#364153',textAlignVertical:'top'},quote:{borderLeftWidth:3,borderLeftColor:'#F8233C',paddingLeft:10},count:{fontFamily:homeFont,fontSize:12,color:'#99A1AF',textAlign:'right'},link:{fontFamily:homeFont,fontSize:13,color:'#F8233C',paddingVertical:12},toolbar:{marginHorizontal:25,marginBottom:15,minHeight:53,borderRadius:26.5,paddingHorizontal:5,backgroundColor:'#FFF',flexDirection:'row',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 15px #00000012',flexWrap:'wrap'},tool:{width:36,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:18},on:{backgroundColor:'#FFE4E9'},photo:{flexDirection:'row',gap:4,alignItems:'center',backgroundColor:'#F8233C',paddingHorizontal:9,minHeight:36,borderRadius:24},photoText:{fontFamily:homeFont,color:'#fff',fontSize:15,fontWeight:'600'},options:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',paddingHorizontal:25,backgroundColor:'#FFF'}});
