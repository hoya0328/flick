import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
export function RecordProgress({ value }: { value: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const progress = Math.max(1, Math.min(5, value));
  return <View accessibilityRole="progressbar" accessibilityLabel="질문 진행" aria-valuemin={1} aria-valuemax={5} aria-valuenow={progress} accessibilityValue={{ min: 1, max: 5, now: progress }} style={{ height: 16, borderRadius: 8, backgroundColor: '#F2F6FA', overflow: 'hidden' }}><View style={{ width: `${progress * 20}%`, height: 16, overflow: 'hidden', borderRadius: 8 }}><Svg width="100%" height={16}><Defs><LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="12.963%" stopColor="#921523" /><Stop offset="48.406%" stopColor="#F8233C" /><Stop offset="96.198%" stopColor="#FFA4AF" /></LinearGradient></Defs><Rect width="100%" height={16} rx={8} fill={`url(#${id})`} /></Svg></View></View>;
}
