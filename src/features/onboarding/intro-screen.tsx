import { useState, useSyncExternalStore } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { homeFont } from '@/components/home-ui';
import { IntroVector } from './intro-art';
import type { IntroMode, IntroPage } from './intro-model';

const accent = '#F8233C';
const subscribeViewportHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
function useIntroMetrics() {
  const viewport = useWindowDimensions();
  const hydrated = useSyncExternalStore(subscribeViewportHydration, clientSnapshot, serverSnapshot);
  return hydrated ? viewport : { width: 402, height: 875 };
}
const headings = ['영화 감상,\n어떻게 남겨야 할지\n막막했다면?', '키워드를 고르면\n한줄평이\n만들어져요', '깊게 답하면\n평론 매거진이\n만들어져요', '이제\n첫 영화를\n기록해볼까요?'];
const descriptions = ['질문에 답하고 키워드를 고르면\n당신의 감상이 리뷰가 돼요.', 'AI가 던지는 질문에 키워드로 답하면\n감상문이 자동으로 완성돼요.', '영화에 맞춘 AI 딥다이브 질문을 통해\n당신의 답변을 매거진 초안으로 정리해요.', '어떤 방식으로 기록할지\n선택해보세요.'];
const kickers = ['', '가볍게 기록하기', '집중해서 기록하기', '리뷰 작성해보기'];
const progressWidths = [[26, 13, 14, 13], [13, 26, 14, 13], [13, 14, 26, 13], [13, 14, 13, 26]] as const;
const placeholder = '지금 머릿속에 가장 먼저 맴도는 단어나 느낌을 적어보세요!\n완벽한 문장이 아니어도 괜찮아요. (10자 이상)\n\n예시) 외롭다, 흔들리는 카메라, 파인애플 통조림, 유통기한\n\n예시) 사람은 엄청 많은데 왠지 쓸쓸하고 축축한 느낌\n\n물론, 남겨주시는 감상이 길어질수록 리뷰의 깊이와 해상도는 훨씬 더 정교해집니다.';
const bubbles = [
  ['묵직한', 61.23, 0, 107.77, 53.293, 23.686, 59.214],
  ['낭만적인', 239.51, 4.83, 109.44, 44.949, 19.543, 39.086],
  ['온도', 42.5, 94.63, 76.84, 45.659, 22.272, 55.681],
  ['잔상', 177.75, 77.95, 57.34, 34.071, 16.62, 41.55],
  ['여운', 288.11, 114.17, 63.89, 37.964, 18.519, 46.297],
  ['몽환적인', 102.79, 155.34, 163.41, 67.115, 29.18, 58.361],
] as const;
const tags = [
  ['빛바랜', '#FFAA00', 25.8405, 182.411, '-24.05deg'],
  ['몽환적인', '#C02AEE', 136.4665, 231.4895, '8.53deg'],
  ['파편', '#008CFF', 262.0395, 204.937, '-6.71deg'],
] as const;
const posters = [
  { source: require('../../../assets/figma-intro/poster-4.png'), left: -97, width: 145.964 },
  { source: require('../../../assets/figma-intro/poster-2.png'), left: 58.96, width: 145.654 },
  { source: require('../../../assets/figma-intro/poster-1.png'), left: 214.62, width: 145.654 },
  { source: require('../../../assets/figma-intro/poster-3.png'), left: 370.27, width: 148.627 },
];

export function IntroSplash() {
  const scale = Math.min(useIntroMetrics().width, 402) / 402;
  return <View accessibilityLabel="FLICK 시작 화면" style={styles.splash}><View accessible accessibilityLabel="FLICK"><IntroVector name="brand-splash" width={326 * scale} /></View></View>;
}

