import { StateNotice } from '@/components/state-notice';
import { Screen } from '@/components/screen';

export default function SearchScreen() {
  return (
    <Screen eyebrow="2단계 예정" title="영화 탐색">
      <StateNotice message="검색, 키워드 추천, 영화 상세는 영화 데이터 경계를 연결한 뒤 구현합니다." title="아직 비어 있어요" />
    </Screen>
  );
}
