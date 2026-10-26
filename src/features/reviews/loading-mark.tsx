import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';

import { DesignVector } from '@/components/design-vector';

// Original Figma node 2:1081 export, not a reconstruction of its rotated pieces.
export function LoadingMark({ label = '키워드 정리 중' }: { label?: string }) {
  const [turn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    let motionRevision = 0;
    let animation: Animated.CompositeAnimation | undefined;
    function applyMotion(reduced: boolean) {
      if (!active) return;
      animation?.stop();
      turn.setValue(0);
      if (!reduced) {
        animation = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
        animation.start();
      }
    }
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => { motionRevision += 1; applyMotion(reduced); });
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => { if (motionRevision === 0) applyMotion(reduced); }).catch(() => applyMotion(true));
    return () => { active = false; subscription.remove(); animation?.stop(); };
  }, [turn]);

  return <Animated.View accessibilityLabel={label} style={{ width: 94, height: 94, flexShrink: 0, alignItems: 'center', justifyContent: 'center', transformOrigin: 'center', transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
    <DesignVector name="loadingLogo" />
  </Animated.View>;
}
