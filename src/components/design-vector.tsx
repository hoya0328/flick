import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { vectorAssets, type VectorName } from '@/features/design/vector-assets';

// Keep the exported SVG's intrinsic canvas and scale its wrapper proportionally.
// Tint is only for intentional monochrome interaction states, never geometry.
export function DesignVector({ name, width, height, tint, style, label }: { name: VectorName; width?: number; height?: number; tint?: string; style?: StyleProp<ViewStyle>; label?: string }) {
  const asset = vectorAssets[name];
  const scale = Math.min((width ?? asset.width) / asset.width, (height ?? (width ? width * asset.height / asset.width : asset.height)) / asset.height);
  const w = width ?? asset.width * scale;
  const h = height ?? asset.height * scale;
  const prefix = useId().replace(/[^a-zA-Z0-9]/g, '') + '-';
  const source = asset.xml.replace(/id="([^"]+)"/g, (_match, id: string) => `id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
  const xml = tint ? source.replace(/(fill|stroke)="(#[\da-fA-F]+|white|black)"/g, `$1="${tint}"`) : source;
  return <View accessible={Boolean(label)} accessibilityLabel={label} pointerEvents="none" style={[{ width: w, height: h, flexShrink: 0 }, style]}>
    <View style={{ position: 'absolute', left: (w - asset.width) / 2, top: (h - asset.height) / 2, width: asset.width, height: asset.height, transform: [{ scale }] }}><SvgXml xml={xml} /></View>
  </View>;
}
