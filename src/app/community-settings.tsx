import { type Href, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import {
  BackButton,
  CommunityGate,
  Message,
} from "@/features/community/social-ui";
import {
  getCommunityState,
  setPostModeration,
  setPublicProfile,
  type CommunityState,
} from "@/features/community/social-service";
import { p } from "@/features/profile/profile-ui";
export default function Settings() {
  return (
    <CommunityGate>
      <SettingsForm />
    </CommunityGate>
  );
}
function SettingsForm() {
  const [state, setState] = useState<CommunityState | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState(false),
    [revision, setRevision] = useState(0);
  const active = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let valid = true;
    void getCommunityState()
      .then((value) => {
        if (valid) {
          setState(value);
          setMessage("");
        }
      })
      .catch(() => {
        if (valid) setMessage("설정을 불러오지 못했어요. 다시 시도해 주세요.");
      });
    return () => {
      valid = false;
    };
  }, [revision]);
  async function change(task: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await task();
      const value = await getCommunityState();
      if (active.current) {
        setState(value);
        setConfirm(false);
      }
    } catch (error) {
      if (active.current)
        setMessage(
          error instanceof Error ? error.message : "변경하지 못했어요.",
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <Screen title="공개·알림 설정">
      <Message message={message} />
      {!state ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={p.title}>
            프로필 {state.publicProfile ? "공개 중" : "비공개"}
          </Text>
          <Text style={p.body}>
            공개를 켜면 로그인한 회원이 닉네임·소개·프로필 사진·팔로워/팔로잉
            수·공개 완료 리뷰·공개 컬렉션·공개 일상 글을 볼 수 있어요. 이메일,
            비공개 기록, 취향 리포트, 보고 싶은 영화는 공개하지 않습니다. 팔로우
            목록은 본인만 조회해요.
          </Text>
          {!state.publicProfile && !confirm ? (
            <Button
              label="공개 안내 확인"
              variant="secondary"
              disabled={busy}
              onPress={() => setConfirm(true)}
            />
          ) : null}
          {state.publicProfile || confirm ? (
            <>
              <Text style={p.body}>
                {state.publicProfile
                  ? "비공개로 전환해도 개별 리뷰·컬렉션·글의 공개 설정은 바뀌지 않아요. 각 콘텐츠에서 나만 보기로 바꿔 주세요."
                  : "공개 후에는 프로필 링크로 회원에게 공유할 수 있습니다. 소개와 사진에 개인정보가 없는지 확인해 주세요."}
              </Text>
              <Button
                label={
                  state.publicProfile
                    ? "프로필 비공개로 전환"
                    : "확인했어요 · 프로필 공개"
                }
                loading={busy}
                onPress={() =>
                  void change(() => setPublicProfile(!state.publicProfile))
                }
              />
            </>
          ) : null}
          {state.publicProfile ? (
            <Button
              label="내 공개 프로필 보기"
              variant="secondary"
              onPress={() => router.push(`/people/${state.userId}` as Href)}
            />
          ) : null}
          <Text style={p.title}>알림</Text>
          <Text style={p.body}>
            앱 내 알림만 제공해요. 외부 푸시·이메일 발송은 연결하지 않았습니다.
            읽음 상태는 알림함에서 관리합니다.
          </Text>
          <Button
            label={`알림함 · 안 읽음 ${state.unread}개`}
            variant="secondary"
            onPress={() => router.push("/notifications" as Href)}
          />
          {state.canConfigureModeration ? (
            <>
              <Text style={p.title}>관리자 · 일상 피드 신고 권한</Text>
              <Text style={p.body}>
                기본은 꺼짐입니다. 이 권한만 별도로 변경하며 기존 회원·리뷰
                조회/수정/삭제 권한은 바꾸지 않습니다. 변경은 관리자 감사 기록에
                남아요.
              </Text>
              <Button
                label={
                  state.canModeratePosts
                    ? "일상 신고 관리 권한 끄기"
                    : "일상 신고 관리 권한 켜기"
                }
                disabled={busy}
                variant="secondary"
                onPress={() =>
                  void change(() => setPostModeration(!state.canModeratePosts))
                }
              />
              {state.canModeratePosts ? (
                <Button
                  label="일상 신고 관리"
                  onPress={() => router.push("/post-reports" as Href)}
                />
              ) : null}
            </>
          ) : null}
        </>
      )}
      <Button
        label="설정 다시 확인"
        disabled={busy}
        variant="ghost"
        onPress={() => setRevision((n) => n + 1)}
      />
      <BackButton />
    </Screen>
  );
}
