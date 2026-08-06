import { StateNotice } from '@/components/state-notice';
import { Screen } from '@/components/screen';

export default function RecordScreen() {
  return (
    <Screen eyebrow="3단계 예정" title="감상 기록">
      <StateNotice message="Light와 Core 기록 모드는 사용자 입력을 안전하게 보존하는 AI 경계와 함께 구현합니다." title="기록 기반을 준비 중이에요" />
    </Screen>
  );
}
