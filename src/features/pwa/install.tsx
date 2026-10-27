import { Text } from "react-native";
import { p } from "@/features/profile/profile-ui";
export function PwaBootstrap() {
  return null;
}
export function InstallControls() {
  return (
    <Text style={p.body}>
      홈 화면 설치는 모바일 웹에서 사용할 수 있어요. iOS Safari의 공유 → 홈
      화면에 추가, Android Chrome의 메뉴 → 앱 설치를 선택해 주세요.
    </Text>
  );
}
