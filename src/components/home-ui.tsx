import type { PropsWithChildren, ReactNode } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { Button } from '@/components/button';
import { DesignVector } from '@/components/design-vector';
import type { VectorName } from '@/features/design/vector-assets';

export const homeTheme = { accent: '#F8233C', ink: '#0A0A0A', muted: '#888888', subtle: '#F3F4F6', radius: 20, inset: 21 } as const;
export const homeFont = Platform.OS === 'web' ? 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : undefined;

export function HomeIcon({ name, width = 20, height = width, tint }: { name: VectorName; width?: number; height?: number; tint?: string }) {
  return <DesignVector name={name} width={width} height={height} tint={tint} />;
}

export function HomeSection({ children, title, onMore, caption, moreLabel, first = false }: PropsWithChildren<{ title: ReactNode; onMore?: () => void; caption?: string; moreLabel?: string; first?: boolean }>) {
  return <View style={[styles.section, first && { marginTop: 58.868 }]}>
    <View style={styles.headingRow}>
      <Text accessibilityRole="header" accessibilityHint={caption} style={styles.heading}>{title}</Text>
      {onMore ? <Pressable accessibilityRole="button" accessibilityLabel={moreLabel ?? `${typeof title === 'string' ? title : '섹션'} 더보기`} hitSlop={8} onPress={onMore} style={styles.more}><HomeIcon name="chevron" width={7} height={14} /></Pressable> : null}
    </View>
    {caption ? <Pressable accessibilityRole="button" accessibilityLabel={caption} onPress={() => onMore?.()} style={styles.captionInfo}><DesignVector name="info" width={14} /></Pressable> : null}
    {children}
  </View>;
}

export function HomeRail({ children, label }: PropsWithChildren<{ label: string }>) {
  return <ScrollView accessibilityLabel={label} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} style={styles.railViewport}>{children}</ScrollView>;
}

export function HomePicture({ source, label, width, height, radius = 20 }: { source: ImageSourcePropType | null; label: string; width: number; height: number; radius?: number }) {
  return source ? <Image accessibilityLabel={label} resizeMode="cover" source={source} style={{ width, height, borderRadius: radius }} /> : <View accessibilityLabel={`${label} 이미지 준비 중`} style={[styles.placeholder, { width, height, borderRadius: radius }]}><Text style={styles.placeholderText}>FLICK</Text></View>;
}

export function HomeInfoDialog({ info, onClose }: { info: { title: string; body: string } | null; onClose: () => void }) {
  return <Modal animationType="fade" transparent visible={Boolean(info)} onRequestClose={onClose}>
    <View style={styles.scrim}>
      <Pressable accessibilityLabel="안내 닫기" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={styles.dialog}>
        <Text accessibilityRole="header" style={styles.heading}>{info?.title}</Text>
        <Text style={styles.dialogBody}>{info?.body}</Text>
        <Button label="확인" onPress={onClose} />
      </View>
    </View>
  </Modal>;
}

export const homeText = StyleSheet.create({
  title: { color: homeTheme.ink, fontFamily: homeFont, fontSize: 15, lineHeight: 22.5, fontWeight: '600', letterSpacing: -0.6 },
  body: { color: '#595959', fontFamily: homeFont, fontSize: 13, lineHeight: 20, letterSpacing: -0.4 },
  muted: { color: homeTheme.muted, fontFamily: homeFont, fontSize: 12, lineHeight: 18 },
  accent: { color: homeTheme.accent },
});

const styles = StyleSheet.create({
  section: { gap: 20, marginTop: 50 },
  headingRow: { minHeight: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: homeTheme.inset, gap: 4 },
  heading: { marginVertical: -1.5, color: homeTheme.ink, flexShrink: 1, fontFamily: Platform.OS === 'web' ? 'Inter, Pretendard, sans-serif' : homeFont, fontSize: 20, fontWeight: '600', letterSpacing: -0.2, lineHeight: 24 },
  more: { width: 32, height: 21, alignItems: 'flex-end', justifyContent: 'center' },
  captionInfo: { position: 'absolute', right: 53, top: 3, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  rail: { paddingHorizontal: homeTheme.inset, gap: 8, alignItems: 'flex-start' },
  railViewport: { flexGrow: 0 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#28232D' },
  placeholderText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 2 },
  scrim: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, gap: 20, width: '100%', maxWidth: 370 },
  dialogBody: { ...homeText.body, fontSize: 15, lineHeight: 24 },
});
