import { type Href, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
} from "@/features/community/social-ui";
import {
  listPosts,
  postIssue,
  savePost,
} from "@/features/community/social-service";
import { p } from "@/features/profile/profile-ui";
import { CorePhoto, addCorePhoto } from "@/features/reviews/core-photo";
import { useSession } from "@/features/session/session-provider";

export default function PostEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    session = useSession();
  return (
    <CommunityGate>
      <Editor
        key={`${session.email}:${id ?? ""}`}
        id={typeof id === "string" ? id : undefined}
      />
    </CommunityGate>
  );
}
function Editor({ id }: { id?: string }) {
  const [body, setBody] = useState(""),
    [photos, setPhotos] = useState<string[]>([]),
    [visibility, setVisibility] = useState<"private" | "public">("private"),
    [confirmed, setConfirmed] = useState(false),
    [ready, setReady] = useState(!id),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [revision, setRevision] = useState(0);
  const input = useRef<TextInput>(null),
    scroll = useRef<ScrollView>(null),
    active = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!id) return;
    let valid = true;
    void listPosts("detail", 0, null, id)
      .then((rows) => {
        if (!valid) return;
        const item = rows[0];
        if (!item?.isMine) throw new Error("본인의 게시물만 수정할 수 있어요.");
        setBody(item.body);
        setPhotos(item.photos);
        setVisibility(item.visibility);
        setConfirmed(item.visibility === "public");
        setReady(true);
        setMessage("");
      })
      .catch((error) => {
        if (valid)
          setMessage(
            error instanceof Error ? error.message : "불러오지 못했어요.",
          );
      });
    return () => {
      valid = false;
    };
  }, [id, revision]);
  async function upload() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const path = await addCorePhoto();
      if (active.current && path)
        setPhotos((old) =>
          old.includes(path) ? old : [...old, path].slice(0, 5),
        );
    } catch (error) {
      if (active.current)
        setMessage(
          error instanceof Error ? error.message : "사진을 추가하지 못했어요.",
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function save() {
    if (lock.current || !ready) return;
    const issue = postIssue(body, photos);
    if (issue) {
      setMessage(issue);
      scroll.current?.scrollTo({ y: 0, animated: true });
      input.current?.focus();
      return;
    }
    if (visibility === "public" && !confirmed) {
      setMessage("전체 공개 안내를 확인하고 동의해야 합니다.");
      scroll.current?.scrollToEnd({ animated: true });
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const postId = await savePost(id ?? null, body, photos, visibility);
      if (active.current) router.replace(`/post/${postId}` as Href);
    } catch (error) {
      if (active.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "저장하지 못했어요. 작성 내용은 유지됩니다.",
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <Screen
      title={id ? "일상 기록 수정" : "일상 기록 쓰기"}
      scrollViewRef={scroll}
    >
      <Text style={p.body}>
        영화 밖의 순간도 남겨 보세요. 기본은 나만 보기입니다. 하루 10개, 게시
        간격 20초로 무료 베타를 운영해요.
      </Text>
      {!ready ? (
        <>
          <ActivityIndicator />
          <Message message={message} />
          <Button
            label="다시 불러오기"
            onPress={() => setRevision((n) => n + 1)}
          />
        </>
      ) : (
        <>
          <TextInput
            ref={input}
            accessibilityLabel="일상 기록 본문"
            placeholder="오늘 어떤 순간을 기록하고 싶나요?"
            multiline
            value={body}
            editable={!busy}
            maxLength={2000}
            onChangeText={(value)=>{setBody(value);if(message==='본문을 입력해야 합니다.')setMessage('');}}
            style={{
              minHeight: 180,
              borderWidth: 1,
              borderColor: "#D1D5DC",
              borderRadius: 10,
              padding: 14,
              fontSize: 14,
              lineHeight: 23,
              textAlignVertical: "top",
            }}
          />
          <Text style={p.body}>{body.length}/2,000자</Text>
          {message==='본문을 입력해야 합니다.'?<Message message={message}/>:null}
          <View style={{ gap: 12 }}>
            {photos.map((path, index) => (
              <View key={path}>
                <CorePhoto
                  path={path}
                  label={`첨부 사진 ${index + 1}`}
                  style={{ height: 180, borderRadius: 10 }}
                />
                <Button
                  label={`사진 ${index + 1} 첨부 해제`}
                  disabled={busy}
                  variant="ghost"
                  onPress={() =>
                    setPhotos((old) => old.filter((item) => item !== path))
                  }
                />
              </View>
            ))}
          </View>
          <Button
            label={`사진 추가 (${photos.length}/5)`}
            disabled={busy || photos.length >= 5}
            variant="secondary"
            onPress={() => void upload()}
          />
          <Text style={p.body}>
            프로필·매거진과 같은 무료 사진 한도(계정 누적 16장)를 사용합니다.
            첨부를 해제해도 기존 사진 파일은 자동 삭제하지 않아요.
          </Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            {(["private", "public"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: visibility === value }}
                disabled={busy}
                onPress={() => {
                  setVisibility(value);
                  setConfirmed(false);
                }}
                style={[
                  p.action,
                  {
                    flex: 1,
                    borderColor: visibility === value ? "#F8233C" : "#D1D5DC",
                  },
                ]}
              >
                <Text style={p.actionText}>
                  {value === "private" ? "나만 보기" : "전체 공개"}
                </Text>
              </Pressable>
            ))}
          </View>
          {visibility === "public" ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
              disabled={busy}
              onPress={() => setConfirmed(!confirmed)}
              style={[p.action, { paddingVertical: 12 }]}
            >
              <Text style={p.body}>
                {confirmed ? "☑" : "□"} 닉네임·본문·첨부 사진이 로그인한
                회원에게 공개되는 것을 확인했어요. 사진 속 개인정보도 확인해
                주세요.
              </Text>
            </Pressable>
          ) : null}
          <Message message={message==='본문을 입력해야 합니다.'?'':message} />
          <Button
            label={id ? "수정 저장" : "기록 저장"}
            loading={busy}
            onPress={() => void save()}
          />
        </>
      )}
      <BackButton />
    </Screen>
  );
}
