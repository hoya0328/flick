import { type Href, Redirect, router, useFocusEffect } from "expo-router";
import { type ReactNode, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/button";
import { homeFont, HomeIcon } from "@/components/home-ui";
import { Screen } from "@/components/screen";
import { ProfileAvatar, p } from "@/features/profile/profile-ui";
import { CorePhoto } from "@/features/reviews/core-photo";
import { useSession } from "@/features/session/session-provider";
import {
  listPosts,
  mergeById,
  reactToPost,
  removePost,
  type SocialPost,
  type PostScope,
  type Member,
  safeCommunityPath,
} from "./social-service";

export function CommunityGate({
  children,
  returnTo,
}: {
  children: ReactNode;
  returnTo?: string;
}) {
  const { status, mode } = useSession();
  if (status === "loading")
    return (
      <Screen title="계정 확인 중">
        <ActivityIndicator />
      </Screen>
    );
  if (mode !== "supabase")
    return (
      <Screen title="로그인 후 함께 나눠요">
        <Text style={p.body}>
          실제 계정의 공개 정보만 사용합니다. 데모에서는 다른 사용자에게 글을
          남기지 않아요.
        </Text>
        <Button
          label="로그인하기"
          onPress={() =>
            router.push({
              pathname: "/welcome",
              params: { returnTo: safeCommunityPath(returnTo) ?? "" },
            })
          }
        />
        <Button
          label="홈으로"
          variant="secondary"
          onPress={() => router.replace("/")}
        />
      </Screen>
    );
  return <>{children}</>;
}
export function BackButton() {
  return (
    <Button
      label="뒤로"
      variant="ghost"
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace("/profile")
      }
    />
  );
}
export function Message({ message }: { message: string }) {
  return message ? (
    <Text accessibilityRole="alert" style={p.error}>
      {message}
    </Text>
  ) : null;
}
export function MemberRow({
  member,
  action,
  busy,
  onAction,
}: {
  member: Member;
  action?: string;
  busy?: boolean;
  onAction?: () => void;
}) {
  return (
    <View style={s.member}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${member.name} 프로필`}
        disabled={member.publicProfile === false}
        onPress={() => router.push(`/people/${member.userId}` as Href)}
        style={s.memberIdentity}
      >
        <ProfileAvatar size={41} path={member.avatar} name={member.name} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{member.name}</Text>
          <Text numberOfLines={2} style={p.body}>
            {member.bio}
          </Text>
        </View>
      </Pressable>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onAction}
          style={s.smallAction}
        >
          <Text style={p.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
export function SocialPostCard({
  post,
  busy = false,
  onReact,
  onRestore,
}: {
  post: SocialPost;
  busy?: boolean;
  onReact?: (kind: "like" | "save") => void;
  onRestore?: () => void;
}) {
  const open = () => router.push(`/post/${post.id}` as Href);
  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${post.authorName} 프로필`}
        disabled={!post.authorProfileId}
        onPress={() => router.push(`/people/${post.authorProfileId}` as Href)}
        style={s.author}
      >
        <ProfileAvatar size={41} name={post.authorName} path={post.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{post.authorName}</Text>
          <Text style={s.time}>
            {new Date(post.createdAt).toLocaleDateString("ko-KR")} ·{" "}
            {post.visibility === "private" ? "나만 보기" : "전체 공개"}
            {post.createdAt !== post.updatedAt ? " · 수정됨" : ""}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="게시물 상세 보기"
        onPress={open}
        disabled={post.status !== "active"}
      >
        <Text style={s.body}>{post.body}</Text>
      </Pressable>
      {post.photos[0] ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`사진 ${post.photos.length}장, 게시물 열기`}
          onPress={open}
        >
          <CorePhoto
            path={post.photos[0]}
            style={s.photo}
            label="피드 첨부 사진"
          />
          {post.photos.length > 1 ? (
            <View style={s.thumbs}>
              {post.photos.slice(1, 4).map((path, index) => (
                <View key={path} style={{ flex: 1, aspectRatio: 1 }}>
                  <CorePhoto
                    path={path}
                    style={{ width: "100%", height: "100%", borderRadius: 10 }}
                    label={`첨부 사진 ${index + 2}`}
                  />
                  {index === 2 && post.photos.length > 4 ? (
                    <View style={s.overlay}>
                      <Text style={{ color: "#FFF", fontWeight: "700" }}>
                        +{post.photos.length - 4}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </Pressable>
      ) : null}
      {post.status === "removed" ? (
        <Button
          label="나만 보기로 복원"
          disabled={busy}
          onPress={() => onRestore?.()}
          variant="secondary"
        />
      ) : (
        <View style={s.reactions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`공감 ${post.likeCount}`}
            accessibilityState={{
              selected: post.viewerLiked,
              disabled: busy || post.visibility !== "public",
            }}
            disabled={busy || post.visibility !== "public"}
            onPress={() => onReact?.("like")}
            style={s.reaction}
          >
            <HomeIcon name="heart" width={15} height={15} />
            <Text style={[s.count, post.viewerLiked && { color: "#F8233C" }]}>
              {post.likeCount}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`댓글 ${post.commentCount}`}
            onPress={open}
            style={s.reaction}
          >
            <HomeIcon name="comment" width={15} height={15} />
            <Text style={s.count}>{post.commentCount}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: post.viewerSaved }}
            disabled={busy || post.visibility !== "public"}
            onPress={() => onReact?.("save")}
            style={[s.reaction, { marginLeft: "auto" }]}
          >
            <Text
              style={[
                p.link,
                { color: post.viewerSaved ? "#F8233C" : "#6A7282" },
              ]}
            >
              {post.viewerSaved ? "저장됨" : "저장"}
            </Text>
          </Pressable>
          {post.isMine ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/post-edit?id=${post.id}` as Href)}
              style={s.reaction}
            >
              <Text style={p.link}>수정</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
export function SocialPosts({
  scope,
  userId,
}: {
  scope: PostScope;
  userId?: string;
}) {
  const session = useSession();
  return (
    <Posts
      key={`${session.mode}:${session.email ?? ""}:${scope}:${userId ?? ""}`}
      scope={scope}
      userId={userId}
    />
  );
}
function Posts({ scope, userId }: { scope: PostScope; userId?: string }) {
  const { mode } = useSession();
  const [items, setItems] = useState<SocialPost[]>([]),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState(""),
    [more, setMore] = useState(false);
  const offset = useRef(0),
    generation = useRef(0),
    lock = useRef(false);
  const load = useCallback(
    async (reset = true) => {
      if (lock.current || mode !== "supabase") return;
      lock.current = true;
      setBusy(true);
      setMessage("");
      const token = generation.current;
      try {
        const rows = await listPosts(
          scope,
          reset ? 0 : offset.current,
          userId ?? null,
        );
        if (token !== generation.current) return;
        setItems((old) => (reset ? rows : mergeById(old, rows)));
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
    [mode, scope, userId],
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
  async function action(task: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const token = generation.current;
    try {
      await task();
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
  if (mode !== "supabase")
    return (
      <View style={s.notice}>
        <Text style={p.body}>
          실제 계정으로 로그인하면 피드를 사용할 수 있어요.
        </Text>
      </View>
    );
  return (
    <View style={{ paddingTop: 13, paddingBottom: 24 }}>
      <View style={s.toolbar}>
        {scope === "mine" ? (
          <>
            <Button
              label="일상 기록 쓰기"
              onPress={() => router.push("/post-edit" as Href)}
            />
            <Button
              label="최근 7일 휴지통"
              variant="ghost"
              onPress={() => router.push("/post-trash" as Href)}
            />
          </>
        ) : null}
        <Button
          label="새로고침"
          variant="ghost"
          disabled={busy}
          onPress={() => void load()}
        />
      </View>
      <View style={s.notice}>
        <Message message={message} />
        {busy ? <ActivityIndicator color="#F8233C" /> : null}
        {ready && !items.length ? (
          <Text style={p.body}>
            {scope === "trash"
              ? "복원할 게시물이 없어요."
              : "아직 게시물이 없어요. 비공개·숨겨진 글은 다른 사람에게 보이지 않아요."}
          </Text>
        ) : null}
      </View>
      {items.map((post) => (
        <SocialPostCard
          post={post}
          key={post.id}
          busy={busy}
          onRestore={() => void action(() => removePost(post.id, false))}
          onReact={(kind) =>
            void action(() =>
              reactToPost(
                post.id,
                kind,
                kind === "like" ? !post.viewerLiked : !post.viewerSaved,
              ),
            )
          }
        />
      ))}
      {more ? (
        <View style={s.toolbar}>
          <Button
            label="더 보기"
            disabled={busy}
            variant="secondary"
            onPress={() => void load(false)}
          />
        </View>
      ) : null}
    </View>
  );
}
export function MissingPost() {
  return <Redirect href="/feed" />;
}
const s = StyleSheet.create({
  member: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  memberIdentity: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  smallAction: {
    minHeight: 44,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  card: {
    marginHorizontal: 21,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  author: { flexDirection: "row", gap: 8, alignItems: "center" },
  name: {
    fontFamily: homeFont,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: "#0A0A0A",
  },
  time: {
    fontFamily: homeFont,
    fontSize: 12,
    lineHeight: 18,
    color: "#6A7282",
    marginTop: 1,
  },
  body: { fontFamily: homeFont, fontSize: 14, lineHeight: 22.8, color: "#000" },
  photo: { width: "100%", height: 161, borderRadius: 10 },
  thumbs: { flexDirection: "row", gap: 10, marginTop: 10 },
  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "#0007",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  reactions: { flexDirection: "row", alignItems: "center", gap: 10 },
  reaction: {
    minHeight: 44,
    minWidth: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  count: {
    fontFamily: "Inter",
    fontSize: 14,
    lineHeight: 20,
    color: "#0A0A0A",
  },
  toolbar: { paddingHorizontal: 21, gap: 4 },
  notice: { paddingHorizontal: 21, gap: 12 },
});
