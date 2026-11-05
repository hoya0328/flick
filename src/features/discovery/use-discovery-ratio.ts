import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { EXPLORE_RATIO_KEY, normalizeRatio } from './explore-model';
export function useDiscoveryRatio() {
  const [ratio, setRatio] = useState(70), [ratioError, setError] = useState('');
  useEffect(() => { let active = true; void AsyncStorage.getItem(EXPLORE_RATIO_KEY).then(value => { if (active && value !== null) setRatio(normalizeRatio(value)); }).catch(() => { if (active) setError('추천 비율을 복원하지 못했어요.'); }); return () => { active = false; }; }, []);
  const saveRatio = useCallback((value: number) => { const normalized = normalizeRatio(value); setRatio(normalized); void AsyncStorage.setItem(EXPLORE_RATIO_KEY, String(normalized)).then(() => setError('')).catch(() => setError('추천에는 반영됐지만 이 기기에 저장하지 못했어요.')); }, []);
  return { ratio, setRatio, saveRatio, ratioError };
}
