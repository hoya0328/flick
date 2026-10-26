import { Image,Pressable,StyleSheet,Text,View,type StyleProp,type ViewStyle } from 'react-native';
import Svg,{Circle} from 'react-native-svg';
import { DesignVector } from '@/components/design-vector';
import { homeFont } from '@/components/home-ui';
import { CorePhoto } from '@/features/reviews/core-photo';

export const profileColor={accent:'#F8233C',ink:'#0A0A0A',muted:'#6A7282',border:'#D1D5DC'};
export function ProfileAvatar({path,name,size=84}:{path:string|null;name:string;size?:number}){
  return path?<CorePhoto path={path} label="내 프로필 사진" style={{width:size,height:size,borderRadius:size/2}}/>:<View accessibilityLabel="기본 프로필" style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#FFF0F3',alignItems:'center',justifyContent:'center'}}><Text style={{fontFamily:homeFont,color:'#F8233C',fontSize:size*.35,fontWeight:'700'}}>{Array.from(name.trim())[0]??'F'}</Text></View>;
}
export function ProfileHeader({onSettings,onInfo,onHome}:{onSettings:()=>void;onInfo:()=>void;onHome:()=>void}){
  return <View style={p.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="FLICK 홈으로" onPress={onHome} style={p.home}><DesignVector name="symbol"/></Pressable>
    <View accessibilityLabel="FLICK" style={p.wordmark}><DesignVector name="wordmark"/></View>
    <Pressable accessibilityRole="button" accessibilityLabel="알림 준비 안내" onPress={onInfo} style={p.bell}><DesignVector name="bell"/></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="계정과 취향 설정" onPress={onSettings} style={p.settings}><DesignVector name="profileSettings"/></Pressable>
  </View>;
}
export function ProfileEditIcon(){return <View pointerEvents="none" style={{width:14,height:14}}><DesignVector name="profileEdit" style={{position:'absolute',left:0,top:0}}/><DesignVector name="profileEditLine" style={{position:'absolute',left:6,top:11.33}}/></View>;}
export function ProfileShareIcon(){return <View pointerEvents="none" style={{width:14,height:16}}>
  <DesignVector name="profileShareUp" style={{position:'absolute',left:3.73,top:3}}/>
  <DesignVector name="profileShareDown" style={{position:'absolute',left:3.73,top:7.67}}/>
  <DesignVector name="profileShareDot" style={{position:'absolute',left:8,top:0}}/>
  <DesignVector name="profileShareDot" style={{position:'absolute',left:0,top:4.67}}/>
  <DesignVector name="profileShareDot" style={{position:'absolute',left:8,top:9.33}}/>
  </View>;}
export function TasteRing({point}:{point:{label:string;percent:number}|null}){
  const radius=32,c=2*Math.PI*radius;
  return <View accessibilityLabel={point?`${point.label}, 감상 요소 선택 중 ${point.percent}%`:'감상 요소가 아직 없어요'} style={{width:71,height:71,alignItems:'center',justifyContent:'center'}}>
    <Svg width={71} height={71} style={StyleSheet.absoluteFill}><Circle cx={35.5} cy={35.5} r={radius} stroke="#E5E7EB" strokeWidth={6} fill="none"/><Circle cx={35.5} cy={35.5} r={radius} stroke="#FF7D92" strokeWidth={6} fill="none" strokeDasharray={`${c*(point?.percent??0)/100} ${c}`} transform="rotate(-90 35.5 35.5)"/></Svg>
    <Text style={{fontFamily:homeFont,fontSize:14,lineHeight:21,color:'#F8233C',fontWeight:'700'}}>{point?`${point.percent}%`:'—'}</Text>
    <Text numberOfLines={1} style={{fontFamily:homeFont,fontSize:9,lineHeight:13.5,color:'#6A7282',maxWidth:58}}>{point?.label??'기록 대기'}</Text>
  </View>;
}
export function ProfilePoster({path,title,width=27,height=39,style}:{path:string|null;title:string;width?:number;height?:number;style?:StyleProp<ViewStyle>}){
  return <View style={[{width,height,borderRadius:4,overflow:'hidden',backgroundColor:'#F2F3F6',alignItems:'center',justifyContent:'center'},style]}>{path?<Image accessibilityLabel={`${title} 포스터`} source={{uri:`https://image.tmdb.org/t/p/w342${path}`}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>:<Text numberOfLines={2} style={{fontFamily:homeFont,fontSize:width<40?8:12,color:'#6A7282',textAlign:'center',padding:2}}>{title}</Text>}</View>;
}
export const p=StyleSheet.create({header:{height:73,position:'relative'},home:{position:'absolute',left:13,top:20,width:44,height:44,alignItems:'center',justifyContent:'center'},wordmark:{position:'absolute',left:'50%',marginLeft:-58,top:31},bell:{position:'absolute',right:44,top:18,width:44,height:44,alignItems:'center',justifyContent:'center'},settings:{position:'absolute',right:12,top:18,width:44,height:44,alignItems:'center',justifyContent:'center'},title:{fontFamily:homeFont,fontSize:20,lineHeight:30,fontWeight:'700',color:'#0A0A0A'},body:{fontFamily:homeFont,fontSize:13,lineHeight:19.5,color:'#6A7282'},link:{fontFamily:homeFont,fontSize:13,lineHeight:20,color:'#F8233C'},action:{borderWidth:1,borderColor:'#D1D5DC',minHeight:43,borderRadius:10,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',paddingHorizontal:12},actionText:{fontFamily:homeFont,fontSize:14,lineHeight:21,fontWeight:'600',color:'#0A0A0A'},empty:{marginHorizontal:21,padding:20,borderWidth:1,borderColor:'#E5E7EB',borderRadius:16,gap:12},error:{fontFamily:homeFont,fontSize:12,lineHeight:19,color:'#E51B3A'}});
