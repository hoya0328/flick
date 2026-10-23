import { router } from 'expo-router';
import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesignVector } from '@/components/design-vector';
import { homeFont } from '@/components/home-ui';

type Selection = { movieId?: string; title?: string };
const RecordingContext = createContext<(selection?: Selection) => void>(() => {});
export const useRecordingLauncher = () => useContext(RecordingContext);

export function RecordingLauncherProvider({ children }: PropsWithChildren) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const insets = useSafeAreaInsets();
  function choose(mode: 'light' | 'core') {
    const params = { ...selection, mode };
    setSelection(null);
    router.push({ pathname: mode === 'light' ? '/light-record' : '/(tabs)/record', params });
  }
  return <RecordingContext.Provider value={(value = {}) => setSelection(value)}>
    {children}
    <Modal transparent visible={selection !== null} animationType="slide" onRequestClose={() => setSelection(null)}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="기록 방식 선택 닫기" onPress={() => setSelection(null)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: 19 + insets.bottom }]}>
          <View style={styles.handle} />
          <Pressable accessibilityRole="button" onPress={() => choose('light')} style={styles.option}><Text style={styles.label}>가볍게 기록하기</Text><DesignVector name="sheetArrow" style={styles.arrow} /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => choose('core')} style={[styles.option, styles.core]}><Text style={[styles.label, styles.white]}>집중해서 기록하기</Text><DesignVector name="sheetArrowWhite" style={styles.arrow} /></Pressable>
        </View>
      </View>
    </Modal>
  </RecordingContext.Provider>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { backgroundColor: 'white', width: '100%', maxWidth: 402, borderTopLeftRadius: 23, borderTopRightRadius: 23, paddingHorizontal: 21, paddingTop: 13, gap: 13 },
  handle: { alignSelf: 'center', height: 4, width: 43, borderRadius: 3, backgroundColor: '#D1D5DB', marginBottom: 5 },
  option: { minHeight: 56, borderRadius: 30, backgroundColor: '#F3F4F6', paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  core: { backgroundColor: '#F8233C' }, label: { fontFamily: homeFont, fontSize: 20, fontWeight: '600', letterSpacing: -0.2, lineHeight: 31, textAlign: 'center', color: '#17191C' }, arrow: { position: 'absolute', right: 23 }, white: { color: 'white' },
});
