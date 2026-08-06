import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

type BrandMarkProps = {
  compact?: boolean;
  inverted?: boolean;
};

export function BrandMark({ compact = false, inverted = false }: BrandMarkProps) {
  const color = inverted ? colors.surface : colors.primary;

  return (
    <View accessibilityLabel="FLICK" accessibilityRole="header" style={styles.row}>
      <View style={[styles.symbol, compact && styles.symbolCompact]}>
        <View style={[styles.spoke, styles.vertical, { backgroundColor: color }]} />
        <View style={[styles.spoke, styles.horizontal, { backgroundColor: color }]} />
        <View style={[styles.spoke, styles.diagonalOne, { backgroundColor: color }]} />
        <View style={[styles.spoke, styles.diagonalTwo, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.word, compact && styles.wordCompact, { color }]}>LICK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  symbol: { height: 34, position: 'relative', width: 34 },
  symbolCompact: { height: 25, width: 25 },
  spoke: { borderRadius: 2, height: '100%', left: '43%', position: 'absolute', top: 0, width: '14%' },
  vertical: {},
  horizontal: { transform: [{ rotate: '90deg' }] },
  diagonalOne: { transform: [{ rotate: '45deg' }] },
  diagonalTwo: { transform: [{ rotate: '-45deg' }] },
  word: { fontSize: 31, fontWeight: '900', letterSpacing: -2 },
  wordCompact: { fontSize: 23 },
});
