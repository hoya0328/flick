import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { p } from "@/features/profile/profile-ui";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
let deferred: InstallEvent | null = null;
const changed = new EventTarget();
function installed() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}
export function PwaBootstrap() {
  useEffect(() => {
    const before = (event: Event) => {
      event.preventDefault();
      deferred = event as InstallEvent;
      changed.dispatchEvent(new Event("change"));
    };
    const done = () => {
      deferred = null;
      changed.dispatchEvent(new Event("change"));
    };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", done);
    if (
      !__DEV__ &&
      location.protocol === "https:" &&
      "serviceWorker" in navigator
    )
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return null;
}
export function InstallControls() {
  const [available, setAvailable] = useState(false),
    [isInstalled, setInstalled] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const update = () => {
      setAvailable(Boolean(deferred));
      setInstalled(installed());
    };
    update();
    changed.addEventListener("change", update);
    return () => changed.removeEventListener("change", update);
  }, []);
  async function install() {
    if (!deferred || busy) return;
    setBusy(true);
    const event = deferred;
    deferred = null;
    setAvailable(false);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "설치가 완료되면 홈 화면에서 FLICK를 열어 주세요."
          : "설치를 취소했어요. 브라우저에서 계속 사용할 수 있어요.",
      );
    } catch {
      setMessage("브라우저 메뉴의 설치 또는 홈 화면에 추가를 사용해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <Text style={p.body}>
        {isInstalled
          ? "이미 홈 화면 앱으로 실행 중이에요."
          : available
            ? "이 브라우저는 FLICK 설치를 지원해요."
            : "설치 버튼이 표시되지 않으면 아래 브라우저 메뉴를 사용해 주세요."}
      </Text>
      {available ? (
        <Button
          label="FLICK 설치"
          loading={busy}
          onPress={() => void install()}
        />
      ) : null}
      <Text style={p.body}>
        iPhone/iPad: Safari에서 외부 beta 주소 열기 → 공유 → 홈 화면에 추가.
        Android/PC Chrome: 주소창 설치 아이콘 또는 메뉴 → 앱 설치. 브라우저
        버전에 따라 메뉴 이름은 다를 수 있어요.
      </Text>
      <Text style={p.body}>
        설치는 무료이며 앱스토어 등록은 아닙니다. 인터넷 연결이 필요하고,
        오프라인에서는 기록 저장이나 AI 실행을 지원하지 않아요. 업데이트가
        있어도 작성 중인 화면을 강제로 새로고침하지 않습니다.
      </Text>
      {message ? (
        <Text accessibilityLiveRegion="polite" style={p.link}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