export function IntroScreen({ page, busy, error, onNext, onSkip, onChoose }: {
  page: IntroPage; busy: boolean; error: string; onNext: () => void; onSkip: () => void; onChoose: (mode: IntroMode) => void;
}) {
  const dimensions = useIntroMetrics(), width = Math.min(dimensions.width, 402), s = width / 402;
  const [answer, setAnswer] = useState(''), [notice, setNotice] = useState(''), [changed, setChanged] = useState(false), [selected, setSelected] = useState<string[]>([]);
  const q = changed ? '이 영화에서 가장 오래 기억에 남는 장면은 무엇인가요?' : '이 영화가 가진 가장 독보적인\n분위기를 정의한다면?';
  const button = (label: string, action: () => void, secondary = false, arrow = false) => <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={action} style={[styles.button, { height: 56 * s, borderRadius: 50 * s, backgroundColor: secondary ? '#F0F0F0' : accent, opacity: busy ? .6 : 1 }]}>
    <Text style={{ fontFamily: homeFont, fontWeight: '600', fontSize: 20 * s, lineHeight: 30 * s, letterSpacing: -.2 * s, color: secondary ? '#2C2C2C' : '#FFFFFF' }}>{label}</Text>
    {arrow ? <View style={{ position: 'absolute', right: 23.55 * s }}><IntroVector name={secondary ? 'arrow-light' : 'arrow-core'} width={(secondary ? 7.48171 : 7.53493) * s} /></View> : null}
  </Pressable>;
  return <View style={styles.outer}><ScrollView key={page} showsVerticalScrollIndicator={false} style={{ width }} contentContainerStyle={{ minHeight: Math.max((page === 3 ? 1088 : 875) * s, dimensions.height), justifyContent: 'space-between' }} keyboardShouldPersistTaps="handled">
    <View>
      {/* Figma's iPhone status/home components are OS chrome, not simulated time/battery. */}
      <View style={{ height: 62 * s }} />
      <View style={{ height: 42 * s, paddingHorizontal: 21 * s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', transform: [{ translateY: -2 * s }] }}>
        <View accessibilityRole="progressbar" accessibilityLabel="서비스 소개 진행" accessibilityValue={{ min: 1, max: 4, now: page }} style={{ flexDirection: 'row', gap: 5 * s }}>
          {[1, 2, 3, 4].map(index => <View key={index} style={{ width: progressWidths[page - 1]![index - 1]! * s, height: 4 * s, borderRadius: 3.5 * s, backgroundColor: index <= page ? accent : '#EBEDF3' }} />)}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="서비스 소개 건너뛰기" disabled={busy} onPress={onSkip} hitSlop={7} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontFamily: homeFont, fontWeight: '500', fontSize: 15 * s, lineHeight: 18 * s, letterSpacing: -.15 * s, color: '#6A7282', textDecorationLine: 'underline' }}>건너뛰기</Text></Pressable>
      </View>
      <View style={{ marginTop: (page === 1 ? 20 : 21) * s, paddingHorizontal: 21 * s }}>
        <View style={{ height: 31 * s }}>{page === 1 ? <IntroVector name="brand-small" width={84 * s} /> : <Text style={{ fontFamily: homeFont, color: accent, fontSize: 20 * s, lineHeight: 30 * s, fontWeight: '600', letterSpacing: -.2 * s }}>{kickers[page - 1]}</Text>}</View>
        <Text accessibilityRole="header" style={{ fontFamily: homeFont, marginTop: (page === 1 ? 17 : 16) * s, height: 150 * s, fontSize: 38 * s, lineHeight: 50 * s, fontWeight: '700', letterSpacing: -.38 * s, color: '#000000', marginLeft: page === 3 ? 3 * s : 0 }}>{headings[page - 1]}</Text>
        <Text style={{ fontFamily: homeFont, marginTop: 15 * s, height: 60 * s, fontSize: (page === 1 || page === 4 ? 18 : 20) * s, lineHeight: (page === 1 || page === 4 ? 26 : 30) * s, letterSpacing: -(page === 1 || page === 4 ? .18 : .2) * s, color: '#6A7282', fontWeight: '500', marginLeft: page === 3 ? 3 * s : 0 }}>{descriptions[page - 1]}</Text>
        {page === 1 ? <View accessibilityLabel="키워드 예시: 묵직한, 낭만적인, 온도, 잔상, 여운, 몽환적인" style={{ marginTop: 61.6 * s, height: 222.455 * s, width, marginLeft: -21 * s }}>
          {bubbles.map(([label, x, y, w, h, font, blur]) => <View key={label} style={{ position: 'absolute', left: x * s, top: y * s, width: w * s, height: h * s, borderRadius: h * s / 2, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', boxShadow: `0px ${1 * s}px ${blur * s}px rgba(248,35,60,0.2)` }}><Text style={{ fontFamily: homeFont, fontSize: font * s, lineHeight: font * 1.2 * s, fontWeight: '600', color: accent }}>{label}</Text></View>)}
        </View> : null}
        {page === 2 || page === 3 ? <View style={{ marginTop: 68 * s, marginLeft: -21 * s, width, height: (page === 2 ? 280 : 491) * s }}>
          <View style={{ position: 'absolute', left: 21 * s, width: (page === 3 ? 359 : 360) * s, height: 131 * s, backgroundColor: accent, borderRadius: 20 * s, boxShadow: page === 2 ? `0px ${3 * s}px ${20 * s}px rgba(229,9,20,0.25)` : `0px ${1 * s}px ${5 * s}px rgba(248,35,60,0.5)` }}>
            <Text style={{ position: 'absolute', left: 18 * s, top: 15 * s, fontFamily: homeFont, fontSize: 13 * s, lineHeight: 20 * s, letterSpacing: -.65 * s, fontWeight: '600', color: '#FFB4B4' }}>중경삼림 · 왕가위 · 1994</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="소개 예시 질문 변경" onPress={() => setChanged(value => !value)} hitSlop={9} style={{ position: 'absolute', right: 13 * s, top: 11 * s }}><IntroVector name={page === 2 ? 'replace-light' : 'replace-core'} width={26 * s} /></Pressable>
            <Text style={{ position: 'absolute', left: (page === 2 ? 3 : 18) * s, top: (page === 2 ? 33 : 46) * s, width: (page === 2 ? 355 : 323) * s, fontFamily: homeFont, fontSize: (page === 2 ? 20 : 15) * s, lineHeight: (page === 2 ? 24 : 20) * s, fontWeight: page === 2 ? '700' : '500', letterSpacing: -(page === 2 ? .2 : .75) * s, color: '#FFFFFF', textAlign: page === 2 ? 'center' : 'justify' }}>{page === 2 ? `Q1.\n${q}` : <><Text style={{ fontWeight: '700' }}>Q1. </Text>{changed ? '지금 가장 오래 기억에 남는 장면과 그 이유를 자유롭게 적어주세요.' : '해당 영화를 관통하는 단 하나의 핵심 감정이나 키워드를 설정한다면 무엇인가요? 그리고 스크린 속 어떤 요소들이 그 감정을 가장 설득력 있게 전달했다고 느끼셨나요?'}</>}</Text>
          </View>
          {page === 2 ? tags.map(([label, color, x, y, rotation]) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label} 예시 키워드`} accessibilityState={{ selected: selected.includes(label) }} onPress={() => setSelected(value => value.includes(label) ? value.filter(word => word !== label) : [...value, label])} style={{ position: 'absolute', left: x * s, top: y * s, width: 104 * s, height: 41 * s, borderRadius: 20 * s, backgroundColor: color, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: rotation }], opacity: selected.includes(label) ? .65 : 1 }}><Text style={{ fontFamily: homeFont, fontSize: 20 * s, lineHeight: 24 * s, color: '#FFFFFF', fontWeight: '500' }}>{label}</Text></Pressable>) : <View style={{ position: 'absolute', top: 146 * s, left: 21 * s, width: 359 * s, height: 345 * s, borderRadius: 20 * s, borderWidth: 2 * s, borderColor: '#F0F0F0' }}>
            <TextInput accessibilityLabel="집중 기록 체험 답변, 저장되지 않는 소개 예시" multiline value={answer} onChangeText={setAnswer} maxLength={1000} placeholder={placeholder} placeholderTextColor="#BABABA" textAlignVertical="top" style={{ fontFamily: homeFont, fontSize: 15 * s, lineHeight: 20 * s, letterSpacing: -.75 * s, fontWeight: '500', color: '#333333', paddingHorizontal: 16 * s, paddingTop: 18 * s, paddingBottom: 60 * s, height: '100%' }} />
            <Pressable accessibilityRole="button" accessibilityLabel="소개 예시 음성 입력 안내" onPress={() => setNotice('소개 예시는 저장하거나 마이크를 켜지 않아요. 실제 집중 기록에서 지원되는 기기의 음성 입력을 사용할 수 있어요.')} hitSlop={5} style={{ position: 'absolute', right: 11 * s, bottom: 10 * s }}><IntroVector name="mic" width={37 * s} /></Pressable>
          </View>}
        </View> : null}
        {page === 4 ? <View accessibilityLabel="첫 기록을 위한 영화 포스터 예시" style={{ marginTop: 29 * s, height: 212.536 * s, width, marginLeft: -21 * s, overflow: 'hidden' }}>{posters.map((poster, index) => <Image key={index} accessible={false} source={poster.source} resizeMode="cover" style={{ position: 'absolute', left: poster.left * s, top: 0, width: poster.width * s, height: 212.536 * s, borderRadius: 10 * s }} />)}</View> : null}
      </View>
    </View>
    <View style={{ paddingLeft: 21 * s, paddingRight: (page === 3 ? 22 : 21) * s, paddingTop: (page === 1 ? 86.945 : page === 2 ? 23 : page === 3 ? 27 : 60.464) * s, paddingBottom: (page === 3 ? 49 : 51) * s, gap: 13 * s }}>
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {page === 4 ? <>{button('가볍게 기록하기', () => onChoose('light'), true, true)}{button('집중해서 기록하기', () => onChoose('core'), false, true)}</> : button(page === 1 ? '시작하기' : '다음', onNext)}
    </View>
  </ScrollView></View>;
}
const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  outer: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center' },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  notice: { fontFamily: homeFont, fontSize: 13, lineHeight: 20, color: '#6A7282' },
  error: { fontFamily: homeFont, fontSize: 13, lineHeight: 20, color: '#C50022' },
});
