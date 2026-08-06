import { router } from 'expo-router';
import { Linking, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { tmdbAttribution } from '@/features/discovery/movies';
import { colors, spacing, typography } from '@/theme/tokens';

export default function CreditsScreen() {
  return (
    <Screen eyebrow="About · Credits" title="영화 데이터 출처">
      <Text style={styles.body}>영화 제목, 기본 정보, 평점과 포스터 경로는 The Movie Database(TMDB)를 통해 제공될 수 있습니다.</Text>
      <Text style={styles.notice}>{tmdbAttribution}</Text>
      <Text style={styles.body}>한국 OTT 스트리밍·대여·구매 가능 정보는 TMDB와 JustWatch를 통해 제공될 수 있습니다. OTT 정보 제공: JustWatch.</Text>
      <Text style={styles.body}>TMDB 연결이 불안정할 때는 마지막으로 저장된 캐시 또는 검증용 목록을 표시하며, 화면에 해당 상태를 안내합니다.</Text>
      <Button label="TMDB 웹사이트 열기" onPress={() => void Linking.openURL('https://www.themoviedb.org')} variant="secondary" />
      <Button label="← 돌아가기" onPress={() => router.back()} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.textMuted },
  notice: { ...typography.label, color: colors.text, paddingVertical: spacing.md },
});
