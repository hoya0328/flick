import { useRef } from 'react';
import { Image, View } from 'react-native';
import { ratingAtPosition, ratingMessage } from './light-flow';
export function RatingControl({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  const track = useRef<View>(null);
  const geometry = useRef({ x: 0, width: 267 });
  return <View ref={track} accessible accessibilityRole="adjustable" accessibilityLabel="영화 별점" accessibilityValue={{ min: 0.5, max: 5, now: value ?? 0.5, text: ratingMessage(value) }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={({ nativeEvent }) => onChange(Math.min(5, Math.max(0.5, (value ?? 0.5) + (nativeEvent.actionName === 'increment' ? 0.5 : -0.5))))} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(event) => { const pageX = event.nativeEvent.pageX; track.current?.measureInWindow((x, _y, width) => { geometry.current = { x, width }; onChange(ratingAtPosition(pageX - x, width)); }); }} onResponderMove={(event) => onChange(ratingAtPosition(event.nativeEvent.pageX - geometry.current.x, geometry.current.width))} style={{ width: 267, height: 57, alignSelf: 'center' }}>
    <Image source={require('../../../assets/figma-review/star.png')} tintColor="#E5E7EB" style={{ position: 'absolute', width: 267, height: 51 }} />
    <View pointerEvents="none" style={{ position: 'absolute', width: (value ?? 0) / 5 * 267, height: 51, overflow: 'hidden' }}><Image source={require('../../../assets/figma-review/star.png')} style={{ width: 267, height: 51 }} /></View>
  </View>;
}
