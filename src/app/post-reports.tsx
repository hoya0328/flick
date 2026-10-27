import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import {
  BackButton,
  CommunityGate,
  Message,
} from "@/features/community/social-ui";
import {
  listPostReports,
  moderatePostReport,
  type PostReport,
} from "@/features/community/social-service";
import { p } from "@/features/profile/profile-ui";
export default function Reports() {
  return (
    <CommunityGate>
      <ReportsList />
    </CommunityGate>
  );
}
function ReportsList() {
  const [rows, setRows] = useState<PostReport[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [ready,setReady]=useState(false),
    [revision, setRevision] = useState(0),
    [confirm, setConfirm] = useState<string | null>(null);
  const lock = useRef(false),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let valid = true;
    void listPostReports()
      .then((value) => {
        if (valid) {
          setRows(value);
          setReady(true);
          setMessage("");
        }
      })
      .catch((error) => {
        if (valid)
          setMessage(
            error instanceof Error ? error.message : "조회하지 못했어요.",
          );
      });
    return () => {
      valid = false;
    };
  }, [revision]);
  async function resolve(id: string, hide: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await moderatePostReport(id, hide);
      if (active.current) {
        setConfirm(null);
        setRevision((n) => n + 1);
      }
    } catch (error) {
      if (active.current)
        setMessage(
          error instanceof Error ? error.message : "처리하지 못했어요.",
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <Screen title="일상 피드 신고 관리">
      <Text style={p.body}>
        별도 권한을 켠 관리자만 조회·처리할 수 있어요. 숨김 처리한 글은 작성자가
        복원할 수 없습니다. 최근 미처리 신고 50개를 표시합니다.
      </Text>
      <Message message={message} />
      {ready&&!rows.length&&!message?<Text style={p.body}>미처리 신고가 없어요.</Text>:null}
      {rows.map((row) => (
        <View
          key={row.id}
          style={{
            gap: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#D1D5DC",
            borderRadius: 12,
          }}
        >
          <Text style={p.title}>{row.reason}</Text>
          <Text>{row.body}</Text>
          <Text style={p.body}>{row.detail}</Text>
          <Text style={p.body}>
            {new Date(row.createdAt).toLocaleString("ko-KR")}
          </Text>
          <Button
            label="신고 종결 · 유지"
            disabled={busy}
            variant="secondary"
            onPress={() => void resolve(row.id, false)}
          />
          <Button
            label={confirm === row.id ? "숨김 확인" : "게시물 숨기기"}
            disabled={busy}
            onPress={() =>
              confirm === row.id
                ? void resolve(row.id, true)
                : setConfirm(row.id)
            }
          />
          {confirm === row.id ? (
            <Text style={p.error}>
              누르면 공개 노출과 작성자 복원이 차단됩니다. 한 번 더 눌러 확인해
              주세요.
            </Text>
          ) : null}
        </View>
      ))}
      <Button
        label="새로고침"
        disabled={busy}
        variant="secondary"
        onPress={() => setRevision((n) => n + 1)}
      />
      <BackButton />
    </Screen>
  );
}
