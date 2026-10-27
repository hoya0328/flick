import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import {
  BackButton,
  CommunityGate,
  Message,
} from "@/features/community/social-ui";
import {
  listNotifications,
  markNotificationsRead,
  mergeById,
  notificationPath,
  type CommunityNotification,
} from "@/features/community/social-service";
import { p } from "@/features/profile/profile-ui";
import { useSession } from "@/features/session/session-provider";
const labels = {
  follow: "회원님을 팔로우했어요.",
  review_like: "리뷰에 공감했어요.",
  review_comment: "리뷰에 댓글을 남겼어요.",
  post_like: "일상 기록에 공감했어요.",
  post_comment: "일상 기록에 댓글을 남겼어요.",
};
export default function Notifications() {
  const s = useSession();
  return (
    <CommunityGate>
      <Inbox key={s.email} />
    </CommunityGate>
  );
}
function Inbox() {
  const [items, setItems] = useState<CommunityNotification[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [more, setMore] = useState(false),
    [ready, setReady] = useState(false);
  const gen = useRef(0),
    lock = useRef(false),
    offset = useRef(0);
  const load = useCallback(async (reset = true) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    const token = gen.current;
    try {
      const next = await listNotifications(reset ? 0 : offset.current);
      if (token !== gen.current) return;
      setItems((old) => (reset ? next : mergeById(old, next)));
      offset.current = reset ? next.length : offset.current + next.length;
      setMore(next.length === 30);
      setReady(true);
    } catch (error) {
      if (token === gen.current)
        setMessage(
          error instanceof Error ? error.message : "불러오지 못했어요.",
        );
    } finally {
      if (token === gen.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      gen.current++;
      lock.current = false;
      void load();
      return () => {
        gen.current++;
        lock.current = false;
      };
    }, [load]),
  );
  async function read(item?: CommunityNotification) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const token = gen.current;
    try {
      await markNotificationsRead(item?.id ?? null);
      if (token !== gen.current) return;
      setItems((old) =>
        old.map((n) => (!item || n.id === item.id ? { ...n, read: true } : n)),
      );
      if (item) {
        const path = notificationPath(item);
        if (path) router.push(path as Href);
        else setMessage("상대가 프로필을 비공개로 바꾸었거나 탈퇴했어요.");
      }
    } catch (error) {
      if (token === gen.current)
        setMessage(
          error instanceof Error ? error.message : "읽음 처리하지 못했어요.",
        );
    } finally {
      if (token === gen.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <Screen title="알림">
      <Text style={p.body}>
        최근 30일의 팔로우·공감·댓글 알림입니다. 앱 안에서만 제공하며 이메일이나
        휴대폰 푸시를 발송하지 않아요. 비공개·삭제된 게시물은 알림을 눌러도
        열리지 않습니다.
      </Text>
      <Message message={message} />
      {busy ? <ActivityIndicator color="#F8233C" /> : null}
      <Button
        label="모두 읽음"
        variant="secondary"
        disabled={busy}
        onPress={() => void read()}
      />
      {ready && !items.length ? (
        <Text style={p.body}>아직 새 알림이 없어요.</Text>
      ) : null}
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            padding: 14,
            gap: 8,
            borderWidth: 1,
            borderColor: item.read ? "#E5E7EB" : "#F8233C",
            borderRadius: 12,
          }}
        >
          <Text style={p.actionText}>
            {item.read ? "" : "● "}
            {item.actorName}님이 {labels[item.kind]}
          </Text>
          <Text style={p.body}>
            {new Date(item.createdAt).toLocaleString("ko-KR")}
          </Text>
          <Button
            label="알림 확인"
            disabled={busy}
            variant="ghost"
            onPress={() => void read(item)}
          />
        </View>
      ))}
      {more ? (
        <Button
          label="더 보기"
          disabled={busy}
          variant="secondary"
          onPress={() => void load(false)}
        />
      ) : null}
      <Button
        label="새로고침"
        disabled={busy}
        variant="ghost"
        onPress={() => void load()}
      />
      <BackButton />
    </Screen>
  );
}
