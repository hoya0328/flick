import { Text } from "react-native";
import { Screen } from "@/components/screen";
import {
  CommunityGate,
  BackButton,
  SocialPosts,
} from "@/features/community/social-ui";
import { p } from "@/features/profile/profile-ui";
export default function Trash() {
  return (
    <CommunityGate>
      <Screen title="일상 기록 휴지통">
        <Text style={p.body}>
          최근 7일 동안 삭제한 내 글만 복원할 수 있어요. 복원할 때는 나만 보기로
          돌아갑니다. 운영자가 숨긴 글은 복원할 수 없어요.
        </Text>
        <SocialPosts scope="trash" />
        <BackButton />
      </Screen>
    </CommunityGate>
  );
}
