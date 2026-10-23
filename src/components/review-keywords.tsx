import { StyleSheet, Text, View } from 'react-native';
import { homeFont } from '@/components/home-ui';
import { normalizeRepresentativeKeywords } from '@/features/reviews/representative-keywords';

const chipColors = ['#C02AEE', '#008CFF', '#1E222A', '#F8233C', '#FFAA00'];
export function ReviewKeywords({ keywords, concealed = false }: { keywords: unknown; concealed?: boolean }) {
  const words = normalizeRepresentativeKeywords(keywords);
  if (!words.length) return null;
  if (concealed) return <Text style={styles.concealed}>대표 키워드는 상세에서 확인해 주세요.</Text>;
  return <View accessibilityLabel="대표 키워드" style={styles.tags}>{words.map((word, index) => <View key={word} style={[styles.tag, { backgroundColor: chipColors[index] }]}><Text style={styles.text}>{word}</Text></View>)}</View>;
}
const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 17.231, minHeight: 24 },
  tag: { borderRadius: 18, paddingHorizontal: 9, minHeight: 24, justifyContent: 'center' },
  text: { fontFamily: homeFont, fontSize: 12, lineHeight: 18, color: 'white' },
  concealed: { fontFamily: homeFont, color: '#99A1AF', fontSize: 11, lineHeight: 17, marginTop: 8 },
});
