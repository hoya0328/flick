import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { vectorAssets } from "@/features/design/vector-assets";
import { useSession } from "@/features/session/session-provider";
import { getCommunityState } from "./social-service";
// Keep the designer's exact bell geometry. The sample unread ellipse is data-driven.
const emptyBell = vectorAssets.bell.xml.replace(/<ellipse[^>]*\/>/g, "");
export function NotificationBell({
  width = 24,
  height = 26,
}: {
  width?: number;
  height?: number;
}) {
  const { mode, email } = useSession(),
    [state, setState] = useState<{
      account: string | null;
      unread: number;
    } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let valid = true;
      if (mode === "supabase")
        void getCommunityState()
          .then((value) => {
            if (valid) setState({ account: email, unread: value.unread });
          })
          .catch(() => {
            if (valid) setState(null);
          });
      return () => {
        valid = false;
      };
    }, [mode, email]),
  );
  const unread =
    mode === "supabase" && state?.account === email ? state.unread : null;
  return (
    <View
      accessible
      accessibilityLabel={unread===null?'알림함, 상태 확인 필요':`알림함, 안 읽은 알림 ${unread}개`}
      style={{ width, height }}
    >
      <SvgXml
        xml={unread ? vectorAssets.bell.xml : emptyBell}
        width={width}
        height={height}
      />
    </View>
  );
}
