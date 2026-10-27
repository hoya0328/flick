import { type Href, router } from "expo-router";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { BackButton, CommunityGate } from "@/features/community/social-ui";
import { MemberList } from "@/features/community/member-list";
export default function People() {
  return (
    <CommunityGate>
      <Screen title="플리커 찾기">
        <MemberList kind="search" />
        <Button
          label="내 팔로워·팔로잉"
          variant="secondary"
          onPress={() => router.push("/connections" as Href)}
        />
        <BackButton />
      </Screen>
    </CommunityGate>
  );
}
