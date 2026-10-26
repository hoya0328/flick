import { Text, View, StyleSheet } from 'react-native';
import { homeFont } from '@/components/home-ui';
import type { CoreFlowState } from './core-flow';
import { CorePhoto } from './core-photo';

// Structured text only: never render user/AI-controlled HTML, embeds or scripts.
export function CoreMagazine({ flow, cover = false }: {flow:CoreFlowState;cover?:boolean}) {
  return <View>{cover && flow.cover ? <CorePhoto path={flow.cover} style={{height:259}} label="매거진 대표 사진"/> : null}<View style={s.article}>
    <Text style={s.title}>{flow.title}</Text>
    {flow.blocks.map((block)=><View key={block.id} style={{marginTop:20}}>
      {block.text ? <Text style={[s.text,{fontSize:block.size,lineHeight:block.size===15?20:26,fontWeight:block.bold?'700':'500',fontStyle:block.italic?'italic':'normal'},block.kind==='quote' && s.quote]}>{block.kind==='list'?'• ':''}{block.text}</Text> : null}
      {block.photo ? <CorePhoto path={block.photo} style={{height:184,marginTop:20}}/> : null}
    </View>)}
  </View></View>;
}
const s=StyleSheet.create({article:{paddingHorizontal:39,paddingTop:20,paddingBottom:32},title:{fontFamily:homeFont,fontSize:20,lineHeight:26,letterSpacing:-.75,fontWeight:'700',color:'#000'},text:{fontFamily:homeFont,color:'#364153',letterSpacing:-.75,textAlign:'justify'},quote:{borderLeftWidth:3,borderLeftColor:'#F8233C',paddingLeft:12}});
