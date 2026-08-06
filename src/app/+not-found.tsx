import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';

export default function NotFoundScreen() {
  return (
    <Screen title="화면을 찾을 수 없어요" scroll={false}>
      <StateNotice message="주소가 바뀌었거나 아직 준비되지 않은 화면입니다." title="길을 잃었어요" tone="warning" />
      <Button label="FLICK 홈으로" onPress={() => router.replace('/')} />
    </Screen>
  );
}
