import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import {
  BackButton,
  CommunityGate,
  Message,
  SocialPostCard,
} from "@/features/community/social-ui";
import {
  addPostComment,
  listPostComments,
  listPosts,
  mergeById,
  reactToPost,
  removePost,
  removePostComment,
  reportPost,
  type SocialComment,
  type SocialPost,
} from "@/features/community/social-service";
import { p } from "@/features/profile/profile-ui";
import { useSession } from "@/features/session/session-provider";
import { CorePhoto } from "@/features/reviews/core-photo";

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    s = useSession();
  return (
    <CommunityGate returnTo={`/post/${id}`}>
      <Detail key={`${s.email}:${id}`} id={typeof id === "string" ? id : ""} />
    </CommunityGate>
  );
}
function Detail({ id }: { id: string }) {
  const [post, setPost] = useState<SocialPost | null>(null),
    [comments, setComments] = useState<SocialComment[]>([]),
    [body, setBody] = useState(""),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [more, setMore] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [report, setReport] = useState(false),
    [reason, setReason] = useState("other"),
    [detail, setDetail] = useState("");
  const generation = useRef(0),
    lock = useRef(false),
    offset = useRef(0),
    input = useRef<TextInput>(null),
    scroll = useRef<ScrollView>(null);
  const load = useCallback(async () => {
    const token = generation.current;
    setBusy(true);
    try {
      const rows = await listPosts("detail", 0, null, id);
      if (token !== generation.current) return;
      setPost(rows[0] ?? null);
      if (rows[0]) {
        const next = await listPostComments(id);
        if (token !== generation.current) return;
        setComments(next);
        offset.current = next.length;
        setMore(next.length === 30);
      }
      setReady(true);
    } catch (error) {
      if (token === generation.current)
        setMessage(
          error instanceof Error ? error.message : "불러오지 못했어요.",
        );
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      generation.current++;
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  async function act(task: () => Promise<unknown>, after?: () => void) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    const token = generation.current;
    try {
      await task();
      if (token === generation.current) {
        after?.();
        await load();
      }
    } catch (error) {
      if (token === generation.current)
        setMessage(
          error instanceof Error ? error.message : "변경하지 못했어요.",
        );
    } finally {
      lock.current = false;
      if (token === generation.current) setBusy(false);
    }
  }
  async function moreComments() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const token = generation.current;
    try {
      const rows = await listPostComments(id, offset.current);
      if (token === generation.current) {
        offset.current += rows.length;
        setComments((old) => mergeById(old, rows));
        setMore(rows.length === 30);
      }
    } catch {
      setMessage("댓글을 더 불러오지 못했어요.");
    } finally {
      lock.current = false;
      if (token === generation.current) setBusy(false);
    }
  }
  function send() {
    if (!body.trim()) {
      setMessage("댓글을 입력해야 합니다.");
      scroll.current?.scrollToEnd({ animated: true });
      input.current?.focus();
      return;
    }
    void act(
      () => addPostComment(id, body),
      () => setBody(""),
    );
  }
  return (
    <Screen title="일상 기록" scrollViewRef={scroll}>
      <Message message={message} />
      {busy ? <ActivityIndicator color="#F8233C" /> : null}
      {ready && !post ? (
        <Text style={p.body}>
          게시물이 비공개·삭제되었거나 접근할 수 없어요.
        </Text>
      ) : null}
      {!ready ? (
        <Button
          label="다시 불러오기"
          disabled={busy}
          variant="secondary"
          onPress={() => void load()}
        />
      ) : null}
      {post ? (
        <>
          <SocialPostCard
            post={post}
            busy={busy}
            onReact={(kind) =>
              void act(() =>
                reactToPost(
                  id,
                  kind,
                  kind === "like" ? !post.viewerLiked : !post.viewerSaved,
                ),
              )
            }
          />
          {post.photos.length > 1 ? (
            <View style={{ gap: 10 }}>
              <Text style={p.body}>
                첨부 사진을 아래에서 모두 확인할 수 있어요.
              </Text>
              {post.photos.map((path) => (
                <Photo key={path} path={path} />
              ))}
            </View>
          ) : null}
          {post.isMine ? (
            <>
              <Button
                label={confirmDelete ? "삭제 취소" : "게시물 삭제"}
                variant="ghost"
                disabled={busy}
                onPress={() => setConfirmDelete(!confirmDelete)}
              />
              {confirmDelete ? (
                <>
                  <Text style={p.body}>
                    삭제하면 피드에서 즉시 숨겨지고 7일 동안 나만 보기로 복원할
                    수 있어요.
                  </Text>
                  <Button
                    label="삭제 확인"
                    disabled={busy}
                    onPress={() =>
                      void act(
                        () => removePost(id, true),
                        () => router.replace("/post-trash" as Href),
                      )
                    }
                  />
                </>
              ) : null}
            </>
          ) : (
            <>
              <Button
                label="신고하기"
                variant="ghost"
                disabled={busy}
                onPress={() => setReport(!report)}
              />
              {report ? (
                <>
                  <Text style={p.body}>
                    신고 사유를 선택해 주세요. 신고 즉시 자동 삭제되지는 않아요.
                  </Text>
                  {(
                    [
                      ["spoiler", "스포일러"],
                      ["harassment", "괴롭힘"],
                      ["personal_info", "개인정보"],
                      ["copyright", "저작권"],
                      ["other", "기타"],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      label={`${reason === value ? "✓ " : ""}${label}`}
                      variant="secondary"
                      disabled={busy}
                      onPress={() => setReason(value)}
                    />
                  ))}
                  <TextInput
                    accessibilityLabel="신고 설명"
                    placeholder="추가 설명 (선택, 500자 이내)"
                    value={detail}
                    maxLength={500}
                    onChangeText={setDetail}
                    editable={!busy}
                    multiline
                    style={{
                      borderWidth: 1,
                      borderColor: "#D1D5DC",
                      padding: 12,
                      minHeight: 80,
                    }}
                  />
                  <Button
                    label="신고 제출"
                    disabled={busy}
                    onPress={() =>
                      void act(
                        () => reportPost(id, reason, detail),
                        () => {
                          setReport(false);
                          setMessage("신고가 접수됐어요.");
                        },
                      )
                    }
                  />
                </>
              ) : null}
            </>
          )}
          <Text style={p.title}>댓글 {post.commentCount}</Text>
          {comments.map((c) => (
            <View
              key={c.id}
              style={{
                gap: 6,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Text
                style={p.actionText}
                onPress={
                  c.authorProfileId
                    ? () => router.push(`/people/${c.authorProfileId}` as Href)
                    : undefined
                }
              >
                {c.name}
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 23 }}>{c.body}</Text>
              <Text style={p.body}>
                {new Date(c.createdAt).toLocaleString("ko-KR")}
              </Text>
              {c.isMine ? (
                <Button
                  label="내 댓글 삭제"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => void act(() => removePostComment(c.id))}
                />
              ) : null}
            </View>
          ))}
          {more ? (
            <Button
              label="댓글 더 보기"
              variant="secondary"
              disabled={busy}
              onPress={() => void moreComments()}
            />
          ) : null}
          {post.visibility === "public" ? (
            <>
              <TextInput
                ref={input}
                accessibilityLabel="댓글 입력"
                placeholder="댓글을 입력해 주세요"
                value={body}
                onChangeText={setBody}
                maxLength={500}
                multiline
                editable={!busy}
                style={{
                  minHeight: 80,
                  borderWidth: 1,
                  borderColor: "#D1D5DC",
                  borderRadius: 10,
                  padding: 12,
                }}
              />
              <Text style={p.body}>
                {body.length}/500자 · 하루 50개, 분당 5개까지
              </Text>
              <Button label="댓글 남기기" loading={busy} onPress={send} />
            </>
          ) : (
            <Text style={p.body}>
              나만 보기에서는 댓글·공감·저장을 받지 않아요.
            </Text>
          )}
        </>
      ) : null}
      <BackButton />
    </Screen>
  );
}
function Photo({ path }: { path: string }) {
  return (
    <CorePhoto
      path={path}
      label="첨부 사진"
      style={{ height: 240, borderRadius: 10 }}
    />
  );
}
