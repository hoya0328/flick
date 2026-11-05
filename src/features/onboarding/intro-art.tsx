import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { introVectors } from './intro-vectors';

export function IntroVector({ name, width }: { name: keyof typeof introVectors; width?: number }) {
  const asset = introVectors[name], scale = (width ?? asset.width) / asset.width;
  const prefix = useId().replace(/[^a-zA-Z0-9]/g, '') + '-';
  const xml = asset.xml.replace(/id="([^"]+)"/g, (_match, id: string) => `id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
  return <View style={{ pointerEvents: 'none', width: asset.width * scale, height: asset.height * scale, flexShrink: 0 }}>
    <View style={[StyleSheet.absoluteFill, { left: (asset.width * scale - asset.width) / 2, top: (asset.height * scale - asset.height) / 2, width: asset.width, height: asset.height, transform: [{ scale }] }]}><SvgXml xml={xml} /></View>
  </View>;
}
