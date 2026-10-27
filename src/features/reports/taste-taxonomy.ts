import type { TasteId } from '../../../supabase/functions/_shared/taste-schema';
export type Weights=Partial<Record<TasteId,number>>;
export const tasteTypes:Record<TasteId,{name:string;summary:string;description:string}>={
  scene:{name:'장면형',summary:'색감과 구도, 시각적 연출에 마음이 머물러요.',description:'미장센·촬영·색채를 좋아했다고 남긴 기록이 중심이에요.'},
  afterglow:{name:'여운형',summary:'영화가 끝난 뒤에도 이어지는 감정을 즐겨요.',description:'오래 남는 여운과 감정의 잔상이 반복해서 나타나요.'},
  music:{name:'음악형',summary:'음악과 소리로 영화의 순간을 기억해요.',description:'사운드트랙·음향을 긍정적으로 평가한 기록이 중심이에요.'},
  interpretation:{name:'해석형',summary:'상징과 의미를 발견하는 과정이 즐거워요.',description:'은유·복선·주제를 스스로 해석한 긍정적인 경험이 나타나요.'},
  character:{name:'인물형',summary:'인물의 마음과 관계의 변화에 눈길이 가요.',description:'캐릭터·연기·관계와 심리의 변화를 좋아한 기록이 중심이에요.'},
  narrative:{name:'서사형',summary:'이야기의 전개와 구성에 귀 기울여요.',description:'플롯·각본·구성·결말을 긍정적으로 평가한 기록이 중심이에요.'},
  immersion:{name:'몰입형',summary:'화면 속으로 빠져드는 경험을 즐겨요.',description:'긴장감·흡입력·현장감을 좋아한 기록이 반복돼요.'},
  comfort:{name:'위로형',summary:'마음에 온기를 주는 영화를 가까이해요.',description:'따뜻함·치유·위안을 긍정적으로 경험한 기록이 중심이에요.'},
  aftereffect:{name:'후유증형',summary:'쉽게 잊히지 않는 강렬한 경험을 즐겨요.',description:'충격이나 불편함 자체가 아니라, 그 경험이 좋았다는 근거를 사용해요.'},
  nostalgia:{name:'회상형',summary:'영화 속에서 지나온 시간과 기억을 만나요.',description:'추억·향수·과거의 기억을 즐긴 명확한 근거가 중심이에요.'},
  everyday:{name:'생활형',summary:'일상과 닮은 현실적인 순간에 공감해요.',description:'생활과 현실적인 관계에 공감한 긍정적인 기록이 나타나요.'},
  novelty:{name:'낯선형',summary:'익숙한 틀을 벗어나는 새로운 시도를 즐겨요.',description:'실험성·독창성·새로운 경험을 좋아한 기록이 중심이에요.'},
};
export const keywordWeights:Record<string,Weights>={};
function map(words:string[],weights:Weights){for(const word of words)keywordWeights[word]=weights;}
map(['미장센','미장센이 좋은','구도','색감','색채','촬영','촬영 기법','영상','영상미','시각 효과'],{scene:1});
map(['몽환적인'],{scene:.5,afterglow:.2});map(['눈부신','잿빛의','빛바랜','질감'],{scene:.4});
map(['여운','여운이 긴','여운이 긴 영화','오래 남는','잔상'],{afterglow:1});
map(['뭉클한','먹먹한','애틋한'],{afterglow:.6,character:.2});map(['쓸쓸한','아련한','공허한','적막한'],{afterglow:.4});
map(['음악','사운드','사운드트랙','음향','OST'],{music:1});
map(['상징','은유','복선','해석','의미 해석','생각이 깊어지는'],{interpretation:1});
map(['감정선'],{character:.75,afterglow:.25});map(['연기','인물','캐릭터','관계'],{character:1});
map(['공감되는','설득력 있는','매력적인'],{character:.7});
map(['서사','이야기','각본','플롯','전개','구성','결말'],{narrative:1});map(['촘촘한','헐거운'],{narrative:.5});
map(['몰입감','몰입감 있는','몰입되는','긴장감 있는','긴장되는','속도감 있는','공간감'],{immersion:1});
map(['예측 불가','통쾌한','소용돌이'],{immersion:.5});
map(['위로','위로가 되는','따뜻한','따스한','포근한'],{comfort:1});map(['편안한','잔잔한'],{comfort:.5});
map(['후유증','강렬한'],{aftereffect:.8});map(['거친','기괴한','날것의','섬뜩한','잔혹한','서늘한'],{aftereffect:.4});
map(['노스탤지어','향수','추억','회상'],{nostalgia:1});
map(['일상','생활','현실적인'],{everyday:1});
map(['실험적','실험적인','독창적인','독특한','상상력 있는','신선함'],{novelty:1});map(['낯선','경이로운','세계관이 좋은','세계관','엉뚱한'],{novelty:.5});
// Reviewed built-in labels with no unambiguous 12-type meaning. Never infer a type.
export const unclassifiedKeywords=new Set(['매끄러운','낭만적인','거친 느낌','온도','여백','리듬','궤도','파편','심연','침묵','건조한','경쾌한','끈적한','꿉꿉한','투명한','유쾌한','묵직한','창백한','부유하는','연출','섬세한','대담한','절제된','리드미컬한','느린','안정적인','아쉬운','복잡한','답답한','인상적인','편집','특별함 없음','다시 보고 싶은','추천하고 싶은','한 번이면 충분한','혼란스러운','피로한','밋밋한','과한','재치 있는','과장된','어색한','예측 가능한','웃음이 적은','친숙한','설명이 부족한','분위기','아쉬움','산뜻한']);
export const weightsFor=(label:string):Weights|undefined=>keywordWeights[label.trim()];
