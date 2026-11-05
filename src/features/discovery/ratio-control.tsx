import { useRef, useState } from 'react';
import { View } from 'react-native';
import { normalizeRatio } from './explore-model';
export function RatioControl({ value, onChange, onCommit }: { value: number; onChange: (value: number) => void; onCommit?: (value: number) => void }) {
  const [width, setWidth] = useState(1), latest = useRef(value);
  const update = (x: number) => { const next = normalizeRatio(x / width * 100); latest.current = next; onChange(next); };
  return <View accessible accessibilityRole="adjustable" accessibilityLabel="낯선 영화 추천 비율" accessibilityValue={{ min: 0, max: 100, now: value, text: `낯선 영화 ${value}%, 익숙한 영화 ${100 - value}%` }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={event => { const next = normalizeRatio(value + (event.nativeEvent.actionName === 'increment' ? 10 : -10)); onChange(next); onCommit?.(next); }} onLayout={event => setWidth(event.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={event => update(event.nativeEvent.locationX)} onResponderMove={event => update(event.nativeEvent.locationX)} onResponderRelease={() => onCommit?.(latest.current)} onResponderTerminationRequest={() => false} style={{ height: 44, justifyContent: 'center' }}>
    <View pointerEvents="none" style={{ height: 5, backgroundColor: '#E5E7EB', borderRadius: 4 }}><View style={{ width: `${value}%`, backgroundColor: '#F8233C', height: 5, borderRadius: 4 }} /></View>
    <View pointerEvents="none" style={{ position: 'absolute', left: Math.max(0, Math.min(width - 20, width * value / 100 - 10)), width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' }} />
  </View>;
}
