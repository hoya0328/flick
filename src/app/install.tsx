import { Text } from "react-native";
import { Screen } from "@/components/screen";
import { BackButton } from "@/features/community/social-ui";
import { InstallControls } from "@/features/pwa/install";
import { p } from "@/features/profile/profile-ui";
export default function Install() {
  return (
    <Screen title="홈 화면에 FLICK 설치">
      <InstallControls />
      <Text selectable style={p.link}>
        https://flick-film-journal--beta.expo.app
      </Text>
      <BackButton />
    </Screen>
  );
}
