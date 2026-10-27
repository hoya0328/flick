import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { Button } from "@/components/button";
import {
  followMember,
  listConnections,
  listPublicMembers,
  type Member,
} from "./social-service";
import { MemberRow, Message } from "./social-ui";
import { p } from "@/features/profile/profile-ui";
export function MemberList({
  kind,
}: {
  kind: "search" | "followers" | "following";
}) {
  const [query, setQuery] = useState(""),
    [members, setMembers] = useState<Member[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [more, setMore] = useState(false),
    [ready, setReady] = useState(false);
  const generation = useRef(0),
    lock = useRef(false),
    offset = useRef(0),
    search = useRef("");
  const load = useCallback(
    async (reset = true) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setMessage("");
      const token = generation.current;
      try {
        const rows =
          kind === "search"
            ? await listPublicMembers(
                search.current,
                reset ? 0 : offset.current,
              )
            : await listConnections(kind, reset ? 0 : offset.current);
        if (token !== generation.current) return;
        setMembers((old) =>
          reset
            ? rows
            : [
                ...new Map(
                  [...old, ...rows].map((item) => [item.userId, item]),
                ).values(),
              ],
        );
        offset.current = reset ? rows.length : offset.current + rows.length;
        setMore(rows.length === 20);
        setReady(true);
      } catch (error) {
        if (token === generation.current)
          setMessage(
            error instanceof Error ? error.message : "불러오지 못했어요.",
          );
      } finally {
        if (token === generation.current) {
          lock.current = false;
          setBusy(false);
        }
      }
    },
    [kind],
  );
  useFocusEffect(
    useCallback(() => {
      generation.current++;
      lock.current = false;
      void load();
      return () => {
        generation.current++;
        lock.current = false;
      };
    }, [load]),
  );
  async function toggle(member: Member) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const token = generation.current;
    try {
      await followMember(member.userId, !member.viewerFollows);
      if (token === generation.current) {
        lock.current = false;
        await load();
      }
    } catch (error) {
      if (token === generation.current)
        setMessage(
          error instanceof Error ? error.message : "변경하지 못했어요.",
        );
    } finally {
      if (token === generation.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <View style={{ gap: 12 }}>
      {kind === "search" ? (
        <>
          <TextInput
            accessibilityLabel="공개 닉네임 검색"
            placeholder="닉네임으로 검색"
            value={query}
            onChangeText={setQuery}
            maxLength={30}
            editable={!busy}
            onSubmitEditing={() => {
              search.current = query;
              void load();
            }}
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: "#D1D5DC",
              borderRadius: 10,
              padding: 12,
            }}
          />
          <Button
            label="검색"
            disabled={busy}
            onPress={() => {
              search.current = query;
              void load();
            }}
          />
        </>
      ) : null}
      <Message message={message} />
      {busy ? <ActivityIndicator color="#F8233C" /> : null}
      {ready && !members.length ? (
        <Text style={p.body}>
          아직 표시할 사용자가 없어요. 공개에 동의한 프로필만 검색됩니다.
        </Text>
      ) : null}
      {members.map((member) => (
        <MemberRow
          key={member.userId}
          member={member}
          action={kind === "following" ? "팔로우 취소" : undefined}
          onAction={() => void toggle(member)}
          busy={busy}
        />
      ))}
      <Button
        label="새로고침"
        disabled={busy}
        variant="ghost"
        onPress={() => void load()}
      />
      {more ? (
        <Button
          label="더 보기"
          disabled={busy}
          variant="secondary"
          onPress={() => void load(false)}
        />
      ) : null}
    </View>
  );
}
