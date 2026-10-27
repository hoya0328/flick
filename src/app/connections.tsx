import { useState } from "react";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { BackButton, CommunityGate } from "@/features/community/social-ui";
import { MemberList } from "@/features/community/member-list";
export default function Connections() {
  const [kind, setKind] = useState<"followers" | "following">("followers");
  return (
    <CommunityGate>
      <Screen title="내 팔로우">
        <Button
          label={kind === "followers" ? "팔로잉 보기" : "팔로워 보기"}
          variant="secondary"
          onPress={() =>
            setKind(kind === "followers" ? "following" : "followers")
          }
        />
        <MemberList key={kind} kind={kind} />
        <BackButton />
      </Screen>
    </CommunityGate>
  );
}
