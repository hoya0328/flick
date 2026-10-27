import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Share, Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import {
  BackButton,
  CommunityGate,
  Message,
  SocialPosts,
} from "@/features/community/social-ui";
import {
  followMember,
  getMemberContent,
  getPublicMember,
  type Member,
  type MemberContent,
} from "@/features/community/social-service";
import { p, ProfileAvatar } from "@/features/profile/profile-ui";
import { useSession } from "@/features/session/session-provider";
export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    s = useSession();
  return (
    <CommunityGate returnTo={`/people/${id}`}>
      <Profile key={`${s.email}:${id}`} id={typeof id === "string" ? id : ""} />
    </CommunityGate>
  );
}
function Profile({ id }: { id: string }) {
  const [member, setMember] = useState<Member | null>(null),
    [content, setContent] = useState<MemberContent | null>(null),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState("");
  const gen = useRef(0),
    lock = useRef(false);
  const load = useCallback(async () => {
    const token = gen.current;
    setBusy(true);
    setMessage("");
    try {
      const next = await getPublicMember(id);
      if (token !== gen.current) return;
      setMember(next);
      setContent(null);
      if (next) {
        const rows = await getMemberContent(id);
        if (token !== gen.current) return;
        setContent(rows);
      }
      setReady(true);
    } catch (error) {
      if (token === gen.current)
        setMessage(
          error instanceof Error ? error.message : "불러오지 못했어요.",
        );
    } finally {
      if (token === gen.current) setBusy(false);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      gen.current++;
      void load();
      return () => {
        gen.current++;
      };
    }, [load]),
  );
  async function toggle() {
    if (!member || lock.current) return;
    lock.current = true;
    setBusy(true);
    const token = gen.current;
    try {
      await followMember(id, !member.viewerFollows);
      if (token === gen.current) await load();
    } catch (error) {
      if (token === gen.current)
        setMessage(
          error instanceof Error ? error.message : "변경하지 못했어요.",
        );
    } finally {
      lock.current = false;
      if (token === gen.current) setBusy(false);
    }
  }
  const url = `https://flick-film-journal--beta.expo.app/people/${id}`;
  return (
    <Screen title="공개 프로필">
      <Message message={message} />
      {busy ? <ActivityIndicator color="#F8233C" /> : null}
      {ready && !member ? (
        <Text style={p.body}>
          공개를 허용하지 않았거나 탈퇴한 프로필이에요.
        </Text>
      ) : null}
      {member ? (
        <>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <ProfileAvatar name={member.name} path={member.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={p.title}>{member.name}</Text>
              <Text style={p.body}>{member.bio}</Text>
              <Text style={p.body}>
                팔로워 {member.followers} · 팔로잉 {member.following}
              </Text>
            </View>
          </View>
          <Text style={p.body}>
            공개 영화 {member.movieCount}편 · 공개 리뷰 {member.reviewCount}개 ·
            공개 컬렉션 {member.collectionCount}개
          </Text>
          {member.isMine ? (
            <Button
              label="내 프로필 관리"
              variant="secondary"
              onPress={() => router.push("/profile-edit")}
            />
          ) : (
            <Button
              label={member.viewerFollows ? "팔로우 취소" : "팔로우"}
              loading={busy}
              onPress={() => void toggle()}
            />
          )}
          <Text selectable style={p.link}>
            {url}
          </Text>
          <Button
            label="프로필 링크 공유"
            variant="secondary"
            onPress={() =>
              void Share.share({
                message: `${member.name}님의 FLICK\n${url}`,
              }).catch(() => setMessage("위 링크를 복사해 공유해 주세요."))
            }
          />
          <Text style={p.title}>공개 리뷰 · 최근 20개</Text>
          {content?.reviews.map((review) => (
            <Button
              key={review.id}
              label={`${review.title} · ${review.mode === "core" ? "매거진" : "리뷰"} · ★${review.rating ?? "—"}`}
              variant="secondary"
              onPress={() => router.push(`/review/${review.id}` as Href)}
            />
          ))}
          {!content?.reviews.length ? (
            <Text style={p.body}>공개한 완료 기록이 없어요.</Text>
          ) : null}
          <Text style={p.title}>공개 컬렉션 · 최근 20개</Text>
          {content?.collections.map((collection) => (
            <Button
              key={collection.id}
              label={collection.title}
              variant="secondary"
              onPress={() =>
                router.push(`/collection/${collection.id}` as Href)
              }
            />
          ))}
          <Text style={p.title}>일상 피드</Text>
          <SocialPosts scope="member" userId={id} />
        </>
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
